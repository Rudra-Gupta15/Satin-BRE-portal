import { useEffect, useState } from 'react';
import {
  ChevronDown,
  Database,
  Loader2,
  Check,
  Wifi,
  CheckCircle2,
  Play,
  ScanSearch
} from 'lucide-react';
import { api } from '../api/client';
import Select from './Select';

export default function AiArchitecture({ hideHeader = false }) {
  const [selectedLLM, setSelectedLLM] = useState("gemma");
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);

  // Locally-installed vision models found by scanning the machine's Ollama.
  const [localModels, setLocalModels] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanDetail, setScanDetail] = useState("");

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

  const handleScanDevice = async () => {
    setScanning(true);
    setScanDetail("");
    try {
      const data = await api.get('/ai-architecture/local-models');
      setLocalModels(data.models || []);
      setScanDetail(data.detail || "");
      if (data.models?.length && !data.models.some((m) => m.value === selectedLLM)) {
        handleSelectedLLMChange(data.models[0].value);
      }
    } catch (err) {
      setLocalModels([]);
      setScanDetail(err.message);
    } finally {
      setScanning(false);
    }
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

  // ── GST model training history (separate registry/corpus, same idea) ─────
  const [gstRegistry, setGstRegistry] = useState([]);
  const [gstActive, setGstActive] = useState(null);
  const loadGstRegistry = () => {
    api.get('/gst/model/registry').then((d) => {
      setGstRegistry(d.versions || []);
      setGstActive(d.active ?? null);
    }).catch(() => {});
  };
  useEffect(() => { loadGstRegistry(); }, []);

  const activateGstVersion = async (v) => {
    await api.put('/gst/model/active', { version: v }).catch(() => {});
    loadGstRegistry();
  };

  // ── BBPS model training history (separate registry/corpus, same idea) ────
  const [bbpsRegistry, setBbpsRegistry] = useState([]);
  const [bbpsActive, setBbpsActive] = useState(null);
  const loadBbpsRegistry = () => {
    api.get('/bbps/model/registry').then((d) => {
      setBbpsRegistry(d.versions || []);
      setBbpsActive(d.active ?? null);
    }).catch(() => {});
  };
  useEffect(() => { loadBbpsRegistry(); }, []);

  const activateBbpsVersion = async (v) => {
    await api.put('/bbps/model/active', { version: v }).catch(() => {});
    loadBbpsRegistry();
  };

  // ── UPI model training history (separate registry/corpus, same idea) ────
  const [upiRegistry, setUpiRegistry] = useState([]);
  const [upiActive, setUpiActive] = useState(null);
  const loadUpiRegistry = () => {
    api.get('/upi/model/registry').then((d) => {
      setUpiRegistry(d.versions || []);
      setUpiActive(d.active ?? null);
    }).catch(() => {});
  };
  useEffect(() => { loadUpiRegistry(); }, []);

  const activateUpiVersion = async (v) => {
    await api.put('/upi/model/active', { version: v }).catch(() => {});
    loadUpiRegistry();
  };

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
    <div className={`space-y-6 pb-4 ${hideHeader ? '' : 'pb-12'}`}>

      {!hideHeader && (
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-800">
            AI Intelligence: Extraction &amp; Processing
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Select base AI models, connect to high-throughput vLLM serving engine, and manage data cleanliness thresholds.
          </p>
        </div>
      )}

      {/* SECTION 1: Select AI Data Extraction Engine */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-4 shadow-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-extrabold text-slate-800">
            Select AI Data Extraction Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select the base AI model for document parsing, structured field extraction, and noise removal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="w-full sm:max-w-md space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Choose Base AI Architecture:
            </label>
            <Select
              value={selectedLLM}
              onChange={handleSelectedLLMChange}
              options={
                localModels.length > 0
                  ? localModels.map((m) => ({
                      value: m.value,
                      label: m.label,
                      hint: [m.sizeGB ? `${m.sizeGB} GB` : '', m.params].filter(Boolean).join(' · ') || undefined,
                    }))
                  : [
                      { value: 'gemma', label: 'Gemma 4 (Ollama)' },
                      { value: 'qwen', label: 'Qwen 2.5 VL (Ollama)' },
                      { value: 'llama', label: 'Llama 3.2 Vision (Ollama)' },
                      { value: 'mistral', label: 'Mistral (Ollama)' },
                    ]
              }
            />
            <span className="text-[11px] text-slate-500 block">
              {scanDetail
                ? scanDetail
                : <>Active model: <strong className="text-slate-800 font-mono">{selectedLLM}</strong> — press <em>Scan device</em> to list vision models installed on this machine.</>}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleScanDevice}
              disabled={scanning}
              className="px-5 py-2.5 rounded-xl text-xs font-bold border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {scanning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Scanning…</span></>
                : <><ScanSearch className="w-3.5 h-3.5" /><span>Scan device</span></>}
            </button>
            <button
              onClick={handleExtractData}
              disabled={isExtractingData}
              className="px-5 py-2.5 rounded-xl text-xs font-bold btn-orange text-white transition-all flex items-center space-x-2 shadow-md shadow-orange-900/15 cursor-pointer"
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
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              vLLM Inference Server Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect to self-hosted vLLM engine for high-throughput PagedAttention inference & tensor parallelism.
            </p>
          </div>

          {/* ON/OFF Switch */}
          <div className="flex items-center space-x-3 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-800">
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
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#ea580c] shadow-2xs"
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
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#ea580c] shadow-2xs"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTestVLLMConnection}
                disabled={isTestingVLLM || !vllmEnabled}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-purple-300 text-slate-800 transition-all flex items-center space-x-2 cursor-pointer shadow-2xs"
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

      {/* SECTION 3 hidden per request (Data Cleanliness Threshold) */}
      {false && (<>
      {/* SECTION 3: Data Quality & AI Activation Threshold */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-extrabold text-slate-800">
            Data Cleanliness Threshold & AI Activation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            If raw input data cleanliness is below 60%, the AI automatically activates to clean noise and engineer features before sending data to Model Hub.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Percentage of Cleanliness in Data:
          </label>

          <div className="w-full sm:w-36">
            <Select
              value={cleanlinessPercent}
              onChange={(v) => handleCleanlinessChange(Number(v))}
              options={[
                { value: 60, label: '60%' },
                { value: 70, label: '70%' },
                { value: 80, label: '80%' },
              ]}
            />
          </div>
        </div>

      </div>
      </>)}

      {/* SECTION 4: Risk-Model Training (dataset corpus + versioned registry) */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 flex-wrap border-b border-slate-200 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Training Corpus &amp; Model Registry</span>
            <h2 className="text-base font-extrabold text-slate-800">Risk-Model Training (Dataset CSV)</h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Each CSV is <strong>added</strong> to the corpus (deduped) · every train saves a new version · old versions kept · active = best
              {datasetInfo?.total ? ` · corpus: ${datasetInfo.total.toLocaleString()} rows` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-44">
              <Select
                value={trainAlgo}
                onChange={setTrainAlgo}
                options={[
                  { value: 'gradient_boosting', label: 'Gradient Boosting' },
                  { value: 'random_forest', label: 'Random Forest' },
                  { value: 'logistic_regression', label: 'Logistic Regression' },
                ]}
              />
            </div>
            <label className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-900/15 ${
              datasetTraining ? 'bg-slate-400 cursor-not-allowed' : 'btn-orange'
            }`}>
              {datasetTraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{datasetTraining ? 'Training…' : 'Upload CSV & Train'}</span>
              <input type="file" accept=".csv" className="hidden" disabled={datasetTraining}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) trainOnDataset(f); e.target.value = ''; }} />
            </label>
            {registry.length > 0 && (
              <button type="button" disabled={datasetTraining} onClick={() => trainOnDataset(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">
                Re-train
              </button>
            )}
          </div>
        </div>

        {datasetMsg && (
          <div className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800">
            {datasetMsg}
          </div>
        )}

        {registry.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Version</th><th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 text-right">Rows</th><th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">F1</th><th className="py-2.5 px-3 text-right">Score R²</th>
                  <th className="py-2.5 px-3">Trained</th><th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {registry.map((v) => (
                  <tr key={v.version} className={v.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}>
                    <td className="py-2 px-3 font-bold text-slate-800">v{v.version}{v.active && <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">ACTIVE</span>}</td>
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

      {/* SECTION 5: GST Model Training History (separate corpus + registry, read-only here) */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="border-b border-slate-200 pb-3">
          <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Training Corpus &amp; Model Registry</span>
          <h2 className="text-base font-extrabold text-slate-800">GST Model Training History</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Every GST upload (Model Testing / Model Hub) accumulates into the corpus · every train saves a new version · old versions kept
            {gstActive != null ? ` · active: v${gstActive}` : ''}
          </p>
        </div>

        {gstRegistry.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Version</th><th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 text-right">Rows</th><th className="py-2.5 px-3 text-right">Score R²</th>
                  <th className="py-2.5 px-3 text-right">Flag Accuracy</th>
                  <th className="py-2.5 px-3">Trained</th><th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {gstRegistry.map((v) => (
                  <tr key={v.version} className={v.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}>
                    <td className="py-2 px-3 font-bold text-slate-800">v{v.version}{v.active && <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">ACTIVE</span>}</td>
                    <td className="py-2 px-3 text-slate-600">{v.algorithm}</td>
                    <td className="py-2 px-3 text-right">{v.nSamples?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{v.metrics?.scoreR2?.toFixed(3) ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{v.metrics?.flagAccuracy != null ? `${(v.metrics.flagAccuracy * 100).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 px-3 text-slate-400">{v.trainedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-3">
                      {!v.active && (
                        <button onClick={() => activateGstVersion(v.version)}
                          className="text-[10px] font-bold text-purple-700 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-mono">No GST model trained yet.</p>
        )}
      </div>

      {/* SECTION 6: BBPS Model Training History (separate corpus + registry, read-only here) */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="border-b border-slate-200 pb-3">
          <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Training Corpus &amp; Model Registry</span>
          <h2 className="text-base font-extrabold text-slate-800">BBPS Model Training History</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Every BBPS statement upload accumulates into the corpus · every train saves a new version · old versions kept
            {bbpsActive != null ? ` · active: v${bbpsActive}` : ''}
          </p>
        </div>

        {bbpsRegistry.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Version</th><th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 text-right">Rows</th><th className="py-2.5 px-3 text-right">Score R²</th>
                  <th className="py-2.5 px-3 text-right">Flag Accuracy</th>
                  <th className="py-2.5 px-3">Trained</th><th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {bbpsRegistry.map((v) => (
                  <tr key={v.version} className={v.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}>
                    <td className="py-2 px-3 font-bold text-slate-800">v{v.version}{v.active && <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">ACTIVE</span>}</td>
                    <td className="py-2 px-3 text-slate-600">{v.algorithm}</td>
                    <td className="py-2 px-3 text-right">{v.nSamples?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{v.metrics?.scoreR2?.toFixed(3) ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{v.metrics?.flagAccuracy != null ? `${(v.metrics.flagAccuracy * 100).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 px-3 text-slate-400">{v.trainedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-3">
                      {!v.active && (
                        <button onClick={() => activateBbpsVersion(v.version)}
                          className="text-[10px] font-bold text-purple-700 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-mono">No BBPS model trained yet.</p>
        )}
      </div>

      {/* SECTION 7: UPI Model Training History (separate corpus + registry, read-only here) */}
      <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-white space-y-5 shadow-xs">
        <div className="border-b border-slate-200 pb-3">
          <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Training Corpus &amp; Model Registry</span>
          <h2 className="text-base font-extrabold text-slate-800">UPI Model Training History</h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Every UPI file upload accumulates into the corpus · every train saves a new version · old versions kept
            {upiActive != null ? ` · active: v${upiActive}` : ''}
          </p>
        </div>

        {upiRegistry.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Version</th><th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3 text-right">Rows</th><th className="py-2.5 px-3 text-right">Score R²</th>
                  <th className="py-2.5 px-3 text-right">Flag Accuracy</th>
                  <th className="py-2.5 px-3">Trained</th><th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {upiRegistry.map((v) => (
                  <tr key={v.version} className={v.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}>
                    <td className="py-2 px-3 font-bold text-slate-800">v{v.version}{v.active && <span className="ml-1.5 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">ACTIVE</span>}</td>
                    <td className="py-2 px-3 text-slate-600">{v.algorithm}</td>
                    <td className="py-2 px-3 text-right">{v.nSamples?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{v.metrics?.scoreR2?.toFixed(3) ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{v.metrics?.flagAccuracy != null ? `${(v.metrics.flagAccuracy * 100).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 px-3 text-slate-400">{v.trainedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-3">
                      {!v.active && (
                        <button onClick={() => activateUpiVersion(v.version)}
                          className="text-[10px] font-bold text-purple-700 hover:underline">Activate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-mono">No UPI model trained yet.</p>
        )}
      </div>

    </div>
  );
}
