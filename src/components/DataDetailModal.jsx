import { X, CheckCircle } from 'lucide-react';

export default function DataDetailModal({ source, onClose }) {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col animate-fadeIn">
        
        {/* Modal Header (Fixed Top) */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 shrink-0">
          <div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-800 border border-slate-200 mb-1.5 inline-block">
              {source.category}
            </span>
            <h3 className="text-xl font-extrabold text-slate-800">
              {source.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{source.shortDesc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Clean Perfect Fit Scrollable Area) */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
          {/* System Description */}
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              System Description & Data Utility
            </h4>
            <p className="text-xs text-slate-700 bg-slate-50/40 p-3.5 rounded-2xl border border-slate-200 leading-relaxed font-medium">
              {source.fullDesc}
            </p>
          </div>

          {/* Key Extracted Features */}
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Extracted Predictor Features ({source.featuresCount} Features)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {source.features.map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 stroke-3" />
                  <span className="truncate">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Schema JSON */}
          <div>
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Real-time API Payload Schema Sample
            </h4>
            <pre className="bg-slate-50/60 p-3.5 rounded-2xl text-xs font-mono text-slate-800 font-semibold overflow-x-auto border border-slate-200 shadow-2xs max-h-40">
              {JSON.stringify(source.sampleSchema, null, 2)}
            </pre>
          </div>

          {/* Integration Specs */}
          <div className="grid grid-cols-3 gap-3 text-center pt-1">
            <div className="p-3 bg-slate-50/40 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Data Quality Score</span>
              <span className="text-sm font-bold text-emerald-700 font-mono mt-0.5 block">{source.coverage}</span>
            </div>
            <div className="p-3 bg-slate-50/40 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Security Protocol</span>
              <span className="text-sm font-bold text-slate-800 font-mono mt-0.5 block">256-bit OAuth2</span>
            </div>
            <div className="p-3 bg-slate-50/40 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Latency</span>
              <span className="text-sm font-bold text-purple-700 font-mono mt-0.5 block">&lt; 350ms</span>
            </div>
          </div>
        </div>

        {/* Modal Footer (Fixed Bottom) */}
        <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl btn-orange text-white text-xs font-bold shadow-md shadow-orange-900/15 transition-all cursor-pointer"
          >
            Close Inspection
          </button>
        </div>

      </div>
    </div>
  );
}
