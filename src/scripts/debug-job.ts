import 'dotenv/config';
import prisma from '../lib/prisma';
import { processDiscoveryJob } from '../lib/worker';

async function main() {
  console.log("Fetching the most recent queued or completed job...");
  const job = await prisma.searchJob.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!job) {
    console.log("No job found.");
    return;
  }

  console.log(`Job ID: ${job.id}`);
  console.log(`Vertical: ${job.vertical}`);
  console.log(`Location: ${job.zipCode || `${job.city}, ${job.state}`}`);
  console.log(`Radius: ${job.radiusMiles}`);
  console.log(`Target Count: ${job.targetCount}`);
  console.log(`Current Status: ${job.status}`);

  console.log("\nRunning processDiscoveryJob directly for debug...");
  const result = await processDiscoveryJob(job.id);
  console.log("Result:", result);

  const updatedJob = await prisma.searchJob.findUnique({
    where: { id: job.id }
  });
  console.log("Updated Job Status:", updatedJob?.status);
  console.log("Updated Job Total Found:", updatedJob?.totalFound);
  console.log("Updated Job Error:", updatedJob?.error);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
