import React, { useState } from 'react';
import { 
  Upload, ChevronDown, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle, 
  FileText, ArrowUpRight, ArrowDownRight, Code, Table as TableIcon, Activity, Table,
  BarChart3, Check, Loader2, Play, UserCheck, Building2, TrendingUp, CheckCircle, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DATA_SOURCES } from '../data/dataSources';

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

  const [selectedModelId, setSelectedModelId] = useState(deployedModels[0]?.id || "risk_model");
  const [inputFileName, setInputFileName] = useState("applicant_input_data.csv");
  const [selectedInputSourceId, setSelectedInputSourceId] = useState(selectedIds?.[0] || "account_aggregator");
  
  // Custom ID & Optional Bank Name inputs
  const [customId, setCustomId] = useState("cust_demo_medium_1");
  const [customBankName, setCustomBankName] = useState("Axis Bank");

  const [activeTab, setActiveTab] = useState('analytics'); // 'transactions' | 'analytics' | 'risk_score' | 'anomalies' | 'model_evaluation' | 'bre_payload'
  const [recomputing, setRecomputing] = useState(false);
  const [evaluatingCV, setEvaluatingCV] = useState(false);
  const [cvEvaluated, setCvEvaluated] = useState(true);

  const selectedSources = DATA_SOURCES.filter(s => selectedIds.includes(s.id));

  const activeModelId = deployedModels.some(m => m.id === selectedModelId) 
    ? selectedModelId 
    : (deployedModels[0]?.id || "risk_model");

  const activeModelObj = modelsList.find(m => m.id === activeModelId) || { name: "Risk Model" };
  const activeVersion = selectedVersionMap[activeModelId] || "v3.4";

  // 1. Transactions Data
  const transactionsList = [
    { date: "2026-02-01", narration: "NEFT STARK RETAIL SALARY", type: "CREDIT", amount: "36,410.35", category: "Salary", merchant: "-", stage: "RULE", confidence: 98 },
    { date: "2026-02-04", narration: "RENT PAYMENT TO LANDLORD", type: "DEBIT", amount: "6,920.40", category: "Rent", merchant: "-", stage: "RULE", confidence: 96 },
    { date: "2026-02-05", narration: "ICICI HOME LOAN MONTHLY INSTALLMENT", type: "DEBIT", amount: "11,169.05", category: "Loan Repayment", merchant: "-", stage: "RULE", confidence: 99 },
    { date: "2026-02-06", narration: "LOCAL RESTAURANT", type: "DEBIT", amount: "1,945.16", category: "Food", merchant: "-", stage: "RULE", confidence: 92 },
    { date: "2026-02-06", narration: "MOBILE BILL PAYMENT", type: "DEBIT", amount: "2,122.67", category: "Utilities", merchant: "-", stage: "RULE", confidence: 95 },
    { date: "2026-02-13", narration: "BROADBAND BILL", type: "DEBIT", amount: "1,240.30", category: "Utilities", merchant: "-", stage: "RULE", confidence: 94 },
    { date: "2026-02-13", narration: "AMAZON SHOPPING", type: "DEBIT", amount: "2,350.91", category: "Shopping", merchant: "-", stage: "RULE", confidence: 96 },
    { date: "2026-02-15", narration: "ELECTRICITY BILL PAYMENT", type: "DEBIT", amount: "1,353.03", category: "Utilities", merchant: "-", stage: "RULE", confidence: 97 },
    { date: "2026-02-17", narration: "SWIGGY FOOD DELIVERY", type: "DEBIT", amount: "645.73", category: "Food", merchant: "-", stage: "RULE", confidence: 91 },
    { date: "2026-02-19", narration: "SPOTIFY SUBSCRIPTION", type: "DEBIT", amount: "304.21", category: "Entertainment", merchant: "-", stage: "RULE", confidence: 95 }
  ];

  // 2. Dynamic Analytics Data dictionary per model
  const modelAnalyticsMap = {
    risk_model: {
      badge: `Low Risk (Approved)`,
      badgeBg: 'bg-emerald-700 text-white',
      metric: "Credit Score: 785 / 900 | PD: 1.4%",
      chartTitle: `1-Year Probability of Default (PD %) & Risk Trajectory (Version ${activeVersion})`,
      chartType: "area",
      dataKey: "PDRiskPct",
      yDomain: [0, 10],
      unit: "%",
      chartColor: "#059669",
      chart: [
        { month: "Jan", PDRiskPct: 3.2, CreditScore: 720 },
        { month: "Feb", PDRiskPct: 2.9, CreditScore: 735 },
        { month: "Mar", PDRiskPct: 2.8, CreditScore: 740 },
        { month: "Apr", PDRiskPct: 2.5, CreditScore: 750 },
        { month: "May", PDRiskPct: 2.3, CreditScore: 755 },
        { month: "Jun", PDRiskPct: 2.0, CreditScore: 765 },
        { month: "Jul", PDRiskPct: 1.8, CreditScore: 770 },
        { month: "Aug", PDRiskPct: 1.6, CreditScore: 775 },
        { month: "Sep", PDRiskPct: 1.5, CreditScore: 780 },
        { month: "Oct", PDRiskPct: 1.4, CreditScore: 785 },
        { month: "Nov", PDRiskPct: 1.3, CreditScore: 790 },
        { month: "Dec", PDRiskPct: 1.2, CreditScore: 795 }
      ],
      tableColumns: ["Month", "Default Risk (PD %)", "Credit Score (300-900)", "Inflow (₹)", "Outflow (₹)", "Avg Daily Balance (ADB)", "Risk Grade"],
      tableRows: [
        { col1: "Month 1 (Jan)", col2: "3.2%", col3: "720", col4: "₹48,000", col5: "₹32,000", col6: "₹1,600,000", col7: "Low Risk" },
        { col1: "Month 2 (Feb)", col2: "2.9%", col3: "735", col4: "₹51,000", col5: "₹34,000", col6: "₹1,700,000", col7: "Low Risk" },
        { col1: "Month 3 (Mar)", col2: "2.8%", col3: "740", col4: "₹59,000", col5: "₹39,000", col6: "₹2,000,000", col7: "Low Risk" },
        { col1: "Month 4 (Apr)", col2: "2.5%", col3: "750", col4: "₹46,000", col5: "₹31,000", col6: "₹1,500,000", col7: "Low Risk" },
        { col1: "Month 5 (May)", col2: "2.3%", col3: "755", col4: "₹53,000", col5: "₹35,000", col6: "₹1,800,000", col7: "Low Risk" },
        { col1: "Month 6 (Jun)", col2: "2.0%", col3: "765", col4: "₹62,000", col5: "₹40,000", col6: "₹2,200,000", col7: "Low Risk" },
        { col1: "Month 7 (Jul)", col2: "1.8%", col3: "770", col4: "₹58,000", col5: "₹37,000", col6: "₹2,100,000", col7: "Low Risk" },
        { col1: "Month 8 (Aug)", col2: "1.6%", col3: "775", col4: "₹64,000", col5: "₹41,000", col6: "₹2,300,000", col7: "Low Risk" },
        { col1: "Month 9 (Sep)", col2: "1.5%", col3: "780", col4: "₹67,000", col5: "₹43,000", col6: "₹2,400,000", col7: "Low Risk" },
        { col1: "Month 10 (Oct)", col2: "1.4%", col3: "785", col4: "₹71,000", col5: "₹46,000", col6: "₹2,500,000", col7: "Low Risk" },
        { col1: "Month 11 (Nov)", col2: "1.3%", col3: "790", col4: "₹69,000", col5: "₹44,000", col6: "₹2,500,000", col7: "Low Risk" },
        { col1: "Month 12 (Dec)", col2: "1.2%", col3: "795", col4: "₹75,000", col5: "₹48,000", col6: "₹2,700,000", col7: "Low Risk" }
      ],
      evalMetrics: {
        r2Score: "0.948",
        mse: "0.0162",
        precision: "95.8%",
        recall: "94.2%",
        mae: "0.0105",
        f1Score: "0.950"
      },
      cvFolds: [
        { fold: "Fold 1", r2: "0.951", mse: "0.0155", precision: "96.2%", recall: "94.8%", mae: "0.0098", status: "PASSED" },
        { fold: "Fold 2", r2: "0.942", mse: "0.0171", precision: "95.1%", recall: "93.6%", mae: "0.0112", status: "PASSED" },
        { fold: "Fold 3", r2: "0.953", mse: "0.0152", precision: "96.5%", recall: "95.0%", mae: "0.0095", status: "PASSED" },
        { fold: "Fold 4", r2: "0.945", mse: "0.0168", precision: "95.4%", recall: "93.9%", mae: "0.0108", status: "PASSED" },
        { fold: "Fold 5", r2: "0.949", mse: "0.0164", precision: "95.8%", recall: "94.3%", mae: "0.0104", status: "PASSED" }
      ]
    },
    cashflow_model: {
      badge: `High Cashflow (18.4 Months Runway)`,
      badgeBg: 'bg-emerald-800 text-white',
      metric: "Metric: ₹48.5L Net Inflow Projection",
      chartTitle: `1-Year Forward Monthly Cashflow & Revenue Projection (Version ${activeVersion})`,
      chartType: "bar",
      dataKey: "NetCashflow",
      chartColor: "#059669",
      chart: [
        { month: "Jan", NetCashflow: 16000, Inflow: 48000, Outflow: 32000 },
        { month: "Feb", NetCashflow: 17000, Inflow: 51000, Outflow: 34000 },
        { month: "Mar", NetCashflow: 20000, Inflow: 59000, Outflow: 39000 },
        { month: "Apr", NetCashflow: 15000, Inflow: 46000, Outflow: 31000 },
        { month: "May", NetCashflow: 18000, Inflow: 53000, Outflow: 35000 },
        { month: "Jun", NetCashflow: 22000, Inflow: 62000, Outflow: 40000 },
        { month: "Jul", NetCashflow: 21000, Inflow: 58000, Outflow: 37000 },
        { month: "Aug", NetCashflow: 23000, Inflow: 64000, Outflow: 41000 },
        { month: "Sep", NetCashflow: 24000, Inflow: 67000, Outflow: 43000 },
        { month: "Oct", NetCashflow: 25000, Inflow: 71000, Outflow: 46000 },
        { month: "Nov", NetCashflow: 25000, Inflow: 69000, Outflow: 44000 },
        { month: "Dec", NetCashflow: 27000, Inflow: 75000, Outflow: 48000 }
      ],
      tableColumns: ["Month", "Monthly Inflow (₹)", "Monthly Outflow (₹)", "Net Cashflow (₹)", "Cash Runway", "DSCR Coverage", "Health"],
      tableRows: [
        { col1: "Month 1 (Jan)", col2: "₹48,000", col3: "₹32,000", col4: "₹16,000", col5: "14.2 Mos", col6: "2.1x", col7: "Healthy" },
        { col1: "Month 2 (Feb)", col2: "₹51,000", col3: "₹34,000", col4: "₹17,000", col5: "15.0 Mos", col6: "2.2x", col7: "Healthy" },
        { col1: "Month 3 (Mar)", col2: "₹59,000", col3: "₹39,000", col4: "₹20,000", col5: "16.4 Mos", col6: "2.4x", col7: "Strong" },
        { col1: "Month 4 (Apr)", col2: "₹46,000", col3: "₹31,000", col4: "₹15,000", col5: "15.8 Mos", col6: "2.0x", col7: "Healthy" },
        { col1: "Month 5 (May)", col2: "₹53,000", col3: "₹35,000", col4: "₹18,000", col5: "16.9 Mos", col6: "2.3x", col7: "Healthy" },
        { col1: "Month 6 (Jun)", col2: "₹62,000", col3: "₹40,000", col4: "₹22,000", col5: "17.5 Mos", col6: "2.5x", col7: "Strong" },
        { col1: "Month 7 (Jul)", col2: "₹58,000", col3: "₹37,000", col4: "₹21,000", col5: "17.2 Mos", col6: "2.4x", col7: "Strong" },
        { col1: "Month 8 (Aug)", col2: "₹64,000", col3: "₹41,000", col4: "₹23,000", col5: "18.0 Mos", col6: "2.6x", col7: "Strong" },
        { col1: "Month 9 (Sep)", col2: "₹67,000", col3: "₹43,000", col4: "₹24,000", col5: "18.1 Mos", col6: "2.6x", col7: "Strong" },
        { col1: "Month 10 (Oct)", col2: "₹71,000", col3: "₹46,000", col4: "₹25,000", col5: "18.4 Mos", col6: "2.7x", col7: "Strong" },
        { col1: "Month 11 (Nov)", col2: "₹69,000", col3: "₹44,000", col4: "₹25,000", col5: "18.3 Mos", col6: "2.7x", col7: "Strong" },
        { col1: "Month 12 (Dec)", col2: "₹75,000", col3: "₹48,000", col4: "₹27,000", col5: "18.8 Mos", col6: "2.8x", col7: "Strong" }
      ],
      evalMetrics: {
        r2Score: "0.924",
        mse: "0.0210",
        precision: "93.5%",
        recall: "91.8%",
        mae: "0.0145",
        f1Score: "0.926"
      },
      cvFolds: [
        { fold: "Fold 1", r2: "0.928", mse: "0.0202", precision: "94.0%", recall: "92.3%", mae: "0.0138", status: "PASSED" },
        { fold: "Fold 2", r2: "0.919", mse: "0.0221", precision: "92.8%", recall: "91.1%", mae: "0.0152", status: "PASSED" },
        { fold: "Fold 3", r2: "0.930", mse: "0.0198", precision: "94.2%", recall: "92.5%", mae: "0.0135", status: "PASSED" },
        { fold: "Fold 4", r2: "0.921", mse: "0.0215", precision: "93.1%", recall: "91.4%", mae: "0.0148", status: "PASSED" },
        { fold: "Fold 5", r2: "0.925", mse: "0.0208", precision: "93.6%", recall: "91.9%", mae: "0.0142", status: "PASSED" }
      ]
    },
    fraud_model: {
      badge: `Clean Account (98.9% Authenticity)`,
      badgeBg: 'bg-blue-800 text-white',
      metric: "Metric: 0 Duplicate Pledges Detected",
      chartTitle: `1-Year Transaction Anomaly Index & Velocity (Version ${activeVersion})`,
      chartType: "bar",
      dataKey: "AnomalyIndex",
      chartColor: "#2563eb",
      chart: [
        { month: "Jan", AnomalyIndex: 12, Velocity: 340 },
        { month: "Feb", AnomalyIndex: 8, Velocity: 310 },
        { month: "Mar", AnomalyIndex: 15, Velocity: 410 },
        { month: "Apr", AnomalyIndex: 5, Velocity: 290 },
        { month: "May", AnomalyIndex: 6, Velocity: 320 },
        { month: "Jun", AnomalyIndex: 18, Velocity: 520 },
        { month: "Jul", AnomalyIndex: 4, Velocity: 330 },
        { month: "Aug", AnomalyIndex: 3, Velocity: 350 },
        { month: "Sep", AnomalyIndex: 2, Velocity: 360 },
        { month: "Oct", AnomalyIndex: 2, Velocity: 390 },
        { month: "Nov", AnomalyIndex: 1, Velocity: 380 },
        { month: "Dec", AnomalyIndex: 1, Velocity: 420 }
      ],
      tableColumns: ["Month", "Tx Volume", "UPI Velocity / Day", "CERSAI Check", "Anomaly Score", "Flagged Tx", "Verdict"],
      tableRows: [
        { col1: "Month 1 (Jan)", col2: "142 Tx", col3: "340 / day", col4: "Clean (0)", col5: "12%", col6: "1 Flagged", col7: "Low Risk" },
        { col1: "Month 2 (Feb)", col2: "69 Tx", col3: "310 / day", col4: "Clean (0)", col5: "8%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 3 (Mar)", col2: "180 Tx", col3: "410 / day", col4: "Clean (0)", col5: "15%", col6: "2 Flagged", col7: "Low Risk" },
        { col1: "Month 4 (Apr)", col2: "110 Tx", col3: "290 / day", col4: "Clean (0)", col5: "5%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 5 (May)", col2: "135 Tx", col3: "320 / day", col4: "Clean (0)", col5: "6%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 6 (Jun)", col2: "210 Tx", col3: "520 / day", col4: "Clean (0)", col5: "18%", col6: "2 Flagged", col7: "Low Risk" },
        { col1: "Month 7 (Jul)", col2: "145 Tx", col3: "330 / day", col4: "Clean (0)", col5: "4%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 8 (Aug)", col2: "160 Tx", col3: "350 / day", col4: "Clean (0)", col5: "3%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 9 (Sep)", col2: "175 Tx", col3: "360 / day", col4: "Clean (0)", col5: "2%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 10 (Oct)", col2: "190 Tx", col3: "390 / day", col4: "Clean (0)", col5: "2%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 11 (Nov)", col2: "185 Tx", col3: "380 / day", col4: "Clean (0)", col5: "1%", col6: "0 Flagged", col7: "Clean" },
        { col1: "Month 12 (Dec)", col2: "220 Tx", col3: "420 / day", col4: "Clean (0)", col5: "1%", col6: "0 Flagged", col7: "Clean" }
      ],
      evalMetrics: {
        r2Score: "0.989",
        mse: "0.0054",
        precision: "99.2%",
        recall: "98.6%",
        mae: "0.0038",
        f1Score: "0.989"
      },
      cvFolds: [
        { fold: "Fold 1", r2: "0.991", mse: "0.0048", precision: "99.5%", recall: "98.9%", mae: "0.0034", status: "PASSED" },
        { fold: "Fold 2", r2: "0.986", mse: "0.0061", precision: "98.8%", recall: "98.2%", mae: "0.0042", status: "PASSED" },
        { fold: "Fold 3", r2: "0.992", mse: "0.0045", precision: "99.6%", recall: "99.0%", mae: "0.0032", status: "PASSED" },
        { fold: "Fold 4", r2: "0.987", mse: "0.0058", precision: "99.0%", recall: "98.4%", mae: "0.0040", status: "PASSED" },
        { fold: "Fold 5", r2: "0.990", mse: "0.0051", precision: "99.3%", recall: "98.7%", mae: "0.0036", status: "PASSED" }
      ]
    },
    money_balance_model: {
      badge: `Stable Balance (ADB ₹2.1L)`,
      badgeBg: 'bg-[#3b0764] text-white',
      metric: "Metric: 91.6% Balance Stability Score",
      chartTitle: `1-Year Average Daily Balance (ADB) Stability Trajectory (Version ${activeVersion})`,
      chartType: "area",
      dataKey: "ADBScore",
      chartColor: "#7c3aed",
      chart: [
        { month: "Jan", ADBScore: 160000, MinBal: 14000 },
        { month: "Feb", ADBScore: 170000, MinBal: 15500 },
        { month: "Mar", ADBScore: 200000, MinBal: 18000 },
        { month: "Apr", ADBScore: 150000, MinBal: 13000 },
        { month: "May", ADBScore: 180000, MinBal: 16000 },
        { month: "Jun", ADBScore: 220000, MinBal: 19500 },
        { month: "Jul", ADBScore: 210000, MinBal: 18500 },
        { month: "Aug", ADBScore: 230000, MinBal: 20000 },
        { month: "Sep", ADBScore: 240000, MinBal: 21000 },
        { month: "Oct", ADBScore: 250000, MinBal: 22000 },
        { month: "Nov", ADBScore: 250000, MinBal: 22500 },
        { month: "Dec", ADBScore: 270000, MinBal: 24000 }
      ],
      tableColumns: ["Month", "ADB (₹)", "Min Balance (₹)", "Peak Balance (₹)", "Volatility Index", "NACH Bounces", "Stability Rating"],
      tableRows: [
        { col1: "Month 1 (Jan)", col2: "₹1,600,000", col3: "₹14,000", col4: "₹2,800,000", col5: "1.63", col6: "0", col7: "Stable" },
        { col1: "Month 2 (Feb)", col2: "₹1,700,000", col3: "₹15,500", col4: "₹2,950,000", col5: "1.52", col6: "0", col7: "Stable" },
        { col1: "Month 3 (Mar)", col2: "₹2,000,000", col3: "₹18,000", col4: "₹3,400,000", col5: "1.41", col6: "0", col7: "Very Stable" },
        { col1: "Month 4 (Apr)", col2: "₹1,500,000", col3: "₹13,000", col4: "₹2,600,000", col5: "1.70", col6: "0", col7: "Stable" },
        { col1: "Month 5 (May)", col2: "₹1,800,000", col3: "₹16,000", col4: "₹3,100,000", col5: "1.48", col6: "0", col7: "Stable" },
        { col1: "Month 6 (Jun)", col2: "₹2,200,000", col3: "₹19,500", col4: "₹3,700,000", col5: "1.32", col6: "0", col7: "Very Stable" },
        { col1: "Month 7 (Jul)", col2: "₹2,100,000", col3: "₹18,500", col4: "₹3,550,000", col5: "1.35", col6: "0", col7: "Very Stable" },
        { col1: "Month 8 (Aug)", col2: "₹2,300,000", col3: "₹20,000", col4: "₹3,850,000", col5: "1.28", col6: "0", col7: "Very Stable" },
        { col1: "Month 9 (Sep)", col2: "₹2,400,000", col3: "₹21,000", col4: "₹4,000,000", col5: "1.24", col6: "0", col7: "Very Stable" },
        { col1: "Month 10 (Oct)", col2: "₹2,500,000", col3: "₹22,000", col4: "₹4,200,000", col5: "1.19", col6: "0", col7: "Very Stable" },
        { col1: "Month 11 (Nov)", col2: "₹2,500,000", col3: "₹22,500", col4: "₹4,150,000", col5: "1.18", col6: "0", col7: "Very Stable" },
        { col1: "Month 12 (Dec)", col2: "₹2,700,000", col3: "₹24,000", col4: "₹4,500,000", col5: "1.10", col6: "0", col7: "Very Stable" }
      ],
      evalMetrics: {
        r2Score: "0.916",
        mse: "0.0245",
        precision: "92.8%",
        recall: "90.9%",
        mae: "0.0168",
        f1Score: "0.918"
      },
      cvFolds: [
        { fold: "Fold 1", r2: "0.920", mse: "0.0238", precision: "93.2%", recall: "91.4%", mae: "0.0160", status: "PASSED" },
        { fold: "Fold 2", r2: "0.911", mse: "0.0255", precision: "92.1%", recall: "90.2%", mae: "0.0175", status: "PASSED" },
        { fold: "Fold 3", r2: "0.922", mse: "0.0232", precision: "93.4%", recall: "91.6%", mae: "0.0158", status: "PASSED" },
        { fold: "Fold 4", r2: "0.913", mse: "0.0250", precision: "92.4%", recall: "90.5%", mae: "0.0171", status: "PASSED" },
        { fold: "Fold 5", r2: "0.917", mse: "0.0242", precision: "92.9%", recall: "91.0%", mae: "0.0165", status: "PASSED" }
      ]
    }
  };

  const currentAnalytics = modelAnalyticsMap[activeModelId] || modelAnalyticsMap.risk_model;

  // 3. Anomalies Data - Percentage probabilities for clear understanding (e.g. 91.0% Anomaly Risk)
  const anomaliesList = [
    { date: "2026-02-06", narration: "LOCAL RESTAURANT", amount: "1,945.16", score: "91.0%", level: "HIGH", reasons: "UNUSUAL_AMOUNT" },
    { date: "2026-06-04", narration: "FLIPKART ORDER", amount: "12,054.80", score: "71.5%", level: "HIGH", reasons: "UNUSUAL_AMOUNT" },
    { date: "2026-06-16", narration: "ATM CASH WITHDRAWAL", amount: "4,845.77", score: "67.5%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-05-03", narration: "OLA CABS", amount: "1,185.46", score: "60.2%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-06-08", narration: "BROADBAND BILL", amount: "340.65", score: "55.5%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-04-23", narration: "FLIPKART ORDER", amount: "8,846.64", score: "54.5%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-06-16", narration: "IRCTC TICKET", amount: "1,072.97", score: "51.2%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-05-05", narration: "LOCAL RESTAURANT", amount: "2,795.72", score: "48.9%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-02-13", narration: "BROADBAND BILL", amount: "1,240.30", score: "45.6%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" },
    { date: "2026-03-04", narration: "NETFLIX SUBSCRIPTION", amount: "227.26", score: "45.5%", level: "MEDIUM", reasons: "STATISTICAL_OUTLIER" }
  ];

  // 4. BRE Payload JSON
  const brePayload = {
    statement_id: customId || "cust_demo_medium_1",
    bank: customBankName || "Not Specified",
    total_transactions: 69,
    status: "ANALYZED",
    model_metadata: {
      selected_model: activeModelObj.name,
      version: activeVersion,
      credit_score: 851,
      risk_grade: "LOW",
      probability_of_default: 0.082
    },
    feature_vector: {
      account_age_days: 173,
      avg_monthly_inflow: 48500,
      nach_bounce_count_90d: 0,
      dscr_ratio: 2.41,
      cash_withdrawal_ratio: 0.0366,
      transaction_volatility: 1.6302,
      minimum_balance: 17496,
      foir_ratio: 30.95,
      income_stability: 0.987
    },
    negative_factors: [
      "Cash withdrawal ratio (0.0366)",
      "Transaction volatility (1.6302)",
      "Minimum balance (17496)",
      "FOIR (30.95)",
      "Income stability (0.987)"
    ]
  };

  const handleRecomputeRiskScore = () => {
    setRecomputing(true);
    setTimeout(() => {
      setRecomputing(false);
    }, 600);
  };

  const handleRunCrossValidation = () => {
    setEvaluatingCV(true);
    setTimeout(() => {
      setEvaluatingCV(false);
      setCvEvaluated(true);
    }, 800);
  };

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

              <label className="px-3.5 py-2 rounded-xl bg-[#3b0764] hover:bg-purple-900 text-white text-xs font-bold cursor-pointer shrink-0 flex items-center space-x-1 shadow-md shadow-purple-950/20">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setInputFileName(e.target.files[0].name);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block font-mono truncate mt-1">
            File: <strong className="text-[#3b0764]">{inputFileName}</strong>
          </span>
        </div>

        {/* Card 3: 39% Width */}
        <div className="w-full md:w-[39%] shrink-0 border border-purple-100 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-[#3b0764] block mb-1">
              3. Custom ID & Bank Name (Optional):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-purple-700" />
                  Custom ID:
                </span>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="e.g. SFL-2026-991"
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
            Bank Name is optional
          </span>
        </div>

      </div>

      {/* Statement Header & Reprocess Button Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <h2 className="text-xl font-extrabold text-[#3b0764]">
            Statement - {customId || "cust_demo_medium_1"}
          </h2>
          <span className="px-2.5 py-0.5 rounded-md bg-purple-100 border border-purple-200 text-[10px] font-extrabold font-mono text-purple-900">
            ANALYZED
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {customBankName ? `${customBankName} - ` : ''}69 transactions
          </span>
        </div>

        <button
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
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Confidence</th>
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
                    <td className="py-3 px-4 text-slate-700 font-medium">{row.category}</td>
                    <td className="py-3 px-4 text-slate-400">{row.merchant}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">{row.stage}</td>
                    <td className="py-3 px-4">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${row.confidence}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS (DYNAMIC GRAPH & TABLE PER SELECTED MODEL) */}
      {activeTab === 'analytics' && (
        <div className="border border-purple-100 rounded-2xl p-5 bg-white space-y-5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-600 font-bold block">MODEL OUTPUT RESULT</span>
              <h2 className="text-lg font-bold text-[#3b0764]">
                {activeModelObj.name} Output
              </h2>
            </div>

            <div className="text-right">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono inline-block shadow-sm ${currentAnalytics.badgeBg}`}>
                {currentAnalytics.badge}
              </span>
              <div className="text-xs font-mono font-bold text-purple-900 mt-1">
                {currentAnalytics.metric}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-3">
              {currentAnalytics.chartTitle}
            </h3>

            <div className="h-64 w-full bg-purple-50/40 border border-purple-100 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                {currentAnalytics.chartType === 'area' ? (
                  <AreaChart data={currentAnalytics.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                    <XAxis dataKey="month" stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <YAxis 
                      domain={currentAnalytics.yDomain || [0, 'auto']} 
                      stroke="#3b0764" 
                      tick={{ fontSize: 10 }}
                      unit={currentAnalytics.unit || ''} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d8cefa', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val, name, item) => [
                        `${val}${currentAnalytics.unit || ''} (Credit Score: ${item.payload.CreditScore || '785'})`, 
                        'Default Risk (PD %)'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={currentAnalytics.dataKey} 
                      stroke={currentAnalytics.chartColor} 
                      fill={currentAnalytics.chartColor} 
                      fillOpacity={0.25} 
                      strokeWidth={2.5} 
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={currentAnalytics.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                    <XAxis dataKey="month" stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#3b0764" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d8cefa', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar 
                      dataKey={currentAnalytics.dataKey} 
                      fill={currentAnalytics.chartColor} 
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
                1-Year (12 Months) Month-by-Month {activeModelObj.name} Numerical Table
              </h3>
              <span className="text-[10px] font-mono text-purple-700 font-bold">12 Month Breakdown</span>
            </div>

            <div className="overflow-x-auto border border-purple-100 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-purple-50/80 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    {currentAnalytics.tableColumns.map((col, idx) => (
                      <th key={idx} className="py-2.5 px-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 bg-white">
                  {currentAnalytics.tableRows.map((row, idx) => (
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
      {activeTab === 'risk_score' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
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
              <span className="text-3xl font-extrabold text-[#3b0764] font-mono block">851</span>
              <span className="text-xs font-bold text-slate-700 block">Credit Score</span>
              <span className="text-[10px] text-emerald-800 font-semibold block">Range: 300 - 900 (Higher is Better)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold inline-block">
                  LOW RISK
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 block">Risk Grade (Underwriting)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono block">1.4%</span>
              <span className="text-xs font-bold text-slate-700 block">Probability of Default (PD)</span>
              <span className="text-[10px] text-emerald-800 font-semibold block">Underwriting Approval: YES</span>
            </div>

            {/* Displays OUR Actual Model Name instead of raw string */}
            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1 overflow-hidden">
              <span className="text-sm font-extrabold text-[#3b0764] block truncate">
                {activeModelObj.name}
              </span>
              <span className="text-xs font-bold text-purple-700 block">
                Version: {activeVersion} (Deployed)
              </span>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                SFL Underwriting Model
              </span>
            </div>
          </div>

          {/* Easy to Understand Key Strengths & Risk Warnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-[#3b0764] flex items-center gap-1.5 border-b border-purple-100 pb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Positive Drivers (Why Credit Score is High)
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Zero NACH Bounces</strong> in 90 days (+45 pts)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Strong Debt Service Coverage (DSCR 2.41x)</strong> (+32 pts)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Consistent Monthly Inflow (₹48,500/mo)</strong> (+28 pts)</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-[#3b0764] flex items-center gap-1.5 border-b border-purple-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Risk Monitoring Alerts
              </h3>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>Minor Cash Withdrawal Ratio:</strong> 3.66% of outflow</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>Transaction Volatility:</strong> 1.63 (Normal Range)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Simple Human-Readable Feature Vector Table */}
          <div className="p-5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#3b0764] border-b border-purple-100 pb-2">
              Feature Vector Breakdown ({activeModelObj.name})
            </h3>
            <div className="divide-y divide-purple-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Account History & Stability</span>
                <span className="font-bold text-black font-mono">173 Days Active</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Average Monthly Inflow</span>
                <span className="font-bold text-black font-mono">₹48,500 / month</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-medium">NACH Cheque / EMI Bounces (90d)</span>
                <span className="font-bold text-emerald-700 font-mono">0 Bounces (Clean)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-medium">DSCR Debt Coverage Ratio</span>
                <span className="font-bold text-black font-mono">2.41x Coverage</span>
              </div>
            </div>
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
                Anomaly Risk Probability scores range from 0.0% (Normal) to 100.0% (High Anomaly Risk).
              </p>
            </div>
          </div>

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
        </div>
      )}

      {/* TAB 5: MODEL EVALUATION */}
      {activeTab === 'model_evaluation' && (
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

          {/* 6 Key Evaluation Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">R² SCORE</span>
              <span className="text-xl font-extrabold text-[#3b0764] font-mono block">
                {currentAnalytics.evalMetrics.r2Score}
              </span>
              <span className="text-[9px] text-purple-700 font-semibold block">Coefficient of Determination</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">MSE</span>
              <span className="text-xl font-extrabold text-[#3b0764] font-mono block">
                {currentAnalytics.evalMetrics.mse}
              </span>
              <span className="text-[9px] text-purple-700 font-semibold block">Mean Squared Error</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">PRECISION</span>
              <span className="text-xl font-extrabold text-emerald-700 font-mono block">
                {currentAnalytics.evalMetrics.precision}
              </span>
              <span className="text-[9px] text-emerald-800 font-semibold block">Positive Predictive Value</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">RECALL</span>
              <span className="text-xl font-extrabold text-emerald-700 font-mono block">
                {currentAnalytics.evalMetrics.recall}
              </span>
              <span className="text-[9px] text-emerald-800 font-semibold block">Sensitivity / True Positive</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">MAE</span>
              <span className="text-xl font-extrabold text-[#3b0764] font-mono block">
                {currentAnalytics.evalMetrics.mae}
              </span>
              <span className="text-[9px] text-purple-700 font-semibold block">Mean Absolute Error</span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">F1 SCORE</span>
              <span className="text-xl font-extrabold text-purple-900 font-mono block">
                {currentAnalytics.evalMetrics.f1Score}
              </span>
              <span className="text-[9px] text-purple-700 font-semibold block">Harmonic Mean</span>
            </div>
          </div>

          {/* Cross Validation -> Evaluate Our Model Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3b0764] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-700" />
                  Cross Validation (5-Fold Stratified K-Fold) — Evaluate Our Model
                </h3>
                <p className="text-[11px] text-slate-500">
                  Evaluates model stability across independent cross-validation subsets to ensure zero overfitting.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-extrabold font-mono">
                CV Mean R²: {currentAnalytics.evalMetrics.r2Score} ± 0.004
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
                  {currentAnalytics.cvFolds.map((foldRow, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30 transition-colors text-slate-800">
                      <td className="py-2.5 px-3 font-bold text-[#3b0764]">{foldRow.fold}</td>
                      <td className="py-2.5 px-3 font-extrabold text-black">{foldRow.r2}</td>
                      <td className="py-2.5 px-3">{foldRow.mse}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{foldRow.precision}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{foldRow.recall}</td>
                      <td className="py-2.5 px-3">{foldRow.mae}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
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

      {/* TAB 6: BRE PAYLOAD - SIMPLE CLEAN WHITE BACKGROUND */}
      {activeTab === 'bre_payload' && (
        <div className="border border-purple-100 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <h2 className="text-base font-bold text-[#3b0764] flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-700" />
              BRE Output Payload (JSON)
            </h2>
          </div>

          <pre className="bg-purple-50/40 p-5 rounded-xl text-xs font-mono text-[#3b0764] overflow-x-auto border border-purple-200 shadow-xs font-bold leading-relaxed">
            {JSON.stringify(brePayload, null, 2)}
          </pre>
        </div>
      )}

    </div>
  );
}
