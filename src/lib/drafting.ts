import prisma from './prisma';
import { ChatOpenAI } from '@langchain/openai';

export interface EmailDraftResult {
  subject: string;
  body: string;
  personalizationPoints?: string[];
}

/**
 * Local deterministic email draft generator based on business signals.
 * Serves as a high-quality fallback and a baseline helper.
 */
export function generateLocalFallbackDraft(lead: any, signals: any, tone: 'direct' | 'friendly' | 'professional'): EmailDraftResult {
  let observedFact = "";
  let painPoint = "";
  let valueProp = "";
  let cta = "";

  if (!signals || !signals.hasWebsite) {
    observedFact = "I was looking for local service providers in the area and noticed your business doesn't have an active website yet.";
    painPoint = "In today's market, over 80% of local customers search online first, meaning you might be losing valuable bookings to competitors.";
    valueProp = "At Athenalytics, we build fast, high-converting launchpad websites for local businesses that start generating phone calls within weeks.";
  } else if (!signals.hasBooking && signals.hasWebsite) {
    observedFact = "I took a look at your website and noticed that customers aren't able to book appointments or request quotes directly online.";
    painPoint = "Most consumers now expect instant booking options, and without them, potential clients often bounce to other local sites.";
    valueProp = "Our conversion booking widgets integrate seamlessly into your current website and typically recover up to 35% of previously lost customer traffic.";
  } else if (!signals.mobileFriendly && signals.hasWebsite) {
    observedFact = "I noticed your website isn't fully optimized for mobile devices, which makes it hard to read and navigate on a smartphone.";
    painPoint = "Since over 60% of search traffic is on mobile, this friction can cause prospective clients to leave your site in frustration.";
    valueProp = "We build lightning-fast mobile responsive overlays that ensure a seamless, professional experience on any device.";
  } else if ((signals.reviewCount ?? 0) === 0) {
    observedFact = "I noticed you don't have a public review footprint online yet.";
    painPoint = "Trust is everything for local businesses, and modern search engines strongly favor businesses with active reviews.";
    valueProp = "We build automated reputational systems that collect authentic customer reviews and showcase them directly to search engines.";
  } else {
    observedFact = `I've been following local businesses in ${lead.city || 'your area'} and wanted to reach out regarding ${lead.businessName}.`;
    painPoint = "With local search competition rising, small digital friction points can quietly divert potential customers elsewhere.";
    valueProp = "Athenalytics helps businesses optimize their digital conversions by resolving website conversion, speed, and booking limitations.";
  }

  // CTA selection based on tone
  if (tone === 'friendly') {
    cta = "Are you open to a brief 5-minute chat next Tuesday to see if this might be a fit? I'd love to share some ideas.";
  } else if (tone === 'direct') {
    cta = "Do you have 5 minutes for a quick call next Tuesday?";
  } else {
    cta = "Would you be open to a brief, 5-minute introductory consultation next Tuesday afternoon?";
  }

  let subject = "";
  let body = "";

  if (tone === 'friendly') {
    subject = `Quick question about ${lead.businessName} 😊`;
    body = `Hi team,\n\nHope your week is going great! ${observedFact} ${painPoint} ${valueProp} ${cta}\n\nBest regards,\nAthenalytics Team`;
  } else if (tone === 'direct') {
    subject = `Outreach: Digital upgrades for ${lead.businessName}`;
    body = `Hello,\n\n${observedFact} ${painPoint} ${valueProp} ${cta}\n\nThanks,\nAthenalytics Team`;
  } else { // professional
    subject = `Strategic growth and optimization - ${lead.businessName}`;
    body = `Dear Sir or Madam,\n\nI hope this message finds you well. ${observedFact} ${painPoint} ${valueProp} ${cta}\n\nSincerely,\nAthenalytics Team`;
  }

  return {
    subject,
    body,
    personalizationPoints: [observedFact, painPoint, valueProp, cta]
  };
}

/**
 * Service to draft a personalized outreach email using OpenRouter or local fallback.
 */
