import {
  RefreshCw,
  LogOut,
  User,
  Database,
  Boxes,
  FlaskConical,
  SlidersHorizontal,
  ChevronDown,
  ListChecks,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import Logo from './Logo';

const SETTINGS_CHILDREN = [
  { id: 'settings/bre', name: 'BRE Signals', icon: ListChecks },
  { id: 'settings/ai', name: 'AI Setting', icon: Sparkles },
  { id: 'settings/security', name: 'ML Security', icon: ShieldCheck },
];

export default function SidebarNavbar({ activeView, setActiveView, onReset, user, onLogout, selectedSourcesCount = 0 }) {
  // Sidebar navigation items
  const sidebarItems = [
    { id: 'products', name: 'Data Sources', icon: Database },
    { id: 'model_hub', name: 'Model Hub', icon: Boxes, needsSource: true },
    { id: 'model_testing', name: 'Model Testing', icon: FlaskConical },
  ];

  const inSettings = activeView.startsWith('settings');

  return (
    <aside className="w-64 min-w-[16rem] max-w-[16rem] h-screen sticky top-0 bg-[#edeaf4] p-4 flex flex-col justify-between shrink-0 z-30 overflow-y-auto overflow-x-hidden">

      <div className="space-y-6">

        {/* Brand logo */}
        <div
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setActiveView('products')}
        >
          <Logo imgClassName="h-14 w-auto" />
          <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Training
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {sidebarItems.map((item) => {
            const isSelected = activeView === item.id;
            const Icon = item.icon;
            const locked = item.needsSource && selectedSourcesCount === 0;

            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                onClick={() => setActiveView(item.id)}
                title={locked ? 'Select a data source first' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  locked
                    ? 'opacity-40 cursor-not-allowed text-slate-500 font-semibold'
                    : isSelected
                    ? '-mr-4 bg-linear-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] text-white shadow-lg shadow-purple-950/30 font-bold cursor-pointer'
                    : 'text-slate-600 hover:bg-white/60 font-semibold cursor-pointer'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected && !locked ? 'bg-white/15 text-white' : 'bg-white text-[#3b0764] shadow-xs'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
                </span>
                <span className="text-sm truncate">{item.name}</span>
              </button>
            );
          })}

          {/* Settings — expandable group */}
          <button
            type="button"
            onClick={() => setActiveView(inSettings ? activeView : 'settings/bre')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all cursor-pointer ${
              inSettings
                ? 'text-[#3b0764] font-bold bg-white/70'
                : 'text-slate-600 hover:bg-white/60 font-semibold'
            }`}
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white text-[#3b0764] shadow-xs">
              <SlidersHorizontal className="w-4.5 h-4.5" strokeWidth={2.2} />
            </span>
            <span className="text-sm truncate flex-1">Settings</span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform ${inSettings ? 'rotate-180' : 'text-slate-400'}`}
              strokeWidth={2.2}
            />
          </button>

          {inSettings && (
            <div className="space-y-1.5">
              {SETTINGS_CHILDREN.map((c) => {
                const on = activeView === c.id;
                const ChildIcon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveView(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      on
                        ? '-mr-4 bg-linear-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] text-white shadow-lg shadow-purple-950/30 font-bold cursor-pointer'
                        : 'text-slate-600 hover:bg-white/60 font-semibold cursor-pointer'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        on ? 'bg-white/15 text-white' : 'bg-white text-[#3b0764] shadow-xs'
                      }`}
                    >
                      <ChildIcon className="w-4.5 h-4.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-sm truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

      </div>

      {/* Footer: identity + compact circular actions */}
      {user && (
        <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between gap-2">

          {/* Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#3b0764] shrink-0">
              <User className="w-4.5 h-4.5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 leading-tight">
              <span className="text-xs font-bold text-slate-800 block truncate">
                {user.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 block capitalize font-medium">
                {user.role || 'Admin'}
              </span>
            </div>
          </div>

          {/* Circular icon actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onReset}
              title="Reset Selection"
              aria-label="Reset Selection"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2.2} />
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Logout"
                aria-label="Logout"
                className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      )}

    </aside>
  );
}
