'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { 
  Search, 
  MapPin, 
  Building, 
  Briefcase, 
  Target, 
  ArrowRight, 
  RotateCw, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  SlidersHorizontal, 
  TrendingUp, 
  Globe,
  Mail,
  Trash2,
  Send,
  Check,
  Save,
  FileText,
  Clock,
  Inbox,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Settings as SettingsIcon,
  Shield,
  AlertTriangle,
  Code,
  ShieldAlert,
  ShieldCheck,
  User,
  RefreshCw
} from 'lucide-react';

export default function Home() {
  // Search Job form states
  const [vertical, setVertical] = useState('');
  const [locationType, setLocationType] = useState<'city_state' | 'zip'>('city_state');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState('10');
  const [targetCount, setTargetCount] = useState('50');
  
  // Job list and loading states
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  
  // Lead Queue states
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  
  // Lead Filters & Search states
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);
  const [constructionQuery, setConstructionQuery] = useState('');
  const [scoreBandFilter, setScoreBandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Rescore tracking state (maps leadId to loading boolean)
  const [rescoringLeads, setRescoringLeads] = useState<Record<string, boolean>>({});

  // Phase 5 States for Tabbed Email Outreach Hub
  const [activeTab, setActiveTab] = useState<'leads' | 'drafts' | 'outbox' | 'settings'>('leads');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  
  // Edit states for selected draft
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  
  // Action loading states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isApprovingDraft, setIsApprovingDraft] = useState(false);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);
  
  // Tone regenerator
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'direct' | 'professional'>('friendly');
  const [isRegeneratingDraft, setIsRegeneratingDraft] = useState(false);

  // Lead-specific tone selectors & loading states
  const [leadToneSelection, setLeadToneSelection] = useState<Record<string, 'friendly' | 'direct' | 'professional'>>({});
  const [leadDraftingLoading, setLeadDraftingLoading] = useState<Record<string, boolean>>({});

  // Audit Outbox Expand states
  const [expandedOutboxDrafts, setExpandedOutboxDrafts] = useState<Record<string, boolean>>({});

  // Phase 6 multi-tenant and settings states
  const [workspaceId, setWorkspaceId] = useState('default-workspace');
  const [settings, setSettings] = useState<any>({
    senderName: 'Athenalytics Team',
    senderEmail: 'outreach@athenalytics.co',
    scoringWeights: {
      fit: 15,
      website: 25,
      demand: 15,
      analytics: 15,
      outreach: 15,
      growth: 10,
      geo: 5
    },
    icpPresets: {
      requiredWebsite: false,
      minReviewCount: 0,
      requireBooking: false,
      requireOrdering: false,
      requireSocial: false
    },
    defaultRadiusMiles: 10,
    promptTemplates: {
      direct: '',
      friendly: '',
      professional: ''
    }
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [expandedAuditLogs, setExpandedAuditLogs] = useState<Record<string, boolean>>({});

  // Rejection Modal States
  const [rejectingLeadId, setRejectingLeadId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('poor_fit');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [isRejectingLead, setIsRejectingLead] = useState(false);

  // Enrichment retrying tracking states
  const [enrichRetryingLeads, setEnrichRetryingLeads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRecentSearches();
    fetchLeads();
    fetchDrafts();
    fetchSettings();
    fetchAuditLogs();

    // Support query parameter tabs redirection on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const draftIdParam = params.get('selectedDraftId');
      if (tabParam === 'drafts') {
        setActiveTab('drafts');
        if (draftIdParam) {
          fetch(`/api/email-drafts?workspaceId=${workspaceId}`, {
            headers: { 'x-workspace-id': workspaceId }
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setDrafts(data.drafts);
                const target = data.drafts.find((d: any) => d.id === draftIdParam);
                if (target) {
                  setSelectedDraft(target);
                  setEditSubject(target.subject);
                  setEditBody(target.body);
                }
              }
            });
        }
      }
    }
  }, [workspaceId]);

  // Re-fetch leads when filters or sorting configurations change
  useEffect(() => {
    fetchLeads(leadSearch);
  }, [scoreBandFilter, statusFilter, sortBy, sortOrder]);

  // Re-fetch drafts when shifting to drafts or outbox tabs to ensure latest sync
  useEffect(() => {
    if (activeTab === 'drafts' || activeTab === 'outbox') {
      fetchDrafts();
    }
  }, [activeTab]);

  const getWeightsSum = (weights: any) => {
    return (
      (parseInt(weights?.fit) || 0) +
      (parseInt(weights?.website) || 0) +
      (parseInt(weights?.demand) || 0) +
      (parseInt(weights?.analytics) || 0) +
      (parseInt(weights?.outreach) || 0) +
      (parseInt(weights?.growth) || 0) +
      (parseInt(weights?.geo) || 0)
    );
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          senderName: data.senderName || 'Athenalytics Team',
          senderEmail: data.senderEmail || 'outreach@athenalytics.co',
          scoringWeights: data.scoringWeights || {
            fit: 15,
            website: 25,
            demand: 15,
            analytics: 15,
            outreach: 15,
            growth: 10,
            geo: 5
          },
          icpPresets: data.icpPresets || {
            requiredWebsite: false,
            minReviewCount: 0,
            requireBooking: false,
            requireOrdering: false,
            requireSocial: false
          },
          defaultRadiusMiles: data.defaultRadiusMiles || 10,
          promptTemplates: data.promptTemplates || {
            direct: '',
            friendly: '',
            professional: ''
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const sum = getWeightsSum(settings.scoringWeights);
    if (Math.abs(sum - 100) > 0.01) {
      alert(`Scoring weights must sum to exactly 100%. Current total: ${sum}%`);
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Workspace settings updated and logged successfully!');
        await fetchSettings();
        await fetchAuditLogs();
      } else {
        const data = await res.json();
        setSettingsError(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setSettingsError(err.message || 'An error occurred');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const handleEnrichRetry = async (leadId: string) => {
    setEnrichRetryingLeads(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich-retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        }
      });
      if (res.ok) {
        alert('Enrichment retry successful! Lead signals updated and rescored.');
        await fetchLeads(leadSearch);
        await fetchAuditLogs();
      } else {
        const data = await res.json();
        alert(`Enrichment failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to retry enrichment:', err);
      alert(`Error retrying enrichment: ${err.message}`);
    } finally {
      setEnrichRetryingLeads(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const handleRejectLeadSubmit = async () => {
    if (!rejectingLeadId) return;
    setIsRejectingLead(true);
    try {
      const actualReason = rejectionReason === 'other' ? (customRejectionReason || 'Other') : rejectionReason;
      const res = await fetch(`/api/leads/${rejectingLeadId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ reason: actualReason })
      });
      if (res.ok) {
        alert('Lead successfully rejected and archived.');
        setRejectingLeadId(null);
        setCustomRejectionReason('');
        await fetchLeads(leadSearch);
        await fetchAuditLogs();
      } else {
        const data = await res.json();
        alert(`Failed to reject lead: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to reject lead:', err);
      alert(`Error rejecting lead: ${err.message}`);
    } finally {
      setIsRejectingLead(false);
    }
  };

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch(`/api/search-jobs?workspaceId=${workspaceId}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      const data = await res.json();
      if (data.success) {
        setRecentSearches(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch recent searches:', err);
    }
  };

  const fetchLeads = async (searchVal = '') => {
    setLeadsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: searchVal,
        scoreBand: scoreBandFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/leads?${queryParams.toString()}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      workspaceId,
      vertical,
      locationType,
      city,
      state,
      zipCode,
      radiusMiles: parseInt(radius),
      targetCount: parseInt(targetCount),
    };

    try {
      const res = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        setRunningJobId(data.searchJob.id);
        fetchRecentSearches();

        // 1. Trigger Discovery
        const discoveryRes = await fetch('/api/discovery-worker', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-workspace-id': workspaceId
          },
          body: JSON.stringify({ jobId: data.searchJob.id })
        });
        
        if (discoveryRes.ok) {
          fetchRecentSearches();
          
          // 2. Trigger Enrichment
          const enrichmentRes = await fetch('/api/enrichment-worker', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-workspace-id': workspaceId
            },
            body: JSON.stringify({ searchJobId: data.searchJob.id })
          });

          if (enrichmentRes.ok) {
            fetchRecentSearches();

            // 3. Trigger LangGraph Scoring Engine
            await fetch('/api/scoring-worker', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-workspace-id': workspaceId
              },
              body: JSON.stringify({ searchJobId: data.searchJob.id })
            });
          }
        }

        // Final Refresh
        await fetchRecentSearches();
        await fetchLeads();
        
        // Reset form partially
        setCity('');
        setState('');
        setZipCode('');
        setRunningJobId(null);
      }
    } catch (err) {
      console.error('Submission or worker chain failed', err);
      setRunningJobId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leadSearch.trim()) {
      setShowUnderConstruction(false);
      fetchLeads();
      return;
    }

    // Trigger explicit loading transition for testing and UX validation
    setLeadSearchLoading(true);
    setShowUnderConstruction(false);

    setTimeout(() => {
      setLeadSearchLoading(false);
      setConstructionQuery(leadSearch);
      setShowUnderConstruction(true);
      fetchLeads(leadSearch);
    }, 750); // 750ms simulation delay to guarantee visibility of search spinner/skeleton loading state
  };

  const handleRescore = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid navigating if clicked inside parent card link
    setRescoringLeads(prev => ({ ...prev, [leadId]: true }));
    
    try {
      const res = await fetch(`/api/leads/${leadId}/rescore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        }
      });
      if (res.ok) {
        // Refresh leads list
        await fetchLeads(leadSearch);
      }
    } catch (err) {
      console.error(`Failed to rescore lead ${leadId}:`, err);
    } finally {
      setRescoringLeads(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Phase 5 Action Handlers for Outreach
  const fetchDrafts = async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch(`/api/email-drafts?workspaceId=${workspaceId}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts);
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleSelectDraft = (draft: any) => {
    setSelectedDraft(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
    setSelectedTone('friendly');
  };

  const handleSaveEdits = async () => {
    if (!selectedDraft) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(`/api/email-drafts/${selectedDraft.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ subject: editSubject, body: editBody })
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(prev => prev.map(d => d.id === selectedDraft.id ? { ...d, subject: editSubject, body: editBody } : d));
        setSelectedDraft(data.draft);
        alert('Draft changes successfully saved to database.');
      }
    } catch (err) {
      console.error('Failed to save draft edits:', err);
      alert('Error saving draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!selectedDraft) return;
    setIsApprovingDraft(true);
    try {
      const res = await fetch(`/api/email-drafts/${selectedDraft.id}/approve`, {
        method: 'POST',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        await fetchDrafts();
        setSelectedDraft(data.draft);
        await fetchLeads(leadSearch);
        alert('Draft has been officially approved! Lead status is updated.');
      }
    } catch (err) {
      console.error('Failed to approve draft:', err);
    } finally {
      setIsApprovingDraft(false);
    }
  };

  const handleSendOutreach = async () => {
    if (!selectedDraft) return;
    setIsSendingDraft(true);
    try {
      const res = await fetch(`/api/email-drafts/${selectedDraft.id}/send`, {
        method: 'POST',
        headers: { 'x-workspace-id': workspaceId }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Simulated email outreach sent successfully! Saved to Immutable Outbox.');
        await fetchDrafts();
        await fetchLeads(leadSearch);
        setSelectedDraft(null);
      } else {
        alert(`Gated Send Refused: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to send outreach:', err);
    } finally {
      setIsSendingDraft(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!selectedDraft) return;
    if (!confirm('Are you sure you want to discard this outreach draft?')) return;
    setIsDiscardingDraft(true);
    try {
      const res = await fetch(`/api/email-drafts/${selectedDraft.id}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        alert('Draft successfully deleted.');
        await fetchDrafts();
        await fetchLeads(leadSearch);
        setSelectedDraft(null);
      }
    } catch (err) {
      console.error('Failed to discard draft:', err);
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!selectedDraft) return;
    setIsRegeneratingDraft(true);
    try {
      const res = await fetch(`/api/leads/${selectedDraft.leadId}/draft-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ tone: selectedTone })
      });
      if (res.ok) {
        const data = await res.json();
        // Discard the old draft
        await fetch(`/api/email-drafts/${selectedDraft.id}`, {
          method: 'DELETE',
          headers: { 'x-workspace-id': workspaceId }
        });
        await fetchDrafts();
        handleSelectDraft(data.draft);
        alert(`Email draft successfully regenerated with ${selectedTone} tone!`);
      }
    } catch (err) {
      console.error('Failed to regenerate draft:', err);
    } finally {
      setIsRegeneratingDraft(false);
    }
  };

  const handleGenerateDraft = async (leadId: string, tone: 'direct' | 'friendly' | 'professional') => {
    setLeadDraftingLoading(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}/draft-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ tone })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchDrafts();
        await fetchLeads(leadSearch);
        setActiveTab('drafts');
        handleSelectDraft(data.draft);
      }
    } catch (err) {
      console.error('Failed to generate email draft:', err);
    } finally {
      setLeadDraftingLoading(prev => ({ ...prev, [leadId]: false }));
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-24 bg-gradient-to-b from-[#09090b] to-[#121214] text-zinc-100">
      {/* ── User Navigation Bar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '10px 24px', background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(63,63,70,0.5)' }}>
        <Link href="/admin" style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '5px 12px', fontWeight: 600 }}>🛡️ Admin</Link>
        <form action={logoutAction} style={{ display: 'inline' }}>
          <button type="submit" style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(71,85,105,0.2)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
        </form>
      </div>

      <div className="max-w-6xl mx-auto space-y-12" style={{ paddingTop: 48 }}>
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
            Athenalytics Lead Engine
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
            Discover, enrich, and score high-intent leads across geographies using intelligent evidence-backed signals.
          </p>
          <div className="flex justify-center items-center gap-2 mt-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-4 py-2 w-fit mx-auto backdrop-blur-sm shadow-lg">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Active Tenant ID:</span>
            <select
              id="workspace-switcher"
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg py-1 px-3 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="default-workspace">🏢 Default Workspace</option>
              <option value="enterprise-workspace">🚀 Enterprise Workspace</option>
              <option value="workspace-beta">🧪 Workspace Beta</option>
            </select>
          </div>
        </header>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left Panel: Search Intake Form */}
          <div className="md:col-span-3">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-zinc-200">
                <Search className="text-blue-400 w-6 h-6" /> New Search Job
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Vertical / Niche</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Roofing Contractors" 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-600"
                      value={vertical}
                      onChange={(e) => setVertical(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 p-1 bg-zinc-950 rounded-lg w-fit border border-zinc-800">
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${locationType === 'city_state' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                      onClick={() => setLocationType('city_state')}
                    >
                      City & State
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-md text-sm font-medium transition ${locationType === 'zip' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                      onClick={() => setLocationType('zip')}
                    >
                      ZIP Code
                    </button>
                  </div>

                  {locationType === 'city_state' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">City</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                          <input 
                            required
                            type="text" 
                            placeholder="e.g. Austin" 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-600"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">State</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. TX" 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-600"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">ZIP Code</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. 78701" 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-600"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Radius (Miles)</label>
                    <div className="relative">
                      <Target className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
                      <input 
                        type="number" 
                        min="1"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200"
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Target Count</label>
                    <input 
                      type="number" 
                      min="1"
                      max="1000"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-zinc-200"
                      value={targetCount}
                      onChange={(e) => setTargetCount(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      {runningJobId ? 'Processing Pipeline...' : 'Starting Job...'}
                    </>
                  ) : (
                    <>
                      Start Discovery <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Recent Searches */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2 text-zinc-200">
              Recent Jobs
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {recentSearches.length === 0 ? (
                <p className="text-zinc-500 text-sm">No recent jobs found.</p>
              ) : (
                recentSearches.map((job) => (
                  <div key={job.id} className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/60 transition group relative overflow-hidden backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-zinc-200">{job.vertical}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1 font-light">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          {job.locationType === 'city_state' ? `${job.city}, ${job.state}` : job.zipCode} 
                          ({job.radiusMiles}mi)
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        job.status === 'processing' || job.status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : 
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-zinc-850 text-zinc-400 border-zinc-800'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-zinc-800/60 pt-3 mt-3 text-zinc-400 font-light">
                      <div>Target: <span className="font-bold text-zinc-300">{job.targetCount}</span></div>
                      <div>Found: <span className="font-bold text-zinc-300">{job.totalFound || 0}</span></div>
                      <div>Scored: <span className="font-bold text-zinc-300">{job.totalScored || 0}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scored Lead Queue Section (Sprint 5 Tabbed Hub) */}
          <div className="md:col-span-5 border-t border-zinc-800/60 pt-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold flex items-center gap-2 text-zinc-200 tracking-tight">
                  <Sparkles className="text-emerald-400 w-7 h-7" /> Qualified Outreach Hub
                </h2>
                <p className="text-zinc-500 text-sm font-light mt-1">
                  Manage scored leads, customize AI outreach drafts, and launch campaigns with human-in-the-loop validation.
                </p>
              </div>

              {/* Tab Selector Buttons */}
              <div className="flex gap-1.5 p-1 bg-zinc-950/80 border border-zinc-850 rounded-xl w-fit shrink-0 backdrop-blur-md">
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === 'leads'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Leads Queue
                </button>
                <button
                  onClick={() => setActiveTab('drafts')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 relative ${
                    activeTab === 'drafts'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Draft Review
                  {drafts.filter(d => d.status === 'pending').length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse">
                      {drafts.filter(d => d.status === 'pending').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('outbox')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === 'outbox'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Outbox
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === 'settings'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Settings & Admin
                </button>
              </div>
            </div>

            {/* TAB 1: LEADS QUEUE */}
            {activeTab === 'leads' && (
              <>
                {/* Search and Filters panel */}
                <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6">
                  <form onSubmit={handleLeadSearchSubmit} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search leads by name, category, city..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-650"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                      />
                      {leadSearch && (
                        <button 
                          type="button" 
                          onClick={() => { setLeadSearch(''); setShowUnderConstruction(false); }} 
                          className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 bg-zinc-900 rounded-md border border-zinc-850"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={leadSearchLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-lg transition shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                    >
                      {leadSearchLoading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        'Search'
                      )}
                    </button>
                  </form>

                  {/* Advanced Filter selections */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800/40 text-xs text-zinc-400 font-light">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Filters:</span>
                    </div>
                    
                    {/* Score Band */}
                    <select
                      value={scoreBandFilter}
                      onChange={(e) => setScoreBandFilter(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-500 transition text-zinc-300"
                    >
                      <option value="">All Score Bands</option>
                      <option value="high">High Match (&gt;=75)</option>
                      <option value="medium">Medium Match (&gt;=50)</option>
                      <option value="review">Review Needed (&gt;=20)</option>
                      <option value="exclude">Excluded (&lt;20)</option>
                    </select>

                    {/* Pipeline Status */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-500 transition text-zinc-300"
                    >
                      <option value="">All Pipeline Statuses</option>
                      <option value="discovered">Discovered</option>
                      <option value="scored">Scored</option>
                      <option value="drafted">Drafted</option>
                      <option value="approved">Approved</option>
                      <option value="sent">Sent</option>
                      <option value="rejected">Rejected</option>
                    </select>

                    {/* Sort Dimensions */}
                    <div className="flex items-center gap-2 ml-auto">
                      <span>Sort By:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-500 transition text-zinc-300"
                      >
                        <option value="score">Scoring Priority</option>
                        <option value="businessName">Business Name</option>
                        <option value="distanceMiles">Distance</option>
                        <option value="createdAt">Date Discovered</option>
                      </select>

                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg p-2 focus:outline-none text-zinc-300 transition"
                        title="Toggle Sort Order"
                      >
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* User-requested automated testing indicator banner */}
                {showUnderConstruction && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-xl text-sm flex items-center justify-between shadow-xl backdrop-blur-md animate-pulse">
                    <span className="font-mono">this feature is under construction, but your request {constructionQuery} was recieced</span>
                    <button 
                      onClick={() => setShowUnderConstruction(false)} 
                      className="text-yellow-400 hover:text-white text-xs font-semibold px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-md transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Lead Queue Content Render */}
                {leadSearchLoading || leadsLoading ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(idx => (
                      <div key={idx} className="bg-zinc-900/10 border border-zinc-850 rounded-xl p-6 space-y-4 animate-pulse">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <div className="h-5 bg-zinc-800 rounded w-2/3"></div>
                            <div className="h-3 bg-zinc-855 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 w-12 bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-zinc-850/50">
                          <div className="h-3 bg-zinc-850 rounded w-full"></div>
                          <div className="h-3 bg-zinc-850 rounded w-5/6"></div>
                          <div className="h-3 bg-zinc-850 rounded w-4/5"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-16 bg-zinc-900/10 border border-zinc-800/60 rounded-2xl backdrop-blur-sm">
                    <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">No leads match your filter criteria.</p>
                    <p className="text-zinc-655 text-xs mt-1">Start a new Discovery search job to populate leads.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {leads.map((lead) => {
                      const isRescoring = rescoringLeads[lead.id] || false;
                      const isDrafting = leadDraftingLoading[lead.id] || false;
                      const tone = leadToneSelection[lead.id] || 'friendly';
                      
                      let bandColor = 'bg-zinc-855 text-zinc-400 border-zinc-800';
                      let scoreBadgeColor = 'text-zinc-400 bg-zinc-850';
                      
                      if (lead.scoreBand === 'high') {
                        bandColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        scoreBadgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
                      } else if (lead.scoreBand === 'medium') {
                        bandColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                        scoreBadgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/25';
                      } else if (lead.scoreBand === 'review') {
                        bandColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                        scoreBadgeColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25';
                      } else if (lead.scoreBand === 'exclude') {
                        bandColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                        scoreBadgeColor = 'text-red-400 bg-red-500/10 border-red-500/25';
                      }

                      return (
                        <div 
                          key={lead.id} 
                          className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 hover:border-zinc-700/60 transition group flex flex-col justify-between relative backdrop-blur-sm"
                        >
                          <div className="space-y-4">
                            {/* Header Details */}
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <h3 className="text-lg font-bold text-zinc-200 group-hover:text-white transition line-clamp-1">
                                  {lead.businessName}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-light">
                                  {lead.category && <span>{lead.category}</span>}
                                  {lead.category && <span>•</span>}
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                                    {lead.city}, {lead.state} {lead.distanceMiles ? `(${lead.distanceMiles.toFixed(1)}mi)` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Score Band Badge */}
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {lead.score !== null ? (
                                  <div className={`text-xl font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1 shadow-sm ${scoreBadgeColor}`}>
                                    <TrendingUp className="w-4 h-4 shrink-0" />
                                    {Math.round(lead.score)}
                                  </div>
                                ) : (
                                  <div className="text-xs text-zinc-650 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded-md">
                                    Unscored
                                  </div>
                                )}
                                <div className="flex gap-1 items-center">
                                  {lead.scoreBand && (
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${bandColor}`}>
                                      {lead.scoreBand}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${
                                    lead.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    lead.status === 'approved' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow shadow-indigo-500/10' :
                                    lead.status === 'drafted' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    lead.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow shadow-red-500/10' :
                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                  }`}>
                                    {lead.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Rejection Details Warning */}
                            {lead.status === 'rejected' && (
                              <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 font-light flex flex-col gap-1">
                                <div className="flex items-center gap-1 font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Lead Rejected / Archived
                                </div>
                                <p>Reason: <span className="font-semibold text-red-300 font-mono text-[10px]">{lead.rejectionReason || 'poor_fit'}</span></p>
                              </div>
                            )}

                            {/* Missing Signals Enrichment Alert */}
                            {!lead.signals && (
                              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="text-yellow-400 w-4 h-4 shrink-0" />
                                  <div>
                                    <p className="text-xs font-bold text-yellow-300">Enrichment Incomplete</p>
                                    <p className="text-[10px] text-zinc-400 font-light mt-0.5">This lead is missing digital maturity signals.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleEnrichRetry(lead.id)}
                                  disabled={enrichRetryingLeads[lead.id]}
                                  className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition disabled:opacity-40 flex items-center gap-1 shadow-md shadow-yellow-500/10"
                                >
                                  {enrichRetryingLeads[lead.id] ? (
                                    <>
                                      <RotateCw className="w-3 h-3 animate-spin" />
                                      Retrying...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Enrich
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Evidence-backed score reasons list */}
                            {lead.reasons && lead.reasons.length > 0 ? (
                              <div className="pt-3 border-t border-zinc-850/40 space-y-2">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-600">
                                  Intelligence Insights
                                </p>
                                <ul className="space-y-1.5">
                                  {lead.reasons.map((reason: string, rIdx: number) => (
                                    <li key={rIdx} className="text-xs text-zinc-400 font-light flex items-start gap-2">
                                      <span className="text-emerald-500 select-none text-[10px] mt-0.5">✔</span>
                                      <span className="line-clamp-2">{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-600 font-light italic">
                                No insights computed. Trigger manual rescore below.
                              </p>
                            )}
                          </div>

                          {/* Interactive Outreach Drafting Widget */}
                          {lead.status !== 'rejected' && lead.signals && (
                            <div className="pt-4 mt-4 border-t border-zinc-850/40 bg-zinc-950/20 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-zinc-500">Tone:</span>
                                <select
                                  value={tone}
                                  onChange={(e) => setLeadToneSelection(prev => ({ ...prev, [lead.id]: e.target.value as any }))}
                                  className="bg-zinc-950 border border-zinc-800 rounded-md py-1 px-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="friendly">😊 Friendly</option>
                                  <option value="direct">⚡ Direct</option>
                                  <option value="professional">💼 Professional</option>
                                </select>
                              </div>
                              
                              <button
                                onClick={() => handleGenerateDraft(lead.id, tone)}
                                disabled={isDrafting}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg transition disabled:opacity-40 flex items-center gap-1 shadow-md shadow-blue-500/10"
                              >
                                {isDrafting ? (
                                  <>
                                    <RotateCw className="w-3 h-3 animate-spin" />
                                    Drafting...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-3 h-3" />
                                    {lead.status === 'drafted' || lead.status === 'approved' || lead.status === 'sent' ? 'Redraft Outreach' : 'Draft Outreach'}
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex gap-3 pt-4 mt-4 border-t border-zinc-850/40 items-center justify-between">
                            <Link 
                              href={`/leads/${lead.id}`}
                              className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold transition flex items-center gap-1.5 hover:underline"
                            >
                              View Profile <ArrowRight className="w-3.5 h-3.5" />
                            </Link>

                            <div className="flex gap-2">
                              {lead.status !== 'rejected' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setRejectingLeadId(lead.id);
                                  }}
                                  className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 hover:border-red-700/60 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                onClick={(e) => handleRescore(lead.id, e)}
                                disabled={isRescoring}
                                className="bg-zinc-950 hover:bg-zinc-855 text-zinc-400 hover:text-zinc-200 border border-zinc-850 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:border-zinc-700"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${isRescoring ? 'animate-spin text-emerald-400' : ''}`} />
                                {isRescoring ? 'Rescoring...' : 'Rescore'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: DRAFT REVIEW QUEUE & INLINE EDITOR */}
            {activeTab === 'drafts' && (
              <div className="grid md:grid-cols-5 gap-6 items-start animate-fadeIn">
                
                {/* Left side list of drafts (2/5 columns) */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-400" /> Drafts in Queue ({drafts.filter(d => d.status !== 'sent').length})
                  </h3>

                  {draftsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(idx => (
                        <div key={idx} className="bg-zinc-900/10 border border-zinc-850 rounded-xl p-4 h-24 animate-pulse"></div>
                      ))}
                    </div>
                  ) : drafts.filter(d => d.status !== 'sent').length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/10 border border-zinc-800/40 rounded-xl">
                      <Inbox className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-xs italic">No email drafts waiting for review.</p>
                      <button 
                        onClick={() => setActiveTab('leads')}
                        className="text-blue-400 text-[11px] underline mt-1 block mx-auto hover:text-blue-300 animate-pulse"
                      >
                        Go to Leads Queue to generate a draft
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {drafts.filter(d => d.status !== 'sent').map((draft) => {
                        const isSelected = selectedDraft?.id === draft.id;
                        
                        let bandColor = 'bg-zinc-850 text-zinc-400 border-zinc-800';
                        if (draft.lead?.scoreBand === 'high') bandColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        else if (draft.lead?.scoreBand === 'medium') bandColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

                        return (
                          <div
                            key={draft.id}
                            onClick={() => handleSelectDraft(draft)}
                            className={`p-4 border rounded-xl cursor-pointer transition text-left backdrop-blur-sm relative overflow-hidden ${
                              isSelected 
                                ? 'bg-indigo-500/10 border-indigo-500/80 shadow-md shadow-indigo-500/5' 
                                : 'bg-zinc-900/20 border-zinc-855 hover:border-zinc-700/60'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-sm text-zinc-200 line-clamp-1 pr-2">
                                {draft.lead?.businessName || 'Unknown Business'}
                              </h4>
                              <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase tracking-wider border shrink-0 ${
                                draft.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              }`}>
                                {draft.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 line-clamp-1 font-light italic mb-2">
                              {draft.subject}
                            </p>
                            <div className="flex gap-2 items-center text-[10px] text-zinc-500 font-light">
                              {draft.lead?.score !== null && (
                                <span className="flex items-center gap-0.5">
                                  Score: <span className="font-semibold text-zinc-300">{Math.round(draft.lead?.score)}</span>
                                </span>
                              )}
                              <span>•</span>
                              <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side Inline Editor (3/5 columns) */}
                <div className="md:col-span-3 space-y-4">
                  {selectedDraft ? (
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md space-y-6 shadow-2xl relative overflow-hidden text-left">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex justify-between items-start border-b border-zinc-800/60 pb-4">
                        <div>
                          <h3 className="text-xl font-bold text-zinc-100">
                            {selectedDraft.lead?.businessName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                            <span>{selectedDraft.lead?.category || 'General Business'}</span>
                            {selectedDraft.lead?.website && (
                              <>
                                <span>•</span>
                                <a href={selectedDraft.lead.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                                  {selectedDraft.lead.website.replace(/^https?:\/\//, '')}
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {selectedDraft.lead?.score !== null && (
                          <div className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-xl text-center shrink-0">
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 block">Lead Score</span>
                            <span className="text-lg font-black text-emerald-400">{Math.round(selectedDraft.lead?.score)}</span>
                          </div>
                        )}
                      </div>

                      {/* Tone Regenerator inline widget */}
                      <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-zinc-400">Not quite right? Regenerate in another tone:</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <select
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value as any)}
                            className="bg-zinc-950 border border-zinc-850 rounded py-1 px-2 text-[11px] text-zinc-300"
                          >
                            <option value="friendly">Friendly 😊</option>
                            <option value="direct">Direct ⚡</option>
                            <option value="professional">Professional 💼</option>
                          </select>
                          <button
                            onClick={handleRegenerateDraft}
                            disabled={isRegeneratingDraft}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded text-[11px] transition disabled:opacity-40"
                          >
                            {isRegeneratingDraft ? 'Regenerating...' : 'Go'}
                          </button>
                        </div>
                      </div>

                      {/* Email draft inputs */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-1.5">
                            Email Subject
                          </label>
                          <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none transition text-zinc-200 text-sm font-medium"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-1.5">
                            Email Body
                          </label>
                          <textarea
                            rows={10}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none transition text-zinc-250 text-xs font-light leading-relaxed font-mono"
                          />
                        </div>
                      </div>

                      {/* Action buttons bar */}
                      <div className="flex flex-wrap gap-3 items-center justify-between pt-4 border-t border-zinc-800/60">
                        {/* Discard draft */}
                        <button
                          onClick={handleDiscardDraft}
                          disabled={isDiscardingDraft}
                          className="bg-zinc-950 border border-zinc-850 hover:bg-red-950/20 hover:border-red-900/60 text-zinc-500 hover:text-red-400 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-40"
                          title="Discard this draft completely"
                        >
                          <Trash2 className="w-4 h-4" />
                          Discard
                        </button>

                        <div className="flex gap-3 flex-wrap">
                          {/* Save edits */}
                          <button
                            onClick={handleSaveEdits}
                            disabled={isSavingDraft}
                            className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-40"
                          >
                            <Save className="w-4 h-4 text-indigo-400" />
                            {isSavingDraft ? 'Saving...' : 'Save Edits'}
                          </button>

                          {/* Approve draft */}
                          {selectedDraft.status !== 'approved' ? (
                            <button
                              onClick={handleApproveDraft}
                              disabled={isApprovingDraft}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-40"
                            >
                              <Check className="w-4 h-4" />
                              {isApprovingDraft ? 'Approving...' : 'Approve Draft'}
                            </button>
                          ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                              <ThumbsUp className="w-4 h-4" />
                              Approved Version
                            </div>
                          )}

                          {/* Send outreach (strictly gated) */}
                          <button
                            onClick={handleSendOutreach}
                            disabled={isSendingDraft}
                            className={`font-bold py-2.5 px-5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg ${
                              selectedDraft.status === 'approved'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10'
                                : 'bg-zinc-800 text-zinc-550 border border-zinc-800 cursor-not-allowed opacity-50'
                            }`}
                            title={selectedDraft.status !== 'approved' ? 'Requires approval before sending' : 'Simulate outreach email delivery'}
                          >
                            <Send className="w-4 h-4" />
                            {isSendingDraft ? 'Sending...' : 'Send Outreach'}
                          </button>
                        </div>
                      </div>

                      {/* Display evidence context for easy copywriting verification */}
                      {selectedDraft.lead?.reasons && selectedDraft.lead.reasons.length > 0 && (
                        <div className="pt-4 border-t border-zinc-800/60 space-y-2 text-left">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-650">
                            Copywriting Guidance Context
                          </p>
                          <ul className="space-y-1.5">
                            {selectedDraft.lead.reasons.map((reason: string, rIdx: number) => (
                              <li key={rIdx} className="text-xs text-zinc-400 font-light flex items-start gap-1.5">
                                <span className="text-indigo-400 select-none text-[9px] mt-0.5">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center border border-zinc-850/60 bg-zinc-900/10 rounded-2xl p-8 text-center backdrop-blur-sm">
                      <Mail className="w-12 h-12 text-zinc-750 mb-3 animate-pulse animate-duration-1000" />
                      <h4 className="font-semibold text-zinc-400 mb-1">No Draft Selected</h4>
                      <p className="text-zinc-600 text-xs max-w-xs font-light">
                        Select a draft from the queue column on the left to review, update inline, and approve it for transmission.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: IMMUTABLE OUTBOX */}
            {activeTab === 'outbox' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" /> Immutable Sent Outbox Audit Trail ({drafts.filter(d => d.status === 'sent').length})
                </h3>

                {draftsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(idx => (
                      <div key={idx} className="bg-zinc-900/10 border border-zinc-850 rounded-xl p-6 h-28 animate-pulse"></div>
                    ))}
                  </div>
                ) : drafts.filter(d => d.status === 'sent').length === 0 ? (
                  <div className="text-center py-16 bg-zinc-900/10 border border-zinc-800/40 rounded-2xl">
                    <Inbox className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm font-medium">No sent outreach campaigns recorded.</p>
                    <p className="text-zinc-650 text-xs mt-1">Approve and send drafts from the Review Queue to populate logs.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.filter(d => d.status === 'sent').map((draft) => {
                      const isExpanded = expandedOutboxDrafts[draft.id] || false;

                      return (
                        <div
                          key={draft.id}
                          className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 hover:border-zinc-800/80 transition backdrop-blur-sm text-left animate-fadeIn"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-lg text-zinc-200">
                                  {draft.lead?.businessName || 'Unknown Business'}
                                </h4>
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
                                  DELIVERED
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-light">
                                <Clock className="w-3.5 h-3.5 text-zinc-550" />
                                Sent On: <span className="font-semibold">{draft.sentAt ? new Date(draft.sentAt).toLocaleString() : 'N/A'}</span>
                                {draft.approvedBy && (
                                  <>
                                    <span className="mx-1">•</span>
                                    Approver: <span className="font-semibold">{draft.approvedBy}</span>
                                  </>
                                )}
                              </p>
                            </div>

                            <button
                              onClick={() => setExpandedOutboxDrafts(prev => ({ ...prev, [draft.id]: !isExpanded }))}
                              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-zinc-400 hover:text-zinc-205 transition flex items-center gap-1 shrink-0"
                            >
                              {isExpanded ? (
                                <>
                                  Hide Email Copy <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  View Sent Copy <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>

                          {/* Expandable audit email content */}
                          {isExpanded && (
                            <div className="mt-5 p-5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4 animate-fadeIn">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Subject Line</span>
                                <p className="text-sm font-bold text-zinc-250 mt-1">{draft.subject}</p>
                              </div>
                              <div className="border-t border-zinc-850/40 pt-3">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email Body Copy</span>
                                <p className="text-xs text-zinc-400 font-mono mt-1.5 leading-relaxed whitespace-pre-wrap">{draft.body}</p>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SETTINGS & ADMIN PANEL */}
            {activeTab === 'settings' && (
              <div className="grid md:grid-cols-5 gap-6 items-start animate-fadeIn">
                {/* Left Columns (3/5) - Configuration Options */}
                <div className="md:col-span-3 space-y-6">
                  {/* Sender Profile Card */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" /> Sender Outreach Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-450 mb-1.5 uppercase">Sender Name</label>
                        <input
                          type="text"
                          value={settings.senderName}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, senderName: e.target.value }))}
                          placeholder="e.g. Athena Outreach"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-450 mb-1.5 uppercase">Sender Email</label>
                        <input
                          type="email"
                          value={settings.senderEmail}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, senderEmail: e.target.value }))}
                          placeholder="e.g. info@athenalytics.co"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-300 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Scoring Weights Config */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-500" /> Dynamic Scoring Weight Distribution
                      </h3>
                      {(() => {
                        const sum = getWeightsSum(settings.scoringWeights);
                        const isValid = Math.abs(sum - 100) < 0.01;
                        return (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isValid 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                          }`}>
                            Total: {sum}% {isValid ? '✔' : '⚠ Must equal 100%'}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="space-y-4">
                      {/* Weights sliders */}
                      {[
                        { key: 'fit', label: 'Business Vertical Match Fit', desc: 'Relevance of the categorized vertical' },
                        { key: 'website', label: 'Website Quality & Presence', desc: 'Quality score of the target homepage' },
                        { key: 'demand', label: 'Local Market Demand Gap', desc: 'Unsatisfied consumer search interest volume' },
                        { key: 'analytics', label: 'Analytics Setup Pain', desc: 'Missing tracking codes, tags, pixels' },
                        { key: 'outreach', label: 'Contact Outreach Readiness', desc: 'Valid emails, active phone channels' },
                        { key: 'growth', label: 'Google Business Growth', desc: 'Review velocity and rating patterns' },
                        { key: 'geo', label: 'Geographic Proximity Factor', desc: 'Closeness to center target radius' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-zinc-300">{label}</span>
                              <span className="text-zinc-500 text-[10px] ml-1.5 font-light">({desc})</span>
                            </div>
                            <span className="font-mono font-bold text-amber-400">{settings.scoringWeights?.[key] || 0}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={settings.scoringWeights?.[key] || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSettings((prev: any) => ({
                                ...prev,
                                scoringWeights: {
                                  ...prev.scoringWeights,
                                  [key]: val
                                }
                              }));
                            }}
                            className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ICP Presets Config */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-500" /> Ideal Customer Profile (ICP) Constraints
                    </h3>
                    <div className="space-y-3.5">
                      <label className="flex items-start gap-3 cursor-pointer text-xs font-light text-zinc-400 select-none">
                        <input
                          type="checkbox"
                          checked={settings.icpPresets?.requiredWebsite || false}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            icpPresets: {
                              ...prev.icpPresets,
                              requiredWebsite: e.target.checked
                            }
                          }))}
                          className="mt-0.5 accent-amber-500 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                        />
                        <div>
                          <p className="font-bold text-zinc-300">Require Active Website</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Filter out businesses that do not own a resolvable website URL.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer text-xs font-light text-zinc-400 select-none">
                        <input
                          type="checkbox"
                          checked={settings.icpPresets?.requireBooking || false}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            icpPresets: {
                              ...prev.icpPresets,
                              requireBooking: e.target.checked
                            }
                          }))}
                          className="mt-0.5 accent-amber-500 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                        />
                        <div>
                          <p className="font-bold text-zinc-300">Require Booking Link</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Filter out businesses missing active scheduling platforms (Calendly, Acuity, etc.).</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer text-xs font-light text-zinc-400 select-none">
                        <input
                          type="checkbox"
                          checked={settings.icpPresets?.requireOrdering || false}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            icpPresets: {
                              ...prev.icpPresets,
                              requireOrdering: e.target.checked
                            }
                          }))}
                          className="mt-0.5 accent-amber-500 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                        />
                        <div>
                          <p className="font-bold text-zinc-300">Require Ordering/Commerce Capability</p>
                          <p className="text-[10px] text-zinc-550 mt-0.5">Prioritize storefronts equipped with online shop checkouts or transactional tools.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer text-xs font-light text-zinc-400 select-none">
                        <input
                          type="checkbox"
                          checked={settings.icpPresets?.requireSocial || false}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            icpPresets: {
                              ...prev.icpPresets,
                              requireSocial: e.target.checked
                            }
                          }))}
                          className="mt-0.5 accent-amber-500 rounded border-zinc-800 bg-zinc-950 text-amber-500"
                        />
                        <div>
                          <p className="font-bold text-zinc-300">Require Linked Social Profiles</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Filter out targets that have zero connected Facebook, Instagram, or LinkedIn accounts.</p>
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-850/40">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">Min Review Count Threshold</label>
                          <input
                            type="number"
                            min="0"
                            value={settings.icpPresets?.minReviewCount || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSettings((prev: any) => ({
                                ...prev,
                                icpPresets: {
                                  ...prev.icpPresets,
                                  minReviewCount: val
                                }
                              }));
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">Default Radius (Miles)</label>
                          <input
                            type="number"
                            min="1"
                            value={settings.defaultRadiusMiles || 10}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 10;
                              setSettings((prev: any) => ({
                                ...prev,
                                defaultRadiusMiles: val
                              }));
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Copystore Editor */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-500" /> Custom AI Outreach Prompt Copystore
                    </h3>
                    <p className="text-xs text-zinc-500 font-light leading-relaxed">
                      Override the default copy-generation templates for each tone setting. You can reference business context variables with double braces: <code className="text-amber-400 font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded">{"{{businessName}}"}</code>, <code className="text-amber-400 font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded">{"{{senderName}}"}</code>, <code className="text-amber-400 font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded">{"{{city}}"}</code>, and <code className="text-amber-400 font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded">{"{{vertical}}"}</code>.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1.5 uppercase">⚡ Direct Tone Override Instructions</label>
                        <textarea
                          rows={3}
                          value={settings.promptTemplates?.direct || ''}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            promptTemplates: {
                              ...prev.promptTemplates,
                              direct: e.target.value
                            }
                          }))}
                          placeholder="e.g. Keep it extremely brief. Outline key gaps immediately."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1.5 uppercase">😊 Friendly Tone Override Instructions</label>
                        <textarea
                          rows={3}
                          value={settings.promptTemplates?.friendly || ''}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            promptTemplates: {
                              ...prev.promptTemplates,
                              friendly: e.target.value
                            }
                          }))}
                          placeholder="e.g. Maintain a warm, encouraging approach. Congratulate them on positive features before naming pain points."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1.5 uppercase">💼 Professional Tone Override Instructions</label>
                        <textarea
                          rows={3}
                          value={settings.promptTemplates?.professional || ''}
                          onChange={(e) => setSettings((prev: any) => ({
                            ...prev,
                            promptTemplates: {
                              ...prev.promptTemplates,
                              professional: e.target.value
                            }
                          }))}
                          placeholder="e.g. Focus on ROI metrics, strategic alignment, and digital conversion rates."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Configuration Settings Action */}
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-650/10 disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Saving Settings...' : 'Save Workspace Settings'}
                  </button>
                  {settingsError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 font-light text-center">
                      Error saving: {settingsError}
                    </div>
                  )}
                </div>

                {/* Right Columns (2/5) - Audit Log timeline */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-500" /> Compliance Audit Trail
                    </h3>

                    {auditLogsLoading ? (
                      <div className="space-y-4 py-8">
                        {[1, 2, 3].map(idx => (
                          <div key={idx} className="h-16 bg-zinc-900/20 rounded-xl animate-pulse border border-zinc-850/50"></div>
                        ))}
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs italic">
                        No auditable security actions recorded.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
                        {auditLogs.map((log) => {
                          const isExpanded = expandedAuditLogs[log.id] || false;
                          
                          let actionColor = 'text-zinc-400 bg-zinc-950 border-zinc-850';
                          if (log.action === 'scoring' || log.action === 'rescore') {
                            actionColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                          } else if (log.action === 'approval' || log.action === 'send') {
                            actionColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                          } else if (log.action === 'lead_reject') {
                            actionColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                          } else if (log.action === 'settings_update') {
                            actionColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                          }

                          return (
                            <div 
                              key={log.id} 
                              className="border border-zinc-850/60 rounded-xl p-3 bg-zinc-950/20 hover:border-zinc-800 transition text-xs flex flex-col gap-2 relative animate-fadeIn"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${actionColor}`}>
                                    {log.action}
                                  </span>
                                  <div className="text-[10px] text-zinc-500 font-light mt-1.5">
                                    Entity: <span className="font-bold text-zinc-400">{log.entityType}</span> ({log.entityId.slice(0, 8)}...)
                                  </div>
                                </div>
                                <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                                  {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-850/40 text-[10px] text-zinc-400">
                                <span>Actor: <code className="font-mono text-zinc-300 font-semibold">{log.actor}</code></span>
                                <button
                                  onClick={() => setExpandedAuditLogs(prev => ({ ...prev, [log.id]: !isExpanded }))}
                                  className="text-[9px] text-zinc-500 hover:text-amber-400 transition hover:underline"
                                >
                                  {isExpanded ? 'Hide Details' : 'Expand Diff'}
                                </button>
                              </div>

                              {isExpanded && log.details && (
                                <div className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-[9px] font-mono text-zinc-400 mt-1 whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar">
                                  {JSON.stringify(log.details, null, 2)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* LEAD REJECTION DIALOG OVERLAY */}
      {rejectingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0f0f11] border border-zinc-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-left relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-zinc-200 flex items-center gap-2">
                <AlertTriangle className="text-red-500 w-5 h-5 shrink-0" />
                Reject & Archive Lead
              </h3>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                Rejecting this lead will archive it instantly from active queue workflows and log the transaction details for multi-tenant boundary audit tracking.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Rejection Reason Code</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-red-500 transition text-zinc-350 text-xs"
                >
                  <option value="poor_fit">🚫 Poor Business Category Match</option>
                  <option value="out_of_radius">📍 Target Out of Operating Radius</option>
                  <option value="missing_contact">📞 No Valid Outreach Channels</option>
                  <option value="low_rating">⭐ Reputation / Review Quality Too Low</option>
                  <option value="other">✍ Other / Custom Reason</option>
                </select>
              </div>

              {rejectionReason === 'other' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Specify Custom Reason</label>
                  <input
                    type="text"
                    required
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="e.g. Business permanently closed or merged"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-red-500 transition text-zinc-300 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-zinc-850/40">
              <button
                type="button"
                onClick={() => {
                  setRejectingLeadId(null);
                  setCustomRejectionReason('');
                }}
                className="bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectLeadSubmit}
                disabled={isRejectingLead || (rejectionReason === 'other' && !customRejectionReason.trim())}
                className="bg-red-655 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-40 flex items-center gap-1 shadow-md shadow-red-500/10"
              >
                {isRejectingLead ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Archive Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
