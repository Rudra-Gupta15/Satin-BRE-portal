export const PIPELINE_STAGES = [
  { id: 1, name: "Data Preprocessing", desc: "Outlier filtering, null imputation, timestamp synchronization", duration: 1500 },
  { id: 2, name: "Data Normalization", desc: "MinMax scaling, Z-score standardization, log transformations", duration: 1800 },
  { id: 3, name: "Feature Engineering", desc: "Generating 340+ ratios, temporal velocity & interaction terms", duration: 2200 },
  { id: 4, name: "Feature Selection", desc: "SHAP-driven variance thresholding & Mutual Information selection", duration: 1600 },
  { id: 5, name: "Model Training & Ensembling", desc: "Gradient Boosted Trees, LightGBM & Neural Architecture Search", duration: 2500 }
];

export const MOCK_TRAINING_LOGS = [
  "[SYS] Initializing Distributed ETL Cluster...",
  "[INGEST] Pulled 11 active data vectors across 485,000 historical loan records.",
  "[STAGE 1] Cleaning & Imputing: Resolved 1.2% missing values using KNN Imputer.",
  "[STAGE 1] Outlier Detection: Winsorized extreme transaction spikes at 99th percentile.",
  "[STAGE 2] Normalization: Computed Z-scores for ADB, Turnover, and Utility Punctuality.",
  "[STAGE 2] Applying Box-Cox Transformation to UPI transaction velocity features.",
  "[STAGE 3] Feature Engineering: Created 412 candidate features from multi-source join.",
  "[STAGE 3] Formed interaction ratio: (GST_Turnover / AA_Bank_Inflow) = 1.04.",
  "[STAGE 3] Extracted satellite NDVI vegetation index & CERSAI charge history features.",
  "[STAGE 4] Feature Selection: Applied Boruta algorithm + SHAP Importance ranking.",
  "[STAGE 4] Reduced feature dimension from 412 to 86 high-signal predictor variables.",
  "[STAGE 5] Model 1 (Risk Model): XGBoost Classifier hyperparameter tuning (max_depth=6, lr=0.03).",
  "[STAGE 5] Model 2 (Cashflow Model): LSTM Neural Network training for 50 epochs.",
  "[STAGE 5] Model 3 (Fraud Model): Isolation Forest + Graph Neural Net trained on CERSAI & Image Hashes.",
  "[STAGE 5] Model 4 (Money Balance Model): CatBoost Regressor for daily balance trajectory.",
  "[STAGE 5] Model 5 (Psychometric/Telecom Model): Random Forest Classifier for behavioral intent.",
  "[SYS] Model Training Complete! Validation ROC-AUC: 0.942. Cross-Entropy Loss: 0.118."
];

export const GENERATED_MODELS = [
  {
    id: "risk_model",
    name: "Risk & PD Credit Scorecard Model",
    type: "XGBoost Classifier",
    accuracy: "94.8%",
    rocAuc: "0.952",
    gini: "0.904",
    badge: "Primary Underwriting",
    desc: "Predicts Probability of Default (PD) within 12 months & computes Credit Bureau Score (300-900).",
    keyFeatures: ["NACH Bounce Ratio", "GST Turnover vs Bank Delta", "DSR Ratio", "ADB 90d Volatility"],
    color: "emerald"
  },
  {
    id: "cashflow_model",
    name: "Cashflow & Liquidity Forecast Model",
    type: "LSTM Recurrent Neural Net",
    accuracy: "92.4%",
    rocAuc: "0.931",
    gini: "0.862",
    badge: "Working Capital",
    desc: "Projects 12-month forward daily cashflow, Debt Service Coverage Ratio (DSCR), and cash runway.",
    keyFeatures: ["Monthly Revenue Inflow", "E-commerce Payout Regularity", "Utility Bill Punctuality"],
    color: "blue"
  },
  {
    id: "fraud_model",
    name: "Fraud & Duplicate Pledge Detection Model",
    type: "Graph Neural Net + pHash",
    accuracy: "98.9%",
    rocAuc: "0.991",
    gini: "0.982",
    badge: "Collateral Protection",
    desc: "Flags double-pledged assets in CERSAI registry, altered photo EXIF tags, & phantom invoices.",
    keyFeatures: ["CERSAI Active Charge Count", "Image Perceptual Hash Match", "Supplier Concentration Risk"],
    color: "rose"
  },
  {
    id: "money_balance_model",
    name: "Money Balance & Volatility Model",
    type: "CatBoost Regressor",
    accuracy: "91.6%",
    rocAuc: "0.918",
    gini: "0.836",
    badge: "Liquidity Guardrail",
    desc: "Evaluates daily average balance (ADB) stability, sudden cash drain alerts, & salary outflow ratios.",
    keyFeatures: ["ADB 30d/180d Ratio", "UPI Daily Velocity", "Weekend Spend Variance"],
    color: "amber"
  },
  {
    id: "psychometric_telecom_model",
    name: "Psychometric & Telecom Behavioral Model",
    type: "Random Forest Ensemble",
    accuracy: "89.2%",
    rocAuc: "0.897",
    gini: "0.794",
    badge: "Willingness-to-Pay",
    desc: "Assesses borrower integrity, decision stability, locus of control, and mobile SIM location constancy.",
    keyFeatures: ["Integrity Index", "SIM Tenure (Months)", "Nighttime Cell Tower Stability"],
    color: "purple"
  },
  {
    id: "unified_ensemble",
    name: "Unified 360° Risk Master Ensemble",
    type: "Stacking Meta-Learner",
    accuracy: "96.4%",
    rocAuc: "0.978",
    gini: "0.956",
    badge: "Recommended Production Model",
    desc: "Integrates signals from all 5 sub-models into a single weighted credit decisioning engine.",
    keyFeatures: ["Weighted PD Score", "Collateral Integrity Factor", "DSCR Cashflow Margin"],
    color: "cyan"
  }
];

