'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import LeadsMap from '@/components/LeadsMap';
import { useToast } from '@/components/Toast';
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
  RefreshCw,
  User,
  Zap,
  CreditCard,
  KeyRound,
  Bell,
  Calendar,
  CalendarPlus,
} from 'lucide-react';

const TIER_LIMITS_UI: Record<string, { name: string; price: string; searches: number; results: number; drafts: number; features: string[] }> = {
  FREE: {
    name: 'Free Tier',
    price: '$0',
    searches: 10,
    results: 50,
    drafts: 50,
    features: ['10 Searches / day', '50 Discovered Leads / day', '50 Email Drafts / day', 'Standard heuristic AI models'],
  },
  TIER_1: {
    name: 'Premium Growth',
    price: '$49',
    searches: 50,
    results: 250,
    drafts: 250,
    features: ['50 Searches / day', '250 Discovered Leads / day', '250 Email Drafts / day', 'Priority API queues', 'Deep search parameters'],
  },
  TIER_2: {
    name: 'Elite Scaler',
    price: '$149',
    searches: 200,
    results: 1000,
    drafts: 1000,
    features: ['200 Searches / day', '1,000 Discovered Leads / day', '1,000 Email Drafts / day', 'Dedicated concurrent scrapers', 'Priority support SLAs'],
  },
  UNLIMITED: {
    name: 'Unlimited Enterprise',
    price: '$299',
    searches: Infinity,
    results: Infinity,
    drafts: Infinity,
    features: ['∞ Searches / day', '∞ Discovered Leads / day', '∞ Email Drafts / day', 'Bring your own API keys', 'Zero platform API surcharges'],
  },
};

const mapRejectionReason = (reason: string | null) => {
  if (!reason) return 'Unspecified';
  const mappers: Record<string, string> = {
    poor_fit: '🚫 Poor Business Category Match',
    out_of_radius: '📍 Target Out of Operating Radius',
    missing_contact: '📞 No Valid Outreach Channels',
    low_rating: '⭐ Reputation / Review Quality Too Low',
  };
  return mappers[reason] || reason;
};

