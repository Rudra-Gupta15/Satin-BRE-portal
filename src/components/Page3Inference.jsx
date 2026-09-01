import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, RefreshCw, Code, Table,
  Check, Loader2, Play, UserCheck, Building2, CheckCircle, AlertTriangle, Copy
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../api/client';
import Select from './Select';

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

const inr = (n) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const inrShort = (n) => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(0)}k`;
  return `₹${Math.round(n)}`;
};

const GST_SHORT_NAME = {
  gst_underwriting_score_model: 'GST Score',
  gst_risk_flag_model: 'GST Risk',
  gst_loan_eligibility_model: 'GST Loan',
  gst_filing_compliance_model: 'GST Filing',
};

const GST_HEAD_DESC = {
  gst_underwriting_score_model: 'A Gradient-Boosting regressor that scores overall GST creditworthiness 0–100 from filing behaviour, turnover trend, ITC ratios and buyer concentration.',
  gst_risk_flag_model: 'A Gradient-Boosting classifier that assigns a LOW / MEDIUM / HIGH GST risk band from the same filing, turnover and ITC signals.',
  gst_loan_eligibility_model: 'A Gradient-Boosting regressor that estimates the maximum loan a business qualifies for under the GST turnover rule, from its filed turnover, ITC and vintage.',
  gst_filing_compliance_model: 'A Gradient-Boosting regressor that predicts the on-time filing rate from filing delays, missed / late returns and turnover trend.',
};

// Headline metric (big number + badge) for the currently-focused GST head.
function gstHeadline(modelId, heads, mode) {
  const s = heads.gst_underwriting_score_model?.value;
  const flag = heads.gst_risk_flag_model?.label;
  const loan = heads.gst_loan_eligibility_model?.value;
  const fil = heads.gst_filing_compliance_model?.value;
  const flagBadge = { text: flag || '—', tone: flag || 'MEDIUM' };
  const scoreBadge = {
    text: s == null ? '—' : s >= 75 ? 'Strong' : s >= 55 ? 'Adequate (Review)' : 'Weak',
    tone: s == null ? 'MEDIUM' : s >= 75 ? 'LOW' : s >= 55 ? 'MEDIUM' : 'HIGH',
  };
  switch (modelId) {
    case 'gst_risk_flag_model':
      return { big: flag || '—', unit: 'GST risk band', badge: flagBadge,
        line: `Underwriting score ${s?.toFixed?.(1) ?? '—'} / 100` };
    case 'gst_loan_eligibility_model':
      return { big: inrShort(loan), unit: 'max eligible loan (GST turnover rule)', badge: scoreBadge,
        line: `${inr(loan)} · score ${s?.toFixed?.(1) ?? '—'}` };
    case 'gst_filing_compliance_model':
      return { big: fil == null ? '—' : `${fil.toFixed(1)}%`, unit: 'predicted on-time filing rate', badge: scoreBadge,
        line: `Filing regularity ${fil?.toFixed?.(1) ?? '—'}% · risk ${flag || '—'}` };
    default:
      return { big: s == null ? '—' : s.toFixed(1), unit: 'GST underwriting score / 100', badge: scoreBadge,
        line: `Risk ${flag || '—'} · loan ${inrShort(loan)} · filing ${fil?.toFixed?.(0) ?? '—'}% · ${mode === 'returns' ? 'from GST returns' : 'from GST summary'}` };
  }
}

const BADGE_TONE = {
  LOW: 'bg-emerald-600 text-white', MEDIUM: 'bg-amber-500 text-white', HIGH: 'bg-rose-600 text-white',
};

function fmtMetric(m) {
  if (m.kind === 'text') return m.value;
  if (m.kind === 'money') return inrShort(m.value);
  if (m.kind === 'pct') return `${m.value.toFixed(1)}%`;
  return Number.isInteger(m.value) ? String(m.value) : m.value.toFixed(1);
}
function metricAssessment(m) {
  const v = m.value;
  if (m.label === 'Filing Regularity') return v >= 90 ? 'good' : v >= 75 ? 'ok' : 'watch';
  if (m.label.includes('Growth YoY') || m.label.includes('Growth QoQ')) return v >= 0 ? 'good' : v >= -10 ? 'ok' : 'watch';
  if (m.label === 'Missed Returns' || m.label === 'Late Returns') return v === 0 ? 'good' : v <= 2 ? 'ok' : 'watch';
  if (m.label === 'Top Buyer Share') return v <= 30 ? 'good' : v <= 50 ? 'ok' : 'watch';
  if (m.label === 'GST Status') return String(v).toUpperCase() === 'ACTIVE' ? 'good' : 'watch';
  if (m.label === 'Buyer Concentration') return v === 'LOW' ? 'good' : v === 'MEDIUM' ? 'ok' : 'watch';
  return null;
}
const ASSESS_STYLE = {
  good: 'bg-emerald-100 border-emerald-200 text-emerald-800',
  ok: 'bg-amber-100 border-amber-200 text-amber-900',
  watch: 'bg-rose-100 border-rose-200 text-rose-800',
};

const GST_SUB_TABS = [
  { id: 'output', label: 'Model Output' },
  { id: 'metrics', label: 'GST Metrics' },
  { id: 'factors', label: 'Top Factors' },
  { id: 'rules', label: 'Rule Result' },
  { id: 'bre', label: 'BRE payload' },
];
const GST_DECISION_STYLE = {
  'APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'APPROVED WITH NOTES': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'CONDITIONAL APPROVAL': 'bg-amber-100 text-amber-900 border-amber-200',
  'REJECTED': 'bg-rose-100 text-rose-800 border-rose-200',
};
const RULE_PILL = (s) => s === 'PASS'
  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
  : s === 'FAIL' ? 'bg-rose-100 text-rose-800 border-rose-200'
  : 'bg-slate-100 text-slate-500 border-slate-200';

// Rule-evaluation list, paginated.
function PaginatedRuleList({ results }) {
  const PER = 5;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [results]);
  const pageCount = Math.max(1, Math.ceil(results.length / PER));
  const p = Math.min(page, pageCount);
  const from = (p - 1) * PER;
  const slice = results.slice(from, from + PER);
  const navBtn = 'px-2.5 py-1 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="space-y-2">
      <div className="border border-slate-200 rounded-xl divide-y divide-purple-100 overflow-hidden">
        {slice.map((r, i) => (
          <div key={r.id + i} className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50/30">
            <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md border text-[9px] font-extrabold font-mono ${RULE_PILL(r.status)}`}>
              {r.status === 'SKIP' ? 'N/A' : r.status}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800">
                {r.label}
                {r.serious && <span className="ml-1.5 text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-200 rounded px-1">KEY</span>}
              </div>
              <div className="text-[11px] text-slate-600">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
      {results.length > PER && (
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Showing {from + 1}–{Math.min(from + PER, results.length)} of {results.length} rules</span>
          <div className="flex items-center gap-1">
            <button type="button" className={navBtn} disabled={p <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>Prev</button>
            <span className="px-2 text-slate-600">Page {p} / {pageCount}</span>
            <button type="button" className={navBtn} disabled={p >= pageCount} onClick={() => setPage((x) => Math.min(pageCount, x + 1))}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// GST result — matches the bank-statement layout: tab bar, headline card,
// turnover chart, metrics table, per-head cards, top factors, BRE payload.
function GstTestResults({
  bundle, isLoading, activeModelId, modelName, version, fileName, customId, onReprocess,
  headModels = [], onSelectModel, tab = 'output', onSelectTab, bre, breLoading,
  copiedPayload, onCopyPayload,
}) {
  if (isLoading && !bundle) {
    return (
      <div className="py-16 flex items-center justify-center text-purple-700 text-xs font-bold gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Scoring GST profile…
      </div>
    );
  }
  if (!bundle) return null;
  if (!bundle.available) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
        {bundle.message || 'Upload a GST file on this page to score it.'}
      </div>
    );
  }

  const heads = bundle.headSummary || {};
  const label = (customId || '').trim() || cleanStatementLabel(fileName) || 'GST Profile';
  const returnsSeen = Object.entries(bundle.returnsSeen || {}).filter(([, v]) => v);
  const detail = bundle.detail || [];
  const primary = detail[0] || {};
  const series = (primary.series || []).map((p) => ({ ...p, turnover: Number(p.turnover) || 0 }));
  const metrics = primary.metrics || [];
  const head = gstHeadline(activeModelId, heads, bundle.mode);
  const multi = detail.length > 1 || (bundle.predictions?.length || 0) > 1;

  return (
    <div className="space-y-5">
      {/* Statement-style header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <h2 className="text-xl font-extrabold text-slate-800">GST Profile — {label}</h2>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-extrabold font-mono text-purple-900">
            {isLoading ? 'SCORING' : 'SCORED'}
          </span>
          <span className="px-2.5 py-0.5 rounded-md border bg-emerald-100 border-emerald-200 text-emerald-800 text-[10px] font-extrabold font-mono">
            YOUR UPLOADED DATA
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {bundle.businesses} business{bundle.businesses === 1 ? '' : 'es'} · {bundle.mode === 'returns' ? 'GST returns' : 'GST summary'}
            {returnsSeen.length > 0 && ` · ${returnsSeen.map(([k, v]) => `${k} ×${v}`).join(' ')}`}
          </span>
        </div>
        {onReprocess && (
          <button
            type="button"
            onClick={onReprocess}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            Reprocess process
          </button>
        )}
      </div>

      {/* Tab bar — the 4 GST models + sub-views (mirrors the bank tabs) */}
      <div className="border-b border-slate-200 flex space-x-5 overflow-x-auto">
        {headModels.map((m) => {
          const isActive = tab === 'output' && activeModelId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSelectModel?.(m.id); onSelectTab?.('output'); }}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                isActive ? 'text-slate-800' : 'text-slate-500 hover:text-purple-800'
              }`}
            >
              {m.name} {m.version && <span className="text-[10px] font-mono text-slate-400">{m.version}</span>}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b0764] rounded-full" />}
            </button>
          );
        })}
        <span className="w-px bg-slate-200 my-1 shrink-0" aria-hidden />
        {GST_SUB_TABS.filter((t) => t.id !== 'output').map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab?.(t.id)}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                isActive ? 'text-slate-800' : 'text-slate-500 hover:text-purple-800'
              }`}
            >
              {t.label}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b0764] rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* ─────────── RULE RESULT TAB ─────────── */}
      {tab === 'rules' && (
        <div className="space-y-4 animate-fadeIn">
          {breLoading && (
            <div className="py-10 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /> Evaluating GST BRE rules…
            </div>
          )}

          {!breLoading && bre && bre.available === false && (
            <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50 text-amber-900 text-xs font-semibold">
              {bre.message}
            </div>
          )}

          {!breLoading && bre?.evaluation && (
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">
                    GST BRE Rule Evaluation
                  </span>
                  <h2 className="text-lg font-bold text-slate-800">Underwriting Decision</h2>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    GST underwriting score {bre.evaluation.creditScore} · gate ≥ {bre.evaluation.gateThreshold}
                    {bre.businessCount > 1 && ` · business #1 of ${bre.businessCount}`}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-xl border text-sm font-extrabold ${GST_DECISION_STYLE[bre.evaluation.decision] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {bre.evaluation.decision}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['PASSED', bre.evaluation.passed, 'text-emerald-700'],
                  ['FAILED', bre.evaluation.failed, 'text-rose-700'],
                  ['NOT EVALUATED', bre.evaluation.skipped, 'text-slate-400'],
                  ['RULES ENABLED', bre.evaluation.enabledCount, 'text-slate-800'],
                ].map(([lbl, val, color]) => (
                  <div key={lbl} className="p-3 rounded-xl bg-slate-50/60 border border-slate-200">
                    <div className="text-[9px] font-mono font-bold text-slate-400 uppercase">{lbl}</div>
                    <div className={`text-xl font-extrabold font-mono ${color}`}>{val}</div>
                  </div>
                ))}
              </div>

              {bre.evaluation.seriousFlags?.length > 0 && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5">
                  <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Serious flags driving the decision
                  </div>
                  <div className="text-xs text-rose-800 font-medium">{bre.evaluation.seriousFlags.join(' · ')}</div>
                </div>
              )}

              <PaginatedRuleList results={bre.evaluation.results} />
            </div>
          )}
        </div>
      )}

      {/* ─────────── BRE PAYLOAD TAB (raw JSON) ─────────── */}
      {tab === 'bre' && (
        <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-700" /> BRE Output Payload (JSON)
            </h2>
            <button
              type="button"
              onClick={() => onCopyPayload?.(bre?.payload)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedPayload ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              {copiedPayload ? <><Check className="w-3.5 h-3.5" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy JSON</>}
            </button>
          </div>
          <pre className="bg-slate-50/40 p-5 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto border border-slate-200 shadow-xs font-bold leading-relaxed">
            {bre?.payload ? JSON.stringify(bre.payload, null, 2) : (breLoading ? 'Evaluating…' : 'No payload yet.')}
          </pre>
        </div>
      )}

      {/* ─────────── TOP FACTORS TAB ─────────── */}
      {tab === 'factors' && (
        <div className="space-y-3 animate-fadeIn">
          <p className="text-[11px] text-slate-500">
            Per model — the inputs each GST head weights most, ranked by importance × distance from the training-corpus
            average (σ). {multi ? 'Business #1 of the file.' : ''}
          </p>
          {[
            'gst_underwriting_score_model', 'gst_risk_flag_model',
            'gst_loan_eligibility_model', 'gst_filing_compliance_model',
          ].filter((id) => heads[id]).map((id) => {
            const hf = primary.prediction?.headScores?.[id]?.topFactors || [];
            return (
              <div key={id} className={`border rounded-2xl p-4 bg-white shadow-sm space-y-2.5 ${id === activeModelId ? 'border-[#ea580c] ring-1 ring-orange-200' : 'border-slate-200'}`}>
                <h3 className="text-xs font-bold text-slate-800">{heads[id].name}</h3>
                {hf.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {hf.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono bg-slate-50/60 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-slate-700 truncate">{f.feature}</span>
                        <span className={`font-bold shrink-0 ${f.zScore >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {f.zScore >= 0 ? '+' : ''}{f.zScore}σ
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No standout factors for this profile.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────── GST METRICS TAB ─────────── */}
      {tab === 'metrics' && (
        <div className="space-y-4 animate-fadeIn">
          {metrics.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-purple-700" /> GST Underwriting Metrics {multi ? '(business #1)' : ''}
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Metric</th>
                      <th className="py-2.5 px-3 text-right">Value</th>
                      <th className="py-2.5 px-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100 bg-white">
                    {metrics.map((m, i) => {
                      const a = metricAssessment(m);
                      return (
                        <tr key={i} className="hover:bg-slate-50/30 text-slate-800">
                          <td className="py-2 px-3 font-bold text-slate-800">{m.label}</td>
                          <td className="py-2 px-3 text-right font-extrabold text-slate-900">{fmtMetric(m)}</td>
                          <td className="py-2 px-3">
                            {a && (
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${ASSESS_STYLE[a]}`}>
                                {a === 'good' ? 'Healthy' : a === 'ok' ? 'Watch' : 'Concern'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {multi && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-700" /> Per-business results ({bundle.predictions?.length || detail.length})
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Risk</th>
                      <th className="py-2.5 px-3 text-right">Loan Eligibility</th>
                      <th className="py-2.5 px-3 text-right">Filing %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(bundle.predictions || []).map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 text-slate-800">
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-bold">{p.underwritingScore?.toFixed?.(1) ?? p.underwritingScore}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${BADGE_TONE[p.riskFlag] || 'bg-slate-100 text-slate-700'}`}>
                            {p.riskFlag}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">{inrShort(p.headScores?.gst_loan_eligibility_model?.value)}</td>
                        <td className="py-2 px-3 text-right">
                          {p.headScores?.gst_filing_compliance_model?.value != null
                            ? `${p.headScores.gst_filing_compliance_model.value.toFixed(1)}%` : '—'}
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

      {/* ─────────── MODEL OUTPUT TAB ─────────── */}
      {tab === 'output' && (<>
      {(() => {
        const hm = heads[activeModelId] || {};
        const desc = hm.desc || GST_HEAD_DESC[activeModelId];
        const hf = primary.prediction?.headScores?.[activeModelId]?.topFactors || [];
        return (
      <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-5 shadow-sm animate-fadeIn">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3 gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-purple-600 font-bold block">MODEL OUTPUT RESULT</span>
            <h2 className="text-lg font-bold text-slate-800">{modelName || 'GST Underwriting'} Output</h2>
            {desc && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed max-w-xl">{desc}</p>}
          </div>
          <div className="text-right shrink-0">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono inline-block shadow-sm ${BADGE_TONE[head.badge.tone] || BADGE_TONE.MEDIUM}`}>
              {head.badge.text}
            </span>
            <div className="text-xs font-mono font-bold text-purple-900 mt-1">{head.line}</div>
          </div>
        </div>

        {/* big headline number */}
        <div className="flex items-end gap-3">
          <div className="text-4xl font-extrabold text-slate-900 font-mono leading-none">{head.big}</div>
          <div className="text-[11px] text-slate-400 pb-1">{head.unit}</div>
          <div className="ml-auto text-[11px] font-mono text-slate-500 text-right">
            {(hm.algorithm ? hm.algorithm.replace('_', ' ') : 'gradient boosting').toUpperCase()}
            {hm.metricLine && <> · {hm.metricLine}</>}
          </div>
        </div>

        {/* what moved this specific result — per-head drivers */}
        {hf.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              What moved this result {multi ? '· business #1' : ''} — the inputs {modelName?.replace(' Model', '')} weights most, furthest from the corpus average
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {hf.slice(0, 6).map((f, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-slate-600 truncate">{f.feature}</span>
                  <span className={`font-bold shrink-0 ${f.zScore >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {f.zScore >= 0 ? '+' : ''}{f.zScore}σ
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* turnover chart */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 mb-3">
            {bundle.mode === 'returns'
              ? 'Filed Taxable Turnover — month by month'
              : 'Estimated Turnover Trajectory (12 months)'}
          </h3>
          {series.length > 1 ? (
            <div className="h-64 w-full bg-slate-50/40 border border-slate-200 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                  <XAxis dataKey="period" stroke="#3b0764" tick={{ fontSize: 10 }} />
                  <YAxis
                    stroke="#3b0764"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => inrShort(v)}
                    width={64}
                  />
                  <Tooltip
                    formatter={(v) => [inr(v), 'Turnover']}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d8cefa', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="turnover" stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.22} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 bg-slate-50/40 border border-slate-200 rounded-xl">
              Not enough periods in this file to plot a turnover trend.
            </div>
          )}
        </div>

      </div>
        );
      })()}
      </>)}
    </div>
  );
}

export default function Page3Inference({
  selectedIds = [],
  trainedModels = [],
  selectedVersionMap = {},
  deployedStatusMap = {},
  onReprocessPipeline
}) {
  const allModels = [
    { id: "risk_model", name: "Risk Model" },
    { id: "cashflow_model", name: "Cashflow Model" },
    { id: "fraud_model", name: "Fraud Model" },
    { id: "money_balance_model", name: "Money Balance Model" }
  ];

  const modelsList = trainedModels && trainedModels.length > 0 ? trainedModels : allModels;

  const [allSources, setAllSources] = useState([]);
  const [gstReg, setGstReg] = useState(null);      // GST registry: { versions, active, deployed, heads }
  const [gstBundle, setGstBundle] = useState(null); // GST score-testing result

  // Deployed GST heads (from the GST registry) sit alongside the deployed bank models.
  const gstDeployedModels = (gstReg?.versions?.length ? gstReg.heads || [] : [])
    .filter(h => gstReg?.deployed?.[h.id] ?? true)
    .map(h => ({ id: h.id, name: h.name, kind: 'gst' }));
  const deployedModels = [
    ...modelsList.filter(m => m.kind !== 'gst' && deployedStatusMap[m.id] === "Deployed"),
    ...gstDeployedModels,
  ];
  // The model list is scoped to the selected input data source AND to what is
  // currently deployed. All four bank models ship deployed, so a fresh session
  // shows all four; Revoking one in the Model Hub registry drops it from here.
  const modelsForSource = (srcId) =>
    deployedModels.filter(m => (srcId === 'gst_data' ? m.kind === 'gst' : m.kind !== 'gst'));
  // Multi-select: which deployed models are in scope (default = all of them).
  const [selectedModelIds, setSelectedModelIds] = useState(null); // null until deployedModels known
  // Which one's results are currently shown.
  const [selectedModelId, setSelectedModelId] = useState(deployedModels[0]?.id || "risk_model");
  const [inputFileName, setInputFileName] = useState("");
  const [selectedInputSourceId, setSelectedInputSourceId] = useState(selectedIds?.[0] || "account_aggregator");

  const [customId, setCustomId] = useState("");
  const [customBankName, setCustomBankName] = useState("");

  const [activeTab, setActiveTab] = useState('analytics');
  const [gstTab, setGstTab] = useState('output');       // GST result sub-tab
  const [gstBre, setGstBre] = useState(null);           // GST BRE eval result
  const [gstBreLoading, setGstBreLoading] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [recomputing, setRecomputing] = useState(false);
  const [breRun, setBreRun] = useState(null);
  const [breLoading, setBreLoading] = useState(false);
  const [uploadingInput, setUploadingInput] = useState(false);
  const [inputUploadInfo, setInputUploadInfo] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  // Results only appear after an actual test is run ON THIS PAGE (upload a file
  // here, or press Run Analysis once a file is uploaded).
  const [hasTested, setHasTested] = useState(false);
  const [history, setHistory] = useState([]);
  // When set, we're viewing a SAVED result from the history (read-only) rather
  // than a live run.
  const [viewingHistory, setViewingHistory] = useState(null); // { id, label } | null

  const loadHistory = () =>
    api.get('/inference/history').then((d) => setHistory(d.history || [])).catch(() => {});

  const openHistoryEntry = async (row) => {
    try {
      const saved = await api.get(`/inference/history/${row.rowId}`);
      sourceInitRef.current = true; // don't let the source-change effect wipe this
      if (saved && saved._kind === 'gst') {
        setSelectedInputSourceId('gst_data');
        setSelectedModelId('gst_underwriting_score_model');
        setGstBundle(saved);
        setGstTab('output');
        setBundle(null);
      } else {
        setBundle(saved);
        setGstBundle(null);
      }
      setHasTested(true);
      setViewingHistory({ id: row.rowId, label: row.id });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const exitHistoryView = () => {
    setViewingHistory(null);
    setHasTested(false);
    setBundle(null);
    setGstBundle(null);
    setLoadError('');
    loadHistory();
  };

  useEffect(() => {
    api.get('/data-sources').then((data) => setAllSources(data.dataSources));
    api.get('/gst/model/registry').then(setGstReg).catch(() => {});
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSources = allSources.filter(s => selectedIds.includes(s.id));

  // Input data sources the tester can pick from — the ones chosen on the Data
  // Sources page, plus GST if any GST head is deployed.
  const sourceOptions = (() => {
    const base = selectedSources.length > 0
      ? selectedSources.map(s => ({ value: s.id, label: s.title }))
      : [{ value: 'account_aggregator', label: 'Account Aggregator (AA) — Bank Statement' }];
    if (gstDeployedModels.length && !base.some(o => o.value === 'gst_data')) {
      base.push({ value: 'gst_data', label: 'GST Data — GSTR-1 / 3B / 2A / 2B' });
    }
    return base;
  })();

  // Models available for the currently-selected input source.
  const sourceModels = modelsForSource(selectedInputSourceId);

  // `selectedModelIds` stays null until the user first toggles — a null set
  // means "all models for this source". Anything not in this source is dropped.
  const chosenModelIds = (() => {
    const raw = selectedModelIds ?? sourceModels.map(m => m.id);
    const f = raw.filter(id => sourceModels.some(m => m.id === id));
    return f.length ? f : sourceModels.map(m => m.id);
  })();
  const isModelChosen = (id) => chosenModelIds.includes(id);
  const toggleModelChosen = (id) => {
    setSelectedModelIds((prev) => {
      const base = (prev ?? sourceModels.map(m => m.id)).filter(x => sourceModels.some(m => m.id === x));
      if (base.includes(id)) {
        if (base.length === 1) return base;            // keep at least one
        const next = base.filter(x => x !== id);
        if (id === selectedModelId) setSelectedModelId(next[0]); // move the view
        return next;
      }
      return [...base, id];
    });
  };

  // The model whose results are shown: the focused one if it's still chosen,
  // else the first chosen, else the first for this source.
  const activeModelId =
    (isModelChosen(selectedModelId) && sourceModels.some(m => m.id === selectedModelId) && selectedModelId) ||
    chosenModelIds.find(id => sourceModels.some(m => m.id === id)) ||
    sourceModels[0]?.id ||
    "risk_model";

  const activeModelObj = deployedModels.find(m => m.id === activeModelId)
    || modelsList.find(m => m.id === activeModelId)
    || { name: "Risk Model" };
  const isGstActive = activeModelObj?.kind === 'gst';
  const activeVersion = isGstActive
    ? (gstReg?.active ? `v${gstReg.active}` : '')
    : (selectedVersionMap[activeModelId] || "v3.4");

  // `record` = deliberate run (upload / Run Analysis). On those, we log a history
  // row for EVERY selected model (not just the one shown) so all scanned models
  // appear in Test History.
  const runInference = async (modelId, id, bank, sourceId, record = false) => {
    setIsLoading(true);
    setLoadError('');
    const customId = (id || '').trim() || 'applicant';

    // GST heads share one scoring call against the GST file uploaded on this page.
    if (deployedModels.find(m => m.id === modelId)?.kind === 'gst') {
      try {
        const g = await api.get('/gst/score-testing');
        setGstBundle(g);
        setGstBre(null);
        setBundle(null);
        setHasTested(true);
        setViewingHistory(null);
        if (!g.available) setLoadError(g.message || 'No GST file uploaded on this page yet.');
        else if (record) {
          api.post('/gst/record-test', { customId, fileName: inputFileName }).then(loadHistory).catch(() => {});
        }
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const data = await api.post('/inference/run', {
        modelId, customId, bankName: bank, sourceId, record,
      });
      setBundle(data);
      setHasTested(true);
      setViewingHistory(null);

      if (record) {
        // background-record the other selected models, then refresh the list
        const gstIds = new Set(gstDeployedModels.map((g) => g.id));
        const others = chosenModelIds.filter((m) => m !== modelId && !gstIds.has(m));
        await Promise.allSettled(
          others.map((m) =>
            api.post('/inference/run', { modelId: m, customId, bankName: bank, sourceId, record: true }),
          ),
        );
        loadHistory();
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Switching the input source resets the model list AND clears the previous
  // result — a new source needs its own upload, never the last file's output.
  const sourceInitRef = useRef(true);
  useEffect(() => {
    setSelectedModelIds(null);
    setSelectedModelId(modelsForSource(selectedInputSourceId)[0]?.id || 'risk_model');
    if (sourceInitRef.current) { sourceInitRef.current = false; return; }
    setHasTested(false);
    setBundle(null);
    setGstBundle(null);
    setGstBre(null);
    setBreRun(null);
    setInputFileName('');
    setInputUploadInfo('');
    setLoadError('');
    setGstTab('output');
    setActiveTab('analytics');
  }, [selectedInputSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evaluate the GST BRE rules when the "Rule Result" / "BRE payload" tab opens.
  useEffect(() => {
    if ((gstTab !== 'rules' && gstTab !== 'bre') || !gstBundle?.available || gstBre || gstBreLoading) return;
    setGstBreLoading(true);
    api.post('/gst/bre-evaluate')
      .then(setGstBre)
      .catch((err) => setGstBre({ available: false, message: err.message }))
      .finally(() => setGstBreLoading(false));
  }, [gstTab, gstBundle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run when the focused model changes — but only once a test has actually
  // been run on this page (never on first load, never while viewing history).
  // Source changes do NOT re-run: they clear and wait for a fresh upload.
  useEffect(() => {
    if (hasTested && !viewingHistory) runInference(activeModelId, customId, customBankName, selectedInputSourceId);
  }, [activeModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce customId/bankName edits — again, only after the first real run.
  useEffect(() => {
    if (!hasTested || viewingHistory) return;
    const t = setTimeout(() => {
      runInference(activeModelId, customId, customBankName, selectedInputSourceId);
    }, 600);
    return () => clearTimeout(t);
  }, [customId, customBankName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecomputeRiskScore = () => {
    setRecomputing(true);
    runInference(activeModelId, customId, customBankName, selectedInputSourceId).finally(() => setRecomputing(false));
  };


  // Real upload for Model Testing ONLY — scope:'testing' keeps it in a slot
  // completely separate from Model Hub's uploads / pipeline.
  const handleInputUpload = async (file) => {
    setUploadingInput(true);
    setInputUploadInfo('');
    setLoadError('');
    try {
      const form = new FormData();
      form.append('sourceId', selectedInputSourceId);
      form.append('file', file);
      form.append('scope', 'testing');
      const data = await api.postForm('/pipeline/uploads', form);
      setInputFileName(file.name);

      // GST file → the GST subsystem parsed & scored it; go straight to GST results.
      const gst = data?.statement?.gst || data?.uploadedFiles?.gst_data?.[0]?.gst;
      if (selectedInputSourceId === 'gst_data' || gst) {
        const nb = gst?.businesses ?? gst?.records ?? 0;
        setInputUploadInfo(nb ? `${nb} GST business${nb === 1 ? '' : 'es'} scored` : 'GST file parsed');
        let gstModelId = activeModelObj?.kind === 'gst' ? activeModelId : gstDeployedModels[0]?.id;
        if (gstModelId && gstModelId !== activeModelId) { setSelectedModelId(gstModelId); }
        await runInference(gstModelId || activeModelId, customId, customBankName, 'gst_data', true);
        return;
      }

      const sum = data?.statement?.summary || {};
      const n = sum.transactionCount ?? (data?.statement?.transactions?.length ?? 0);
      const bank = sum.bankName;
      if (bank) setCustomBankName((prev) => prev || bank);
      setInputUploadInfo(n > 0
        ? `${n} transactions parsed${sum.accountHolder ? ` · ${sum.accountHolder}` : ''}`
        : 'No transactions could be read from this file — the result below is simulated');
      // Always score, even on a weak parse — otherwise the results panel is left
      // blank / showing a stale bundle until the model is switched.
      await runInference(activeModelId, customId, customBankName || bank || '', selectedInputSourceId, true);
    } catch (err) {
      setLoadError(err.message);
      setInputUploadInfo('');
    } finally {
      setUploadingInput(false);
    }
  };

  // Evaluates the *active loan product's* enabled BRE rules (chosen in the BRE
  // Rule Training modal on Data Sources) against the uploaded statement.
  const handleRunBreRules = async () => {
    setBreLoading(true);
    setBreRun(null);
    try {
      const data = await api.post('/bre-products/evaluate', { sourceId: selectedInputSourceId });
      setBreRun(data);
    } catch (err) {
      setBreRun({ available: false, message: err.message });
    } finally {
      setBreLoading(false);
    }
  };

  // BRE rules run automatically whenever the analysis changes — result shown
  // directly, no button. Skipped for a read-only history view (no live statement).
  useEffect(() => {
    setBreRun(null);
    if (bundle && !viewingHistory) handleRunBreRules();
  }, [bundle]); // eslint-disable-line react-hooks/exhaustive-deps

  const transactionsList = bundle?.transactions || [];
  const anomaliesList = bundle?.anomalies || [];
  const analytics = bundle?.analytics;
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
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-800">
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

      {/* 1. TOP CONTROLS: 35% model list (left) | 65% column with Upload over App-ID (right) */}
      <div className="flex flex-col md:flex-row gap-3.5 items-stretch">

        {/* Card 1: Select Models — 35% */}
        <div className="w-full md:w-[35%] shrink-0 border border-slate-200 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              1. Select Models:
            </label>
            {sourceOptions.length > 1 && (
              <div className="mb-2">
                <Select
                  value={selectedInputSourceId}
                  onChange={setSelectedInputSourceId}
                  options={sourceOptions}
                  buttonClassName="w-full flex items-center justify-between gap-2 bg-purple-50/50 border border-purple-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-purple-900 cursor-pointer hover:border-purple-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">Models shown match this data source.</p>
              </div>
            )}
            {sourceModels.length > 0 ? (
              <div className="space-y-1.5">
                {sourceModels.map((m) => {
                  const ver = m.kind === 'gst'
                    ? (gstReg?.active ? `v${gstReg.active}` : '')
                    : (selectedVersionMap[m.id] || "v3.4");
                  const chosen = isModelChosen(m.id);
                  const focused = activeModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => { toggleModelChosen(m.id); if (!chosen) setSelectedModelId(m.id); }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors cursor-pointer ${
                        focused
                          ? 'border-[#ea580c] bg-orange-50/60'
                          : chosen
                            ? 'border-slate-200 bg-white hover:bg-slate-50'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 opacity-60'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        chosen ? 'bg-[#ea580c] border-[#ea580c] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {chosen && <Check className="w-3 h-3 stroke-3" />}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (!chosen) toggleModelChosen(m.id); setSelectedModelId(m.id); }}
                        className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left"
                        title="View this model's results"
                      >
                        <span className="text-xs font-semibold text-slate-800 truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{ver}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-purple-800 font-semibold">
                {deployedModels.length === 0
                  ? 'No models deployed'
                  : `No ${selectedInputSourceId === 'gst_data' ? 'GST' : 'bank-statement'} model deployed for this source`}
              </div>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate mt-1">
            <strong className="text-slate-800">{chosenModelIds.length}</strong> of {sourceModels.length} selected
          </span>
        </div>

        {/* Right column — 65%, Upload over App-ID */}
        <div className="w-full md:w-[65%] flex flex-col gap-3.5">

        {/* Card 2: Upload Input Data */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between md:flex-1">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              2. Upload Input Data:
            </label>
            <div className="flex items-center space-x-1.5">
              <div className="flex-1 min-w-0">
                <Select
                  value={selectedInputSourceId}
                  onChange={setSelectedInputSourceId}
                  options={sourceOptions}
                  buttonClassName="w-full flex items-center justify-between gap-2 bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 cursor-pointer hover:border-slate-300"
                />
              </div>

              <label
                className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold shrink-0 flex items-center space-x-1 shadow-md shadow-orange-900/15 ${
                  uploadingInput ? 'bg-slate-400 cursor-not-allowed' : 'btn-orange cursor-pointer'
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
              ? <>File: <strong className="text-slate-800">{inputFileName}</strong></>
              : 'No file uploaded yet'}
            {inputUploadInfo && <span className="text-emerald-700"> · {inputUploadInfo}</span>}
          </span>
        </div>

        {/* Card 3: Application ID & Bank Name */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2 shadow-sm flex flex-col justify-between md:flex-1">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
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
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ea580c]"
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
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono mt-1">
            {isLoading ? 'Analyzing...' : 'Bank Name is optional'}
          </span>
        </div>

        </div>
      </div>

      {/* Run Analysis Button */}
      <div className="flex items-center justify-end gap-3">
        {!inputFileName && (
          <span className="text-[11px] text-slate-400 font-medium">
            Upload a statement above to test it
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (inputFileName) runInference(activeModelId, customId, customBankName, selectedInputSourceId, true);
          }}
          disabled={isLoading || !inputFileName}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
            isLoading || !inputFileName
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'btn-orange text-white shadow-orange-900/15 cursor-pointer'
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
              <span>{hasTested ? 'Re-run Analysis' : 'Run Analysis'}</span>
            </>
          )}
        </button>
      </div>

      {/* ── GST results — a GST head is the active model ── */}
      {hasTested && isGstActive && (
        <GstTestResults
          bundle={gstBundle}
          isLoading={isLoading}
          activeModelId={activeModelId}
          modelName={activeModelObj?.name}
          version={activeVersion}
          fileName={inputFileName}
          customId={customId}
          onReprocess={onReprocessPipeline}
          headModels={sourceModels.map((m) => ({
            id: m.id, name: GST_SHORT_NAME[m.id] || m.name,
            version: gstReg?.active ? `v${gstReg.active}` : '',
          }))}
          onSelectModel={(id) => { setSelectedModelId(id); setGstTab('output'); }}
          tab={gstTab}
          onSelectTab={setGstTab}
          bre={gstBre}
          breLoading={gstBreLoading}
          copiedPayload={copiedPayload}
          onCopyPayload={(payload) => {
            if (!payload) return;
            navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(
              () => { setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 1800); },
              () => {},
            );
          }}
        />
      )}

      {hasTested && !isGstActive && (
      <>
      {/* ── results ── */}

      {viewingHistory && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50/60 px-4 py-2.5">
          <span className="text-xs font-semibold text-purple-900">
            Viewing saved result — <strong>{viewingHistory.label}</strong>
          </span>
          <button
            type="button"
            onClick={exitHistoryView}
            className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
          >
            ← Back to history
          </button>
        </div>
      )}

      {/* Statement Header & Reprocess Button Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <h2 className="text-xl font-extrabold text-slate-800">
            {customId.trim()
              ? `Statement — ${customId.trim()}`
              : (bundle?.statementLabel || bundle?.accountHolder)
                ? `Statement — ${bundle.statementLabel || bundle.accountHolder}`
                : cleanStatementLabel(inputFileName)
                  ? `Statement — ${cleanStatementLabel(inputFileName)}`
                  : bundle?.dataSource === 'UPLOADED_STATEMENT'
                    ? 'Uploaded Statement'
                    : 'Statement Analysis'}
          </h2>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-extrabold font-mono text-purple-900">
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
            {(customBankName || bundle?.bankName) ? `${customBankName || bundle.bankName} · ` : ''}{transactionsList.length} transactions
          </span>
        </div>

        <button
          type="button"
          onClick={onReprocessPipeline}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          Reprocess process
        </button>
      </div>

      {/* Tabs Navigation Bar — selected models replace the old "Analytics" tab.
          Clicking a model shows that model's output; the remaining tabs are the
          other views of that model's result. */}
      <div className="border-b border-slate-200 flex space-x-5 overflow-x-auto">
        {(viewingHistory
          ? [{ id: bundle?.model?.id || activeModelId, name: bundle?.model?.name || 'Model', version: bundle?.model?.version }]
          : chosenModelIds.map((mid) => {
              const dm = deployedModels.find((x) => x.id === mid);
              const m = dm || modelsList.find((x) => x.id === mid) || { id: mid, name: mid };
              const version = dm?.kind === 'gst'
                ? (gstReg?.active ? `v${gstReg.active}` : '')
                : (selectedVersionMap[mid] || 'v3.4');
              return { id: mid, name: m.name, version };
            })
        ).map((m) => {
          const isActive = activeTab === 'analytics' && (viewingHistory || activeModelId === m.id);
          return (
            <button
              key={m.id}
              type="button"
              disabled={!!viewingHistory}
              onClick={() => { if (!viewingHistory) { setSelectedModelId(m.id); setActiveTab('analytics'); } }}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${
                viewingHistory ? 'cursor-default' : 'cursor-pointer'
              } ${isActive ? 'text-slate-800' : 'text-slate-500 hover:text-purple-800'}`}
            >
              {m.name} {m.version && <span className="text-[10px] font-mono text-slate-400">{m.version}</span>}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b0764] rounded-full" />
              )}
            </button>
          );
        })}

        <span className="w-px bg-slate-200 my-1 shrink-0" aria-hidden />

        {[
          { id: 'transactions', label: 'Transactions' },
          { id: 'risk_score', label: 'Credit Score' },
          { id: 'anomalies', label: 'Anomalies' },
          { id: 'rule_result', label: 'Rule Result' },
          { id: 'bre_payload', label: 'BRE payload' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap ${
                isActive ? 'text-slate-800' : 'text-slate-500 hover:text-purple-800'
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
        <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-800">
              Transactions ({transactionsList.length})
            </h2>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/70 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Narration</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 bg-white">
                {transactionsList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 text-slate-800 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-semibold">{row.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{row.narration}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                        row.type === 'CREDIT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-purple-900 border border-slate-200'
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
        <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-purple-600 font-bold block">MODEL OUTPUT RESULT</span>
              <h2 className="text-lg font-bold text-slate-800">
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

            <div className="h-64 w-full bg-slate-50/40 border border-slate-200 rounded-xl p-4">
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
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-purple-700" />
                {analytics.dataSource === 'UPLOADED_STATEMENT'
                  ? `Month-by-Month ${activeModelObj.name} Numerical Table (from your statement)`
                  : `1-Year (12 Months) Month-by-Month ${activeModelObj.name} Numerical Table`}
              </h3>
              <span className="text-[10px] font-mono text-purple-700 font-bold">
                {analytics.periodLabel || '12 Month Breakdown'}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50/80 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    {analytics.tableColumns.map((col, idx) => (
                      <th key={idx} className="py-2.5 px-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100 bg-white">
                  {analytics.tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors text-slate-800">
                      <td className="py-2 px-3 font-bold text-slate-800">{row.col1}</td>
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
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
              <span>Recompute score</span>
            </button>

            <span className="text-xs font-bold text-purple-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
              Active Model: {activeModelObj.name} ({activeVersion})
            </span>
          </div>

          {/* 4 Clean Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-3xl font-extrabold text-slate-800 font-mono block">{riskScore.score}</span>
              <span className="text-xs font-bold text-slate-700 block">Credit Score</span>
              <span className="text-[10px] text-emerald-800 font-semibold block">Range: 300 - 900 (Higher is Better)</span>
              {riskScore.scorecardScore != null && (
                <span className="text-[9px] text-slate-400 font-mono block pt-1 leading-tight">
                  scorecard {riskScore.scorecardScore}
                  {riskScore.mlBlended && riskScore.modelScore != null
                    ? ` · model ${riskScore.modelScore} → blended`
                    : ' (no model trained)'}
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
              <div>
                <span className={`px-3 py-1 rounded-lg border text-xs font-extrabold inline-block ${GRADE_BADGE_STYLE[riskScore.gradeRaw || riskScore.grade]}`}>
                  {(riskScore.gradeRaw || riskScore.grade)} RISK
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 block">Risk Grade (3-tier band)</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-3xl font-extrabold text-emerald-700 font-mono block">{riskScore.pd}%</span>
              <span className="text-xs font-bold text-slate-700 block">Probability of Default (PD)</span>
              <span className={`text-[10px] font-extrabold block ${riskScore.decision === 'REJECTED' ? 'text-rose-700' : 'text-emerald-800'}`}>
                Decision: {riskScore.decision}
                {riskScore.gateRule && ` (gate: score > ${riskScore.gateRule.threshold})`}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1 overflow-hidden">
              <span className="text-sm font-extrabold text-slate-800 block truncate">
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
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
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

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
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
        <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">
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
              <p className="text-sm font-bold text-slate-800">No anomalies detected</p>
              <p className="text-[11px] text-slate-500 max-w-md">
                No returns/bounces, no negative balance, and every transaction is within this account's normal range.
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/70 text-slate-800 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
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
                  <tr key={idx} className="hover:bg-slate-50/40 text-slate-800 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-semibold">{row.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{row.narration}</td>
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

      {/* TAB 6: BRE PAYLOAD */}
      {/* TAB: BRE PAYLOAD (raw JSON only) */}
      {activeTab === 'bre_payload' && brePayload && (
        <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-700" />
              BRE Output Payload (JSON)
            </h2>
            <button
              type="button"
              onClick={() => {
                const text = JSON.stringify(brePayload, null, 2);
                navigator.clipboard?.writeText(text).then(
                  () => { setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 1800); },
                  () => {},
                );
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedPayload
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}
            >
              {copiedPayload
                ? <><Check className="w-3.5 h-3.5" />Copied</>
                : <><Copy className="w-3.5 h-3.5" />Copy JSON</>}
            </button>
          </div>
          <pre className="bg-slate-50/40 p-5 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto border border-slate-200 shadow-xs font-bold leading-relaxed">
            {JSON.stringify(brePayload, null, 2)}
          </pre>
        </div>
      )}

      {/* TAB: RULE RESULT (BRE rule evaluation) */}
      {activeTab === 'rule_result' && (
        <div className="space-y-4 animate-fadeIn">
          {breLoading && (
            <div className="py-10 flex items-center justify-center gap-2 text-purple-700 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Evaluating BRE rules against this applicant's data…</span>
            </div>
          )}

          {!breLoading && breRun && breRun.available === false && (
            <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50 text-amber-900 text-xs font-semibold">
              {breRun.message}
            </div>
          )}

          {!breLoading && !breRun && (
            <div className="border border-slate-200 rounded-2xl p-5 bg-white text-slate-500 text-xs font-semibold">
              Run an analysis to see the BRE rule evaluation.
            </div>
          )}

          {breRun && breRun.available !== false && (() => {
            const DECISION_STYLE = {
              'APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
              'APPROVED WITH NOTES': 'bg-emerald-50 text-emerald-800 border-emerald-200',
              'CONDITIONAL APPROVAL': 'bg-amber-100 text-amber-900 border-amber-200',
              'REJECTED': 'bg-rose-100 text-rose-800 border-rose-200',
            };
            return (
              <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">
                      BRE Rule Evaluation{breRun.productName ? ` · ${breRun.productName}` : ''}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800">Underwriting Decision</h2>
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
                    ['RULES ENABLED', breRun.enabledCount, 'text-slate-800'],
                  ].map(([label, val, color]) => (
                    <div key={label} className="p-3 rounded-xl bg-slate-50/60 border border-slate-200">
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

                <PaginatedRuleList results={breRun.results} />
              </div>
            );
          })()}
        </div>
      )}
      </>
      )}
      </>
      )}

      {/* ── Test History — shown only when NOT doing a live test. Once a
             statement is uploaded & analysed this session (hasTested), the live
             results above take over and this hides. ── */}
      {!hasTested && (
        history.length > 0 ? (
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">Test History</h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {history.length} result{history.length === 1 ? '' : 's'} · click a row to reopen
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 text-slate-500 text-[10px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Src</th>
                    <th className="py-2 px-3">Applicant / ID</th>
                    <th className="py-2 px-3">Bank</th>
                    <th className="py-2 px-3">Model</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3 text-right">Score</th>
                    <th className="py-2 px-3">Grade</th>
                    <th className="py-2 px-3">Decision</th>
                    <th className="py-2 px-3">Txns</th>
                    <th className="py-2 px-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h, i) => {
                    const gradeKey = (h.grade || '').toUpperCase().includes('LOW') ? 'LOW'
                      : (h.grade || '').toUpperCase().includes('MED') ? 'MEDIUM'
                      : (h.grade || '').toUpperCase().includes('HIGH') ? 'HIGH' : null;
                    const mdls = h.models && h.models.length ? h.models
                      : [{ model: h.model || (modelsList.find((m) => m.id === h.modelId) || {}).name || h.modelId, version: h.version }];
                    const isGst = String(h.dataSource || '').startsWith('GST') || h.modelId === 'gst_models';
                    const live = h.dataSource === 'UPLOADED_STATEMENT' || isGst;
                    const modelText = mdls.length > 1
                      ? `${mdls.length} models · ${mdls.map((x) => x.model.replace(/ Model$/, '')).join(', ')}`
                      : `${mdls[0].model}${mdls[0].version ? ` ${mdls[0].version}` : ''}`;
                    return (
                      <tr
                        key={i}
                        onClick={() => h.rowId && openHistoryEntry(h)}
                        className={`hover:bg-purple-50/40 whitespace-nowrap ${h.rowId ? 'cursor-pointer' : ''}`}
                        title={h.rowId ? 'Open this application’s saved output' : ''}
                      >
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide ${
                            isGst ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {isGst ? 'GST' : 'AA'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 max-w-47.5 truncate underline decoration-slate-300 decoration-dotted underline-offset-2" title={h.id}>
                          {h.id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-27.5 truncate" title={h.bank}>{h.bank}</td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-65 truncate" title={modelText}>
                          {mdls.length > 1 && <span className="font-semibold text-slate-700">{mdls.length} models</span>}
                          {mdls.length > 1 ? ` · ${mdls.map((x) => x.model.replace(/ Model$/, '')).join(', ')}` : modelText}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                            live ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {live ? 'LIVE' : 'SAMPLE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{h.riskScore ?? '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${
                            gradeKey ? GRADE_BADGE_STYLE[gradeKey] : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {h.grade || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-32.5 truncate" title={h.decision || ''}>{h.decision || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{h.txCount ?? '—'}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {h.date ? new Date(h.date).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">
            No tests run yet — upload a statement above and analyse it to build the history.
          </div>
        )
      )}

    </div>
  );
}
