import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Layers, 
  Building2, 
  Box, 
  Map as MapIcon, 
  ArrowDownToLine,
  Activity
} from 'lucide-react';
import { cadastreApi } from '../../services/api';

export const AnalysisView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [sRes, pRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()).catch(() => ({ parcels: 2, buildings: 2, floors: 13, units: 31, underground: 2 })),
        cadastreApi.getPipelineStatus()
      ]);
      setStats(sRes);
      setPipeline(pRes);
    };
    fetchData();
  }, []);

  return (
    <div className="flex-1 h-full bg-[#0b0f19] p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">3D Cadastre Analytics & Spatial Intelligence</h1>
        <p className="text-slate-400 text-xs mt-1">Multi-dimensional volumetric metrics, floor height distributions, and processing pipeline throughput</p>
      </div>

      {/* 5 Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <MapIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Parcels</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.parcels || 2}</div>
          <div className="text-[10px] text-emerald-400 font-medium">100% Georeferenced</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buildings (3D)</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.buildings || 3}</div>
          <div className="text-[10px] text-cyan-400 font-medium">LoD 1.2 Extrusions</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Storeys / Slabs</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.floors || 18}</div>
          <div className="text-[10px] text-indigo-400 font-medium">LiDAR Segmented</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            <span>Volumetric Units</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.units || 40}</div>
          <div className="text-[10px] text-emerald-400 font-medium">3D ULPINs Assigned</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <ArrowDownToLine className="w-3.5 h-3.5 text-purple-400" />
            <span>Underground Assets</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats?.underground || 2}</div>
          <div className="text-[10px] text-purple-400 font-medium">Metro & Water Utilities</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline Throughput Stage Performance */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Pipeline Stage Processing Throughput</h2>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-mono">Real-time</span>
          </div>

          <div className="space-y-3">
            {pipeline?.stages?.map((stage: any) => (
              <div key={stage.id} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">{stage.id}. {stage.name}</span>
                  <span className="text-slate-400 font-mono">{stage.metric}</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Tenure & Rights Distribution */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white">Tenure & RRR Cadastral Breakdown</h2>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Freehold Residential Units</span>
                <span className="text-emerald-400 font-bold">78%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[78%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Commercial Long-term Lease</span>
                <span className="text-blue-400 font-bold">16%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-[16%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Municipal & Common Areas</span>
                <span className="text-purple-400 font-bold">6%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[6%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
