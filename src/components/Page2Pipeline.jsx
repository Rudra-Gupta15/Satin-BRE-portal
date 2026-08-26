import React, { useState } from 'react';
import { Check, ArrowRight, Play, RefreshCw, Loader2, ChevronDown, Table, FileText, Cpu, Download, Database, Rocket, Sparkles } from 'lucide-react';
import { DATA_SOURCES } from '../data/dataSources';

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
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [fileTypes, setFileTypes] = useState({});

  // Raw Data Noise Level State (Default: 60% noise -> > 40% noise triggers LLM activation)
  const [rawNoisePercent, setRawNoisePercent] = useState(60);
  const isLLMActiveForNoise = rawNoisePercent > 40;

  // Pipeline state (Steps 1..5: Data Gathering, Preprocess, Normalize, Feature Eng, Data Selection)
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0 = idle, 1..5 = steps, 6 = done
  const [showProcessedTable, setShowProcessedTable] = useState(false);

  // Training state & ML Algorithm Selection
  const [selectedDatasetFile, setSelectedDatasetFile] = useState("processed_features_vector.csv");
  const [selectedMLAlgorithm, setSelectedMLAlgorithm] = useState("gradient_boosting");
  const [isTrainingRunning, setIsTrainingRunning] = useState(false);
  const [trainingDone, setTrainingDone] = useState(false);
  const [visibleModelsCount, setVisibleModelsCount] = useState(0);

  const selectedSources = DATA_SOURCES.filter(s => selectedIds.includes(s.id));

  // 5 Process Steps
  const pipelineSteps = [
    { id: 1, name: "1. Data Gathering", desc: "Fetch & aggregate feeds from selected sources" },
    { id: 2, name: "2. Preprocess Data", desc: "Clean missing values & filter noise" },
    { id: 3, name: "3. Normalize Data", desc: "MinMax scaling & Z-score standardization" },
    { id: 4, name: "4. Feature Engineering", desc: "Generate variables & temporal ratios" },
    { id: 5, name: "5. Data Selection", desc: "Select high-variance predictor features" }
  ];

  // Sample processed data rows
  const processedTableRows = [
    { id: "REC-001", adb: "₹1,850,000", gstDelta: "1.01", upiVelocity: "340 / day", cersai: "Clean (0)", normScore: "0.942", status: "Normalized" },
    { id: "REC-002", adb: "₹2,100,000", gstDelta: "1.02", upiVelocity: "410 / day", cersai: "Clean (0)", normScore: "0.965", status: "Normalized" },
    { id: "REC-003", adb: "₹1,450,000", gstDelta: "0.99", upiVelocity: "280 / day", cersai: "Clean (0)", normScore: "0.884", status: "Normalized" },
    { id: "REC-004", adb: "₹3,200,000", gstDelta: "1.04", upiVelocity: "520 / day", cersai: "Clean (0)", normScore: "0.988", status: "Normalized" },
    { id: "REC-005", adb: "₹1,750,000", gstDelta: "1.00", upiVelocity: "310 / day", cersai: "Clean (0)", normScore: "0.912", status: "Normalized" }
  ];

  const modelsList = [
    {
      id: "risk_model",
      name: "Risk Model",
      desc: "Evaluates credit risk & default probability.",
      accuracy: "94.8%",
      createdDate: "2026-08-25 16:30"
    },
    {
      id: "cashflow_model",
      name: "Cashflow Model",
      desc: "Projects 12-month forward revenue & cash runway.",
      accuracy: "92.4%",
      createdDate: "2026-08-25 16:30"
    },
    {
      id: "fraud_model",
      name: "Fraud Model",
      desc: "Detects anomalous transactions & duplicate pledges.",
      accuracy: "98.9%",
      createdDate: "2026-08-25 16:30"
    },
    {
      id: "money_balance_model",
      name: "Money Balance Model",
      desc: "Evaluates daily balance stability & cash volatility.",
      accuracy: "91.6%",
      createdDate: "2026-08-25 16:30"
    }
  ];

  const versionOptions = [
    { value: "v3.4", label: "v3.4 (Current)" },
    { value: "v3.3", label: "v3.3 (Old)" },
    { value: "v3.2", label: "v3.2 (Old)" },
    { value: "v3.1", label: "v3.1 (Old)" },
    { value: "v3.0", label: "v3.0 (Old)" }
  ];

  const handleFileUpload = (id, fileName) => {
    const ext = fileTypes[id] || "pdf";
    setUploadedFiles(prev => ({
      ...prev,
      [id]: fileName || `${id}_dataset.${ext}`
    }));
  };

  const handleFileTypeChange = (id, type) => {
    setFileTypes(prev => ({
      ...prev,
      [id]: type
    }));
  };

  const handleVersionChange = (modelId, version) => {
    setSelectedVersionMap(prev => ({
      ...prev,
      [modelId]: version
    }));
  };

  const handleDeploy = (modelId) => {
    setDeployedStatusMap(prev => ({
      ...prev,
      [modelId]: prev[modelId] === "Deployed" ? "Ready" : "Deployed"
    }));
  };

  // Run Process (Steps 1..5)
  const startPipeline = () => {
    setIsPipelineRunning(true);
    setPipelineStep(1);
    setShowProcessedTable(false);

    let step = 1;
    const interval = setInterval(() => {
      step++;
      if (step <= 5) {
        setPipelineStep(step);
      } else {
        clearInterval(interval);
        setPipelineStep(6);
        setIsPipelineRunning(false);
        setShowProcessedTable(true);
      }
    }, 600);
  };

  // Run Training on selected file & ML Algorithm
  const startTraining = () => {
    setIsTrainingRunning(true);
    setVisibleModelsCount(0);
    setTrainingDone(false);

    let modelCount = 0;
    const modelInterval = setInterval(() => {
      modelCount++;
      setVisibleModelsCount(modelCount);

      if (modelCount >= modelsList.length) {
        clearInterval(modelInterval);
        setIsTrainingRunning(false);
        setTrainingDone(true);
        setTrainedModels(modelsList);
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
            onClick={() => {
              const mock = {};
              selectedSources.forEach(s => {
                const ext = fileTypes[s.id] || 'pdf';
                mock[s.id] = `${s.id}_data.${ext}`;
              });
              setUploadedFiles(mock);
            }}
            className="text-xs font-semibold text-purple-700 hover:underline"
          >
            Auto-fill Sample Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedSources.map((source) => {
            const fileName = uploadedFiles[source.id];
            const currentFileType = fileTypes[source.id] || "pdf";

            return (
              <div key={source.id} className="p-4 border border-purple-100 rounded-xl bg-purple-50/50 space-y-3">
                <div className="font-bold text-xs text-[#3b0764] truncate">
                  {source.title}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {fileName ? fileName : 'No file uploaded'}
                  </div>

                  <label className="px-3.5 py-1.5 rounded-xl bg-[#3b0764] hover:bg-purple-900 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center space-x-1 shadow-md shadow-purple-950/20">
                    <span>{fileName ? 'Change' : 'Upload'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(source.id, e.target.files[0].name);
                        }
                      }}
                    />
                  </label>
                </div>
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
      </div>

      {/* 3. LLM Noise Inspection & Activation Box */}
      <div className="border border-purple-100 rounded-2xl p-5 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-[#3b0764]">
              3. LLM Noise Inspection & Activation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Raw Data Noise: <strong className="text-[#3b0764]">60%</strong> (Exceeds 40% Noise Threshold Limit)
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-purple-100 border border-purple-200 text-[#3b0764] text-xs font-mono font-bold shrink-0 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
            <span>LLM Activated</span>
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
              Stored File: processed_features_vector.csv
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
                  <th className="py-2.5 px-3">CERSAI Status</th>
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
                      <span className="w-24 inline-block text-center py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[10px] font-bold text-[#3b0764]">
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

      {/* 5. Standalone Step 5: Model Training Process Card */}
      {showProcessedTable && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL SELECTION & TRAINING</span>
              <h2 className="text-sm font-bold text-[#3b0764]">
                5. Model Training Process
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

      {/* 6. Generated Models Output Section */}
      {(visibleModelsCount > 0 || trainingDone) && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm transition-all duration-500 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#3b0764]">
                6. Generated Models Output
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Trained using: <strong className="text-[#3b0764] uppercase">{selectedMLAlgorithm.replace('_', ' ')}</strong>
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Generating: {visibleModelsCount} of {modelsList.length} Models
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {modelsList.slice(0, visibleModelsCount).map((model) => (
              <div
                key={model.id}
                className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2 transition-all duration-500 animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#3b0764]">{model.name}</h3>
                  <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-purple-200 rounded text-purple-900">
                    {model.accuracy}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{model.desc}</p>
                <div className="text-[9px] font-mono text-purple-700 font-semibold">
                  Algorithm: {selectedMLAlgorithm.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Model Version & Deployment Management Table */}
      {(visibleModelsCount === modelsList.length || trainingDone) && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">MODEL REGISTRY & DEPLOYMENT</span>
              <h2 className="text-sm font-bold text-[#3b0764]">
                7. Model Version & Deployment Management Table
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
                {modelsList.map((model) => {
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
      {visibleModelsCount === modelsList.length && (
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
