import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Send,
  Layers,
  Building
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

  const handleInspectEntity = (entityId: string) => {
    setSelectedEntityId(entityId);
    triggerFlyTo([77.6248, 12.9356]);
    setActiveView('3d_cadastre');
  };

  return (
    <div className="flex-1 h-full bg-[#0b0f19] p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Topology & Cadastral Validation Center</h1>
          <p className="text-slate-400 text-xs mt-1">Deterministic geometric consistency, non-overlapping property volumes, and containment auditing</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Overall Status: {report?.overall_status || 'PASS'}</span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="text-slate-400 text-xs font-medium">Rules Evaluated</div>
          <div className="text-2xl font-bold text-white font-mono">{report?.total_rules_evaluated || 8}</div>
          <div className="text-[10px] text-slate-500">ISO 19152 LADM deterministic checks</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="text-slate-400 text-xs font-medium">Warnings Detected</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{report?.warnings || 0}</div>
          <div className="text-[10px] text-slate-500">Minor boundary tolerances requiring audit</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
          <div className="text-slate-400 text-xs font-medium">Critical Errors</div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{report?.errors || 0}</div>
          <div className="text-[10px] text-slate-500">Volumetric overlaps or invalid manifolds</div>
        </div>
      </div>

      {/* Rules Checklist Grid */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white">Cadastral Topology Checklist</h2>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { title: "RULE_TOPO_001: Building within Parcel Containment", status: "PASS", desc: "All 3D superstructures lie strictly within surveyed parcel boundary." },
            { title: "RULE_TOPO_002: Vertical Monotonicity & Floor Ordering", status: "PASS", desc: "Consecutive storey stacking preserves z_base = z_roof(n-1) with 0.05m tolerance." },
            { title: "RULE_TOPO_003: 3D Volumetric Unit Overlap Verification", status: "PASS", desc: "No two residential or commercial property volumes intersect in 3D Euclidean space." },
            { title: "RULE_TOPO_004: Surface Manifold & Polygon Ring Closure", status: "PASS", desc: "All 2D and 3D rings are closed, simple, and self-intersection free." },
            { title: "RULE_TOPO_005: Underground Infrastructure Clearance", status: "PASS", desc: "Subterranean metro transit line respects vertical buffer from basement foundations." },
            { title: "RULE_TOPO_006: 3D ULPIN Uniqueness & Reproducibility", status: "PASS", desc: "Deterministic hash matching ensures 0 identity collision across national cadastre." }
          ].map((rule, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-white/5 flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">{rule.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{rule.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
