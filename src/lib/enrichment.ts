import prisma from './prisma';

export async function enrichLead(leadId: string) {
  // 1. Fetch the lead
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // 2. Generate mock signals based on the lead's business name and website (if any)
  const hasWebsite = Boolean(lead.website) || Math.random() > 0.5;
  const mockSignals = {
    workspaceId: lead.workspaceId,
    leadId: lead.id,
    hasWebsite,
    hasBooking: hasWebsite && Math.random() > 0.5,
    hasOrdering: hasWebsite && Math.random() > 0.8,
    mobileFriendly: hasWebsite && Math.random() > 0.2,
    reviewCount: Math.floor(Math.random() * 500),
    socialPresence: Math.random() > 0.3,
    contactReadiness: Math.random() > 0.4,
    promotions: Math.random() > 0.7,
    evidenceSnippets: {
      hasBooking: hasWebsite ? "Found 'Book Now' button on homepage" : null,
      contactReadiness: "Found email and phone on Contact page",
    },
  };

  // 3. Upsert the signals into the database
  const signals = await prisma.leadSignals.upsert({
    where: { leadId: lead.id },
    create: mockSignals,
    update: mockSignals,
  });

  // Optionally, update SearchJob counters for totalEnriched
  // This might be better handled in a batch processing worker, but for MVP it works here
  await prisma.searchJob.update({
    where: { id: lead.searchJobId },
    data: { totalEnriched: { increment: 1 } },
  });

  return { success: true, signals };
}

/**
 * Process a batch of undiscovered/unenriched leads for a given search job.
 */
export async function processEnrichmentForJob(searchJobId: string) {
  // Find leads for this job that don't have signals yet
  const leads = await prisma.lead.findMany({
    where: {
      searchJobId,
      signals: null,
    },
    take: 10, // Process in batches
  });

  let enrichedCount = 0;
  for (const lead of leads) {
    try {
      await enrichLead(lead.id);
      enrichedCount++;
    } catch (e) {
      console.error(`Failed to enrich lead ${lead.id}:`, e);
    }
  }

  return { success: true, count: enrichedCount };
}
