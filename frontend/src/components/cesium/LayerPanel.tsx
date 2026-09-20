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
    <div className="absolute top-16 left-4 w-64 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-xl p-4 z-20 select-none animate-in fade-in duration-200 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Layer Control</span>
        </div>
        <button 
          onClick={() => setIsLayersPanelOpen(false)}
          className="text-slate-400 hover:text-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Checkboxes */}
      <div className="py-3 space-y-2 text-xs">
        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.terrain}
              onChange={() => toggleLayer('terrain')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Mountain className="w-3.5 h-3.5 text-amber-600" />
            <span>Terrain</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.satelliteImagery}
              onChange={() => toggleLayer('satelliteImagery')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Satellite className="w-3.5 h-3.5 text-blue-600" />
            <span>Satellite Imagery</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.parcelBoundaries}
              onChange={() => toggleLayer('parcelBoundaries')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Parcel Boundaries</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.buildings3d}
              onChange={() => toggleLayer('buildings3d')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Buildings (3D)</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.floorsUnits}
              onChange={() => toggleLayer('floorsUnits')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Layers3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Floors & Units</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.underground}
              onChange={() => toggleLayer('underground')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <ArrowDownToLine className="w-3.5 h-3.5 text-purple-600" />
            <span>Underground</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.roads}
              onChange={() => toggleLayer('roads')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Navigation className="w-3.5 h-3.5 text-amber-600" />
            <span>Roads</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.utilities}
              onChange={() => toggleLayer('utilities')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Zap className="w-3.5 h-3.5 text-rose-600" />
            <span>Utilities</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.lidarPointCloud}
              onChange={() => toggleLayer('lidarPointCloud')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Radio className="w-3.5 h-3.5 text-orange-600" />
            <span>LiDAR Point Cloud</span>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-slate-900 text-slate-600">
          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              checked={layers.demDsm}
              onChange={() => toggleLayer('demDsm')}
              className="rounded border-slate-300 text-blue-600 focus:ring-0"
            />
            <Grid3X3 className="w-3.5 h-3.5 text-teal-600" />
            <span>DEM/DSM</span>
          </div>
        </label>
      </div>

      {/* Building Transparency Slider */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <div className="flex justify-between items-center text-[11px] text-slate-600">
          <span className="font-medium">Building Transparency</span>
          <span className="font-mono text-blue-600 font-semibold">{buildingTransparency}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="90"
          value={buildingTransparency}
          onChange={(e) => setBuildingTransparency(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>
  );
};
