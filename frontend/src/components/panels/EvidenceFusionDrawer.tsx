import React, { useEffect, useState } from 'react';
import { 
  X, 
  Database, 
  Satellite, 
  Layers, 
  Navigation, 
  Grid3X3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const EvidenceFusionDrawer: React.FC = () => {
  const { 
    isEvidenceDrawerOpen, 
    setIsEvidenceDrawerOpen, 
    selectedEntity,
    evidenceSources,
    setEvidenceSources,
    setActiveView
  } = useCadastre();

  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isEvidenceDrawerOpen && selectedEntity?.evidence_breakdown) {
      setEvidenceSources(selectedEntity.evidence_breakdown.map(e => ({
        name: e.source_name,
        type: e.category,
        size_formatted: '',
        crs: 'EPSG:4326',
        status: e.status,
        feature_count: 0,
        uploaded_at: e.timestamp,
        source_category: e.category
      })));
    }
  }, [isEvidenceDrawerOpen, selectedEntity, setEvidenceSources]);

  const toggleSourceExpand = (sourceName: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceName)) {
        next.delete(sourceName);
      } else {
        next.add(sourceName);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'USED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'OPTIONAL':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'UNAVAILABLE':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'USED': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'OPTIONAL': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'UNAVAILABLE': return 'text-rose-700 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getSourceIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('lidar') || cat.includes('point cloud')) return <Layers className="w-4 h-4 text-amber-600" />;
    if (cat.includes('gis') || cat.includes('parcel') || cat.includes('cadastral')) return <Database className="w-4 h-4 text-emerald-600" />;
    if (cat.includes('satellite') || cat.includes('imagery') || cat.includes('ortho') || cat.includes('drone')) return <Satellite className="w-4 h-4 text-blue-600" />;
    if (cat.includes('gnss') || cat.includes('cors') || cat.includes('gps') || cat.includes('survey')) return <Navigation className="w-4 h-4 text-indigo-600" />;
    if (cat.includes('dem') || cat.includes('dsm') || cat.includes('elevation') || cat.includes('terrain')) return <Grid3X3 className="w-4 h-4 text-teal-600" />;
    if (cat.includes('cad') || cat.includes('bim') || cat.includes('floor plan') || cat.includes('architectural')) return <Layers className="w-4 h-4 text-purple-600" />;
    return <Database className="w-4 h-4 text-slate-500" />;
  };

  if (!isEvidenceDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" 
        onClick={() => setIsEvidenceDrawerOpen(false)}
        pointer-events="auto"
      />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white/95 backdrop-blur-2xl border-l border-slate-200 shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">VISTRA Evidence Fusion</div>
              <div className="text-[10px] text-slate-500">Multi-source geometric provenance</div>
            </div>
          </div>
          <button
            onClick={() => setIsEvidenceDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entity Context */}
        {selectedEntity && (
          <div className="px-5 py-3 border-b border-slate-200/80 bg-slate-50">
            <div className="flex items-center space-x-2 text-[11px] text-slate-700">
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-medium text-slate-600">
                {selectedEntity.entity_type}
              </span>
              <span className="font-mono text-blue-600 font-semibold truncate flex-1">{selectedEntity.ulpin_3d}</span>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {evidenceSources.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Database className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No evidence sources loaded</p>
              <p className="text-[11px] mt-1 text-slate-400">Select a property to view contributing datasets</p>
            </div>
          ) : (
            evidenceSources.map((source) => {
              const isExpanded = expandedSources.has(source.name);
              const entityEvidence = selectedEntity?.evidence_breakdown?.find(e => e.source_name === source.name);
              
              return (
                <div 
                  key={source.name}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs transition duration-200 hover:border-slate-300"
                >
                  <button
                    onClick={() => toggleSourceExpand(source.name)}
                    className="w-full p-3.5 flex items-center justify-between space-x-3 text-left hover:bg-slate-50/50"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-xs truncate">{source.name}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{source.type}</span>
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${getStatusColor(source.status)}`}>
                            {source.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(source.status)}
                      <span className="text-[10px] text-slate-400">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-2 pt-3 text-[10px]">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="text-slate-400 font-medium">Dataset ID</div>
                          <div className="font-mono text-slate-700 font-semibold truncate mt-0.5">{source.name}</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="text-slate-400 font-medium">CRS</div>
                          <div className="font-mono text-slate-700 font-semibold mt-0.5">{source.crs}</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="text-slate-400 font-medium">Timestamp</div>
                          <div className="font-mono text-slate-700 font-semibold mt-0.5">{source.uploaded_at}</div>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="text-slate-400 font-medium">Features</div>
                          <div className="font-mono text-slate-700 font-semibold mt-0.5">{source.feature_count.toLocaleString()}</div>
                        </div>
                      </div>

                      {entityEvidence && (
                        <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                          <div className="flex items-center space-x-1.5 text-[10px] text-blue-700 font-semibold mb-1">
                            <Info className="w-3.5 h-3.5" />
                            <span>Contribution to this entity</span>
                          </div>
                          <div className="text-[11px] text-slate-700 leading-relaxed">{entityEvidence.contribution}</div>
                          <div className="flex items-center space-x-2 mt-2 text-[10px]">
                            <span className="text-slate-500">Confidence:</span>
                            <span className="font-semibold text-blue-700">{entityEvidence.confidence}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Summary */}
          <div className="pt-4 border-t border-slate-200/80">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                <div className="text-2xl font-bold text-emerald-600">
                  {evidenceSources.filter(s => s.status === 'USED').length}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Used</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                <div className="text-2xl font-bold text-amber-600">
                  {evidenceSources.filter(s => s.status === 'OPTIONAL').length}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Optional</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs">
                <div className="text-2xl font-bold text-rose-600">
                  {evidenceSources.filter(s => s.status === 'UNAVAILABLE').length}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Unavailable</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 bg-white flex items-center space-x-2.5">
          <button
            onClick={() => {
              setIsEvidenceDrawerOpen(false);
              setActiveView('data_sources');
            }}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-200 transition"
          >
            <Database className="w-3.5 h-3.5 text-slate-600" />
            <span>All Data Sources</span>
          </button>
          <button
            onClick={() => {
              setIsEvidenceDrawerOpen(false);
              setActiveView('validation');
            }}
            className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Validation Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};