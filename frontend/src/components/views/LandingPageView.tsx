import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ArrowRight, 
  MapPin, 
  Layers, 
  Box, 
  ShieldCheck, 
  Compass, 
  FileText, 
  Crosshair, 
  Move3d, 
  Maximize2,
  Database,
  CheckCircle2,
  Sliders,
  SplitSquareVertical,
  Activity,
  Globe2,
  FileCode,
  ArrowUpRight,
  Eye,
  Radio,
  FileSpreadsheet,
  User,
  UserCheck,
  Sparkles,
  Navigation
} from 'lucide-react';
import { ProjectRecord } from '../../types/cadastre';
import { cadastreApi } from '../../services/api';
import { useCadastre } from '../../store/CadastreContext';

interface CadastralFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: any;
}

export const LandingPageView: React.FC = () => {
  const { navigateTo, setActiveProjectById, user, updateUserProfile } = useCadastre();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [features, setFeatures] = useState<CadastralFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // User input form state on landing page
  const [surveyorName, setSurveyorName] = useState<string>('');
  const [surveyorRole, setSurveyorRole] = useState<string>('Chief Cadastral Surveyor');
  const [surveyorDept, setSurveyorDept] = useState<string>('');
  const [selectedTargetProjectId, setSelectedTargetProjectId] = useState<string>('blr_koramangala');
  const [targetKhasraInput, setTargetKhasraInput] = useState<string>('');
  const [isProfileSavedSuccess, setIsProfileSavedSuccess] = useState<boolean>(false);

  // Sync user defaults when context loads
  useEffect(() => {
    if (user) {
      setSurveyorName(user.name);
      setSurveyorRole(user.role);
      setSurveyorDept(user.department);
    }
  }, [user]);
  
  // Interactive 3D Scene Controls on Landing
  const [manualExplode, setManualExplode] = useState<number>(0.0);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'parcels' | 'buildings' | 'units'>('all');
  const [showGCPs, setShowGCPs] = useState<boolean>(true);

  // Scroll Progress and Reveal States
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [heroScrollFactor, setHeroScrollFactor] = useState<number>(0);
  const [transformationProgress, setTransformationProgress] = useState<number>(0);
  const [fusionProgress, setFusionProgress] = useState<number>(0);
  const [activeCadastralNode, setActiveCadastralNode] = useState<number>(0);

  // Section Refs for Scroll Observation
  const transformSectionRef = useRef<HTMLDivElement>(null);
  const fusionSectionRef = useRef<HTMLDivElement>(null);
  const identitySectionRef = useRef<HTMLDivElement>(null);
  const projectsSectionRef = useRef<HTMLDivElement>(null);

  // Respect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Scroll listener for 60fps transform linking
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = totalHeight > 0 ? Math.min(1, Math.max(0, scrollY / totalHeight)) : 0;
          setScrollProgress(progress);

          // Hero camera push calculation (0 to 600px scroll)
          const heroP = Math.min(1, Math.max(0, scrollY / 550));
          setHeroScrollFactor(heroP);

          // 2D -> 3D Transformation section progress
          if (transformSectionRef.current) {
            const rect = transformSectionRef.current.getBoundingClientRect();
            const viewH = window.innerHeight;
            // 0 when section top enters bottom, 1 when section center is reached
            const p = Math.min(1, Math.max(0, (viewH - rect.top) / (viewH + rect.height * 0.5)));
            setTransformationProgress(p);
          }

          // Data Fusion section progress
          if (fusionSectionRef.current) {
            const rect = fusionSectionRef.current.getBoundingClientRect();
            const viewH = window.innerHeight;
            const p = Math.min(1, Math.max(0, (viewH - rect.top) / (viewH + rect.height * 0.6)));
            setFusionProgress(p);
          }

          // Cadastral Identity Node step based on scroll
          if (identitySectionRef.current) {
            const rect = identitySectionRef.current.getBoundingClientRect();
            const viewH = window.innerHeight;
            const p = Math.min(1, Math.max(0, (viewH - rect.top) / (viewH + rect.height * 0.8)));
            const step = Math.min(4, Math.floor(p * 5));
            setActiveCadastralNode(step);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load real project data from backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const projectList = await cadastreApi.getProjects();
        setProjects(projectList);
        if (projectList.length > 0) {
          const defaultProj = projectList[0];
          setActiveProject(defaultProj);
          
          const geojson = await cadastreApi.getCesiumGeoJSON(0.0, '', '', defaultProj.id);
          if (geojson && geojson.features) {
            setFeatures(geojson.features);
            const sampleUnit = geojson.features.find((f: any) => f.properties?.entity_type === 'UNIT');
            if (sampleUnit) {
              setSelectedEntityId(sampleUnit.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed loading landing page cadastral data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Effective explode factor combines manual slider + subtle scroll influence
  const effectiveExplode = useMemo(() => {
    if (manualExplode > 0) return manualExplode;
    return prefersReducedMotion ? 0 : Math.min(1.2, heroScrollFactor * 1.0);
  }, [manualExplode, heroScrollFactor, prefersReducedMotion]);

  // Update GeoJSON when explosion changes
  useEffect(() => {
    if (!activeProject) return;
    const updateExplosion = async () => {
      try {
        const geojson = await cadastreApi.getCesiumGeoJSON(effectiveExplode, '', selectedEntityId, activeProject.id);
        if (geojson && geojson.features) {
          setFeatures(geojson.features);
        }
      } catch (e) {
        console.warn('Explosion update error:', e);
      }
    };
    updateExplosion();
  }, [effectiveExplode, activeProject, selectedEntityId]);

  // Handle switching project in the landing interactive scene
  const handleSwitchProject = async (projId: string) => {
    const p = projects.find(item => item.id === projId);
    if (!p) return;
    setActiveProject(p);
    setManualExplode(0.0);
    try {
      const geojson = await cadastreApi.getCesiumGeoJSON(0.0, '', '', p.id);
      if (geojson && geojson.features) {
        setFeatures(geojson.features);
        const sampleUnit = geojson.features.find((f: any) => f.properties?.entity_type === 'UNIT');
        if (sampleUnit) {
          setSelectedEntityId(sampleUnit.id);
        }
      }
    } catch (e) {
      console.warn('Failed loading project features:', e);
    }
  };

  // Projection Mathematics for Precision 3D Cadastral Isometric Space with Scroll Camera Push
  const { originLon, originLat, scaleX, scaleY } = useMemo(() => {
    if (features && features.length > 0) {
      let minLon = Infinity, maxLon = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      features.forEach(f => {
        if (f.properties?.bbox) {
          const b = f.properties.bbox;
          if (b[0] < minLon) minLon = b[0];
          if (b[1] < minLat) minLat = b[1];
          if (b[3] > maxLon) maxLon = b[3];
          if (b[4] > maxLat) maxLat = b[4];
        }
      });
      if (minLon < Infinity && maxLon > -Infinity) {
        const cLon = (minLon + maxLon) / 2.0;
        const cLat = (minLat + maxLat) / 2.0;
        const dLon = Math.max(0.0006, maxLon - minLon);
        const dLat = Math.max(0.0006, maxLat - minLat);
        const sX = 390 / dLon;
        const sY = 390 / dLat;
        const uniformScale = Math.min(sX, sY * 1.12);
        
        // Subtle scroll push zoom (+8% scale on scroll down)
        const zoomMult = prefersReducedMotion ? 1.0 : 1.0 + heroScrollFactor * 0.08;

        return {
          originLon: cLon,
          originLat: cLat,
          scaleX: uniformScale * zoomMult,
          scaleY: uniformScale * 1.1 * zoomMult
        };
      }
    }
    const cLon = activeProject?.center?.[0] || 77.6250;
    const cLat = activeProject?.center?.[1] || 12.9355;
    return { originLon: cLon, originLat: cLat, scaleX: 340000, scaleY: 380000 };
  }, [features, activeProject, heroScrollFactor, prefersReducedMotion]);

  // Dynamic canvas center with subtle camera shift
  const CANVAS_CX = 340 + (prefersReducedMotion ? 0 : (heroScrollFactor * 12));
  const CANVAS_CY = 270 - (prefersReducedMotion ? 0 : (heroScrollFactor * 8));
  const SCALE_Z = 9.5; // pixel per vertical meter

  const projectToScreen = useCallback((lon: number, lat: number, z_m: number = 0) => {
    const dx = (lon - originLon) * scaleX;
    const dy = (lat - originLat) * scaleY;
    const cos30 = 0.866025;
    const sin30 = 0.5;
    const screenX = CANVAS_CX + (dx * cos30) - (dy * cos30);
    const screenY = CANVAS_CY - (dx * sin30) - (dy * sin30) - (z_m * SCALE_Z);
    return { x: screenX, y: screenY };
  }, [originLon, originLat, scaleX, scaleY, CANVAS_CX, CANVAS_CY]);

  const polygonToSvgPath = useCallback((coords: any[], z_m: number = 0) => {
    if (!coords || coords.length === 0) return '';
    const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
    return ring.map((pt: [number, number], idx: number) => {
      const p = projectToScreen(pt[0], pt[1], z_m);
      return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [projectToScreen]);

  const renderExtrudedVolume = useCallback((
    coords: any[], 
    baseZ: number, 
    roofZ: number, 
    fillColor: string, 
    strokeColor: string,
    isSelected: boolean,
    entityId: string,
    entityType: string,
    title: string
  ) => {
    if (!coords || coords.length === 0) return null;
    const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
    if (ring.length < 3) return null;

    const basePts = ring.map((pt: [number, number]) => projectToScreen(pt[0], pt[1], baseZ));
    const roofPts = ring.map((pt: [number, number]) => projectToScreen(pt[0], pt[1], roofZ));

    const topPath = roofPts.map((p: {x: number; y: number}, idx: number) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ') + ' Z';

    const sideWalls: string[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const b1 = basePts[i];
      const b2 = basePts[i + 1];
      const r2 = roofPts[i + 1];
      const r1 = roofPts[i];
      sideWalls.push(`M ${b1.x.toFixed(1)} ${b1.y.toFixed(1)} L ${b2.x.toFixed(1)} ${b2.y.toFixed(1)} L ${r2.x.toFixed(1)} ${r2.y.toFixed(1)} L ${r1.x.toFixed(1)} ${r1.y.toFixed(1)} Z`);
    }

    const isHovered = hoveredEntityId === entityId;

    return (
      <g 
        key={`vol_${entityId}_${baseZ}`}
        onClick={() => setSelectedEntityId(entityId)}
        onMouseEnter={() => setHoveredEntityId(entityId)}
        onMouseLeave={() => setHoveredEntityId(null)}
        className="cursor-pointer transition-all duration-150"
      >
        <title>{title}</title>
        {sideWalls.map((pathStr, sIdx) => (
          <path
            key={`wall_${sIdx}`}
            d={pathStr}
            fill={fillColor}
            fillOpacity={isSelected ? 0.95 : (isHovered ? 0.85 : 0.65)}
            stroke={strokeColor}
            strokeWidth={isSelected ? 1.5 : 0.8}
            strokeOpacity={0.8}
          />
        ))}
        <path
          d={topPath}
          fill={isSelected ? '#3b82f6' : fillColor}
          fillOpacity={isSelected ? 0.98 : (isHovered ? 0.90 : 0.75)}
          stroke={isSelected ? '#1d4ed8' : strokeColor}
          strokeWidth={isSelected ? 2 : 1}
        />
        {isSelected && (
          <path
            d={topPath}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={2}
            strokeDasharray="3,3"
          />
        )}
      </g>
    );
  }, [projectToScreen, hoveredEntityId]);

  // Selected Entity Details
  const selectedFeature = features.find(f => f.id === selectedEntityId || f.properties?.ulpin_3d === selectedEntityId);

  // Ground Control Points (GCPs)
  const GCP_POINTS = useMemo(() => {
    if (!activeProject) return [];
    const [cLon, cLat] = activeProject.center;
    return [
      { id: 'GCP-01', name: 'NW Boundary Station', lon: cLon - 0.0007, lat: cLat + 0.0006, elev: `${activeProject.elevation_m + 0.12}m` },
      { id: 'GCP-02', name: 'NE Survey Marker', lon: cLon + 0.0007, lat: cLat + 0.0006, elev: `${activeProject.elevation_m + 0.45}m` },
      { id: 'GCP-03', name: 'SE Pillar Post', lon: cLon + 0.0007, lat: cLat - 0.0006, elev: `${activeProject.elevation_m - 0.12}m` },
      { id: 'GCP-04', name: 'SW Reference Plinth', lon: cLon - 0.0007, lat: cLat - 0.0006, elev: `${activeProject.elevation_m - 0.35}m` }
    ];
  }, [activeProject]);

  const parcelFeatures = features.filter(f => f.properties.entity_type === 'PARCEL');
  const buildingFeatures = features.filter(f => f.properties.entity_type === 'BUILDING');
  const unitFeatures = features.filter(f => f.properties.entity_type === 'UNIT' || f.properties.entity_type === 'UNDERGROUND');

  // Interactive step cards for 2D -> 3D transformation
  const extrusionHeight = useMemo(() => {
    if (prefersReducedMotion) return 18.0;
    // 0m to 18m mapped to scroll progress inside transformation section
    return Math.max(0.4, transformationProgress * 18.0);
  }, [transformationProgress, prefersReducedMotion]);

  const activeFloorCount = useMemo(() => {
    if (prefersReducedMotion) return 6;
    return Math.min(6, Math.max(1, Math.floor(transformationProgress * 7)));
  }, [transformationProgress, prefersReducedMotion]);

  const handleLaunchWorkspace = async (projectId?: string) => {
    const target = projectId || selectedTargetProjectId || activeProject?.id || 'blr_koramangala';
    
    // If user customized their profile, persist it before opening workspace
    if (surveyorName.trim()) {
      await updateUserProfile({
        name: surveyorName.trim(),
        role: surveyorRole.trim() || 'Chief Cadastral Surveyor',
        department: surveyorDept.trim() || 'Survey & Land Records Department'
      });
    }

    setActiveProjectById(target);
    const queryParams: Record<string, string> = { project: target };
    if (targetKhasraInput.trim()) {
      queryParams['khasra'] = targetKhasraInput.trim();
    }
    navigateTo('/app', queryParams);
  };

  const handleApplySurveyorIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyorName.trim()) return;
    const updated = await updateUserProfile({
      name: surveyorName.trim(),
      role: surveyorRole.trim() || 'Chief Cadastral Surveyor',
      department: surveyorDept.trim() || 'Survey & Land Records Department'
    });
    if (updated) {
      setIsProfileSavedSuccess(true);
      setTimeout(() => setIsProfileSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans select-none antialiased flex flex-col">
      {/* Scroll Progress Bar (Top Fixed Indicator) */}
      <div 
        className="fixed top-0 left-0 h-0.5 bg-blue-600 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* 1. Institutional Cartographic Navigation Bar */}
      <header className="h-14 px-6 lg:px-12 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-6">
          <div 
            onClick={() => navigateTo('/')}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center font-bold text-white text-sm tracking-tight">
              V
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-sm tracking-wider text-slate-900">VISTRA</span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">3D Cadastre</span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

          <nav className="hidden md:flex items-center space-x-5 text-xs text-slate-600 font-medium">
            <button onClick={() => navigateTo('/projects')} className="hover:text-slate-900 transition">Projects</button>
            <a href="#hero-viewer" className="hover:text-slate-900 transition">3D Cadastre</a>
            <a href="#transformation" className="hover:text-slate-900 transition">Transformation</a>
            <a href="#fusion" className="hover:text-slate-900 transition">Data Fusion</a>
            <a href="#identity" className="hover:text-slate-900 transition">Cadastral Identity</a>
            <a href="#standards" className="hover:text-slate-900 transition">Standards</a>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>SIH26011</span>
          </div>

          <button
            onClick={() => handleLaunchWorkspace()}
            className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded transition flex items-center space-x-1.5 shadow-xs"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section: Precision Editorial Layout + Real Interactive 3D Scene */}
      <section className="border-b border-slate-200 bg-slate-50/50 relative overflow-hidden" id="hero-viewer">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Clear Technical Messaging */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                <span className="w-2 h-2 rounded-xs bg-blue-600"></span>
                <span>3D Cadastral Intelligence Platform</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                From 2D Land Records <br />
                <span className="text-blue-600">to 3D Property.</span>
              </h1>

              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md font-normal">
                VISTRA fuses cadastral boundaries, elevation, LiDAR point clouds, and architectural evidence into traceable, ISO 19152 compliant volumetric property records with deterministic 3D ULPIN registry.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => handleLaunchWorkspace()}
                  className="px-4 py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center space-x-2 shadow-xs"
                >
                  <span>Explore Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href="#transformation"
                  className="px-4 py-2.5 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                >
                  View Methodology
                </a>
              </div>
            </div>

            {/* Interactive User Input: Surveyor Identity & Target Site Setup */}
            <div className="p-4 rounded-xl bg-white border border-blue-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Surveyor Session & Target Input</span>
                </div>
                {isProfileSavedSuccess && (
                  <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleApplySurveyorIdentity} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Surveyor Name</label>
                    <input
                      type="text"
                      value={surveyorName}
                      onChange={(e) => setSurveyorName(e.target.value)}
                      placeholder="e.g. Ananya Rao"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Surveyor Role</label>
                    <input
                      type="text"
                      value={surveyorRole}
                      onChange={(e) => setSurveyorRole(e.target.value)}
                      placeholder="e.g. Chief Cadastral Surveyor"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Target Cadastral Site</label>
                    <select
                      value={selectedTargetProjectId}
                      onChange={(e) => {
                        setSelectedTargetProjectId(e.target.value);
                        handleSwitchProject(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 bg-slate-50/50"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.jurisdiction})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Search Khasra / Survey #</label>
                    <input
                      type="text"
                      value={targetKhasraInput}
                      onChange={(e) => setTargetKhasraInput(e.target.value)}
                      placeholder="e.g. SY-84/2A or KH-109"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Update Identity</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchWorkspace(selectedTargetProjectId)}
                    className="text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1 rounded transition flex items-center space-x-1 shadow-xs"
                  >
                    <span>Launch Configured Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Active Real Dataset Summary Card */}
            {activeProject && (
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-900 text-xs flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{activeProject.name}</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    {activeProject.stats.validation_status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Survey Ref</span>
                    <span className="font-semibold text-slate-800">{activeProject.survey_khasra_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Parcels / Bldgs</span>
                    <span className="font-semibold text-slate-800">{activeProject.stats.parcels} / {activeProject.stats.buildings}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Units Registered</span>
                    <span className="font-semibold text-blue-600">{activeProject.stats.units}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                  <span>Datum: {activeProject.crs.split(' ')[0]}</span>
                  <span>AMSL: {activeProject.elevation_m}m</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: LARGE ACTUAL INTERACTIVE 3D CADASTRAL SCENE */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden relative min-h-[440px]">
            {/* 3D Scene Controls Header */}
            <div className="h-10 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-800 text-[11px]">Real 3D Cadastral Model</span>
                <span className="text-slate-400 font-mono text-[10px]">[{activeProject?.jurisdiction}]</span>
              </div>

              {/* Real Project Switcher Pill */}
              <div className="flex items-center space-x-2">
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => handleSwitchProject(e.target.value)}
                  className="h-7 px-2 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleLaunchWorkspace(activeProject?.id)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                  title="Expand to Full Workspace"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive SVG Cadastral Projection Canvas */}
            <div className="flex-1 relative bg-slate-50/40 flex items-center justify-center p-2 overflow-hidden">
              {loading ? (
                <div className="text-slate-400 text-xs font-mono flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading Georeferenced Geometry...</span>
                </div>
              ) : (
                <svg
                  viewBox="0 0 680 540"
                  className="w-full h-full max-h-[460px] cursor-default select-none"
                >
                  <defs>
                    <filter id="cadastreShadowLight" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.08" />
                    </filter>
                  </defs>

                  {/* Survey Grid Lines */}
                  <g className="opacity-30">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <line 
                        key={`g_v_${i}`} 
                        x1={40 + i * 45} 
                        y1="20" 
                        x2={40 + i * 45} 
                        y2="520" 
                        stroke="#94a3b8" 
                        strokeWidth="0.75" 
                        strokeDasharray="2,4" 
                      />
                    ))}
                    {Array.from({ length: 11 }).map((_, i) => (
                      <line 
                        key={`g_h_${i}`} 
                        x1="20" 
                        y1={30 + i * 45} 
                        x2="660" 
                        y2={30 + i * 45} 
                        stroke="#94a3b8" 
                        strokeWidth="0.75" 
                        strokeDasharray="2,4" 
                      />
                    ))}
                  </g>

                  {/* 1. Parcel Boundaries (2D / Plinth level) */}
                  {(activeLayer === 'all' || activeLayer === 'parcels') && parcelFeatures.map(parcel => {
                    const isSelected = selectedEntityId === parcel.id;
                    const pathD = polygonToSvgPath(parcel.geometry.coordinates, 0.0);
                    return (
                      <g key={parcel.id} onClick={() => setSelectedEntityId(parcel.id)} className="cursor-pointer">
                        <title>Cadastral Parcel Boundary</title>
                        <path
                          d={pathD}
                          fill="#ecfdf5"
                          fillOpacity={0.7}
                          stroke={isSelected ? '#059669' : '#10b981'}
                          strokeWidth={isSelected ? 2 : 1.2}
                          strokeDasharray={isSelected ? '4,2' : 'none'}
                          filter="url(#cadastreShadowLight)"
                        />
                      </g>
                    );
                  })}

                  {/* 2. Survey GCP Station Markers */}
                  {showGCPs && GCP_POINTS.map(gcp => {
                    const pos = projectToScreen(gcp.lon, gcp.lat, 0.2);
                    return (
                      <g key={gcp.id} className="cursor-help">
                        <title>{`${gcp.id}: ${gcp.name} (Elevation ${gcp.elev})`}</title>
                        <circle cx={pos.x} cy={pos.y} r="3" fill="#2563eb" stroke="white" strokeWidth="1" />
                        <circle cx={pos.x} cy={pos.y} r="6" fill="none" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="2,2" />
                        <text x={pos.x + 5} y={pos.y + 3} fill="#64748b" fontSize="8" fontWeight="600" fontFamily="monospace">
                          {gcp.id}
                        </text>
                      </g>
                    );
                  })}

                  {/* 3. 3D Building Foundation / Envelope */}
                  {(activeLayer === 'all' || activeLayer === 'buildings') && buildingFeatures.map(bldg => {
                    const props = bldg.properties;
                    const isSelected = selectedEntityId === bldg.id;
                    return renderExtrudedVolume(
                      bldg.geometry.coordinates,
                      0.0,
                      props.is_context ? 12.0 : 0.6,
                      props.is_context ? '#94a3b8' : '#cbd5e1',
                      '#475569',
                      isSelected,
                      bldg.id,
                      'BUILDING',
                      props.is_context ? 'Adjacent Context Building' : 'Building Plinth'
                    );
                  })}

                  {/* 4. Floor Slabs & 3D Property Volume Units */}
                  {(activeLayer === 'all' || activeLayer === 'units') && unitFeatures.map(unit => {
                    const props = unit.properties;
                    const baseZ = props.local_base_m ?? 0.56;
                    const roofZ = props.local_roof_m ?? 3.56;
                    const isSelected = selectedEntityId === unit.id;
                    const color = props.color || '#3b82f6';
                    return renderExtrudedVolume(
                      unit.geometry.coordinates,
                      baseZ,
                      roofZ,
                      color,
                      isSelected ? '#1d4ed8' : '#334155',
                      isSelected,
                      unit.id,
                      props.entity_type,
                      `Unit ${props.unit_number || unit.id} (Floor ${props.floor_level || 1}) - ULPIN: ${props.ulpin_3d}`
                    );
                  })}

                  {/* Selected Volume Annotation Banner */}
                  {selectedFeature && (
                    (() => {
                      const props = selectedFeature.properties;
                      const center = props.center || [activeProject?.center[0] || 77.6250, activeProject?.center[1] || 12.9355];
                      const roofZ = props.local_roof_m ?? 4.0;
                      const pos = projectToScreen(center[0], center[1], roofZ);
                      return (
                        <g transform={`translate(${pos.x + 15}, ${pos.y - 35})`}>
                          <line x1="-15" y1="35" x2="0" y2="0" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="2,2" />
                          <rect width="180" height="42" rx="4" fill="white" stroke="#2563eb" strokeWidth="1.2" filter="url(#cadastreShadowLight)" />
                          <text x="10" y="15" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
                            {props.entity_type === 'UNIT' ? `Unit ${props.unit_number || selectedFeature.id}` : selectedFeature.id}
                          </text>
                          <text x="10" y="27" fill="#2563eb" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                            {props.ulpin_3d ? `${props.ulpin_3d.substring(0, 20)}...` : props.entity_type}
                          </text>
                          <text x="10" y="37" fill="#64748b" fontSize="8" fontWeight="500">
                            Vol: {props.volume_m3 || '180'} m³ · Height: {props.height_m || '3.0'}m
                          </text>
                        </g>
                      );
                    })()
                  )}
                </svg>
              )}

              {/* Bottom Interactive HUD: Vertical Storey Separation Slider */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs space-x-4 shadow-2xs">
                <div className="flex items-center space-x-2 shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-800 text-[11px]">Floor Explosion</span>
                  <span className="font-mono text-blue-600 font-bold text-[11px]">{effectiveExplode.toFixed(1)}x</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.1"
                  value={effectiveExplode}
                  onChange={(e) => setManualExplode(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setShowGCPs(!showGCPs)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      showGCPs ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    GCPs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Technical Data / Transformation / Output Strip */}
      <section className="border-b border-slate-200 bg-white py-5 px-6 lg:px-12 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          <div className="space-y-1 md:pr-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Input Modalities</div>
            <div className="font-semibold text-slate-800 text-xs">
              GIS (GeoJSON/SHP) · LiDAR (LAZ 1.4) · DEM/DSM · Architectural PDF · GNSS CORS
            </div>
          </div>

          <div className="space-y-1 pt-3 md:pt-0 md:px-6">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Transformation Pipeline</div>
            <div className="font-semibold text-slate-800 text-xs">
              CRS Alignment → 3D Reconstruction → Floor Slicing → Topology Validation → 3D ULPIN
            </div>
          </div>

          <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Volumetric Outputs</div>
            <div className="font-semibold text-slate-800 text-xs">
              Watertight 3D Parcels · Enclosed Volumes (m³) · Floor Slabs · ISO 19152 LADM Seals
            </div>
          </div>

        </div>
      </section>

      {/* 4. SCROLL-LINKED SECTION: 2D -> 3D SPATIAL TRANSFORMATION */}
      <section 
        id="transformation" 
        ref={transformSectionRef}
        className="py-16 px-6 lg:px-12 border-b border-slate-200 bg-slate-50/40 relative"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Scroll-Linked Extrusion & Slicing</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
                2D Footprint to 3D Volumetric Slices
              </h2>
              <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
                As you scroll through this section, watch the flat parcel boundary gradually extrude into 3D building envelopes and segment into isolated floor slabs.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono bg-white p-2.5 rounded border border-slate-200 text-slate-600 self-start md:self-end shadow-2xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Extrusion Height:</span>
                <span className="font-bold text-slate-900">+{extrusionHeight.toFixed(1)}m</span>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div>
                <span className="text-slate-400 text-[10px] block">Storeys Segmented:</span>
                <span className="font-bold text-blue-600">{activeFloorCount} / 6</span>
              </div>
            </div>
          </div>

          {/* Interactive Dynamic Transformation Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Synchronized 3D Slicing SVG */}
            <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col items-center justify-center min-h-[360px]">
              <svg viewBox="0 0 520 380" className="w-full h-full max-h-[340px]">
                <defs>
                  <linearGradient id="extrudeGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <g className="opacity-25">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`tg_${i}`} x1={40 + i * 60} y1="30" x2={40 + i * 60} y2="350" stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2,4" />
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <line key={`th_${i}`} x1="30" y1="40 + i * 45" x2="490" y2="40 + i * 45" stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="2,4" />
                  ))}
                </g>

                {/* 2D Ground Footprint */}
                <polygon
                  points="160,280 360,280 430,220 230,220"
                  fill="#ecfdf5"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                <text x="175" y="270" fill="#047857" fontSize="9" fontWeight="700" fontFamily="sans-serif">
                  2D PARCEL BOUNDARY (KHASRA 102/4A)
                </text>

                {/* Extruded Side Walls (Height linked to scroll) */}
                {extrusionHeight > 0.5 && (
                  <g className="transition-all duration-75">
                    {/* Front Wall */}
                    <polygon
                      points={`160,280 360,280 360,${280 - extrusionHeight * 8} 160,${280 - extrusionHeight * 8}`}
                      fill="url(#extrudeGrad)"
                      stroke="#2563eb"
                      strokeWidth="1.2"
                    />
                    {/* Right Wall */}
                    <polygon
                      points={`360,280 430,220 430,${220 - extrusionHeight * 8} 360,${280 - extrusionHeight * 8}`}
                      fill="#60a5fa"
                      fillOpacity="0.75"
                      stroke="#1d4ed8"
                      strokeWidth="1.2"
                    />
                    {/* Top Roof Slab */}
                    <polygon
                      points={`160,${280 - extrusionHeight * 8} 360,${280 - extrusionHeight * 8} 430,${220 - extrusionHeight * 8} 230,${220 - extrusionHeight * 8}`}
                      fill="#3b82f6"
                      fillOpacity="0.9"
                      stroke="#1d4ed8"
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {/* Sequential Floor Slab Slices */}
                {Array.from({ length: activeFloorCount }).map((_, fIdx) => {
                  const floorH = (fIdx + 1) * 2.8;
                  if (floorH > extrusionHeight) return null;
                  const slabY = 280 - floorH * 8;
                  const rightY = 220 - floorH * 8;
                  return (
                    <g key={`slab_${fIdx}`} className="animate-in fade-in duration-200">
                      <line x1="160" y1={slabY} x2="360" y2={slabY} stroke="#1e40af" strokeWidth="1.5" />
                      <line x1="360" y1={slabY} x2="430" y2={rightY} stroke="#1e40af" strokeWidth="1.5" />
                      <text x="130" y={slabY + 3} fill="#1e40af" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        F{fIdx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Right: Technical Explanation Steps */}
            <div className="lg:col-span-5 space-y-3">
              <div className={`p-4 rounded border transition-all ${
                transformationProgress < 0.3 ? 'bg-white border-blue-500 shadow-xs' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>1. 2D Survey Boundary Alignment</span>
                  <span className="font-mono text-[10px] text-emerald-600">RMS &lt; 0.005m</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Khasra polygon corners snapped to centimeter GNSS ground control station pillars in EPSG:32643.
                </p>
              </div>

              <div className={`p-4 rounded border transition-all ${
                transformationProgress >= 0.3 && transformationProgress < 0.7 ? 'bg-white border-blue-500 shadow-xs' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>2. LiDAR-Guided Vertical Extrusion</span>
                  <span className="font-mono text-[10px] text-blue-600">LoD 1.2 Solid</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aerial point cloud median returns determine ground plinth (+0.0m) and roof eave elevation (+18.0m).
                </p>
              </div>

              <div className={`p-4 rounded border transition-all ${
                transformationProgress >= 0.7 ? 'bg-white border-blue-500 shadow-xs' : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>3. Floor Slicing & Private Volumes</span>
                  <span className="font-mono text-[10px] text-indigo-600">ISO 19152 LADM</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Architectural floor plans partition each storey into watertight polyhedra with certified cubic volumes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SCROLL-LINKED SECTION: MULTI-MODAL EVIDENCE FUSION */}
      <section 
        id="fusion" 
        ref={fusionSectionRef}
        className="py-16 px-6 lg:px-12 border-b border-slate-200 bg-white relative"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Multi-Modal Ingestion</div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Geospatial Evidence Fusion
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
              Heterogeneous survey inputs progressively harmonized into an atomic 3D spatial database.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-400 transition">
              <div className="w-8 h-8 rounded bg-blue-100/80 text-blue-700 flex items-center justify-center text-xs">
                <Globe2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">GIS Parcel Vectors</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                GeoJSON / SHP cadastral boundaries providing base 2D tenure extent.
              </p>
              <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200">
                Format: GeoJSON (WGS84 / UTM)
              </div>
            </div>

            <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-400 transition">
              <div className="w-8 h-8 rounded bg-indigo-100/80 text-indigo-700 flex items-center justify-center text-xs">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">LiDAR Point Cloud</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                LAS/LAZ 1.4 point clouds classifying ground, roof eaves, and vertical heights.
              </p>
              <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200">
                Density: ~120 pts/m²
              </div>
            </div>

            <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-400 transition">
              <div className="w-8 h-8 rounded bg-emerald-100/80 text-emerald-700 flex items-center justify-center text-xs">
                <FileCode className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">Architectural Floor Plans</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Vector PDFs georeferenced and extruded into internal unit boundaries.
              </p>
              <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200">
                Format: Vector PDF / DXF
              </div>
            </div>

            <div className="p-4 rounded bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-400 transition">
              <div className="w-8 h-8 rounded bg-amber-100/80 text-amber-700 flex items-center justify-center text-xs">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">DEM Elevation & GNSS</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                GeoTIFF terrain models and CORS ground control point CSV coordinates.
              </p>
              <div className="text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200">
                Accuracy: Sub-centimeter
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SCROLL-LINKED SECTION: CADASTRAL IDENTITY & 3D ULPIN */}
      <section 
        id="identity" 
        ref={identitySectionRef}
        className="py-16 px-6 lg:px-12 border-b border-slate-200 bg-slate-50/50 relative"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold">LADM Hierarchical Identity</div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Deterministic 3D Cadastral Hierarchy
            </h2>
            <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
              Traceable parent-child relationships linking ground parcels to individual volumetric apartments.
            </p>
          </div>

          {/* Connected Hierarchy Line Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { level: 'PARCEL', title: '2D Ground Parcel', code: 'PARCEL_102_4A', desc: 'Base georeferenced land parcel record' },
              { level: 'BUILDING', title: 'Building Solid', code: 'BLDG_ALPHA', desc: 'Extruded footprint with plinth & eave limits' },
              { level: 'FLOOR', title: 'Storey Level', code: 'FLOOR_03', desc: 'Horizontal datum slice at +9.0m AMSL' },
              { level: 'UNIT', title: 'Property Volume', code: 'UNIT_302', desc: 'Watertight apartment volume (180.4 m³)' },
              { level: 'ULPIN', title: 'Validated 3D ULPIN', code: 'KA-BLR-004-102-4A-302-3D', desc: 'Cryptographically sealed 14-digit national ID' }
            ].map((node, idx) => (
              <div 
                key={node.level}
                className={`p-4 rounded border transition-all ${
                  activeCadastralNode === idx ? 'bg-white border-blue-600 shadow-xs' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className={activeCadastralNode === idx ? 'text-blue-600' : 'text-slate-400'}>0{idx + 1}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">{node.level}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xs mt-2">{node.title}</h3>
                <div className="font-mono text-[10px] text-blue-700 font-semibold mt-1 truncate">{node.code}</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">{node.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Projects Section: Real Database Records Only */}
      <section 
        id="projects" 
        ref={projectsSectionRef}
        className="py-14 px-6 lg:px-12 border-b border-slate-200 bg-white"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Operational Catalog</div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Processed Cadastral Projects
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Loaded directly from the active multi-modal database pipeline without synthetic placeholders.
              </p>
            </div>

            <button
              onClick={() => navigateTo('/projects')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition self-start sm:self-end"
            >
              <span>View All Project Jurisdictions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map(proj => (
              <div 
                key={proj.id}
                className="p-5 rounded bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">{proj.jurisdiction}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-medium">
                      {proj.stats.validation_status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{proj.name}</h3>
                  <div className="text-xs font-mono text-slate-600">
                    Survey / Khasra Ref: <strong className="text-slate-800">{proj.survey_khasra_no}</strong>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-200/80">
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Parcels</div>
                      <div className="font-bold text-slate-800">{proj.stats.parcels}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">Buildings</div>
                      <div className="font-bold text-slate-800">{proj.stats.buildings}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400">3D Units</div>
                      <div className="font-bold text-blue-600">{proj.stats.units}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>CRS: {proj.crs.split(' ')[0]}</span>
                    <span>RMS: {proj.stats.mean_gcp_residual_m}m</span>
                  </div>

                  <button
                    onClick={() => handleLaunchWorkspace(proj.id)}
                    className="w-full py-2 rounded bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <span>Launch 3D Workspace</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL GEOSPATIAL CTA: Smooth Transition Into Workspace */}
      <section className="py-14 px-6 lg:px-12 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Interactive 3D Cadastral Session Ready</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Launch the 3D Cadastral Intelligence Workspace
          </h2>

          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Inspect individual private property volumes, perform 3D Euclidean vertex measurements, cut horizontal section planes, and audit cryptographic hash seals.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleLaunchWorkspace()}
              className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center space-x-2 shadow-sm"
            >
              <span>Enter 3D Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigateTo('/projects')}
              className="px-5 py-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              Browse All Jurisdictions
            </button>
          </div>
        </div>
      </section>

      {/* 9. Standards Compliance Strip */}
      <section id="standards" className="py-6 px-6 lg:px-12 bg-white border-b border-slate-200 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Cadastral Governance & Standards Compliance</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600">
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200">ISO 19152 (LADM)</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200">OGC CityJSON 1.1</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200">PostGIS 3D Polyhedral</span>
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200">Survey of India Datums</span>
          </div>
        </div>
      </section>

      {/* 10. Institutional Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-6 lg:px-12 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-white text-slate-950 font-bold flex items-center justify-center text-xs">
              V
            </div>
            <div>
              <div className="font-bold text-slate-200 tracking-wider">VISTRA · SIH26011</div>
              <div className="text-[10px] text-slate-400">Ministry of Land Resources · Government of India</div>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-slate-300 font-medium">
            <button onClick={() => navigateTo('/')} className="hover:text-white transition">Landing</button>
            <button onClick={() => navigateTo('/projects')} className="hover:text-white transition">Projects</button>
            <button onClick={() => handleLaunchWorkspace()} className="hover:text-white transition">3D Workspace</button>
          </div>

          <div className="text-[10px] font-mono text-slate-400">
            Vertical Insights for a Smarter Bharat
          </div>
        </div>
      </footer>
    </div>
  );
};
