import React from 'react';
import { 
  LayoutGrid, 
  Box, 
  Map as MapIcon, 
  Building2, 
  Layers, 
  ArrowDownToLine, 
  FileCode, 
  BarChart3, 
  ShieldCheck, 
  ClipboardCheck, 
  Database, 
  History, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { NavView } from '../../types/cadastre';

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, reviewQueueCount } = useCadastre();
  const [collapsed, setCollapsed] = React.useState(false);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: '3d_cadastre', label: '3D Cadastre', icon: Box },
    { id: 'parcels', label: 'Parcels', icon: MapIcon },
    { id: 'buildings', label: 'Buildings', icon: Building2 },
    { id: 'floors_units', label: 'Floors & Units', icon: Layers },
    { id: 'underground', label: 'Underground', icon: ArrowDownToLine },
    { id: 'ulpin_registry', label: 'ULPIN Registry', icon: FileCode },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'validation', label: 'Validation', icon: ShieldCheck },
    { id: 'review_queue', label: 'Review Queue', icon: ClipboardCheck, badge: reviewQueueCount > 0 ? reviewQueueCount : undefined },
    { id: 'data_sources', label: 'Data Sources', icon: Database },
    { id: 'audit_trail', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/80 flex flex-col justify-between z-30 transition-all duration-300 select-none shrink-0 text-slate-800 shadow-xs`}>
      {/* Brand Header */}
      <div>
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80">
          <div 
            onClick={() => useCadastre().navigateTo('/')}
            className="flex items-center space-x-3 overflow-hidden cursor-pointer group"
            title="Go to VISTRA Landing Page"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-base shadow-xs shrink-0 group-hover:scale-105 transition">
              V
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <div className="font-extrabold text-sm tracking-wider text-slate-900 flex items-center space-x-1.5 group-hover:text-blue-600 transition">
                  <span>VISTRA</span>
                </div>
                <div className="text-[9px] text-slate-500 tracking-wider font-semibold uppercase truncate">3D Cadastral Intelligence</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-2 text-[10px] text-blue-700 font-medium tracking-wide">
            Vertical Insights for a Smarter Bharat
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-270px)] custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer: India Mission Branding */}
      {!collapsed ? (
        <div className="p-3 border-t border-slate-200/80 space-y-2.5 bg-slate-50/60">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-600 font-medium leading-tight">3D Land Records & ULPIN Stack</span>
              <div className="w-5 h-3 rounded-xs border border-slate-300 overflow-hidden shrink-0 flex flex-col ml-2">
                <div className="h-1 bg-[#FF9933]"></div>
                <div className="h-1 bg-white"></div>
                <div className="h-1 bg-[#138808]"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-1">
            <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-serif text-[10px] font-bold text-amber-600 shrink-0">
              🏛️
            </div>
            <div className="text-[9px] text-slate-500 leading-tight">
              <div className="font-semibold text-slate-700">Ministry of Land Resources</div>
              <div>Government of India</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200/80 flex justify-center">
          <div className="w-6 h-4 rounded-xs border border-slate-300 overflow-hidden flex flex-col">
            <div className="h-1.5 bg-[#FF9933]"></div>
            <div className="h-1.5 bg-white"></div>
            <div className="h-1.5 bg-[#138808]"></div>
          </div>
        </div>
      )}
    </aside>
  );
};
