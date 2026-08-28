import { useEffect, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Activity, FileCheck2, GitBranch,
  Lock, RefreshCw, Loader2,
} from 'lucide-react';
import { api } from '../api/client';

const SEV = {
  block: 'bg-rose-100 text-rose-800 border-rose-200',
  warn:  'bg-amber-100 text-amber-900 border-amber-200',
  info:  'bg-slate-100 text-slate-700 border-slate-200',
};
const BAND = {
  alert: 'text-rose-700', warn: 'text-amber-700', stable: 'text-emerald-700',
};

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

  const kpi = (icon, label, value, sub, tone = 'text-[#3b0764]') => (
    <div className="rounded-xl border border-purple-100 bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase">
        {icon}{label}
      </div>
      <div className={`text-xl font-extrabold font-mono ${tone}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );

  if (overview && overview.available === false) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {overview.message || 'Security telemetry needs the PostgreSQL database.'}
      </div>
    );
  }

  const o = overview || {};
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">ML Model Security</span>
          <h1 className="text-lg font-bold text-[#3b0764] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700" /> Security & Governance
          </h1>
        </div>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-[#3b0764] text-xs font-bold flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {kpi(<Lock className="w-3 h-3" />, 'Guardrail blocks', o.events?.block ?? '—', 'inputs rejected',
             (o.events?.block > 0) ? 'text-rose-700' : 'text-emerald-700')}
        {kpi(<AlertTriangle className="w-3 h-3" />, 'Warnings', o.events?.warn ?? '—', 'soft issues logged', 'text-amber-700')}
        {kpi(<Activity className="w-3 h-3" />, 'Outlier scans', `${o.outlierRuns ?? 0}/${o.scoredRuns ?? 0}`, 'flagged / total')}
        {kpi(<GitBranch className="w-3 h-3" />, 'Drift', (o.drift?.status ?? '—'), o.drift?.overallPsi != null ? `PSI ${o.drift.overallPsi}` : 'not computed',
             BAND[o.drift?.status] || 'text-slate-600')}
        {kpi(<FileCheck2 className="w-3 h-3" />, 'Data batches', o.datasetBatches ?? 0, `${o.rowsRejectedAllTime ?? 0} rows quarantined`)}
        {kpi(<ShieldCheck className="w-3 h-3" />, 'Unverified models', o.unverifiedModels ?? 0, 'missing hash/signature',
             (o.unverifiedModels > 0) ? 'text-rose-700' : 'text-emerald-700')}
      </div>

      {msg && <div className="text-xs font-mono text-[#3b0764] bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">{msg}</div>}

      {/* Concept drift */}
      <section className="rounded-2xl border border-purple-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#3b0764] flex items-center gap-2"><GitBranch className="w-4 h-4 text-purple-700" /> Concept Drift</h2>
          <button onClick={computeDrift} disabled={busy === 'drift'}
            className="px-3 py-1.5 rounded-lg bg-[#3b0764] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
            {busy === 'drift' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />} Compute now
          </button>
        </div>
        {drift ? (
          drift.status === 'insufficient-data' ? (
            <p className="text-xs text-slate-500 font-mono">Not enough scored statements yet ({drift.recentN} recent / {drift.referenceN} reference).</p>
          ) : (
            <>
              <p className="text-xs font-mono">
                Status <span className={`font-bold ${BAND[drift.status] || ''}`}>{drift.status.toUpperCase()}</span>
                {' · '}overall PSI {drift.overallPsi}
                {drift.prediction && <> · score-drift PSI {drift.prediction.psi} ({drift.prediction.referenceMean} → {drift.prediction.recentMean})</>}
              </p>
              <div className="overflow-x-auto border border-purple-100 rounded-lg">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-purple-50/70 text-[9px] uppercase text-[#3b0764] font-bold">
                    <tr><th className="py-1.5 px-3">Feature</th><th className="py-1.5 px-3 text-right">PSI</th>
                      <th className="py-1.5 px-3 text-right">Reference</th><th className="py-1.5 px-3 text-right">Recent</th>
                      <th className="py-1.5 px-3">Band</th></tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {drift.features.slice(0, 6).map((f) => (
                      <tr key={f.feature}>
                        <td className="py-1.5 px-3 font-bold text-[#3b0764]">{f.feature}</td>
                        <td className="py-1.5 px-3 text-right">{f.psi}</td>
                        <td className="py-1.5 px-3 text-right">{f.referenceMean ?? '—'}</td>
                        <td className="py-1.5 px-3 text-right">{f.recentMean ?? '—'}</td>
                        <td className={`py-1.5 px-3 font-bold ${BAND[f.band] || ''}`}>{f.band}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          <p className="text-xs text-slate-500 font-mono">
            Compares the earliest half of scored applicants to the most recent half (PSI per feature).
            {' '}Latest stored: {o.drift?.status ?? 'none'}{o.drift?.computedAt ? ` (${new Date(o.drift.computedAt).toLocaleString()})` : ''}.
          </p>
        )}
      </section>

      {/* Model integrity */}
      <section className="rounded-2xl border border-purple-100 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#3b0764] flex items-center gap-2"><Lock className="w-4 h-4 text-purple-700" /> Model Artifact Integrity</h2>
          <button onClick={rebuildProfile} disabled={busy === 'profile'}
            className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-[#3b0764] text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
            {busy === 'profile' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Rebuild outlier baseline
          </button>
        </div>
        <div className="overflow-x-auto border border-purple-100 rounded-lg">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-purple-50/70 text-[9px] uppercase text-[#3b0764] font-bold">
              <tr><th className="py-1.5 px-3">Version</th><th className="py-1.5 px-3">Algorithm</th>
                <th className="py-1.5 px-3">SHA-256</th><th className="py-1.5 px-3">Signature</th>
                <th className="py-1.5 px-3 text-right">Golden acc</th><th className="py-1.5 px-3">Batches</th>
                <th className="py-1.5 px-3">State</th></tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {integrity.map((m) => (
                <tr key={m.version} className={m.active ? 'bg-emerald-50/40' : ''}>
                  <td className="py-1.5 px-3 font-bold text-[#3b0764]">v{m.version}</td>
                  <td className="py-1.5 px-3">{m.algorithm}</td>
                  <td className={`py-1.5 px-3 ${m.hasHash ? 'text-emerald-700' : 'text-rose-700'}`}>{m.hasHash ? 'recorded' : 'MISSING'}</td>
                  <td className={`py-1.5 px-3 ${m.hasSignature ? 'text-emerald-700' : 'text-rose-700'}`}>{m.hasSignature ? 'valid' : 'MISSING'}</td>
                  <td className="py-1.5 px-3 text-right">{m.goldenAccuracy != null ? `${(m.goldenAccuracy * 100).toFixed(1)}%` : '—'}</td>
                  <td className="py-1.5 px-3">{(m.trainedFromBatches || []).join(', ') || '—'}</td>
                  <td className="py-1.5 px-3">{m.active ? <span className="text-emerald-700 font-bold">ACTIVE</span> : 'archived'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {integrity.some((m) => m.promotionNote) && (
          <p className="text-[10px] text-slate-500 font-mono">
            Latest promotion: {integrity.find((m) => m.promotionNote)?.promotionNote}
          </p>
        )}
      </section>

      {/* Training data lineage / poisoning */}
      <section className="rounded-2xl border border-purple-100 bg-white p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#3b0764] flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-purple-700" /> Training-Data Batches (poisoning guard + lineage)</h2>
        {batches.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">No training CSVs ingested yet.</p>
        ) : (
          <div className="overflow-x-auto border border-purple-100 rounded-lg">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-purple-50/70 text-[9px] uppercase text-[#3b0764] font-bold">
                <tr><th className="py-1.5 px-3">#</th><th className="py-1.5 px-3">File</th>
                  <th className="py-1.5 px-3 text-right">In</th><th className="py-1.5 px-3 text-right">Accepted</th>
                  <th className="py-1.5 px-3 text-right">Rejected</th><th className="py-1.5 px-3">Distribution</th>
                  <th className="py-1.5 px-3">SHA</th></tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="py-1.5 px-3">{b.id}</td>
                    <td className="py-1.5 px-3 font-bold text-[#3b0764]">{b.fileName}</td>
                    <td className="py-1.5 px-3 text-right">{b.rowsIn}</td>
                    <td className="py-1.5 px-3 text-right text-emerald-700">{b.rowsAccepted}</td>
                    <td className={`py-1.5 px-3 text-right ${b.rowsRejected > 0 ? 'text-amber-700 font-bold' : ''}`}>{b.rowsRejected}</td>
                    <td className={`py-1.5 px-3 ${BAND[b.distribution?.status] || 'text-slate-500'}`}>{b.distribution?.status || '—'}</td>
                    <td className="py-1.5 px-3 text-slate-400">{b.sha256}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit log */}
      <section className="rounded-2xl border border-purple-100 bg-white p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#3b0764] flex items-center gap-2"><Activity className="w-4 h-4 text-purple-700" /> Security Audit Log</h2>
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">No security events recorded.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-[11px] font-mono border-b border-purple-50 pb-1.5">
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${SEV[e.severity] || SEV.info}`}>{e.severity}</span>
                <span className="font-bold text-[#3b0764] shrink-0">{e.type}</span>
                <span className="text-slate-500 shrink-0">{e.source}</span>
                <span className="text-slate-400 truncate flex-1">{e.detail ? JSON.stringify(e.detail).slice(0, 120) : ''}</span>
                <span className="text-slate-300 shrink-0">{e.at ? new Date(e.at).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
