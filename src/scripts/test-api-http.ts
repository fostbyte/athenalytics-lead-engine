import 'dotenv/config';
import { SignJWT } from 'jose';

function getEncodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.startsWith('PLACEHOLDER')) {
    return new TextEncoder().encode('dev-fallback-key-not-for-production-32chars');
  }
  return new TextEncoder().encode(secret);
}

async function encrypt(payload: any): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey());
}

async function main() {
  const workspaceId = 'default-workspace';
  
  // Generate a valid session token for authentication
  console.log("Generating session token for auth...");
  const sessionToken = await encrypt({
    userId: 'admin-user-id',
    email: 'admin@foster.diy',
    name: 'Admin User',
    role: 'admin',
    workspaceId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  
  const headers = {
    'Content-Type': 'application/json',
    'x-workspace-id': workspaceId,
    'Cookie': `athena_session=${sessionToken}`
  };

  // 1. Create SearchJob
  console.log("1. Creating search job via HTTP...");
  const jobPayload = {
    workspaceId,
    vertical: 'lawn care',
    locationType: 'zip',
    zipCode: '33598',
    radiusMiles: 1,
    targetCount: 5
  };

  const jobRes = await fetch('http://localhost:3000/api/search-jobs', {
    method: 'POST',
    headers,
    body: JSON.stringify(jobPayload)
  });

  if (!jobRes.ok) {
    console.error("Failed to create job:", await jobRes.text());
    return;
  }

  const jobData: any = await jobRes.json();
  const jobId = jobData.searchJob.id;
  console.log(`Job created: ${jobId}`);

  // 2. Trigger Discovery Worker
  console.log("\n2. Triggering discovery worker via HTTP...");
  const discoveryRes = await fetch('http://localhost:3000/api/discovery-worker', {
    method: 'POST',
    headers,
    body: JSON.stringify({ jobId })
  });

  if (!discoveryRes.ok) {
    console.error("Discovery worker failed:", await discoveryRes.text());
    return;
  }

  const discoveryData = await discoveryRes.json();
  console.log("Discovery worker response:", discoveryData);

  // 3. Trigger Enrichment Worker
  console.log("\n3. Triggering enrichment worker via HTTP...");
  const enrichmentRes = await fetch('http://localhost:3000/api/enrichment-worker', {
    method: 'POST',
    headers,
    body: JSON.stringify({ searchJobId: jobId })
  });

  if (!enrichmentRes.ok) {
    console.error("Enrichment worker failed:", await enrichmentRes.text());
    return;
  }

  const enrichmentData = await enrichmentRes.json();
  console.log("Enrichment worker response:", enrichmentData);

  // 4. Trigger Scoring Worker
  console.log("\n4. Triggering scoring worker via HTTP...");
  const scoringRes = await fetch('http://localhost:3000/api/scoring-worker', {
    method: 'POST',
    headers,
    body: JSON.stringify({ searchJobId: jobId })
  });

  if (!scoringRes.ok) {
    console.error("Scoring worker failed:", await scoringRes.text());
    return;
  }

  const scoringData = await scoringRes.json();
  console.log("Scoring worker response:", scoringData);
}

main().catch(console.error);
