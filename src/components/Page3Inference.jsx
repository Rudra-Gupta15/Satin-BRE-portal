import React, { useEffect, useMemo, useState } from 'react';
import {
  Upload, ChevronDown, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle,
  FileText, ArrowUpRight, ArrowDownRight, Code, Table as TableIcon, Activity, Table,
  BarChart3, Check, Loader2, Play, UserCheck, Building2, TrendingUp, CheckCircle, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../api/client';

// "stmt_07_ARJUN_PATEL_BHATT.pdf" -> "ARJUN PATEL BHATT"
function cleanStatementLabel(fname) {
  if (!fname) return '';
  const base = fname.replace(/\.[^.]+$/, '');
  let s = base.replace(/[_-]+/g, ' ').trim();
  s = s.replace(/^(bank\s+)?(statement|stmt|acct|account|aa)\s+/i, '');
  s = s.replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim();
  return s || base;
}

const BADGE_STYLE_BY_MODEL = {
  risk_model: 'bg-emerald-700 text-white',
  cashflow_model: 'bg-emerald-800 text-white',
  fraud_model: 'bg-blue-800 text-white',
  money_balance_model: 'bg-[#3b0764] text-white'
};

const GRADE_BADGE_STYLE = {
  LOW: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-900 border-amber-200',
  HIGH: 'bg-rose-100 text-rose-800 border-rose-200'
};

export default function Page3Inference({
  selectedIds = [],
  trainedModels = [],
  selectedVersionMap = {},
  deployedStatusMap = {},
  onNavigateBack,
  onReprocessPipeline
}) {
  const allModels = [
    { id: "risk_model", name: "Risk Model" },
    { id: "cashflow_model", name: "Cashflow Model" },
    { id: "fraud_model", name: "Fraud Model" },
    { id: "money_balance_model", name: "Money Balance Model" }
  ];

  const modelsList = trainedModels && trainedModels.length > 0 ? trainedModels : allModels;
  const deployedModels = modelsList.filter(m => deployedStatusMap[m.id] === "Deployed");

  const [allSources, setAllSources] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(deployedModels[0]?.id || "risk_model");
  const [inputFileName, setInputFileName] = useState("");
  const [selectedInputSourceId, setSelectedInputSourceId] = useState(selectedIds?.[0] || "account_aggregator");

  const [customId, setCustomId] = useState("");
  const [customBankName, setCustomBankName] = useState("");

  const [activeTab, setActiveTab] = useState('analytics');
  const [bundle, setBundle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [recomputing, setRecomputing] = useState(false);
  const [evaluatingCV, setEvaluatingCV] = useState(false);
  const [breRun, setBreRun] = useState(null);
  const [breLoading, setBreLoading] = useState(false);
  const [uploadingInput, setUploadingInput] = useState(false);
  const [inputUploadInfo, setInputUploadInfo] = useState('');

  useEffect(() => {
    api.get('/data-sources').then((data) => setAllSources(data.dataSources));
    // If a statement was already uploaded (this or the Model Hub page), show its name.
    api.get('/pipeline/uploads').then((data) => {
      const up = data?.uploadedFiles?.[selectedInputSourceId];
      if (up?.fileName) setInputFileName(up.fileName);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSources = allSources.filter(s => selectedIds.includes(s.id));

  const activeModelId = deployedModels.some(m => m.id === selectedModelId)
    ? selectedModelId
    : (deployedModels[0]?.id || "risk_model");

  const activeModelObj = modelsList.find(m => m.id === activeModelId) || { name: "Risk Model" };
  const activeVersion = selectedVersionMap[activeModelId] || "v3.4";

  const runInference = async (modelId, id, bank, sourceId) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await api.post('/inference/run', {
        modelId, customId: (id || '').trim() || 'applicant', bankName: bank, sourceId,
      });
      setBundle(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run whenever the active model or input source changes (discrete events, no debounce needed).
  useEffect(() => {
    runInference(activeModelId, customId, customBankName, selectedInputSourceId);
  }, [activeModelId, selectedInputSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce customId/bankName text input so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      runInference(activeModelId, customId, customBankName, selectedInputSourceId);
    }, 600);
    return () => clearTimeout(t);
  }, [customId, customBankName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecomputeRiskScore = () => {
    setRecomputing(true);
    runInference(activeModelId, customId, customBankName, selectedInputSourceId).finally(() => setRecomputing(false));
  };

  const handleRunCrossValidation = async () => {
    setEvaluatingCV(true);
    try {
      const data = await api.post(`/inference/evaluate/${activeModelId}`, { customId });
      setBundle((prev) => (prev ? { ...prev, evaluation: data } : prev));
    } finally {
      setEvaluatingCV(false);
    }
  };

  // Real upload: send the file bytes to the backend parser (same endpoint the
  // Model Hub page uses), then immediately re-run inference on the parsed data.
  const handleInputUpload = async (file) => {
    setUploadingInput(true);
    setInputUploadInfo('');
    setLoadError('');
    try {
      const form = new FormData();
      form.append('sourceId', selectedInputSourceId);
      form.append('file', file);
      const data = await api.postForm('/pipeline/uploads', form);
      setInputFileName(file.name);
      const n = data?.statement?.summary?.transactionCount ?? 0;
      if (n > 0) {
        setInputUploadInfo(`${n} transactions parsed`);
        await runInference(activeModelId, customId, customBankName, selectedInputSourceId);
      } else {
        setInputUploadInfo('No transactions could be read from this file');
      }
    } catch (err) {
      setLoadError(err.message);
      setInputUploadInfo('');
    } finally {
      setUploadingInput(false);
    }
  };

  const handleRunBreRules = async () => {
    setBreLoading(true);
    setBreRun(null);
    try {
      const data = await api.post('/inference/bre-rules', {
        customId, sourceId: selectedInputSourceId,
      });
      setBreRun(data);
    } catch (err) {
      setBreRun({ available: false, message: err.message });
    } finally {
      setBreLoading(false);
    }
  };

  // Clear any previous BRE run when the underlying analysis changes.
  useEffect(() => { setBreRun(null); }, [bundle]);

  const transactionsList = bundle?.transactions || [];
  const anomaliesList = bundle?.anomalies || [];
  const analytics = bundle?.analytics;
  const evalMetrics = bundle?.evaluation?.evalMetrics;
  const cvFolds = bundle?.evaluation?.cvFolds || [];
  const riskScore = bundle?.riskScore;
  const brePayload = bundle?.brePayload;
  const badgeBg = BADGE_STYLE_BY_MODEL[activeModelId] || 'bg-purple-900 text-white';

  const positiveDrivers = useMemo(() => {
    if (!brePayload) return [];
    const fv = brePayload.feature_vector;
    const inflow = fv.avg_monthly_inflow ?? 0;
    const debit = fv.avg_monthly_debit ?? inflow;
    const items = [];
    if (fv.nach_bounce_count_90d === 0) items.push('No cheque / NACH / ECS bounces');
    if (fv.income_stability >= 0.7) items.push(`Regular monthly inflow (${(fv.income_stability * 100).toFixed(0)}% consistent)`);
    if (inflow > 0 && debit < inflow) items.push(`Inflow covers outflow (₹${(inflow - debit).toLocaleString('en-IN')} surplus/mo)`);
    if (fv.dscr_ratio >= 1.3) items.push(`Strong debt-service coverage (DSCR ${fv.dscr_ratio}x)`);
    if ((fv.minimum_balance ?? 0) >= 10000) items.push(`Healthy minimum balance (₹${fv.minimum_balance.toLocaleString('en-IN')})`);
    if ((fv.cash_withdrawal_ratio ?? 0) <= 0.1) items.push('Low cash-withdrawal dependence');
    return items.slice(0, 4);
  }, [brePayload]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Page Header */}
      <div className="border-b border-purple-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#3b0764]">
          Model Testing: Model Selection & Results
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Select a deployed model, upload input data, enter custom ID & bank name, and view customized 1-year graphs, model evaluations, and numerical tables.
        </p>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {loadError}
        </div>
      )}

      {/* 1. TOP CONTROLS: 22% - 39% - 39% RATIO LAYOUT */}
      <div className="flex flex-col md:flex-row gap-3.5 items-stretch">

        {/* Card 1: 22% Width */}
        <div className="w-full md:w-[22%] shrink-0 border border-purple-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-[#3b0764] block mb-1">
              1. Select Model:
            </label>
            <div className="relative">
              {deployedModels.length > 0 ? (
                <select
                  value={activeModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-6 truncate"
                >
                  {deployedModels.map((m) => {
                    const ver = selectedVersionMap[m.id] || "v3.4";
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({ver})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-semibold">
                  No models deployed
                </div>
              )}
              {deployedModels.length > 0 && (
                <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate mt-1">
            <strong className="text-[#3b0764]">{deployedModels.length}</strong> model(s) deployed
          </span>
        </div>

        {/* Card 2: 39% Width */}
        <div className="w-full md:w-[39%] shrink-0 border border-purple-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-[#3b0764] block mb-1">
              2. Upload Input Data:
            </label>
            <div className="flex items-center space-x-1.5">
              <select
                value={selectedInputSourceId}
                onChange={(e) => setSelectedInputSourceId(e.target.value)}
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#3b0764] focus:outline-none focus:border-purple-600 appearance-none cursor-pointer pr-6 truncate"
              >
                {selectedSources.length > 0 ? selectedSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                )) : (
                  <option value="account_aggregator">Account Aggregator (AA) — Bank Statement</option>
                )}
              </select>

              <label
                className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold shrink-0 flex items-center space-x-1 shadow-md shadow-purple-950/20 ${
                  uploadingInput ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#3b0764] hover:bg-purple-900 cursor-pointer'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {uploadingInput
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Upload className="w-3.5 h-3.5" />}
                <span>{uploadingInput ? 'Parsing…' : 'Upload'}</span>
                <input
                  type="file"
                  className="hidden"
                  tabIndex={-1}
                  disabled={uploadingInput}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleInputUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono truncate mt-1">
            {inputFileName
              ? <>File: <strong className="text-[#3b0764]">{inputFileName}</strong></>
              : 'No file uploaded yet'}
            {inputUploadInfo && <span className="text-emerald-700"> · {inputUploadInfo}</span>}
          </span>
        </div>

        {/* Card 3: 39% Width */}
        <div className="w-full md:w-[39%] shrink-0 border border-purple-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-[#3b0764] block mb-1">
              3. Application ID & Bank Name (Optional):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-purple-700" />
                  Application / Ref ID:
                </span>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="e.g. LOAN-2026-0042"
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-700" />
                  Bank Name:
                </span>
                <input
                  type="text"
                  value={customBankName}
                  onChange={(e) => setCustomBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono mt-1">
            {isLoading ? 'Analyzing...' : 'Bank Name is optional'}
          </span>
        </div>

      </div>

      {/* Run Analysis Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => runInference(activeModelId, customId, customBankName, selectedInputSourceId)}
          disabled={isLoading}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
            isLoading
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-[#3b0764] text-white hover:bg-purple-900 shadow-purple-950/20 cursor-pointer'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running Analysis...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{bundle ? 'Re-run Analysis' : 'Run Analysis'}</span>
            </>
          )}
        </button>
      </div>

      {/* Statement Header & Reprocess Button Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <h2 className="text-xl font-extrabold text-[#3b0764]">
            {customId.trim()
              ? `Statement — ${customId.trim()}`
              : cleanStatementLabel(inputFileName)
                ? `Statement — ${cleanStatementLabel(inputFileName)}`
                : bundle?.dataSource === 'UPLOADED_STATEMENT'
                  ? 'Uploaded Statement'
                  : 'Statement Analysis'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-md bg-purple-100 border border-purple-200 text-[10px] font-extrabold font-mono text-purple-900">
            {isLoading ? 'ANALYZING' : 'ANALYZED'}
          </span>
          {bundle && (
            <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold font-mono ${
              bundle.dataSource === 'UPLOADED_STATEMENT'
                ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {bundle.dataSource === 'UPLOADED_STATEMENT' ? 'YOUR UPLOADED DATA' : 'SIMULATED DATA'}
            </span>
          )}
          <span className="text-xs text-slate-500 font-semibold">
            {customBankName ? `${customBankName} - ` : ''}{transactionsList.length} transactions
          </span>
        </div>

        <button
          type="button"
          onClick={onReprocessPipeline}
          className="px-4 py-2 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-[#3b0764] text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          Reprocess process
        </button>
      </div>

      {/* 6 Tabs Navigation Bar */}
      <div className="border-b border-purple-200 flex space-x-5 overflow-x-auto">
        {[
          { id: 'transactions', label: 'Transactions' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'risk_score', label: 'Credit Score' },
          { id: 'anomalies', label: 'Anomalies' },
          { id: 'model_evaluation', label: 'Model Evaluation' },
          { id: 'bre_payload', label: 'BRE payload' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap ${
                isActive ? 'text-[#3b0764]' : 'text-slate-500 hover:text-purple-800'
              }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b0764] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {!bundle && isLoading && (
        <div className="py-16 flex items-center justify-center text-purple-700 text-xs font-bold gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Running inference...</span>
        </div>
      )}

      {bundle && (
      <>
      {/* TAB 1: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <h2 className="text-base font-bold text-[#3b0764]">
              Transactions ({transactionsList.length})
            </h2>
          </div>

          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/70 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Narration</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {transactionsList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/40 text-slate-800 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-semibold">{row.date}</td>
                    <td className="py-3 px-4 font-bold text-[#3b0764]">{row.narration}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                        row.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-purple-100 text-purple-900 border border-purple-200'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS (DYNAMIC GRAPH & TABLE PER SELECTED MODEL) */}
      {activeTab === 'analytics' && analytics && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-600 font-bold block">MODEL OUTPUT RESULT</span>
              <h2 className="text-lg font-bold text-[#3b0764]">
                {activeModelObj.name} Output
              </h2>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono inline-block shadow-sm ${badgeBg}`}>
                {analytics.badge}
              </span>
              <div className="text-xs font-mono font-bold text-purple-900 mt-1">
                {analytics.metric}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-3">
              {analytics.chartTitle}
            </h3>

            <div className="h-64 w-full bg-purple-50/40 border border-purple-100 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                {analytics.chartType === 'area' ? (
                  <AreaChart data={analytics.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                    <XAxis dataKey="month" stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <YAxis
                      domain={analytics.yDomain || [0, 'auto']}
                      stroke="#3b0764"
                      tick={{ fontSize: 10 }}
                      unit={analytics.unit || ''}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d8cefa', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey={analytics.dataKey}
                      stroke={analytics.chartColor}
                      fill={analytics.chartColor}
                      fillOpacity={0.25}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={analytics.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                    <XAxis dataKey="month" stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d8cefa', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar
                      dataKey={analytics.dataKey}
                      fill={analytics.chartColor}
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#3b0764] flex items-center gap-1.5">
                <Table className="w-4 h-4 text-purple-700" />
                {analytics.dataSource === 'UPLOADED_STATEMENT'
                  ? `Month-by-Month ${activeModelObj.name} Numerical Table (from your statement)`
                  : `1-Year (12 Months) Month-by-Month ${activeModelObj.name} Numerical Table`}
              </h3>
              <span className="text-[10px] font-mono text-purple-700 font-bold">
                {analytics.periodLabel || '12 Month Breakdown'}
              </span>
            </div>

            <div className="overflow-x-auto border border-purple-100 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    {analytics.tableColumns.map((col, idx) => (
                      <th key={idx} className="py-2.5 px-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 bg-white">
                  {analytics.tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30 transition-colors text-slate-800">
                      <td className="py-2 px-3 font-bold text-[#3b0764]">{row.col1}</td>
                      <td className="py-2 px-3 font-extrabold text-emerald-700">{row.col2}</td>
                      <td className="py-2 px-3 font-bold text-black">{row.col3}</td>
                      <td className="py-2 px-3">{row.col4}</td>
                      <td className="py-2 px-3 text-slate-600">{row.col5}</td>
                      <td className="py-2 px-3 font-semibold">{row.col6}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-[10px] font-extrabold text-emerald-800">
                          {row.col7}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CREDIT SCORE (CLEAR CIBIL 300-900 UNDERWRITING SCORE) */}
      {activeTab === 'risk_score' && riskScore && brePayload && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleRecomputeRiskScore}
              disabled={recomputing}
              className="px-4 py-2 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-[#3b0764] text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
              <span>Recompute score</span>
            </button>

            <span className="text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-xl border border-purple-200">
              Active Model: {activeModelObj.name} ({activeVersion})
            </span>
          </div>

          {/* 4 Clean Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1">
              <span className="text-3xl font-extrabold text-[#3b0764] font-mono block">{riskScore.score}</span>
              <span className="text-xs font-bold text-slate-700 block">Credit Score</span>
              <span className="text-[10px] text-emerald-800 font-semibold block">Range: 300 - 900 (Higher is Better)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className={`px-3 py-1 rounded-lg border text-xs font-extrabold inline-block ${GRADE_BADGE_STYLE[riskScore.grade]}`}>
                  {riskScore.grade} RISK
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 block">Risk Grade (Underwriting)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono block">{riskScore.pd}%</span>
              <span className="text-xs font-bold text-slate-700 block">Probability of Default (PD)</span>
              <span className="text-[10px] text-emerald-800 font-semibold block">Underwriting Decision: {riskScore.decision}</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1 overflow-hidden">
              <span className="text-sm font-extrabold text-[#3b0764] block truncate">
                {activeModelObj.name}
              </span>
              <span className="text-xs font-bold text-purple-700 block">
                Version: {activeVersion} (Deployed)
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                SFL Training Underwriting Model
              </span>
            </div>
          </div>

          {/* Positive Drivers & Risk Warnings (derived from the live feature vector) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-[#3b0764] flex items-center gap-1.5 border-b border-purple-100 pb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Positive Drivers
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                {positiveDrivers.length > 0 ? positiveDrivers.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{d}</span>
                  </li>
                )) : (
                  <li className="text-slate-400">No strong positive drivers identified.</li>
                )}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-[#3b0764] flex items-center gap-1.5 border-b border-purple-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risk Monitoring Alerts
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                {brePayload.negative_factors.length > 0 ? brePayload.negative_factors.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                )) : (
                  <li className="text-slate-400">No risk alerts flagged.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Feature Vector Table */}
          <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#3b0764] border-b border-purple-100 pb-2">
              Feature Vector Breakdown ({activeModelObj.name})
            </h3>
            {(() => {
              const fv = brePayload.feature_vector;
              const inflow = fv.avg_monthly_inflow ?? 0;
              const debit = fv.avg_monthly_debit ?? inflow;
              const surplus = inflow - debit;
              return (
                <div className="divide-y divide-purple-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Statement Coverage</span>
                    <span className="font-bold text-black font-mono">
                      {fv.statement_months != null ? `${fv.statement_months} months` : '—'}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Avg Monthly Inflow / Outflow</span>
                    <span className="font-bold text-black font-mono">
                      ₹{inflow.toLocaleString('en-IN')} / ₹{debit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Monthly Surplus</span>
                    <span className={`font-bold font-mono ${surplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {surplus >= 0 ? '+' : '−'}₹{Math.abs(surplus).toLocaleString('en-IN')} / month
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Income Stability</span>
                    <span className="font-bold text-black font-mono">{((fv.income_stability ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Minimum Balance</span>
                    <span className={`font-bold font-mono ${(fv.minimum_balance ?? 0) < 0 ? 'text-rose-700' : 'text-black'}`}>
                      ₹{(fv.minimum_balance ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">NACH / Cheque / EMI Bounces (90d)</span>
                    <span className={`font-bold font-mono ${fv.nach_bounce_count_90d === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {fv.nach_bounce_count_90d} Bounces
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Inflow / Outflow Ratio (DSCR)</span>
                    <span className="font-bold text-black font-mono">{fv.dscr_ratio}x</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: ANOMALIES (EXPLICIT % PROBABILITY DISPLAY) */}
      {activeTab === 'anomalies' && (
        <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#3b0764]">
                Anomalies detected ({anomaliesList.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Flags cheque/NACH returns, overdrafts, and one-off transactions far outside this account's normal range. Recurring items (salary, rent, regular payees) are excluded.
              </p>
            </div>
          </div>

          {anomaliesList.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <p className="text-sm font-bold text-[#3b0764]">No anomalies detected</p>
              <p className="text-[11px] text-slate-500 max-w-md">
                No returns/bounces, no negative balance, and every transaction is within this account's normal range.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto border border-purple-100 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-purple-50/70 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Narration</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Anomaly Risk (%)</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Detection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {anomaliesList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/40 text-slate-800 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-semibold">{row.date}</td>
                    <td className="py-3 px-4 font-bold text-[#3b0764]">{row.narration}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{row.amount}</td>
                    <td className="py-3 px-4 font-extrabold text-purple-900">{row.score}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold font-mono ${
                        row.level === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {row.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{row.reasons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* TAB 5: MODEL EVALUATION */}
      {activeTab === 'model_evaluation' && evalMetrics && (
        <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL PERFORMANCE & CROSS VALIDATION</span>
              <h2 className="text-lg font-bold text-[#3b0764] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-700" />
                Model Evaluation metrics for {activeModelObj.name}
              </h2>
            </div>

            <button
              onClick={handleRunCrossValidation}
              disabled={evaluatingCV}
              className="px-4 py-2 rounded-xl bg-[#3b0764] hover:bg-purple-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
            >
              {evaluatingCV ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating 5 Folds...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Re-evaluate Cross Validation</span>
                </>
              )}
            </button>
          </div>

          {/* 6 Key Evaluation Metric Cards — labels adapt to the model's task
              (classifier vs regressor vs anomaly detector) via metricMeta */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { key: 'r2Score',   fallback: ['R² SCORE', 'Coefficient of Determination'], color: 'text-[#3b0764]' },
              { key: 'mse',       fallback: ['MSE', 'Mean Squared Error'],                color: 'text-[#3b0764]' },
              { key: 'precision', fallback: ['PRECISION', 'Positive Predictive Value'],   color: 'text-emerald-700' },
              { key: 'recall',    fallback: ['RECALL', 'Sensitivity / True Positive'],    color: 'text-emerald-700' },
              { key: 'mae',       fallback: ['MAE', 'Mean Absolute Error'],               color: 'text-[#3b0764]' },
              { key: 'f1Score',   fallback: ['F1 SCORE', 'Harmonic Mean'],                color: 'text-purple-900' },
            ].map(({ key, fallback, color }) => {
              const meta = evalMetrics.metricMeta?.[key];
              return (
                <div key={key} className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">{meta?.name || fallback[0]}</span>
                  <span className={`text-xl font-extrabold ${color} font-mono block`}>{evalMetrics[key]}</span>
                  <span className="text-[9px] text-purple-700 font-semibold block">{meta?.sub || fallback[1]}</span>
                </div>
              );
            })}
          </div>

          {evalMetrics.metricMeta && (
            <p className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              Real 5-fold cross-validation on the {activeModelObj.name} trained in Model Hub — estimator refit on each fold.
            </p>
          )}

          {/* Cross Validation */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3b0764] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-700" />
                  {evalMetrics.metricMeta?.cvTitle || 'Cross Validation (5-Fold Stratified K-Fold) — Evaluate Our Model'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Evaluates model stability across independent cross-validation subsets to check for overfitting.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-extrabold font-mono">
                CV Mean {evalMetrics.metricMeta?.r2Score?.name || 'R²'}: {evalMetrics.r2Score}
              </span>
            </div>

            <div className="overflow-x-auto border border-purple-100 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3">CV Fold</th>
                    <th className="py-2.5 px-3">R² Score</th>
                    <th className="py-2.5 px-3">MSE</th>
                    <th className="py-2.5 px-3">Precision</th>
                    <th className="py-2.5 px-3">Recall</th>
                    <th className="py-2.5 px-3">MAE</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 bg-white">
                  {cvFolds.map((foldRow, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30 transition-colors text-slate-800">
                      <td className="py-2.5 px-3 font-bold text-[#3b0764]">{foldRow.fold}</td>
                      <td className="py-2.5 px-3 font-extrabold text-black">{foldRow.r2}</td>
                      <td className="py-2.5 px-3">{foldRow.mse}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{foldRow.precision}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{foldRow.recall}</td>
                      <td className="py-2.5 px-3">{foldRow.mae}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${
                          foldRow.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}>
                          {foldRow.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: BRE PAYLOAD */}
      {activeTab === 'bre_payload' && brePayload && (
        <div className="space-y-4 animate-fadeIn">
          <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h2 className="text-base font-bold text-[#3b0764] flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-700" />
                BRE Output Payload (JSON)
              </h2>
            </div>

            <pre className="bg-purple-50/40 p-5 rounded-xl text-xs font-mono text-[#3b0764] overflow-x-auto border border-purple-200 shadow-xs font-bold leading-relaxed">
              {JSON.stringify(brePayload, null, 2)}
            </pre>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500">
                Runs every rule enabled on the <strong>Settings</strong> page against this applicant's real data.
              </p>
              <button
                type="button"
                onClick={handleRunBreRules}
                disabled={breLoading}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
                  breLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#3b0764] text-white hover:bg-purple-900 shadow-purple-950/20 cursor-pointer'
                }`}
              >
                {breLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Running BRE rules...</span></>
                  : <><Play className="w-3.5 h-3.5 fill-current" /><span>{breRun ? 'Re-run BRE Rules' : 'Run BRE Rules'}</span></>}
              </button>
            </div>
          </div>

          {breRun && breRun.available === false && (
            <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50 text-amber-900 text-xs font-semibold">
              {breRun.message}
            </div>
          )}

          {breRun && breRun.available !== false && (() => {
            const DECISION_STYLE = {
              'APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
              'APPROVED WITH NOTES': 'bg-emerald-50 text-emerald-800 border-emerald-200',
              'CONDITIONAL APPROVAL': 'bg-amber-100 text-amber-900 border-amber-200',
              'REJECTED': 'bg-rose-100 text-rose-800 border-rose-200',
            };
            const cats = [...new Set(breRun.results.map((r) => r.category))];
            const pill = (s) => s === 'PASS'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : s === 'FAIL' ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-slate-100 text-slate-500 border-slate-200';
            return (
              <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">BRE Rule Evaluation</span>
                    <h2 className="text-lg font-bold text-[#3b0764]">Underwriting Decision</h2>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Applicant profile: {breRun.applicantProfile} · Credit score {breRun.creditScore} · Gate &gt; {breRun.gateThreshold}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl border text-sm font-extrabold ${DECISION_STYLE[breRun.decision] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {breRun.decision}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['PASSED', breRun.passed, 'text-emerald-700'],
                    ['FAILED', breRun.failed, 'text-rose-700'],
                    ['NOT EVALUATED', breRun.skipped, 'text-slate-400'],
                    ['RULES ENABLED', breRun.enabledCount, 'text-[#3b0764]'],
                  ].map(([label, val, color]) => (
                    <div key={label} className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                      <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">{label}</div>
                      <div className={`text-xl font-extrabold font-mono ${color}`}>{val}</div>
                    </div>
                  ))}
                </div>

                {breRun.seriousFlags?.length > 0 && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5">
                    <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Serious flags driving the decision
                    </div>
                    <div className="text-xs text-rose-800 font-medium">{breRun.seriousFlags.join(' · ')}</div>
                  </div>
                )}

                {cats.map((cat) => (
                  <div key={cat} className="space-y-1.5">
                    <h3 className="text-[11px] font-mono font-bold text-purple-700 uppercase">{cat}</h3>
                    <div className="border border-purple-100 rounded-xl divide-y divide-purple-100 overflow-hidden">
                      {breRun.results.filter((r) => r.category === cat).map((r) => (
                        <div key={r.id} className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-purple-50/30">
                          <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md border text-[9px] font-extrabold font-mono ${pill(r.status)}`}>
                            {r.status === 'SKIP' ? 'N/A' : r.status}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#3b0764]">{r.name}</div>
                            <div className="text-[11px] text-slate-600">{r.detail}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.condition}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
      </>
      )}

    </div>
  );
}
