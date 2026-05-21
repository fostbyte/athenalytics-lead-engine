import 'dotenv/config';
import { discoverLeads } from '../lib/discovery';

async function main() {
  console.log("Calling discoverLeads...");
  const candidates = await discoverLeads({
    industry: 'lawn care',
    zipCode: '33598',
    lat: 27.8184,
    lng: -82.3255,
    targetCount: 5,
    radiusMiles: 1
  });

  console.log(`Returned Candidates Count: ${candidates.length}`);
  console.log("Candidates:", candidates);
}

main().catch(console.error);
