import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  Globe2,
  Layers,
  RotateCw,
  FileSpreadsheet
} from 'lucide-react';
import { cadastreApi } from '../../services/api';
import { DataSourceItem } from '../../types/cadastre';
import { useCadastre } from '../../store/CadastreContext';

export const DataSourcesView: React.FC = () => {
  const { refreshData } = useCadastre();
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [pipelineRunResult, setPipelineRunResult] = useState<any | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    const srcs = await cadastreApi.getDataSources();
    setSources(srcs);
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleRunPipeline = async () => {
    setIsRunningPipeline(true);
    setPipelineRunResult(null);
    try {
      const res = await cadastreApi.triggerPipelineRun();
      setPipelineRunResult(res);
      await refreshData();
      await fetchSources();
    } catch (err: any) {
      alert("Pipeline execution error: " + (err.message || err));
    } finally {
      setIsRunningPipeline(false);
    }
  };

  return (
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Sources & Evidence Modalities</h1>
          <p className="text-slate-500 text-xs mt-0.5">Real-time repository of verified multi-modal survey inputs</p>
        </div>
        
        <button
          onClick={handleRunPipeline}
          disabled={isRunningPipeline}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRunningPipeline ? 'animate-spin' : ''}`} />
          <span>{isRunningPipeline ? 'Processing Multi-Modal Pipeline...' : 'Run Pipeline Over Sources'}</span>
        </button>
      </div>

      {/* Pipeline Result Toast */}
      {pipelineRunResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="font-bold text-sm">Pipeline Execution Successful ({pipelineRunResult.execution_time_sec}s)</div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Processed: {pipelineRunResult.metrics?.parcels} parcels, {pipelineRunResult.metrics?.buildings} buildings, {pipelineRunResult.metrics?.units} units. Status: {pipelineRunResult.metrics?.validation_status}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setPipelineRunResult(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400">Loading registered datasets...</div>
        ) : sources.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">No active datasets registered.</div>
        ) : (
          sources.map((src, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      {src.type.includes('GeoJSON') ? <Globe2 className="w-4 h-4" /> : src.type.includes('LiDAR') ? <Layers className="w-4 h-4" /> : src.type.includes('CSV') ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={src.name}>
                        {src.name}
                      </h3>
                      <div className="text-[10px] text-slate-500">{src.source_category}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    {src.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Format Type:</span>
                    <span className="font-semibold text-slate-700">{src.type}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">File Size:</span>
                    <span className="font-mono text-slate-700">{src.size_formatted}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Coordinate System:</span>
                    <span className="font-mono text-slate-700">{src.crs}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Feature Count:</span>
                    <span className="font-semibold text-blue-600">{src.feature_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{src.uploaded_at}</span>
                </span>
                <span className="font-medium text-emerald-600">Verified by Engine</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
