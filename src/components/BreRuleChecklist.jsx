import { useEffect, useMemo, useState } from 'react';
import { Search, ToggleLeft, ToggleRight, RotateCcw, Loader2 } from 'lucide-react';
import { api } from '../api/client';

// Per-product BRE rule checklist. Catalogue + enabled state come from the
// backend (GET /bre-products); toggles PUT back. These rules are real — the
// Model Testing "BRE payload" tab evaluates the active product's enabled set
// against the uploaded statement.
export default function BreRuleChecklist({ productId }) {
  const [product, setProduct] = useState(null); // { id, name, rules:[{id,label,serious}], enabled:{} }
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = () =>
    api.get('/bre-products')
      .then((d) => setProduct((d.products || []).find((p) => p.id === productId) || null))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));

  useEffect(() => { setLoading(true); load(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rules = product?.rules || [];
  const enabled = product?.enabled || {};
  const isOn = (id) => !!enabled[id];
  const activeCount = rules.reduce((n, r) => n + (isOn(r.id) ? 1 : 0), 0);
  const externalCount = rules.reduce((n, r) => n + (r.computable === false ? 1 : 0), 0);

  const put = (body) =>
    api.put(`/bre-products/${productId}/rules`, body)
      .then((d) => setProduct((p) => (p ? { ...p, enabled: d.enabled } : p)))
      .catch(() => {});

  const toggle = (id) => {
    setProduct((p) => (p ? { ...p, enabled: { ...p.enabled, [id]: !isOn(id) } } : p)); // optimistic
    put({ enabled: { [id]: !isOn(id) } });
  };
  const setAll = (v) => put({ setAll: v });
  const reset = () => put({ reset: true });

  const visible = useMemo(
    () => rules
      .map((r, i) => ({ ...r, n: i + 1 }))
      .filter((r) => !query || r.label.toLowerCase().includes(query.toLowerCase())),
    [rules, query],
  );

  const btn = 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95';

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading rules…
      </div>
    );
  }
  if (!product) {
    return <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No rule catalogue for this product.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
          {activeCount} / {rules.length} Rules Active
          <span className="text-slate-400 font-semibold"> · {externalCount} need an external feed</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setAll(true)} className={`${btn} bg-[#3b0764] text-white hover:brightness-125`}>
            <ToggleRight className="w-3.5 h-3.5" /> Enable All
          </button>
          <button type="button" onClick={() => setAll(false)} className={`${btn} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50`}>
            <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Disable All
          </button>
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

      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[42vh] overflow-y-auto">
        {visible.map((r) => {
          const on = isOn(r.id);
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right shrink-0">{r.n}</span>
                <span className={`text-xs font-semibold truncate ${on ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                  {r.label}
                </span>
                {r.serious && <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 shrink-0">KEY</span>}
                {r.computable === false && (
                  <span
                    className="text-[8px] font-black text-slate-500 bg-slate-100 border border-slate-200 rounded px-1 shrink-0"
                    title="Needs an external feed (bureau / GST portal / property / asset docs) — evaluates to N/A"
                  >
                    EXT
                  </span>
                )}
              </div>
              <button
                type="button"
                role="switch"
                onClick={() => toggle(r.id)}
                aria-checked={on}
                className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full p-0.75 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/40 ${
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
          );
        })}
        {visible.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-slate-400">No rules match “{query}”.</div>
        )}
      </div>
    </div>
  );
}
