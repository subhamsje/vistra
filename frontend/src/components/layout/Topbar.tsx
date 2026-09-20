import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Command, 
  Globe2, 
  Bell, 
  CheckCircle2, 
  ChevronDown 
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const Topbar: React.FC = () => {
  const { 
    jurisdictions, 
    activeJurisdiction, 
    setActiveJurisdiction, 
    user, 
    pipelineStatus,
    setIsCommandPaletteOpen 
  } = useCadastre();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-14 px-4 bg-[#0d1321]/90 backdrop-blur-xl border-b border-white/8 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Jurisdiction Selector */}
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 transition shadow-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{activeJurisdiction?.name || 'Loading Jurisdiction...'}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-64 bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl p-1.5 z-50 text-xs">
            <div className="text-[10px] text-slate-400 px-2 py-1 uppercase tracking-wider font-semibold">Switch Cadastral Jurisdiction</div>
            {jurisdictions.map(j => (
              <button
                key={j.id}
                onClick={() => {
                  setActiveJurisdiction(j);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between ${
                  j.id === activeJurisdiction?.id ? 'bg-blue-600/30 text-blue-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{j.name}</span>
                <span className="text-[10px] text-slate-500">{j.crs.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Property Search Bar */}
      <div className="flex-1 max-w-xl mx-6 min-w-0">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full h-8 bg-slate-900/80 hover:bg-slate-900 border border-white/10 rounded-lg px-3 flex items-center justify-between text-xs text-slate-400 group transition shadow-inner"
        >
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition shrink-0" />
            <span className="text-slate-400 truncate whitespace-nowrap">Search by ULPIN, parcel ID, building, or location...</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-slate-400 shrink-0 ml-2">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls: Processing Status, CRS, Notifications, Profile */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Processing Status Badge */}
        <div className="flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-[11px]">Processing {pipelineStatus?.status || 'Complete'}</span>
        </div>

        {/* CRS Badge */}
        <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 shadow-sm">
          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] font-medium">{activeJurisdiction?.crs || 'EPSG:4326 WGS 84'}</span>
        </div>

        {/* Notifications Bell */}
        <button className="relative p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
          <Bell className="w-4 h-4" />
          {user && user.notifications_count > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-lg">
              {user.notifications_count}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/20 flex items-center justify-center font-bold text-xs text-white shadow">
            {user?.initials || 'AR'}
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <div className="font-semibold text-slate-200 text-xs">{user?.name || 'Ananya Rao'}</div>
            <div className="text-[10px] text-slate-400">{user?.role || 'Reviewer'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
