import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Command, 
  Globe2, 
  Bell, 
  ChevronDown 
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const Topbar: React.FC = () => {
  const { 
    jurisdictions, 
    activeJurisdiction, 
    setActiveJurisdiction, 
    user, 
    reviewQueueCount,
    pipelineStatus,
    setIsCommandPaletteOpen 
  } = useCadastre();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-14 px-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between z-30 shrink-0 select-none text-slate-800 shadow-xs">
      {/* Jurisdiction Selector */}
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-xs text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition shadow-xs"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold">{activeJurisdiction?.name || 'Loading Jurisdiction...'}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
            <div className="text-[10px] text-slate-400 px-2 py-1 uppercase tracking-wider font-semibold">Switch Cadastral Jurisdiction</div>
            {jurisdictions.map(j => (
              <button
                key={j.id}
                onClick={() => {
                  setActiveJurisdiction(j);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                  j.id === activeJurisdiction?.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{j.name}</span>
                <span className="text-[10px] text-slate-400">{j.crs.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Property Search Bar */}
      <div className="flex-1 max-w-xl mx-6 min-w-0">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full h-8 bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-lg px-3 flex items-center justify-between text-xs text-slate-500 group transition"
        >
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
            <span className="text-slate-500 truncate whitespace-nowrap">Search by ULPIN, parcel ID, building, or unit...</span>
          </div>
          <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-400 shrink-0 ml-2 shadow-xs">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls: Processing Status, CRS, Notifications, Profile */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Processing Status Badge */}
        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/80 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-[11px]">Processing {pipelineStatus?.status || 'Active'}</span>
        </div>

        {/* CRS Badge */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80 text-slate-600 shadow-xs">
          <Globe2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-mono text-[11px] font-medium">{activeJurisdiction?.crs || 'EPSG:4326 WGS 84'}</span>
        </div>

        {/* Notifications Bell (Live review queue count) */}
        <button className="relative p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition">
          <Bell className="w-4 h-4" />
          {reviewQueueCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-xs">
              {reviewQueueCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.initials || 'AR'}
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="font-semibold text-slate-900 text-xs">{user?.name || 'Surveyor'}</div>
            <div className="text-[10px] text-slate-500">{user?.role || 'Reviewer'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
