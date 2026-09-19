import React from 'react';
import { 
  MousePointer2, 
  Ruler, 
  SplitSquareVertical, 
  Boxes, 
  GitCompare, 
  Layers as LayersIcon, 
  Globe, 
  Map, 
  RotateCcw,
  Compass
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { ToolMode } from '../../types/cadastre';

export const MapToolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    isLayersPanelOpen, 
    setIsLayersPanelOpen,
    activeJurisdiction,
    triggerFlyTo,
    explodeFactor,
    setExplodeFactor
  } = useCadastre();

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
    if (activeJurisdiction) {
      triggerFlyTo(activeJurisdiction.center);
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
      {/* Floating Toolbar Pill */}
      <div className="flex items-center space-x-1.5 p-1 bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-auto">
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
            explodeFactor > 0 ? 'bg-cyan-600 text-white shadow-cyan-600/30' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{explodeFactor > 0 ? `Explode (${explodeFactor.toFixed(1)}m)` : 'Explode'}</span>
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

        <button
          onClick={() => handleToolClick('layers')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            isLayersPanelOpen ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        <button
          onClick={() => handleToolClick('dim')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>3D / 2D</span>
        </button>

        <button
          onClick={() => handleToolClick('basemap')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTool === 'basemap' ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Basemap</span>
        </button>

        <button
          onClick={handleResetView}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
          title="Reset camera to district extent"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset View</span>
        </button>
      </div>

      {/* Compass Indicator */}
      <div className="w-9 h-9 rounded-full bg-[#0d1321]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-300 shadow-2xl pointer-events-auto hover:text-cyan-400 transition cursor-pointer">
        <Compass className="w-5 h-5 text-cyan-400" />
      </div>
    </div>
  );
};
