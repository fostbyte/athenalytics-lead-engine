/**
 * Authentication utilities: password hashing, user CRUD, password reset tokens.
 */
import bcrypt from 'bcryptjs';
import prisma from './prisma';

const SALT_ROUNDS = 12;

// ─── Password Utilities ───────────────────────────────────────────────────────

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user',
  workspaceId?: string
) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      workspaceId: workspaceId || `workspace-${Date.now()}`,
    },
  });
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function listAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      workspaceId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(
  id: string,
  data: { role?: string; isActive?: boolean; workspaceId?: string; name?: string }
) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string) {
  return prisma.user.update({ where: { id }, data: { isActive: false } });
}

// ─── Password Reset Tokens ────────────────────────────────────────────────────

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function generatePasswordResetToken(userId: string): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = await prisma.passwordResetToken.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    },
  });

  return token.token;
}

export async function validatePasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

export async function consumePasswordResetToken(tokenId: string, newPassword: string, userId: string) {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
  return updateUserPassword(userId, newPassword);
}
