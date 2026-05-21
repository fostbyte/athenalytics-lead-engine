'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Building, Briefcase, Plus, Target, ArrowRight } from 'lucide-react';

export default function Home() {
  const [vertical, setVertical] = useState('');
  const [locationType, setLocationType] = useState<'city_state' | 'zip'>('city_state');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState('10');
  const [targetCount, setTargetCount] = useState('50');
  
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const workspaceId = 'default-workspace'; // Hardcoded for MVP Phase 1

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const res = await fetch(`/api/search-jobs?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.success) {
        setRecentSearches(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch recent searches:', err);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        
        // Trigger the background worker for MVP 
        // In prod this would be queue-driven from the backend
        fetch('/api/discovery-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: data.searchJob.id })
        }).then(() => {
          // Fetch again when discovery finishes
          fetchRecentSearches();
          // Trigger enrichment in the background
          return fetch('/api/enrichment-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchJobId: data.searchJob.id })
          });
        }).then(() => {
          // Fetch again when enrichment finishes
          fetchRecentSearches();
        }).catch(console.error);

        fetchRecentSearches();
        // Reset form partially
        setCity('');
        setState('');
        setZipCode('');
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 md:p-24 bg-gradient-to-b from-[#09090b] to-[#121214]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Athenalytics Lead Engine
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Discover, enrich, and score high-intent leads across geographies using intelligent evidence-backed signals.
          </p>
        </header>

        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Search className="text-blue-400" /> New Search Job
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
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      value={targetCount}
                      onChange={(e) => setTargetCount(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting Job...' : 'Start Discovery'} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              Recent Jobs
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {recentSearches.length === 0 ? (
                <p className="text-zinc-500 text-sm">No recent jobs found.</p>
              ) : (
                recentSearches.map((job) => (
                  <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-zinc-200">{job.vertical}</p>
                        <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {job.locationType === 'city_state' ? `${job.city}, ${job.state}` : job.zipCode} 
                          ({job.radiusMiles}mi)
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        job.status === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-zinc-800/50 pt-3 mt-3">
                      <span className="text-zinc-500">Target: {job.targetCount}</span>
                      <span className="text-zinc-400 font-medium">Found: {job.totalFound || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
