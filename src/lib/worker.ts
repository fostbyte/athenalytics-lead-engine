import prisma from './prisma';
import { discoverLeads } from './discovery';
import { normalizeGeography, calculateDistanceMiles } from './geo';
import { canPerformAction, incrementUsage } from './limits';

export async function processDiscoveryJob(jobId: string) {
  // 1. Fetch job
  const job = await prisma.searchJob.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Set processing status
  await prisma.searchJob.update({
    where: { id: jobId },
    data: { status: 'processing' }
  });

  try {
    // 2. Geo normalization (now async — may call Geocoding API)
    const geo = await normalizeGeography({
      locationType: job.locationType as any,
      city: job.city || undefined,
      state: job.state || undefined,
      zipCode: job.zipCode || undefined,
    });

    if (!geo.isValid) {
      throw new Error(`Invalid geography: ${geo.errors.join(', ')}`);
    }

    // 3. Discover — passes real lat/lng so Places API can search geospatially
    const candidates = await discoverLeads({
      industry: job.vertical,
      city: geo.city,
      state: geo.state,
      zipCode: geo.zipCode,
      lat: geo.lat,
      lng: geo.lng,
      targetCount: job.targetCount || 50,
      radiusMiles: job.radiusMiles || 10,
    });

    // 4. Save candidates to db, skipping already-discovered places
    const leadCreates = [];
    for (const c of candidates) {
      // Deduplication: skip if this placeId was already discovered for this workspace
      if (c.placeId) {
        const existing = await prisma.lead.findFirst({
          where: { placeId: c.placeId, workspaceId: job.workspaceId },
          select: { id: true },
        });
        if (existing) continue;
      }

      let distanceMiles: number | null = null;
      if (geo.lat && geo.lng && c.lat && c.lng) {
        distanceMiles = calculateDistanceMiles(geo.lat, geo.lng, c.lat, c.lng);
      }

      leadCreates.push({
        workspaceId: job.workspaceId,
        searchJobId: job.id,
        businessName: c.businessName,
        website: c.website,
        phoneNumber: c.phoneNumber ?? null,
        address: c.address ?? null,
        placeId: c.placeId ?? null,
        category: c.category ?? null,
        city: c.city || geo.city || null,
        state: c.state || geo.state || null,
        zipCode: c.zipCode || geo.zipCode || null,
        lat: c.lat ?? geo.lat ?? null,
        lng: c.lng ?? geo.lng ?? null,
        distanceMiles,
        status: 'discovered',
      });
    }

    // SaaS resource limit check: Results / Leads discovered limits
    const quota = await canPerformAction(job.workspaceId, 'results', 0);
    
    let finalLeadCreates = leadCreates;
    let limitWarning = '';
    
    if (leadCreates.length > quota.remaining) {
      finalLeadCreates = leadCreates.slice(0, quota.remaining);
      limitWarning = `Daily lead results quota limit reached. Truncated from ${leadCreates.length} to ${quota.remaining} leads. Upgrade your settings plan to increase daily caps.`;
    }

    if (finalLeadCreates.length > 0) {
      await prisma.lead.createMany({ data: finalLeadCreates });
      // Increment results usage counter
      await incrementUsage(job.workspaceId, 'results', finalLeadCreates.length);
    }

    // 5. Mark Complete
    await prisma.searchJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        totalFound: finalLeadCreates.length,
        error: limitWarning || undefined,
      }
    });

    return { success: true, count: finalLeadCreates.length, truncated: leadCreates.length > quota.remaining };
  } catch (error: any) {
    // Mark failed
    await prisma.searchJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: error.message }
    });
    return { success: false, error: error.message };
  }
}
