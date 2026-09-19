import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Send, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';
import { ULPINRecord } from '../../types/cadastre';

export const RegistryView: React.FC = () => {
  const { setSelectedEntityId, setActiveView, triggerFlyTo } = useCadastre();
  const [query, setQuery] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; records: ULPINRecord[] }>({ total: 0, records: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const res = await cadastreApi.getRegistryRecords(query, entityType, page);
      setData(res);
      setLoading(false);
    };
    fetchRecords();
  }, [query, entityType, page]);

  const handleSelectRow = (r: ULPINRecord) => {
    setSelectedEntityId(r.id);
    triggerFlyTo([77.6248, 12.9356]);
    setActiveView('3d_cadastre');
  };

  return (
    <div className="flex-1 h-full bg-[#0b0f19] p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">3D ULPIN Registry</h1>
          <p className="text-slate-400 text-xs mt-1">Official Cadastral Registry of Volumetric Vertical Property Units</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono text-xs">
          Total Registered Units: <span className="font-bold text-white">{data.total}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between space-x-4 bg-slate-900/80 p-3 rounded-xl border border-white/10">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by 3D ULPIN, Unit number, Building, or Parcel ID..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-4 bg-slate-950/80 border border-white/10 rounded-lg text-slate-100 text-xs focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-slate-950/80 border border-white/10 rounded-lg text-slate-300 text-xs outline-none"
          >
            <option value="ALL">All Entity Types</option>
            <option value="UNIT">Apartments / Units</option>
            <option value="BUILDING">Buildings</option>
            <option value="PARCEL">Parcels</option>
          </select>
        </div>
      </div>

      {/* Registry Data Table */}
      <div className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">3D ULPIN</th>
                <th className="py-3 px-4">Entity Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Parcel ID</th>
                <th className="py-3 px-4">Building</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Z-Bounds</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading ULPIN Registry...</td>
                </tr>
              ) : data.records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">No matching cadastral records found.</td>
                </tr>
              ) : (
                data.records.map((r) => (
                  <tr 
                    key={r.id}
                    onClick={() => handleSelectRow(r)}
                    className="hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300 select-all">
                      {r.ulpin_3d}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {r.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                        {r.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {r.parcel_id || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {r.building_id || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {r.floor_level ?? '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 text-[11px]">
                      {r.z_bounds[0]}m - {r.z_bounds[1]}m
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-400">{Math.round(r.confidence * 100)}%</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(r);
                        }}
                        className="p-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition"
                        title="Fly to in 3D"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="h-12 px-5 border-t border-white/10 flex items-center justify-between bg-slate-950/40 text-slate-400 text-xs">
          <span>Showing {data.records.length} of {data.total} records</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">Page {page}</span>
            <button
              disabled={page * 25 >= data.total}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
