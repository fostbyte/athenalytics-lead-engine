import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWorkspaceIdFromRequest, getWorkspaceSettings, validateScoringWeights } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const workspaceId = getWorkspaceIdFromRequest(request);
    const settings = await getWorkspaceSettings(workspaceId);
    return NextResponse.json(settings);
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

    const updated = await prisma.settings.update({
      where: { workspaceId },
      data: {
        senderName: body.senderName ?? undefined,
        senderEmail: body.senderEmail ?? undefined,
        scoringWeights: body.scoringWeights ? (body.scoringWeights as any) : undefined,
        icpPresets: body.icpPresets ? (body.icpPresets as any) : undefined,
        defaultRadiusMiles: typeof body.defaultRadiusMiles === 'number' ? body.defaultRadiusMiles : undefined,
        promptTemplates: body.promptTemplates ? (body.promptTemplates as any) : undefined,
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
        },
        after: {
          senderName: updated.senderName,
          senderEmail: updated.senderEmail,
          scoringWeights: updated.scoringWeights,
          icpPresets: updated.icpPresets,
          promptTemplates: updated.promptTemplates,
        }
      }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
