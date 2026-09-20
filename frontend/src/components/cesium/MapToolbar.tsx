import React, { useState } from 'react';
import { 
  MousePointer2, 
  Ruler, 
  SplitSquareVertical, 
  Boxes, 
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
    { id: 'TOP_DOWN', label: 'Top-Down 2D' }
  ];

  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
      {/* Primary Floating Toolbar Pill */}
      <div className="flex items-center space-x-1 p-1 bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-md pointer-events-auto">
        <button
          onClick={() => handleToolClick('select')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTool === 'select' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <button
          onClick={() => handleToolClick('measure')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'measure' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Measure</span>
        </button>

        <button
          onClick={() => handleToolClick('section')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'section' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span>Section</span>
        </button>

        <button
          onClick={() => handleToolClick('explode')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            explodeFactor > 0 ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{explodeFactor > 0 ? `Exploded (${explodeFactor.toFixed(1)}m)` : 'Explode'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1"></div>

        {/* Layers Drawer Toggle */}
        <button
          onClick={() => handleToolClick('layers')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            isLayersPanelOpen ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        {/* Camera Preset Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsCameraMenuOpen(!isCameraMenuOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Camera ({cameraModes.find(m => m.id === cameraMode)?.label.split(' ')[0] || 'View'})</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isCameraMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-40 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
              <div className="text-[9px] text-slate-400 px-2 py-1 uppercase tracking-wider font-semibold">Camera Presets</div>
              {cameraModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCameraMode(m.id);
                    setIsCameraMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                    cameraMode === m.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
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
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Reset camera to site extent"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Controls: Reality vs Analysis Toggle & Compass */}
      <div className="flex items-center space-x-2 pointer-events-auto">
        {/* Reality vs Analysis View Mode Switcher */}
        <div className="flex items-center p-1 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-md text-xs font-semibold">
          <button
            onClick={() => setViewMode('REALITY')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              viewMode === 'REALITY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reality</span>
          </button>
          <button
            onClick={() => setViewMode('ANALYSIS')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              viewMode === 'ANALYSIS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>
        </div>

        {/* Compass Indicator */}
        <button 
          onClick={handleResetView}
          className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-xl border border-slate-200 flex items-center justify-center text-slate-600 shadow-md hover:text-blue-600 hover:bg-slate-50 transition cursor-pointer"
          title="North-Up Orientation"
        >
          <Compass className="w-4 h-4 text-blue-600" />
        </button>
      </div>
    </div>
  );
};
