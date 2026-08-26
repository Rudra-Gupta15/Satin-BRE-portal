import React, { useState } from 'react';
import {
  ChevronDown,
  Database,
  Loader2,
  Check,
  Wifi,
  CheckCircle2
} from 'lucide-react';

export default function AiArchitecture() {
  const [selectedLLM, setSelectedLLM] = useState("gemma");
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [dataExtracted, setDataExtracted] = useState(false);

  // Dropdown cleanliness percentage
  const [cleanlinessPercent, setCleanlinessPercent] = useState(60);
  const isLLMActive = cleanlinessPercent < 60;

  // Calculated noisy percentage (100 - cleanliness)
  const noisyPercent = 100 - cleanlinessPercent;

  // vLLM Server Connection State
  const [vllmEnabled, setVllmEnabled] = useState(true);
  const [vllmEndpoint, setVllmEndpoint] = useState("http://localhost:8000/v1");
  const [vllmModelName, setVllmModelName] = useState("gemma-2-9b-it");
  const [gpuCount, setGpuCount] = useState("2");
  const [gpuMemoryUtil, setGpuMemoryUtil] = useState("0.90");

  const [isTestingVLLM, setIsTestingVLLM] = useState(false);
  const [vllmStatus, setVllmStatus] = useState("connected"); // 'connected' | 'testing' | 'disconnected'

  const handleExtractData = () => {
    setIsExtractingData(true);
    setDataExtracted(false);

    setTimeout(() => {
      setIsExtractingData(false);
      setDataExtracted(true);
    }, 800);
  };

  const handleTestVLLMConnection = () => {
    setIsTestingVLLM(true);
    setVllmStatus("testing");

    setTimeout(() => {
      setIsTestingVLLM(false);
      setVllmStatus("connected");
    }, 700);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Page Header */}
      <div className="border-b border-purple-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#3b0764]">
          AI Architecture: LLM Extraction & Processing
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
                onChange={(e) => setSelectedLLM(e.target.value)}
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
              onClick={() => setVllmEnabled(!vllmEnabled)}
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
                  placeholder="http://localhost:8000/v1"
                  className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                vLLM Model ID / Served Tag:
              </label>
              <input
                type="text"
                value={vllmModelName}
                onChange={(e) => setVllmModelName(e.target.value)}
                placeholder="gemma-2-9b-it"
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 shadow-2xs"
              />
            </div>

            {/* Tensor Parallelism (GPUs) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Tensor Parallelism (GPUs):
              </label>
              <select
                value={gpuCount}
                onChange={(e) => setGpuCount(e.target.value)}
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
              >
                <option value="1">1 GPU (NVIDIA A10G / RTX 4090)</option>
                <option value="2">2 GPUs (NVLink Tensor Parallel = 2)</option>
                <option value="4">4 GPUs (Cluster Parallel = 4)</option>
                <option value="8">8 GPUs (H100 SXM 80GB Node)</option>
              </select>
            </div>

            {/* GPU Memory Utilization */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                GPU Memory Utilization (PagedAttention):
              </label>
              <select
                value={gpuMemoryUtil}
                onChange={(e) => setGpuMemoryUtil(e.target.value)}
                className="w-full bg-purple-50/50 border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#3b0764] focus:outline-none focus:border-purple-600 cursor-pointer shadow-2xs"
              >
                <option value="0.85">0.85 (85% VRAM Allocated)</option>
                <option value="0.90">0.90 (90% VRAM — Recommended)</option>
                <option value="0.95">0.95 (95% Peak Capacity)</option>
              </select>
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
                    <span>Test vLLM Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Connection Status Badge */}
            {vllmEnabled && vllmStatus === "connected" && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono flex items-center space-x-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connected • vLLM Active ({gpuCount} GPU TP) • 12ms Latency</span>
              </div>
            )}
          </div>
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
              onChange={(e) => setCleanlinessPercent(Number(e.target.value))}
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

    </div>
  );
}
