import React from 'react';
import { X, Code, CheckCircle, Database, Server, Zap, ShieldCheck } from 'lucide-react';

export default function DataDetailModal({ source, onClose }) {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-cyan-950/50 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Glow Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2 inline-block">
              {source.category}
            </span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {source.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{source.shortDesc}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> System Description & Data Utility
            </h4>
            <p className="text-sm text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
              {source.fullDesc}
            </p>
          </div>

          {/* Key Extracted Features */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Extracted Predictor Features ({source.featuresCount} Features)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {source.features.map((feat, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 text-slate-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Schema JSON */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" /> Real-time API Payload Schema Sample
            </h4>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto border border-slate-800/80 shadow-inner">
              {JSON.stringify(source.sampleSchema, null, 2)}
            </pre>
          </div>

          {/* Integration Specs */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Data Quality Score</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{source.coverage}</span>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Security Protocol</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">256-bit OAuth2</span>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Latency</span>
              <span className="text-sm font-bold text-indigo-400 font-mono">&lt; 350ms</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close Inspection
          </button>
        </div>

      </div>
    </div>
  );
}
