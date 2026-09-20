import React from 'react';
import { CadastreProvider, useCadastre } from './store/CadastreContext';
import { Topbar } from './components/layout/Topbar';
import { Sidebar } from './components/layout/Sidebar';
import { CommandPalette } from './components/layout/CommandPalette';
import { CesiumViewer } from './components/cesium/CesiumViewer';
import { MapToolbar } from './components/cesium/MapToolbar';
import { LayerPanel } from './components/cesium/LayerPanel';
import { BasemapSwitcher } from './components/cesium/BasemapSwitcher';
import { PropertyDetailsPanel } from './components/panels/PropertyDetailsPanel';
import { EvidenceFusionDrawer } from './components/panels/EvidenceFusionDrawer';
import { BottomPipelineDock } from './components/panels/BottomPipelineDock';

import { RegistryView } from './components/views/RegistryView';
import { ValidationView } from './components/views/ValidationView';
import { ReviewQueueView } from './components/views/ReviewQueueView';
import { DataSourcesView } from './components/views/DataSourcesView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { AnalysisView } from './components/views/AnalysisView';

const MainLayout: React.FC = () => {
  const { activeView, isPropertyPanelOpen, selectedEntity } = useCadastre();

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-50 text-slate-800 select-none">
      {/* Universal Mission Control Topbar */}
      <Topbar />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {activeView === '3d_cadastre' ? (
            <div className="flex flex-1 overflow-hidden relative">
              {/* 3D Geospatial Map Canvas */}
              <div className="flex-1 relative overflow-hidden">
                <CesiumViewer />
                <MapToolbar />
                <LayerPanel />
                <BasemapSwitcher />
              </div>

              {/* Right Intelligence Property Inspector */}
              {isPropertyPanelOpen && selectedEntity && <PropertyDetailsPanel />}
            </div>
          ) : activeView === 'ulpin_registry' ? (
            <RegistryView />
          ) : activeView === 'validation' ? (
            <ValidationView />
          ) : activeView === 'review_queue' ? (
            <ReviewQueueView />
          ) : activeView === 'data_sources' ? (
            <DataSourcesView />
          ) : activeView === 'audit_trail' ? (
            <AuditTrailView />
          ) : activeView === 'analysis' ? (
            <AnalysisView />
          ) : (
            // Default Fallback to 3D workspace
            <div className="flex flex-1 overflow-hidden relative">
              <div className="flex-1 relative overflow-hidden">
                <CesiumViewer />
                <MapToolbar />
                <LayerPanel />
                <BasemapSwitcher />
              </div>
              {isPropertyPanelOpen && selectedEntity && <PropertyDetailsPanel />}
            </div>
          )}

          {/* Bottom Processing Pipeline Dock */}
          <BottomPipelineDock />
        </main>
      </div>

      {/* Global Evidence Fusion Drawer */}
      <EvidenceFusionDrawer />

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CadastreProvider>
      <MainLayout />
    </CadastreProvider>
  );
};
