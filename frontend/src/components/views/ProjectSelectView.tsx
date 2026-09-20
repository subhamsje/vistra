import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Box, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Globe2, 
  Search,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Activity,
  Sparkles
} from 'lucide-react';
import { ProjectRecord, PlatformGlobalStats } from '../../types/cadastre';
import { cadastreApi } from '../../services/api';
import { useCadastre } from '../../store/CadastreContext';

interface ProjectSelectViewProps {
  onSelectProject?: (projectId: string) => void;
}

export const ProjectSelectView: React.FC<ProjectSelectViewProps> = ({ onSelectProject }) => {
  const { setActiveProjectById, navigateTo } = useCadastre();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [stats, setStats] = useState<PlatformGlobalStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const [projectList, globalStats] = await Promise.all([
          cadastreApi.getProjects(),
          cadastreApi.getPlatformStats()
        ]);
        setProjects(projectList);
        setStats(globalStats);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleLaunchProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
    } else {
      setActiveProjectById(projectId);
      navigateTo('/app', { project: projectId });
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.survey_khasra_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = stateFilter === 'ALL' || p.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const uniqueStates = Array.from(new Set(projects.map(p => p.state)));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <header className="h-16 px-6 lg:px-12 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
        <div 
          onClick={() => navigateTo('/')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            V
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wider text-white flex items-center space-x-1.5">
              <span>VISTRA</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">3D CADASTRE</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Cadastral Jurisdictions & Projects</div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateTo('/')}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition"
          >
            Product Overview
          </button>
          <button
            onClick={() => navigateTo('/app')}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/30 flex items-center space-x-1.5"
          >
            <span>Open Default Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 space-y-10">
        {/* Title & Live Cadastral Stats Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SIH26011 National Cadastral Repository</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
              Select Jurisdiction Project
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
              Explore georeferenced cadastral datasets processed through the multi-modal ingestion, 3D building reconstruction, vertical parceling, and 3D ULPIN registry pipeline.
            </p>
          </div>

          {/* Quick Platform Metrics Counters */}
          {stats && (
            <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
              <div className="px-4 py-1.5 border-r border-slate-800 text-center">
                <div className="text-lg font-black font-mono text-blue-400">{stats.total_projects}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Sites</div>
              </div>
              <div className="px-4 py-1.5 border-r border-slate-800 text-center">
                <div className="text-lg font-black font-mono text-emerald-400">{stats.total_ulpins_registered}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">3D ULPINs</div>
              </div>
              <div className="px-4 py-1.5 text-center">
                <div className="text-lg font-black font-mono text-indigo-400">{stats.system_topology_pass_rate}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Pass Rate</div>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by project name, survey number, khasra, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">All States ({projects.length})</option>
              {uniqueStates.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        {loading ? (
          <div className="py-24 text-center text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-medium">Loading cadastral jurisdictions from database...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-24 text-center bg-slate-950/40 rounded-3xl border border-slate-800/80 p-8">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No matching projects found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or state filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-3xl p-6 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Card Header: Jurisdiction Badge & Status */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold">
                      <MapPin className="w-3 h-3" />
                      <span>{proj.jurisdiction}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{proj.stats.validation_status || 'VALIDATED'}</span>
                    </span>
                  </div>

                  {/* Project Name & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition tracking-tight">
                      {proj.name}
                    </h3>
                    <div className="font-mono text-xs text-slate-400 mt-0.5 font-medium">
                      Survey / Khasra: <span className="text-slate-200">{proj.survey_khasra_no}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  {/* Real Dynamic Metrics Table */}
                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
                    <div className="text-center">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Parcels</div>
                      <div className="text-base font-bold text-white font-mono">{proj.stats.parcels}</div>
                    </div>
                    <div className="text-center border-x border-slate-800">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Storeys</div>
                      <div className="text-base font-bold text-indigo-400 font-mono">{proj.stats.floors}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">3D Units</div>
                      <div className="text-base font-bold text-emerald-400 font-mono">{proj.stats.units}</div>
                    </div>
                  </div>

                  {/* Spatial Geodetic Metadata */}
                  <div className="space-y-1.5 text-[11px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">CRS:</span>
                      <span className="text-slate-300 font-semibold truncate max-w-[200px]">{proj.crs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Volume Extent:</span>
                      <span className="text-slate-300 font-semibold">{proj.stats.total_volume_m3.toLocaleString()} m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mean GCP Residual:</span>
                      <span className="text-emerald-400 font-semibold">{proj.stats.mean_gcp_residual_m} m (Order 1)</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-6 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleLaunchProject(proj.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 group/btn"
                  >
                    <span>Launch 3D Cadastral Workspace</span>
                    <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-6 lg:px-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-slate-300 tracking-wider">VISTRA</span>
            <span>•</span>
            <span>SIH26011 3D Cadastral Intelligence Platform</span>
            <span>•</span>
            <span>Department of Land Resources (DoLR), MoRD</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Compliant with ISO 19152 LADM & OGC 3D CityDB Specs
          </div>
        </div>
      </footer>
    </div>
  );
};
