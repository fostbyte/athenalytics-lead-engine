'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Sparkles, Building, Globe, Phone, Mail, ArrowRight } from 'lucide-react';

interface LeadsMapProps {
  leads: any[];
  onDraftEmail: (lead: any, tone: 'friendly' | 'direct' | 'professional') => void;
  draftingLoading: Record<string, boolean>;
}

export default function LeadsMap({ leads, onDraftEmail, draftingLoading }: LeadsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScoreBand, setSelectedScoreBand] = useState<string>('');
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  // 1. Dynamically load Leaflet CDN assets (avoid SSR next build issues)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.id = 'leaflet-css';
    document.head.appendChild(link);

    // JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.id = 'leaflet-js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Clean up stylesheets/scripts on unmount if appropriate
    };
  }, []);

  // Filter leads with coordinates
  const mapLeads = leads.filter(l => l.lat && l.lng && l.status !== 'rejected');

  const filteredLeads = mapLeads.filter(lead => {
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.category && lead.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.city && lead.city.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBand = selectedScoreBand ? lead.scoreBand === selectedScoreBand : true;
    return matchesSearch && matchesBand;
  });

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Center map around leads or default US coordinates
    let center: [number, number] = [37.0902, -95.7129]; // US Center
    let zoom = 4;

    if (mapLeads.length > 0) {
      const avgLat = mapLeads.reduce((sum, l) => sum + l.lat, 0) / mapLeads.length;
      const avgLng = mapLeads.reduce((sum, l) => sum + l.lng, 0) / mapLeads.length;
      center = [avgLat, avgLng];
      zoom = 12;
    }

    // Initialize Map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, zoom);

      // Add elegant zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      // If map exists, pan to center if leads changed
      if (mapLeads.length > 0) {
        mapRef.current.setView(center, zoom);
      }
    }

    // Clean up markers on unmount or re-render
    return () => {
      // We keep the map instance but will clear markers in the next useEffect
    };
  }, [leafletLoaded, mapLeads.length]);

  // 3. Render Custom Markers for Filtered Leads
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = {};

    // Render new markers
    filteredLeads.forEach(lead => {
      // Determine marker color based on score band
      let colorClass = 'bg-zinc-500 border-zinc-400'; // fallback
      let pulseClass = '';
      if (lead.scoreBand === 'high') {
        colorClass = 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.6)]';
        pulseClass = 'animate-ping opacity-75 bg-emerald-400';
      } else if (lead.scoreBand === 'medium') {
        colorClass = 'bg-indigo-500 border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]';
      } else if (lead.scoreBand === 'review') {
        colorClass = 'bg-amber-500 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
      } else if (lead.scoreBand === 'exclude') {
        colorClass = 'bg-red-500 border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
      }

      const scoreText = lead.score ? Math.round(lead.score) : '?';

      // Create a gorgeous custom HTML marker
      const customIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 text-white font-black text-[10px] select-none ${colorClass}">
            ${pulseClass ? `<span class="absolute inline-flex h-full w-full rounded-full ${pulseClass}"></span>` : ''}
            <span class="relative z-10">${scoreText}</span>
          </div>
        `,
        className: 'custom-leaflet-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      // Plot marker
      const marker = L.marker([lead.lat, lead.lng], { icon: customIcon }).addTo(mapRef.current);

      // Bind dynamic premium Glassmorphic Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 bg-zinc-950/90 text-zinc-100 rounded-xl border border-zinc-800 backdrop-blur-md shadow-2xl min-w-[240px] max-w-[280px] leading-relaxed';
      
      const bandLabels: Record<string, string> = {
        high: '🟢 High Match',
        medium: '🔵 Medium Match',
        review: '🟡 Review required',
        exclude: '🔴 Excluded'
      };

      popupContent.innerHTML = `
        <div class="space-y-3">
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-0.5">${lead.category || 'Lead'}</div>
            <h3 class="font-extrabold text-sm text-zinc-100 pr-4 truncate">${lead.businessName}</h3>
          </div>
          <div class="flex items-center justify-between text-xs py-1 border-y border-zinc-800/80">
            <span class="text-zinc-400">Score:</span>
            <span class="font-bold text-white">${lead.score ? Math.round(lead.score) : 'Unscored'} (${bandLabels[lead.scoreBand || ''] || 'Review'})</span>
          </div>
          <div class="space-y-1.5 text-xs text-zinc-400">
            ${lead.address ? `
              <div class="flex items-start gap-1.5">
                <span class="text-zinc-500 mt-0.5">📍</span>
                <span class="truncate">${lead.address}</span>
              </div>
            ` : ''}
            ${lead.phoneNumber ? `
              <div class="flex items-center gap-1.5">
                <span class="text-zinc-500">📞</span>
                <span>${lead.phoneNumber}</span>
              </div>
            ` : ''}
          </div>
          <div class="pt-2 flex gap-1.5">
            <button id="popup-draft-btn-${lead.id}" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition shadow-lg shadow-indigo-900/30">
              ⚡ Draft Outreach
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      // Attach event listener inside popup open
      marker.on('popupopen', () => {
        setActiveLeadId(lead.id);
        const draftBtn = document.getElementById(`popup-draft-btn-${lead.id}`);
        if (draftBtn) {
          draftBtn.onclick = () => {
            onDraftEmail(lead, 'friendly');
          };
        }
      });

      marker.on('popupclose', () => {
        setActiveLeadId(null);
      });

      markersRef.current[lead.id] = marker;
    });
  }, [leafletLoaded, filteredLeads, draftingLoading]);

  // 4. Center and Open lead popup on Sidebar Click
  const handleLeadSelect = (lead: any) => {
    if (!leafletLoaded || !mapRef.current) return;
    
    setActiveLeadId(lead.id);
    mapRef.current.setView([lead.lat, lead.lng], 15);
    
    const marker = markersRef.current[lead.id];
    if (marker) {
      marker.openPopup();
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Dynamic injection of dark style filter for Leaflet */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container {
          background: #09090b !important;
        }
        /* Elegantly styled dark-mode tile filter */
        .dark-mode-map .leaflet-tile-container {
          filter: invert(90%) hue-rotate(180deg) brightness(85%) contrast(100%);
        }
        /* Custom Popup styling override */
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: rgba(9, 9, 11, 0.9) !important;
          border: 1px solid rgba(39, 39, 42, 0.8) !important;
        }
      `}} />

      <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        {/* Left Side: Sidebar Lead Directory */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-4 h-full shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-200 mb-1 flex items-center gap-2">
              <MapPin className="text-indigo-400 w-5 h-5" /> Local Lead Directory
            </h3>
            <p className="text-zinc-500 text-xs font-light">
              Geolocated target prospects discovered in active search runs.
            </p>
          </div>

          {/* Directory Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search local map leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-2 pl-9 pr-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-200"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedScoreBand('')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  selectedScoreBand === ''
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedScoreBand('high')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  selectedScoreBand === 'high'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300'
                }`}
              >
                🟢 High
              </button>
              <button
                onClick={() => setSelectedScoreBand('medium')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  selectedScoreBand === 'medium'
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300'
                }`}
              >
                🔵 Medium
              </button>
              <button
                onClick={() => setSelectedScoreBand('review')}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  selectedScoreBand === 'review'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-900 hover:text-zinc-300'
                }`}
              >
                🟡 Review
              </button>
            </div>
          </div>

          {/* Leads List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800/80 rounded-2xl">
                <Building className="w-8 h-8 text-zinc-700 mb-2" />
                <span className="text-zinc-400 text-xs font-bold">No geolocated leads found</span>
                <span className="text-zinc-600 text-[10px] mt-1 max-w-[180px]">
                  Try adjusting search filter criteria or run a new search vertical job.
                </span>
              </div>
            ) : (
              filteredLeads.map(lead => {
                const isActive = activeLeadId === lead.id;
                let borderClass = 'border-zinc-850 hover:border-zinc-800 bg-zinc-950/20';
                if (isActive) {
                  borderClass = 'border-indigo-600/80 bg-indigo-950/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]';
                }

                let bandColor = 'bg-zinc-900 text-zinc-500';
                if (lead.scoreBand === 'high') bandColor = 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60';
                else if (lead.scoreBand === 'medium') bandColor = 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/60';
                else if (lead.scoreBand === 'review') bandColor = 'bg-amber-950/60 text-amber-400 border border-amber-900/60';
                else if (lead.scoreBand === 'exclude') bandColor = 'bg-red-950/60 text-red-400 border border-red-900/60';

                return (
                  <div
                    key={lead.id}
                    onClick={() => handleLeadSelect(lead)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all duration-250 flex items-start justify-between gap-3 select-none ${borderClass}`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-xs text-zinc-200 truncate">{lead.businessName}</h4>
                        {lead.score && (
                          <span className="text-[10px] font-bold text-zinc-500">
                            ({Math.round(lead.score)})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                        <span>{lead.category || 'Prospect'}</span>
                        {lead.city && <span>• {lead.city}, {lead.state || 'FL'}</span>}
                      </div>
                    </div>

                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${bandColor}`}>
                      {lead.scoreBand}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Map Container */}
        <div className="flex-1 rounded-2xl border border-zinc-850 overflow-hidden relative bg-zinc-950 h-full">
          {!leafletLoaded ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin"></div>
              <span className="text-zinc-500 text-xs font-semibold">Loading map components...</span>
            </div>
          ) : (
            <div 
              ref={mapContainerRef} 
              className="w-full h-full dark-mode-map" 
              style={{ minHeight: '100%', minWidth: '100%' }}
            />
          )}

          {/* Quick HUD Overlay */}
          <div className="absolute top-4 left-4 z-[999] bg-zinc-950/80 backdrop-blur-md border border-zinc-850 px-3 py-1.5 rounded-xl shadow-xl pointer-events-none select-none flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              {filteredLeads.length} Interactive Coordinates Map Plot
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
