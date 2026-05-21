import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { updateUser, deleteUser, generatePasswordResetToken } from '@/lib/auth';

function adminOnly(session: any) {
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const { role, isActive, workspaceId, name } = body;

  const user = await updateUser(id, { role, isActive, workspaceId, name });
  return NextResponse.json({ success: true, user: { id: user.id, role: user.role, isActive: user.isActive } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id } = await params;
  // Prevent admin from deleting themselves
  if (session!.userId === id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  await deleteUser(id);
  return NextResponse.json({ success: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Generate a password reset link for this user
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const { id } = await params;
  const token = await generatePasswordResetToken(id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  return NextResponse.json({ success: true, resetUrl });
}
