import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, getWorkspaceSettings, validateScoringWeights } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';
import { encrypt } from '@/lib/crypto';
import { checkAndResetDailyQuotas } from '@/lib/limits';

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    
    // Ensure daily quota counts are reset if calendar day rolled over
    await checkAndResetDailyQuotas(workspaceId);
    
    const settings = await getWorkspaceSettings(workspaceId);
    
    // Sanitize encrypted password and BYO keys for safety
    const sanitized = {
      ...settings,
      smtpPassEncr: undefined,
      byoOpenRouterKeyEncr: undefined,
      byoGoogleMapsKeyEncr: undefined,
      hasSmtpPassword: !!settings.smtpPassEncr,
      hasByoOpenRouterKey: !!settings.byoOpenRouterKeyEncr,
      hasByoGoogleMapsKey: !!settings.byoGoogleMapsKeyEncr,
    };
    
    return NextResponse.json(sanitized);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const body = await request.json();

    // Load old settings first for auditing
    const oldSettings = await getWorkspaceSettings(workspaceId);

    // Validate weights if provided
    if (body.scoringWeights) {
      const isValid = validateScoringWeights(body.scoringWeights);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Scoring weights must sum up to exactly 100%' },
          { status: 400 }
        );
      }
    }

    // Process SMTP Password
    let smtpPassEncr: string | null | undefined = undefined;
    if (body.smtpPass === null || body.smtpPass === '') {
      smtpPassEncr = null;
    } else if (body.smtpPass !== undefined && body.smtpPass !== '•••••••• (Saved)' && body.smtpPass !== '••••••••') {
      smtpPassEncr = encrypt(body.smtpPass);
    }

    // Process BYO OpenRouter Key
    let byoOpenRouterKeyEncr: string | null | undefined = undefined;
    if (body.byoOpenRouterKey === null || body.byoOpenRouterKey === '') {
      byoOpenRouterKeyEncr = null;
    } else if (body.byoOpenRouterKey !== undefined && body.byoOpenRouterKey !== '•••••••• (Saved)' && body.byoOpenRouterKey !== '••••••••') {
      byoOpenRouterKeyEncr = encrypt(body.byoOpenRouterKey);
    }

    // Process BYO Google Maps Key
    let byoGoogleMapsKeyEncr: string | null | undefined = undefined;
    if (body.byoGoogleMapsKey === null || body.byoGoogleMapsKey === '') {
      byoGoogleMapsKeyEncr = null;
    } else if (body.byoGoogleMapsKey !== undefined && body.byoGoogleMapsKey !== '•••••••• (Saved)' && body.byoGoogleMapsKey !== '••••••••') {
      byoGoogleMapsKeyEncr = encrypt(body.byoGoogleMapsKey);
    }

    const updated = await prisma.settings.update({
      where: { workspaceId },
      data: {
        senderName: body.senderName ?? undefined,
        senderEmail: body.senderEmail ?? undefined,
        scoringWeights: body.scoringWeights ? (body.scoringWeights as any) : undefined,
        icpPresets: body.icpPresets ? (body.icpPresets as any) : undefined,
        defaultRadiusMiles: typeof body.defaultRadiusMiles === 'number' ? body.defaultRadiusMiles : undefined,
        promptTemplates: body.promptTemplates ? (body.promptTemplates as any) : undefined,
        
        // SMTP Fields
        smtpHost: body.smtpHost !== undefined ? body.smtpHost : undefined,
        smtpPort: typeof body.smtpPort === 'number' ? body.smtpPort : body.smtpPort === null ? null : undefined,
        smtpUser: body.smtpUser !== undefined ? body.smtpUser : undefined,
        smtpEnabled: typeof body.smtpEnabled === 'boolean' ? body.smtpEnabled : undefined,
        smtpPassEncr: smtpPassEncr !== undefined ? smtpPassEncr : undefined,

        // SaaS subscription & limits
        subscriptionTier: body.subscriptionTier !== undefined ? body.subscriptionTier : undefined,
        byoOpenRouterKeyEncr: byoOpenRouterKeyEncr !== undefined ? byoOpenRouterKeyEncr : undefined,
        byoGoogleMapsKeyEncr: byoGoogleMapsKeyEncr !== undefined ? byoGoogleMapsKeyEncr : undefined,
      },
    });

    // Log the audit event for workspace setting changes
    await logAuditEvent(
      workspaceId,
      'settings_update',
      'Settings',
      updated.id,
      {
        before: {
          senderName: oldSettings.senderName,
          senderEmail: oldSettings.senderEmail,
          scoringWeights: oldSettings.scoringWeights,
          icpPresets: oldSettings.icpPresets,
          promptTemplates: oldSettings.promptTemplates,
          smtpHost: oldSettings.smtpHost,
          smtpPort: oldSettings.smtpPort,
          smtpUser: oldSettings.smtpUser,
          smtpEnabled: oldSettings.smtpEnabled,
          subscriptionTier: oldSettings.subscriptionTier,
          hasByoOpenRouterKey: !!oldSettings.byoOpenRouterKeyEncr,
          hasByoGoogleMapsKey: !!oldSettings.byoGoogleMapsKeyEncr,
        },
        after: {
          senderName: updated.senderName,
          senderEmail: updated.senderEmail,
          scoringWeights: updated.scoringWeights,
          icpPresets: updated.icpPresets,
          promptTemplates: updated.promptTemplates,
          smtpHost: updated.smtpHost,
          smtpPort: updated.smtpPort,
          smtpUser: updated.smtpUser,
          smtpEnabled: updated.smtpEnabled,
          subscriptionTier: updated.subscriptionTier,
          hasByoOpenRouterKey: !!updated.byoOpenRouterKeyEncr,
          hasByoGoogleMapsKey: !!updated.byoGoogleMapsKeyEncr,
        }
      }
    );

    // Sanitize output
    const sanitized = {
      ...updated,
      smtpPassEncr: undefined,
      byoOpenRouterKeyEncr: undefined,
      byoGoogleMapsKeyEncr: undefined,
      hasSmtpPassword: !!updated.smtpPassEncr,
      hasByoOpenRouterKey: !!updated.byoOpenRouterKeyEncr,
      hasByoGoogleMapsKey: !!updated.byoGoogleMapsKeyEncr,
    };

    return NextResponse.json(sanitized);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
