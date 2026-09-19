import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Activity 
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const BottomPipelineDock: React.FC = () => {
  const { pipelineStatus, setActiveView } = useCadastre();

  if (!pipelineStatus) return null;

  return (
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

      {/* Horizontal Stepper Stages */}
      <div className="flex-1 flex items-center justify-between px-6 overflow-x-auto custom-scrollbar">
        {pipelineStatus.stages.map((stage, idx) => {
          const isWarning = stage.status === 'warning';
          const isCompleted = stage.status === 'completed';

          return (
            <div key={stage.id} className="flex items-center space-x-2 shrink-0">
              {/* Step Circle & Connector */}
              <div className="flex items-center space-x-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isWarning 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                    : isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isWarning ? '!' : '✓'}
                </div>

                <div className="text-left">
                  <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                    {stage.id}. {stage.name}
                  </div>
                  <div className={`text-[10px] font-mono ${isWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                    {stage.metric}
                  </div>
                </div>
              </div>

              {/* Line divider between steps */}
              {idx < pipelineStatus.stages.length - 1 && (
                <div className="w-8 h-px bg-white/10 mx-2"></div>
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
  );
};
