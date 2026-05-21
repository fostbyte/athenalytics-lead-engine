import 'dotenv/config';
import prisma from './prisma';

async function main() {
  try {
    const jobs = await prisma.searchJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log("RECENT SEARCH JOBS:");
    console.log(JSON.stringify(jobs, null, 2));

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log("\nRECENT LEADS:");
    console.log(JSON.stringify(leads, null, 2));

  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
