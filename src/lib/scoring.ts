import prisma from './prisma';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

// 1. Define the LangGraph state interface and schema using Annotations
const ScoringState = Annotation.Root({
  leadId: Annotation<string>,
  lead: Annotation<any>,
  signals: Annotation<any>,
  score: Annotation<number>,
  scoreBand: Annotation<string>,
  reasons: Annotation<string[]>,
  confidence: Annotation<number>,
  error: Annotation<string | undefined>,
});

/**
 * Node 1: Fetch lead and signal data from the database
 */
async function fetchDataNode(state: typeof ScoringState.State) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: state.leadId },
      include: { signals: true }
    });

    if (!lead) {
      return { error: `Lead not found: ${state.leadId}` };
    }

    return {
      lead,
      signals: lead.signals || null,
      error: undefined
    };
  } catch (err: any) {
    return { error: `Failed to fetch data: ${err.message}` };
  }
}

/**
 * Local deterministic heuristic scoring calculation.
 * Used as a fallback and to calibrate/ground the LLM scoring context.
 */
export function calculateHeuristicScore(lead: any, signals: any) {
  let score = 0;
  const reasons: string[] = [];

  // If no signals are found, return minimal defaults
  if (!signals) {
    return {
      score: 10,
      scoreBand: 'exclude',
      reasons: ['No digital footprint or enrichment signals discovered yet.'],
      confidence: 0.1
    };
  }

  // 1. Website Presence & Quality (Max 25 pts)
  if (signals.hasWebsite) {
    score += 5;
    reasons.push('Has active business website.');
    if (signals.mobileFriendly) {
      score += 5;
      reasons.push('Website is optimized for mobile responsiveness.');
    } else {
      reasons.push('Website lacks mobile optimization, causing high bounce rates.');
    }
  } else {
    reasons.push('No website detected, presenting high digital services opportunity.');
  }

  // 2. Booking & Conversion Options (Max 20 pts)
  if (signals.hasBooking) {
    score += 10;
    reasons.push('Offers direct online booking, increasing conversion potential.');
  } else if (signals.hasWebsite) {
    reasons.push('Lacks online booking, indicating service integration opportunity.');
  }

  if (signals.hasOrdering) {
    score += 10;
    reasons.push('Supports direct online ordering features.');
  }

  // 3. Contact Readiness & Reach (Max 20 pts)
  if (signals.contactReadiness) {
    score += 10;
    reasons.push('Direct email or phone contact pathways are readily available.');
  }
  if (signals.socialPresence) {
    score += 10;
    reasons.push('Established social media presence increases outreach response rates.');
  }

  // 4. Reputation & Demand Metrics (Max 25 pts)
  const reviews = signals.reviewCount ?? 0;
  if (reviews === 0) {
    score += 5;
    reasons.push('No public review footprint, high opportunity for reputational guidance.');
  } else if (reviews <= 30) {
    score += 15;
    reasons.push(`Growing profile (${reviews} reviews) with high scaling intent.`);
  } else if (reviews <= 150) {
    score += 25;
    reasons.push(`Strong established profile (${reviews} reviews), indicating good budget capacity.`);
  } else {
    score += 15;
    reasons.push(`Dominant local player (${reviews} reviews) with mature client acquisition flow.`);
  }

  // 5. Geographic Proximity (Max 10 pts)
  const distance = lead.distanceMiles ?? 999;
  if (distance <= 5) {
    score += 10;
    reasons.push('Highly relevant local target located within a 5-mile radius.');
  } else if (distance <= 15) {
    score += 7;
    reasons.push('Conveniently located local target within a 15-mile radius.');
  } else {
    score += 4;
  }

  // Cap score at 100 and min at 0
  const finalScore = Math.max(0, Math.min(100, score));

  // Classify band
  let scoreBand = 'review';
  if (finalScore >= 75) {
    scoreBand = 'high';
  } else if (finalScore >= 50) {
    scoreBand = 'medium';
  } else if (finalScore >= 20) {
    scoreBand = 'review';
  } else {
    scoreBand = 'exclude';
  }

  // Slice to return exactly 3 to 5 reasons
  const slicedReasons = reasons.slice(0, 5);
  while (slicedReasons.length < 3 && slicedReasons.length < reasons.length) {
    // Ensure we have at least 3 reasons if possible
    slicedReasons.push(reasons[slicedReasons.length] || 'Local matching context.');
  }

  return {
    score: finalScore,
    scoreBand,
    reasons: slicedReasons,
    confidence: signals ? 0.9 : 0.2
  };
}

/**
 * Node 2: Core Scoring logic (calls OpenRouter free model, with deterministic fallback)
 */
