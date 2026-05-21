import prisma from './prisma';

export const DEFAULT_WORKSPACE_ID = 'default-workspace';

export interface ScoringWeights {
  fit: number;
  website: number;
  demand: number;
  analytics: number;
  outreach: number;
  growth: number;
  geo: number;
}

export interface IcpPresets {
  requiredWebsite: boolean;
  minReviewCount: number;
  requireBooking: boolean;
  requireOrdering: boolean;
  requireSocial: boolean;
}

export interface PromptTemplates {
  direct: string;
  friendly: string;
  professional: string;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  fit: 15,
  website: 25,
  demand: 15,
  analytics: 15,
  outreach: 15,
  growth: 10,
  geo: 5,
};

export const DEFAULT_ICP_PRESETS: IcpPresets = {
  requiredWebsite: false,
  minReviewCount: 0,
  requireBooking: false,
  requireOrdering: false,
  requireSocial: false,
};

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplates = {
  direct: "Hi {{businessName}},\n\nI noticed your website lacks structured analytics or clear conversion pathways. We help businesses like yours fix this quickly.\n\nBest,\n{{senderName}}",
  friendly: "Hey there {{businessName}} team,\n\nHope you're having a great week! I was browsing local spots in {{city}} and came across your website. I love what you do! I noticed a few minor tweaks to your website's analytics could help you capture a lot more customers. We'd love to help out.\n\nWarmly,\n{{senderName}}",
  professional: "Dear {{businessName}} Management,\n\nI am writing to share a digital maturity audit of your online presence. Our team identified specific optimization opportunities regarding your analytics setup and contact readiness. We would be pleased to schedule a brief consultation to discuss these findings.\n\nSincerely,\n{{senderName}}",
};

/**
 * Extracts the workspaceId from request headers or query parameters.
 */
export function getWorkspaceIdFromRequest(request?: Request | null): string {
  if (!request) {
    return DEFAULT_WORKSPACE_ID;
  }

  // 1. Try to read from headers
  const headerWorkspaceId = request.headers.get('x-workspace-id');
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  // 2. Try to read from query params
  try {
    const url = new URL(request.url);
    const queryWorkspaceId = url.searchParams.get('workspaceId');
    if (queryWorkspaceId) {
      return queryWorkspaceId;
    }
  } catch {
    // Ignore URL parse errors for relative urls
  }

  return DEFAULT_WORKSPACE_ID;
}

/**
 * Retrieve settings for a specific workspace.
 * If settings do not exist, seeds the database with defaults.
 */
export async function getWorkspaceSettings(workspaceId: string) {
  const existing = await prisma.settings.findUnique({
    where: { workspaceId },
  });

  if (existing) {
    return existing;
  }

  // Seed default settings for workspace
  return await prisma.settings.create({
    data: {
      workspaceId,
      senderName: "Athenalytics Team",
      senderEmail: "outreach@athenalytics.co",
      scoringWeights: DEFAULT_SCORING_WEIGHTS as any,
      icpPresets: DEFAULT_ICP_PRESETS as any,
      defaultRadiusMiles: 10,
      promptTemplates: DEFAULT_PROMPT_TEMPLATES as any,
    },
  });
}

/**
 * Validates settings input to verify the weights sum to 100%.
 */
export function validateScoringWeights(weights: ScoringWeights): boolean {
  const sum = 
    (weights.fit || 0) + 
    (weights.website || 0) + 
    (weights.demand || 0) + 
    (weights.analytics || 0) + 
    (weights.outreach || 0) + 
    (weights.growth || 0) + 
    (weights.geo || 0);
  return Math.abs(sum - 100) < 0.01;
}

/**
 * Verify a user/request has access to a specific resource's workspace.
 * Prevents cross-workspace data leakage.
 */
export function verifyWorkspaceAccess(resourceWorkspaceId: string, requestWorkspaceId: string): boolean {
  if (resourceWorkspaceId !== requestWorkspaceId) {
    throw new Error('Access denied: Cross-workspace resource leakage blocked');
  }
  return true;
}
