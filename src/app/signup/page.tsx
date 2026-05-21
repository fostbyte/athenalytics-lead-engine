'use client';

import { useActionState, useState } from 'react';
import { signupAction, type ActionState } from '@/app/actions/auth';
import Link from 'next/link';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Contains letter', pass: /[a-zA-Z]/.test(password) },
    { label: 'Contains number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['#ef4444', '#f59e0b', '#10b981'];
  const labels = ['Weak', 'Fair', 'Strong'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 4,
              background: i < score ? colors[score - 1] : 'rgba(71,85,105,0.4)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {checks.map(c => (
          <span key={c.label} style={{ fontSize: 11, color: c.pass ? '#10b981' : '#475569', display: 'flex', alignItems: 'center', gap: 3 }}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
      {score > 0 && (
        <p style={{ fontSize: 12, color: colors[score - 1], margin: '4px 0 0', fontWeight: 600 }}>
          {labels[score - 1]}
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(
    signupAction,
    undefined
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <div className="auth-logo-name">Athenalytics</div>
            <div className="auth-logo-sub">Lead Engine</div>
          </div>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start generating and scoring leads today</p>

        <form action={action} className="auth-form">
          <div className="auth-field">
            <label htmlFor="name" className="auth-label">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="John Smith"
              className={`auth-input ${state?.errors?.name ? 'auth-input-error' : ''}`}
            />
            {state?.errors?.name && (
              <p className="auth-field-error">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className={`auth-input ${state?.errors?.email ? 'auth-input-error' : ''}`}
            />
            {state?.errors?.email && (
              <p className="auth-field-error">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`auth-input ${state?.errors?.password ? 'auth-input-error' : ''}`}
              />
              <button type="button" className="auth-input-toggle" onClick={() => setShowPassword(p => !p)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <PasswordStrength password={password} />
            {state?.errors?.password && (
              <p className="auth-field-error">{state.errors.password[0]}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className={`auth-input ${state?.errors?.confirmPassword ? 'auth-input-error' : ''}`}
            />
            {state?.errors?.confirmPassword && (
              <p className="auth-field-error">{state.errors.confirmPassword[0]}</p>
            )}
          </div>

          <button type="submit" disabled={pending} className="auth-btn-primary">
            {pending ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Creating account…
              </span>
            ) : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-shell {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #020617; padding: 24px; position: relative; overflow: hidden;
        }
        .auth-orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
        .auth-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%); top: -100px; left: -150px; animation: orbFloat1 8s ease-in-out infinite; }
        .auth-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%); bottom: -80px; right: -100px; animation: orbFloat2 10s ease-in-out infinite; }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,20px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,-30px)} }
        .auth-card { position: relative; z-index: 1; background: rgba(15,23,42,0.85); backdrop-filter: blur(24px); border: 1px solid rgba(99,102,241,0.25); border-radius: 20px; padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes cardIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
        .auth-logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 15px rgba(79,70,229,0.4); }
        .auth-logo-name { font-size: 18px; font-weight: 700; color: #f1f5f9; }
        .auth-logo-sub { font-size: 12px; color: #64748b; }
        .auth-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 8px; }
        .auth-subtitle { font-size: 14px; color: #64748b; margin: 0 0 28px; }
        .auth-form { display: flex; flex-direction: column; gap: 18px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-label { font-size: 13px; font-weight: 500; color: #94a3b8; }
        .auth-input-wrap { position: relative; }
        .auth-input { width: 100%; background: rgba(30,41,59,0.8); border: 1px solid rgba(71,85,105,0.5); border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #e2e8f0; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .auth-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .auth-input::placeholder { color: #475569; }
        .auth-input-error { border-color: rgba(239,68,68,0.5) !important; }
        .auth-input-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; padding: 0; }
        .auth-field-error { font-size: 12px; color: #f87171; margin: 0; }
        .auth-btn-primary { width: 100%; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; margin-top: 4px; }
        .auth-btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-btn-loading { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .auth-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .auth-switch { font-size: 13px; color: #64748b; text-align: center; margin: 24px 0 0; }
        .auth-link { color: #6366f1; text-decoration: none; font-weight: 500; }
        .auth-link:hover { color: #818cf8; }
      `}</style>
    </div>
  );
}
