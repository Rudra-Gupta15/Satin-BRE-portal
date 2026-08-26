import React, { useState } from 'react';
import SidebarNavbar from './components/SidebarNavbar';
import OverviewDashboard from './components/OverviewDashboard';
import Page1Selection from './components/Page1Selection';
import Page2Pipeline from './components/Page2Pipeline';
import Page3Inference from './components/Page3Inference';
import AiArchitecture from './components/AiArchitecture';
import Settings from './components/Settings';
import DataDetailModal from './components/DataDetailModal';
import LoginPage from './components/LoginPage';
import { DATA_SOURCES } from './data/dataSources';

export default function App() {
  // User authentication state - persisted in localStorage to prevent HMR reset on code edits
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('bre_user');
      return savedUser ? JSON.parse(savedUser) : { email: 'ABCD@gmail.com', name: 'Credit Manager' };
    } catch (e) {
      return { email: 'ABCD@gmail.com', name: 'Credit Manager' };
    }
  });

  // Single active view state for Left Sidebar: 'overview' | 'products' | 'model_hub' | 'model_testing'
  const [activeView, setActiveView] = useState('overview');

  // Default: All 11 boxes UNSELECTED initially ([])
  const [selectedIds, setSelectedIds] = useState([]);
  const [inspectedSource, setInspectedSource] = useState(null);
  const [trainedModels, setTrainedModels] = useState([]);

  // Deployment & Version Management Shared State
  const [selectedVersionMap, setSelectedVersionMap] = useState({
    risk_model: "v3.4",
    cashflow_model: "v3.4",
    fraud_model: "v3.4",
    money_balance_model: "v3.4"
  });

  const [deployedStatusMap, setDeployedStatusMap] = useState({
    risk_model: "Deployed",
    cashflow_model: "Deployed",
    fraud_model: "Ready",
    money_balance_model: "Ready"
  });

  const handleReset = () => {
    setActiveView('overview');
    setSelectedIds([]); // Reset to all unselected
    setInspectedSource(null);
    setTrainedModels([]);
    setSelectedVersionMap({
      risk_model: "v3.4",
      cashflow_model: "v3.4",
      fraud_model: "v3.4",
      money_balance_model: "v3.4"
    });
    setDeployedStatusMap({
      risk_model: "Deployed",
      cashflow_model: "Deployed",
      fraud_model: "Ready",
      money_balance_model: "Ready"
    });
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('bre_user', JSON.stringify(userData));
    } catch (e) {}
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('bre_user');
    } catch (e) {}
    handleReset();
  };

  // If not logged in, show Satin Finserv Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f4effc] text-[#3b0764] flex flex-col md:flex-row font-sans selection:bg-[#3b0764] selection:text-white">

      {/* Left-Side Vertical Sidebar (Overview, Products, Model Hub, Model Testing) */}
      <SidebarNavbar
        activeView={activeView}
        setActiveView={setActiveView}
        selectedSourcesCount={selectedIds.length}
        onReset={handleReset}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Page Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4">

          {/* 1. Overview Dashboard */}
          {activeView === 'overview' && (
            <OverviewDashboard
              selectedCount={selectedIds.length}
              onGoToProducts={() => setActiveView('products')}
              onGoToModelHub={() => setActiveView('model_hub')}
            />
          )}

          {/* 2. Products (Select Data Sources - Page 1) */}
          {activeView === 'products' && (
            <Page1Selection
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onInspect={(src) => setInspectedSource(src)}
              onNext={() => setActiveView('model_hub')}
            />
          )}

          {/* 3. Model Hub (Train Models & Pipeline Studio - Page 2) */}
          {activeView === 'model_hub' && (
            <Page2Pipeline
              selectedIds={selectedIds}
              onNext={() => setActiveView('model_testing')}
              trainedModels={trainedModels}
              setTrainedModels={setTrainedModels}
              selectedVersionMap={selectedVersionMap}
              setSelectedVersionMap={setSelectedVersionMap}
              deployedStatusMap={deployedStatusMap}
              setDeployedStatusMap={setDeployedStatusMap}
            />
          )}

          {/* 4. Model Testing (Inference & Risk Analytics - Page 3) */}
          {activeView === 'model_testing' && (
            <Page3Inference
              selectedIds={selectedIds}
              trainedModels={trainedModels}
              selectedVersionMap={selectedVersionMap}
              deployedStatusMap={deployedStatusMap}
              onNavigateBack={() => setActiveView('products')}
              onReprocessPipeline={() => setActiveView('model_hub')}
            />
          )}

          {/* 5. AI Architecture Specifications */}
          {activeView === 'ai_architecture' && (
            <AiArchitecture />
          )}

          {/* 6. System Settings */}
          {activeView === 'settings' && (
            <Settings />
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-purple-200 bg-white/80 py-3 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Satin Finserv Limited — BRE AI Financial Risk & Underwriting Platform</span>
            <span className="font-mono text-[#3b0764] font-semibold">11 Data Vectors Integrated</span>
          </div>
        </footer>
      </div>

      {/* Inspection Modal */}
      {inspectedSource && (
        <DataDetailModal
          source={inspectedSource}
          onClose={() => setInspectedSource(null)}
        />
      )}

    </div>
  );
}
