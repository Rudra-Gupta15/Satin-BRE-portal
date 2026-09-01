import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Play, Loader2, ChevronDown, ChevronLeft, ChevronRight, BarChart3, RefreshCw, FolderUp, UploadCloud, X, Ban, PencilLine } from 'lucide-react';
import { api } from '../api/client';
import Select from './Select';

/* Shared section shell: white card, thin slate border, title + optional
   subtitle, and an optional right-aligned action. */
function SectionCard({ title, sub, action, children, className = '' }) {
  return (
    <section className={`border border-slate-200 rounded-2xl bg-white shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-200">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 leading-tight">{title}</h2>
          {sub && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sub}</p>}
        </div>
        {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* Compact labelled figure used across the upload cards and feature strips. */
function StatTile({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function Page2Pipeline({
  selectedIds,
  onNext,
  focusSourceId,
  trainedModels,
  setTrainedModels,
  selectedVersionMap,
  setSelectedVersionMap,
  deployedStatusMap,
  setDeployedStatusMap
}) {
  const [allSources, setAllSources] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({}); // { [sourceId]: [ { fileName, cleanlinessPercent, sizeBytes, format, autoFilled, statementSummary, transactionsParsed } ] }
  const [scanningIds, setScanningIds]   = useState({}); // { [sourceId]: true } while the folder is being scanned
  const [parsedStatements, setParsedStatements] = useState({}); // { [sourceId]: [ { transactions, summary } ] } — one per file
  const [expandedStatements, setExpandedStatements] = useState({}); // { [`${sourceId}:${fileIndex}`]: true } expanded tx table
  const [filePages, setFilePages] = useState({}); // { [sourceId]: pageIndex } — file cards are shown 2 at a time
  const [uploadResult, setUploadResult] = useState(null); // our own post-upload summary popup
  const [statusSaved, setStatusSaved] = useState(null); // brief "Saved as X" confirmation
  const folderInputRef = useRef({}); // { [sourceId]: <input webkitdirectory> } — fallback picker

  // Footer: stamp every selected data source with a publish status.
  const saveStatus = async (status) => {
    if (!selectedIds.length) return;
    const statuses = Object.fromEntries(selectedIds.map((id) => [id, status]));
    try { await api.put('/data-sources/status', { statuses }); } catch { /* ignore */ }
    setStatusSaved(status);
    setTimeout(() => setStatusSaved(null), 2500);
  };

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
  const [featuresAsJson, setFeaturesAsJson] = useState(true);   // Stage 5 selected-features view
  const [normalizeTable, setNormalizeTable] = useState([]);   // Stage 3: raw / MinMax / Z-score per feature
  const [engineeredTable, setEngineeredTable] = useState([]); // Stage 4: derived temporal-ratio features
  const [selectionTable, setSelectionTable] = useState([]);   // Stage 5: variance ranking + selected flag
  const [selectionPage, setSelectionPage]   = useState(1);    // Stage 5 table pagination (10/page)

  // Training state & ML Algorithm Selection
  const [selectedDatasetFile, setSelectedDatasetFile] = useState("processed_features_vector.csv");
  const [selectedMLAlgorithm, setSelectedMLAlgorithm] = useState("gradient_boosting");
  const [isTrainingRunning, setIsTrainingRunning] = useState(false);
  const [trainingDone, setTrainingDone] = useState(false);
  const [visibleModelsCount, setVisibleModelsCount] = useState(0);
  const [readyModelsList, setReadyModelsList] = useState([]);
  const [gstRegistry, setGstRegistry] = useState(null);  // { versions, active, deployed } for the GST heads
  const [realFeatures, setRealFeatures]       = useState(null);  // real extracted features (bank)
  const [gstFeatures, setGstFeatures]         = useState(null);  // headline GST corpus aggregates
  const [trainingTxCount, setTrainingTxCount] = useState(0);     // # transactions used

  // Model Evaluation (real 5-fold CV, computed at training time)
  const [evalModelId, setEvalModelId] = useState("risk_model");
  const [modelEval, setModelEval] = useState(null);
  const [evalSummary, setEvalSummary] = useState(null);
  const [reEvaluating, setReEvaluating] = useState(false);

  // "0.923" -> "92.3%" · "56.9%" -> "56.9%" · numbers 0-1 -> "%"
  const asPct = (v) => {
    if (v == null) return '—';
    if (typeof v === 'string' && v.trim().endsWith('%')) return v;
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return `${(Math.abs(n) <= 1 ? n * 100 : n).toFixed(1)}%`;
  };

  const loadEvalSummary = () => {
    api.get('/models/evaluation/summary').then(setEvalSummary).catch(() => {});
  };
  const loadEvaluation = (mid) => {
    api.get('/models/evaluation', { model_id: mid }).then((d) => setModelEval(d.evaluation || null)).catch(() => {});
    loadEvalSummary();
  };
  useEffect(() => { loadEvaluation(evalModelId); }, [evalModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reEvaluate = async () => {
    setReEvaluating(true);
    try {
      const d = await api.post(`/models/evaluation/${evalModelId}/re-run`);
      setModelEval(d.evaluation || null);
    } catch (err) {
      alert(err.message);
    } finally {
      setReEvaluating(false);
    }
  };

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
      if (trainedModels.some((m) => m.kind === 'gst')) {
        api.get('/gst/model/registry').then(setGstRegistry).catch(() => {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sources to upload into — the ones the user picked on the Data Sources page
  // (via the card arrow) or that "Apply" in the BRE Rules dialog selected.
  // Nothing selected → the upload section shows a prompt instead of a card.
  const selectedSources = allSources.filter(s => selectedIds.includes(s.id));

  // Only one source's upload card shows — the one whose arrow was clicked on the
  // Data Sources page (falls back to the first selected source).
  const activeUpload =
    selectedSources.find(s => s.id === focusSourceId) || selectedSources[0] || null;

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

  const ACCEPTED_EXT = ['.pdf', '.csv', '.tsv', '.txt', '.json', '.md', '.xlsx'];
  const isAccepted = (name) => ACCEPTED_EXT.some((e) => name.toLowerCase().endsWith(e));

  // Preferred folder picker: File System Access API. Opens the OS directory
  // chooser directly and does NOT raise Chrome's "Upload N files to this site?"
  // trust warning. Falls back to the hidden <input webkitdirectory> on browsers
  // without it (Firefox / Safari).
  const pickFolder = async (id) => {
    if (typeof window.showDirectoryPicker !== 'function') {
      folderInputRef.current?.[id]?.click();
      return;
    }
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ id: 'bre-statements', mode: 'read' });
    } catch {
      return; // user cancelled the picker
    }
    // Walk the folder AND its subfolders (up to 3 levels) so picking a parent
    // folder still finds the files inside.
    const files = [];
    let totalFiles = 0;
    const walk = async (handle, depth) => {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          totalFiles += 1;
          if (isAccepted(entry.name)) {
            try { files.push(await entry.getFile()); } catch { /* skip unreadable */ }
          }
        } else if (entry.kind === 'directory' && depth < 3) {
          await walk(entry, depth + 1);
        }
      }
    };
    await walk(dirHandle, 0);
    if (files.length === 0) {
      alert(
        totalFiles === 0
          ? 'That folder is empty.'
          : `That folder has no PDF / CSV / TSV / TXT / JSON / MD / XLSX files (found ${totalFiles} other file${totalFiles === 1 ? '' : 's'}).`
      );
      return;
    }
    handleFolderUpload(id, files);
  };

  // Uploads a folder of files for one source. The backend byte-scans and parses
  // every file (PDF via the AI vision scanner, CSV/TSV/TXT by column) and keeps
  // them separate so training runs across all of them.
  const handleFolderUpload = async (id, fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.size > 0);
    if (files.length === 0) return;

    setScanningIds(prev => ({ ...prev, [id]: true }));
    setExpandedStatements({});
    setFilePages(prev => ({ ...prev, [id]: 0 }));
    try {
      const formData = new FormData();
      formData.append('sourceId', id);
      files.forEach((f) => formData.append('files', f, f.name));
      const data = await api.postForm('/pipeline/uploads', formData);
      // Guard: data or uploadedFiles may be null if the proxy/backend fails
      if (data?.uploadedFiles) {
        setUploadedFiles(data.uploadedFiles);
      }
      if (Array.isArray(data?.statements)) {
        setParsedStatements(prev => ({ ...prev, [id]: data.statements }));
      }
      // Styled result popup (our own — shown once the parse finishes).
      const metas = data?.files || [];
      const ok = metas.filter((m) => !m.error);
      const gstMeta = ok.find((m) => m.gst)?.gst;
      setUploadResult({
        sourceTitle: allSources.find((s) => s.id === id)?.title || id,
        ok,
        totalTx: ok.reduce((n, m) => n + (m.transactionsParsed ?? m.statementSummary?.transactionCount ?? 0), 0),
        gst: gstMeta || null,
        skipped: data?.skipped || [],
      });
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

  // GST heads share one versioned artifact — rolling the version rolls all 4.
  const handleGstVersionChange = async (version) => {
    const n = parseInt(String(version).replace(/^v/, ''), 10);
    if (!Number.isFinite(n)) return;
    try {
      const reg = await api.put('/gst/model/active', { version: n });
      setGstRegistry(reg);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGstDeploy = async (headId) => {
    setGstRegistry(prev => prev
      ? { ...prev, deployed: { ...prev.deployed, [headId]: !prev.deployed?.[headId] } }
      : prev);
    try {
      const data = await api.post(`/gst/model/${headId}/deploy`);
      setGstRegistry(prev => (prev ? { ...prev, deployed: data.deployed } : prev));
    } catch {
      /* optimistic update already applied */
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
      result = await api.post('/pipeline/run', {
        selectedIds: activeUpload ? [activeUpload.id] : selectedIds,
      });
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
    setSelectionPage(1);
    setShowProcessedTable(true);
  };

  // Run Training on selected file & ML Algorithm: fetch real per-algorithm
  // accuracy from the backend, then animate models revealing one by one.
  const startTraining = async () => {
    setIsTrainingRunning(true);
    setVisibleModelsCount(0);
    setTrainingDone(false);
    setRealFeatures(null);
    setGstFeatures(null);

    let data;
    try {
      data = await api.post('/models/train', {
        algorithm: selectedMLAlgorithm,
        datasetFile: selectedDatasetFile,
        sourceId: activeUpload ? activeUpload.id : null,
      });
    } catch (err) {
      setIsTrainingRunning(false);
      alert(err.message);
      return;
    }

    setReadyModelsList(data.models);
    if (data.realFeatures && Object.keys(data.realFeatures).length) setRealFeatures(data.realFeatures);
    if (data.gstFeatureSummary) setGstFeatures(data.gstFeatureSummary);
    if (data.gstRegistry) setGstRegistry(data.gstRegistry);
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
        loadEvaluation(evalModelId);
      }
    }, 600);
  };


  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Model Hub</h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload data, select AI & extract data, run process, inspect table, select ML algorithm, train models, and manage model versions & deployments.
        </p>
      </div>

      {/* 1. Upload Data Section */}
      <SectionCard
        title="Upload Data"
        sub={
          selectedSources.length > 0
            ? `${selectedSources.length} source${selectedSources.length === 1 ? '' : 's'} selected`
            : 'No data source selected'
        }
        action={
          selectedSources.length > 0 ? (
            <button
              onClick={async () => {
                const data = await api.post('/pipeline/uploads/autofill', { sourceIds: selectedIds });
                if (data?.uploadedFiles) setUploadedFiles(data.uploadedFiles);
              }}
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              Auto-fill Sample Data
            </button>
          ) : null
        }
      >
        {selectedSources.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <p className="text-sm font-bold text-slate-700">Pick a data source first</p>
            <p className="text-xs text-slate-500 mt-1">
              On <span className="font-semibold text-slate-700">Data Sources</span>, click the arrow on a source
              (or use <span className="font-semibold text-slate-700">Apply</span> in the BRE Rules dialog) — the
              upload area appears here once a source is chosen.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {(activeUpload ? [activeUpload] : []).map((source) => {
            const raw = uploadedFiles[source.id];
            const files = Array.isArray(raw) ? raw : (raw ? [raw] : []);
            const rawStmts = parsedStatements[source.id];
            const statements = Array.isArray(rawStmts) ? rawStmts : (rawStmts ? [rawStmts] : []);
            const isScanning = !!scanningIds[source.id];
            const hasFiles = files.length > 0;
            const totalTx = files.reduce(
              (n, f) => n + (f.transactionsParsed ?? f.statementSummary?.transactionCount ?? 0), 0
            );
            const isGst = files.some(f => f.gst);
            const gstReturns = files.some(f => f.gst?.mode === 'returns');
            const totalGstRecords = files.reduce((n, f) => n + (f.gst?.records ?? 0), 0);
            const totalGstBiz = files.reduce((n, f) => n + (f.gst?.businesses ?? 0), 0);

            // File cards are paged 2-up so a big folder isn't one long scroll.
            const PER_PAGE = 2;
            const totalPages = Math.max(1, Math.ceil(files.length / PER_PAGE));
            const page = Math.min(filePages[source.id] || 0, totalPages - 1);
            const start = page * PER_PAGE;
            const pageFiles = files.slice(start, start + PER_PAGE);
            const goPage = (p) => setFilePages(prev => ({ ...prev, [source.id]: p }));

            return (
              <div key={source.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                {/* Card head: source + folder summary + action */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 shrink-0">
                      <FolderUp className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{source.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {!hasFiles
                          ? 'No folder uploaded'
                          : gstReturns
                          ? `${files.length} file${files.length === 1 ? '' : 's'} · ${totalGstBiz} business${totalGstBiz === 1 ? '' : 'es'}`
                          : isGst
                          ? `${files.length} file${files.length === 1 ? '' : 's'} · ${totalGstRecords} GST record${totalGstRecords === 1 ? '' : 's'}`
                          : `${files.length} file${files.length === 1 ? '' : 's'} · ${totalTx} txn${totalTx === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); pickFolder(source.id); }}
                    className="px-3 py-1.5 rounded-lg btn-orange text-white text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{hasFiles ? 'Change Folder' : 'Upload Folder'}</span>
                  </button>
                  {/* Fallback picker for browsers without showDirectoryPicker */}
                  <input
                    ref={(el) => { folderInputRef.current[source.id] = el; }}
                    type="file"
                    className="hidden"
                    tabIndex={-1}
                    multiple
                    webkitdirectory=""
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleFolderUpload(source.id, e.target.files);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>

                <div className="p-4 space-y-2.5">
                  {!isScanning && !hasFiles && (
                    <p className="text-[11px] text-slate-400">
                      Select a folder of statements — any mix of PDF, CSV, TSV, TXT, JSON, MD or XLSX.
                      Other file types in the folder are skipped.
                    </p>
                  )}

                  {isScanning && (
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-[10px] font-mono font-bold text-purple-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Scanning &amp; parsing every file in the folder…</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono px-1">
                        CSV / TSV / TXT / JSON / MD / XLSX finish instantly · scanned PDFs use Gemma 4 vision (~3–5s per page)
                      </div>
                    </div>
                  )}

                  {!isScanning && hasFiles && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {pageFiles.map((f, pi) => {
                    const i = start + pi;
                    const stmt = statements[i];
                    const summary = f.statementSummary || stmt?.summary;
                    const txns = stmt?.transactions || [];
                    const key = `${source.id}:${i}`;
                    const isExpanded = !!expandedStatements[key];

                    return (
                      <div key={key} className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5 space-y-2 self-start">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800 truncate min-w-0" title={f.fileName}>
                            {f.fileName}
                          </span>
                          {f.autoFilled ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200 shrink-0">
                              SAMPLE
                            </span>
                          ) : (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              (f.cleanlinessPercent ?? 0) >= 60
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {f.cleanlinessPercent}% clean
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium">
                          {f.sizeBytes != null ? `${(f.sizeBytes / 1024).toFixed(1)} KB · ` : ''}.{f.format}
                        </div>

                        {f.gst && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <StatTile
                              label={f.gst.mode === 'returns' ? 'Businesses' : 'GST records'}
                              value={f.gst.mode === 'returns' ? (f.gst.businesses ?? f.gst.records) : f.gst.records}
                            />
                            <StatTile
                              label="Avg score"
                              tone="text-purple-700"
                              value={f.gst.avgUnderwritingScore != null ? f.gst.avgUnderwritingScore : '—'}
                            />
                            {f.gst.mode === 'returns' && f.gst.returnsSeen && (
                              <div className="col-span-2 flex flex-wrap gap-1">
                                {Object.entries(f.gst.returnsSeen).filter(([, n]) => n > 0).map(([t, n]) => (
                                  <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                                    {t} ×{n}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Risk flags</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(f.gst.riskCounts || {}).map(([flag, n]) => (
                                  <span key={flag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    flag === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : flag === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>{flag} {n}</span>
                                ))}
                                {!f.gst.modelAvailable && (
                                  <span className="text-[9px] font-bold text-slate-400">model not trained</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {summary && summary.transactionCount > 0 && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <StatTile label="Transactions" value={summary.transactionCount} />
                            <StatTile
                              label="Total Debit"
                              tone="text-rose-600"
                              value={`₹${(summary.totalDebit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            />
                            <StatTile
                              label="Total Credit"
                              tone="text-emerald-600"
                              value={`₹${(summary.totalCredit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                            />
                            <StatTile
                              label="Closing Bal"
                              tone="text-slate-700"
                              value={summary.closingBalance != null ? `₹${summary.closingBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                            />
                          </div>
                        )}

                        {txns.length > 0 && (
                          <div>
                            <button
                              onClick={() => setExpandedStatements(prev => ({ ...prev, [key]: !isExpanded }))}
                              className="w-full flex items-center justify-between text-[10px] font-bold text-purple-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                            >
                              <span>View {txns.length} extracted transactions</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {isExpanded && (
                              <div className="mt-1.5 border border-slate-200 rounded-xl overflow-hidden">
                                <div className="max-h-48 overflow-y-auto">
                                  <table className="w-full text-[9px] font-mono">
                                    <thead className="bg-slate-50 sticky top-0">
                                      <tr>
                                        <th className="px-2 py-1.5 text-left text-slate-800 font-bold">Date</th>
                                        <th className="px-2 py-1.5 text-left text-slate-800 font-bold">Narration</th>
                                        <th className="px-2 py-1.5 text-right text-slate-800 font-bold">Type</th>
                                        <th className="px-2 py-1.5 text-right text-slate-800 font-bold">Amount</th>
                                        <th className="px-2 py-1.5 text-right text-slate-800 font-bold">Balance</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {txns.map((tx, ti) => (
                                        <tr key={ti} className={`border-t border-slate-100 ${ ti % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
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

                        {stmt?.error && (
                          <div className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                            ⚠ {stmt.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                  )}

                  {!isScanning && hasFiles && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Files {start + 1}–{Math.min(start + PER_PAGE, files.length)} of {files.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={page === 0}
                          onClick={() => goPage(page - 1)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-3 h-3" /> Prev
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono px-1">{page + 1}/{totalPages}</span>
                        <button
                          type="button"
                          disabled={page >= totalPages - 1}
                          onClick={() => goPage(page + 1)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                        >
                          Next <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 2. Data Pre-Processing & Feature Engineering Process (5 Steps) */}
      <SectionCard
        title="Data Pre-Processing & Feature Engineering Process"
        sub="Stage 1: Vector Preprocessing, Normalization & Feature Selection"
        action={
          <button
            onClick={startPipeline}
            disabled={isPipelineRunning}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isPipelineRunning
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'btn-orange text-white shadow-orange-900/15 cursor-pointer'
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
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {pipelineSteps.map((step) => {
            const isDone = pipelineStep > step.id;
            const isCurrent = pipelineStep === step.id;

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? 'border-[#fdba74] bg-orange-50/40 ring-1 ring-[#fdba74] shadow-sm'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[11px] font-bold ${isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.name}
                  </span>
                  {isDone && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-3 shrink-0" />}
                  {isCurrent && <Loader2 className="w-3 h-3 text-orange-500 animate-spin shrink-0" />}
                </div>
                <p className={`text-[10px] leading-snug ${isDone || isCurrent ? 'text-slate-500' : 'text-slate-400'}`}>
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {stageLog.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">Real Execution Log</span>
            {stageLog.map((stage) => (
              <div key={stage.id} className="flex items-start gap-2 text-[10px] font-mono">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span className="text-slate-500 shrink-0">{stage.durationMs}ms</span>
                <span className="text-slate-600">{stage.detail}</span>
              </div>
            ))}
            {selectedFeatures.length > 0 && pipelineStep === 6 && (
              <div className="pt-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Selected features ({selectedFeatures.length}):</span>
                  <button
                    type="button"
                    onClick={() => setFeaturesAsJson((v) => !v)}
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:border-slate-300 cursor-pointer"
                  >
                    {featuresAsJson ? 'view as chips' : 'view as JSON'}
                  </button>
                </div>
                {featuresAsJson ? (
                  <pre className="text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 overflow-x-auto leading-relaxed">
{JSON.stringify(selectedFeatures, null, 2)}
                  </pre>
                ) : (
                  <div className="flex items-center flex-wrap gap-1.5">
                    {selectedFeatures.map((f) => (
                      <span key={f} className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 3. AI Noise Inspection & Activation Box */}
      <SectionCard
        title="AI Noise Inspection & Activation"
        sub={
          <>
            Raw Data Noise: <strong className="text-slate-800">{rawNoisePercent}%</strong>{' '}
            {isLLMActiveForNoise ? '(Exceeds 40% Noise Threshold Limit)' : '(Within Acceptable Threshold)'}
          </>
        }
        action={
          <div className={`px-3.5 py-2 rounded-lg border text-xs font-bold shrink-0 flex items-center gap-2 ${
            isLLMActiveForNoise
              ? 'bg-slate-100 border-slate-200 text-slate-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${isLLMActiveForNoise ? 'bg-purple-600' : 'bg-emerald-600'}`}></span>
            <span>{isLLMActiveForNoise ? 'AI Activated' : 'Direct Ingestion (Clean)'}</span>
          </div>
        }
      >
        <p className="text-[11px] text-slate-500">
          When raw noise exceeds the 40% threshold, the AI cleaning pass is activated automatically before
          ingestion; otherwise the vector is ingested directly.
        </p>
      </SectionCard>

      {/* 4. Processed Dataset Table */}
      {showProcessedTable && (
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PROCESS VECTOR OUTPUT</span>
              <h2 className="text-sm font-bold text-slate-800">
                Processed Dataset Table
              </h2>
            </div>

            <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
              Stored File: {storedFile}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
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
                  <tr key={idx} className={`hover:bg-slate-50/30 text-slate-800 ${row.kind === 'gst' ? 'bg-purple-50/40' : ''}`}>
                    <td className="py-2 px-3 font-bold text-slate-800">{row.id}</td>
                    <td className="py-2 px-3">{row.adb}</td>
                    <td className="py-2 px-3">{row.gstDelta}</td>
                    <td className="py-2 px-3">{row.upiVelocity}</td>
                    <td className="py-2 px-3">{row.cersai}</td>
                    <td className="py-2 px-3 font-semibold">{row.normScore}</td>
                    <td className="py-2 px-3">
                      <span className={`w-32 inline-block text-center py-0.5 rounded-md text-[10px] font-bold ${
                        row.status === 'Normalized'
                          ? 'bg-slate-50 border border-slate-200 text-slate-800'
                          : row.status === 'GST scored'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
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
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 3 OUTPUT</span>
            <h2 className="text-sm font-bold text-slate-800">
              Normalize Data — MinMax &amp; Z-Score per Feature
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Domain-bounded MinMax scaling to [0,1] and Z-score standardization against an assumed portfolio reference μ/σ.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
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
                  <tr key={idx} className="hover:bg-slate-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-slate-800">{row.sourceId}</td>
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
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 4 OUTPUT</span>
            <h2 className="text-sm font-bold text-slate-800">
              Feature Engineering — Derived Temporal Ratios
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              New variables computed from real monthly credit/debit &amp; average balance, beyond the base 9 extracted features.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
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
                  <tr key={idx} className="hover:bg-slate-50/30 text-slate-800">
                    <td className="py-2 px-3 font-bold text-slate-800">{row.sourceId}</td>
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
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">STAGE 5 OUTPUT</span>
            <h2 className="text-sm font-bold text-slate-800">
              Data Selection — High-Variance Feature Ranking
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {selectionTable.filter((r) => r.kind !== 'gst').length} bank-statement features ranked by variance (sklearn)
              {selectionTable.some((r) => r.kind === 'gst') && ` + ${selectionTable.filter((r) => r.kind === 'gst').length} GST underwriting features`}.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Feature</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3">Selected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {selectionTable
                  .slice(
                    (Math.min(selectionPage, Math.ceil(selectionTable.length / 10) || 1) - 1) * 10,
                    Math.min(selectionPage, Math.ceil(selectionTable.length / 10) || 1) * 10,
                  )
                  .map((row) => (
                  <tr key={row.rank} className={`hover:bg-slate-50/30 text-slate-800 ${row.kind === 'gst' ? 'bg-purple-50/40' : ''}`}>
                    <td className="py-2 px-3 font-bold text-slate-800">#{row.rank}</td>
                    <td className="py-2 px-3 text-slate-700">
                      {row.feature}
                      {row.kind === 'gst' && <span className="ml-2 text-[8px] font-black text-purple-700 bg-purple-100 border border-purple-200 rounded px-1">GST</span>}
                    </td>
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

          {selectionTable.length > 10 && (() => {
            const pageCount = Math.ceil(selectionTable.length / 10);
            const page = Math.min(selectionPage, pageCount);
            const from = (page - 1) * 10 + 1;
            const to = Math.min(page * 10, selectionTable.length);
            return (
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Showing {from}–{to} of {selectionTable.length} features</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectionPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="px-2 text-slate-600">Page {page} / {pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setSelectionPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                    className="px-2.5 py-1 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 8. Standalone: Model Training Process Card */}
      {showProcessedTable && (
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL SELECTION & TRAINING</span>
              <h2 className="text-sm font-bold text-slate-800">
                Model Training Process
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
              <label htmlFor="fileSelect" className="text-xs font-bold text-slate-800 cursor-pointer">
                File: <span className="font-mono text-purple-900 font-semibold">processed_features_vector.csv</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Select ML Model Algorithm:
              </label>
              <Select
                value={selectedMLAlgorithm}
                onChange={setSelectedMLAlgorithm}
                options={[
                  { value: 'gradient_boosting', label: 'Gradient Boosting' },
                  { value: 'random_forest', label: 'Random Forest' },
                  { value: 'logistic_regression', label: 'Logistic Regression' },
                  { value: 'svm', label: 'SVM (Support Vector Machine)' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              onClick={startTraining}
              disabled={isTrainingRunning}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
                isTrainingRunning
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'btn-orange text-white shadow-orange-900/15 cursor-pointer'
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
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm transition-all duration-500 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Generated Models Output
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Trained using: <strong className="text-slate-800 uppercase">{selectedMLAlgorithm.replace('_', ' ')}</strong>
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
                className={`p-4 rounded-xl border space-y-2 transition-all duration-500 animate-fadeIn ${
                  model.kind === 'gst' ? 'border-purple-200 bg-purple-50/40' : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800">{model.name}</h3>
                  <div className="flex items-center gap-1">
                    {model.realData && (
                      <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">LIVE</span>
                    )}
                    <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-slate-200 rounded text-purple-900">
                      {model.accuracy}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{model.desc}</p>
                <div className="text-[9px] font-mono text-purple-700 font-semibold">
                  Algorithm: {model.kind === 'gst'
                    ? (model.algorithm || 'Gradient Boosting').toUpperCase()
                    : selectedMLAlgorithm.replace('_', ' ').toUpperCase()}
                </div>
                {model.kind === 'gst' ? (
                  <div className="text-[9px] font-mono text-slate-400 space-y-0.5">
                    <div>{model.sampleCount?.toLocaleString?.('en-IN') ?? model.sampleCount} GST profiles · {model.features} features · v{model.version}</div>
                    <div>{model.metricLine}</div>
                  </div>
                ) : model.cvFolds && (
                  <div className="text-[9px] font-mono text-slate-400">
                    {model.cvFolds}-fold CV · {model.sampleCount} samples
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Headline GST corpus aggregates — shown for the GST models */}
          {trainingDone && gstFeatures && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">Real Data</span>
                <span className="text-[10px] font-mono text-slate-500">
                  Aggregates over {trainingTxCount?.toLocaleString?.('en-IN') ?? trainingTxCount} real GST profiles
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(() => {
                  const inr = (n) => n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`;
                  const pct = (n, d = 1) => n == null ? '—' : `${n.toFixed(d)}%`;
                  return [
                    { label: 'Avg Annual Turnover', value: inr(gstFeatures.avgAnnualTurnover) },
                    { label: 'Avg Monthly Turnover', value: inr(gstFeatures.avgMonthlyTurnover) },
                    { label: 'Filing Regularity', value: pct(gstFeatures.filingRegularityPct) },
                    { label: 'On-time Filing', value: pct(gstFeatures.onTimeFilingPct) },
                    { label: 'Turnover Growth YoY', value: pct(gstFeatures.turnoverGrowthYoY) },
                    { label: 'ITC Claim Ratio', value: gstFeatures.itcClaimRatio == null ? '—' : gstFeatures.itcClaimRatio.toFixed(3) },
                    { label: 'Top Buyer Share', value: pct(gstFeatures.topBuyerPct) },
                    { label: 'Avg Vintage', value: gstFeatures.avgVintageYears == null ? '—' : `${gstFeatures.avgVintageYears.toFixed(1)} yrs` },
                    { label: 'Avg UW Score', value: gstFeatures.avgUnderwritingScore == null ? '—' : gstFeatures.avgUnderwritingScore.toFixed(1) },
                  ];
                })().map(f => (
                  <div key={f.label} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</div>
                    <div className="text-[11px] font-bold text-slate-800 font-mono">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real extracted features — shown after all models appear */}
          {trainingDone && realFeatures && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
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
                  <div key={f.label} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</div>
                    <div className="text-[11px] font-bold text-slate-800 font-mono">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9b. Model Evaluation — real cross-validation accuracy (compact).
          Only appears as a step AFTER session training has run — not on every
          load. The Population (dataset) model alone is not enough to show it. */}
      {trainingDone && evalSummary?.sessionModels?.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-700" /> Model Evaluation
              <span className="text-[9px] font-mono text-slate-400 font-normal">real cross-validation</span>
            </h2>
            <div className="flex items-center gap-2">
              {evalSummary.sessionTrainedAt && (
                <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                  {evalSummary.sessionAlgorithm} · {new Date(evalSummary.sessionTrainedAt).toLocaleString()}
                </span>
              )}
              <button onClick={() => { reEvaluate(); loadEvalSummary(); }} disabled={reEvaluating}
                className="px-3 py-1.5 rounded-lg btn-orange text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                {reEvaluating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span>{reEvaluating ? 'Evaluating…' : 'Re-evaluate'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-slate-50/70 text-slate-800 text-[9px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-1.5 px-3">Model</th>
                  <th className="py-1.5 px-3 text-right">Accuracy</th>
                  <th className="py-1.5 px-3 text-right">Precision</th>
                  <th className="py-1.5 px-3 text-right">Recall</th>
                  <th className="py-1.5 px-3 text-right">F1</th>
                  <th className="py-1.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {evalSummary.sessionModels?.map((m) => {
                  const sel = m.modelId === evalModelId;
                  return (
                    <tr key={m.modelId}
                      onClick={() => setEvalModelId(m.modelId)}
                      className={`cursor-pointer ${sel ? 'bg-slate-50/70' : 'hover:bg-slate-50/30'}`}>
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        {sel && <span className="text-purple-500">▸ </span>}{m.name}
                      </td>
                      <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(m.metricValue)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.precision)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.recall)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.f1)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-400 text-[9px]">{sel ? 'shown below' : 'view'}</td>
                    </tr>
                  );
                })}
                {evalSummary.datasetModel && (
                  <tr className="bg-emerald-50/50">
                    <td className="py-1.5 px-3 font-bold text-slate-800">
                      Population Model <span className="text-[8px] bg-emerald-600 text-white px-1 py-0.5 rounded">v{evalSummary.datasetModel.version}</span>
                      <span className="text-[9px] text-slate-400"> · {evalSummary.datasetModel.nSamples?.toLocaleString()} rows</span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(evalSummary.datasetModel.accuracy)}</td>
                    <td className="py-1.5 px-3 text-right">{asPct(evalSummary.datasetModel.precision)}</td>
                    <td className="py-1.5 px-3 text-right">{asPct(evalSummary.datasetModel.recall)}</td>
                    <td className="py-1.5 px-3 text-right">{asPct(evalSummary.datasetModel.f1)}</td>
                    <td className="py-1.5 px-3"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Per-model detail — for the selected session model */}
          {modelEval?.evalMetrics && (
          <div className="space-y-2 border border-slate-200 rounded-lg bg-slate-50/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-purple-600 uppercase">
                {evalSummary.sessionModels?.find((x) => x.modelId === evalModelId)?.name} — detail
              </span>
              {modelEval.evalMetrics.metricMeta?.cvTitle && (
                <span className="text-[9px] font-mono text-emerald-700">{modelEval.evalMetrics.metricMeta.cvTitle}</span>
              )}
            </div>
            {/* aggregate metric strip — R²/MSE/MAE etc. not in the main table */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { key: 'r2Score', fb: 'R² SCORE' },
                { key: 'mse', fb: 'MSE' },
                { key: 'mae', fb: 'MAE' },
                { key: 'precision', fb: 'PRECISION', pct: true },
                { key: 'recall', fb: 'RECALL', pct: true },
                { key: 'f1Score', fb: 'F1 SCORE', pct: true },
              ].map(({ key, fb, pct }) => {
                const meta = modelEval.evalMetrics.metricMeta?.[key];
                const raw = modelEval.evalMetrics[key];
                return (
                  <div key={key} className="rounded-lg bg-white border border-slate-200 px-2 py-1.5">
                    <span className="text-[8px] font-mono font-bold text-slate-400 block truncate">{meta?.name || fb}</span>
                    <span className="text-sm font-extrabold text-slate-800 font-mono block">{pct ? asPct(raw) : raw}</span>
                  </div>
                );
              })}
            </div>
            {modelEval.cvFolds?.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="text-slate-800 text-[9px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-1 px-3">Fold</th><th className="py-1 px-3 text-right">R²</th>
                    <th className="py-1 px-3 text-right">MSE</th><th className="py-1 px-3 text-right">Precision</th>
                    <th className="py-1 px-3 text-right">Recall</th><th className="py-1 px-3 text-right">MAE</th>
                    <th className="py-1 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {modelEval.cvFolds.map((f, i) => (
                    <tr key={i}>
                      <td className="py-1 px-3 font-bold text-slate-800">{f.fold}</td>
                      <td className="py-1 px-3 text-right">{f.r2}</td>
                      <td className="py-1 px-3 text-right">{f.mse}</td>
                      <td className="py-1 px-3 text-right text-emerald-700">{f.precision}</td>
                      <td className="py-1 px-3 text-right text-emerald-700">{f.recall}</td>
                      <td className="py-1 px-3 text-right">{f.mae}</td>
                      <td className="py-1 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                          f.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>{f.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
          )}

          <p className="text-[9px] text-slate-400 font-mono">
            Session models: real 5-fold CV, ~600 profiles anchored to the uploaded statement. Population model: dataset-trained (AI Intelligence). Click a model row to see its per-fold detail below.
          </p>
        </div>
      )}

      {/* 10. Model Version & Deployment Management Table */}
      {readyModelsList.length > 0 && (visibleModelsCount === readyModelsList.length || trainingDone) && (
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL REGISTRY & DEPLOYMENT</span>
              <h2 className="text-sm font-bold text-slate-800">
                Model Version & Deployment Management Table
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Active Registry
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
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

                  if (model.kind === 'gst') {
                    const gstVerOpts = (gstRegistry?.versions || []).map((v) => ({
                      value: v.value, label: v.label,
                    }));
                    const gstVer = gstRegistry?.active ? `v${gstRegistry.active}` : `v${model.version}`;
                    const deployed = gstRegistry?.deployed?.[model.id] ?? true;
                    return (
                      <tr key={model.id} className="bg-purple-50/40 text-slate-800">
                        <td className="py-2 px-3">
                          {gstVerOpts.length > 0 ? (
                            <div className="max-w-36">
                              <Select
                                value={gstVer}
                                onChange={handleGstVersionChange}
                                options={gstVerOpts}
                                buttonClassName="w-full flex items-center justify-between gap-1.5 bg-white border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-900 cursor-pointer hover:border-purple-300"
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">{gstVer}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{model.name}</td>
                        <td className="py-2 px-3">
                          <span className={`w-20 inline-block text-center py-0.5 rounded-md text-[10px] font-extrabold font-mono border ${
                            deployed
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {deployed ? 'DEPLOYED' : 'REVOKED'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{model.createdDate}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleGstDeploy(model.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                              deployed
                                ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                : 'btn-orange text-white shadow-orange-900/15'
                            }`}
                          >
                            {deployed ? 'Revoke' : 'Deploy'}
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={model.id} className="hover:bg-slate-50/30 transition-colors text-slate-800">
                      <td className="py-2 px-3">
                        <div className="max-w-36">
                          <Select
                            value={currentVer}
                            onChange={(v) => handleVersionChange(model.id, v)}
                            options={versionOptions}
                            buttonClassName="w-full flex items-center justify-between gap-1.5 bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer hover:border-slate-300"
                          />
                        </div>
                      </td>

                      <td className="py-2 px-3 font-bold text-slate-800">{model.name}</td>

                      <td className="py-2 px-3">
                        <span className={`w-20 inline-block text-center py-0.5 rounded-md text-[10px] font-extrabold font-mono border ${
                          currentStatus === "Deployed"
                            ? 'bg-purple-900 text-white border-purple-900'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
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
                              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              : 'btn-orange text-white shadow-orange-900/15'
                          }`}
                        >
                          {currentStatus === "Deployed" ? 'Revoke' : 'Upload'}
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

      {/* Footer */}
      {(selectedIds.length > 0 || readyModelsList.length > 0) && (
        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
          {statusSaved && (
            <span className="mr-auto text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-3" /> Saved as {statusSaved}
            </span>
          )}

          {[
            { v: 'published', label: 'Published', cls: 'btn-purple shadow-purple-950/25', Icon: Check },
            { v: 'unpublished', label: 'Unpublished', cls: 'btn-red shadow-rose-950/25', Icon: Ban },
            { v: 'draft', label: 'Draft', cls: 'btn-orange shadow-orange-900/20', Icon: PencilLine },
          ].map(({ v, label, cls, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => saveStatus(v)}
              disabled={!selectedIds.length}
              className={`px-6 py-3 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 disabled:cursor-not-allowed ${cls}`}
            >
              <Icon className="w-4 h-4" strokeWidth={2.5} />
              {label}
            </button>
          ))}

          {readyModelsList.length > 0 && visibleModelsCount === readyModelsList.length && (
            <button
              onClick={onNext}
              className="px-7 py-3 rounded-xl font-bold text-xs btn-orange text-white shadow-lg shadow-orange-900/15 transition-all flex items-center space-x-2 cursor-pointer shrink-0"
            >
              <span>Go to Model Testing (View Results)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Post-upload summary popup (our own — not the browser's) */}
      {uploadResult && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUploadResult(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4">
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Check className="w-5 h-5 stroke-3" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Folder uploaded</h3>
                <p className="text-xs text-slate-500 mt-0.5">{uploadResult.sourceTitle}</p>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="ml-auto p-1.5 -mt-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-4 grid grid-cols-2 gap-2">
              <StatTile label="Files parsed" value={uploadResult.ok.length} />
              {uploadResult.gst ? (
                <StatTile
                  label={uploadResult.gst.mode === 'returns' ? 'Businesses scored' : 'GST records'}
                  value={uploadResult.gst.mode === 'returns'
                    ? (uploadResult.gst.businesses ?? uploadResult.gst.records)
                    : uploadResult.gst.records}
                />
              ) : (
                <StatTile label="Transactions" value={uploadResult.totalTx.toLocaleString('en-IN')} />
              )}
            </div>

            {uploadResult.gst && (
              <div className="px-6 pb-3 flex flex-wrap gap-1.5">
                {uploadResult.gst.mode === 'returns' && Object.entries(uploadResult.gst.returnsSeen || {})
                  .filter(([, n]) => n > 0)
                  .map(([t, n]) => (
                    <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                      {t} ×{n}
                    </span>
                  ))}
                {uploadResult.gst.avgUnderwritingScore != null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                    avg score {uploadResult.gst.avgUnderwritingScore}
                  </span>
                )}
                {Object.entries(uploadResult.gst.riskCounts || {}).map(([flag, n]) => (
                  <span key={flag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    flag === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : flag === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>{flag} {n}</span>
                ))}
              </div>
            )}

            {uploadResult.ok.length > 0 && !uploadResult.gst && (
              <div className="px-6 pb-2 max-h-44 overflow-y-auto space-y-1">
                {uploadResult.ok.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px] rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5">
                    <span className="font-semibold text-slate-700 truncate min-w-0" title={m.fileName}>{m.fileName}</span>
                    <span className="text-slate-400 shrink-0">
                      {(m.transactionsParsed ?? m.statementSummary?.transactionCount ?? 0)} txn · {m.cleanlinessPercent ?? '—'}% clean
                    </span>
                  </div>
                ))}
              </div>
            )}

            {uploadResult.skipped.length > 0 && (
              <div className="mx-6 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-bold text-amber-800 mb-0.5">
                  {uploadResult.skipped.length} file{uploadResult.skipped.length === 1 ? '' : 's'} skipped
                </p>
                {uploadResult.skipped.slice(0, 4).map((s, i) => (
                  <p key={i} className="text-[10px] text-amber-700 truncate">{s}</p>
                ))}
              </div>
            )}

            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setUploadResult(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold btn-orange text-white shadow-md shadow-orange-900/15 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
