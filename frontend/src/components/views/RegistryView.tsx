import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Send, 
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
    triggerFlyTo([77.6250, 12.9355]);
    setActiveView('3d_cadastre');
  };

  return (
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-5 text-xs select-none text-slate-800">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">3D ULPIN Registry</h1>
          <p className="text-slate-500 text-xs mt-0.5">Official Cadastral Registry of Volumetric Vertical Property Units</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono text-xs shadow-xs">
          Total Registered Units: <span className="font-bold text-blue-600">{data.total}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between space-x-4 bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by 3D ULPIN, Unit number, Building, or Parcel ID..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:border-blue-500 outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs outline-none"
          >
            <option value="ALL">All Entity Types</option>
            <option value="UNIT">Apartments / Units</option>
            <option value="BUILDING">Buildings</option>
            <option value="PARCEL">Parcels</option>
          </select>
        </div>
      </div>

      {/* Registry Data Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">3D ULPIN</th>
                <th className="py-3 px-4">Entity Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Parcel ID</th>
                <th className="py-3 px-4">Building</th>
                <th className="py-3 px-4">Floor</th>
                <th className="py-3 px-4">Z-Bounds</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading ULPIN Registry...</td>
                </tr>
              ) : data.records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No matching cadastral records found.</td>
                </tr>
              ) : (
                data.records.map((r) => (
                  <tr 
                    key={r.id}
                    onClick={() => handleSelectRow(r)}
                    className="hover:bg-blue-50/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 select-all">
                      {r.ulpin_3d}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {r.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">
                        {r.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {r.parcel_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.building_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.floor_level ?? '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 text-[11px]">
                      {r.z_bounds[0]}m - {r.z_bounds[1]}m
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(r);
                        }}
                        className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition"
                        title="View in 3D"
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
        <div className="h-12 px-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-slate-500 text-xs">
          <span>Showing {data.records.length} of {data.total} records</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="font-mono px-2 text-slate-700">Page {page}</span>
            <button
              disabled={page * 50 >= data.total}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition shadow-xs"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
