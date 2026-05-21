'use server';

/**
 * Auth Server Actions — run on the server, called from client components.
 * These are the secure entry points for login, signup, logout, and password reset.
 *
 * Reference: node_modules/next/dist/docs/01-app/02-guides/authentication.md
 */

import { z } from 'zod';
import { redirect } from 'next/navigation';
import {
  getUserByEmail,
  createUser,
  verifyPassword,
  generatePasswordResetToken,
  validatePasswordResetToken,
  consumePasswordResetToken,
} from '@/lib/auth';
import { createSession, deleteSession } from '@/lib/session';
import { sendPasswordResetEmail } from '@/lib/email';

// ─── Zod Validation Schemas ───────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }).trim(),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const SignupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).trim(),
  email: z.string().email({ message: 'Please enter a valid email address.' }).trim(),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

const ResetRequestSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }).trim(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Invalid reset token.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

// ─── Action Return Type ───────────────────────────────────────────────────────

export type ActionState = {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const validated = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;
  const user = await getUserByEmail(email);

  if (!user || !user.isActive) {
    return { errors: { email: ['Invalid email or password.'] } };
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    return { errors: { email: ['Invalid email or password.'] } };
  }

  await createSession(user.id, user.email, user.name, user.role, user.workspaceId);
  redirect('/');
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signupAction(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const validated = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password } = validated.data;

  // Check if user already exists
  const existing = await getUserByEmail(email);
  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const user = await createUser(name, email, password, 'user');
  await createSession(user.id, user.email, user.name, user.role, user.workspaceId);
  redirect('/');
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}

// ─── Request Password Reset ───────────────────────────────────────────────────

export async function requestPasswordResetAction(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const validated = ResetRequestSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email } = validated.data;
  const user = await getUserByEmail(email);

  // Always return success to prevent user enumeration attacks
  if (!user || !user.isActive) {
    return {
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    };
  }

  const token = await generatePasswordResetToken(user.id);
  await sendPasswordResetEmail(user.email, user.name, token);

  return {
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
  };
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const validated = ResetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { token, password } = validated.data;
  const record = await validatePasswordResetToken(token);

  if (!record) {
    return {
      errors: { token: ['This reset link is invalid or has expired. Please request a new one.'] },
    };
  }

  await consumePasswordResetToken(record.id, password, record.userId);

  // Auto-login after reset
  await createSession(
    record.user.id,
    record.user.email,
    record.user.name,
    record.user.role,
    record.user.workspaceId
  );

  redirect('/');
}
