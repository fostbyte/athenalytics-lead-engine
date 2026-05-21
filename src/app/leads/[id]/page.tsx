'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, MapPin, CheckCircle2, XCircle, Mail, Phone, CalendarCheck, ShoppingCart, Star, Share2 } from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/leads/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch lead details');
        return res.json();
      })
      .then((data) => {
        setLead(data.lead);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load lead. Please try again.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-medium">Loading Lead Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full">
          <p className="text-red-500 font-semibold mb-4">{error || 'Lead not found.'}</p>
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-500 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { signals } = lead;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
          </Link>
          <div className="flex space-x-3">
             <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800 uppercase tracking-wide">
               {lead.status}
             </span>
             {lead.scoreBand && (
               <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-semibold rounded-full border border-green-200 dark:border-green-800 uppercase tracking-wide">
                 Score: {lead.score} - {lead.scoreBand}
               </span>
             )}
          </div>
        </div>

        {/* Lead Identity Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{lead.businessName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {lead.category && (
                  <span className="flex items-center">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 mr-2"></span>
                    {lead.category}
                  </span>
                )}
                {lead.city && lead.state && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {lead.city}, {lead.state} {lead.zipCode}
                  </span>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                    <Globe className="h-4 w-4 mr-1" />
                    {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition-colors">
                Draft Email
              </button>
            </div>
          </div>
        </div>

        {/* Enrichment Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
             <h2 className="text-lg font-semibold mb-6 flex items-center">
               <Star className="h-5 w-5 mr-2 text-yellow-500" />
               Digital Maturity Signals
             </h2>
             
             {signals ? (
               <ul className="space-y-4">
                 <SignalItem icon={<Globe className="h-4 w-4" />} label="Website Present" status={signals.hasWebsite} />
                 <SignalItem icon={<CalendarCheck className="h-4 w-4" />} label="Online Booking" status={signals.hasBooking} />
                 <SignalItem icon={<ShoppingCart className="h-4 w-4" />} label="Online Ordering" status={signals.hasOrdering} />
                 <SignalItem icon={<Phone className="h-4 w-4" />} label="Mobile Friendly" status={signals.mobileFriendly} />
                 <SignalItem icon={<Share2 className="h-4 w-4" />} label="Social Presence" status={signals.socialPresence} />
                 
                 <li className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                   <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reviews</span>
                   <span className="text-sm font-bold bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{signals.reviewCount || 0}</span>
                 </li>
               </ul>
             ) : (
               <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                 <p className="text-sm">Enrichment data is pending.</p>
               </div>
             )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
             <h2 className="text-lg font-semibold mb-6">Evidence Snippets</h2>
             
             {signals?.evidenceSnippets ? (
               <div className="space-y-4 flex-1">
                 {Object.entries(signals.evidenceSnippets).map(([key, text]) => (
                   <div key={key} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                     <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                       {key.replace(/([A-Z])/g, ' $1').trim()}
                     </span>
                     <p className="text-sm text-gray-800 dark:text-gray-200">{text as string}</p>
                   </div>
                 ))}
                 {Object.keys(signals.evidenceSnippets).length === 0 && (
                   <p className="text-sm text-gray-500">No snippets extracted.</p>
                 )}
               </div>
             ) : (
               <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                 <p className="text-sm">No evidence collected yet.</p>
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
    indicator = <CheckCircle2 className="h-5 w-5 text-green-500" />;
  } else if (status === false) {
    indicator = <XCircle className="h-5 w-5 text-gray-300 dark:text-gray-600" />;
  } else {
    indicator = <span className="text-xs text-gray-400">Unknown</span>;
  }

  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
        <span className="text-gray-400 dark:text-gray-500 mr-3">{icon}</span>
        {label}
      </span>
      {indicator}
    </li>
  );
}
