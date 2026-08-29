import { useEffect, useState } from 'react';
import { Check, ArrowRight, ArrowDownRight, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import BreRuleChecklist from './BreRuleChecklist';

export default function Page1Selection({ selectedIds, setSelectedIds, onNext, onInspect }) {
  const [sourcesList, setSourcesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBREModalOpen, setIsBREModalOpen] = useState(false);
  const [breTab, setBreTab] = useState('product');
  const [loanProducts, setLoanProducts] = useState([
    { id: 'lap_sbl', name: 'LAP / SBL', desc: 'Loan against property / secured business loan for self-employed borrowers and SMEs.' },
    { id: 'machine', name: 'Machine Loan', desc: 'Term financing for plant, machinery and equipment purchases.' },
    { id: 'vehicle', name: 'Vehicle Loan', desc: 'Financing for new and used passenger and commercial vehicles.' },
    { id: 'msme', name: 'MSME Loan', desc: 'Working-capital and growth funding for micro, small & medium enterprises.' },
  ]);
  const [newLoanName, setNewLoanName] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFields, setNewFields] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLoanProduct = (e) => {
    if (e) e.preventDefault();
    const name = newLoanName.trim();
    if (!name) return;
    setLoanProducts((prev) => [
      ...prev,
      { id: `loan-${Date.now()}`, name, desc: 'Custom loan product added by user.' },
    ]);
    setNewLoanName('');
  };

  const selectLoan = (id) => {
    setSelectedLoan((prev) => {
      const next = prev === id ? null : id;
      // Tell the backend which product the Model Testing BRE tab should evaluate.
      api.put('/bre-products/active', { productId: next }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    api.get('/data-sources')
      .then((data) => setSourcesList(data.dataSources))
      .finally(() => setIsLoading(false));
  }, []);

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

  // "Apply" from the BRE dialog → Model Hub. Make sure at least one data source
  // is selected (default: Account Aggregator bank statement) so the upload
  // section actually shows there.
  const applyAndGoToModelHub = () => {
    if (selectedIds.length === 0) {
      persistSelection(['account_aggregator']);
    }
    setIsBREModalOpen(false);
    onNext();
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
              </div>

              {/* Fixed footer — always at the bottom of the card, regardless of description length */}
              <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBREModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-linear-to-br from-[#2e1065] via-[#4c1d95] to-[#6d28d9] shadow-sm shadow-purple-950/20 hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1"
                >
                  <span>BRE Rule Training</span>
                </button>

                {/* Select this source (if not already) and continue to Model Hub */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelected) toggleSource(source.id);
                    onNext();
                  }}
                  title="Use this source & continue to Model Hub"
                  className="w-7 h-7 rounded-full btn-orange text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <ArrowDownRight className="w-4 h-4" />
                </button>
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

      {/* BRE Rule Training Modal */}
      {isBREModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 rounded-t-3xl shrink-0">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">BRE Rule Training</h2>
                <p className="text-xs text-slate-500">Underwriting &amp; Decisioning Rules Configuration</p>
              </div>
              <button
                onClick={() => setIsBREModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switcher + Apply */}
            <div className="flex items-center justify-between gap-3 px-6 pt-4 shrink-0">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {[
                  { id: 'product', label: 'Product' },
                  { id: 'rules', label: 'BRE Rules' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setBreTab(tab.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      breTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {breTab === 'product' ? (
                <button
                  type="button"
                  disabled={!selectedLoan}
                  onClick={() => { if (selectedLoan) setBreTab('rules'); }}
                  title={selectedLoan ? '' : 'Select a loan product first'}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedLoan
                      ? 'btn-orange text-white shadow-md shadow-orange-900/15 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Apply BRE Rules</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyAndGoToModelHub}
                  className="px-5 py-2 rounded-xl text-xs font-bold btn-orange text-white shadow-md shadow-orange-900/15 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-3" />
                  <span>Apply</span>
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto p-4 pb-6 rounded-b-3xl"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {breTab === 'product' && (
                <div className="space-y-4 px-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLoanName}
                      onChange={(e) => setNewLoanName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLoanProduct();
                        }
                      }}
                      placeholder="Add a loan product e.g. Tractor Loan, Overdraft, Credit Card Loan..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#ea580c] bg-slate-50/30"
                    />
                    <button
                      type="button"
                      onClick={() => addLoanProduct()}
                      className="px-4 py-2 rounded-xl text-xs font-bold btn-orange text-white shadow-md shadow-orange-900/15 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-500 px-1">
                    Select a loan product to configure its BRE rules.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {loanProducts.map((p) => {
                      const isSel = selectedLoan === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => selectLoan(p.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSel
                              ? 'border-[#ea580c] bg-white ring-2 ring-[#fdba74] shadow-md shadow-slate-900/10'
                              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <h4 className={`text-sm font-bold ${isSel ? 'text-slate-900' : 'text-slate-800'}`}>
                            {p.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="pt-2 text-[11px] text-slate-400">
                    {selectedLoan
                      ? 'Press “Apply BRE Rules” above to configure rules for this product.'
                      : 'Select a loan product to continue.'}
                  </p>
                </div>
              )}

              {breTab === 'rules' && (
                <div className="space-y-3 px-2">
                  {selectedLoan ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                        <span className="text-[11px] font-bold text-slate-800">Rules for:</span>
                        <span className="text-[11px] font-semibold text-purple-800 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                          {loanProducts.find((p) => p.id === selectedLoan)?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBreTab('product')}
                          className="ml-auto text-[11px] font-semibold text-purple-700 hover:underline cursor-pointer"
                        >
                          Change product
                        </button>
                      </div>
                      <BreRuleChecklist productId={selectedLoan} />
                    </>
                  ) : (
                    <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-500">
                      Pick a loan product on the{' '}
                      <button
                        type="button"
                        onClick={() => setBreTab('product')}
                        className="font-bold text-purple-700 hover:underline"
                      >
                        Product
                      </button>{' '}
                      tab to see its BRE rules.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

