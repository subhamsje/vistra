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
import { DataSourceItem, EvidenceSourceDetail } from '../../types/cadastre';

export const EvidenceFusionDrawer: React.FC = () => {
  const { 
    isEvidenceDrawerOpen, 
    setIsEvidenceDrawerOpen, 
    selectedEntity,
    evidenceSources,
    setEvidenceSources,
    activeView,
    setActiveView
  } = useCadastre();

  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

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
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'OPTIONAL':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'UNAVAILABLE':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'USED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'OPTIONAL': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'UNAVAILABLE': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getSourceIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('lidar') || cat.includes('point cloud')) return <Layers className="w-4 h-4 text-orange-400" />;
    if (cat.includes('gis') || cat.includes('parcel') || cat.includes('cadastral')) return <Database className="w-4 h-4 text-emerald-400" />;
    if (cat.includes('satellite') || cat.includes('imagery') || cat.includes('ortho') || cat.includes('drone')) return <Satellite className="w-4 h-4 text-cyan-400" />;
    if (cat.includes('gnss') || cat.includes('cors') || cat.includes('gps') || cat.includes('survey')) return <Navigation className="w-4 h-4 text-blue-400" />;
    if (cat.includes('dem') || cat.includes('dsm') || cat.includes('elevation') || cat.includes('terrain')) return <Grid3X3 className="w-4 h-4 text-teal-400" />;
    if (cat.includes('cad') || cat.includes('bim') || cat.includes('floor plan') || cat.includes('architectural')) return <Layers className="w-4 h-4 text-purple-400" />;
    return <Database className="w-4 h-4 text-slate-400" />;
  };

  if (!isEvidenceDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => setIsEvidenceDrawerOpen(false)}
        pointer-events="auto"
      />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0d1321]/98 backdrop-blur-2xl border-l border-white/10 shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">VISTRA Evidence Fusion</div>
              <div className="text-[10px] text-slate-400">Multi-source geometric provenance</div>
            </div>
          </div>
          <button
            onClick={() => setIsEvidenceDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entity Context */}
        {selectedEntity && (
          <div className="px-4 py-3 border-b border-white/10 bg-slate-950/40">
            <div className="flex items-center space-x-2 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono">
                {selectedEntity.entity_type}
              </span>
              <span className="font-mono text-cyan-400 truncate flex-1">{selectedEntity.ulpin_3d}</span>
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {evidenceSources.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No evidence sources loaded</p>
              <p className="text-[11px] mt-1">Select a property to view contributing datasets</p>
            </div>
          ) : (
            evidenceSources.map((source, index) => {
              const isExpanded = expandedSources.has(source.name);
              const entityEvidence = selectedEntity?.evidence_breakdown?.find(e => e.source_name === source.name);
              
              return (
                <div 
                  key={source.name}
                  className="bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden transition-all duration-200 hover:border-white/10"
                >
                  <button
                    onClick={() => toggleSourceExpand(source.name)}
                    className="w-full p-3 flex items-center justify-between space-x-3 text-left"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800/50 border border-white/10 flex items-center justify-center shrink-0">
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm truncate">{source.name}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10">{source.type}</span>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-medium ${getStatusColor(source.status)}`}>
                            {source.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(source.status)}
                      <span className={`text-[10px] font-mono ${isExpanded ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-white/5 bg-slate-950/50 animate-in slide-in-from-top duration-150">
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px]">
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                          <div className="text-slate-500">Dataset ID</div>
                          <div className="font-mono text-slate-300 truncate">{source.name}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                          <div className="text-slate-500">CRS</div>
                          <div className="font-mono text-slate-300">{source.crs}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                          <div className="text-slate-500">Timestamp</div>
                          <div className="font-mono text-slate-300">{source.uploaded_at}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-white/5">
                          <div className="text-slate-500">Features</div>
                          <div className="font-mono text-slate-300">{source.feature_count.toLocaleString()}</div>
                        </div>
                      </div>

                      {entityEvidence && (
                        <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                          <div className="flex items-center space-x-1.5 text-[10px] text-cyan-300 mb-1">
                            <Info className="w-3 h-3" />
                            <span className="font-medium">Contribution to this entity</span>
                          </div>
                          <div className="text-[11px] text-slate-300">{entityEvidence.contribution}</div>
                          <div className="flex items-center space-x-2 mt-1.5 text-[10px]">
                            <span className="text-slate-500">Confidence:</span>
                            <span className="font-mono text-cyan-400">{entityEvidence.confidence}%</span>
                          </div>
                        </div>
                      )}

                      {source.status === 'USED' && (
                        <div className="mt-3 flex space-x-2">
                          <button className="flex-1 px-2 py-1.5 text-[10px] font-medium text-slate-300 hover:text-white bg-slate-800 border border-white/10 rounded transition">
                            <ExternalLink className="w-3 h-3 inline mr-1" />
                            View Dataset
                          </button>
                          <button className="flex-1 px-2 py-1.5 text-[10px] font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded transition">
                            Inspect Geometry
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Summary */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                <div className="text-2xl font-bold text-emerald-400">
                  {evidenceSources.filter(s => s.status === 'USED').length}
                </div>
                <div className="text-[10px] text-slate-400">Used</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                <div className="text-2xl font-bold text-amber-400">
                  {evidenceSources.filter(s => s.status === 'OPTIONAL').length}
                </div>
                <div className="text-[10px] text-slate-400">Optional</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
                <div className="text-2xl font-bold text-rose-400">
                  {evidenceSources.filter(s => s.status === 'UNAVAILABLE').length}
                </div>
                <div className="text-[10px] text-slate-400">Unavailable</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 flex items-center space-x-2">
          <button
            onClick={() => setActiveView('data_sources')}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/10 transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span>All Data Sources</span>
          </button>
          <button
            onClick={() => setActiveView('validation')}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Validation Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};