export default function Home() {
  const toast = useToast();
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
  const [activeTab, setActiveTab] = useState<'map' | 'leads' | 'drafts' | 'outbox' | 'schedules' | 'settings'>('leads');
  const [drafts, setDrafts] = useState<any[]>([]);

  // Notification Feed states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Schedules Dashboard states
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleVertical, setScheduleVertical] = useState('');
  const [scheduleLocationType, setScheduleLocationType] = useState<'city_state' | 'zip'>('city_state');
  const [scheduleCity, setScheduleCity] = useState('');
  const [scheduleState, setScheduleState] = useState('');
  const [scheduleZipCode, setScheduleZipCode] = useState('');
  const [scheduleRadius, setScheduleRadius] = useState('10');
  const [scheduleTargetCount, setScheduleTargetCount] = useState('50');
  const [scheduleInterval, setScheduleInterval] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  
  // Edit states for selected draft
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editRecipientEmail, setEditRecipientEmail] = useState('');
  
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
  const [userProfile, setUserProfile] = useState<any>(null);
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
    },
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpEnabled: false,
    hasSmtpPassword: false,
    
    // SaaS Quotas & Credentials
    subscriptionTier: 'FREE',
    dailySearchesCount: 0,
    dailyResultsCount: 0,
    dailyDraftsCount: 0,
    byoOpenRouterKey: '',
    byoGoogleMapsKey: '',
    hasByoOpenRouterKey: false,
    hasByoGoogleMapsKey: false,
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

  // Load user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const profile = await res.json();
          setUserProfile(profile);
          setWorkspaceId(profile.workspaceId);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchRecentSearches();
    fetchLeads();
    fetchDrafts();
    fetchSettings();
    fetchAuditLogs();
    fetchNotifications();
    fetchSchedules();

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
          },
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || '',
          smtpPass: '',
          smtpEnabled: data.smtpEnabled || false,
          hasSmtpPassword: data.hasSmtpPassword || false,
          
          // SaaS parameters
          subscriptionTier: data.subscriptionTier || 'FREE',
          dailySearchesCount: data.dailySearchesCount || 0,
          dailyResultsCount: data.dailyResultsCount || 0,
          dailyDraftsCount: data.dailyDraftsCount || 0,
          byoOpenRouterKey: '',
          byoGoogleMapsKey: '',
          hasByoOpenRouterKey: data.hasByoOpenRouterKey || false,
          hasByoGoogleMapsKey: data.hasByoGoogleMapsKey || false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch(`/api/notifications?workspaceId=${workspaceId}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          const unread = (data.notifications || []).filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkAsRead = async (id?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify(id ? { id } : {})
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (id?: string) => {
    try {
      const url = id 
        ? `/api/notifications?id=${id}&workspaceId=${workspaceId}`
        : `/api/notifications?workspaceId=${workspaceId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        toast.success(id ? 'Notification deleted' : 'All notifications cleared');
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const fetchSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const res = await fetch(`/api/schedules?workspaceId=${workspaceId}`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSchedules(data.schedules || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleToggleScheduleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success(!currentStatus ? 'Schedule activated' : 'Schedule paused');
        fetchSchedules();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to toggle schedule status');
      }
    } catch (err) {
      console.error('Failed to toggle schedule active state:', err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        toast.success('Schedule deleted successfully');
        fetchSchedules();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete schedule');
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleVertical.trim()) {
      toast.warning('Please specify a business vertical/niche', 3000, 'Missing Fields');
      return;
    }
    if (scheduleLocationType === 'city_state' && (!scheduleCity.trim() || !scheduleState.trim())) {
      toast.warning('Please specify both city and state', 3000, 'Missing Fields');
      return;
    }
    if (scheduleLocationType === 'zip' && !scheduleZipCode.trim()) {
      toast.warning('Please specify a ZIP code', 3000, 'Missing Fields');
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({
          vertical: scheduleVertical,
          locationType: scheduleLocationType,
          city: scheduleLocationType === 'city_state' ? scheduleCity : null,
          state: scheduleLocationType === 'city_state' ? scheduleState : null,
          zipCode: scheduleLocationType === 'zip' ? scheduleZipCode : null,
          radiusMiles: parseInt(scheduleRadius),
          targetCount: parseInt(scheduleTargetCount),
          interval: scheduleInterval
        })
      });

      if (res.ok) {
        toast.success('Scheduled search created successfully! The first run has been initiated.', 5000, 'Schedule Created');
        setScheduleVertical('');
        setScheduleCity('');
        setScheduleState('');
        setScheduleZipCode('');
        setScheduleRadius('10');
        setScheduleTargetCount('50');
        setScheduleInterval('weekly');
        fetchSchedules();
        fetchRecentSearches();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create schedule');
      }
    } catch (err: any) {
      console.error('Failed to create scheduled search:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const handleTestSmtpConnection = async () => {
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser) {
      toast.warning('SMTP Host, Port, and User are required to test connection.', 4000, 'Missing Fields');
      return;
    }
    if (!testEmailRecipient.trim()) {
      toast.warning('Please enter a valid recipient email address to send the test message to.', 4000, 'Recipient Required');
      return;
    }
    setIsTestingSmtp(true);
    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({
          smtpHost: settings.smtpHost,
          smtpPort: Number(settings.smtpPort),
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass || undefined,
          testEmailRecipient
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'SMTP Connection Verified Successfully!');
      } else {
        toast.error(data.error || 'SMTP Connection Test Failed. Please verify credentials.', 5000, 'Handshake Failed');
      }
    } catch (err: any) {
      console.error('Failed to test SMTP connection:', err);
      toast.error(err.message || 'SMTP test handshake encountered a network error.', 5000, 'Network Error');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveSettings = async () => {
    const sum = getWeightsSum(settings.scoringWeights);
    if (Math.abs(sum - 100) > 0.01) {
      toast.warning(`Scoring weights must sum to exactly 100%. Current total: ${sum}%`, 5000, 'Invalid Weights');
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
        toast.success('Workspace settings updated and logged successfully!');
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
        toast.success('Enrichment retry successful! Lead signals updated and rescored.');
        await fetchLeads(leadSearch);
        await fetchAuditLogs();
      } else {
        const data = await res.json();
        toast.error(`Enrichment failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to retry enrichment:', err);
      toast.error(`Error retrying enrichment: ${err.message}`);
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
        body: JSON.stringify({ rejectionReason: actualReason })
      });
      if (res.ok) {
        toast.success('Lead successfully rejected and archived.');
        setRejectingLeadId(null);
        setCustomRejectionReason('');
        await fetchLeads(leadSearch);
        await fetchAuditLogs();
      } else {
        const data = await res.json();
        toast.error(`Failed to reject lead: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to reject lead:', err);
      toast.error(`Error rejecting lead: ${err.message}`);
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
    setEditRecipientEmail(draft.lead?.contactEmail || '');
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
        body: JSON.stringify({ subject: editSubject, body: editBody, recipientEmail: editRecipientEmail })
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(prev => prev.map(d => d.id === selectedDraft.id ? { 
          ...d, 
          subject: editSubject, 
          body: editBody, 
          lead: d.lead ? { ...d.lead, contactEmail: editRecipientEmail } : null 
        } : d));
        setSelectedDraft(data.draft);
        toast.success('Draft changes successfully saved to database.');
      }
    } catch (err) {
      console.error('Failed to save draft edits:', err);
      toast.error('Error saving draft. Please try again.');
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
        toast.success('Draft has been officially approved! Lead status is updated.');
      }
    } catch (err) {
      console.error('Failed to approve draft:', err);
      toast.error('Failed to approve draft. Please try again.');
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
        toast.success('Simulated email outreach sent successfully! Saved to Immutable Outbox.');
        await fetchDrafts();
        await fetchLeads(leadSearch);
        setSelectedDraft(null);
      } else {
        toast.error(`Gated Send Refused: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to send outreach:', err);
      toast.error('Failed to send outreach. Please try again.');
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
        toast.success('Draft successfully discarded.');
        await fetchDrafts();
        await fetchLeads(leadSearch);
        setSelectedDraft(null);
      }
    } catch (err) {
      console.error('Failed to discard draft:', err);
      toast.error('Failed to discard draft. Please try again.');
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
        toast.success(`Email draft successfully regenerated with ${selectedTone} tone!`);
      }
    } catch (err) {
      console.error('Failed to regenerate draft:', err);
      toast.error('Failed to regenerate draft. Please try again.');
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
        {/* Glowing glassmorphic Notification Bell dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            style={{
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              color: unreadCount > 0 ? '#e0f2fe' : '#a1a1aa',
              boxShadow: unreadCount > 0 ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
            }}
            className="hover:bg-zinc-800/50 hover:border-zinc-700"
          >
            <Bell size={16} className={unreadCount > 0 ? 'text-sky-400 animate-pulse' : ''} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 'bold',
                borderRadius: '9999px',
                padding: '1px 5px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotificationsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '340px',
                background: 'rgba(15, 15, 17, 0.96)',
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 16px -6px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.03)',
                padding: '16px',
                zIndex: 200,
                maxHeight: '400px',
                overflowY: 'auto'
              }}
              onMouseLeave={() => setShowNotificationsDropdown(false)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#f4f4f5', margin: 0 }}>Workspace Alerts</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => handleMarkAsRead()}
                      style={{ fontSize: '10px', color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Read All
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => handleDeleteNotification()}
                      style={{ fontSize: '10px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {notificationsLoading && notifications.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
                  No notifications yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map((notif) => {
                    let typeColor = '#38bdf8'; // info - blue
                    let typeBg = 'rgba(56, 189, 248, 0.06)';
                    let typeBorder = 'rgba(56, 189, 248, 0.15)';
                    if (notif.type === 'success') {
                      typeColor = '#34d399'; // green
                      typeBg = 'rgba(52, 211, 153, 0.06)';
                      typeBorder = 'rgba(52, 211, 153, 0.15)';
                    } else if (notif.type === 'new_leads') {
                      typeColor = '#c084fc'; // purple
                      typeBg = 'rgba(192, 132, 252, 0.08)';
                      typeBorder = 'rgba(192, 132, 252, 0.2)';
                    } else if (notif.type === 'warning' || notif.type === 'failed') {
                      typeColor = '#f87171'; // red
                      typeBg = 'rgba(248, 113, 113, 0.06)';
                      typeBorder = 'rgba(248, 113, 113, 0.15)';
                    }

                    return (
                      <div
                        key={notif.id}
                        style={{
                          background: typeBg,
                          border: `1px solid ${typeBorder}`,
                          borderRadius: '8px',
                          padding: '10px 12px',
                          position: 'relative',
                          opacity: notif.isRead ? 0.6 : 1,
                          transition: 'opacity 0.2s',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: typeColor }}>
                            {notif.title}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {!notif.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                style={{
                                  fontSize: '11px',
                                  color: '#34d399',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                                title="Mark as read"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notif.id)}
                              style={{
                                fontSize: '11px',
                                color: '#f87171',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Delete notification"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: '#d4d4d8', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '9px', color: '#71717a', display: 'block', marginTop: '6px' }}>
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
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
          {workspaceId && (
            <div className="flex justify-center items-center gap-2 mt-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl px-5 py-2.5 w-fit mx-auto backdrop-blur-md shadow-2xl">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure Session Tenant:
              </span>
              <span className="text-xs font-extrabold text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-900/40">
                🏢 {workspaceId}
              </span>
              {userProfile && (
                <span className="text-[11px] text-zinc-400 font-light border-l border-zinc-800 pl-2">
                  👤 {userProfile.name} ({userProfile.email})
                </span>
              )}
            </div>
          )}
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
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === 'map'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🗺️ Map View
                </button>
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
                  onClick={() => setActiveTab('schedules')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                    activeTab === 'schedules'
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  📅 Schedules
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

            {/* TAB 0: LEADS MAP */}
            {activeTab === 'map' && (
              <LeadsMap 
                leads={leads} 
                onDraftEmail={async (lead, tone) => {
                  setActiveTab('drafts');
                  setLeadDraftingLoading(prev => ({ ...prev, [lead.id]: true }));
                  try {
                    const res = await fetch(`/api/email-drafts`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-workspace-id': workspaceId
                      },
                      body: JSON.stringify({ leadId: lead.id, tone })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.success) {
                        fetchDrafts();
                        setSelectedDraft(data.draft);
                        setEditSubject(data.draft.subject);
                        setEditBody(data.draft.body);
                      }
                    }
                  } catch (err) {
                    console.error('Failed to generate draft from map:', err);
                  } finally {
                    setLeadDraftingLoading(prev => ({ ...prev, [lead.id]: false }));
                  }
                }} 
                draftingLoading={leadDraftingLoading}
              />
            )}

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
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-zinc-400 font-medium">Reason:</span>
                                  <span className="px-2.5 py-1 bg-red-950/60 border border-red-850/50 text-red-300 rounded-lg text-[10px] font-semibold tracking-wide">
                                    {mapRejectionReason(lead.rejectionReason)}
                                  </span>
                                </div>
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
                          <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            Recipient Email
                          </label>
                          <input
                            type="email"
                            value={editRecipientEmail}
                            onChange={(e) => setEditRecipientEmail(e.target.value)}
                            placeholder="recipient@example.com"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none transition text-zinc-200 text-sm font-medium"
                          />
                        </div>

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
                  {/* Dynamic SaaS Quota HUD */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Daily Resource Quotas ({settings.subscriptionTier || 'FREE'} Plan)
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-light">
                        Resets daily at midnight
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* Searches Quota */}
                      {(() => {
                        const limit = TIER_LIMITS_UI[settings.subscriptionTier]?.searches ?? 10;
                        const current = settings.dailySearchesCount ?? 0;
                        const percent = limit === Infinity ? 0 : Math.min(100, (current / limit) * 100);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-400 font-medium">Daily Searches</span>
                              <span className="font-mono text-zinc-300 font-semibold">
                                {current} / {limit === Infinity ? '∞' : limit}
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850/50">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500"
                                style={{ width: `${limit === Infinity ? 100 : percent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-light">
                              Used to discover new leads list categories.
                            </p>
                          </div>
                        );
                      })()}

                      {/* Results Quota */}
                      {(() => {
                        const limit = TIER_LIMITS_UI[settings.subscriptionTier]?.results ?? 50;
                        const current = settings.dailyResultsCount ?? 0;
                        const percent = limit === Infinity ? 0 : Math.min(100, (current / limit) * 100);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-400 font-medium">Daily Leads Saved</span>
                              <span className="font-mono text-zinc-300 font-semibold">
                                {current} / {limit === Infinity ? '∞' : limit}
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850/50">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500"
                                style={{ width: `${limit === Infinity ? 100 : percent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-light">
                              Quota of total discovered business contacts saved.
                            </p>
                          </div>
                        );
                      })()}

                      {/* Drafts Quota */}
                      {(() => {
                        const limit = TIER_LIMITS_UI[settings.subscriptionTier]?.drafts ?? 50;
                        const current = settings.dailyDraftsCount ?? 0;
                        const percent = limit === Infinity ? 0 : Math.min(100, (current / limit) * 100);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-400 font-medium">Daily Email Drafts</span>
                              <span className="font-mono text-zinc-300 font-semibold">
                                {current} / {limit === Infinity ? '∞' : limit}
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850/50">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500"
                                style={{ width: `${limit === Infinity ? 100 : percent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-light">
                              Custom AI outreach campaigns drafted by OpenAI.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

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

                  {/* Custom SMTP Email Relay Server */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-500" /> Custom SMTP Email Relay Server
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.smtpEnabled || false}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, smtpEnabled: e.target.checked }))}
                          className="accent-amber-500 rounded border-zinc-800 bg-zinc-950 text-amber-500 focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-zinc-450 uppercase">Enable SMTP Relay</span>
                      </label>
                    </div>

                    <p className="text-xs text-zinc-500 font-light leading-relaxed">
                      Connect your own custom SMTP mail server to dispatch outreach emails automatically instead of generating copy-to-clipboard drafts.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">SMTP Host / Server</label>
                        <input
                          type="text"
                          value={settings.smtpHost || ''}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, smtpHost: e.target.value }))}
                          placeholder="e.g. smtp.gmail.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">SMTP Port</label>
                        <input
                          type="number"
                          value={settings.smtpPort || 587}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                          placeholder="587"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">SMTP User / Username</label>
                        <input
                          type="text"
                          value={settings.smtpUser || ''}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, smtpUser: e.target.value }))}
                          placeholder="e.g. sender@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-zinc-450 mb-1 uppercase">SMTP Password</label>
                        <input
                          type="password"
                          value={settings.smtpPass || ''}
                          onChange={(e) => setSettings((prev: any) => ({ ...prev, smtpPass: e.target.value }))}
                          placeholder={settings.hasSmtpPassword ? '•••••••• (Saved)' : 'Enter SMTP password'}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-850/40 flex flex-col md:flex-row md:items-end justify-between gap-3">
                      <div className="space-y-1 max-w-sm flex-1">
                        <label className="block text-[10px] font-semibold text-zinc-450 uppercase">Test SMTP Connection Handshake</label>
                        <input
                          type="email"
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                          placeholder="test-recipient@example.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleTestSmtpConnection}
                        disabled={isTestingSmtp}
                        className="bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 text-black font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 self-start md:self-auto"
                      >
                        {isTestingSmtp ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Verifying Server...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Test Handshake Relay
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SaaS Limit selector and Billing plan selector */}
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-500" /> Plan Subscription Tiers
                    </h3>
                    <p className="text-xs text-zinc-500 font-light leading-relaxed">
                      Select a subscription tier to upgrade your daily usage quotas. Switches are logged securely inside our audit trails.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(TIER_LIMITS_UI).map(([tierKey, tierInfo]) => {
                        const isCurrent = settings.subscriptionTier === tierKey;
                        return (
                          <button
                            key={tierKey}
                            type="button"
                            onClick={() => setSettings((prev: any) => ({ ...prev, subscriptionTier: tierKey }))}
                            className={`border text-left rounded-xl p-4 transition-all duration-205 relative overflow-hidden flex flex-col justify-between h-48 ${
                              isCurrent
                                ? 'bg-amber-550/5 border-amber-500/60 shadow-lg shadow-amber-550/5'
                                : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-800'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-bl">
                                Current Plan
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-sm text-zinc-200">{tierInfo.name}</h4>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-xl font-black text-amber-400">{tierInfo.price}</span>
                                <span className="text-[10px] text-zinc-500">/ month</span>
                              </div>
                              <ul className="mt-3 space-y-1">
                                {tierInfo.features.slice(0, 3).map((f, fIdx) => (
                                  <li key={fIdx} className="text-[9px] text-zinc-400 flex items-center gap-1 leading-snug">
                                    <span className="text-amber-500 select-none">•</span> <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className={`text-center py-1 rounded-md text-[9px] font-bold uppercase transition w-full mt-2 ${
                              isCurrent ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                            }`}>
                              {isCurrent ? 'Active Plan' : 'Select Plan'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bring Your Own Credentials (BYO Keys) */}
                  {settings.subscriptionTier === 'UNLIMITED' && (
                    <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left space-y-4 animate-fadeIn">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-500" /> Bring Your Own Credentials (BYO Keys)
                      </h3>
                      <p className="text-xs text-zinc-500 font-light leading-relaxed">
                        As an Unlimited tier subscriber, please provide your own API credentials. Keys are securely encrypted server-side using AES-256-GCM. Plaintext values will never be exposed.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-455 mb-1.5 uppercase">BYO OpenRouter API Key</label>
                          <input
                            type="password"
                            value={settings.byoOpenRouterKey || ''}
                            onChange={(e) => setSettings((prev: any) => ({ ...prev, byoOpenRouterKey: e.target.value }))}
                            placeholder={settings.hasByoOpenRouterKey ? '•••••••• (Saved)' : 'Enter OpenRouter Key'}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-350 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-455 mb-1.5 uppercase">BYO Google Maps / Places API Key</label>
                          <input
                            type="password"
                            value={settings.byoGoogleMapsKey || ''}
                            onChange={(e) => setSettings((prev: any) => ({ ...prev, byoGoogleMapsKey: e.target.value }))}
                            placeholder={settings.hasByoGoogleMapsKey ? '•••••••• (Saved)' : 'Enter Google Maps Key'}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500 transition text-zinc-355 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}


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

            {/* TAB 5: AUTOMATED SCHEDULES */}
            {activeTab === 'schedules' && (
              <div className="grid md:grid-cols-5 gap-6 items-start animate-fadeIn">
                {/* Left Columns (3/5) - Active Automated Campaigns */}
                <div className="md:col-span-3 space-y-6">
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-pink-400" /> Active Scans & Campaigns
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-850">
                        {schedules.length} Campaigns Configured
                      </span>
                    </div>

                    {schedulesLoading ? (
                      <div className="space-y-4 py-8">
                        {[1, 2].map(idx => (
                          <div key={idx} className="h-28 bg-zinc-900/20 rounded-xl animate-pulse border border-zinc-850/50"></div>
                        ))}
                      </div>
                    ) : schedules.length === 0 ? (
                      <div className="py-16 text-center space-y-3 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-xl">
                        <CalendarPlus className="w-10 h-10 text-zinc-650 mx-auto" />
                        <div className="text-sm font-semibold text-zinc-400">No Automation Campaigns Active</div>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto font-light leading-relaxed">
                          Define a business category, operating radius, and frequency on the right to start continuous lead discovery in the background.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {schedules.map((sched) => {
                          const isZip = sched.locationType === 'zip';
                          return (
                            <div
                              key={sched.id}
                              style={{
                                background: sched.isActive ? 'rgba(244, 63, 94, 0.02)' : 'rgba(9, 9, 11, 0.4)',
                                border: sched.isActive ? '1px solid rgba(244, 63, 94, 0.15)' : '1px solid rgba(63, 63, 70, 0.2)',
                                boxShadow: sched.isActive ? '0 0 15px rgba(244, 63, 94, 0.03)' : 'none',
                              }}
                              className="rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:border-zinc-700 text-left flex flex-col justify-between gap-4"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm text-zinc-200 tracking-tight">
                                      🔍 {sched.vertical}
                                    </span>
                                    <span className="bg-pink-950/30 text-pink-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-pink-900/30">
                                      {sched.interval}
                                    </span>
                                    <span className={`h-1.5 w-1.5 rounded-full ${sched.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                  </div>
                                  <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    {isZip ? `ZIP: ${sched.zipCode}` : `${sched.city}, ${sched.state}`}
                                    <span className="text-zinc-600">•</span>
                                    Radius: <span className="font-bold text-zinc-300">{sched.radiusMiles} miles</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  {/* Toggle active state */}
                                  <button
                                    onClick={() => handleToggleScheduleActive(sched.id, sched.isActive)}
                                    style={{
                                      background: sched.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(71, 85, 105, 0.15)',
                                      border: sched.isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(71, 85, 105, 0.3)',
                                      color: sched.isActive ? '#34d399' : '#94a3b8'
                                    }}
                                    className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                                    title={sched.isActive ? "Pause automated scans" : "Resume automated scans"}
                                  >
                                    {sched.isActive ? 'Pause' : 'Resume'}
                                  </button>

                                  <button
                                    onClick={() => handleDeleteSchedule(sched.id)}
                                    className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg hover:bg-red-950/40 hover:border-red-800 transition"
                                    title="Delete Campaign"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 border-t border-zinc-850/50 pt-3 mt-1 text-[11px] text-zinc-500 font-light">
                                <div>
                                  Target Leads: <span className="font-bold text-zinc-300">{sched.targetCount}</span>
                                </div>
                                <div className="text-right">
                                  Next Run: <span className="font-mono text-zinc-400 font-semibold">{sched.nextRunAt ? new Date(sched.nextRunAt).toLocaleDateString() : 'Pending'}</span>
                                </div>
                              </div>

                              {sched.lastRunAt && (
                                <p className="text-[10px] text-zinc-650 italic mt-0 text-right">
                                  Last Executed: {new Date(sched.lastRunAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Columns (2/5) - Create Campaign Schedule preset */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl p-6 backdrop-blur-sm text-left">
                    <h3 className="text-base font-bold text-zinc-200 flex items-center gap-2 mb-6">
                      <CalendarPlus className="w-5 h-5 text-pink-400" /> Create Scheduled Scan
                    </h3>

                    <form onSubmit={handleCreateSchedule} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">Business Vertical / Niche</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                          <input
                            required
                            type="text"
                            placeholder="e.g. Dentists"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-zinc-200 placeholder-zinc-700 text-xs"
                            value={scheduleVertical}
                            onChange={(e) => setScheduleVertical(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-zinc-400 uppercase">Geographic Range</label>
                        <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg w-fit border border-zinc-850">
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${scheduleLocationType === 'city_state' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => setScheduleLocationType('city_state')}
                          >
                            City/State
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${scheduleLocationType === 'zip' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => setScheduleLocationType('zip')}
                          >
                            ZIP Code
                          </button>
                        </div>

                        {scheduleLocationType === 'city_state' ? (
                          <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                            <div>
                              <input
                                required={scheduleLocationType === 'city_state'}
                                type="text"
                                placeholder="City (e.g. Miami)"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-200 placeholder-zinc-700 text-xs"
                                value={scheduleCity}
                                onChange={(e) => setScheduleCity(e.target.value)}
                              />
                            </div>
                            <div>
                              <input
                                required={scheduleLocationType === 'city_state'}
                                type="text"
                                placeholder="State (e.g. FL)"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-200 placeholder-zinc-700 text-xs"
                                value={scheduleState}
                                onChange={(e) => setScheduleState(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="animate-fadeIn">
                            <input
                              required={scheduleLocationType === 'zip'}
                              type="text"
                              placeholder="ZIP Code (e.g. 33101)"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-200 placeholder-zinc-700 text-xs"
                              value={scheduleZipCode}
                              onChange={(e) => setScheduleZipCode(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Radius (Miles)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-300 text-xs"
                            value={scheduleRadius}
                            onChange={(e) => setScheduleRadius(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase">Target Leads</label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-300 text-xs"
                            value={scheduleTargetCount}
                            onChange={(e) => setScheduleTargetCount(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase">Recurrence Interval</label>
                        <select
                          value={scheduleInterval}
                          onChange={(e) => setScheduleInterval(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 focus:outline-none focus:border-pink-500 transition text-zinc-350 text-xs"
                        >
                          <option value="daily">🔄 Daily Scan</option>
                          <option value="weekly">📅 Weekly Scan</option>
                          <option value="monthly">📆 Monthly Scan</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isCreatingSchedule}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-pink-650/10 disabled:opacity-40"
                      >
                        {isCreatingSchedule ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            Scheduling Campaign...
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="w-3.5 h-3.5" />
                            Schedule Campaign
                          </>
                        )}
                      </button>
                    </form>
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
