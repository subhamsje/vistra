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
  Info
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const PropertyDetailsPanel: React.FC = () => {
  const { selectedEntity, triggerFlyTo, setActiveView } = useCadastre();
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
    // Fly camera to the entity
    triggerFlyTo([77.6248, 12.9356]);
  };

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
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 px-3 text-xs font-medium text-slate-400 bg-slate-950/30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2.5 border-b-2 transition ${
            activeTab === 'overview' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('building')}
          className={`px-3 py-2.5 border-b-2 transition ${
            activeTab === 'building' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Building
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`px-3 py-2.5 border-b-2 transition ${
            activeTab === 'floors' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Floors & Units
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-3 py-2.5 border-b-2 transition ${
            activeTab === 'validation' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Validation
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3 py-2.5 border-b-2 transition ${
            activeTab === 'sources' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Sources
        </button>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
        {/* Entity Card Header with Image & ULPIN */}
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

        {/* 4-Item Primary Identifiers Grid */}
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

        {/* Confidence Bars */}
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
              onClick={() => setActiveView('validation')}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-medium"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Data Sources contributing */}
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

        {/* Version and Timestamps */}
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