async function llmScoringNode(state: typeof ScoringState.State) {
  if (state.error) return {};

  const lead = state.lead;
  const signals = state.signals;

  // 1. Calculate heuristic baseline
  const baseline = calculateHeuristicScore(lead, signals);

  // 2. Check for OpenRouter API Key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(`[Scoring Engine] No OPENROUTER_API_KEY found. Falling back to local heuristic scoring.`);
    return {
      score: baseline.score,
      scoreBand: baseline.scoreBand,
      reasons: baseline.reasons,
      confidence: baseline.confidence
    };
  }

  try {
    // 3. Initialize OpenRouter Chat Client
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
      temperature: 0.2,
      maxTokens: 500
    });

    // 4. Construct prompt for structured evaluation
    const systemPrompt = `You are the Athenalytics Scoring Engine, a highly professional lead evaluation system.
Your job is to analyze a local business lead's digital maturity signals and return a JSON object with:
1. "score": An integer from 0 to 100 evaluating outreach eligibility.
2. "scoreBand": One of "high" (score >= 75), "medium" (score >= 50), "review" (score >= 20), or "exclude" (score < 20).
3. "reasons": An array of EXACTLY 3 to 5 clear, concise, evidence-backed reasons (1 sentence each) explaining the score. Do not make up facts.

Heuristics to consider:
- Businesses lacking booking channels, websites, or mobile friendliness represent higher digital maturity upside (sales potential), but must have active contact details.
- Active contact channels and social presence indicate high responsiveness.
- High review counts (50-200) mean high budget capability. Zero or very low reviews represent an opportunity to sell review-generation services.
- Proximity is a positive multiplier.

You MUST respond in pure JSON. Do not write markdown, code blocks, or explanations outside the JSON.`;

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

Baseline Heuristic Calculation for Reference:
- Suggested Score: ${baseline.score}
- Suggested Band: ${baseline.scoreBand}
- Suggested Reasons: ${JSON.stringify(baseline.reasons)}

Review these metrics and outputs. Return your updated JSON scoring object now.`;

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

    // Validate the schema of the returned JSON
    const parsedScore = typeof result.score === 'number' ? result.score : baseline.score;
    const parsedBand = ['high', 'medium', 'review', 'exclude'].includes(result.scoreBand) 
      ? result.scoreBand 
      : baseline.scoreBand;
    
    let parsedReasons = Array.isArray(result.reasons) ? result.reasons : baseline.reasons;
    if (parsedReasons.length < 3 || parsedReasons.length > 5) {
      parsedReasons = baseline.reasons; // Fallback to baseline if reason count limits violated
    }

    return {
      score: parsedScore,
      scoreBand: parsedBand,
      reasons: parsedReasons,
      confidence: 0.95
    };

  } catch (err: any) {
    console.error(`[Scoring Engine] OpenRouter call failed: ${err.message}. Falling back to baseline heuristic.`);
    return {
      score: baseline.score,
      scoreBand: baseline.scoreBand,
      reasons: baseline.reasons,
      confidence: baseline.confidence
    };
  }
}

/**
 * Node 3: Save computed scores and band data back to Neon
 */
async function saveResultsNode(state: typeof ScoringState.State) {
  if (state.error) return {};

  try {
    const updatedLead = await prisma.lead.update({
      where: { id: state.leadId },
      data: {
        score: state.score,
        scoreBand: state.scoreBand,
        reasons: state.reasons,
        status: 'scored',
      }
    });

    // Optionally increment search job's totalScored count
    await prisma.searchJob.update({
      where: { id: updatedLead.searchJobId },
      data: {
        totalScored: { increment: 1 }
      }
    });

    return { lead: updatedLead };
  } catch (err: any) {
    return { error: `Failed to save results: ${err.message}` };
  }
}

// 5. Build and compile the StateGraph
const workflow = new StateGraph(ScoringState)
  .addNode('fetchData', fetchDataNode)
  .addNode('llmScoring', llmScoringNode)
  .addNode('saveResults', saveResultsNode)
  .addEdge(START, 'fetchData')
  .addEdge('fetchData', 'llmScoring')
  .addEdge('llmScoring', 'saveResults')
  .addEdge('saveResults', END);

const compiledGraph = workflow.compile();

/**
 * Primary orchestrator export. Runs the LangGraph scoring flow for a single lead.
 */
export async function scoreLead(leadId: string) {
  const result = await compiledGraph.invoke({ leadId });
  
  if (result.error) {
    throw new Error(result.error);
  }

  return {
    success: true,
    lead: result.lead,
    score: result.score,
    scoreBand: result.scoreBand,
    reasons: result.reasons
  };
}
