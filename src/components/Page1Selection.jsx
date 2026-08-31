import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import ProductSourceRuleChecklist from './ProductSourceRuleChecklist';

const STATUS_LABEL = {
  published: 'Published',
  unpublished: 'Unpublished',
  draft: 'Draft',
};

const STATUS_BADGE = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  unpublished: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function Page1Selection({ selectedIds, setSelectedIds, onNext }) {
  const [sourcesList, setSourcesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rulesSource, setRulesSource] = useState(null);
  const [rulesProduct, setRulesProduct] = useState(null); // product tab inside the popup
  const [statuses, setStatuses] = useState({});
  const [usage, setUsage] = useState({});          // { sourceId: { productId: bool } }
  const [productNames, setProductNames] = useState({});
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFields, setNewFields] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/data-sources')
      .then((data) => setSourcesList(data.dataSources))
      .finally(() => setIsLoading(false));
    api.get('/data-sources/status')
      .then((d) => setStatuses(d.statuses || {}))
      .catch(() => {});
    api.get('/bre-products/source-usage')
      .then((d) => { setUsage(d.usage || {}); setProductNames(d.productNames || {}); })
      .catch(() => {});
  }, []);

  const statusOf = (id) => statuses[id] || 'unpublished';

  const productList = useMemo(() => Object.entries(productNames).map(([id, name]) => ({ id, name })), [productNames]);

  const openRules = (source) => {
    setRulesSource(source);
    const u = usage[source.id] || {};
    const firstActive = productList.find((p) => u[p.id])?.id;
    setRulesProduct(firstActive || productList[0]?.id || null);
  };

  // "use this data source for the selected product" — same state as Settings › BRE Rule Setting
  const toggleRulesSourceActive = (next) => {
    if (!rulesSource || !rulesProduct) return;
    setUsage((prev) => ({
      ...prev,
      [rulesSource.id]: { ...(prev[rulesSource.id] || {}), [rulesProduct]: next },
    }));
    api.put(`/bre-products/${rulesProduct}/sources/${rulesSource.id}/active`, { active: next }).catch(() => {});
  };

  const persistSelection = (ids) => {
    setSelectedIds(ids);
    api.put('/data-sources/selection', { selectedIds: ids }).catch(() => {});
  };

  const toggleSource = (id) => {
    if (selectedIds.includes(id)) {
      persistSelection(selectedIds.filter(item => item !== id));
    } else {
      persistSelection([...selectedIds, id]);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const data = await api.post('/data-sources', {
        title: newTitle.trim(),
        desc: newDesc.trim(),
        fields: newFields,
      });
      const newSource = data.dataSource;
      setSourcesList((prev) => [...prev, newSource]);
      persistSelection([...selectedIds, newSource.id]);
      setNewTitle('');
      setNewDesc('');
      setNewFields('');
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto relative">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Sources</h1>
          <p className="text-xs text-slate-500 mt-1">
            {sourcesList.length} financial data feeds powering feature aggregation & underwriting risk models.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold btn-orange text-white shadow-md shadow-orange-900/15 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Data Source</span>
          </button>
        </div>
      </div>

      {/* Data Source Box Grid */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-purple-700 text-xs font-bold gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading data sources...</span>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sourcesList.map((source) => {
          const isSelected = selectedIds.includes(source.id);

          return (
            <div
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`relative p-4 rounded-2xl border cursor-pointer transition-all min-h-40 flex flex-col ${
                isSelected
                  ? 'border-[#ea580c] bg-white shadow-md shadow-slate-900/10 ring-2 ring-[#fdba74]'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="space-y-1.5">
                <h3 className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                  {source.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {source.shortDesc}
                </p>

                {/* Per-product usage — reflects the toggles in Settings › BRE Rule Setting */}
                {usage[source.id] && Object.keys(usage[source.id]).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-0.5">Used by</span>
                    {Object.entries(usage[source.id]).map(([p, on]) => (
                      <span
                        key={p}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          on
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        {productNames[p] || p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed footer — always at the bottom of the card, regardless of description length */}
              <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openRules(source);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-linear-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] shadow-sm shadow-purple-950/20 hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Data Source Rule</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Publish status (read-only — set from the Model Hub footer) */}
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${STATUS_BADGE[statusOf(source.id)]}`}
                  >
                    {STATUS_LABEL[statusOf(source.id)]}
                  </span>

                  {/* Use this source & continue to Model Hub (upload card focuses on it) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSelected) toggleSource(source.id);
                      onNext(source.id);
                    }}
                    title="Upload data for this source in Model Hub"
                    className="w-7 h-7 rounded-full btn-orange text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Add New Data Source</h2>
                <p className="text-xs text-slate-500">Configure a custom financial feed for feature aggregation</p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Data Source / Feed Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. CIBIL Bureau Score Feed or Customs Port Ingestion"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#ea580c] bg-slate-50/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief summary of data payload, update frequency, and source details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#ea580c] bg-slate-50/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Sample Feature Fields (Comma separated)
                </label>
                <input
                  type="text"
                  value={newFields}
                  onChange={(e) => setNewFields(e.target.value)}
                  placeholder="e.g. bureau_score, active_loans_count, dpd_30_flag"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#ea580c] bg-slate-50/30"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold btn-orange text-white shadow-md shadow-orange-900/15 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add & Select Product'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Data Source Rule popup */}
      {rulesSource && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setRulesSource(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-xl max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-slate-200 shrink-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600">
                    BRE Rules
                  </p>
                  <h2 className="text-base font-extrabold text-slate-800 leading-snug mt-0.5">
                    {rulesSource.title}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rules are configured per loan product — the same toggles as Settings › BRE Rule Setting.
                  </p>
                </div>
                <button
                  onClick={() => setRulesSource(null)}
                  className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {productList.map((p) => {
                  const on = !!(usage[rulesSource.id] || {})[p.id];
                  const sel = rulesProduct === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRulesProduct(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                        sel
                          ? 'bg-[#3b0764] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${on ? (sel ? 'bg-emerald-300' : 'bg-emerald-500') : (sel ? 'bg-white/40' : 'bg-slate-300')}`} />
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Use this source for the selected product */}
              {rulesProduct && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    Use <span className="text-purple-700">{rulesSource.title}</span> for {productNames[rulesProduct]}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!(usage[rulesSource.id] || {})[rulesProduct]}
                    onClick={() => toggleRulesSourceActive(!(usage[rulesSource.id] || {})[rulesProduct])}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full p-0.75 transition-colors cursor-pointer ${
                      (usage[rulesSource.id] || {})[rulesProduct]
                        ? 'bg-linear-to-r from-[#4c1d95] to-[#6d28d9]'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full bg-white shadow-md ring-1 ring-slate-900/5 transition-transform ${
                      (usage[rulesSource.id] || {})[rulesProduct] ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {rulesProduct
                ? <ProductSourceRuleChecklist productId={rulesProduct} sourceId={rulesSource.id} />
                : <p className="text-xs text-slate-400 text-center py-8">No loan products available.</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

