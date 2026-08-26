import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  Sliders,
  Check,
  Key,
  Search,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Filter,
  Sparkles,
  Loader2
} from 'lucide-react';
import { api } from '../api/client';

export default function Settings() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enabledRules, setEnabledRules] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.get('/settings/rules')
      .then((data) => {
        setCategories(data.categories);
        setEnabledRules(data.enabledRules);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleRule = async (ruleId) => {
    setEnabledRules(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
    try {
      const data = await api.put(`/settings/rules/${ruleId}/toggle`);
      setEnabledRules(prev => ({ ...prev, [ruleId]: data.enabled }));
    } catch {
      /* optimistic update already applied */
    }
  };

  const handleEnableAll = async () => {
    const data = await api.post('/settings/rules/set-all', { enabled: true });
    setEnabledRules(data.enabledRules);
  };

  const handleDisableAll = async () => {
    const data = await api.post('/settings/rules/set-all', { enabled: false });
    setEnabledRules(data.enabledRules);
  };

  const handleResetDefaults = async () => {
    const data = await api.post('/settings/rules/reset');
    setEnabledRules(data.enabledRules);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    await api.post('/settings/save');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Filter categories and rules
  const filteredCategories = categories.map(cat => {
    if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
      return null;
    }

    const matchingRules = cat.rules.filter(rule => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.condition.toLowerCase().includes(q) ||
        rule.signal.toLowerCase().includes(q)
      );
    });

    if (matchingRules.length === 0) return null;

    return {
      ...cat,
      rules: matchingRules
    };
  }).filter(Boolean);

  const totalRulesCount = categories.reduce((acc, cat) => acc + cat.rules.length, 0);
  const activeRulesCount = Object.values(enabledRules).filter(Boolean).length;

  const getSignalBadgeStyle = (signal) => {
    const s = signal.toLowerCase();
    if (s.includes('strong') || s.includes('positive') || s.includes('stable')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('high risk') || s.includes('risk') || s.includes('negative') || s.includes('bounce') || s.includes('stacking')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (s.includes('investigate') || s.includes('medium')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full text-xs font-mono text-purple-900 font-bold mb-2">
            <span>BRE Rule Engine Settings</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#3b0764]">
            Underwriting & Decisioning Rules Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure all 15 Rule Categories and toggle individual risk signals for automated credit decisioning.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white transition-all flex items-center space-x-2 shadow-md shadow-purple-950/20 cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 stroke-3 text-emerald-400" />
                <span>Configuration Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Rules ({activeRulesCount} Active)</span>
              </>
            )}
          </button>
        </div>
      </div>



      {/* 2. Rule Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Active Rules Counter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#3b0764] bg-purple-100 border border-purple-200 px-3 py-1 rounded-xl">
              {activeRulesCount} / {totalRulesCount} Rules Active
            </span>
            <span className="text-xs text-slate-500">
              ({totalRulesCount - activeRulesCount} Disabled)
            </span>
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEnableAll}
              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#3b0764] text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <ToggleRight className="w-3.5 h-3.5 text-purple-600" />
              <span>Enable All</span>
            </button>

            <button
              onClick={handleDisableAll}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Disable All</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Defaults</span>
            </button>
          </div>

        </div>

        {/* Search & Category Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-purple-50">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search 15 rule categories, conditions, or signal types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-purple-50/40 border border-purple-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-[#3b0764] focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-purple-50/40 border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 cursor-pointer"
            >
              <option value="all">All 15 Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Render All 15 Rule Categories */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-purple-700 text-xs font-bold gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading underwriting rules...</span>
        </div>
      ) : (
      <div className="space-y-6">
        {filteredCategories.map((category) => {
          const categoryRulesCount = category.rules.length;
          const categoryActiveCount = category.rules.filter(r => enabledRules[r.id]).length;

          return (
            <div key={category.id} className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs space-y-4">
              
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#3b0764]">
                    {category.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{category.desc}</p>
                </div>

                <span className="text-[11px] font-mono font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 shrink-0">
                  {categoryActiveCount} / {categoryRulesCount} Active
                </span>
              </div>

              {/* Rules Grid Table */}
              <div className="divide-y divide-purple-50">
                {category.rules.map((rule) => {
                  const isEnabled = enabledRules[rule.id] !== false;

                  return (
                    <div key={rule.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/30 px-2 rounded-xl transition-colors">
                      
                      {/* Rule Name & Condition */}
                      <div className="space-y-0.5 max-w-xl">
                        <span className={`text-xs font-bold block ${isEnabled ? 'text-[#3b0764]' : 'text-slate-400 line-through'}`}>
                          {rule.name}
                        </span>
                        <p className="text-[11px] text-slate-600 font-mono">
                          {rule.condition}
                        </p>
                      </div>

                      {/* Right Aligned Controls: Uniform Signal Badge & ON/OFF Switch */}
                      <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end">
                        
                        {/* Uniform Signal Tag Box (Fixed Width: w-28, Centered Text, Aligned in Straight Line) */}
                        <span className={`w-28 inline-block text-center text-[10px] font-mono font-extrabold py-0.5 rounded-md border ${getSignalBadgeStyle(rule.signal)}`}>
                          {rule.signal}
                        </span>

                        {/* ON/OFF Toggle Switch */}
                        <div className="flex items-center space-x-3">
                          <span className={`text-xs font-mono font-bold w-7 text-right ${isEnabled ? 'text-purple-900' : 'text-slate-400'}`}>
                            {isEnabled ? 'ON' : 'OFF'}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleRule(rule.id)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-[#3b0764]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
      )}

    </div>
  );
}
