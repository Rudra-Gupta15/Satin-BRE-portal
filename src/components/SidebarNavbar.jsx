import React from 'react';
import { RefreshCw, LogOut, User } from 'lucide-react';

export default function SidebarNavbar({ activeView, setActiveView, onReset, user, onLogout }) {
  // 4 Navigation Items for the Left Sidebar
  const sidebarItems = [
    { id: 'overview', name: "Overview", desc: "Data Feeds & Vector Status" },
    { id: 'products', name: "Products", desc: "Selected Data Products" },
    { id: 'model_hub', name: "Model Hub", desc: "Process Studio & Training" },
    { id: 'model_testing', name: "Model Testing", desc: "Inference & Risk Analytics" },
  ];

  return (
    <aside className="w-64 min-w-[16rem] max-w-[16rem] h-screen sticky top-0 bg-white border-r border-purple-100 p-4 shadow-sm flex flex-col justify-between shrink-0 z-30 overflow-y-auto">
      
      <div className="space-y-6">
        
        {/* Top Branding Card matching Satin Finserv Logo */}
        <div 
          className="w-full border border-purple-100 rounded-2xl bg-linear-to-b from-purple-50/60 to-white p-3.5 shadow-xs text-center space-y-1 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => setActiveView('overview')}
        >
          {/* Top Line: SFL Logo Text */}
          <span className="text-2.5xl font-black italic tracking-wider bg-linear-to-r from-rose-500 via-amber-500 to-purple-900 bg-clip-text text-transparent block group-hover:scale-105 transition-transform">
            SFL
          </span>
          {/* Bottom Line: Satin Finserv Limited */}
          <span className="text-xs font-extrabold text-[#3b0764] italic block tracking-tight">
            Satin Finserv Limited
          </span>
        </div>

        {/* Section Title */}
        <div className="px-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            MAIN NAVIGATION
          </span>
          <h3 className="text-sm font-extrabold text-[#3b0764] mt-0.5">
            Satin BRE Portal
          </h3>
        </div>

        {/* 4 Sidebar Menu Items */}
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const isSelected = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full px-4 py-3 rounded-2xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#3b0764] text-white shadow-md shadow-purple-950/20 font-bold ring-1 ring-purple-800'
                    : 'text-slate-700 hover:text-[#3b0764] hover:bg-purple-50/80 font-semibold'
                }`}
              >
                <span className="text-xs block truncate font-bold">{item.name}</span>
                <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                  {item.desc}
                </span>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Sidebar Footer User Info */}
      <div className="pt-4 border-t border-purple-100 space-y-3">
        {user && (
          <div className="flex items-center space-x-2.5 p-2.5 bg-purple-50/70 rounded-xl border border-purple-100">
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-[#3b0764] font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-bold text-[#3b0764] block truncate">
                {user.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 block capitalize font-medium">{user.role || 'Admin'}</span>
            </div>
          </div>
        )}

        {/* Equal 50%-50% Width Reset & Logout Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onReset}
            title="Reset Selection"
            className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#3b0764] border border-purple-200 transition-colors text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

    </aside>
  );
}
