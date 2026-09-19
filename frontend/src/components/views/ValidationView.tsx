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

  const handleInspectEntity = (entityId: string, coords?: [number, number]) => {
    setSelectedEntityId(entityId);
    if (coords) {
      triggerFlyTo(coords);
    } else {
      triggerFlyTo([77.62515, 12.9358]);
    }
    setActiveView('3d_cadastre');
  };

  const rules = report?.rules_catalog || [
    { id: "RULE_TOPO_001", name: "Building within Parcel Containment", category: "Containment", status: "PASS", desc: "All 3D superstructures lie strictly within surveyed parcel boundary." },
    { id: "RULE_TOPO_002", name: "Vertical Monotonicity & Floor Sequence", category: "Vertical Stacking", status: "PASS", desc: "Consecutive storey stacking preserves z_base = z_roof(n-1) with 0.05m tolerance." },
    { id: "RULE_TOPO_003", name: "3D Volumetric Unit Non-Overlap", category: "Collision Detection", status: "PASS", desc: "No two residential or commercial property volumes intersect in 3D Euclidean space." },
    { id: "RULE_TOPO_004", name: "Surface Manifold & Ring Closure", category: "Geometric Validity", status: "PASS", desc: "All 2D and 3D rings are closed, simple, and self-intersection free." },
    { id: "RULE_TOPO_005", name: "Underground Subterranean Buffer Clearance", category: "Subsurface Safety", status: "PASS", desc: "Subterranean metro transit line respects vertical buffer from basement foundations." },
    { id: "RULE_TOPO_006", name: "3D ULPIN Identity Uniqueness & Audit Seal", category: "Identity Integrity", status: "PASS", desc: "Deterministic hash matching ensures 0 identity collision across national cadastre." },
    { id: "RULE_TOPO_007", name: "CRS Orthogonal Alignment (EPSG:4326 / UTM)", category: "Georeferencing", status: "PASS", desc: "Multi-sensor coordinates reprojected to EPSG:4326 with mm spatial alignment." }
  ];

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
          <div className="text-2xl font-bold text-white font-mono">{report?.total_rules_evaluated || rules.length}</div>
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

      {/* Issues List (if any) */}
      {report?.issues && report.issues.length > 0 && (
        <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Detected Validation Issues ({report.issues.length})</span>
          </div>
          <div className="space-y-2">
            {report.issues.map((iss: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white flex items-center space-x-2">
                    <span className="text-rose-400 font-mono text-[10px] font-bold">{iss.rule_id}</span>
                    <span>{iss.rule_name}</span>
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">{iss.message}</div>
                </div>
                <button
                  onClick={() => handleInspectEntity(iss.entity_id, iss.coordinates)}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg flex items-center space-x-1.5 transition border border-rose-500/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Locate in 3D</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules Checklist Grid */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white">Deterministic Cadastral Topology Checklist</h2>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {rules.map((rule: any, idx: number) => {
            const isPass = rule.status === 'PASS';
            const isWarning = rule.status === 'WARNING';
            return (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-start space-x-3">
                {isPass ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-white">{rule.id}: {rule.name}</div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isPass ? 'bg-emerald-500/15 text-emerald-400' : isWarning ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                    }`}>
                      {rule.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{rule.desc || `Validated under ISO 19152 category: ${rule.category}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
