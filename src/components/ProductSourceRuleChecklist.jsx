import { useEffect, useMemo, useState } from 'react';
import { Search, ToggleLeft, ToggleRight, RotateCcw, Loader2, Info } from 'lucide-react';
import { api } from '../api/client';

// Rule checklist for one (loan product × data source) pair. Catalogue is the
// data-source rule catalogue; enabled state is tracked per product.
// GET/PUT /bre-products/{productId}/sources/{sourceId}/rules
export default function ProductSourceRuleChecklist({ productId, sourceId }) {
  const [data, setData] = useState(null); // { rules:[{id,label,description}], enabled:{} }
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openInfo, setOpenInfo] = useState(() => new Set()); // rule ids showing their explanation

  const base = `/bre-products/${productId}/sources/${sourceId}/rules`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(base)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base]);

  const rules = data?.rules || [];
  const enabled = data?.enabled || {};
  const isOn = (id) => !!enabled[id];
  const activeCount = rules.reduce((n, r) => n + (isOn(r.id) ? 1 : 0), 0);

  const put = (body) =>
    api.put(base, body)
      .then((d) => setData((p) => (p ? { ...p, enabled: d.enabled } : p)))
      .catch(() => {});

  const toggle = (id) => {
    setData((p) => (p ? { ...p, enabled: { ...p.enabled, [id]: !isOn(id) } } : p));
    put({ enabled: { [id]: !isOn(id) } });
  };
  const setAll = (v) => put({ setAll: v });
  const reset = () => put({ reset: true });

  const toggleInfo = (id) =>
    setOpenInfo((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visible = useMemo(
    () => rules
      .map((r, i) => ({ ...r, n: i + 1 }))
      .filter((r) => !query || r.label.toLowerCase().includes(query.toLowerCase())),
    [rules, query],
  );

  const btn = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95';

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading rules…
      </div>
    );
  }

  if (!rules.length) {
    return (
      <div className="h-40 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
        <ToggleLeft className="w-6 h-6 text-slate-300" />
        <span>No BRE rules have been configured for this data source.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
          {activeCount} / {rules.length} Active
          <span className="text-slate-400 font-semibold"> · {rules.length - activeCount} off</span>
        </span>
        <div className="flex items-center gap-1.5">
          {(() => {
            const allOn = rules.length > 0 && activeCount === rules.length;
            return (
              <button
                type="button"
                onClick={() => setAll(!allOn)}
                className={`${btn} ${allOn
                  ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-[#3b0764] text-white hover:brightness-125'}`}
              >
                {allOn
                  ? <><ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Disable All</>
                  : <><ToggleRight className="w-3.5 h-3.5" /> Enable All</>}
              </button>
            );
          })()}
          <button type="button" onClick={reset} className={`${btn} bg-white border border-rose-200 text-rose-600 hover:bg-rose-50`}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

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

      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-[66vh] overflow-y-auto">
        {visible.map((r) => {
          const on = isOn(r.id);
          const info = openInfo.has(r.id);
          return (
            <div key={r.id} className="pl-4 pr-3 py-2.5 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="text-[10px] font-bold text-slate-300 tabular-nums w-5 text-right shrink-0">{r.n}</span>
                  <span className={`text-xs font-semibold truncate ${on ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                    {r.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.description && (
                    <button
                      type="button"
                      aria-label={`What does “${r.label}” check?`}
                      aria-expanded={info}
                      title="What does this rule check?"
                      onClick={() => toggleInfo(r.id)}
                      className={`grid place-items-center w-6 h-6 rounded-md border transition-colors cursor-pointer ${
                        info
                          ? 'border-purple-300 bg-purple-50 text-purple-700'
                          : 'border-slate-200 text-slate-400 hover:text-purple-600 hover:border-purple-200'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    role="switch"
                    onClick={() => toggle(r.id)}
                    aria-checked={on}
                    className={`relative inline-flex h-5.5 w-10 items-center rounded-full p-0.75 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/40 ${
                      on ? 'bg-linear-to-r from-[#4c1d95] to-[#6d28d9]' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full bg-white shadow-md ring-1 ring-slate-900/5 transition-transform duration-200 ease-out ${
                        on ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
              {info && r.description && (
                <p className="mt-1.5 ml-8 text-[11px] leading-relaxed text-slate-500">{r.description}</p>
              )}
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
