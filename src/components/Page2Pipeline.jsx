import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Play, Loader2, ChevronDown, ChevronLeft, ChevronRight, BarChart3, RefreshCw, FolderUp, UploadCloud, X, Ban, PencilLine, BadgeCheck, ScanSearch } from 'lucide-react';
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

/* Small inline mode-switcher for the upload card (Folder / File / DB Folder /
   DB File). Deliberately its own tiny component rather than the general
   <Select> — that one's styled for prominent, standalone pickers (a big
   highlighted pill for the active row) which looks oversized and mismatched
   next to a compact action button for a 4-word utility choice like this. */
function SourceModeMenu({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-28 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-700 cursor-pointer transition-colors ${
          open ? 'border-[#ea580c]' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 py-1 overflow-hidden"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-left cursor-pointer ${
                    isSel ? 'bg-orange-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <Check className="w-3 h-3 text-[#ea580c] shrink-0 stroke-3" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* "Database Folder" / "Database File" upload mode: connect to the bank's or
   company's own database, then pick a schema (folder) or a table (file) from
   it. Real connection test — no sample DB exists yet, so it'll show
   "not connected" until one is actually wired up. */
function DbBrowseModal({ mode, onCancel, onPick }) {
  const isFolder = mode === 'db-folder';
  const [connStr, setConnStr] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState(null); // { connected, detail, schemas }
  const [openSchema, setOpenSchema] = useState(null);

  const connect = async () => {
    if (!connStr.trim()) return;
    setConnecting(true);
    setResult(null);
    try {
      const data = await api.post('/external-db/connect', { connectionString: connStr.trim() });
      setResult(data);
    } catch (err) {
      setResult({ connected: false, detail: err.message });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fadeIn max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-bold text-slate-900">
            {isFolder ? 'Select Folder from Database' : 'Select File from Database'}
          </h3>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Connect to your bank's or company's database{isFolder ? ' and pick a schema to use as the source folder.' : ' and pick a table to use as the source file.'}
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={connStr}
            onChange={(e) => setConnStr(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') connect(); }}
            placeholder="postgresql://user:pass@host:5432/dbname"
            className="flex-1 bg-slate-50/40 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#ea580c]"
          />
          <button
            type="button"
            disabled={connecting || !connStr.trim()}
            onClick={connect}
            className="px-4 py-2 rounded-xl btn-orange text-white text-xs font-bold shadow-md shadow-orange-900/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
          </button>
        </div>

        {result && (
          <div className={`mt-3 text-[11px] font-mono px-3 py-2 rounded-lg border ${
            result.connected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {result.connected ? `Connected — ${result.detail}` : `Not connected — ${result.detail}`}
          </div>
        )}

        {result?.connected && (
          <div className="mt-3 flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {(result.schemas || []).length === 0 && (
              <p className="text-[11px] text-slate-400 p-3">No tables found in this database.</p>
            )}
            {(result.schemas || []).map((s) => (
              <div key={s.schema ?? '(default)'}>
                {isFolder ? (
                  <button
                    type="button"
                    onClick={() => onPick(s.schema, undefined)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-800">{s.schema ?? '(default schema)'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{s.tables.length} table{s.tables.length === 1 ? '' : 's'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenSchema(openSchema === s.schema ? null : s.schema)}
                      className="w-full text-left px-3 py-2 bg-slate-50/60 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-slate-600">{s.schema ?? '(default schema)'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openSchema === s.schema ? 'rotate-180' : ''}`} />
                    </button>
                    {openSchema === s.schema && s.tables.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onPick(s.schema, t)}
                        className="w-full text-left pl-6 pr-3 py-2 hover:bg-orange-50 text-xs font-mono text-slate-700 cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  const fileInputRef = useRef({}); // { [sourceId]: <input> (single file) } — fallback picker

  // Upload source: local file, local folder, or a table/schema in an external
  // (bank / company) database once one is connected.
  const [sourceMode, setSourceMode] = useState({}); // { [sourceId]: 'folder'|'file'|'db-folder'|'db-file' }
  const [dbModalFor, setDbModalFor] = useState(null); // sourceId whose DB-browse modal is open, or null
  const [dbLinked, setDbLinked] = useState({}); // { [sourceId]: { mode, schema, table? } }

  // Footer: stamp every selected data source with a publish status.
  const saveStatus = async (status) => {
    if (!selectedIds.length) return;
    const statuses = Object.fromEntries(selectedIds.map((id) => [id, status]));
    try { await api.put('/data-sources/status', { statuses }); } catch { /* ignore */ }
    setStatusSaved(status);
    setTimeout(() => setStatusSaved(null), 2500);
  };

  // Raw Data Noise — per source, never blended into one average (a clean
  // source would otherwise hide a dirty one). { [sourceId]: { label,
  // cleanlinessPercent, noisePercent, llmActive, fileCount } }
  const [noiseBySource, setNoiseBySource] = useState({});
  // What the AI recovery pass actually did for a high-noise source — real
  // recovered-row count + a specific reason for every row it still couldn't
  // save. { [sourceId]: { mode, totalRows, droppedRows, recoveredRows,
  // droppedDetail: [{date,narration,reason}], droppedDetailTruncated } }
  const [cleaningBySource, setCleaningBySource] = useState({});
  const [expandedCleaning, setExpandedCleaning] = useState({}); // { [sourceId]: true }

  // Pipeline state (Steps 1..5: Data Gathering, Preprocess, Normalize, Feature Eng, Data Selection)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 = idle, 1..5 = steps, 6 = done
  const [showProcessedTable, setShowProcessedTable] = useState(false);
  const [processedTableRows, setProcessedTableRows] = useState([]);
  const [storedFile, setStoredFile] = useState('processed_features_vector.csv');
  const [stageLog, setStageLog] = useState([]); // [{ id, name, durationMs, detail }] — real per-stage results from the backend
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [featuresAsJson, setFeaturesAsJson] = useState(true);   // Stage 5 selected-features view
  const [featuresExpanded, setFeaturesExpanded] = useState(false); // collapse the long list by default
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

  // Each domain owns its own evaluation-summary endpoint — no shared backend
  // dispatcher. Fetch all four and merge client-side into the one shape the
  // rest of this component already reads (evalSummary.sessionModels /
  // .gstModels / .bbpsModels / .upiModels, etc.).
  const loadEvalSummary = () => {
    Promise.all([
      api.get('/models/evaluation/summary').catch(() => null),
      api.get('/gst/evaluation/summary').catch(() => null),
      api.get('/bbps/evaluation/summary').catch(() => null),
      api.get('/upi/evaluation/summary').catch(() => null),
    ]).then(([aa, gst, bbps, upi]) => {
      setEvalSummary({
        sessionModels: aa?.sessionModels || [],
        sessionAlgorithm: aa?.sessionAlgorithm,
        sessionTrainedAt: aa?.sessionTrainedAt,
        sessionTxCount: aa?.sessionTxCount,
        datasetModel: aa?.datasetModel || null,
        gstModels: gst?.models || [],
        gstAlgorithm: gst?.algorithm,
        gstTrainedAt: gst?.trainedAt,
        bbpsModels: bbps?.models || [],
        bbpsAlgorithm: bbps?.algorithm,
        bbpsTrainedAt: bbps?.trainedAt,
        upiModels: upi?.models || [],
        upiAlgorithm: upi?.algorithm,
        upiTrainedAt: upi?.trainedAt,
      });
    });
  };

  // Anomaly & fraud patterns found in the training data, computed after training.
  const [patterns, setPatterns] = useState(null);
  const loadPatterns = () => {
    const list = readyModelsList.length ? readyModelsList : trainedModels;
    const gst = list.some((m) => m.kind === 'gst');
    const bbps = list.some((m) => m.kind === 'bbps');
    const upi = list.some((m) => m.kind === 'upi');
    api.get(gst ? '/gst/patterns' : bbps ? '/bbps/patterns' : upi ? '/upi/patterns' : '/models/patterns')
      .then((d) => setPatterns(d?.available ? d : null))
      .catch(() => setPatterns(null));
  };
  const loadEvaluation = (mid) => {
    const path = isGstRun ? '/gst/evaluation' : isBbpsRun ? '/bbps/evaluation' : isUpiRun ? '/upi/evaluation' : '/models/evaluation';
    api.get(path, { model_id: mid }).then((d) => setModelEval(d.evaluation || null)).catch(() => {});
    loadEvalSummary();
  };
  useEffect(() => { loadEvaluation(evalModelId); }, [evalModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // This session trained the GST (or BBPS, or UPI) model, not the bank
  // models — the eval panel (and everything else) should then show ONLY
  // that family's heads.
  const isGstRun = (readyModelsList.length ? readyModelsList : trainedModels).some((m) => m?.kind === 'gst');
  const isBbpsRun = (readyModelsList.length ? readyModelsList : trainedModels).some((m) => m?.kind === 'bbps');
  const isUpiRun = (readyModelsList.length ? readyModelsList : trainedModels).some((m) => m?.kind === 'upi');
  const evalModelsForRun = isGstRun
    ? (evalSummary?.gstModels || [])
    : isBbpsRun
    ? (evalSummary?.bbpsModels || [])
    : isUpiRun
    ? (evalSummary?.upiModels || [])
    : (evalSummary?.sessionModels || []);

  // Focus the first model of whichever family this session trained.
  useEffect(() => {
    if (!evalSummary) return;
    const ids = evalModelsForRun.map((m) => m.modelId);
    if (ids.length && !ids.includes(evalModelId)) setEvalModelId(ids[0]);
  }, [evalSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  const reEvaluate = async () => {
    setReEvaluating(true);
    try {
      const base = isGstRun ? '/gst/evaluation' : isBbpsRun ? '/bbps/evaluation' : isUpiRun ? '/upi/evaluation' : '/models/evaluation';
      const d = await api.post(`${base}/${evalModelId}/re-run`);
      setModelEval(d.evaluation || null);
      loadEvalSummary();
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
        setNoiseBySource(data.pipeline.noiseBySource || {});
        setCleaningBySource(data.pipeline.cleaningBySource || {});
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
      loadPatterns();
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
    setDbLinked(prev => { const n = { ...prev }; delete n[id]; return n; }); // switching to a local folder un-links any DB source
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

  // Single-file counterpart of pickFolder — same File System Access API,
  // same fallback, just one file instead of a whole directory tree.
  const pickSingleFile = async (id) => {
    setDbLinked(prev => { const n = { ...prev }; delete n[id]; return n; }); // switching to a local file un-links any DB source
    if (typeof window.showOpenFilePicker !== 'function') {
      fileInputRef.current?.[id]?.click();
      return;
    }
    let handles;
    try {
      handles = await window.showOpenFilePicker({
        id: 'bre-statement-file',
        multiple: false,
        types: [{ description: 'Statement files', accept: {
          'application/octet-stream': ACCEPTED_EXT,
        } }],
      });
    } catch {
      return; // user cancelled
    }
    const file = await handles[0].getFile();
    if (!isAccepted(file.name)) {
      alert('That file type is not supported — pick a PDF, CSV, TSV, TXT, JSON, MD or XLSX file.');
      return;
    }
    handleFolderUpload(id, [file]);
  };

  // Dispatches the upload-card button to the right picker for the source's
  // currently-selected mode.
  const handleUploadClick = (id) => {
    const mode = sourceMode[id] || 'folder';
    if (mode === 'folder') pickFolder(id);
    else if (mode === 'file') pickSingleFile(id);
    else setDbModalFor(id); // 'db-folder' / 'db-file'
  };

  // Called by the DB-browse modal once the user picks a schema (folder mode)
  // or a table (file mode). Nothing is ingested yet — no sample bank/company
  // DB exists to pull real rows from — this just records what was picked so
  // the pipeline has something to point at once that ingestion path exists.
  const linkDbSelection = (id, mode, schema, table) => {
    setDbLinked(prev => ({ ...prev, [id]: { mode, schema, table } }));
    setUploadedFiles(prev => { const n = { ...prev }; delete n[id]; return n; }); // clear any local upload
    setParsedStatements(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDbModalFor(null);
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
    setNoiseBySource(result.pipeline.noiseBySource || {});
    setCleaningBySource(result.pipeline.cleaningBySource || {});
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

    // Each data source trains on its OWN endpoint — GST -> /gst/train, BBPS
    // -> /bbps/train, UPI -> /upi/train, everything else -> /models/train
    // (AA bank models). No shared dispatcher: the source decides where this
    // goes, not the backend.
    const srcId = activeUpload ? activeUpload.id : null;
    let data;
    try {
      if (srcId === 'gst_data') {
        const form = new FormData();
        form.append('algorithm', selectedMLAlgorithm);
        data = await api.postForm('/gst/train', form);
      } else if (srcId === 'bbps_utility') {
        data = await api.post('/bbps/train', { algorithm: selectedMLAlgorithm });
      } else if (srcId === 'upi_enrichment') {
        data = await api.post('/upi/train', { algorithm: selectedMLAlgorithm });
      } else {
        data = await api.post('/models/train', {
          algorithm: selectedMLAlgorithm,
          datasetFile: selectedDatasetFile,
        });
      }
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
        loadPatterns();
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

            const mode = sourceMode[source.id] || 'folder';
            const linked = dbLinked[source.id];
            const BTN_LABEL = {
              folder: hasFiles ? 'Change Folder' : 'Upload Folder',
              file: hasFiles ? 'Change File' : 'Upload File',
              'db-folder': 'Select Folder',
              'db-file': 'Select File',
            };

            return (
              <div key={source.id} className="rounded-xl border border-slate-200 bg-white">
                {/* Card head: source + folder summary + action.
                    flex-wrap (not a sm: breakpoint) because the sidebar eats a
                    fixed 256px regardless of viewport width, so this row can
                    run out of room well before any Tailwind breakpoint fires.
                    No overflow-hidden on the card itself (rounded-t-xl here
                    does the corner-clipping instead) — the source-mode dropdown
                    is an absolutely-positioned popover that must be able to
                    extend past the card's own box without getting cut off. */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100 rounded-t-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 shrink-0">
                      <FolderUp className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{source.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {linked
                          ? `Linked to DB ${linked.table ? `table ${linked.schema ? `${linked.schema}.` : ''}${linked.table}` : `schema ${linked.schema ?? '(default)'}`}`
                          : !hasFiles
                          ? 'No folder uploaded'
                          : gstReturns
                          ? `${files.length} file${files.length === 1 ? '' : 's'} · ${totalGstBiz} business${totalGstBiz === 1 ? '' : 'es'}`
                          : isGst
                          ? `${files.length} file${files.length === 1 ? '' : 's'} · ${totalGstRecords} GST record${totalGstRecords === 1 ? '' : 's'}`
                          : `${files.length} file${files.length === 1 ? '' : 's'} · ${totalTx} txn${totalTx === 1 ? '' : 's'}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <SourceModeMenu
                      value={mode}
                      onChange={(v) => setSourceMode(prev => ({ ...prev, [source.id]: v }))}
                      options={[
                        { value: 'folder', label: 'Folder' },
                        { value: 'file', label: 'File' },
                        { value: 'db-folder', label: 'DB Folder' },
                        { value: 'db-file', label: 'DB File' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleUploadClick(source.id); }}
                      className="px-3 py-1.5 rounded-lg btn-orange text-white text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1 shadow-sm whitespace-nowrap"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{BTN_LABEL[mode]}</span>
                    </button>
                  </div>
                  {/* Fallback pickers for browsers without the File System Access API */}
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
                  <input
                    ref={(el) => { fileInputRef.current[source.id] = el; }}
                    type="file"
                    className="hidden"
                    tabIndex={-1}
                    accept={ACCEPTED_EXT.join(',')}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleFolderUpload(source.id, [e.target.files[0]]);
                      }
                      e.target.value = '';
                    }}
                  />
                </div>

                {dbModalFor === source.id && (
                  <DbBrowseModal
                    mode={mode}
                    onCancel={() => setDbModalFor(null)}
                    onPick={(schema, table) => linkDbSelection(source.id, mode, schema, table)}
                  />
                )}

                <div className="p-4 space-y-2.5">
                  {!isScanning && linked && (
                    <p className="text-[11px] text-slate-400">
                      Selection recorded — pulling real rows from a connected database isn't wired into the
                      pipeline yet. Once a bank/company DB is connected for real, this is what it'll ingest.
                    </p>
                  )}

                  {!isScanning && !hasFiles && !linked && (mode === 'db-folder' || mode === 'db-file') && (
                    <p className="text-[11px] text-slate-400">
                      {mode === 'db-folder'
                        ? 'Connect to your bank/company database and pick a schema to use as the source folder.'
                        : 'Connect to your bank/company database and pick a table to use as the source file.'}
                    </p>
                  )}

                  {!isScanning && !hasFiles && !linked && mode === 'folder' && (
                    <p className="text-[11px] text-slate-400">
                      Select a folder of statements — any mix of PDF, CSV, TSV, TXT, JSON, MD or XLSX.
                      Other file types in the folder are skipped.
                    </p>
                  )}

                  {!isScanning && !hasFiles && !linked && mode === 'file' && (
                    <p className="text-[11px] text-slate-400">
                      Select a single statement file — PDF, CSV, TSV, TXT, JSON, MD or XLSX.
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

                        {f.bbps && (
                          f.bbps.available ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <StatTile label="Utility Accounts" value={f.bbps.utilityAccounts} />
                              <StatTile label="Payments Found" value={f.bbps.paymentsLast12m} />
                              <StatTile
                                label="Punctuality Index"
                                tone="text-purple-700"
                                value={f.bbps.utilityBillPunctualityIndex}
                              />
                              <StatTile
                                label="Missed Payments"
                                tone={f.bbps.missedPaymentCount > 0 ? 'text-rose-600' : 'text-emerald-600'}
                                value={f.bbps.missedPaymentCount}
                              />
                              <div className="col-span-2 flex flex-wrap gap-1">
                                {f.bbps.byType.map((t) => (
                                  <span key={t.utilityType} className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                                    {t.utilityType} · ₹{t.averageBillAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} avg
                                  </span>
                                ))}
                              </div>

                              {f.bbps.model?.available && (
                                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 flex items-center justify-between">
                                  <div>
                                    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">BBPS Model · Stability Score</div>
                                    <div className="text-sm font-extrabold text-purple-700">{f.bbps.model.stabilityScore}</div>
                                  </div>
                                  <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md border ${
                                    f.bbps.model.riskFlag === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : f.bbps.model.riskFlag === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>{f.bbps.model.riskFlag} RISK</span>
                                </div>
                              )}

                              {f.bbps.rules && (
                                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                                  <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">BBPS Rules · {f.bbps.rules.decision}</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">{f.bbps.rules.passed} passed</span>
                                    {f.bbps.rules.failed > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">{f.bbps.rules.failed} failed</span>
                                    )}
                                    {f.bbps.rules.skipped > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">{f.bbps.rules.skipped} skipped</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              {f.bbps.message}
                            </p>
                          )
                        )}

                        {f.upi && (
                          f.upi.available ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <StatTile label="Transactions" value={f.upi.totalTransactions} />
                              <StatTile
                                label="Success Rate"
                                tone="text-purple-700"
                                value={`${((f.upi.successRatio || 0) * 100).toFixed(0)}%`}
                              />
                              <StatTile label="Unique Payees" value={f.upi.uniquePayees} />
                              <StatTile label="Unique Payers" value={f.upi.uniquePayers} />
                              <div className="col-span-2 flex flex-wrap gap-1">
                                {(f.upi.byMcc || []).slice(0, 5).map((t) => (
                                  <span key={t.mcc} className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                                    {t.label} · ₹{t.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </span>
                                ))}
                              </div>

                              {f.upi.model?.available && (
                                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 flex items-center justify-between">
                                  <div>
                                    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">UPI Model · Stability Score</div>
                                    <div className="text-sm font-extrabold text-purple-700">{f.upi.model.stabilityScore}</div>
                                  </div>
                                  <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md border ${
                                    f.upi.model.riskFlag === 'LOW' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : f.upi.model.riskFlag === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>{f.upi.model.riskFlag} RISK</span>
                                </div>
                              )}

                              {f.upi.rules && (
                                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                                  <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">UPI Rules · {f.upi.rules.decision}</div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">{f.upi.rules.passed} passed</span>
                                    {f.upi.rules.failed > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">{f.upi.rules.failed} failed</span>
                                    )}
                                    {f.upi.rules.skipped > 0 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">{f.upi.rules.skipped} skipped</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              {f.upi.message}
                            </p>
                          )
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
                  {selectedFeatures.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setFeaturesExpanded((v) => !v)}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600 hover:border-slate-300 cursor-pointer"
                    >
                      {featuresExpanded ? 'collapse' : 'expand'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  {featuresAsJson ? (
                    <pre className={`text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 overflow-auto leading-relaxed ${featuresExpanded ? 'max-h-none' : 'max-h-40'}`}>
{JSON.stringify(selectedFeatures, null, 2)}
                    </pre>
                  ) : (
                    <div className={`flex items-center flex-wrap gap-1.5 overflow-y-auto ${featuresExpanded ? 'max-h-none' : 'max-h-40'}`}>
                      {selectedFeatures.map((f) => (
                        <span key={f} className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {!featuresExpanded && selectedFeatures.length > 12 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-white to-transparent rounded-b-lg" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* 3. AI Noise Inspection & Activation Box — one check per data source,
          never blended into a single average (that would let a clean source
          hide a dirty one). Each source's own worst-file noise% decides its
          own threshold independently. */}
      <SectionCard
        title="AI Noise Inspection & Activation"
        sub="Per data source — each checked against the 40% threshold on its own, not averaged together."
      >
        <div className="space-y-2">
          {Object.entries(noiseBySource).length === 0 && (
            <p className="text-[11px] text-slate-400">Run the pipeline to see each source's noise check.</p>
          )}
          {Object.entries(noiseBySource).map(([sid, n]) => {
            const clean = cleaningBySource[sid];
            const hasDetail = n.llmActive && clean;
            const open = !!expandedCleaning[sid];
            return (
            <div key={sid} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {n.label}
                    {n.fileCount > 1 && (
                      <span className="text-slate-400 font-semibold">
                        {' · '}
                        {n.worstFileName ? <span className="text-rose-600">{n.worstFileName}</span> : 'one file'}
                        {' is the worst of '}{n.fileCount}{' files'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Raw Data Noise: <strong className="text-slate-700">{n.noisePercent}%</strong>{' '}
                    {n.llmActive ? '(Exceeds 40% Noise Threshold Limit)' : '(Within Acceptable Threshold)'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasDetail && (
                    <button
                      type="button"
                      onClick={() => setExpandedCleaning(prev => ({ ...prev, [sid]: !prev[sid] }))}
                      className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                    >
                      <span>{clean.recoveredRows} recovered, {clean.droppedRows} dropped</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  {n.llmActive && hasDetail ? (
                    // The recovery pass already ran (this is a completed pipeline
                    // response, not a live in-progress state) — say so plainly
                    // instead of leaving "AI Activated" up forever as if it's
                    // still running.
                    <div className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 bg-emerald-50 border-emerald-200 text-emerald-800">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>Clean Done</span>
                    </div>
                  ) : (
                    <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                      n.llmActive
                        ? 'bg-slate-100 border-slate-200 text-slate-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${n.llmActive ? 'bg-purple-600' : 'bg-emerald-600'}`}></span>
                      <span>{n.llmActive ? 'AI Activated' : 'Direct Ingestion (Clean)'}</span>
                    </div>
                  )}
                </div>
              </div>

              {hasDetail && open && (
                <div className="px-3.5 pb-3 pt-1 border-t border-slate-200 bg-white">
                  <p className="text-[11px] text-slate-600 mt-2">
                    AI recovery pass: {clean.totalRows} row(s) checked — {clean.recoveredRows} recovered
                    (amount reconstructed from the running balance or the narration text), {clean.droppedRows} left
                    out because nothing could reconstruct a usable amount.
                  </p>
                  {clean.droppedDetail.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {clean.droppedDetail.map((d, i) => (
                        <div key={i} className="text-[11px] rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
                          <span className="font-bold text-rose-800">{d.date}</span>
                          <span className="text-slate-600"> — {d.narration}</span>
                          <div className="text-rose-700 mt-0.5">Left out: {d.reason}.</div>
                        </div>
                      ))}
                      {clean.droppedDetailTruncated > 0 && (
                        <p className="text-[10px] text-slate-400">
                          + {clean.droppedDetailTruncated} more, same reasoning.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          When a source's raw noise exceeds the 40% threshold, the AI cleaning pass is activated automatically
          before ingestion for that source; otherwise its vector is ingested directly.
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
      {trainingDone && evalModelsForRun.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-700" /> Model Evaluation
              <span className="text-[9px] font-mono text-slate-400 font-normal">
                {isGstRun ? 'GST · real 3-fold CV' : isBbpsRun ? 'BBPS · real 3-fold CV' : isUpiRun ? 'UPI · real 3-fold CV' : 'real 5-fold cross-validation'}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {(isGstRun ? evalSummary.gstTrainedAt : isBbpsRun ? evalSummary.bbpsTrainedAt : isUpiRun ? evalSummary.upiTrainedAt : evalSummary.sessionTrainedAt) && (
                <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                  {isGstRun ? evalSummary.gstAlgorithm : isBbpsRun ? evalSummary.bbpsAlgorithm : isUpiRun ? evalSummary.upiAlgorithm : evalSummary.sessionAlgorithm}
                  {' · '}
                  {new Date(isGstRun ? evalSummary.gstTrainedAt : isBbpsRun ? evalSummary.bbpsTrainedAt : isUpiRun ? evalSummary.upiTrainedAt : evalSummary.sessionTrainedAt).toLocaleString()}
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
                {!isGstRun && !isBbpsRun && !isUpiRun && evalSummary.sessionModels?.filter((m) => m.kind !== 'pattern').map((m) => {
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
                {!isGstRun && !isBbpsRun && !isUpiRun && evalSummary.datasetModel && (
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
                {isGstRun && evalSummary.gstModels?.filter((m) => m.kind !== 'pattern').map((m) => {
                  const sel = m.modelId === evalModelId;
                  return (
                    <tr key={m.modelId}
                      onClick={() => setEvalModelId(m.modelId)}
                      className={`cursor-pointer ${sel ? 'bg-slate-50/70' : 'hover:bg-purple-50/20'}`}>
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        {sel && <span className="text-purple-500">▸ </span>}{m.name}
                        <span className="ml-1.5 text-[8px] font-black text-purple-700 bg-purple-100 border border-purple-200 rounded px-1">GST</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(m.metricValue)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.precision)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.recall)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.f1)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-400 text-[9px]">{sel ? 'shown below' : 'view'}</td>
                    </tr>
                  );
                })}
                {isBbpsRun && evalSummary.bbpsModels?.filter((m) => m.kind !== 'pattern').map((m) => {
                  const sel = m.modelId === evalModelId;
                  return (
                    <tr key={m.modelId}
                      onClick={() => setEvalModelId(m.modelId)}
                      className={`cursor-pointer ${sel ? 'bg-slate-50/70' : 'hover:bg-purple-50/20'}`}>
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        {sel && <span className="text-purple-500">▸ </span>}{m.name}
                        <span className="ml-1.5 text-[8px] font-black text-purple-700 bg-purple-100 border border-purple-200 rounded px-1">BBPS</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(m.metricValue)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.precision)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.recall)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.f1)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-400 text-[9px]">{sel ? 'shown below' : 'view'}</td>
                    </tr>
                  );
                })}
                {isUpiRun && evalSummary.upiModels?.filter((m) => m.kind !== 'pattern').map((m) => {
                  const sel = m.modelId === evalModelId;
                  return (
                    <tr key={m.modelId}
                      onClick={() => setEvalModelId(m.modelId)}
                      className={`cursor-pointer ${sel ? 'bg-slate-50/70' : 'hover:bg-purple-50/20'}`}>
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        {sel && <span className="text-purple-500">▸ </span>}{m.name}
                        <span className="ml-1.5 text-[8px] font-black text-purple-700 bg-purple-100 border border-purple-200 rounded px-1">UPI</span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(m.metricValue)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.precision)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.recall)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.f1)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-400 text-[9px]">{sel ? 'shown below' : 'view'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Per-model detail — for the selected session model */}
          {modelEval?.evalMetrics && (
          <div className="space-y-2 border border-slate-200 rounded-lg bg-slate-50/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-purple-600 uppercase">
                {[...(evalSummary.sessionModels || []), ...(evalSummary.gstModels || []), ...(evalSummary.bbpsModels || []), ...(evalSummary.upiModels || [])]
                  .find((x) => x.modelId === evalModelId)?.name} — detail
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
            {isGstRun
              ? 'GST heads: real 3-fold CV on the GST underwriting corpus. '
              : isBbpsRun
              ? 'BBPS heads: real 3-fold CV on the BBPS utility-payment corpus. '
              : isUpiRun
              ? 'UPI heads: real 3-fold CV on the UPI transaction corpus. '
              : 'Session models: real 5-fold CV, ~600 profiles anchored to the uploaded statement. Population model: dataset-trained (AI Intelligence). '}
            Click a model row to see its per-fold detail below.
          </p>
        </div>
      )}

      {/* 9c. Fraud & Anomaly Pattern models — cross-validated accuracy. */}
      {trainingDone && (() => {
        const models = evalModelsForRun.filter((m) => m.kind === 'pattern');
        const fr = patterns?.fraud || { files: 0, typologies: [] };
        if (models.length === 0 && !(fr.typologies?.length)) return null;
        const N = fr.files || 0;
        const unit = isGstRun ? 'businesses' : 'statements';
        return (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-sm animate-fadeIn">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ScanSearch className="w-4 h-4 text-purple-700" /> Fraud &amp; Anomaly Detection
              {models.length > 0 && (
                <span className="text-[9px] font-mono text-slate-400 font-normal">real 5-fold cross-validation</span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {models.length > 0
                ? `Two classifiers trained ${N ? `on your ${N.toLocaleString()} ${unit}` : ''} to flag suspicious patterns. Model Testing scores each applicant against them.`
                : `Known fraud signatures scanned ${N ? `across your ${N.toLocaleString()} ${unit}` : 'across the training data'}. Model Testing checks each applicant against them.`}
            </p>
          </div>

          {models.length > 0 && (
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
                {models.map((m) => {
                  const sel = m.modelId === evalModelId;
                  return (
                    <tr key={m.modelId} onClick={() => setEvalModelId(m.modelId)}
                      className={`cursor-pointer ${sel ? 'bg-slate-50/70' : 'hover:bg-slate-50/30'}`}>
                      <td className="py-1.5 px-3 font-bold text-slate-800">
                        {sel && <span className="text-purple-500">▸ </span>}{m.name}
                      </td>
                      <td className="py-1.5 px-3 text-right font-extrabold text-emerald-700">{asPct(m.metricValue)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.precision)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.recall)}</td>
                      <td className="py-1.5 px-3 text-right">{asPct(m.f1)}</td>
                      <td className="py-1.5 px-3 text-right text-purple-400 text-[9px]">{sel ? 'detail above' : 'view'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {fr.typologies?.length > 0 && (
            <details className="text-[11px]" open={models.length === 0}>
              <summary className="cursor-pointer text-slate-500 font-semibold hover:text-purple-800 select-none">
                {models.length > 0
                  ? `Fraud signatures these models learn (${fr.typologies.length}) · found in training`
                  : `Fraud signatures scanned (${fr.typologies.length}) · found in training`}
              </summary>
              <div className="space-y-1 mt-2">
                {fr.typologies.map((t) => {
                  const hit = t.matched + t.elevated;
                  return (
                    <div key={t.name} className="flex items-baseline justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                      <span><span className="font-bold text-slate-700">{t.name}</span> <span className="text-slate-400">— {t.desc}</span></span>
                      <span className={`shrink-0 font-bold ${hit > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {hit === 0 ? `clear / ${N}` : `${hit} / ${N}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
        );
      })()}

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
            { v: 'published', label: 'Published', cls: 'btn-purple shadow-purple-950/25', Icon: BadgeCheck },
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
