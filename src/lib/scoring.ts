import prisma from './prisma';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { getWorkspaceSettings } from './tenant';
import { logAuditEvent } from './audit';

// 1. Define the LangGraph state interface and schema using Annotations
const ScoringState = Annotation.Root({
  leadId: Annotation<string>,
  lead: Annotation<any>,
  signals: Annotation<any>,
  settings: Annotation<any>,
  score: Annotation<number>,
  scoreBand: Annotation<string>,
  reasons: Annotation<string[]>,
  confidence: Annotation<number>,
  error: Annotation<string | undefined>,
});

/**
 * Node 1: Fetch lead, signal, and settings data from the database
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

    const settings = await getWorkspaceSettings(lead.workspaceId);

    return {
      lead,
      signals: lead.signals || null,
      settings,
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
export function calculateHeuristicScore(lead: any, signals: any, settings?: any) {
  let score = 0;
  const reasons: string[] = [];

  // Default weights and presets if none supplied
  const weights = settings?.scoringWeights || {
    fit: 15,
    website: 25,
    demand: 15,
    analytics: 15,
    outreach: 15,
    growth: 10,
    geo: 5,
  };

  const presets = settings?.icpPresets || {
    requiredWebsite: false,
    minReviewCount: 0,
    requireBooking: false,
    requireOrdering: false,
    requireSocial: false,
  };

  // If no signals are found, return minimal defaults
  if (!signals) {
    return {
      score: 10,
      scoreBand: 'exclude',
      reasons: ['No digital footprint or enrichment signals discovered yet.'],
      confidence: 0.1
    };
  }

  // --- ICP Presets Enforcements (Strict Hard-Filters) ---
  if (presets.requiredWebsite && !signals.hasWebsite) {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: ['Excluded: ICP preset requires an active business website, but none was detected.'],
      confidence: 1.0
    };
  }

  const reviews = signals.reviewCount ?? 0;
  if (presets.minReviewCount && reviews < presets.minReviewCount) {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: [`Excluded: ICP preset requires at least ${presets.minReviewCount} reviews (lead has ${reviews}).`],
      confidence: 1.0
    };
  }

  if (presets.requireBooking && !signals.hasBooking) {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: ['Excluded: ICP preset requires online booking support.'],
      confidence: 1.0
    };
  }

  if (presets.requireOrdering && !signals.hasOrdering) {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: ['Excluded: ICP preset requires online ordering capability.'],
      confidence: 1.0
    };
  }

  if (presets.requireSocial && !signals.socialPresence) {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: ['Excluded: ICP preset requires active social media presence.'],
      confidence: 1.0
    };
  }

  // --- Dynamic Factor Calculations ---

  // 1. Business Fit (Weight: fit)
  if (lead.category) {
    score += weights.fit;
    reasons.push(`Strong category fit under '${lead.category}'.`);
  } else {
    score += weights.fit * 0.4;
    reasons.push('General business category detected.');
  }

  // 2. Website Quality (Weight: website)
  if (signals.hasWebsite) {
    let websiteScore = weights.website * 0.5;
    reasons.push('Has active business website.');
    if (signals.mobileFriendly) {
      websiteScore += weights.website * 0.5;
      reasons.push('Website is optimized for mobile responsiveness.');
    } else {
      reasons.push('Website lacks mobile optimization, causing high bounce rates.');
    }
    score += websiteScore;
  } else {
    reasons.push('No website detected, presenting high digital services opportunity.');
  }

  // 3. Conversion Booking (Weight: demand)
  let conversionScore = 0;
  if (signals.hasBooking) {
    conversionScore += weights.demand * 0.5;
    reasons.push('Offers direct online booking, increasing conversion potential.');
  }
  if (signals.hasOrdering) {
    conversionScore += weights.demand * 0.5;
    reasons.push('Supports direct online ordering features.');
  }
  if (signals.hasWebsite && !signals.hasBooking && !signals.hasOrdering) {
    reasons.push('Lacks online booking/ordering options, indicating service integration opportunity.');
  }
  score += conversionScore;

  // 4. Analytics Pain (Weight: analytics)
  if (signals.hasWebsite) {
    if (!signals.hasBooking || !signals.hasOrdering) {
      score += weights.analytics;
      reasons.push('Website lacks advanced call-to-actions, indicating analytics gap.');
    } else {
      score += weights.analytics * 0.4;
      reasons.push('Standard call-to-actions present.');
    }
  } else {
    score += weights.analytics;
    reasons.push('Lacks web analytics footprint, high setup opportunity.');
  }

  // 5. Contact Readiness (Weight: outreach)
  if (signals.contactReadiness) {
    score += weights.outreach;
    reasons.push('Direct email or phone contact pathways are readily available.');
  } else {
    reasons.push('Requires manual contact discovery, reducing initial outreach readiness.');
  }

  // 6. Social & Growth (Weight: growth)
  let growthScore = 0;
  if (signals.socialPresence) {
    growthScore += weights.growth * 0.5;
    reasons.push('Established social media presence increases outreach response rates.');
  }
  if (reviews > 0 && reviews <= 150) {
    growthScore += weights.growth * 0.5;
    reasons.push(`Active local profile (${reviews} reviews) indicating steady customer activity.`);
  }
  score += growthScore;

  // 7. Geographic Proximity (Weight: geo)
  const distance = lead.distanceMiles ?? 999;
  if (distance <= 5) {
    score += weights.geo;
    reasons.push('Highly relevant local target located within a 5-mile radius.');
  } else if (distance <= 15) {
    score += weights.geo * 0.7;
    reasons.push('Conveniently located local target within a 15-mile radius.');
  } else {
    score += weights.geo * 0.4;
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
    slicedReasons.push(reasons[slicedReasons.length] || 'Local matching context.');
  }

  return {
    score: Math.round(finalScore),
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
  const settings = state.settings;

  // 1. Calculate heuristic baseline
  const baseline = calculateHeuristicScore(lead, signals, settings);

  // If the baseline immediate-excludes the lead, bypass the LLM and return 0
  if (baseline.score === 0 && baseline.scoreBand === 'exclude') {
    return {
      score: 0,
      scoreBand: 'exclude',
      reasons: baseline.reasons,
      confidence: 1.0
    };
  }

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
    // Set process.env.OPENAI_API_KEY as a backup for maximum LangChain compatibility
    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }

    const chat = new ChatOpenAI({
      modelName: 'openrouter/free',
      model: 'openrouter/free',
      openAIApiKey: apiKey,
      apiKey: apiKey,
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

    // 4. Construct prompt for structured evaluation with dynamic weights
    const systemPrompt = `You are the Athenalytics Scoring Engine, a highly professional lead evaluation system.
Your job is to analyze a local business lead's digital maturity signals and return a JSON object with:
1. "score": An integer from 0 to 100 evaluating outreach eligibility.
2. "scoreBand": One of "high" (score >= 75), "medium" (score >= 50), "review" (score >= 20), or "exclude" (score < 20).
3. "reasons": An array of EXACTLY 3 to 5 clear, concise, evidence-backed reasons (1 sentence each) explaining the score. Do not make up facts.

You MUST score the business based on these custom workspace weights (total 100 points):
- Business Fit weight: ${settings?.scoringWeights?.fit ?? 15} points (points for clear category matching).
- Website Quality weight: ${settings?.scoringWeights?.website ?? 25} points (points for having website and mobile friendliness).
- Conversion Booking weight: ${settings?.scoringWeights?.demand ?? 15} points (booking/ordering features).
- Analytics Pain weight: ${settings?.scoringWeights?.analytics ?? 15} points (opportunity from missing tools).
- Contact Readiness weight: ${settings?.scoringWeights?.outreach ?? 15} points (readily available contact details).
- Social Presence & Growth weight: ${settings?.scoringWeights?.growth ?? 10} points (social media and reviews).
- Geographic Proximity weight: ${settings?.scoringWeights?.geo ?? 5} points (proximity distance).

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

    // Log OpenRouter API Token Usage
    try {
      const usage = (response as any).usage_metadata || (response as any).response_metadata?.tokenUsage || (response as any).additional_kwargs?.tokenUsage;
      const promptTokens = usage?.promptTokens ?? usage?.prompt_tokens ?? 0;
      const completionTokens = usage?.completionTokens ?? usage?.completion_tokens ?? 0;

      await prisma.apiUsageLog.create({
        data: {
          apiName: 'openrouter',
          cost: 0.0,
          promptTokens: promptTokens || undefined,
          completionTokens: completionTokens || undefined,
        }
      });
    } catch (logErr: any) {
      console.error('[Scoring Engine] Failed to log OpenRouter API usage:', logErr.message);
    }

    const content = response.text || response.content;
    let jsonContent = typeof content === 'string' ? content : JSON.stringify(content);
    
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
      parsedReasons = baseline.reasons;
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
 * Node 3: Save computed scores and band data back to Neon and log audit trail
 */
async function saveResultsNode(state: typeof ScoringState.State) {
  if (state.error) return {};

  try {
    const originalLead = await prisma.lead.findUnique({
      where: { id: state.leadId }
    });

    const isRescore = originalLead && typeof originalLead.score === 'number';

    const updatedLead = await prisma.lead.update({
      where: { id: state.leadId },
      data: {
        score: state.score,
        scoreBand: state.scoreBand,
        reasons: state.reasons,
        status: 'scored',
      }
    });

    // Increment search job's totalScored count if it's the first time scoring
    if (!isRescore) {
      await prisma.searchJob.update({
        where: { id: updatedLead.searchJobId },
        data: {
          totalScored: { increment: 1 }
        }
      });
    }

    // Log the audit event for compliance
    await logAuditEvent(
      updatedLead.workspaceId,
      isRescore ? 'rescore' : 'scoring',
      'Lead',
      updatedLead.id,
      {
        before: originalLead ? { score: originalLead.score, band: originalLead.scoreBand } : null,
        after: { score: state.score, band: state.scoreBand, reasons: state.reasons }
      }
    );

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
