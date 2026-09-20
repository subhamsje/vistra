import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Box, 
  FileCode, 
  ShieldCheck, 
  ClipboardCheck, 
  Database, 
  Layers, 
  Boxes, 
  RotateCcw,
  X 
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';
import { ULPINRecord } from '../../types/cadastre';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    setActiveView,
    setSelectedEntityId,
    setExplodeFactor,
    explodeFactor,
    triggerFlyTo,
    toggleLayer
  } = useCadastre();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ULPINRecord[]>([]);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const search = async () => {
      if (query.trim().length > 1) {
        const res = await cadastreApi.getRegistryRecords(query);
        setResults(res.records.slice(0, 5));
      } else {
        setResults([]);
      }
    };

    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [query, isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-24 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Input Bar */}
        <div className="h-12 px-4 border-b border-slate-200/80 flex items-center space-x-3 bg-white">
          <Search className="w-4 h-4 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, ULPIN, building, or parcel..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-xs"
          />
          <button 
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results / Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {results.length > 0 ? (
            <div>
              <div className="text-[10px] text-slate-400 px-3 py-1 font-semibold uppercase tracking-wider">Properties & Identifiers</div>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedEntityId(r.id);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100/80 text-slate-700 transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="font-mono text-[10px] text-blue-600">{r.ulpin_3d}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                    {r.entity_type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 px-3 py-1 font-semibold uppercase tracking-wider">Quick Navigation</div>
              
              <button
                onClick={() => { setActiveView('3d_cadastre'); setIsCommandPaletteOpen(false); }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <Box className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Open 3D Cadastre Workspace</span>
              </button>

              <button
                onClick={() => { setActiveView('ulpin_registry'); setIsCommandPaletteOpen(false); }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <FileCode className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Search ULPIN Registry</span>
              </button>

              <button
                onClick={() => { setActiveView('validation'); setIsCommandPaletteOpen(false); }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">View Cadastral Topology Validation</span>
              </button>

              <button
                onClick={() => { setActiveView('review_queue'); setIsCommandPaletteOpen(false); }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <ClipboardCheck className="w-4 h-4 text-rose-600" />
                <span className="font-medium">Open Human Review Queue</span>
              </button>

              <div className="text-[10px] text-slate-400 px-3 py-1 font-semibold uppercase tracking-wider pt-2">Spatial Actions</div>

              <button
                onClick={() => {
                  setExplodeFactor(explodeFactor > 0 ? 0 : 2.5);
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <Boxes className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Toggle Vertical Floor Explosion</span>
              </button>

              <button
                onClick={() => {
                  toggleLayer('underground');
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="font-medium">Toggle Underground Infrastructure Layer</span>
              </button>

              <button
                onClick={() => {
                  triggerFlyTo([77.6255, 12.9356]);
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full px-3 py-2 rounded-xl flex items-center space-x-3 text-slate-700 hover:bg-slate-100/80 transition"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span className="font-medium">Reset Camera to District Center</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-8 px-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
          <span>Use <strong className="text-slate-700 font-semibold">Esc</strong> to close</span>
          <span>VISTRA Spatial Control</span>
        </div>
      </div>
    </div>
  );
};
