import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Loader2, ScrollText, Database } from 'lucide-react';
import { api } from '../api/client';
import ProductSourceRuleChecklist from './ProductSourceRuleChecklist';

// Settings › BRE Rule Setting.
//   products menu  →  data-source menu (per product)  →  rule checklist (product × source)
export default function BreProductSettings() {
  const [products, setProducts] = useState(null);
  const [pid, setPid] = useState(null);
  const [sources, setSources] = useState(null);
  const [sid, setSid] = useState(null);

  useEffect(() => {
    api.get('/bre-products')
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]));
  }, []);

  const openProduct = (id) => {
    setPid(id);
    setSid(null);
    setSources(null);
    api.put('/bre-products/active', { productId: id }).catch(() => {});
    api.get(`/bre-products/${id}/sources`)
      .then((d) => setSources(d.sources || []))
      .catch(() => setSources([]));
  };

  const toggleSourceActive = (sourceId, next) => {
    setSources((prev) => prev?.map((s) => (s.id === sourceId ? { ...s, sourceActive: next } : s)));
    api.put(`/bre-products/${pid}/sources/${sourceId}/active`, { active: next }).catch(() => {});
  };

  const product = products?.find((p) => p.id === pid);

  const BackLink = ({ label, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );

  const Card = ({ icon: Icon, title, subtitle, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-4 text-left border border-slate-200 rounded-2xl bg-white shadow-sm px-5 py-4 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer"
    >
      <span className="grid place-items-center w-10 h-10 rounded-xl bg-purple-50 text-purple-700 shrink-0 group-hover:bg-purple-100 transition-colors">
        <Icon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        {subtitle != null && <span className="block text-[11px] text-slate-500 mt-0.5">{subtitle}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );

  if (!products) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading products…
      </div>
    );
  }

  // ── Level 3: rule checklist for (product × data source) ──────────────────
  if (pid && sid) {
    const src = sources?.find((s) => s.id === sid);
    return (
      <div className="space-y-5">
        <BackLink label={product?.name || 'Data sources'} onClick={() => setSid(null)} />
        <div className="border-b border-slate-200 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600">
            {product?.name}
          </p>
          <h2 className="text-base font-bold text-slate-900 mt-1">{src?.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {src?.ruleCount ?? 0} rules — the enabled set applies to {product?.name} underwriting.
          </p>
        </div>
        <ProductSourceRuleChecklist productId={pid} sourceId={sid} />
      </div>
    );
  }

  // ── Level 2: data sources inside a product ──────────────────────────────
  if (pid) {
    return (
      <div className="space-y-5">
        <BackLink label="Products" onClick={() => setPid(null)} />
        <div className="border-b border-slate-200 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600">
            BRE Rule Setting
          </p>
          <h2 className="text-base font-bold text-slate-900 mt-1">{product?.name}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick a data source to configure its rules for this product.
          </p>
        </div>

        {!sources ? (
          <div className="py-12 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading data sources…
          </div>
        ) : (
          <div className="space-y-2.5">
            {sources.map((s) => {
              const on = !!s.sourceActive;
              const openable = s.ruleCount > 0;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center gap-4 border rounded-2xl bg-white shadow-sm px-5 py-4 transition-all ${
                    on ? 'border-slate-200 hover:border-purple-200 hover:shadow-md' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-purple-50 text-purple-700 shrink-0">
                    <Database className="w-5 h-5" />
                  </span>

                  <button
                    type="button"
                    onClick={() => openable && setSid(s.id)}
                    disabled={!openable}
                    className={`min-w-0 flex-1 text-left ${openable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="block text-sm font-bold text-slate-900">{s.title}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {s.ruleCount
                        ? <><span className="font-bold text-slate-700">{s.active}</span> of {s.ruleCount} rules active</>
                        : 'No rules yet'}
                    </span>
                  </button>

                  {/* Use this data source for this product (independent per product) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleSourceActive(s.id, !on)}
                    title={on ? `Disable ${s.title} for ${product?.name}` : `Enable ${s.title} for ${product?.name}`}
                    className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full p-0.75 transition-colors cursor-pointer ${
                      on ? 'bg-linear-to-r from-[#4c1d95] to-[#6d28d9]' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full bg-white shadow-md ring-1 ring-slate-900/5 transition-transform ${on ? 'translate-x-4.5' : 'translate-x-0'}`} />
                  </button>

                  {openable && (
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Level 1: products ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-purple-600">
          BRE Rule Setting
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-1">Products</h1>
        <p className="text-xs text-slate-500 mt-1">Pick a loan product to configure its BRE rules.</p>
      </div>
      <div className="space-y-2.5">
        {products.map((p) => (
          <Card key={p.id} icon={ScrollText} title={p.name} onClick={() => openProduct(p.id)} />
        ))}
      </div>
    </div>
  );
}
