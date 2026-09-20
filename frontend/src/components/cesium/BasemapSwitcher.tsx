import React from 'react';
import { useCadastre } from '../../store/CadastreContext';
import { BasemapMode } from '../../types/cadastre';

export const BasemapSwitcher: React.FC = () => {
  const { basemap, setBasemap, activeJurisdiction, currentProject } = useCadastre();

  const options: { id: BasemapMode; label: string }[] = [
    { id: 'light', label: 'Light Canvas' },
    { id: 'streets', label: 'Streets' },
    { id: 'satellite', label: 'Satellite' },
    { id: 'terrain', label: 'Terrain' },
    { id: 'master_plan', label: 'Master Plan' }
  ];

  const centerLon = activeJurisdiction?.center?.[0] ?? currentProject?.center?.[0] ?? 77.6250;
  const centerLat = activeJurisdiction?.center?.[1] ?? currentProject?.center?.[1] ?? 12.9355;
  const elevM = activeJurisdiction?.elevation_m ?? currentProject?.elevation_m ?? 920;

  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-20">
      {/* Basemap Switcher Floating Strip */}
      <div className="flex items-center space-x-1 p-1 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-md pointer-events-auto select-none">
        {options.map((opt) => {
          const isActive = basemap === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setBasemap(opt.id)}
              className={`group relative px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                isActive 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-xs' 
                  : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Coordinate & Scale Bar Card */}
      <div className="p-2.5 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-md pointer-events-auto text-[10px] text-slate-600 font-mono flex flex-col items-end space-y-1">
        {/* Scale Bar */}
        <div className="flex items-center space-x-1.5">
          <div className="w-24 h-1 bg-slate-200 relative flex justify-between">
            <div className="w-px h-2 bg-slate-400 -top-0.5 relative"></div>
            <div className="w-px h-1.5 bg-slate-300 -top-0.5 relative"></div>
            <div className="w-px h-1.5 bg-slate-300 -top-0.5 relative"></div>
            <div className="w-px h-2 bg-slate-400 -top-0.5 relative"></div>
          </div>
          <span className="text-[9px] text-slate-500">100 m</span>
        </div>

        {/* Coordinates & Elevation */}
        <div className="text-slate-600 font-medium">
          <span>{centerLat.toFixed(4)}° N, </span>
          <span>{centerLon.toFixed(4)}° E</span>
          <span className="text-slate-400 mx-1">|</span>
          <span className="text-blue-600 font-semibold">Elev. {elevM} m</span>
        </div>
      </div>
    </div>
  );
};
