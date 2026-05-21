import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log("Checking SearchJobs in the database:");
  const jobs = await prisma.searchJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (jobs.length === 0) {
    console.log("No SearchJobs found.");
  }

  for (const job of jobs) {
    console.log(`- Job ID: ${job.id}`);
    console.log(`  Vertical: ${job.vertical}`);
    console.log(`  Location: ${job.locationType} (City: ${job.city}, State: ${job.state}, ZIP: ${job.zipCode})`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Total Found: ${job.totalFound}`);
    console.log(`  Error: ${job.error}`);
    console.log(`  Created At: ${job.createdAt}`);

    const leads = await prisma.lead.findMany({
      where: { searchJobId: job.id }
    });
    console.log(`  Leads Count: ${leads.length}`);
    for (const lead of leads) {
      console.log(`    * Lead: ${lead.businessName} (Place ID: ${lead.placeId}, Score: ${lead.score}, Band: ${lead.scoreBand}, Status: ${lead.status})`);
      const signals = await prisma.leadSignals.findUnique({
        where: { leadId: lead.id }
      });
      console.log(`      Signals: hasWebsite: ${signals?.hasWebsite}, rating: ${signals?.rating}`);
    }
    console.log();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
