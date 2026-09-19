import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  CheckCircle2, 
  Send, 
  ExternalLink, 
  Layers, 
  Radio, 
  MapPin, 
  FileText, 
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  Building,
  Info,
  Boxes,
  Lock,
  Sparkles
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const PropertyDetailsPanel: React.FC = () => {
  const { 
    selectedEntity, 
    setSelectedEntityId,
    triggerFlyTo, 
    setActiveView,
    explodeFactor,
    setExplodeFactor
  } = useCadastre();

  const [activeTab, setActiveTab] = useState<'overview' | 'building' | 'floors' | 'validation' | 'sources'>('overview');
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!selectedEntity) return null;

  const handleCopyUlpin = () => {
    navigator.clipboard.writeText(selectedEntity.ulpin_3d);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFlyTo = () => {
    triggerFlyTo([77.62515, 12.9358]);
  };

  const handleSelectFloor = (floorLevel: number, unitNum = 'U04') => {
    const unitId = `B12_F${floorLevel}_${unitNum}`;
    setSelectedEntityId(unitId);
  };

  const buildingFloors = [
    { level: 6, label: 'Roof Terrace & Solar Deck', height: '+18.0m', units: 1, type: 'ROOF' },
    { level: 5, label: 'Floor 5 (Penthouse Suite)', height: '+15.0m', units: 1, type: 'RESIDENTIAL' },
    { level: 4, label: 'Floor 4 (Executive 3BHK)', height: '+12.0m', units: 2, type: 'RESIDENTIAL' },
    { level: 3, label: 'Floor 3 (Standard 3BHK)', height: '+9.0m', units: 2, type: 'RESIDENTIAL' },
    { level: 2, label: 'Floor 2 (Standard 2BHK)', height: '+6.0m', units: 2, type: 'RESIDENTIAL' },
    { level: 1, label: 'Floor 1 (Ground / Lobby)', height: '+3.0m', units: 2, type: 'MIXED' },
    { level: -1, label: 'Basement Level 1 (Parking & Utility)', height: '-3.0m', units: 1, type: 'BASEMENT' }
  ];

  return (
    <aside className="w-96 h-full bg-[#0d1321]/94 backdrop-blur-2xl border-l border-white/10 flex flex-col z-20 shadow-2xl select-none shrink-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">Property Details</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 px-2 text-xs font-medium text-slate-400 bg-slate-950/40 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('building')}
          className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'building' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Building
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'floors' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Floors & Units
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'validation' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Validation
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'sources' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Sources
        </button>
      </div>

      {/* Scrollable Tab Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Entity Header */}
            <div className="flex space-x-3.5 items-start">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-900 shadow-md">
                <img
                  src={selectedEntity.thumbnail_url || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80"}
                  alt="Property"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{selectedEntity.validation_status}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">3D ULPIN</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="font-mono text-xs font-bold text-white tracking-tight truncate select-all">
                    {selectedEntity.ulpin_3d}
                  </span>
                  <button
                    onClick={handleCopyUlpin}
                    className="text-slate-400 hover:text-blue-400 p-0.5 rounded transition"
                    title="Copy ULPIN"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                    {selectedEntity.type_label}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 text-[10px]">
                    {selectedEntity.category}
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Item Identifiers Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Parcel ID</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.parcel_id}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Building ID</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.building_id || '-'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Floor</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.floor_level ?? '-'}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Unit</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.unit_number || '-'}</div>
              </div>
            </div>

            {/* 3-Item Dimensional Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Area</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.area_sqft.toLocaleString()} sq ft</div>
                <div className="text-[9px] text-slate-500">({selectedEntity.area_sqm} m²)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Vertical Extent</div>
                <div className="font-bold text-emerald-400 text-xs mt-0.5 font-mono">{selectedEntity.vertical_extent}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
                <div className="text-[10px] text-slate-400">Volume</div>
                <div className="font-bold text-white text-xs mt-0.5">{selectedEntity.volume_m3} m³</div>
              </div>
            </div>

            {/* Confidence Progress Bars */}
            <div className="p-3 rounded-lg bg-slate-900/70 border border-white/5 space-y-2.5">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-slate-400">Geometry Confidence</span>
                  <span className="font-bold text-emerald-400">{selectedEntity.geometry_confidence}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${selectedEntity.geometry_confidence}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-slate-400">Data Confidence</span>
                  <span className="font-bold text-blue-400">{selectedEntity.data_confidence}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${selectedEntity.data_confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* VISTRA Intelligence Insight Card (Critical Fix #11) */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-950/40 via-slate-900/70 to-slate-900/40 border border-blue-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VISTRA Intelligence</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400">ISO 19152 LADM</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                  <span className="text-slate-500">Geometry:</span> <strong className="text-emerald-400">✓ Valid Solid</strong>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                  <span className="text-slate-500">Evidence:</span> <strong className="text-cyan-400">4 Sources Fused</strong>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                  <span className="text-slate-500">Collisions:</span> <strong className="text-emerald-400">0 Overlaps</strong>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-white/5">
                  <span className="text-slate-500">Tenure:</span> <strong className="text-white">Freehold Right</strong>
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="p-3 rounded-lg bg-slate-900/70 border border-white/5 space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">Validation</div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
                {selectedEntity.validation_checklist.map((v, i) => (
                  <div key={i} className="flex items-center space-x-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{v.name}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1.5 flex justify-end">
                <button 
                  onClick={() => setActiveTab('validation')}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-medium"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Contributing Data Sources */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-300">Data Sources</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedEntity.data_sources.map((src, i) => (
                  <span key={i} className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-[10px] text-slate-300 flex items-center space-x-1">
                    <Radio className="w-2.5 h-2.5 text-blue-400" />
                    <span>{src}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-400 border-t border-white/5">
              <div>
                <div className="text-slate-500">Last Updated</div>
                <div className="text-slate-300 font-medium">{selectedEntity.last_updated}</div>
              </div>
              <div>
                <div className="text-slate-500">Version</div>
                <div className="text-slate-300 font-medium">{selectedEntity.version}</div>
              </div>
            </div>
          </div>
        )}

        {/* BUILDING TAB (Critical Fix #7 Building Explorer) */}
        {activeTab === 'building' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white">Building Storey Hierarchy</div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                G+5 Residential
              </span>
            </div>

            {/* Explode Building Control */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Vertical Storey Explosion</span>
                </span>
                <span className="font-mono text-cyan-400 font-bold">{explodeFactor.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.5"
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Stacked (0m)</span>
                <span>Exploded View (4m)</span>
              </div>
            </div>

            {/* Storey Tree */}
            <div className="space-y-1.5 border border-white/10 rounded-xl p-2 bg-slate-950/40">
              {buildingFloors.map((fl) => {
                const isSelected = selectedEntity.floor_level === fl.level;
                return (
                  <button
                    key={fl.level}
                    onClick={() => handleSelectFloor(fl.level)}
                    className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition ${
                      isSelected 
                        ? 'bg-blue-600/30 border border-blue-500/50 text-white shadow-lg' 
                        : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2 h-2 rounded-full ${
                        fl.level === 3 ? 'bg-cyan-400' : fl.level > 0 ? 'bg-blue-500' : 'bg-slate-500'
                      }`}></div>
                      <div>
                        <div className="font-semibold text-xs">{fl.label}</div>
                        <div className="text-[10px] text-slate-400">Elevation: {fl.height} • {fl.units} unit(s)</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FLOORS & UNITS TAB */}
        {activeTab === 'floors' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-white">
              Units on Floor {selectedEntity.floor_level ?? 3}
            </div>

            <div className="space-y-2">
              {[
                { u: "U01", area: "1,140 sq ft", tenure: "Freehold Residential", status: "Occupied", vol: "338 m³" },
                { u: "U02", area: "1,220 sq ft", tenure: "Freehold Residential", status: "Occupied", vol: "362 m³" },
                { u: "U03", area: "1,180 sq ft", tenure: "Freehold Residential", status: "Vacant", vol: "350 m³" },
                { u: "U04", area: "1,284 sq ft", tenure: "Freehold Residential", status: "Active Selection", vol: "381.8 m³", active: true }
              ].map((unit) => (
                <div
                  key={unit.u}
                  onClick={() => handleSelectFloor(selectedEntity.floor_level ?? 3, unit.u)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    unit.active 
                      ? 'bg-blue-600/25 border-blue-500 text-white' 
                      : 'bg-slate-900/60 border-white/5 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Unit {unit.u}</span>
                    <span className="text-[10px] font-mono text-cyan-300">{unit.area}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{unit.tenure}</span>
                    <span>Volume: {unit.vol}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VALIDATION TAB */}
        {activeTab === 'validation' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-white">Deterministic Cadastral Validation</div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All 7 volumetric topology rules passed deterministically.</span>
            </div>

            <div className="space-y-2 text-[11px]">
              {selectedEntity.validation_checklist.map((c, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-900/70 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-200">{c.name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOURCES / EVIDENCE TAB (Critical Fix #12) */}
        {activeTab === 'sources' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-white">Contributing Multi-Modal Datasets</div>
            <div className="text-slate-400 text-[11px]">
              Geometric boundary and elevation evidence sources verified for this spatial entity:
            </div>

            <div className="space-y-2">
              {[
                { name: "koramangala_lidar_flight_04.las", type: "LiDAR Point Cloud", conf: "94%", date: "12 Mar 2024" },
                { name: "bengaluru_urban_cadastral_parcels.geojson", type: "GIS Parcel Survey", conf: "98%", date: "12 Mar 2024" },
                { name: "b12_skyline_approved_cad_plan.json", type: "Architectural CAD/BIM", conf: "95%", date: "10 Mar 2024" },
                { name: "Station BLR01 - EGM96 Datum", type: "GNSS / CORS Station", conf: "99%", date: "Real-time" }
              ].map((src, i) => (
                <div key={i} className="p-3 bg-slate-900/70 border border-white/5 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[11px] truncate">{src.name}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{src.conf}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{src.type}</span>
                    <span>{src.date}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* SHA-256 Proof */}
            <div className="p-3 bg-slate-950/80 border border-white/10 rounded-lg space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-300 flex items-center space-x-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>SHA-256 Provenance Seal</span>
              </div>
              <div className="p-2 bg-black/50 rounded font-mono text-[9px] text-slate-400 break-all select-all">
                {selectedEntity.audit_hash}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="p-4 border-t border-white/10 flex items-center space-x-2 bg-slate-950/40">
        <button
          onClick={handleFlyTo}
          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/10 transition shadow"
        >
          <Send className="w-3.5 h-3.5 text-blue-400" />
          <span>Fly to</span>
        </button>

        <button
          onClick={() => setActiveView('ulpin_registry')}
          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow shadow-blue-600/30"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View in Registry</span>
        </button>

        <button 
          onClick={() => alert(`SHA-256 Provenance Seal:\n${selectedEntity.audit_hash}`)}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white border border-white/10 transition"
          title="Inspect SHA-256 Cryptographic Audit Seal"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </aside>
  );
};
