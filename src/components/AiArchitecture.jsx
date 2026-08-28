import { useEffect, useState } from 'react';
import {
  ChevronDown,
  Database,
  Loader2,
  Check,
  Wifi,
  CheckCircle2,
  Play
} from 'lucide-react';
import { api } from '../api/client';

export default function AiArchitecture() {
  const [selectedLLM, setSelectedLLM] = useState("gemma");
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);

  // Dropdown cleanliness percentage
  const [cleanlinessPercent, setCleanlinessPercent] = useState(60);

  // Vision-engine (Ollama) connection state — values come from Backend/.env
  const [vllmEnabled, setVllmEnabled] = useState(true);
  const [vllmEndpoint, setVllmEndpoint] = useState("");
  const [vllmModelName, setVllmModelName] = useState("");
  const [vllmRuntime, setVllmRuntime] = useState("");
  const [vllmTimeout, setVllmTimeout] = useState(null);

  const [isTestingVLLM, setIsTestingVLLM] = useState(false);
  const [vllmStatus, setVllmStatus] = useState("unknown");
  const [vllmDetail, setVllmDetail] = useState("");
  const [latencyMs, setLatencyMs] = useState(null);

  useEffect(() => {
    api.get('/ai-architecture').then((data) => {
      setSelectedLLM(data.selectedLLM);
      setDataExtracted(data.dataExtracted);
      setCleanlinessPercent(data.cleanlinessPercent);
      setVllmEnabled(data.vllm.enabled);
      setVllmEndpoint(data.vllm.endpoint);
      setVllmModelName(data.vllm.modelName);
      setVllmRuntime(data.vllm.runtime);
      setVllmTimeout(data.vllm.timeoutSec);
      setVllmStatus(data.vllm.status);
    });
  }, []);

  const handleSelectedLLMChange = (value) => {
    setSelectedLLM(value);
    api.put('/ai-architecture/llm', { selectedLLM: value }).catch(() => {});
  };

  // ── Dataset training + versioned model registry ──────────────────────────
  const [registry, setRegistry] = useState([]);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [datasetTraining, setDatasetTraining] = useState(false);
  const [datasetMsg, setDatasetMsg] = useState('');
  const [trainAlgo, setTrainAlgo] = useState('gradient_boosting');

  const loadRegistry = () => {
    api.get('/models/dataset/status').then((d) => {
      setRegistry(d.registry || []);
      setDatasetInfo(d.dataset || null);
    }).catch(() => {});
  };
  useEffect(() => { loadRegistry(); }, []);

  const trainOnDataset = async (file) => {
    setDatasetTraining(true);
    setDatasetMsg('');
    try {
      const form = new FormData();
      if (file) form.append('file', file);
      form.append('algorithm', trainAlgo);
      const d = await api.postForm('/models/dataset/train', form);
      const delta = d.delta
        ? ` · Δacc ${d.delta.accuracy >= 0 ? '+' : ''}${(d.delta.accuracy * 100).toFixed(1)}pp vs v${d.previousVersion}`
        : '';
      setDatasetMsg(
        `Trained v${d.version} on ${d.nSamples.toLocaleString()} rows` +
        ` — accuracy ${(d.metrics.accuracy * 100).toFixed(1)}%, F1 ${(d.metrics.f1 * 100).toFixed(1)}%.` +
        ` Active: v${d.activeVersion}${delta}` +
        (d.ingest ? ` (+${d.ingest.added} new rows)` : '')
      );
      loadRegistry();
    } catch (err) {
      setDatasetMsg(err.message);
    } finally {
      setDatasetTraining(false);
    }
  };

  const activateVersion = async (v) => {
    await api.put(`/models/registry/${v}/activate`).catch(() => {});
    loadRegistry();
  };

  const handleExtractData = async () => {
    setIsExtractingData(true);
    setDataExtracted(false);
    try {
      await api.post('/ai-architecture/extract');
      setDataExtracted(true);
    } finally {
      setIsExtractingData(false);
    }
  };

  const handleCleanlinessChange = async (value) => {
    setCleanlinessPercent(value);
    const data = await api.put('/ai-architecture/cleanliness', { cleanlinessPercent: value });
    setCleanlinessPercent(data.cleanlinessPercent);
  };

  const persistVllmConfig = (patch) => {
    api.put('/ai-architecture/vllm', patch).catch(() => {});
  };

  const handleTestVLLMConnection = async () => {
    setIsTestingVLLM(true);
    setVllmStatus("testing");
    try {
      const data = await api.post('/ai-architecture/vllm/test');
      setVllmStatus(data.vllm.status);
      setLatencyMs(data.latencyMs);
      setVllmDetail(data.detail || '');
    } finally {
      setIsTestingVLLM(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Page Header */}
      <div className="border-b border-purple-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#3b0764]">
          AI Intelligence: LLM Extraction & Processing
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Select base LLM models, connect to high-throughput vLLM serving engine, and manage data cleanliness thresholds.
        </p>
      </div>

      {/* SECTION 1: Select LLM Data Extraction Engine */}
      <div className="border border-purple-100 rounded-2xl p-5 sm:p-6 bg-white space-y-4 shadow-xs">
        <div className="border-b border-purple-100 pb-3">
          <h2 className="text-base font-extrabold text-[#3b0764]">
            Select LLM Data Extraction Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the base LLM model for document parsing, structured field extraction, and noise removal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="w-full sm:max-w-md space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Choose Base LLM Architecture:
            </label>
            <div className="relative">
              <select
                value={selectedLLM}
                onChange={(e) => handleSelectedLLMChange(e.target.value)}
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-8 shadow-2xs"
              >
                <option value="gemma">Gemma 2 (vLLM Engine)</option>
                <option value="qwen">Qwen 2.5 (vLLM Engine)</option>
                <option value="llama">Llama 3.1 8B (vLLM Engine)</option>
                <option value="mistral">Mistral NeMo (vLLM Engine)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-purple-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-[11px] text-slate-500 block">
              Selected Model Engine: <strong className="text-[#3b0764] font-mono uppercase">{selectedLLM}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleExtractData}
              disabled={isExtractingData}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#3b0764] hover:bg-purple-900 text-white transition-all flex items-center space-x-2 shadow-md shadow-purple-950/20 cursor-pointer"
            >
              {isExtractingData ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting Data...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Extract Data</span>
                </>
              )}
            </button>
            {dataExtracted && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 font-mono bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-2xs animate-fadeIn">
                <Check className="w-3.5 h-3.5 stroke-3" /> Data Extracted!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: vLLM Server Connection Settings */}
      <div className="border border-purple-100 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-[#3b0764]">
              vLLM Inference Server Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect to self-hosted vLLM engine for high-throughput PagedAttention inference & tensor parallelism.
            </p>
          </div>

          {/* ON/OFF Switch */}
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-xs font-mono font-bold text-[#3b0764]">
              {vllmEnabled ? "vLLM Active" : "vLLM Offline"}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !vllmEnabled;
                setVllmEnabled(next);
                persistVllmConfig({ enabled: next });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${vllmEnabled ? 'bg-[#3b0764]' : 'bg-slate-300'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${vllmEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* vLLM Configuration Inputs */}
        <div className={`space-y-4 transition-all ${vllmEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Host / Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>vLLM Host / API Endpoint:</span>
                <span className="text-[10px] font-mono text-purple-600 font-bold">OpenAI Compatible API</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={vllmEndpoint}
                  onChange={(e) => setVllmEndpoint(e.target.value)}
                  onBlur={(e) => persistVllmConfig({ endpoint: e.target.value })}
                  placeholder="http://localhost:8000/v1"
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Vision Model (STATEMENT_LLM_MODEL):
              </label>
              <input
                type="text"
                value={vllmModelName}
                onChange={(e) => setVllmModelName(e.target.value)}
                onBlur={(e) => persistVllmConfig({ modelName: e.target.value })}
                placeholder="gemma4:31b-cloud"
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 shadow-2xs"
              />
            </div>

            {/* Runtime */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Runtime:</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-600 shadow-2xs">
                {vllmRuntime || '—'}
              </div>
            </div>

            {/* Timeout */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Timeout / page:</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-600 shadow-2xs">
                {vllmTimeout != null ? `${vllmTimeout}s` : '—'}
              </div>
            </div>

          </div>

          {/* Test Connection Bar & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-purple-50">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTestVLLMConnection}
                disabled={isTestingVLLM || !vllmEnabled}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-100 hover:bg-purple-200 border border-purple-300 text-[#3b0764] transition-all flex items-center space-x-2 cursor-pointer shadow-2xs"
              >
                {isTestingVLLM ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    <span>Pinging vLLM...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-purple-600" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Connection Status Badge — real Ollama check */}
            {vllmStatus === "connected" && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono flex items-center space-x-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected{latencyMs != null ? ` • ${latencyMs}ms` : ''}</span>
              </div>
            )}
            {(vllmStatus === "model-missing" || vllmStatus === "disconnected") && (
              <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold font-mono shadow-2xs">
                {vllmStatus === "model-missing" ? "Model not pulled" : "Unreachable"}
              </div>
            )}
          </div>
          {vllmDetail && (
            <p className="text-[10px] text-slate-500 font-mono pt-1">{vllmDetail}</p>
          )}
        </div>
      </div>

      {/* SECTION 3: Data Quality & LLM Activation Threshold */}
      <div className="border border-purple-100 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="border-b border-purple-100 pb-3">
          <h2 className="text-base font-extrabold text-[#3b0764]">
            Data Cleanliness Threshold & LLM Activation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            If raw input data cleanliness is below 60%, the LLM automatically activates to clean noise and engineer features before sending data to Model Hub.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Percentage of Cleanliness in Data:
          </label>

          {/* Dropdown on the right */}
          <div className="relative w-full sm:w-36">
            <select
              value={cleanlinessPercent}
              onChange={(e) => handleCleanlinessChange(Number(e.target.value))}
              className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-8 shadow-2xs"
            >
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
            </select>
            <ChevronDown className="w-4 h-4 text-purple-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* SECTION 4: Risk-Model Training (dataset corpus + versioned registry) */}
      <div className="border border-purple-100 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 flex-wrap border-b border-purple-100 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Training Corpus &amp; Model Registry</span>
            <h2 className="text-base font-extrabold text-[#3b0764]">Risk-Model Training (Dataset CSV)</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Each CSV is <strong>added</strong> to the corpus (deduped) · every train saves a new version · old versions kept · active = best
              {datasetInfo?.total ? ` · corpus: ${datasetInfo.total.toLocaleString()} rows` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={trainAlgo}
                onChange={(e) => setTrainAlgo(e.target.value)}
                className="bg-purple-50/50 border border-purple-200 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer"
              >
                <option value="gradient_boosting">Gradient Boosting</option>
                <option value="random_forest">Random Forest</option>
                <option value="logistic_regression">Logistic Regression</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <label className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-950/20 ${
              datasetTraining ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#3b0764] hover:bg-purple-900'
            }`}>
              {datasetTraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{datasetTraining ? 'Training…' : 'Upload CSV & Train'}</span>
              <input type="file" accept=".csv" className="hidden" disabled={datasetTraining}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) trainOnDataset(f); e.target.value = ''; }} />
            </label>
            {registry.length > 0 && (
              <button type="button" disabled={datasetTraining} onClick={() => trainOnDataset(null)}
                className="px-3 py-2 rounded-xl border border-purple-200 text-[#3b0764] text-xs font-bold hover:bg-purple-50 disabled:opacity-50">
                Re-train
              </button>
            )}
          </div>
        </div>

        {datasetMsg && (
          <div className="text-[11px] font-mono bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-[#3b0764]">
            {datasetMsg}
          </div>
        )}

        {registry.length > 0 ? (
          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Version</th><th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 text-right">Rows</th><th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">F1</th><th className="py-2.5 px-3 text-right">Score R²</th>
                  <th className="py-2.5 px-3">Trained</th><th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {registry.map((v) => (
                  <tr key={v.version} className={v.active ? 'bg-emerald-50/50' : 'hover:bg-purple-50/30'}>
                    <td className="py-2 px-3 font-bold text-[#3b0764]">v{v.version}{v.active && <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">ACTIVE</span>}</td>
                    <td className="py-2 px-3 text-slate-600">{v.algorithm}</td>
                    <td className="py-2 px-3 text-right">{v.nSamples?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{(v.metrics.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{(v.metrics.f1 * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{v.metrics.scoreR2?.toFixed(3)}</td>
                    <td className="py-2 px-3 text-slate-400">{v.trainedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-3">
                      {!v.active && (
                        <button onClick={() => activateVersion(v.version)}
                          className="text-[10px] font-bold text-purple-700 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-mono">No model trained yet. Upload a CSV (≥ 200 rows, one row per applicant) to train the first version.</p>
        )}
      </div>

    </div>
  );
}
