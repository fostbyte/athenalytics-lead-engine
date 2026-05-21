'use client';

import { useState, useEffect, useCallback } from 'react';
import { logoutAction } from '@/app/actions/auth';
import Link from 'next/link';

type AdminTab = 'overview' | 'users' | 'jobs' | 'audit';

const STATUS_COLORS: Record<string, string> = {
  queued: '#64748b',
  processing: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
};

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [createUserModal, setCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [createUserError, setCreateUserError] = useState('');
  const [resetLinkResult, setResetLinkResult] = useState<{ userId: string; url: string } | null>(null);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success) setStats(data.stats);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (data.success) setUsers(data.users);
    setLoading(false);
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/jobs?limit=100');
    const data = await res.json();
    if (data.success) setJobs(data.jobs);
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/audit-logs', { headers: { 'x-workspace-id': '__admin__' } });
    const data = await res.json();
    if (data.success) setAuditLogs(data.logs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'jobs') fetchJobs();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchUsers, fetchJobs, fetchAuditLogs]);

  const handleToggleUser = async (userId: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deactivate this user? They will lose access immediately.')) return;
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  const handleGenerateResetLink = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) setResetLinkResult({ userId, url: data.resetUrl });
  };

  const handleCreateUser = async () => {
    setCreateUserError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createUserForm),
    });
    const data = await res.json();
    if (data.success) {
      setCreateUserModal(false);
      setCreateUserForm({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
    } else {
      setCreateUserError(data.error || 'Failed to create user');
    }
  };

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'jobs', label: 'Job Logs', icon: '🔍' },
    { id: 'audit', label: 'Audit Trail', icon: '📋' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.2)', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#94a3b8', fontSize: 14 }}>← Dashboard</Link>
          <span style={{ color: '#334155' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Admin Portal</span>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Sign Out
          </button>
        </form>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32, background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 4, border: '1px solid rgba(71,85,105,0.3)', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent',
                border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
                color: activeTab === tab.id ? '#fff' : '#64748b', fontWeight: 600, fontSize: 14,
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Overview Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px', color: '#f1f5f9' }}>System Overview</h2>
            {stats ? (
              <>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                  <StatCard label="Total Users" value={stats.totalUsers} icon="👤" />
                  <StatCard label="Workspaces" value={stats.totalWorkspaces} icon="🏢" />
                  <StatCard label="Search Jobs" value={stats.totalJobs} icon="🔍" />
                  <StatCard label="Leads Generated" value={stats.totalLeads} icon="🎯" />
                  <StatCard label="Email Drafts" value={stats.totalDrafts} icon="✉️" />
                  <StatCard label="Emails Sent" value={stats.totalSent} icon="📤" />
                </div>

                {/* Google Maps API Cost & Quota Tracker */}
                {stats.googleMapsSpend && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: 16,
                    padding: '24px 32px',
                    marginBottom: 32,
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>🗺️</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
                            Google Maps API Cost & Quota Monitor
                          </h3>
                          <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            Automated rate limiting to guarantee 100% free-tier operation.
                          </p>
                        </div>
                      </div>
                      <span style={{
                        background: stats.googleMapsSpend.blocked 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : stats.googleMapsSpend.monthlySpend >= 100 
                            ? 'rgba(245, 158, 11, 0.15)' 
                            : 'rgba(16, 185, 129, 0.15)',
                        color: stats.googleMapsSpend.blocked 
                          ? '#f87171' 
                          : stats.googleMapsSpend.monthlySpend >= 100 
                            ? '#fbbf24' 
                            : '#34d399',
                        border: `1px solid ${
                          stats.googleMapsSpend.blocked 
                            ? 'rgba(239, 68, 68, 0.3)' 
                            : stats.googleMapsSpend.monthlySpend >= 100 
                              ? 'rgba(245, 158, 11, 0.3)' 
                              : 'rgba(16, 185, 129, 0.3)'
                        }`,
                        borderRadius: 20,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {stats.googleMapsSpend.blocked 
                          ? 'LOCKED (70% Limit)' 
                          : stats.googleMapsSpend.monthlySpend >= 100 
                            ? 'Warning' 
                            : 'Active & Safe'}
                      </span>
                    </div>

                    {stats.googleMapsSpend.blocked && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 20,
                        fontSize: 13,
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}>
                        <span>🚨</span>
                        <span>
                          <strong>Safety Lock Triggered:</strong> Monthly API usage has hit the 70% free tier safety threshold (${stats.googleMapsSpend.safetyLimit.toFixed(2)}). All new Google Places search requests have been halted to prevent out-of-pocket charges.
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Progress Track */}
                      <div style={{ flex: 2, minWidth: 280 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
                          <span>Monthly Accrued Spend</span>
                          <strong>
                            ${stats.googleMapsSpend.monthlySpend.toFixed(2)} / ${stats.googleMapsSpend.safetyLimit.toFixed(2)}
                          </strong>
                        </div>
                        {/* Progress Bar Track */}
                        <div style={{
                          height: 12,
                          width: '100%',
                          background: '#0f172a',
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid rgba(71, 85, 105, 0.3)',
                          position: 'relative'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${stats.googleMapsSpend.percentageOfSafety}%`,
                            background: stats.googleMapsSpend.blocked
                              ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                              : 'linear-gradient(90deg, #6366f1, #a855f7)',
                            borderRadius: 6,
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                          {/* Safety Limit Indicator line */}
                          <div style={{
                            position: 'absolute',
                            right: '30%', // Since $140 is 70% of $200
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: 'rgba(239, 68, 68, 0.5)',
                            zIndex: 1
                          }} title="70% Safety Limit Threshold ($140.00)" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 6 }}>
                          <span>$0.00 (Start of Month)</span>
                          <span style={{ color: '#f87171' }}>$140.00 (70% Safety Budget)</span>
                          <span>$200.00 (Full Free Tier)</span>
                        </div>
                      </div>

                      {/* Stat Metrics Grid */}
                      <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 200 }}>
                        <div style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(71, 85, 105, 0.2)',
                          borderRadius: 10,
                          padding: '12px 16px',
                          flex: 1,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                            {stats.googleMapsSpend.percentageOfSafety.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Of Safety Cap
                          </div>
                        </div>
                        <div style={{
                          background: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid rgba(71, 85, 105, 0.2)',
                          borderRadius: 10,
                          padding: '12px 16px',
                          flex: 1,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                            {stats.googleMapsSpend.percentageOfFreeTier.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Of $200 Free Tier
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Side-by-Side Detailed Cost & Token Monitors */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
                  {/* Google Maps detailed billing */}
                  {stats.googleMapsStats && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(71, 85, 105, 0.3)',
                      borderRadius: 16,
                      padding: 24,
                      flex: 1,
                      minWidth: 320,
                      backdropFilter: 'blur(20px)'
                    }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📊</span> Google Maps API Rates & Usage
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Places Text Search API */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>Places Text Search (New)</span>
                            <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                              {stats.googleMapsStats.places.rate}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Monthly Requests</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{stats.googleMapsStats.places.monthlyRequests}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Cost: ${stats.googleMapsStats.places.monthlyCost.toFixed(2)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Today's Requests</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{stats.googleMapsStats.places.dailyRequests}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Cost: ${stats.googleMapsStats.places.dailyCost.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Geocoding API */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>Geocoding API</span>
                            <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(52, 211, 153, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                              {stats.googleMapsStats.geocoding.rate}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Monthly Requests</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{stats.googleMapsStats.geocoding.monthlyRequests}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Cost: ${stats.googleMapsStats.geocoding.monthlyCost.toFixed(2)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Today's Requests</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>{stats.googleMapsStats.geocoding.dailyRequests}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Cost: ${stats.googleMapsStats.geocoding.dailyCost.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OpenRouter detailed LLM token usage */}
                  {stats.openRouterStats && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(71, 85, 105, 0.3)',
                      borderRadius: 16,
                      padding: 24,
                      flex: 1,
                      minWidth: 320,
                      backdropFilter: 'blur(20px)'
                    }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🧠</span> OpenRouter LLM Usage & Token Efficiency
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Token Consumption Counters */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>Token Metrics (gemma-2-9b-it)</span>
                            <span style={{ fontSize: 11, color: '#c084fc', background: 'rgba(167, 139, 250, 0.1)', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                              {stats.openRouterStats.monthlyRequests} Monthly Requests
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Prompt Tokens (Input)</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>
                                {stats.openRouterStats.monthlyPromptTokens.toLocaleString()}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                Today: {stats.openRouterStats.dailyPromptTokens.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Completion Tokens (Output)</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 2 }}>
                                {stats.openRouterStats.monthlyCompletionTokens.toLocaleString()}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                Today: {stats.openRouterStats.dailyCompletionTokens.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Token Efficiency Analytics */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid rgba(71, 85, 105, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>Usage Efficiency</span>
                            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>Active (Free Tier / BYO)</span>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Total Tokens (Month)</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
                                {stats.openRouterStats.monthlyTotalTokens.toLocaleString()}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                Today: {stats.openRouterStats.dailyTotalTokens.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Avg. Tokens / Request</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
                                {stats.openRouterStats.monthlyRequests > 0 
                                  ? Math.round(stats.openRouterStats.monthlyTotalTokens / stats.openRouterStats.monthlyRequests).toLocaleString() 
                                  : 0}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                Est. Cost Saved: ${(stats.openRouterStats.monthlyTotalTokens * 0.00000007).toFixed(4)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: '#64748b' }}>Loading…</div>
            )}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#818cf8' }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('users')} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>Manage Users →</button>
                <button onClick={() => setActiveTab('jobs')} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>View Job Logs →</button>
                <button onClick={() => setActiveTab('audit')} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>View Audit Trail →</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Users Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>User Management</h2>
              <button
                onClick={() => setCreateUserModal(true)}
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                + Create User
              </button>
            </div>

            {loading ? (
              <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading users…</div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)', background: 'rgba(30,41,59,0.5)' }}>
                      {['Name', 'Email', 'Role', 'Workspace', 'Status', 'Created', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(71,85,105,0.2)' : 'none' }}>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{user.name}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{user.email}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ background: user.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(71,85,105,0.2)', color: user.role === 'admin' ? '#a78bfa' : '#94a3b8', border: `1px solid ${user.role === 'admin' ? 'rgba(139,92,246,0.3)' : 'rgba(71,85,105,0.3)'}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{user.workspaceId}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ background: user.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: user.isActive ? '#34d399' : '#f87171', border: `1px solid ${user.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleChangeRole(user.id, user.role)} title="Toggle role" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                              {user.role === 'admin' ? '→ User' : '→ Admin'}
                            </button>
                            <button onClick={() => handleToggleUser(user.id, user.isActive)} style={{ background: user.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${user.isActive ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, color: user.isActive ? '#fbbf24' : '#34d399', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                              {user.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button onClick={() => handleGenerateResetLink(user.id)} style={{ background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)', color: '#94a3b8', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                              Reset PW
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No users found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Job Logs Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px', color: '#f1f5f9' }}>Search Job Logs</h2>
            {loading ? (
              <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading jobs…</div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)', background: 'rgba(30,41,59,0.5)' }}>
                      {['Workspace', 'Industry', 'Location', 'Radius', 'Status', 'Found', 'Scored', 'Created', 'Error'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, i) => (
                      <tr key={job.id} style={{ borderBottom: i < jobs.length - 1 ? '1px solid rgba(71,85,105,0.2)' : 'none' }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{job.workspaceId}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{job.vertical}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>
                          {job.locationType === 'zip' ? job.zipCode : `${job.city}, ${job.state}`}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{job.radiusMiles}mi</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: `${STATUS_COLORS[job.status]}22`, color: STATUS_COLORS[job.status], border: `1px solid ${STATUS_COLORS[job.status]}44`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>{job.totalFound}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#94a3b8' }}>{job.totalScored}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{new Date(job.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#ef4444', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.error || ''}>{job.error || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobs.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No jobs found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Audit Trail Tab ────────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px', color: '#f1f5f9' }}>Audit Trail</h2>
            {loading ? (
              <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading audit logs…</div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)', background: 'rgba(30,41,59,0.5)' }}>
                      {['Workspace', 'Actor', 'Action', 'Entity', 'Entity ID', 'Timestamp'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any, i: number) => (
                      <tr key={log.id} style={{ borderBottom: i < auditLogs.length - 1 ? '1px solid rgba(71,85,105,0.2)' : 'none' }}>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{log.workspaceId}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>{log.actor}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>{log.entityType}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{log.entityId.slice(0, 12)}…</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditLogs.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No audit events recorded yet.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create User Modal ──────────────────────────────────────────────── */}
      {createUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Create User</h3>
            {createUserError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>{createUserError}</div>}
            {(['name', 'email', 'password'] as const).map(field => (
              <div key={field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  value={createUserForm[field]}
                  onChange={e => setCreateUserForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>Role</label>
              <select
                value={createUserForm.role}
                onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setCreateUserModal(false); setCreateUserError(''); }} style={{ flex: 1, background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)', color: '#94a3b8', borderRadius: 8, padding: 12, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCreateUser} style={{ flex: 1, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', borderRadius: 8, padding: 12, cursor: 'pointer', fontWeight: 600 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Link Result Modal ────────────────────────────────────────── */}
      {resetLinkResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Password Reset Link</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Share this link with the user. It expires in 1 hour.</p>
            <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 16 }}>
              {resetLinkResult.url}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { navigator.clipboard.writeText(resetLinkResult.url); }}
                style={{ flex: 1, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                📋 Copy Link
              </button>
              <button onClick={() => setResetLinkResult(null)} style={{ flex: 1, background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)', color: '#94a3b8', borderRadius: 8, padding: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
