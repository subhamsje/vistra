import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Command, 
  Globe2, 
  Bell, 
  ChevronDown,
  LayoutGrid,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';

export const Topbar: React.FC = () => {
  const { 
    projects,
    currentProject,
    setActiveProjectById,
    navigateTo,
    user, 
    updateUserProfile,
    reviewQueueCount,
    pipelineStatus,
    setIsCommandPaletteOpen 
  } = useCadastre();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || 'Ananya Rao');
  const [editRole, setEditRole] = useState(user?.role || 'Chief Cadastral Surveyor');
  const [editDepartment, setEditDepartment] = useState(user?.department || 'Survey & Land Records Department');

  // Keep modal inputs in sync when user context loads/changes
  React.useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditRole(user.role);
      setEditDepartment(user.department);
    }
  }, [user]);

  const editInitials = React.useMemo(() => {
    const parts = editName.trim().split(' ').filter(Boolean);
    if (!parts.length) return 'SU';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [editName]);

  return (
    <header className="h-14 px-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between z-30 shrink-0 select-none text-slate-800 shadow-xs">
      {/* Project / Jurisdiction Selector */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigateTo('/projects')}
          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
          title="All Projects"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-xs text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold max-w-[200px] truncate">{currentProject?.name || 'Select Project...'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs animate-in fade-in duration-150">
              <div className="text-[10px] text-slate-400 px-2.5 py-1 uppercase tracking-wider font-semibold flex items-center justify-between">
                <span>Switch Cadastral Site</span>
                <button 
                  onClick={() => { setIsDropdownOpen(false); navigateTo('/projects'); }}
                  className="text-blue-600 hover:underline flex items-center space-x-0.5 normal-case font-medium"
                >
                  <span>All Sites</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 mt-1">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProjectById(p.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
                      p.id === currentProject?.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="truncate font-semibold">{p.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.jurisdiction} · {p.survey_khasra_no}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-mono text-slate-500 shrink-0">
                      {p.stats.units} units
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Property Search Bar */}
      <div className="flex-1 max-w-xl mx-6 min-w-0">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full h-8 bg-slate-100/70 hover:bg-slate-100 border border-slate-200/80 rounded-lg px-3 flex items-center justify-between text-xs text-slate-500 group transition"
        >
          <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
            <span className="text-slate-500 truncate whitespace-nowrap">Search by ULPIN, parcel ID, building, or unit...</span>
          </div>
          <div className="flex items-center space-x-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-400 shrink-0 ml-2 shadow-xs">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls: Processing Status, CRS, Notifications, Profile */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Processing Status Badge */}
        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/80 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-[11px]">Processing {pipelineStatus?.status || 'Active'}</span>
        </div>

        {/* CRS Badge */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80 text-slate-600 shadow-xs">
          <Globe2 className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-mono text-[11px] font-medium">{currentProject?.crs || 'EPSG:4326 WGS 84'}</span>
        </div>

        {/* Notifications Bell (Live review queue count) */}
        <button className="relative p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition">
          <Bell className="w-4 h-4" />
          {reviewQueueCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-amber-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center shadow-xs">
              {reviewQueueCount}
            </span>
          )}
        </button>

        {/* User Profile (Interactive & Editable) */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 hover:opacity-80 transition group text-left"
            title="Click to edit surveyor profile & identity"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 group-hover:ring-blue-400/50 transition">
              {user?.initials || 'AR'}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="font-semibold text-slate-900 text-xs flex items-center space-x-1">
                <span>{user?.name || 'Surveyor'}</span>
                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition">✎</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{user?.role || 'Reviewer'}</div>
            </div>
          </button>

          {/* Edit Profile Modal Dialog */}
          {isProfileModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {editInitials}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Surveyor Identity Profile</h3>
                      <p className="text-[11px] text-slate-500">Authorized Cadastral Officer & Digital Signatory</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-slate-900 bg-white"
                      placeholder="e.g. Ananya Rao"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Designation / Role</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-slate-900 bg-white"
                      placeholder="e.g. Chief Cadastral Surveyor"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department / Organization</label>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 bg-white text-[11px]"
                      placeholder="e.g. Survey & Land Records Department"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (editName.trim()) {
                        await updateUserProfile({
                          name: editName.trim(),
                          role: editRole.trim(),
                          department: editDepartment.trim()
                        });
                        setIsProfileModalOpen(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

