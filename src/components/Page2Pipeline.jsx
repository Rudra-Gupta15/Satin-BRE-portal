import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, Play, RefreshCw, Loader2, ChevronDown, Table, FileText, Cpu, Download, Database, Rocket, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export default function Page2Pipeline({
  selectedIds,
  onNext,
  trainedModels,
  setTrainedModels,
  selectedVersionMap,
  setSelectedVersionMap,
  deployedStatusMap,
  setDeployedStatusMap
}) {
  const [allSources, setAllSources] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({}); // { [sourceId]: { fileName, cleanlinessPercent, sizeBytes, format, autoFilled, statementSummary, transactionsParsed } }
  const [scanningIds, setScanningIds]   = useState({}); // { [sourceId]: true } while LLM is scanning
  const [parsedStatements, setParsedStatements] = useState({}); // { [sourceId]: { transactions, summary } }
  const [expandedStatements, setExpandedStatements] = useState({}); // { [sourceId]: true } expanded tx table

  // Raw Data Noise Level State — populated from the backend after a pipeline run
  // (computed server-side from how many selected sources have an uploaded file)
  const [rawNoisePercent, setRawNoisePercent] = useState(60);
  const isLLMActiveForNoise = rawNoisePercent > 40;

  // Pipeline state (Steps 1..5: Data Gathering, Preprocess, Normalize, Feature Eng, Data Selection)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 = idle, 1..5 = steps, 6 = done
  const [showProcessedTable, setShowProcessedTable] = useState(false);
  const [processedTableRows, setProcessedTableRows] = useState([]);
  const [storedFile, setStoredFile] = useState('processed_features_vector.csv');
  const [stageLog, setStageLog] = useState([]); // [{ id, name, durationMs, detail }] — real per-stage results from the backend
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [normalizeTable, setNormalizeTable] = useState([]);   // Stage 3: raw / MinMax / Z-score per feature
  const [engineeredTable, setEngineeredTable] = useState([]); // Stage 4: derived temporal-ratio features
  const [selectionTable, setSelectionTable] = useState([]);   // Stage 5: variance ranking + selected flag

  // Training state & ML Algorithm Selection
  const [selectedDatasetFile, setSelectedDatasetFile] = useState("processed_features_vector.csv");
  const [selectedMLAlgorithm, setSelectedMLAlgorithm] = useState("gradient_boosting");
  const [isTrainingRunning, setIsTrainingRunning] = useState(false);
  const [trainingDone, setTrainingDone] = useState(false);
  const [visibleModelsCount, setVisibleModelsCount] = useState(0);
  const [readyModelsList, setReadyModelsList] = useState([]);
  const [realFeatures, setRealFeatures]       = useState(null);  // real extracted features
  const [trainingTxCount, setTrainingTxCount] = useState(0);     // # transactions used

  useEffect(() => {
    api.get('/data-sources').then((data) => setAllSources(data.dataSources));
    api.get('/pipeline/uploads').then((data) => setUploadedFiles(data.uploadedFiles || {}));
    api.get('/pipeline/status').then((data) => {
      if (data.pipeline.status === 'done') {
        setPipelineStep(6);
        setRawNoisePercent(data.pipeline.noisePercent);
        setProcessedTableRows(data.pipeline.processedTable || []);
        setShowProcessedTable(true);
      }
    });
  }, []);

  // Re-entering Model Hub after training already ran earlier in this
  // session: restore the completed view instead of starting from scratch.
  useEffect(() => {
    if (trainedModels && trainedModels.length > 0) {
      setReadyModelsList(trainedModels);
      setVisibleModelsCount(trainedModels.length);
      setTrainingDone(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSources = allSources.filter(s => selectedIds.includes(s.id));

  // 5 Process Steps
  const pipelineSteps = [
    { id: 1, name: "1. Data Gathering", desc: "Fetch & aggregate feeds from selected sources" },
    { id: 2, name: "2. Preprocess Data", desc: "Clean missing values & filter noise" },
    { id: 3, name: "3. Normalize Data", desc: "MinMax scaling & Z-score standardization" },
    { id: 4, name: "4. Feature Engineering", desc: "Generate variables & temporal ratios" },
    { id: 5, name: "5. Data Selection", desc: "Select high-variance predictor features" }
  ];

  const versionOptions = [
    { value: "v3.4", label: "v3.4 (Current)" },
    { value: "v3.3", label: "v3.3 (Old)" },
    { value: "v3.2", label: "v3.2 (Old)" },
    { value: "v3.1", label: "v3.1 (Old)" },
    { value: "v3.0", label: "v3.0 (Old)" }
  ];

  // Uploads the real file bytes to the backend, which runs the LLM vision
  // scanner (Qwen2.5VL via Ollama) for PDFs and returns structured transactions.
  const handleFileUpload = async (id, file) => {
    setScanningIds(prev => ({ ...prev, [id]: true }));
    setExpandedStatements(prev => ({ ...prev, [id]: false }));
    try {
      const formData = new FormData();
      formData.append('sourceId', id);
      formData.append('file', file);
      const data = await api.postForm('/pipeline/uploads', formData);
      // Guard: data or uploadedFiles may be null if the proxy/backend fails
      if (data?.uploadedFiles) {
        setUploadedFiles(data.uploadedFiles);
      }
      if (data?.statement) {
        setParsedStatements(prev => ({ ...prev, [id]: data.statement }));
        // Auto-expand if transactions were found
        if (data.statement.transactions?.length > 0) {
          setExpandedStatements(prev => ({ ...prev, [id]: true }));
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setScanningIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleVersionChange = async (modelId, version) => {
    setSelectedVersionMap(prev => ({ ...prev, [modelId]: version }));
    try {
      const data = await api.put(`/models/${modelId}/version`, { version });
      setSelectedVersionMap(data.selectedVersionMap);
    } catch {
      /* optimistic update already applied */
    }
  };

  const handleDeploy = async (modelId) => {
    try {
      const data = await api.post(`/models/${modelId}/deploy`);
      setDeployedStatusMap(data.deployedStatusMap);
    } catch {
      setDeployedStatusMap(prev => ({
        ...prev,
        [modelId]: prev[modelId] === "Deployed" ? "Ready" : "Deployed"
      }));
    }
  };

  // Run Process (Steps 1..5): the backend actually executes all 5 stages
  // (cleaning, MinMax/Z-score normalization, feature engineering, variance-based
  // selection) and returns each stage's real elapsed time + a description of
  // what it did. We reveal steps in that real order, holding each on-screen for
  // at least MIN_STEP_DISPLAY_MS so a sub-millisecond real computation is still
  // visible — the delay is a UX floor, not fake work.
  const MIN_STEP_DISPLAY_MS = 350;

  const startPipeline = async () => {
    setIsPipelineRunning(true);
    setPipelineStep(1);
    setShowProcessedTable(false);
    setStageLog([]);

    let result;
    try {
      result = await api.post('/pipeline/run', { selectedIds });
    } catch (err) {
      setIsPipelineRunning(false);
      setPipelineStep(0);
      alert(err.message);
      return;
    }

    for (const stage of result.stages) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(stage.durationMs, MIN_STEP_DISPLAY_MS)));
      setPipelineStep(stage.id);
      setStageLog(prev => [...prev, stage]);
    }

    setPipelineStep(6);
    setIsPipelineRunning(false);
    setRawNoisePercent(result.pipeline.noisePercent);
    setProcessedTableRows(result.pipeline.processedTable);
    setStoredFile(result.storedFile);
    setSelectedFeatures(result.selectedFeatures || []);
    setNormalizeTable(result.normalizeTable || []);
    setEngineeredTable(result.engineeredTable || []);
    setSelectionTable(result.selectionTable || []);
    setShowProcessedTable(true);
  };

  // Run Training on selected file & ML Algorithm: fetch real per-algorithm
  // accuracy from the backend, then animate models revealing one by one.
  const startTraining = async () => {
    setIsTrainingRunning(true);
    setVisibleModelsCount(0);
    setTrainingDone(false);
    setRealFeatures(null);

    let data;
    try {
      data = await api.post('/models/train', {
        algorithm: selectedMLAlgorithm,
        datasetFile: selectedDatasetFile,
      });
    } catch (err) {
      setIsTrainingRunning(false);
      alert(err.message);
      return;
    }

    setReadyModelsList(data.models);
    if (data.realFeatures) setRealFeatures(data.realFeatures);
    if (data.txCount)      setTrainingTxCount(data.txCount);

    let modelCount = 0;
    const modelInterval = setInterval(() => {
      modelCount++;
      setVisibleModelsCount(modelCount);

      if (modelCount >= data.models.length) {
        clearInterval(modelInterval);
        setIsTrainingRunning(false);
        setTrainingDone(true);
        setTrainedModels(data.models);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="border-b border-purple-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#3b0764]">
          Model Hub: Upload Data, Run Process & Train Models
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Upload data, select LLM & extract data, run process, inspect table, select ML algorithm, train models, and manage model versions & deployments.
        </p>
      </div>

      {/* 1. Upload Data Section */}
      <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
          <h2 className="text-sm font-bold text-[#3b0764]">
            1. Upload Data for Selected Sources ({selectedSources.length} Selected)
          </h2>
          <button
            onClick={async () => {
              const data = await api.post('/pipeline/uploads/autofill', { sourceIds: selectedIds });
              if (data?.uploadedFiles) setUploadedFiles(data.uploadedFiles);
            }}
            className="text-xs font-semibold text-purple-700 hover:underline"
          >
            Auto-fill Sample Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedSources.map((source) => {
            const upload = uploadedFiles[source.id];
            const isScanning = !!scanningIds[source.id];

            return (
              <div key={source.id} className="p-4 border border-purple-100 rounded-xl bg-purple-50/50 space-y-3">
                <div className="font-bold text-xs text-[#3b0764] truncate">
                  {source.title}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {upload ? upload.fileName : 'No file uploaded'}
                  </div>

                  <label
                    className="px-3.5 py-1.5 rounded-xl bg-[#3b0764] hover:bg-purple-900 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center space-x-1 shadow-md shadow-purple-950/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>{upload ? 'Change' : 'Upload'}</span>
                    <input
                      type="file"
                      className="hidden"
                      tabIndex={-1}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(source.id, file);
                        }
                        // Reset so the same file can be re-uploaded
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {isScanning && (
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Parsing PDF — text extraction, then AI vision if needed…</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono px-1">
                      Digital PDFs finish instantly · Scanned PDFs use Gemma 4 vision (~3–5s per page)
                    </div>
                  </div>
                )}

                {!isScanning && upload && !upload.autoFilled && (() => {
                  const stmt    = parsedStatements[source.id];
                  const summary = upload.statementSummary || stmt?.summary;
                  const txns    = stmt?.transactions || [];
                  const isExpanded = !!expandedStatements[source.id];
                  return (
                    <div className="space-y-2">
                      {/* File meta + cleanliness badge */}
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">
                          {(upload.sizeBytes / 1024).toFixed(1)} KB &middot; .{upload.format}
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-md border ${
                          upload.cleanlinessPercent >= 60
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Scanned: {upload.cleanlinessPercent}% clean
                        </span>
                      </div>

                      {/* Real LLM-extracted summary stats */}
                      {summary && (summary.transactionCount > 0) && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-white border border-purple-100 rounded-lg px-2.5 py-1.5">
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Transactions</div>
                            <div className="text-xs font-bold text-[#3b0764]">{summary.transactionCount}</div>
                          </div>
                          <div className="bg-white border border-purple-100 rounded-lg px-2.5 py-1.5">
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Total Debit</div>
                            <div className="text-xs font-bold text-red-600">₹{(summary.totalDebit || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                          </div>
                          <div className="bg-white border border-purple-100 rounded-lg px-2.5 py-1.5">
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Total Credit</div>
                            <div className="text-xs font-bold text-emerald-600">₹{(summary.totalCredit || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</div>
                          </div>
                          <div className="bg-white border border-purple-100 rounded-lg px-2.5 py-1.5">
                            <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Closing Bal</div>
                            <div className="text-xs font-bold text-slate-700">
                              {summary.closingBalance != null ? `₹${summary.closingBalance.toLocaleString('en-IN', {maximumFractionDigits: 0})}` : '—'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable transaction table */}
                      {txns.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedStatements(prev => ({ ...prev, [source.id]: !isExpanded }))}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-100 transition-colors"
                          >
                            <span>📋 View {txns.length} Extracted Transactions</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="mt-1.5 border border-purple-100 rounded-xl overflow-hidden">
                              <div className="max-h-48 overflow-y-auto">
                                <table className="w-full text-[9px] font-mono">
                                  <thead className="bg-purple-50 sticky top-0">
                                    <tr>
                                      <th className="px-2 py-1.5 text-left text-[#3b0764] font-bold">Date</th>
                                      <th className="px-2 py-1.5 text-left text-[#3b0764] font-bold">Narration</th>
                                      <th className="px-2 py-1.5 text-right text-[#3b0764] font-bold">Type</th>
                                      <th className="px-2 py-1.5 text-right text-[#3b0764] font-bold">Amount</th>
                                      <th className="px-2 py-1.5 text-right text-[#3b0764] font-bold">Balance</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txns.map((tx, i) => (
                                      <tr key={i} className={`border-t border-purple-50 ${ i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{tx.date || '—'}</td>
                                        <td className="px-2 py-1 text-slate-700 max-w-30 truncate" title={tx.narration}>{tx.narration}</td>
                                        <td className="px-2 py-1 text-right">
                                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                                            tx.type === 'DEBIT'
                                              ? 'bg-red-50 text-red-700'
                                              : 'bg-emerald-50 text-emerald-700'
                                          }`}>{tx.type}</span>
                                        </td>
                                        <td className={`px-2 py-1 text-right font-bold ${ tx.type === 'DEBIT' ? 'text-red-600' : 'text-emerald-600'}`}>
                                          ₹{(tx.amount || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}
                                        </td>
                                        <td className="px-2 py-1 text-right text-slate-500">
                                          {tx.balance != null ? `₹${tx.balance.toLocaleString('en-IN', {maximumFractionDigits: 0})}` : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error from LLM */}
                      {stmt?.error && (
                        <div className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          ⚠ {stmt.error}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {!isScanning && upload?.autoFilled && (
                  <div className="text-[10px] font-mono text-slate-400">
                    Sample file (not scanned) &middot; assumed {upload.cleanlinessPercent}% clean
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Data Pre-Processing & Feature Engineering Process (5 Steps) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-extrabold text-[#3b0764]">
              2. Data Pre-Processing & Feature Engineering Process
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Stage 1: Vector Preprocessing, Normalization & Feature Selection</span>
          </div>

          <button
            onClick={startPipeline}
            disabled={isPipelineRunning}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              isPipelineRunning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-[#3b0764] text-white hover:bg-purple-900 shadow-purple-950/20 cursor-pointer'
            }`}
          >
            {isPipelineRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Process 1 by 1...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{pipelineStep === 6 ? 'Re-Run Process' : 'Start Process'}</span>
              </>
            )}
          </button>
        </div>

        <div className="border border-purple-100 rounded-2xl p-5 bg-white shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {pipelineSteps.map((step) => {
              const isDone = pipelineStep > step.id;
              const isCurrent = pipelineStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border text-xs transition-all duration-300 ${
                    isCurrent
                      ? 'border-purple-500 bg-purple-50 font-bold shadow-sm ring-2 ring-purple-400'
                      : isDone
                      ? 'border-purple-200 bg-purple-50/60 text-[#3b0764]'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{step.name}</span>
                    {isDone && <Check className="w-3.5 h-3.5 text-purple-700 stroke-3" />}
                    {isCurrent && <Loader2 className="w-3 h-3 text-purple-700 animate-spin" />}
                  </div>
                  <p className="text-[10px] text-slate-500">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {stageLog.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-100 space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Real Execution Log</span>
            {stageLog.map((stage) => (
              <div key={stage.id} className="flex items-start gap-2 text-[10px] font-mono">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span className="text-slate-500 shrink-0">{stage.durationMs}ms</span>
                <span className="text-slate-600">{stage.detail}</span>
              </div>
            ))}
            {selectedFeatures.length > 0 && pipelineStep === 6 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-1.5">
                <span className="text-[10px] font-mono text-slate-400 mr-1">Selected features:</span>
                {selectedFeatures.map((f) => (
                  <span key={f} className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded text-[#3b0764]">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. LLM Noise Inspection & Activation Box */}
      <div className="border border-purple-100 rounded-2xl p-5 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-[#3b0764]">
              3. LLM Noise Inspection & Activation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Raw Data Noise: <strong className="text-[#3b0764]">{rawNoisePercent}%</strong> {isLLMActiveForNoise ? '(Exceeds 40% Noise Threshold Limit)' : '(Within Acceptable Threshold)'}
            </p>
          </div>

          <div className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold shrink-0 flex items-center space-x-2 ${
            isLLMActiveForNoise
              ? 'bg-purple-100 border-purple-200 text-[#3b0764]'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isLLMActiveForNoise ? 'bg-purple-600' : 'bg-emerald-600'}`}></span>
            <span>{isLLMActiveForNoise ? 'LLM Activated' : 'Direct Ingestion (Clean)'}</span>
          </div>
        </div>
      </div>

      {/* 4. Processed Dataset Table */}
      {showProcessedTable && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PROCESS VECTOR OUTPUT</span>
              <h2 className="text-sm font-bold text-[#3b0764]">
                4. Processed Dataset Table
              </h2>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg text-[#3b0764]">
              Stored File: {storedFile}
            </span>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Record ID</th>
                  <th className="py-2.5 px-3">ADB Score</th>
                  <th className="py-2.5 px-3">GST Delta</th>
                  <th className="py-2.5 px-3">UPI Velocity</th>
                  <th className="py-2.5 px-3">Duplicate TXN Check</th>
                  <th className="py-2.5 px-3">Norm Score</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {processedTableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-[#3b0764]">{row.id}</td>
                    <td className="py-2 px-3">{row.adb}</td>
                    <td className="py-2 px-3">{row.gstDelta}</td>
                    <td className="py-2 px-3">{row.upiVelocity}</td>
                    <td className="py-2 px-3">{row.cersai}</td>
                    <td className="py-2 px-3 font-semibold">{row.normScore}</td>
                    <td className="py-2 px-3">
                      <span className={`w-32 inline-block text-center py-0.5 rounded-md text-[10px] font-bold ${
                        row.status === 'Normalized'
                          ? 'bg-purple-50 border border-purple-200 text-[#3b0764]'
                          : 'bg-amber-50 border border-amber-200 text-amber-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Normalize Data Table (Stage 3: real MinMax scaling & Z-score standardization) */}
      {showProcessedTable && normalizeTable.length > 0 && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-purple-100 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 3 OUTPUT</span>
            <h2 className="text-sm font-bold text-[#3b0764]">
              5. Normalize Data — MinMax &amp; Z-Score per Feature
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Domain-bounded MinMax scaling to [0,1] and Z-score standardization against an assumed portfolio reference μ/σ.
            </p>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Feature</th>
                  <th className="py-2.5 px-3 text-right">Raw Value</th>
                  <th className="py-2.5 px-3 text-right">MinMax [0,1]</th>
                  <th className="py-2.5 px-3 text-right">Z-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {normalizeTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-[#3b0764]">{row.sourceId}</td>
                    <td className="py-2 px-3 text-slate-700">{row.feature}</td>
                    <td className="py-2 px-3 text-right">{row.raw}</td>
                    <td className="py-2 px-3 text-right font-semibold text-purple-900">{row.minmax}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${row.zscore >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.zscore >= 0 ? '+' : ''}{row.zscore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Feature Engineering Table (Stage 4: real derived temporal-ratio features) */}
      {showProcessedTable && engineeredTable.length > 0 && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-purple-100 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 4 OUTPUT</span>
            <h2 className="text-sm font-bold text-[#3b0764]">
              6. Feature Engineering — Derived Temporal Ratios
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              New variables computed from real monthly credit/debit &amp; average balance, beyond the base 9 extracted features.
            </p>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Engineered Feature</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3 text-right">MinMax [0,1]</th>
                  <th className="py-2.5 px-3 text-right">Z-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {engineeredTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-[#3b0764]">{row.sourceId}</td>
                    <td className="py-2 px-3 text-slate-700">{row.feature}</td>
                    <td className="py-2 px-3 text-right">{row.value}</td>
                    <td className="py-2 px-3 text-right font-semibold text-purple-900">{row.minmax}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${row.zscore >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.zscore >= 0 ? '+' : ''}{row.zscore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Data Selection Table (Stage 5: real variance ranking) */}
      {showProcessedTable && selectionTable.length > 0 && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-purple-100 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 5 OUTPUT</span>
            <h2 className="text-sm font-bold text-[#3b0764]">
              7. Data Selection — High-Variance Feature Ranking
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              All 11 candidate features ranked by variance (sklearn); top {selectedFeatures.length} selected for the stored feature vector.
            </p>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Feature</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3">Selected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {selectionTable.map((row) => (
                  <tr key={row.rank} className="hover:bg-purple-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-[#3b0764]">#{row.rank}</td>
                    <td className="py-2 px-3 text-slate-700">{row.feature}</td>
                    <td className="py-2 px-3 text-right">{row.variance === null ? '—' : row.variance}</td>
                    <td className="py-2 px-3">
                      <span className={`w-20 inline-block text-center py-0.5 rounded-md text-[10px] font-bold ${
                        row.selected
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border border-slate-200 text-slate-400'
                      }`}>
                        {row.selected ? 'Selected' : 'Dropped'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Standalone: Model Training Process Card */}
      {showProcessedTable && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL SELECTION & TRAINING</span>
              <h2 className="text-sm font-bold text-[#3b0764]">
                8. Model Training Process
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              ML Training Execution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="fileSelect"
                checked={selectedDatasetFile === "processed_features_vector.csv"}
                onChange={() => setSelectedDatasetFile("processed_features_vector.csv")}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="fileSelect" className="text-xs font-bold text-[#3b0764] cursor-pointer">
                File: <span className="font-mono text-purple-900 font-semibold">processed_features_vector.csv</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-[#3b0764] block mb-1">
                Select ML Model Algorithm:
              </label>
              <div className="relative">
                <select
                  value={selectedMLAlgorithm}
                  onChange={(e) => setSelectedMLAlgorithm(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-8"
                >
                  <option value="gradient_boosting">Gradient Boosting</option>
                  <option value="random_forest">Random Forest</option>
                  <option value="logistic_regression">Logistic Regression</option>
                  <option value="svm">SVM (Support Vector Machine)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-purple-100">
            <button
              onClick={startTraining}
              disabled={isTrainingRunning}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
                isTrainingRunning
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-[#3b0764] text-white hover:bg-purple-900 shadow-purple-950/20 cursor-pointer'
              }`}
            >
              {isTrainingRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Training with {selectedMLAlgorithm.replace('_', ' ').toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Training ({selectedMLAlgorithm.replace('_', ' ').toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 9. Generated Models Output Section */}
      {(visibleModelsCount > 0 || trainingDone) && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm transition-all duration-500 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#3b0764]">
                9. Generated Models Output
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Trained using: <strong className="text-[#3b0764] uppercase">{selectedMLAlgorithm.replace('_', ' ')}</strong>
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Generating: {visibleModelsCount} of {readyModelsList.length} Models
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {readyModelsList.slice(0, visibleModelsCount).map((model) => (
              <div
                key={model.id}
                className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2 transition-all duration-500 animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#3b0764]">{model.name}</h3>
                  <div className="flex items-center gap-1">
                    {model.realData && (
                      <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">LIVE</span>
                    )}
                    <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-purple-200 rounded text-purple-900">
                      {model.accuracy}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{model.desc}</p>
                <div className="text-[9px] font-mono text-purple-700 font-semibold">
                  Algorithm: {selectedMLAlgorithm.replace('_', ' ').toUpperCase()}
                </div>
                {model.cvFolds && (
                  <div className="text-[9px] font-mono text-slate-400">
                    {model.cvFolds}-fold CV · {model.sampleCount} samples
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Real extracted features — shown after all models appear */}
          {trainingDone && realFeatures && (
            <div className="border-t border-purple-100 pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">Real Data</span>
                <span className="text-[10px] font-mono text-slate-500">
                  Features extracted from {trainingTxCount} real transactions
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Avg Daily Bal', value: `₹${Math.round(realFeatures.avg_daily_balance).toLocaleString('en-IN')}` },
                  { label: 'Credit/Debit', value: realFeatures.credit_debit_ratio?.toFixed(3) },
                  { label: 'Bal Volatility', value: realFeatures.balance_volatility?.toFixed(4) },
                  { label: 'TX Velocity', value: `${realFeatures.tx_velocity?.toFixed(2)}/day` },
                  { label: 'Max Drawdown', value: `${(realFeatures.max_drawdown_pct * 100)?.toFixed(1)}%` },
                  { label: 'Monthly Credit', value: `₹${Math.round(realFeatures.monthly_credit).toLocaleString('en-IN')}` },
                  { label: 'Monthly Debit', value: `₹${Math.round(realFeatures.monthly_debit).toLocaleString('en-IN')}` },
                  { label: 'Large TX %', value: `${(realFeatures.large_tx_pct * 100)?.toFixed(1)}%` },
                  { label: 'Gap Score', value: realFeatures.irregular_gap_score?.toFixed(4) },
                ].map(f => (
                  <div key={f.label} className="bg-white border border-purple-100 rounded-lg px-2.5 py-1.5">
                    <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</div>
                    <div className="text-[11px] font-bold text-[#3b0764] font-mono">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. Model Version & Deployment Management Table */}
      {readyModelsList.length > 0 && (visibleModelsCount === readyModelsList.length || trainingDone) && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL REGISTRY & DEPLOYMENT</span>
              <h2 className="text-sm font-bold text-[#3b0764]">
                10. Model Version & Deployment Management Table
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Active Registry
            </span>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Select Version</th>
                  <th className="py-2.5 px-3">Model Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created Date</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {readyModelsList.map((model) => {
                  const currentVer = selectedVersionMap[model.id] || "v3.4";
                  const currentStatus = deployedStatusMap[model.id] || "Ready";

                  return (
                    <tr key={model.id} className="hover:bg-purple-50/30 transition-colors text-slate-800">
                      <td className="py-2 px-3">
                        <div className="relative max-w-32.5">
                          <select
                            value={currentVer}
                            onChange={(e) => handleVersionChange(model.id, e.target.value)}
                            className="w-full bg-purple-50/50 border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-6"
                          >
                            {versionOptions.map((v) => (
                              <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>

                      <td className="py-2 px-3 font-bold text-[#3b0764]">{model.name}</td>

                      <td className="py-2 px-3">
                        <span className={`w-20 inline-block text-center py-0.5 rounded-md text-[10px] font-extrabold font-mono border ${
                          currentStatus === "Deployed"
                            ? 'bg-purple-900 text-white border-purple-900'
                            : 'bg-purple-50 text-[#3b0764] border-purple-200'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-slate-600">{model.createdDate}</td>

                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleDeploy(model.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            currentStatus === "Deployed"
                              ? 'bg-purple-100 text-[#3b0764] hover:bg-purple-200'
                              : 'bg-[#3b0764] hover:bg-purple-900 text-white shadow-purple-950/20'
                          }`}
                        >
                          {currentStatus === "Deployed" ? 'Undeploy' : 'Deploy'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      {readyModelsList.length > 0 && visibleModelsCount === readyModelsList.length && (
        <div className="pt-6 border-t border-purple-200 flex justify-end">
          <button
            onClick={onNext}
            className="px-7 py-3 rounded-xl font-bold text-xs bg-[#3b0764] hover:bg-purple-900 text-white shadow-lg shadow-purple-950/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <span>Go to Model Testing (View Results)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
