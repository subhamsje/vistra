import React, { useState } from 'react';
import { 
  MousePointer2, 
  Ruler, 
  SplitSquareVertical, 
  Boxes, 
  GitCompare, 
  Layers as LayersIcon, 
  RotateCcw,
  Compass,
  Eye,
  Camera,
  ChevronDown
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { ToolMode, CameraViewMode } from '../../types/cadastre';

export const MapToolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    isLayersPanelOpen, 
    setIsLayersPanelOpen,
    activeJurisdiction,
    triggerFlyTo,
    explodeFactor,
    setExplodeFactor,
    viewMode,
    setViewMode,
    cameraMode,
    setCameraMode
  } = useCadastre();

  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);

  const handleToolClick = (tool: ToolMode) => {
    if (tool === 'layers') {
      setIsLayersPanelOpen(!isLayersPanelOpen);
      return;
    }
    if (tool === 'explode') {
      // Toggle explosion between 0 and 2.5m
      setExplodeFactor(explodeFactor > 0 ? 0 : 2.5);
    }
    setActiveTool(tool);
  };

  const handleResetView = () => {
    setCameraMode('PARCEL');
    if (activeJurisdiction) {
      triggerFlyTo(activeJurisdiction.center);
    }
  };

  const cameraModes: { id: CameraViewMode; label: string }[] = [
    { id: 'CITY', label: 'City Extent' },
    { id: 'PARCEL', label: 'Parcel Extent' },
    { id: 'BUILDING', label: 'Building Focus' },
    { id: 'FLOOR', label: 'Storey Level' },
    { id: 'UNIT', label: 'Unit Detail' },
    { id: 'TOP_DOWN', label: 'Top-Down 2D' },
    { id: 'ORBIT', label: 'Side Isometric Orbit' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
      {/* Primary Floating Toolbar Pill */}
      <div className="flex items-center space-x-1.5 p-1 bg-[#0d1321]/92 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto">
        <button
          onClick={() => handleToolClick('select')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
            activeTool === 'select' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <button
          onClick={() => handleToolClick('measure')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'measure' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Measure</span>
        </button>

        <button
          onClick={() => handleToolClick('section')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'section' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span>Section</span>
        </button>

        <button
          onClick={() => handleToolClick('explode')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            explodeFactor > 0 ? 'bg-cyan-600 text-white shadow-cyan-600/30 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{explodeFactor > 0 ? `Exploded (${explodeFactor.toFixed(1)}m)` : 'Explode'}</span>
        </button>

        <button
          onClick={() => handleToolClick('compare')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'compare' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>

        <div className="h-4 w-px bg-white/10 mx-1"></div>

        {/* Layers Drawer Toggle */}
        <button
          onClick={() => handleToolClick('layers')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            isLayersPanelOpen ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        {/* Camera Preset Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span>Camera ({cameraModes.find(m => m.id === cameraMode)?.label.split(' ')[0] || 'View'})</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isCameraMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-44 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 text-xs">
              <div className="text-[9px] text-slate-400 px-2 py-1 uppercase tracking-wider font-semibold">Camera Presets</div>
              {cameraModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCameraMode(m.id);
                    setIsCameraMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                    cameraMode === m.id ? 'bg-blue-600/30 text-blue-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset Camera View */}
        <button
          onClick={handleResetView}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          title="Reset camera to district extent"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Controls: Reality vs Analysis Toggle & Compass */}
      <div className="flex items-center space-x-2 pointer-events-auto">
        {/* Reality vs Analysis View Mode Switcher */}
        <div className="flex items-center p-1 bg-[#0d1321]/92 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl text-xs font-semibold">
          <button
            onClick={() => setViewMode('REALITY')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              viewMode === 'REALITY'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reality View</span>
          </button>
          <button
            onClick={() => setViewMode('ANALYSIS')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              viewMode === 'ANALYSIS'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Analysis View</span>
          </button>
        </div>

        {/* Compass Indicator */}
        <div 
          onClick={handleResetView}
          className="w-10 h-10 rounded-xl bg-[#0d1321]/92 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-300 shadow-2xl hover:text-cyan-400 transition cursor-pointer"
          title="North-Up Orientation"
        >
          <Compass className="w-5 h-5 text-cyan-400" />
        </div>
      </div>
    </div>
  );
};
