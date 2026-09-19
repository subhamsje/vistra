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

  const options: BasemapOption[] = [
    {
      id: 'satellite',
      label: 'Satellite',
      thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'streets',
      label: 'Streets',
      thumbnail: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'terrain',
      label: 'Terrain',
      thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'lidar',
      label: 'LiDAR',
      thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'night',
      label: 'Night',
      thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=120&q=80'
    },
    {
      id: 'master_plan',
      label: 'Master Plan',
      thumbnail: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=120&q=80'
    }
  ];

  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-20">
      {/* Basemap Switcher Floating Strip */}
      <div className="flex items-center space-x-2 p-1.5 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto select-none">
        {options.map((opt) => {
          const isActive = basemap === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setBasemap(opt.id)}
              className={`group relative w-16 h-12 rounded-lg overflow-hidden border transition-all ${
                isActive ? 'border-blue-500 shadow-md shadow-blue-500/40 ring-1 ring-blue-500' : 'border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={opt.thumbnail}
                alt={opt.label}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-center pb-1">
                <span className={`text-[9px] font-semibold tracking-wider uppercase ${
                  isActive ? 'text-blue-300' : 'text-slate-200'
                }`}>
                  {opt.label}
                </span>
              </div>
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
