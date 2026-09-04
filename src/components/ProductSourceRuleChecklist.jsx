import { useEffect, useMemo, useState } from 'react';
import { Search, ToggleLeft, ToggleRight, RotateCcw, Loader2, Info, Pencil, Plus, X } from 'lucide-react';
import { api } from '../api/client';

// Rule checklist for one (loan product × data source) pair. Catalogue is the
// data-source rule catalogue; enabled state is tracked per product.
// GET/PUT /bre-products/{productId}/sources/{sourceId}/rules
export default function ProductSourceRuleChecklist({ productId, sourceId }) {
  const [data, setData] = useState(null); // { rules:[{id,label,description}], enabled:{} }
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openInfo, setOpenInfo] = useState(() => new Set()); // rule ids showing their explanation
  const [editing, setEditing] = useState(null); // rule being edited via the pencil icon, or null
  const [adding, setAdding] = useState(false); // "+ Signal" modal open?
  const [saving, setSaving] = useState(false);

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

  const saveEdit = async ({ label, threshold, description }) => {
    setSaving(true);
    try {
      await api.put(`${base}/${editing.id}`, { label, threshold, description });
      setData((p) => (p ? {
        ...p,
        rules: p.rules.map((r) => (r.id === editing.id ? { ...r, label, threshold, description } : r)),
      } : p));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const saveNewRule = async ({ label, threshold, description }) => {
    setSaving(true);
    try {
      const d = await api.post(base, { label, threshold, description });
      setData(d);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

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
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${btn} btn-orange text-white shadow-md shadow-orange-900/15`}
          >
            <Plus className="w-3.5 h-3.5" /> Signal
          </button>
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
                  {r.threshold && (
                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-1.5 py-0.5 whitespace-nowrap shrink-0">
                      {r.threshold}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={`Edit “${r.label}”`}
                    title="Edit rule / threshold"
                    onClick={() => setEditing(r)}
                    className="grid place-items-center w-6 h-6 rounded-md border border-slate-200 text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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

      {editing && (
        <RuleFormModal
          title="Edit Rule"
          initial={editing}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
      {adding && (
        <RuleFormModal
          title="Add Signal"
          initial={null}
          saving={saving}
          onCancel={() => setAdding(false)}
          onSave={saveNewRule}
        />
      )}
    </div>
  );
}

// Shared form for editing an existing rule (pencil icon) or adding a brand-new
// custom rule ("+ Signal") — same fields either way: name, threshold, explanation.
function RuleFormModal({ title, initial, saving, onCancel, onSave }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [threshold, setThreshold] = useState(initial?.threshold || '');
  const [description, setDescription] = useState(initial?.description || '');
  const canSave = label.trim().length > 0 && !saving;

  const inputCls = 'w-full bg-slate-50/40 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#ea580c]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Rule Name</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Minimum Monthly Credit Rule" className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Threshold</label>
            <input type="text" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="e.g. ≥ ₹15,000" className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Explanation (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this rule check?" rows={3} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave({ label: label.trim(), threshold: threshold.trim(), description: description.trim() })}
            className="px-4 py-2 rounded-xl btn-orange text-white text-xs font-bold shadow-md shadow-orange-900/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
