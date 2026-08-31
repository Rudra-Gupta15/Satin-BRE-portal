import { useEffect, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Activity, FileCheck2, GitBranch,
  Lock, RefreshCw, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { api } from '../api/client';

const SEV = {
  block: 'bg-rose-100 text-rose-700 border-rose-200',
  warn:  'bg-amber-100 text-amber-800 border-amber-200',
  info:  'bg-slate-100 text-slate-600 border-slate-200',
};
const BAND = {
  alert: 'text-rose-700', warn: 'text-amber-700', stable: 'text-emerald-700',
};
const BAND_PILL = {
  alert:  'bg-rose-100 text-rose-700 border-rose-200',
  warn:   'bg-amber-100 text-amber-800 border-amber-200',
  stable: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// small status pill
const Pill = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${className}`}>
    {children}
  </span>
);

const OkBad = ({ ok, okText, badText }) => (
  <Pill className={ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {ok ? okText : badText}
  </Pill>
);

const SectionCard = ({ icon: Icon, title, action, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-purple-50 text-purple-700">
          <Icon className="w-4 h-4" />
        </span>
        {title}
      </h2>
      {action}
    </div>
    <div className="p-5 space-y-3">{children}</div>
  </section>
);

const Table = ({ head, children }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-left text-[11px]">
      <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
        <tr>{head.map((h, i) => (
          <th key={i} className={`py-2.5 px-3 ${h.right ? 'text-right' : ''}`}>{h.label ?? h}</th>
        ))}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export default function SecurityDashboard() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [integrity, setIntegrity] = useState([]);
  const [drift, setDrift] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/security/overview').then(setOverview).catch(() => {});
    api.get('/security/events', { limit: 40 }).then((d) => setEvents(d.events || [])).catch(() => {});
    api.get('/security/batches', { limit: 15 }).then((d) => setBatches(d.batches || [])).catch(() => {});
    api.get('/security/models/integrity').then((d) => setIntegrity(d.models || [])).catch(() => {});
  };
  useEffect(load, []);

  const run = async (what, fn) => {
    setBusy(what); setMsg('');
    try { const r = await fn(); setMsg(r); load(); }
    catch (e) { setMsg(e.message || String(e)); }
    finally { setBusy(''); }
  };

  const computeDrift = () => run('drift', async () => {
    const d = await api.post('/security/drift/compute');
    setDrift(d);
    return `Drift computed — status ${d.status}, overall PSI ${d.overallPsi}`;
  });
  const rebuildProfile = () => run('profile', async () => {
    const d = await api.post('/security/outliers/rebuild-profile');
    return `Outlier baseline rebuilt from ${d.profile?.n_samples} scored statements`;
  });

  // KPI card: tinted icon chip + value + caption. `text` renders the value
  // smaller (for word values like a drift status) so cards stay uniform height.
  const kpi = (icon, label, value, sub, accent = 'slate', text = false) => {
    const chip = {
      slate: 'bg-slate-100 text-slate-500', rose: 'bg-rose-100 text-rose-600',
      amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700',
      purple: 'bg-purple-100 text-purple-700', sky: 'bg-sky-100 text-sky-700',
    }[accent];
    const num = {
      slate: 'text-slate-800', rose: 'text-rose-700', amber: 'text-amber-700',
      emerald: 'text-emerald-700', purple: 'text-purple-800', sky: 'text-sky-700',
    }[accent];
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-3.5 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <span className={`grid place-items-center w-6 h-6 rounded-lg shrink-0 ${chip}`}>{icon}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight truncate">{label}</span>
        </div>
        <div className={`font-extrabold ${num} leading-none truncate ${text ? 'text-base' : 'text-[26px]'}`}>
          {value}
        </div>
        <div className="text-[10px] text-slate-400 truncate mt-auto">{sub}</div>
      </div>
    );
  };

  if (overview && overview.available === false) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {overview.message || 'Security telemetry needs the PostgreSQL database.'}
      </div>
    );
  }

  const o = overview || {};
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60';
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-purple-600 uppercase tracking-wider">ML Model Security</span>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-purple-100 text-purple-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            Security &amp; Governance
          </h1>
        </div>
        <button onClick={load} className={`${btn} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer`}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch">
        {kpi(<Lock className="w-3.5 h-3.5" />, 'Guardrail blocks', o.events?.block ?? '—', 'inputs rejected',
             (o.events?.block > 0) ? 'rose' : 'emerald')}
        {kpi(<AlertTriangle className="w-3.5 h-3.5" />, 'Warnings', o.events?.warn ?? '—', 'soft issues logged',
             (o.events?.warn > 0) ? 'amber' : 'slate')}
        {kpi(<Activity className="w-3.5 h-3.5" />, 'Outlier scans', `${o.outlierRuns ?? 0}/${o.scoredRuns ?? 0}`, 'flagged / total', 'sky')}
        {kpi(<GitBranch className="w-3.5 h-3.5" />, 'Drift',
             <span className="capitalize">{(o.drift?.status ?? 'not computed').replace(/-/g, ' ')}</span>,
             o.drift?.overallPsi != null ? `PSI ${o.drift.overallPsi}` : 'not computed yet',
             o.drift?.status === 'alert' ? 'rose' : o.drift?.status === 'warn' ? 'amber' : o.drift?.status === 'stable' ? 'emerald' : 'slate',
             true)}
        {kpi(<FileCheck2 className="w-3.5 h-3.5" />, 'Data batches', o.datasetBatches ?? 0, `${o.rowsRejectedAllTime ?? 0} rows quarantined`, 'purple')}
        {kpi(<ShieldCheck className="w-3.5 h-3.5" />, 'Unverified models', o.unverifiedModels ?? 0, 'missing hash/signature',
             (o.unverifiedModels > 0) ? 'rose' : 'emerald')}
      </div>

      {msg && (
        <div className="text-xs font-mono text-slate-700 bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-2.5">
          {msg}
        </div>
      )}

      {/* Concept drift */}
      <SectionCard
        icon={GitBranch}
        title="Concept Drift"
        action={(
          <button onClick={computeDrift} disabled={busy === 'drift'}
            className={`${btn} btn-orange text-white shadow-sm shadow-orange-900/15 cursor-pointer`}>
            {busy === 'drift' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />} Compute now
          </button>
        )}
      >
        {drift ? (
          drift.status === 'insufficient-data' ? (
            <p className="text-xs text-slate-500">Not enough scored statements yet ({drift.recentN} recent / {drift.referenceN} reference).</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Pill className={BAND_PILL[drift.status] || SEV.info}>{drift.status.toUpperCase()}</Pill>
                <span className="font-mono text-slate-600">overall PSI {drift.overallPsi}</span>
                {drift.prediction && (
                  <span className="font-mono text-slate-400">
                    · score-drift PSI {drift.prediction.psi} ({drift.prediction.referenceMean} → {drift.prediction.recentMean})
                  </span>
                )}
              </div>
              <Table head={['Feature', { label: 'PSI', right: true }, { label: 'Reference', right: true }, { label: 'Recent', right: true }, 'Band']}>
                {drift.features.slice(0, 6).map((f) => (
                  <tr key={f.feature} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-bold text-slate-800 font-mono">{f.feature}</td>
                    <td className="py-2 px-3 text-right font-mono">{f.psi}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">{f.referenceMean ?? '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">{f.recentMean ?? '—'}</td>
                    <td className="py-2 px-3">
                      <Pill className={BAND_PILL[f.band] || SEV.info}>{f.band}</Pill>
                    </td>
                  </tr>
                ))}
              </Table>
            </>
          )
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            Compares the earliest half of scored applicants to the most recent half (PSI per feature).
            {' '}Latest stored:{' '}
            <span className={`font-bold ${BAND[o.drift?.status] || 'text-slate-600'}`}>{o.drift?.status ?? 'none'}</span>
            {o.drift?.computedAt ? ` (${new Date(o.drift.computedAt).toLocaleString()})` : ''}.
          </p>
        )}
      </SectionCard>

      {/* Model integrity */}
      <SectionCard
        icon={Lock}
        title="Model Artifact Integrity"
        action={(
          <button onClick={rebuildProfile} disabled={busy === 'profile'}
            className={`${btn} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer`}>
            {busy === 'profile' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rebuild outlier baseline
          </button>
        )}
      >
        <Table head={['Version', 'Algorithm', 'SHA-256', 'Signature', { label: 'Golden acc', right: true }, 'Batches', 'State']}>
          {integrity.map((m) => (
            <tr key={m.version} className={m.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'}>
              <td className="py-2 px-3 font-bold text-slate-800 font-mono">v{m.version}</td>
              <td className="py-2 px-3 font-mono text-slate-600">{m.algorithm}</td>
              <td className="py-2 px-3"><OkBad ok={m.hasHash} okText="recorded" badText="MISSING" /></td>
              <td className="py-2 px-3"><OkBad ok={m.hasSignature} okText="valid" badText="MISSING" /></td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                {m.goldenAccuracy != null ? `${(m.goldenAccuracy * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-2 px-3 font-mono text-slate-500">{(m.trainedFromBatches || []).join(', ') || '—'}</td>
              <td className="py-2 px-3">
                {m.active
                  ? <Pill className="bg-emerald-600 text-white border-emerald-600">ACTIVE</Pill>
                  : <span className="text-[10px] font-bold text-slate-400 uppercase">archived</span>}
              </td>
            </tr>
          ))}
        </Table>
        {integrity.some((m) => m.promotionNote) && (
          <p className="text-[10px] text-slate-400 font-mono">
            Latest promotion: {integrity.find((m) => m.promotionNote)?.promotionNote}
          </p>
        )}
      </SectionCard>

      {/* Training data lineage / poisoning */}
      <SectionCard icon={FileCheck2} title="Training-Data Batches (poisoning guard + lineage)">
        {batches.length === 0 ? (
          <p className="text-xs text-slate-500">No training CSVs ingested yet.</p>
        ) : (
          <Table head={['#', 'File', { label: 'In', right: true }, { label: 'Accepted', right: true }, { label: 'Rejected', right: true }, 'Distribution', 'SHA']}>
            {batches.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/60">
                <td className="py-2 px-3 font-mono text-slate-400">{b.id}</td>
                <td className="py-2 px-3 font-bold text-slate-800 font-mono">{b.fileName}</td>
                <td className="py-2 px-3 text-right font-mono">{b.rowsIn}</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{b.rowsAccepted}</td>
                <td className={`py-2 px-3 text-right font-mono font-bold ${b.rowsRejected > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{b.rowsRejected}</td>
                <td className="py-2 px-3">
                  {b.distribution?.status
                    ? <Pill className={BAND_PILL[b.distribution.status] || SEV.info}>{b.distribution.status}</Pill>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">{b.sha256}…</td>
              </tr>
            ))}
          </Table>
        )}
      </SectionCard>

      {/* Audit log */}
      <SectionCard icon={Activity} title="Security Audit Log">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">No security events recorded.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 text-[11px] font-mono px-3 py-2 hover:bg-slate-50/60">
                <Pill className={`shrink-0 uppercase ${SEV[e.severity] || SEV.info}`}>{e.severity}</Pill>
                <span className="font-bold text-slate-800 shrink-0">{e.type}</span>
                <span className="text-slate-400 shrink-0">{e.source}</span>
                <span className="text-slate-400 truncate flex-1">{e.detail ? JSON.stringify(e.detail).slice(0, 120) : ''}</span>
                <span className="text-slate-300 shrink-0">{e.at ? new Date(e.at).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
