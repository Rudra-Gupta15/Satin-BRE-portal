import React, { useState } from 'react';
import { Check, ArrowRight, Layers, Plus, X, Sparkles } from 'lucide-react';
import { DATA_SOURCES } from '../data/dataSources';

export default function Page1Selection({ selectedIds, setSelectedIds, onNext, onInspect }) {
  const [sourcesList, setSourcesList] = useState(DATA_SOURCES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFields, setNewFields] = useState('');

  const toggleSource = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sourcesList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sourcesList.map(s => s.id));
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newId = `custom_feed_${Date.now()}`;
    const newSource = {
      id: newId,
      title: newTitle.trim(),
      shortDesc: newDesc.trim() || 'Custom financial data integration feed.',
      fullDesc: newDesc.trim() || 'Custom data feed integrated for risk model scoring.',
      sampleFields: newFields ? newFields.split(',').map(f => f.trim()) : ['custom_metric_1', 'custom_ratio_2'],
      sampleData: { record_id: 'REC-9910', timestamp: new Date().toISOString() }
    };

    setSourcesList([...sourcesList, newSource]);
    setSelectedIds([...selectedIds, newId]);
    setNewTitle('');
    setNewDesc('');
    setNewFields('');
    setIsAddModalOpen(false);
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

          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-purple-300 text-[#3b0764] bg-white hover:bg-purple-50 transition-colors cursor-pointer shadow-xs"
          >
            {selectedIds.length === sourcesList.length ? 'Deselect All' : `Select All ${sourcesList.length} Data Feeds`}
          </button>
        </div>
      </div>

      {/* Data Source Box Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sourcesList.map((source, index) => {
          const isSelected = selectedIds.includes(source.id);

          return (
            <div
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between min-h-27 ${
                isSelected
                  ? 'border-purple-600 bg-white shadow-md shadow-purple-950/10 ring-2 ring-purple-400'
                  : 'border-purple-100 bg-white hover:border-purple-300 shadow-xs'
              }`}
            >
              <div className="space-y-1.5 pr-3 flex-1">
                <h3 className={`text-sm font-bold ${isSelected ? 'text-[#3b0764]' : 'text-slate-800'}`}>
                  {source.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {source.shortDesc}
                </p>

                {onInspect && (
                  <div className="pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspect(source);
                      }}
                      className="text-[11px] font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Inspect Schema & Samples</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Selection Bar / Indicator */}
              <div className={`w-5 h-5 rounded-lg border shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                isSelected
                  ? 'bg-[#3b0764] border-[#3b0764] text-white shadow-sm'
                  : 'border-slate-300 bg-white'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-3" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="pt-5 border-t border-purple-200 flex items-center justify-between">
        <span className="text-xs text-[#3b0764] font-bold font-mono bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
          {selectedIds.length} of {sourcesList.length} Sources Selected
        </span>

        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all flex items-center space-x-2 cursor-pointer"
        >
          <span>Go to Model Hub (Pipeline & Training)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white shadow-md shadow-purple-950/20 transition-all cursor-pointer"
                >
                  Add & Select Product
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

