# Satin BRE Portal - Business Rules Engine & Underwriting Risk Analytics

A modern, high-performance web application built for **Satin Finserv Limited (SFL)** to manage underwriting risk models, aggregate multi-source financial data feeds, configure automated business rules pipelines, and run real-time credit score inference analytics.

---

## 🌟 Key Features & Architecture

### 📊 1. Overview Dashboard
- **Real-Time Underwriting Metrics**: Live KPI summary for Statements Analyzed, Transactions Processed, Average Risk Score (`/900`), Pending Reviews, and Anomalies Flagged.
- **Interactive Visualizations**: Integrated callout data label charts (Bar & Donut charts powered by `Recharts`) for risk grade breakdown and ingestion status tracking.
- **Live Ingestion Feed**: Monitor incoming bank statements, status flags, and risk scores in real-time.

### 🔌 2. Data Products Catalog & Selection
- **Multi-Feed Selection**: Choose from 11 pre-built financial data products including Account Aggregator (AA), GST Turnover Reconciliation, BBPS Utility Payment History, UPI Enrichment, CERSAI Security Lookup, Land Registry, and Property Valuation.
- **Custom Product Integration**: Add new custom data products dynamically using the interactive **+ Add Product** modal.
- **Schema & Sample Inspector**: Inspect detailed sample payloads and field schemas for every feed.

### ⚙️ 3. Model Hub & Rules Pipeline Studio
- **Pipeline Configurator**: Multi-stage model pipeline studio for feature weight distribution, risk threshold calibration, and hyperparameter tuning.
- **Version Control & Deployment**: Select version tags (`v3.4`, `v3.5-RC`, `v4.0-Beta`) and manage deployment statuses (*Ready*, *Deployed*, *Draft*).

### 🎯 4. Model Testing & Risk Inference Analytics
- **Comprehensive Score Breakdown**: Calculate overall risk score out of 900 with clear status categorization (LOW Risk, MEDIUM Risk, HIGH Risk).
- **Financial Ratios & Metrics**: Evaluates DSCR (Debt Service Coverage Ratio), Cash Withdrawal Outflow Ratios, FOIR (Fixed Obligation to Income Ratio), and turnover trends.
- **Feature Importance & Rule Audit**: Visual bar chart breakdown of top contributing risk features and explicit rule evaluations.

---

## 🛠️ Tech Stack

- **Core Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18 or higher) and **npm** installed on your system.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/satin-bre-portal.git
   cd BRE
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Start the Vite local development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173/` in your browser.

---

## 📜 Available Scripts

- `npm run dev` – Starts the local development server with Hot Module Replacement (HMR).
- `npm run build` – Builds the production bundle in the `dist` folder.
- `npm run preview` – Serves the production build locally for preview.
- `npm run lint` – Runs ESLint across the codebase.

---

## 📁 Project Structure

```text
BRE/
├── public/                # Static public assets
├── src/
│   ├── assets/            # Images and media assets
│   ├── components/        # React application components
│   │   ├── OverviewDashboard.jsx  # Main Underwriting & Analytics Dashboard
│   │   ├── Page1Selection.jsx     # Data Feed Selection & Add Product Modal
│   │   ├── Page2Pipeline.jsx      # Model Pipeline & Weight Configuration
│   │   ├── Page3Inference.jsx     # Risk Score & Feature Importance Analytics
│   │   ├── LoginPage.jsx          # User Authentication Page
│   │   ├── Navbar.jsx             # Main Navigation Header
│   │   ├── TopNavbar.jsx          # Top Utility Bar
│   │   └── DataDetailModal.jsx    # Schema & Sample Data Inspector Modal
│   ├── data/              # Mock data sources & metrics definitions
│   │   ├── dataSources.js
│   │   └── mockData.js
│   ├── App.jsx            # Core Root Component & State Routing
│   ├── main.jsx           # React DOM Entry Point
│   └── index.css          # Global Tailwind CSS Styles
├── package.json
├── vite.config.js
└── README.md
```

---

## 🔒 Security & Underwriting Compliance

This portal is designed adhering to Satin Finserv Limited enterprise security standards, featuring role-based access scoping, encrypted data handling, and automated rule evaluation logs.
