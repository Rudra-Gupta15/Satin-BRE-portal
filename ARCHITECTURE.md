# SFL BRE Portal — System Architecture & Workflow Report

**Organization:** Satin Finserv Limited (SFL)  
**System:** AI-Powered Business Rule Engine (BRE) & Credit Risk Platform  
**Version:** v3.4 Production Stack  

---

## 1. Project Objective & System Overview

The **Satin Finserv Limited (SFL) BRE Portal** is an enterprise-grade automated credit underwriting and risk decisioning platform. It automates loan evaluation by aggregating multi-source financial feeds, cleansing noisy raw data using local LLM engines, executing 5-stage feature engineering, training machine learning risk scorecards, enforcing customizable credit policy rules, and generating instant credit decision payloads.

### Key Capabilities (What the Platform Does):
- **Multi-Feed Ingestion:** Aggregates 11 data vectors (Axis Bank AA, HDFC, SBI, ICICI, GST Returns, CIBIL Bureau, CERSAI, UPI Velocity).
- **Automated LLM Data Cleansing:** Evaluates raw data noise; if cleanliness is below 60% (noise > 40%), the LLM Data Cleaning Engine automatically activates to sanitize fields and engineer features.
- **Machine Learning Risk Modeling:** Trains 4 specialized sub-models (Credit Risk Scorecard, Cashflow Predictor, Fraud Detector, Liquidity Model) using algorithms like Gradient Boosting and Random Forest.
- **Real-Time Underwriting & Risk Scoring:** Calculates 300–900 credit scores, Probability of Default (PD%), risk grades (LOW, MEDIUM, HIGH), and flags suspicious transactions.
- **Customizable BRE Policy Rules:** Allows credit managers to toggle individual risk rules ON/OFF across 15 Underwriting Rule Categories.

---

## 2. End-to-End System Workflow Diagram

```mermaid
flowchart TD
    1["1. Login & Access Control"] --> 2["2. Dashboard Overview<br/>(View Analyzed Statements, Processed Txns, Risk Scores & Anomalies)"]
    2 --> 3["3. Data Sources Selection<br/>(Select active feeds from 11 Data Sources e.g. Axis AA, HDFC, GST, CIBIL)"]
    3 --> 4["4. Data Upload<br/>(Upload any file format: .pdf, .csv, .json, .xlsx or Auto-fill Sample Data)"]
    4 --> 5["5. Pre-Processing Pipeline<br/>(Run 5-Stage Data Gathering, Preprocess, Normalize, Feature Eng, Selection)"]
    
    5 --> 6{"6. LLM Cleanliness Inspection"}
    6 -->|Cleanliness < 60%| 6a["6a. LLM Engine Activates<br/>(Cleans noisy data & structures feature vectors)"]
    6 -->|Cleanliness >= 60%| 6b["6b. Direct Ingestion<br/>(Data already clean, passes directly)"]
    
    6a --> 7["7. Select File & Select ML Model<br/>(Select processed_features_vector.csv & algorithm)"]
    6b --> 7
    
    7 --> 8["8. Train & Produce Risk Models<br/>(Generates Risk Scorecard, Cashflow, Fraud & Money Balance Models)"]
    8 --> 9["9. Model Deployment<br/>(Deploy Model v3.4 to Mainnet for live current data)"]
    9 --> 10["10. Model Testing Page<br/>(Upload applicant profile & run inference)"]
    
    10 --> 10a["Transactions Tab<br/>(Raw bank statement logs & cashflows)"]
    10 --> 10b["Analytics Tab<br/>(Feature importance & monthly breakdown)"]
    10 --> 10c["Credit Score Tab<br/>(300-900 Credit Score, PD% & Risk Grade)"]
    10 --> 10d["Anomalies Tab<br/>(Flagged suspicious transactions & bounces)"]
    10 --> 10e["Model Evaluation Tab<br/>(Accuracy metrics: R², MSE, F1 & Cross-Val)"]
    10 --> 10f["BRE Payload Tab<br/>(Final JSON Decision: APPROVED / REJECTED)"]
    
    10a & 10b & 10c & 10d & 10e & 10f --> 11["11. Customizable Settings"]
    11 --> 11a["AI Architecture Settings<br/>(Customize AI: vLLM Server, GPUs, Model ID)"]
    11 --> 11b["BRE Rule Settings<br/>(Customize Rules: 15 Category Risk Toggles ON/OFF)"]
```

---

## 3. Platform Modules Overview

| Module Name | Purpose & Primary Function |
| :--- | :--- |
| **Overview Dashboard** | Provides senior management with live portfolio KPIs, bar charts, donut charts, and bank statement ingestion feeds. |
| **Data Sources** | Enables selecting active financial feeds from 11 data vectors and adding custom feeds. |
| **Model Hub** | Handles raw file upload, pre-processing, LLM cleanliness filtering, ML model training, and version deployment. |
| **Model Testing** | Conducts live applicant risk scoring across 6 tabs (Transactions, Analytics, Credit Score, Anomalies, Model Evaluation, BRE Payload). |
| **AI Architecture** | Configures self-hosted vLLM engine settings (vLLM Endpoint, Model ID, GPU allocation, memory utilization). |
| **Settings** | Configures credit underwriting policies by toggling individual rules ON/OFF across 15 Risk Categories. |
