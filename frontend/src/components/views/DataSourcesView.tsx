import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  HardDrive,
  Globe2
} from 'lucide-react';
import { cadastreApi } from '../../services/api';
import { DataSourceItem } from '../../types/cadastre';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      const res = await cadastreApi.getDataSources();
      setSources(res);
      setLoading(false);
    };
    fetchSources();
  }, []);

  return (
    <div className="flex-1 h-full bg-[#0b0f19] p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Data Sources & Ingestion Manager</h1>
          <p className="text-slate-400 text-xs mt-1">Multi-modal geospatial inputs: GIS parcels, LiDAR LAS point clouds, drone orthophotos, and architectural floorplans</p>
        </div>

        <button 
          onClick={() => alert("Multi-modal ingestion pipeline ready. Drag and drop new GeoJSON or LAS files to trigger pipeline run.")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center space-x-2 transition shadow shadow-blue-600/30"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Dataset</span>
        </button>
      </div>

      {/* Sources Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Dataset Filename</th>
              <th className="py-3 px-4">Format / Type</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">CRS</th>
              <th className="py-3 px-4">Feature Count</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Uploaded At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">Loading datasets...</td>
              </tr>
            ) : (
              sources.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-mono font-medium text-white flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{s.type}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{s.size_formatted}</td>
                  <td className="py-3 px-4 font-mono text-cyan-300">{s.crs}</td>
                  <td className="py-3 px-4 font-mono text-white">{s.feature_count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-400">{s.source_category}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">{s.uploaded_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
