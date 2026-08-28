import { useEffect, useState } from 'react';
import { Check, ArrowRight, ArrowDownRight, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import Settings from './Settings';

export default function Page1Selection({ selectedIds, setSelectedIds, onNext, onInspect }) {
  const [sourcesList, setSourcesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBREModalOpen, setIsBREModalOpen] = useState(false);
  const [breTab, setBreTab] = useState('product');
  const [loanProducts, setLoanProducts] = useState([
    { id: 'home', name: 'Home Loan', desc: 'Financing for purchase or construction of residential property.' },
    { id: 'bike', name: 'Bike Loan', desc: 'Two-wheeler financing with short tenure and quick disbursal.' },
    { id: 'lap', name: 'Loan Against Property (LAP)', desc: 'Secured loan against residential or commercial property.' },
    { id: 'personal', name: 'Personal Loan', desc: 'Unsecured multipurpose loan based on income and bureau profile.' },
    { id: 'auto', name: 'Auto Loan', desc: 'Four-wheeler financing for new and used passenger vehicles.' },
    { id: 'business', name: 'Business Loan', desc: 'Working capital and expansion funding for MSMEs and SMEs.' },
    { id: 'gold', name: 'Gold Loan', desc: 'Secured loan against pledged gold ornaments and coins.' },
    { id: 'education', name: 'Education Loan', desc: 'Tuition and living-cost financing for higher studies.' },
    { id: 'two-wheeler-ev', name: 'EV Loan', desc: 'Financing for electric two-wheelers and four-wheelers.' },
    { id: 'consumer-durable', name: 'Consumer Durable Loan', desc: 'Point-of-sale financing for appliances and electronics.' },
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
    setSelectedLoan((prev) => (prev === id ? null : id));
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
      <div className="border-b border-purple-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3b0764]">
            Data Sources: Select Data Sources ({selectedIds.length} Selected)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Select any of the {sourcesList.length} financial data feeds below to aggregate features & train underwriting risk models.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all flex items-center space-x-1.5 cursor-pointer"
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
              className={`relative p-4 pb-10 rounded-2xl border cursor-pointer transition-all min-h-27 ${
                isSelected
                  ? 'border-purple-600 bg-white shadow-md shadow-purple-950/10 ring-2 ring-purple-400'
                  : 'border-purple-100 bg-white hover:border-purple-300 shadow-xs'
              }`}
            >
              <div className="space-y-1.5">
                <h3 className={`text-sm font-bold ${isSelected ? 'text-[#3b0764]' : 'text-slate-800'}`}>
                  {source.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {source.shortDesc}
                </p>

                <div className="pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBREModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>BRE Rule Training</span>
                  </button>
                </div>
              </div>

              {/* Continue to next step */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                title="Continue to next step"
                className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-[#3b0764] hover:bg-purple-900 text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
              >
                <ArrowDownRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-[#3b0764]">Add New Data Source</h2>
                <p className="text-xs text-slate-500">Configure a custom financial feed for feature aggregation</p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-purple-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3b0764] mb-1">
                  Data Source / Feed Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. CIBIL Bureau Score Feed or Customs Port Ingestion"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3b0764] mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief summary of data payload, update frequency, and source details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600 bg-purple-50/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3b0764] mb-1">
                  Sample Feature Fields (Comma separated)
                </label>
                <input
                  type="text"
                  value={newFields}
                  onChange={(e) => setNewFields(e.target.value)}
                  placeholder="e.g. bureau_score, active_loans_count, dpd_30_flag"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                />
              </div>

              <div className="pt-3 border-t border-purple-100 flex items-center justify-end space-x-2.5">
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl border border-purple-100 flex flex-col">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 rounded-t-3xl shrink-0">
              <div>
                <h2 className="text-lg font-extrabold text-[#3b0764]">BRE Rule Training</h2>
                <p className="text-xs text-slate-500">Underwriting &amp; Decisioning Rules Configuration</p>
              </div>
              <button
                onClick={() => setIsBREModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Capsule Tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
              {[
                { id: 'product', label: 'Product' },
                { id: 'rules', label: 'BRE Rules' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBreTab(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    breTab === tab.id
                      ? 'bg-[#3b0764] text-white border-[#3b0764] shadow-sm'
                      : 'bg-white text-[#3b0764] border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setIsBREModalOpen(false);
                  onNext();
                }}
                className="ml-auto px-5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-3" />
                <span>Apply</span>
              </button>
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
                      className="flex-1 px-3.5 py-2 rounded-xl border border-purple-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600 bg-purple-50/30"
                    />
                    <button
                      type="button"
                      onClick={() => addLoanProduct()}
                      disabled={!newLoanName.trim()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                            isSel
                              ? 'border-purple-600 bg-white ring-2 ring-purple-400 shadow-md shadow-purple-950/10'
                              : 'border-purple-100 bg-white hover:border-purple-300 shadow-xs'
                          }`}
                        >
                          <div>
                            <h4 className={`text-sm font-bold ${isSel ? 'text-[#3b0764]' : 'text-slate-800'}`}>
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{p.desc}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                              isSel ? 'bg-[#3b0764] border-[#3b0764] text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSel && <Check className="w-3.5 h-3.5 stroke-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-purple-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setBreTab('rules')}
                      disabled={!selectedLoan}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Apply BRE Rules</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {breTab === 'rules' && (
                <div className="space-y-3">
                  {selectedLoan && (
                    <div className="mx-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/60 px-3 py-2">
                      <span className="text-[11px] font-bold text-[#3b0764]">Applying rules to:</span>
                      <span className="text-[11px] font-semibold text-purple-800 bg-white border border-purple-200 rounded-full px-2 py-0.5">
                        {loanProducts.find((p) => p.id === selectedLoan)?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBreTab('product')}
                        className="ml-auto text-[11px] font-semibold text-purple-700 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  <Settings hideHeader />
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