export const MOCK_APPLICANT_PROFILES = [
  {
    id: "applicant_prime",
    name: "Rajesh Kumar (Apex Industrial Tools)",
    type: "SME Manufacturer",
    requestedAmount: "₹45,000,000",
    tenure: "36 Months",
    loanCategory: "Working Capital Loan",
    riskScore: 785,
    pdProbability: "1.4%",
    decision: "APPROVED",
    maxApprovedLimit: "₹50,000,000",
    interestRate: "9.75%",
    dscr: "2.4x",
    fraudRiskIndex: "2.1%",
    collateralStatus: "Clean / CERSAI Verified (AVM Valuation: ₹68,000,000)",
    shapFeatures: [
      { feature: "Account Aggregator Inflow", impact: "+68 pts", sentiment: "positive" },
      { feature: "GST Tax Compliance (100%)", impact: "+45 pts", sentiment: "positive" },
      { feature: "Satellite Property AVM", impact: "+32 pts", sentiment: "positive" },
      { feature: "NACH Bounce History (0)", impact: "+28 pts", sentiment: "positive" },
      { feature: "High UPI Transaction Velocity", impact: "+18 pts", sentiment: "positive" },
      { feature: "Existing Equipment Debt", impact: "-12 pts", sentiment: "negative" }
    ],
    cashflowData: [
      { month: "Jan", Inflow: 4800000, Outflow: 3200000, ADB: 1600000 },
      { month: "Feb", Inflow: 5100000, Outflow: 3400000, ADB: 1700000 },
      { month: "Mar", Inflow: 5900000, Outflow: 3900000, ADB: 2000000 },
      { month: "Apr", Inflow: 4600000, Outflow: 3100000, ADB: 1500000 },
      { month: "May", Inflow: 5300000, Outflow: 3500000, ADB: 1800000 },
      { month: "Jun", Inflow: 6200000, Outflow: 4000000, ADB: 2200000 },
      { month: "Jul", Inflow: 5800000, Outflow: 3700000, ADB: 2100000 },
      { month: "Aug", Inflow: 6400000, Outflow: 4100000, ADB: 2300000 },
      { month: "Sep", Inflow: 6700000, Outflow: 4300000, ADB: 2400000 },
      { month: "Oct", Inflow: 7100000, Outflow: 4600000, ADB: 2500000 },
      { month: "Nov", Inflow: 6900000, Outflow: 4400000, ADB: 2500000 },
      { month: "Dec", Inflow: 7500000, Outflow: 4800000, ADB: 2700000 }
    ],
    radarData: [
      { subject: 'AA Cashflow', A: 95, fullMark: 100 },
      { subject: 'GST Compliance', A: 98, fullMark: 100 },
      { subject: 'CERSAI / Land', A: 90, fullMark: 100 },
      { subject: 'Satellite Valuation', A: 88, fullMark: 100 },
      { subject: 'Telecom & Behaviour', A: 85, fullMark: 100 },
      { subject: 'UPI Velocity', A: 92, fullMark: 100 }
    ]
  },
  {
    id: "applicant_conditional",
    name: "Sunita Verma (Verma Agro Traders)",
    type: "Agri Trader & Retailer",
    requestedAmount: "₹18,000,000",
    tenure: "24 Months",
    loanCategory: "LAP Property Loan",
    riskScore: 645,
    pdProbability: "5.8%",
    decision: "CONDITIONAL APPROVAL",
    maxApprovedLimit: "₹12,000,000",
    interestRate: "12.5%",
    dscr: "1.35x",
    fraudRiskIndex: "11.4%",
    collateralStatus: "Land Registry Clear, Minor Encumbrance Dispute Pending (Cleared 2024)",
    shapFeatures: [
      { feature: "Satellite NDVI Crop Index", impact: "+42 pts", sentiment: "positive" },
      { feature: "Land Registry Title Verification", impact: "+35 pts", sentiment: "positive" },
      { feature: "Psychometric Integrity Score (88)", impact: "+22 pts", sentiment: "positive" },
      { feature: "Seasonal Cashflow Volatility", impact: "-38 pts", sentiment: "negative" },
      { feature: "GSTR-3B 1 Filing Delay", impact: "-18 pts", sentiment: "negative" }
    ],
    cashflowData: [
      { month: "Jan", Inflow: 2200000, Outflow: 1800000, ADB: 400000 },
      { month: "Feb", Inflow: 1900000, Outflow: 1600000, ADB: 300000 },
      { month: "Mar", Inflow: 4100000, Outflow: 2800000, ADB: 1300000 },
      { month: "Apr", Inflow: 4800000, Outflow: 3100000, ADB: 1700000 },
      { month: "May", Inflow: 2100000, Outflow: 1900000, ADB: 200000 },
      { month: "Jun", Inflow: 1800000, Outflow: 1700000, ADB: 100000 },
      { month: "Jul", Inflow: 1500000, Outflow: 1400000, ADB: 100000 },
      { month: "Aug", Inflow: 2000000, Outflow: 1700000, ADB: 300000 },
      { month: "Sep", Inflow: 3900000, Outflow: 2600000, ADB: 1300000 },
      { month: "Oct", Inflow: 4500000, Outflow: 3000000, ADB: 1500000 },
      { month: "Nov", Inflow: 2800000, Outflow: 2200000, ADB: 600000 },
      { month: "Dec", Inflow: 2500000, Outflow: 2000000, ADB: 500000 }
    ],
    radarData: [
      { subject: 'AA Cashflow', A: 62, fullMark: 100 },
      { subject: 'GST Compliance', A: 70, fullMark: 100 },
      { subject: 'CERSAI / Land', A: 85, fullMark: 100 },
      { subject: 'Satellite Valuation', A: 92, fullMark: 100 },
      { subject: 'Telecom & Behaviour', A: 80, fullMark: 100 },
      { subject: 'UPI Velocity', A: 65, fullMark: 100 }
    ]
  },
  {
    id: "applicant_high_risk",
    name: "Vikram Shah (Nova Logistics)",
    type: "Transport Fleet Owner",
    requestedAmount: "₹25,000,000",
    tenure: "36 Months",
    loanCategory: "Asset Backed Loan",
    riskScore: 510,
    pdProbability: "18.2%",
    decision: "REJECTED",
    maxApprovedLimit: "₹0",
    interestRate: "N/A",
    dscr: "0.82x",
    fraudRiskIndex: "68.5%",
    collateralStatus: "ALERT: CERSAI active prior charge detected on collateral parcel!",
    shapFeatures: [
      { feature: "CERSAI Active Prior Charge Found", impact: "-110 pts", sentiment: "negative" },
      { feature: "Multiple NACH Bounces (5 in 90d)", impact: "-75 pts", sentiment: "negative" },
      { feature: "GST vs Bank Turnover Discrepancy (-42%)", impact: "-60 pts", sentiment: "negative" },
      { feature: "Property Image Perceptual Hash Match", impact: "-45 pts", sentiment: "negative" },
      { feature: "High SIM Location Shift Variance", impact: "-25 pts", sentiment: "negative" }
    ],
    cashflowData: [
      { month: "Jan", Inflow: 3100000, Outflow: 3000000, ADB: 100000 },
      { month: "Feb", Inflow: 2800000, Outflow: 2900000, ADB: -100000 },
      { month: "Mar", Inflow: 3300000, Outflow: 3200000, ADB: 100000 },
      { month: "Apr", Inflow: 2500000, Outflow: 2700000, ADB: -200000 },
      { month: "May", Inflow: 2900000, Outflow: 3000000, ADB: -100000 },
      { month: "Jun", Inflow: 2200000, Outflow: 2500000, ADB: -300000 },
      { month: "Jul", Inflow: 3000000, Outflow: 3100000, ADB: -100000 },
      { month: "Aug", Inflow: 2700000, Outflow: 2800000, ADB: -100000 },
      { month: "Sep", Inflow: 3400000, Outflow: 3500000, ADB: -100000 },
      { month: "Oct", Inflow: 3100000, Outflow: 3300000, ADB: -200000 },
      { month: "Nov", Inflow: 2900000, Outflow: 3000000, ADB: -100000 },
      { month: "Dec", Inflow: 3200000, Outflow: 3400000, ADB: -200000 }
    ],
    radarData: [
      { subject: 'AA Cashflow', A: 35, fullMark: 100 },
      { subject: 'GST Compliance', A: 40, fullMark: 100 },
      { subject: 'CERSAI / Land', A: 15, fullMark: 100 },
      { subject: 'Satellite Valuation', A: 60, fullMark: 100 },
      { subject: 'Telecom & Behaviour', A: 45, fullMark: 100 },
      { subject: 'UPI Velocity', A: 50, fullMark: 100 }
    ]
  }
];
