import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Send
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';

export const ValidationView: React.FC = () => {
  const { setSelectedEntityId, setActiveView, triggerFlyTo } = useCadastre();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const res = await cadastreApi.getValidationReport();
      setReport(res);
      setLoading(false);
    };
    fetchReport();
  }, []);

  const handleInspectEntity = (entityId: string, coords?: [number, number]) => {
    setSelectedEntityId(entityId);
    triggerFlyTo(coords || [77.6250, 12.9355]);
    setActiveView('3d_cadastre');
  };

  const rules = report?.rules_catalog || [];

  return (
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Topology & Cadastral Validation Center</h1>
          <p className="text-slate-500 text-xs mt-0.5">Deterministic geometric consistency, non-overlapping property volumes, and containment auditing</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Overall Status: {report?.overall_status || 'PASS'}</span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-medium">Rules Evaluated</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{report?.total_rules_evaluated || rules.length}</div>
          <div className="text-[10px] text-slate-400">ISO 19152 LADM deterministic checks</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-medium">Warnings Detected</div>
          <div className="text-2xl font-bold text-amber-600 font-mono">{report?.warnings || 0}</div>
          <div className="text-[10px] text-slate-400">Boundary tolerances requiring review</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-medium">Volumetric Collisions</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{report?.errors || 0}</div>
          <div className="text-[10px] text-slate-400">Overlapping property solids</div>
        </div>
      </div>

      {/* Evaluated Rules Catalog */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-slate-900 text-sm">Automated Deterministic Rules Ledger</h2>
        <div className="divide-y divide-slate-100">
          {rules.map((rule: any) => (
            <div key={rule.id} className="py-3.5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[10px] text-slate-400">{rule.id}</span>
                  <span className="font-semibold text-slate-900 text-xs">{rule.name}</span>
                </div>
                <div className="text-[11px] text-slate-500">{rule.desc || `Verified category: ${rule.category}`}</div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {rule.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged Issues */}
      {report?.issues && report.issues.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Flagged Items Requiring Attention</h2>
          <div className="space-y-2">
            {report.issues.map((iss: any) => (
              <div key={iss.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{iss.title}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{iss.description}</div>
                </div>
                <button
                  onClick={() => handleInspectEntity(iss.entity_id, iss.coordinates)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-semibold text-xs hover:bg-slate-50 transition shadow-xs flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inspect in 3D</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
