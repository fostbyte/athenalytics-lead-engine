'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '@/app/actions/auth';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState | undefined, FormData>(
    loginAction,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-shell">
      {/* Background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <div className="auth-logo-name">Athenalytics</div>
            <div className="auth-logo-sub">Lead Engine</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        <form action={action} className="auth-form">
          {/* Global error */}
          {state?.errors?.email && !state?.errors?.password && (
            <div className="auth-error-banner">
              {state.errors.email[0]}
            </div>
          )}

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
            <div className="auth-label-row">
              <label htmlFor="password" className="auth-label">Password</label>
              <Link href="/reset-password" className="auth-forgot">Forgot password?</Link>
            </div>
            <div className="auth-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className={`auth-input ${state?.errors?.password ? 'auth-input-error' : ''}`}
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="auth-field-error">{state.errors.password[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="auth-btn-primary"
          >
            {pending ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="auth-link">Create one</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020617;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .auth-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .auth-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
          top: -100px; left: -150px;
          animation: orbFloat1 8s ease-in-out infinite;
        }
        .auth-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
          bottom: -80px; right: -100px;
          animation: orbFloat2 10s ease-in-out infinite;
        }
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,20px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,-30px)} }
        .auth-card {
          position: relative; z-index: 1;
          background: rgba(15,23,42,0.85);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
          animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes cardIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .auth-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 32px;
        }
        .auth-logo-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 15px rgba(79,70,229,0.4);
        }
        .auth-logo-name { font-size: 18px; font-weight: 700; color: #f1f5f9; }
        .auth-logo-sub { font-size: 12px; color: #64748b; }
        .auth-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 8px; }
        .auth-subtitle { font-size: 14px; color: #64748b; margin: 0 0 28px; }
        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .auth-error-banner {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #f87171;
        }
        .auth-field { display: flex; flex-direction: column; gap: 6px; }
        .auth-label-row { display: flex; align-items: center; justify-content: space-between; }
        .auth-label { font-size: 13px; font-weight: 500; color: #94a3b8; }
        .auth-forgot { font-size: 12px; color: #6366f1; text-decoration: none; }
        .auth-forgot:hover { color: #818cf8; }
        .auth-input-wrap { position: relative; }
        .auth-input {
          width: 100%;
          background: rgba(30,41,59,0.8);
          border: 1px solid rgba(71,85,105,0.5);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 14px;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .auth-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .auth-input::placeholder { color: #475569; }
        .auth-input-error { border-color: rgba(239,68,68,0.5) !important; }
        .auth-input-toggle {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          font-size: 16px; padding: 0; line-height: 1;
        }
        .auth-field-error { font-size: 12px; color: #f87171; margin: 0; }
        .auth-btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 13px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          margin-top: 4px;
        }
        .auth-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-btn-loading { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .auth-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
        .auth-switch { font-size: 13px; color: #64748b; text-align: center; margin: 24px 0 0; }
        .auth-link { color: #6366f1; text-decoration: none; font-weight: 500; }
        .auth-link:hover { color: #818cf8; }
      `}</style>
    </div>
  );
}