export async function draftEmail(leadId: string, tone: 'direct' | 'friendly' | 'professional'): Promise<EmailDraftResult & { dbDraft?: any }> {
  // 1. Fetch Lead and signals
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { signals: true }
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const signals = lead.signals;

  // 2. Generate baseline/fallback
  const fallback = generateLocalFallbackDraft(lead, signals, tone);

  // 3. Verify OpenRouter API Key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(`[Drafting Engine] No OPENROUTER_API_KEY found. Falling back to local template generator.`);
    
    // Save draft as 'pending' in the DB
    const dbDraft = await prisma.emailDraft.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        subject: fallback.subject,
        body: fallback.body,
        status: 'pending'
      }
    });

    // Update lead status to drafted
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'drafted' }
    });

    return {
      ...fallback,
      dbDraft
    };
  }

  try {
    // 4. Initialize OpenRouter Chat Client
    const chat = new ChatOpenAI({
      modelName: 'google/gemma-2-9b-it:free',
      openAIApiKey: apiKey,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://netlify.com',
          'X-Title': 'Athenalytics Lead Engine'
        }
      },
      temperature: 0.7,
      maxTokens: 1000
    });

    const systemPrompt = `You are the Athenalytics Email Outreach Drafting Engine, an elite B2B sales copywriter.
Your goal is to write a highly personalized, concise outreach email to a local business based on their digital maturity signals.

You MUST respond in pure JSON. Do not write markdown, code blocks, or explanations outside the JSON.
The JSON object must contain EXACTLY these keys:
1. "subject": A compelling, professional email subject line under 60 characters.
2. "body": A highly personalized email body under 150 words.
3. "personalizationPoints": An array of exactly 4 strings representing:
   - Index 0: The observed business fact used.
   - Index 1: The likely analytics/digital pain point highlighted.
   - Index 2: The relevant Athenalytics value proposition stated.
   - Index 3: The low-friction Call to Action (CTA) offered.

Strict copy guidelines:
- Tone: The user selected tone is "${tone}" (friendly, direct, or professional). Adjust the greeting, sign-off, and vocabulary accordingly.
- Factual Grounding: You MUST ONLY refer to verified facts present in the lead data and signals. You are strictly forbidden from fabricating facts (e.g. do not say "I visited your website and saw it was slow" unless you have specific, verified evidence).
- If there is sparse data or no website, produce a conservative, exploratory draft asking if they are currently accepting new clients or looking to establish their initial web presence.
- Keep the copy extremely clean, short, professional, and free of generic sales fluff. Do not use placeholders like [Your Name] or [Insert Date]. Sign off as "Athenalytics Team".`;

    const userPrompt = `
Business Name: ${lead.businessName}
Category: ${lead.category || 'Unknown'}
Location: ${lead.city || ''}, ${lead.state || ''} (Distance: ${lead.distanceMiles ? lead.distanceMiles.toFixed(1) + ' miles' : 'unknown'})
Website: ${lead.website || 'None'}

Digital Signals:
- Has Website: ${signals?.hasWebsite ?? 'unknown'}
- Mobile Friendly: ${signals?.mobileFriendly ?? 'unknown'}
- Online Booking Option: ${signals?.hasBooking ?? 'unknown'}
- Online Ordering Option: ${signals?.hasOrdering ?? 'unknown'}
- Total Reviews: ${signals?.reviewCount ?? 0}
- Active Social Media: ${signals?.socialPresence ?? 'unknown'}
- Reachable / Contact Ready: ${signals?.contactReadiness ?? 'unknown'}

Evidence Snippets Collected:
${signals?.evidenceSnippets ? JSON.stringify(signals.evidenceSnippets, null, 2) : 'None'}

Baseline Draft for Reference:
- Subject: ${fallback.subject}
- Body: ${fallback.body}
- Personalization Points: ${JSON.stringify(fallback.personalizationPoints)}

Generate the personalized JSON email draft now.`;

    const response = await chat.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const content = response.text || response.content;
    let jsonContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Clean up potential markdown JSON brackets if the LLM outputted them
    jsonContent = jsonContent.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const result = JSON.parse(jsonContent);

    // Validate structure
    const subject = typeof result.subject === 'string' ? result.subject : fallback.subject;
    const body = typeof result.body === 'string' ? result.body : fallback.body;
    const personalizationPoints = Array.isArray(result.personalizationPoints) ? result.personalizationPoints : fallback.personalizationPoints;

    // Save draft in the database
    const dbDraft = await prisma.emailDraft.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        subject,
        body,
        status: 'pending'
      }
    });

    // Update lead status to drafted
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'drafted' }
    });

    return {
      subject,
      body,
      personalizationPoints,
      dbDraft
    };

  } catch (err: any) {
    console.error(`[Drafting Engine] OpenRouter draft generation failed: ${err.message}. Falling back to local template.`);
    
    // Save draft in database
    const dbDraft = await prisma.emailDraft.create({
      data: {
        workspaceId: lead.workspaceId,
        leadId: lead.id,
        subject: fallback.subject,
        body: fallback.body,
        status: 'pending'
      }
    });

    // Update lead status to drafted
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'drafted' }
    });

    return {
      ...fallback,
      dbDraft
    };
  }
}
