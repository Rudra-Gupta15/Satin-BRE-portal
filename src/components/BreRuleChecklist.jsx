import { useMemo, useState } from 'react';
import { Search, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react';
import { BRE_RULES_BY_PRODUCT, rulesForProduct } from '../data/breRulesByProduct';

const LS_KEY = 'bre_rules_enabled_by_product';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
function saveStore(s) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* localStorage unavailable */
  }
}

// Per-product BRE rule checklist. Rules default to ON; toggle state is kept per
// product in localStorage. Frontend-only — not wired to the evaluation engine.
export default function BreRuleChecklist({ productId }) {
  const rules = useMemo(() => rulesForProduct(productId), [productId]);
  const hasTemplate = !!BRE_RULES_BY_PRODUCT[productId];

  const [store, setStore] = useState(loadStore);
  const [query, setQuery] = useState('');

  const enabled = store[productId] || {};
  const isOn = (i) => enabled[i] !== false;

  const commit = (nextForProduct) => {
    const next = { ...store, [productId]: nextForProduct };
    setStore(next);
    saveStore(next);
  };
  const toggle = (i) => commit({ ...enabled, [i]: !isOn(i) });
  const setAll = (val) => commit(Object.fromEntries(rules.map((_, i) => [i, val])));
  const reset = () => commit({});

  const activeCount = rules.reduce((n, _, i) => n + (isOn(i) ? 1 : 0), 0);
  const visible = rules
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !query || name.toLowerCase().includes(query.toLowerCase()));

  const btn =
    'px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1';

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
          {activeCount} / {rules.length} Rules Active
          <span className="text-slate-400 font-semibold"> ({rules.length - activeCount} off)</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setAll(true)} className={`${btn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
            <ToggleRight className="w-3.5 h-3.5 text-purple-600" /> Enable All
          </button>
          <button type="button" onClick={() => setAll(false)} className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
            <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Disable All
          </button>
          <button type="button" onClick={reset} className={`${btn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {!hasTemplate && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          No dedicated rule set for this product yet — showing a generic template.
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${rules.length} rules…`}
          className="w-full bg-slate-50/40 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#ea580c]"
        />
      </div>

      {/* Rule list */}
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[42vh] overflow-y-auto">
        {visible.map(({ name, i }) => {
          const on = isOn(i);
          return (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                <span className={`text-xs font-semibold truncate ${on ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={on}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                  on ? 'bg-[#3b0764]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-slate-400">No rules match “{query}”.</div>
        )}
      </div>
    </div>
  );
}
