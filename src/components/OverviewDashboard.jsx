import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { api } from '../api/client';

const KPI_META = {
  analyzed: { color: 'text-[#3b0764]', badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200' },
  processed: { color: 'text-purple-700', badgeStyle: 'bg-purple-50 text-purple-900 border-purple-200' },
  avg_score: { color: 'text-emerald-700', badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  pending: { color: 'text-amber-700', badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200' },
  anomalies: { color: 'text-rose-700', badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const STATUS_COLOR = { ANALYZED: '#3b0764', FAILED: '#ef4444', NORMALIZED: '#8b5cf6' };
const GRADE_COLOR = { 'LOW Risk': '#059669', 'MEDIUM Risk': '#f59e0b', 'HIGH Risk': '#ef4444' };

export default function OverviewDashboard({ onGoToProducts, onGoToModelHub }) {
  const [kpiData, setKpiData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [donutData, setDonutData] = useState([]);
  const [recentStatements, setRecentStatements] = useState([]);

  useEffect(() => {
    api.get('/dashboard/kpis').then((data) => {
      setKpiData(data.kpis.map((k) => ({ ...k, ...KPI_META[k.id] })));
    });
    api.get('/dashboard/charts').then((data) => {
      setBarData(data.byStatus.map((s) => ({ ...s, color: STATUS_COLOR[s.status] || '#3b0764' })));
      setDonutData(data.byRiskGrade.map((g) => ({ ...g, color: GRADE_COLOR[g.name] || '#3b0764' })));
    });
    api.get('/dashboard/recent-statements').then((data) => {
      setRecentStatements(data.recentStatements.map((s) => ({
        ...s,
        date: new Date(s.date).toISOString().slice(0, 16).replace('T', ' '),
      })));
    });
  }, []);

  const totalAnalyzed = barData.reduce((sum, b) => sum + b.count, 0) || 89;
  const lowRiskEntry = donutData.find((d) => d.name === 'LOW Risk');
  const lowRiskPct = donutData.length
    ? ((lowRiskEntry?.value || 0) / donutData.reduce((s, d) => s + d.value, 0) * 100).toFixed(1)
    : '0.0';

  const renderCustomBarLabel = (props) => {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null) return null;
    const entry = barData[index];
    if (!entry) return null;

    const percentage = ((value / totalAnalyzed) * 100).toFixed(1);
    const color = entry.color || '#3b0764';
    const cx = x + width / 2;

    return (
      <g>
        {/* Callout dot on bar top */}
        <circle cx={cx} cy={y} r={3} fill={color} />
        
        {/* Leader line extending upwards */}
        <line
          x1={cx}
          y1={y}
          x2={cx}
          y2={y - 14}
          stroke={color}
          strokeWidth={1.5}
        />

        {/* Status Title */}
        <text
          x={cx}
          y={y - 34}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="12"
          fontWeight="800"
        >
          {entry.status}
        </text>

        {/* Ratio & Count */}
        <text
          x={cx}
          y={y - 21}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#334155"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="700"
        >
          {`${percentage}% (${value})`}
        </text>
      </g>
    );
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, value, name, payload }) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);

    // S1: Edge of pie slice
    const sx = cx + (outerRadius + 3) * cos;
    const sy = cy + (outerRadius + 3) * sin;

    // S2: Midpoint elbow
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;

    // S3: Horizontal extension line
    const isRight = cos >= 0;
    const ex = mx + (isRight ? 22 : -22);
    const ey = my;

    const textAnchor = isRight ? 'start' : 'end';
    const labelColor = payload.color || '#3b0764';
    const percentage = ((value / totalAnalyzed) * 100).toFixed(1);

    return (
      <g>
        {/* Callout Leader Line */}
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={labelColor}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Connection dot at slice border */}
        <circle cx={sx} cy={sy} r={3} fill={labelColor} />

        {/* Data Label Name */}
        <text
          x={ex + (isRight ? 8 : -8)}
          y={ey - 6}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill={labelColor}
          fontSize="13"
          fontWeight="800"
        >
          {name}
        </text>

        {/* Data Label Value / Percentage */}
        <text
          x={ex + (isRight ? 8 : -8)}
          y={ey + 11}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill="#334155"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="700"
        >
          {`${percentage}% (${value})`}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3b0764]">
            Overview Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time underwriting metrics, bank statement processing analytics & risk distribution.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onGoToProducts}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-purple-200 text-[#3b0764] text-xs font-bold shadow-xs hover:bg-purple-50 transition-colors cursor-pointer"
          >
            Configure Products
          </button>
          <button
            onClick={onGoToModelHub}
            className="px-3.5 py-1.5 rounded-xl bg-[#3b0764] hover:bg-purple-900 text-white text-xs font-bold shadow-md shadow-purple-950/20 transition-all flex items-center space-x-1 cursor-pointer"
          >
            <span>Model Testing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {kpiData.map((kpi) => (
          <div
            key={kpi.id}
            className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold font-mono text-slate-400 tracking-wider">
                {kpi.label}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${kpi.badgeStyle}`}>
                {kpi.badge}
              </span>
            </div>

            <div>
              <div className="flex items-baseline space-x-1">
                <span className={`text-xl font-extrabold font-mono ${kpi.color}`}>
                  {typeof kpi.value === 'number' ? kpi.value.toLocaleString('en-IN') : kpi.value}
                </span>
                {kpi.sub && (
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{kpi.sub}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{kpi.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Interactive Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Statements by Status (Bar Chart) */}
        <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-[#3b0764]">
                Statements by status
              </h3>
              <p className="text-[10px] text-slate-400">Integrated callout data labels</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Total: {totalAnalyzed}
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 45, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="status" stroke="#3b0764" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis stroke="#3b0764" tick={{ fontSize: 10 }} domain={[0, 110]} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={44} label={renderCustomBarLabel}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-200 hover:opacity-80 cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statements by Risk Grade (Donut Chart) */}
        <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-[#3b0764]">
                Statements by risk grade
              </h3>
              <p className="text-[10px] text-slate-400">Integrated callout data labels</p>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {lowRiskPct}% LOW Risk
            </span>
          </div>

          <div className="h-72 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-200 hover:opacity-80 cursor-pointer" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Counter Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-[#3b0764] font-mono leading-none">{lowRiskEntry?.value ?? 0}</span>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase mt-1 tracking-wider">LOW RISK</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Table: Recent Statements */}
      <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
          <div>
            <h3 className="text-sm font-bold text-[#3b0764]">
              Recent Bank Statements & Ingestion Status
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500">Live Ingestion Feed</span>
        </div>

        <div className="overflow-x-auto border border-purple-100 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-purple-50/70 text-[#3b0764] border-b border-purple-100 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="py-2 px-3">Statement ID</th>
                <th className="py-2 px-3">Source / Feed</th>
                <th className="py-2 px-3">Ingestion Date</th>
                <th className="py-2 px-3 text-right">Transactions</th>
                <th className="py-2 px-3">Risk Score</th>
                <th className="py-2 px-3">Grade</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100 bg-white">
              {recentStatements.map((row, idx) => (
                <tr key={idx} className="hover:bg-purple-50/40 text-slate-800 transition-colors">
                  <td className="py-2 px-3 font-bold text-[#3b0764]">{row.id}</td>
                  <td className="py-2 px-3 font-medium text-slate-700">{row.bank}</td>
                  <td className="py-2 px-3 text-slate-500 text-[11px]">{row.date}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{row.txCount}</td>
                  <td className="py-2 px-3 font-extrabold text-slate-900">{row.riskScore} / 900</td>
                  <td className="py-2 px-3">
                    <span className={`w-20 inline-block text-center py-0.5 rounded text-[10px] font-extrabold ${
                      row.grade === 'LOW' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : row.grade === 'MEDIUM' 
                        ? 'bg-amber-100 text-amber-900' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`w-24 inline-block text-center py-0.5 rounded border text-[10px] font-bold ${
                      row.status === 'ANALYZED'
                        ? 'bg-purple-50 border-purple-200 text-[#3b0764]'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
