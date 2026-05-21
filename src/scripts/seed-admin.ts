/**
 * Admin seed script — creates or upserts the initial admin account.
 * Run once: npx tsx src/scripts/seed-admin.ts
 *
 * Reads credentials from:
 *   ADMIN_SEED_EMAIL   (e.g. admin@foster.diy)
 *   ADMIN_SEED_PASSWORD
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import bcrypt from 'bcryptjs';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in your .env file.'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await (prisma as any).user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name: 'Admin',
      passwordHash,
      role: 'admin',
      workspaceId: 'default-workspace',
      isActive: true,
    },
    update: {
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Admin account ready: ${user.email} (role: ${user.role}, id: ${user.id})`);
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
