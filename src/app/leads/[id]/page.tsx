'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  CalendarCheck, 
  ShoppingCart, 
  Star, 
  Share2, 
  RotateCw, 
  Sparkles, 
  TrendingUp, 
  Phone 
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchLeadData();
  }, [id]);

  const fetchLeadData = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error('Failed to fetch lead details');
      const data = await res.json();
      setLead(data.lead);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to load lead. Please try again.');
      setLoading(false);
    }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const res = await fetch(`/api/leads/${id}/rescore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchLeadData();
      }
    } catch (err) {
      console.error('Failed to rescore lead:', err);
    } finally {
      setRescoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 animate-pulse">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold">Loading Lead Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-500/10">
          <p className="text-red-500 font-semibold mb-4">{error || 'Lead not found.'}</p>
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-500 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { signals } = lead;

  // Band styles
  let bandColor = 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800';
  let scoreBadgeColor = 'bg-zinc-100 dark:bg-zinc-800/45 text-zinc-500';

  if (lead.scoreBand === 'high') {
    bandColor = 'bg-green-100 dark:bg-emerald-500/10 text-green-800 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20';
    scoreBadgeColor = 'bg-green-50 dark:bg-emerald-500/5 text-green-600 dark:text-emerald-400 border-green-200 dark:border-emerald-500/20';
  } else if (lead.scoreBand === 'medium') {
    bandColor = 'bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    scoreBadgeColor = 'bg-blue-55 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
  } else if (lead.scoreBand === 'review') {
    bandColor = 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
    scoreBadgeColor = 'bg-yellow-55 dark:bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20';
  } else if (lead.scoreBand === 'exclude') {
    bandColor = 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border-red-200 dark:border-red-500/20';
    scoreBadgeColor = 'bg-red-55 dark:bg-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 p-8 md:p-16">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors text-sm font-medium">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-855 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
               {lead.status}
             </span>
             {lead.scoreBand && (
               <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${bandColor}`}>
                 Score: {Math.round(lead.score)} - {lead.scoreBand}
               </span>
             )}
          </div>
        </div>

        {/* Lead Identity Card */}
        <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-zinc-800/80 backdrop-blur-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-100 mb-2">{lead.businessName}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-650 dark:text-zinc-450 font-light">
                {lead.category && (
                  <span className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 mr-2 shrink-0"></span>
                    {lead.category}
                  </span>
                )}
                {lead.city && lead.state && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    {lead.city}, {lead.state} {lead.zipCode} {lead.distanceMiles ? `(${lead.distanceMiles.toFixed(1)} miles)` : ''}
                  </span>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                    <Globe className="h-4 w-4 mr-1.5 shrink-0" />
                    {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            
            <div className="mt-2 md:mt-0 flex gap-3 w-full md:w-auto justify-end">
              <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-md transition w-full md:w-auto">
                Draft Email
              </button>
            </div>
          </div>
        </div>

        {/* Sprint 4: AI Scoring Prioritization Panel */}
        <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-zinc-800/80 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-zinc-800/60 pb-6 mb-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-yellow-500 mt-1 shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-150">AI Lead Scoring Engine Analysis</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-450 font-light mt-0.5">
                  Calculated by LangGraph framework leveraging real-time public signals and OpenRouter models.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              {lead.score !== null ? (
                <div className={`text-2xl font-black px-4 py-2 rounded-2xl border flex items-center gap-1.5 shadow-sm ${scoreBadgeColor}`}>
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                  {Math.round(lead.score)} <span className="text-xs text-gray-400 font-normal">/ 100</span>
                </div>
              ) : (
                <span className="text-xs text-gray-550 italic bg-gray-100 px-3 py-1 rounded-md">Unscored</span>
              )}
              
              <button 
                onClick={handleRescore}
                disabled={rescoring}
                className="bg-gray-105 hover:bg-gray-150 dark:bg-zinc-950 dark:hover:bg-zinc-850 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RotateCw className={`w-3.5 h-3.5 ${rescoring ? 'animate-spin text-emerald-400' : ''}`} />
                {rescoring ? 'Recalculating...' : 'Rescore Lead'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
              Explainable Prioritization Reasons
            </h3>
            {lead.reasons && lead.reasons.length > 0 ? (
              <ul className="grid md:grid-cols-2 gap-4">
                {lead.reasons.map((reason: string, idx: number) => (
                  <li 
                    key={idx} 
                    className="p-4 bg-gray-50 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-900 rounded-xl text-sm text-gray-700 dark:text-zinc-300 font-light flex gap-3 items-start"
                  >
                    <span className="text-emerald-500 font-extrabold text-xs select-none">✔</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No scoring insights calculated for this lead profile. Click "Rescore Lead" to compute metrics.
              </p>
            )}
          </div>
        </div>

        {/* Enrichment Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Digital Maturity Signals Card */}
          <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-zinc-800/80">
             <h2 className="text-lg font-bold mb-6 flex items-center text-gray-900 dark:text-zinc-205">
               <Star className="h-5 w-5 mr-2 text-yellow-500 shrink-0" />
               Digital Maturity Signals
             </h2>
             
             {signals ? (
               <ul className="space-y-4">
                 <SignalItem icon={<Globe className="h-4 w-4" />} label="Website Present" status={signals.hasWebsite} />
                 <SignalItem icon={<CalendarCheck className="h-4 w-4" />} label="Online Booking" status={signals.hasBooking} />
                 <SignalItem icon={<ShoppingCart className="h-4 w-4" />} label="Online Ordering" status={signals.hasOrdering} />
                 <SignalItem icon={<Phone className="h-4 w-4" />} label="Mobile Friendly" status={signals.mobileFriendly} />
                 <SignalItem icon={<Share2 className="h-4 w-4" />} label="Social Presence" status={signals.socialPresence} />
                 
                 <li className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800/60 mt-4">
                   <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Reviews</span>
                   <span className="text-sm font-extrabold bg-gray-105 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 px-3 py-1 rounded-full">
                     {signals.reviewCount || 0}
                   </span>
                 </li>
               </ul>
             ) : (
               <div className="text-center py-8 text-gray-500 dark:text-zinc-500">
                 <p className="text-sm italic">Enrichment data is pending.</p>
               </div>
             )}
          </div>

          {/* Evidence Snippets Card */}
          <div className="bg-white dark:bg-zinc-900/40 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-zinc-800/80 flex flex-col">
             <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-zinc-205">Evidence Snippets</h2>
             
             {signals?.evidenceSnippets ? (
               <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                 {Object.entries(signals.evidenceSnippets).map(([key, text]) => {
                   if (!text) return null;
                   return (
                     <div key={key} className="bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-100 dark:border-zinc-900">
                       <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1.5 block">
                         {key.replace(/([A-Z])/g, ' $1').trim()}
                       </span>
                       <p className="text-sm text-gray-800 dark:text-zinc-200 font-light">{text as string}</p>
                     </div>
                   );
                 })}
                 {Object.keys(signals.evidenceSnippets).length === 0 && (
                   <p className="text-sm text-gray-500 italic">No snippets extracted.</p>
                 )}
               </div>
             ) : (
               <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-zinc-500 py-8">
                 <p className="text-sm italic">No evidence collected yet.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}

function SignalItem({ icon, label, status }: { icon: React.ReactNode, label: string, status: boolean | null | undefined }) {
  let indicator;
  if (status === true) {
    indicator = <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
  } else if (status === false) {
    indicator = <XCircle className="h-5 w-5 text-gray-300 dark:text-zinc-600 shrink-0" />;
  } else {
    indicator = <span className="text-xs text-gray-400 dark:text-zinc-600 shrink-0 italic">Unknown</span>;
  }

  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center text-sm font-medium text-gray-700 dark:text-zinc-300">
        <span className="text-gray-400 dark:text-zinc-550 mr-3 shrink-0">{icon}</span>
        {label}
      </span>
      {indicator}
    </li>
  );
}
