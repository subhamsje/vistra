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
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">3D Cadastre Analytics & Spatial Intelligence</h1>
        <p className="text-slate-500 text-xs mt-1">Multi-dimensional volumetric metrics, floor height distributions, and processing pipeline throughput</p>
      </div>

      {/* 5 Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <MapIcon className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Parcels</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.parcels || 2}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">100% Georeferenced</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Buildings (3D)</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.buildings || 3}</div>
          <div className="text-[10px] text-blue-600 font-semibold">LoD 1.2 Extrusions</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="font-medium">Storeys / Slabs</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.floors || 18}</div>
          <div className="text-[10px] text-indigo-600 font-semibold">LiDAR Segmented</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <Box className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">Volumetric Units</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.units || 40}</div>
          <div className="text-[10px] text-emerald-600 font-semibold">3D ULPINs Assigned</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-1.5">
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <ArrowDownToLine className="w-4 h-4 text-purple-600" />
            <span className="font-medium">Underground Assets</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{stats?.underground || 2}</div>
          <div className="text-[10px] text-purple-600 font-semibold">Metro & Water Utilities</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* Pipeline Throughput Stage Performance */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Pipeline Stage Processing Throughput</h2>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-medium">Real-time</span>
          </div>

          <div className="space-y-3.5">
            {pipeline?.stages?.map((stage: any) => (
              <div key={stage.id} className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-700 font-medium">{stage.id}. {stage.name}</span>
                  <span className="text-slate-500 font-mono">{stage.metric}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Tenure & Rights Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">Tenure & RRR Cadastral Breakdown</h2>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-slate-700 font-medium">Freehold Residential Units</span>
                <span className="text-emerald-600 font-bold">78%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[78%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-slate-700 font-medium">Commercial Long-term Lease</span>
                <span className="text-blue-600 font-bold">16%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full w-[16%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-slate-700 font-medium">Municipal & Common Areas</span>
                <span className="text-purple-600 font-bold">6%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[6%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
