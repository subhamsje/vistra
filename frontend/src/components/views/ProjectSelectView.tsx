import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Search,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Crosshair,
  Sliders,
  Maximize2
} from 'lucide-react';
import { ProjectRecord } from '../../types/cadastre';
import { cadastreApi } from '../../services/api';
import { useCadastre } from '../../store/CadastreContext';

interface ProjectSelectViewProps {
  onSelectProject?: (projectId: string) => void;
}

export const ProjectSelectView: React.FC<ProjectSelectViewProps> = ({ onSelectProject }) => {
  const { setActiveProjectById, navigateTo } = useCadastre();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      try {
        const projectList = await cadastreApi.getProjects();
        setProjects(projectList);
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* Institutional Top Navbar */}
      <header className="h-14 px-6 lg:px-12 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div 
          onClick={() => navigateTo('/')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center font-bold text-white text-sm">
            V
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-bold text-sm tracking-wider text-slate-900">VISTRA</span>
            <span className="text-[11px] text-slate-500 font-mono">Jurisdiction Directory</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateTo('/')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded transition"
          >
            Product Overview
          </button>
          <button
            onClick={() => handleLaunchProject(projects[0]?.id || 'blr_koramangala')}
            className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>Open Default Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 space-y-8">
        {/* Header & Description */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Cadastral Catalog</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mt-0.5">
              Select Jurisdiction Project
            </h1>
            <p className="text-slate-600 text-xs mt-1 max-w-2xl">
              Georeferenced cadastral datasets processed through the multi-modal ingestion, 3D building reconstruction, vertical parceling, and 3D ULPIN registry pipeline.
            </p>
          </div>

          <div className="font-mono text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 self-start sm:self-end">
            Active Projects: <strong className="text-slate-800 font-semibold">{projects.length}</strong>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
          <div className="flex-1 relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by project name, survey number, khasra, city, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded text-slate-900 text-xs focus:border-blue-600 outline-none transition"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-200 rounded text-slate-700 text-xs outline-none focus:border-blue-600 transition"
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
          <div className="py-20 text-center text-slate-400 font-mono text-xs flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Querying active project database...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded border border-slate-200 p-8">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No matching cadastral projects</h3>
            <p className="text-xs text-slate-500 mt-0.5">Adjust your filter or search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded p-5 hover:border-blue-500 hover:shadow-xs transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-slate-600 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>{proj.jurisdiction}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      {proj.stats.validation_status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {proj.name}
                    </h3>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">
                      Survey / Khasra: <strong className="text-slate-800">{proj.survey_khasra_no}</strong>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-normal">
                      {proj.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Parcels</div>
                      <div className="font-bold text-slate-800">{proj.stats.parcels}</div>
                    </div>
                    <div className="border-x border-slate-200">
                      <div className="text-[10px] text-slate-400">Storeys</div>
                      <div className="font-bold text-slate-800">{proj.stats.floors}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">3D Units</div>
                      <div className="font-bold text-blue-600">{proj.stats.units}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono text-slate-500 pt-1">
                    <div className="flex justify-between">
                      <span>CRS:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[180px]">{proj.crs.split(' ')[0]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume Extent:</span>
                      <span className="text-slate-700 font-medium">{proj.stats.total_volume_m3.toLocaleString()} m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GCP Residual:</span>
                      <span className="text-emerald-700 font-medium">{proj.stats.mean_gcp_residual_m}m</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleLaunchProject(proj.id)}
                    className="w-full py-2 rounded bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <span>Launch 3D Cadastral Workspace</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-6 px-6 lg:px-12 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 tracking-wider">VISTRA</span>
            <span>•</span>
            <span>SIH26011 3D Cadastral Intelligence Platform</span>
            <span>•</span>
            <span>Ministry of Land Resources</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Compliant with ISO 19152 LADM & OGC 3D CityDB Specs
          </div>
        </div>
      </footer>
    </div>
  );
};
