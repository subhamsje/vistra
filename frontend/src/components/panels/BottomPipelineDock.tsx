import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Activity,
  Play,
  RotateCw,
  X,
  Layers
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';

export const BottomPipelineDock: React.FC = () => {
  const { 
    pipelineStatus, 
    setActiveView, 
    isPipelineDockMinimized, 
    setIsPipelineDockMinimized,
    refreshData
  } = useCadastre();

  const [selectedStageModal, setSelectedStageModal] = useState<any | null>(null);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);

  if (!pipelineStatus) return null;

  const handleRunPipeline = async () => {
    setIsRunningPipeline(true);
    try {
      await cadastreApi.triggerPipelineRun();
      await refreshData();
    } catch (e) {
      console.error('Failed running pipeline:', e);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  return (
    <>
      {isPipelineDockMinimized ? (
        <div className="h-9 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 flex items-center justify-between z-20 shrink-0 select-none shadow-sm text-slate-800">
          <div className="flex items-center space-x-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-900">Pipeline Status: {pipelineStatus.status}</span>
            <span className="text-[10px] text-slate-500">({pipelineStatus.completed_at})</span>
          </div>
          <button
            onClick={() => setIsPipelineDockMinimized(false)}
            className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold px-2 py-0.5 rounded hover:bg-slate-100 transition"
          >
            <span>Show Pipeline Stages</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="h-16 bg-white/90 backdrop-blur-xl border-t border-slate-200/90 px-6 flex items-center justify-between z-20 shrink-0 select-none shadow-md transition-all text-slate-800">
          {/* Left Pipeline Header */}
          <div className="flex items-center space-x-3 pr-6 border-r border-slate-200 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 tracking-tight">Processing Pipeline</div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{pipelineStatus.status}</span>
                </span>
                <span>•</span>
                <span>{pipelineStatus.completed_at}</span>
              </div>
            </div>
          </div>

          {/* Horizontal Stepper Stages */}
          <div className="flex-1 flex items-center space-x-3 px-6 overflow-x-auto custom-scrollbar">
            {pipelineStatus.stages.map((stage, idx) => {
              const isCompleted = stage.status === 'completed';

              return (
                <div key={stage.id} className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setSelectedStageModal(stage)}
                    className="flex items-center space-x-2 text-left p-1.5 rounded-lg hover:bg-slate-100/80 transition group"
                    title={`Click to inspect Stage ${stage.id}: ${stage.name}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {isCompleted ? '✓' : stage.id}
                    </div>

                    <div className="text-left">
                      <div className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition leading-tight">
                        {stage.id}. {stage.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {stage.metric}
                      </div>
                    </div>
                  </button>

                  {idx < pipelineStatus.stages.length - 1 && (
                    <div className="w-4 h-px bg-slate-200"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Action Controls: Run Pipeline & Minimize */}
          <div className="flex items-center space-x-3 pl-6 border-l border-slate-200 shrink-0">
            <button
              onClick={handleRunPipeline}
              disabled={isRunningPipeline}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              title="Trigger live pipeline run across all demo datasets"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
              <span>{isRunningPipeline ? 'Running...' : 'Re-Run Pipeline'}</span>
            </button>

            <button
              onClick={() => setActiveView('analysis')}
              className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-medium transition"
            >
              <span>Analysis</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPipelineDockMinimized(true)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              title="Minimize Pipeline Dock"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stage Inspection Modal */}
      {selectedStageModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-5 space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {selectedStageModal.id}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Stage {selectedStageModal.id}: {selectedStageModal.name}</h3>
                  <div className="text-[10px] text-emerald-700 font-mono">Status: {selectedStageModal.status.toUpperCase()} • {selectedStageModal.metric}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStageModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 text-[10px] uppercase">Telemetry Metric</span>
                <p className="font-mono text-xs text-blue-700">{selectedStageModal.metric}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStageModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
