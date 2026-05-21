import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  console.log("Checking recent AuditLogs:");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  for (const log of logs) {
    console.log(`- Action: ${log.action}, Entity: ${log.entityType} (${log.entityId}), Actor: ${log.actor}`);
    console.log(`  Details: ${JSON.stringify(log.details)}`);
    console.log(`  Created At: ${log.createdAt}`);
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
