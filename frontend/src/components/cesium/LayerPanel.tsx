import React from 'react';
import { 
  Layers, 
  Mountain, 
  Satellite, 
  MapPin, 
  Building2, 
  Layers3, 
  ArrowDownToLine, 
  Navigation, 
  Zap, 
  Radio, 
  Grid3X3,
  ChevronDown,
  X
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const LayerPanel: React.FC = () => {
  const { 
    isLayersPanelOpen, 
    setIsLayersPanelOpen, 
    layers, 
    toggleLayer, 
    buildingTransparency, 
    setBuildingTransparency 
  } = useCadastre();

  if (!isLayersPanelOpen) return null;

  return (
    <div className="absolute top-16 left-4 w-64 bg-[#0d1321]/92 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-4 z-20 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Layers</span>
        </div>
        <button 
          onClick={() => setIsLayersPanelOpen(false)}
          className="text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Checkboxes */}
      <div className="py-3 space-y-2 text-xs">
        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.terrain}
              onChange={() => toggleLayer('terrain')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Mountain className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Terrain</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.satelliteImagery}
              onChange={() => toggleLayer('satelliteImagery')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Satellite className="w-3.5 h-3.5 text-cyan-400/80" />
            <span>Satellite Imagery</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.parcelBoundaries}
              onChange={() => toggleLayer('parcelBoundaries')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <MapPin className="w-3.5 h-3.5 text-emerald-400/80" />
            <span>Parcel Boundaries</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.buildings3d}
              onChange={() => toggleLayer('buildings3d')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Building2 className="w-3.5 h-3.5 text-blue-400/80" />
            <span>Buildings (3D)</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.floorsUnits}
              onChange={() => toggleLayer('floorsUnits')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Layers3 className="w-3.5 h-3.5 text-indigo-400/80" />
            <span>Floors & Units</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.underground}
              onChange={() => toggleLayer('underground')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <ArrowDownToLine className="w-3.5 h-3.5 text-purple-400/80" />
            <span>Underground</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.roads}
              onChange={() => toggleLayer('roads')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Navigation className="w-3.5 h-3.5 text-yellow-400/80" />
            <span>Roads</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.utilities}
              onChange={() => toggleLayer('utilities')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Zap className="w-3.5 h-3.5 text-rose-400/80" />
            <span>Utilities</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.lidarPointCloud}
              onChange={() => toggleLayer('lidarPointCloud')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Radio className="w-3.5 h-3.5 text-orange-400/80" />
            <span>LiDAR Point Cloud</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white text-slate-300">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.demDsm}
              onChange={() => toggleLayer('demDsm')}
              className="rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <Grid3X3 className="w-3.5 h-3.5 text-teal-400/80" />
            <span>DEM/DSM</span>
          </div>
        </label>
      </div>

      {/* Building Transparency Slider */}
      <div className="pt-3 border-t border-white/10 space-y-1.5">
        <div className="flex justify-between items-center text-[11px] text-slate-300">
          <span className="font-medium">Building Transparency</span>
          <span className="font-mono text-cyan-400">{buildingTransparency}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="90"
          value={buildingTransparency}
          onChange={(e) => setBuildingTransparency(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
};
