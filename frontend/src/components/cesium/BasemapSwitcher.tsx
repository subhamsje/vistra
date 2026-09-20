import React from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { BasemapMode } from '../../types/cadastre';

interface BasemapOption {
  id: BasemapMode;
  label: string;
  thumbnail: string;
}

export const BasemapSwitcher: React.FC = () => {
  const { basemap, setBasemap, activeJurisdiction } = useCadastre();

  const options: { id: BasemapMode; label: string; iconBg: string }[] = [
    {
      id: 'satellite',
      label: 'Satellite',
      iconBg: 'from-blue-900 via-slate-800 to-slate-950'
    },
    {
      id: 'streets',
      label: 'Streets',
      iconBg: 'from-slate-700 via-slate-800 to-slate-900'
    },
    {
      id: 'terrain',
      label: 'Terrain',
      iconBg: 'from-emerald-950 via-slate-900 to-slate-950'
    },
    {
      id: 'night',
      label: 'Dark Canvas',
      iconBg: 'from-cyan-950 via-slate-950 to-black'
    },
    {
      id: 'master_plan',
      label: 'Master Plan',
      iconBg: 'from-indigo-950 via-slate-900 to-slate-950'
    }
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-20">
      {/* Basemap Switcher Floating Strip */}
      <div className="flex items-center space-x-1.5 p-1 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto select-none">
        {options.map((opt) => {
          const isActive = basemap === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setBasemap(opt.id)}
              className={`group relative px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                isActive 
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-md shadow-blue-500/20 font-semibold' 
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Coordinate & Scale Bar Card */}
      <div className="p-2 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto text-[10px] text-slate-300 font-mono flex flex-col items-end space-y-1">
        {/* Scale Bar */}
        <div className="flex items-center space-x-1.5">
          <div className="w-24 h-1 bg-white/20 relative flex justify-between">
            <div className="w-px h-2 bg-white/50 -top-0.5 relative"></div>
            <div className="w-px h-1.5 bg-white/40 -top-0.5 relative"></div>
            <div className="w-px h-1.5 bg-white/40 -top-0.5 relative"></div>
            <div className="w-px h-2 bg-white/50 -top-0.5 relative"></div>
          </div>
          <span className="text-[9px] text-slate-400">100 m</span>
        </div>

        {/* Coordinates & Elevation */}
        <div className="text-slate-300">
          <span>{activeJurisdiction?.center[1] ? `${activeJurisdiction.center[1].toFixed(4)}° N` : '12.9356° N'}, </span>
          <span>{activeJurisdiction?.center[0] ? `${activeJurisdiction.center[0].toFixed(4)}° E` : '77.6245° E'}</span>
          <span className="text-slate-500 mx-1">|</span>
          <span className="text-cyan-400">Elev. {activeJurisdiction?.elevation_m || 920} m</span>
        </div>
      </div>
    </div>
  );
};
