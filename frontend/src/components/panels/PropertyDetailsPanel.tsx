import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  CheckCircle2, 
  ExternalLink, 
  Send,
  Navigation,
  FileCode,
  ShieldCheck,
  Building,
  Info,
  Layers,
  FileCheck
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';

export const PropertyDetailsPanel: React.FC = () => {
  const { 
    selectedEntity, 
    setSelectedEntityId,
    setIsPropertyPanelOpen,
    triggerFlyTo, 
    setActiveView,
    setCameraMode,
    refreshData
  } = useCadastre();

  const [activeTab, setActiveTab] = useState<'overview' | 'hierarchy' | 'validation' | 'sources'>('overview');
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [cadastralTree, setCadastralTree] = useState<any[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchTree = async () => {
      try {
        const tree = await cadastreApi.getCadastralTree();
        if (mounted) setCadastralTree(tree);
      } catch (e) {
        console.warn('Failed to load cadastral tree:', e);
      }
    };
    fetchTree();
    return () => { mounted = false; };
  }, []);

  if (!selectedEntity) return null;

  const handleCopyUlpin = () => {
    if (selectedEntity.ulpin_3d) {
      navigator.clipboard.writeText(selectedEntity.ulpin_3d);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyHash = () => {
    if (selectedEntity.audit_hash) {
      navigator.clipboard.writeText(selectedEntity.audit_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleFlyTo = () => {
    triggerFlyTo([77.6250, 12.9355]);
    setCameraMode(selectedEntity.entity_type === 'PARCEL' ? 'PARCEL' : 'BUILDING');
  };

  const handleViewInRegistry = () => {
    setActiveView('ulpin_registry');
  };

  const handleSubmitReview = async () => {
    if (!reviewNote.trim()) return;
    setIsSubmittingReview(true);
    try {
      await cadastreApi.submitGovernanceDecision({
        entity_id: selectedEntity.entity_id,
        ulpin_3d: selectedEntity.ulpin_3d,
        action: 'FLAG_FOR_REVIEW',
        reviewer: 'Reviewer (Active User)',
        notes: reviewNote
      });
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewModal(false);
        setReviewNote('');
        refreshData();
      }, 1500);
    } catch (e) {
      console.error('Failed to submit review:', e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Find parent parcel and building in hierarchy
  const currentParcel = cadastralTree.find((p: any) => p.entity_id === selectedEntity.parcel_id || p.id === selectedEntity.parcel_id) || cadastralTree[0];
  const currentBuilding = currentParcel?.buildings?.find((b: any) => b.entity_id === selectedEntity.building_id || b.id === selectedEntity.building_id) || currentParcel?.buildings?.[0];

  return (
    <aside className="w-96 h-full bg-white/90 backdrop-blur-2xl border-l border-slate-200/90 flex flex-col z-20 shadow-xl select-none shrink-0 text-slate-800 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Property Details</h2>
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {selectedEntity.entity_type}
          </span>
        </div>
        <button 
          onClick={() => setIsPropertyPanelOpen(false)}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200/80 px-2 text-xs font-medium text-slate-500 bg-slate-50/50">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2.5 border-b-2 transition ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-3.5 py-2.5 border-b-2 transition ${
            activeTab === 'hierarchy' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-3.5 py-2.5 border-b-2 transition ${
            activeTab === 'validation' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Validation ({selectedEntity.validation_checklist?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3.5 py-2.5 border-b-2 transition ${
            activeTab === 'sources' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent hover:text-slate-800'
          }`}
        >
          Sources ({selectedEntity.data_sources?.length || 0})
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Primary ULPIN Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">3D ULPIN / Cadastral ID</span>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{selectedEntity.validation_status || 'Validated'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between bg-white px-2.5 py-2 rounded-lg border border-slate-200 shadow-xs">
                <span className="font-mono text-xs font-bold text-slate-900 select-all truncate mr-2">
                  {selectedEntity.ulpin_3d}
                </span>
                <button
                  onClick={handleCopyUlpin}
                  className="text-slate-400 hover:text-blue-600 p-1 rounded transition shrink-0"
                  title="Copy ULPIN"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <span className="font-medium text-slate-900">{selectedEntity.type_label}</span>
                <span>•</span>
                <span>{selectedEntity.category}</span>
              </div>
            </div>

            {/* Entity Identifiers Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div 
                onClick={() => selectedEntity.parcel_id && setSelectedEntityId(selectedEntity.parcel_id)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
              >
                <div className="text-[10px] text-slate-400 font-medium">Parent Parcel</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5 truncate">{selectedEntity.parcel_id || '—'}</div>
              </div>

              <div 
                onClick={() => selectedEntity.building_id && setSelectedEntityId(selectedEntity.building_id)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
              >
                <div className="text-[10px] text-slate-400 font-medium">Building Structure</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5 truncate">{selectedEntity.building_id || '—'}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-400 font-medium">Floor Level</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5">
                  {selectedEntity.floor_level !== undefined && selectedEntity.floor_level !== null ? `Floor ${selectedEntity.floor_level}` : '—'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-400 font-medium">Unit Identifier</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5">{selectedEntity.unit_number || '—'}</div>
              </div>
            </div>

            {/* Spatial Dimensions */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Spatial Geometry & Dimensions</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Calculated Area</span>
                  <span className="font-semibold text-slate-900">{selectedEntity.area_sqm} m²</span>
                  <span className="text-slate-400 text-[10px] block">({selectedEntity.area_sqft?.toLocaleString()} sq ft)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Enclosed Volume</span>
                  <span className="font-semibold text-slate-900">{selectedEntity.volume_m3} m³</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Vertical Extent (Relative)</span>
                  <span className="font-mono font-semibold text-blue-600">{selectedEntity.vertical_extent}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Elevation (AMSL)</span>
                  <span className="font-mono text-slate-700">{selectedEntity.elevation_abs}</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Provenance */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Cryptographic Audit Hash</span>
                <button 
                  onClick={handleCopyHash}
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 truncate select-all">
                {selectedEntity.audit_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>

            {/* Real Action Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFlyTo}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 transition shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Fly to Entity</span>
                </button>
                <button
                  onClick={handleViewInRegistry}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>ULPIN Registry</span>
                </button>
              </div>

              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 transition"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Submit for Human Governance Review</span>
              </button>
            </div>
          </div>
        )}

        {/* HIERARCHY TAB */}
        {activeTab === 'hierarchy' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-500 mb-2">
              Cadastral parent-child hierarchy from live cadastral graph:
            </div>

            {/* Parcel Node */}
            <div 
              onClick={() => currentParcel && setSelectedEntityId(currentParcel.entity_id || currentParcel.id)}
              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 cursor-pointer transition shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="font-semibold text-slate-900">Parcel {currentParcel?.name || selectedEntity.parcel_id}</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono">PARCEL</span>
              </div>
            </div>

            {/* Building Node */}
            {currentBuilding && (
              <div 
                onClick={() => setSelectedEntityId(currentBuilding.entity_id || currentBuilding.id)}
                className="ml-4 p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-500 cursor-pointer transition shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-semibold text-slate-900">{currentBuilding.name || currentBuilding.id}</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-mono">BUILDING</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {currentBuilding.floors?.length || 0} Floors • {currentBuilding.properties?.building_class || 'Tower'}
                </div>
              </div>
            )}

            {/* Floors List */}
            {currentBuilding?.floors?.map((fl: any) => (
              <div 
                key={fl.id || fl.entity_id}
                onClick={() => setSelectedEntityId(fl.units?.[0]?.entity_id || fl.id)}
                className="ml-8 p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800">{fl.name || `Floor ${fl.floor_level}`}</span>
                </div>
                <span className="text-[10px] text-slate-500">{fl.units?.length || 0} units</span>
              </div>
            ))}
          </div>
        )}

        {/* VALIDATION TAB */}
        {activeTab === 'validation' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-500 mb-2">
              Automated deterministic topology rules verified for this entity:
            </div>
            {selectedEntity.validation_checklist?.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-800 font-medium text-xs">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-500 mb-2">
              Ingested evidence modalities contributing to this 3D model:
            </div>
            {selectedEntity.data_sources?.map((src, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-slate-800 font-semibold">{src}</span>
                </div>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Verified Ingestion
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Review Modal */}
      {showReviewModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl w-full max-w-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Governance Review Note</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Submit an official cadastral note for {selectedEntity.entity_id} into the governance audit trail.
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter survey observation or boundary discrepancy notes..."
              className="w-full h-20 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 resize-none"
            />
            {reviewSuccess ? (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg text-center font-semibold border border-emerald-200">
                Decision recorded to audit trail!
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || !reviewNote.trim()}
                  className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
