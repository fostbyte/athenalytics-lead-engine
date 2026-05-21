import prisma from './prisma';
import { processDiscoveryJob } from './worker';
import { processEnrichmentForJob } from './enrichment';
import { scoreLead } from './scoring';
import { canPerformAction, incrementUsage } from './limits';

/**
 * Calculates the next run time based on the scheduled interval.
 */
export function calculateNextRun(interval: string, baseDate = new Date()): Date {
  const next = new Date(baseDate);
  if (interval === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (interval === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (interval === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    // Default to +24 hours
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Executes a single scheduled search job through the full discovery, enrichment, and scoring pipeline.
 */
export async function executeScheduledSearchJob(jobId: string) {
  try {
    console.log(`[Scheduler] Starting background pipeline for scheduled job ${jobId}`);

    // 1. Run Discovery
    const discoveryRes = await processDiscoveryJob(jobId);
    if (!discoveryRes.success) {
      throw new Error(discoveryRes.error || 'Discovery phase failed');
    }
    console.log(`[Scheduler] Discovery completed. Discovered ${discoveryRes.count} leads for job ${jobId}`);

    // 2. Run Enrichment
    const enrichmentRes = await processEnrichmentForJob(jobId);
    if (!enrichmentRes.success) {
      throw new Error('Enrichment phase failed');
    }
    console.log(`[Scheduler] Enrichment completed for job ${jobId}`);

    // 3. Run scoring for all leads discovered in this job
    const leads = await prisma.lead.findMany({
      where: { searchJobId: jobId },
      select: { id: true, businessName: true }
    });

    let scoredCount = 0;
    for (const lead of leads) {
      try {
        await scoreLead(lead.id);
        scoredCount++;
      } catch (err: any) {
        console.error(`[Scheduler] Failed to score lead ${lead.id}:`, err.message);
      }
    }
    console.log(`[Scheduler] Scoring completed. Scored ${scoredCount} leads for job ${jobId}`);

    // 4. Create Notification about scan completion
    const job = await prisma.searchJob.findUnique({
      where: { id: jobId }
    });

    if (job) {
      if (leads.length > 0) {
        await prisma.notification.create({
          data: {
            workspaceId: job.workspaceId,
            title: 'Automated Lead Alert 🎯',
            message: `Your scheduled scan for "${job.vertical}" discovered and scored ${leads.length} new leads in ${
              job.locationType === 'zip' ? job.zipCode : `${job.city}, ${job.state}`
            }!`,
            type: 'new_leads',
          }
        });
      } else {
        await prisma.notification.create({
          data: {
            workspaceId: job.workspaceId,
            title: 'Automated Scan Complete 🔍',
            message: `Scheduled scan for "${job.vertical}" completed in ${
              job.locationType === 'zip' ? job.zipCode : `${job.city}, ${job.state}`
            }. No new leads found.`,
            type: 'info',
          }
        });
      }
    }
  } catch (err: any) {
    console.error(`[Scheduler] Error in pipeline execution of scheduled job ${jobId}:`, err);
    // Update job status to failed
    await prisma.searchJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: err.message }
    });

    // Notify user of failure
    const job = await prisma.searchJob.findUnique({
      where: { id: jobId }
    });
    if (job) {
      await prisma.notification.create({
        data: {
          workspaceId: job.workspaceId,
          title: 'Automated Scan Failed ⚠️',
          message: `Your scheduled scan for "${job.vertical}" failed: ${err.message}`,
          type: 'warning',
        }
      });
    }
  }
}

/**
 * Queries all due scheduled searches, creates a search job for each, and executes them.
 */
export async function triggerScheduledSearches(): Promise<{ triggeredCount: number; jobs: string[] }> {
  const now = new Date();
  
  // Find all active scheduled searches due for run
  const dueSchedules = await prisma.scheduledSearch.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now }
    }
  });

  console.log(`[Scheduler] Found ${dueSchedules.length} due scheduled searches.`);

  const triggeredJobs: string[] = [];

  for (const schedule of dueSchedules) {
    try {
      // 1. Quota check for search jobs limit
      const quota = await canPerformAction(schedule.workspaceId, 'searches');
      if (!quota.allowed) {
        console.warn(`[Scheduler] Workspace ${schedule.workspaceId} reached searches quota. Skipping schedule ${schedule.id}.`);
        
        // Notify workspace once about quota skip
        await prisma.notification.create({
          data: {
            workspaceId: schedule.workspaceId,
            title: 'Schedules Paused (Quota Exceeded) ⚠️',
            message: `Your automated scan for "${schedule.vertical}" was skipped because you reached your daily search limits. Upgrade in settings to resume.`,
            type: 'warning'
          }
        });

        // Set next run to tomorrow to avoid spinning endlessly
        await prisma.scheduledSearch.update({
          where: { id: schedule.id },
          data: {
            nextRunAt: calculateNextRun(schedule.interval, now)
          }
        });
        continue;
      }

      // 2. Create the SearchJob
      const searchJob = await prisma.searchJob.create({
        data: {
          workspaceId: schedule.workspaceId,
          vertical: schedule.vertical,
          locationType: schedule.locationType,
          city: schedule.city,
          state: schedule.state,
          zipCode: schedule.zipCode,
          radiusMiles: schedule.radiusMiles,
          targetCount: schedule.targetCount,
          filters: schedule.filters || undefined,
          status: 'queued',
          scheduledSearchId: schedule.id,
          totalFound: 0,
          totalEnriched: 0,
          totalScored: 0,
        }
      });

      // 3. Increment quota searches counter for workspace
      await incrementUsage(schedule.workspaceId, 'searches');

      // 4. Update the ScheduledSearch run parameters
      const nextRunAt = calculateNextRun(schedule.interval, now);
      await prisma.scheduledSearch.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          nextRunAt
        }
      });

      // 5. Trigger the job processing asynchronously in a background promise
      executeScheduledSearchJob(searchJob.id);

      triggeredJobs.push(searchJob.id);
    } catch (err: any) {
      console.error(`[Scheduler] Failed to trigger scheduled search ${schedule.id}:`, err);
    }
  }

  return {
    triggeredCount: triggeredJobs.length,
    jobs: triggeredJobs
  };
}
