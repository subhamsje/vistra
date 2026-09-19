import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Activity,
  X,
  Database,
  Layers,
  Cpu,
  ShieldCheck,
  Hash,
  Sparkles
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const BottomPipelineDock: React.FC = () => {
  const { pipelineStatus, setActiveView } = useCadastre();
  const [selectedStageModal, setSelectedStageModal] = useState<any | null>(null);

  if (!pipelineStatus) return null;

  const stageDescriptions: Record<number, { purpose: string; algorithm: string; output: string }> = {
    1: {
      purpose: "Multi-modal spatial ingestion across LiDAR LAS, 2D Cadastral GeoJSON, Architectural CAD, and GNSS CORS.",
      algorithm: "Streaming chunked buffer ingestion with format validation.",
      output: "Raw normalized geometry in memory & SQLite spatial index."
    },
    2: {
      purpose: "Orthogonal georeferencing & CRS reprojection to WGS84 EPSG:4326 and UTM 43N/44N.",
      algorithm: "PyProj EPSG transformation with geoid height compensation (EGM96).",
      output: "Coordinated survey-grade feature collection."
    },
    3: {
      purpose: "Building extraction, parcel boundary containment, and exterior footprint isolation.",
      algorithm: "Point-in-polygon ray casting and parcel spatial indexing.",
      output: "3D building bounding hulls with base & roof elevations."
    },
    4: {
      purpose: "Storey segmentation and vertical floor plane slicing from point clouds and floor plans.",
      algorithm: "Z-axis kernel density estimation (KDE) and CAD storey height slicing.",
      output: "Discretized floor levels (Basement to Roof) with elevation boundaries."
    },
    5: {
      purpose: "3D vertical parcel & private ownership unit volume generation.",
      algorithm: "Minkowski prism extrusion and 3D boundary representation (B-Rep).",
      output: "Hermetic, watertight 3D property solids."
    },
    6: {
      purpose: "Cadastral topology audit (containment, non-overlap, manifold surface, subterranean buffer).",
      algorithm: "3D spatial intersection, Euler characteristic, and LADM ISO 19152 rules.",
      output: "Deterministic 7/7 validation pass ledger."
    },
    7: {
      purpose: "14-digit India Bhuvan 3D ULPIN generation & SHA-256 state tree cryptographic sealing.",
      algorithm: "Deterministic spatial hash encoding and SHA-256 audit ledger entry.",
      output: "Unique immutable vertical property identifiers."
    }
  };

  return (
    <>
      <div className="h-16 bg-[#0d1321]/95 backdrop-blur-2xl border-t border-white/10 px-6 flex items-center justify-between z-20 shrink-0 select-none shadow-2xl">
        {/* Left Pipeline Header */}
        <div className="flex items-center space-x-3 pr-6 border-r border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">Processing Pipeline</div>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>{pipelineStatus.status}</span>
              </span>
              <span>•</span>
              <span>{pipelineStatus.completed_at}</span>
            </div>
          </div>
        </div>

        {/* Horizontal Stepper Stages (Clickable for drill-down) */}
        <div className="flex-1 flex items-center justify-between px-6 overflow-x-auto custom-scrollbar">
          {pipelineStatus.stages.map((stage, idx) => {
            const isWarning = stage.status === 'warning';
            const isCompleted = stage.status === 'completed';

            return (
              <div key={stage.id} className="flex items-center space-x-2 shrink-0">
                {/* Step Circle & Button */}
                <button
                  onClick={() => setSelectedStageModal(stage)}
                  className="flex items-center space-x-2 text-left group p-1.5 rounded-lg hover:bg-slate-800/60 transition"
                  title={`Click to inspect Stage ${stage.id}: ${stage.name}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform group-hover:scale-110 ${
                    isWarning 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                      : isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isWarning ? '!' : '✓'}
                  </div>

                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-slate-200 group-hover:text-blue-400 transition leading-tight">
                      {stage.id}. {stage.name}
                    </div>
                    <div className={`text-[10px] font-mono ${isWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {stage.metric}
                    </div>
                  </div>
                </button>

                {/* Line divider between steps */}
                {idx < pipelineStatus.stages.length - 1 && (
                  <div className="w-6 h-px bg-white/10 mx-1"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Sparkline & Link */}
        <div className="flex items-center space-x-4 pl-6 border-l border-white/10 shrink-0">
          {/* Micro Sparkline Bars */}
          <div className="flex items-end space-x-1 h-6">
            {pipelineStatus.throughput_sparkline.map((val, i) => {
              const max = Math.max(...pipelineStatus.throughput_sparkline);
              const heightPct = Math.max(20, Math.round((val / max) * 100));
              return (
                <div
                  key={i}
                  className="w-1.5 bg-emerald-400/80 rounded-t hover:bg-emerald-300 transition"
                  style={{ height: `${heightPct}%` }}
                  title={`Stage ${i+1} throughput: ${val}`}
                ></div>
              );
            })}
          </div>

          {/* View Analysis CTA */}
          <button
            onClick={() => setActiveView('analysis')}
            className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
          >
            <span>View Analysis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Stage Inspection Modal */}
      {selectedStageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {selectedStageModal.id}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Pipeline Stage {selectedStageModal.id}: {selectedStageModal.name}</h3>
                  <div className="text-[10px] text-emerald-400 font-mono">Status: {selectedStageModal.status.toUpperCase()} • {selectedStageModal.metric}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStageModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mission Objective</div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {stageDescriptions[selectedStageModal.id]?.purpose || "Deterministic automated execution module."}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Algorithmic Engine</div>
                <p className="text-cyan-300 font-mono text-[11px]">
                  {stageDescriptions[selectedStageModal.id]?.algorithm}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Certified Artifact</div>
                <p className="text-emerald-400 font-mono text-[11px]">
                  {stageDescriptions[selectedStageModal.id]?.output}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
              {selectedStageModal.id === 6 && (
                <button
                  onClick={() => {
                    setSelectedStageModal(null);
                    setActiveView('validation');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Inspect Validation Engine
                </button>
              )}
              {selectedStageModal.id === 7 && (
                <button
                  onClick={() => {
                    setSelectedStageModal(null);
                    setActiveView('ulpin_registry');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Open ULPIN Registry
                </button>
              )}
              <button
                onClick={() => setSelectedStageModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
