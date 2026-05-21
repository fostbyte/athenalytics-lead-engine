import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listAllUsers, createUser, updateUser, deleteUser } from '@/lib/auth';

function adminOnly(session: any) {
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const users = await listAllUsers();
  return NextResponse.json({ success: true, users });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const denied = adminOnly(session);
  if (denied) return denied;

  const body = await request.json();
  const { name, email, password, role, workspaceId } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 });
  }

  try {
    const user = await createUser(name, email, password, role || 'user', workspaceId);
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
