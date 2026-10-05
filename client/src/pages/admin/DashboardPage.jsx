import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminStats } from '../../api/admin.js';
import { apiErrorMessage } from '../../api/http.js';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { formatInr } from '../../lib/money.js';

const Chart = lazy(() => import('react-apexcharts'));

const STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  return_requested: 'Return requested',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

function getChartColors() {
  const styles = getComputedStyle(document.documentElement);
  return [
    '--brand-forest-medium',
    '--brand-lime',
    '--sys-orange',
    '--sys-green',
    '--sys-red',
    '--brand-forest-light',
    '--text-muted-green',
    '--brand-forest-dark',
    '--sys-red-bg',
  ].map((token) => styles.getPropertyValue(token).trim());
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await fetchAdminStats());
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const revenueSeries = useMemo(() => {
    const days = stats?.revenueByDay || [];
    const previous = days.slice(0, 7).reduce((total, day) => total + (day.revenue || 0), 0);
    const recent = days.slice(-7).reduce((total, day) => total + (day.revenue || 0), 0);
    const change = previous === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - previous) / previous) * 100);
    return {
      days,
      previous,
      recent,
      change,
    };
  }, [stats]);

  const chartColors = getChartColors();
  const revenueOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Plus Jakarta Sans, sans-serif' },
    colors: [chartColors[0]],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.22, opacityTo: 0.02 } },
    grid: { borderColor: 'var(--border-light)', strokeDashArray: 4 },
    xaxis: {
      categories: revenueSeries.days.map((day) => new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (value) => formatInr(value) } },
    tooltip: { y: { formatter: (value) => formatInr(value) } },
  };
  const statusEntries = Object.entries(stats?.ordersByStatus || {}).filter(([, count]) => count > 0);
  const statusOptions = {
    chart: { type: 'donut', fontFamily: 'Plus Jakarta Sans, sans-serif' },
    labels: statusEntries.map(([status]) => STATUS_LABELS[status] || status),
    colors: chartColors,
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--card-background)'] },
    plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Orders' } } } } },
    tooltip: { y: { formatter: (value) => `${value} order${value === 1 ? '' : 's'}` } },
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Dashboard" subtitle="An easy way to manage sales with care and precision." />
        <Button variant="outline" size="sm" onClick={() => void loadStats()} disabled={loading}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-sys-red/30 bg-card p-4 text-sm text-sys-red" role="alert">
          <p>{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void loadStats()}>Try again</Button>
        </div>
      ) : null}

      {loading && !stats ? (
        <div className="rounded-xxl bg-card p-8 shadow-spark-sm"><Spinner label="Loading dashboard" /></div>
      ) : stats ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Store statistics">
            <StatCard
              label="Revenue"
              value={formatInr(stats.revenue || 0)}
              detail="Recent 7 days vs prior 7"
              trend={`${Math.abs(revenueSeries.change)}%`}
              trendDirection={revenueSeries.change >= 0 ? 'up' : 'down'}
            />
            <StatCard label="Orders" value={stats.ordersCount || 0} detail="All-time orders" />
            <StatCard label="New customers" value={stats.newCustomers || 0} detail="Last 14 days" />
            <StatCard label="Low stock" value={stats.lowStock?.length || 0} detail="5 units or fewer" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <article className="min-w-0 rounded-xxl bg-card p-6 shadow-spark-md">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-main">Revenue</h2>
                  <p className="mt-1 text-sm text-muted-green">Daily revenue for the last 14 days</p>
                </div>
                <span className="rounded-full bg-lime-soft px-3 py-1 text-xs font-bold text-forest-medium">{formatInr(revenueSeries.recent)} recent week</span>
              </div>
              {revenueSeries.days.length ? (
                <Suspense fallback={<div className="flex h-[300px] items-center justify-center"><Spinner label="Loading revenue chart" /></div>}>
                  <Chart options={revenueOptions} series={[{ name: 'Revenue', data: revenueSeries.days.map((day) => day.revenue || 0) }]} type="area" height={300} />
                </Suspense>
              ) : <p className="py-16 text-center text-sm text-muted-green">No revenue data yet.</p>}
            </article>

            <article className="min-w-0 rounded-xxl bg-card p-6 shadow-spark-md">
              <h2 className="text-lg font-bold text-main">Orders by status</h2>
              <p className="mt-1 text-sm text-muted-green">Current order distribution</p>
              {statusEntries.length ? (
                <>
                  <Suspense fallback={<div className="flex h-[250px] items-center justify-center"><Spinner label="Loading order chart" /></div>}>
                    <Chart options={statusOptions} series={statusEntries.map(([, count]) => count)} type="donut" height={250} />
                  </Suspense>
                  <ul className="mt-4 grid grid-cols-2 gap-2">
                    {statusEntries.map(([status, count], index) => (
                      <li key={status} className="flex min-w-0 items-center gap-2 text-xs text-muted-green">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} aria-hidden="true" />
                        <span className="truncate">{STATUS_LABELS[status] || status}</span>
                        <span className="ml-auto font-bold text-main">{count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="py-16 text-center text-sm text-muted-green">No orders to display yet.</p>}
            </article>
          </section>

          <section className="mt-6 rounded-xxl bg-card p-6 shadow-spark-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-main">Low stock products</h2>
                <p className="mt-1 text-sm text-muted-green">Active products with five units or fewer</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/products')}>Manage products</Button>
            </div>
            {stats.lowStock?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr className="border-b border-light text-xs uppercase text-muted-green"><th className="py-3 pr-4">Product</th><th className="py-3 pr-4">Brand</th><th className="py-3 text-right">Units</th></tr></thead>
                  <tbody>{stats.lowStock.map((product) => (
                    <tr key={product.id} className="border-b border-light last:border-0">
                      <td className="py-3 pr-4 font-semibold text-main">{product.title}</td>
                      <td className="py-3 pr-4 text-muted-green">{product.brand || '—'}</td>
                      <td className="py-3 text-right font-bold text-sys-orange">{product.stock}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="rounded-xl bg-canvas p-4 text-sm text-muted-green">No low stock products.</p>}
          </section>
        </>
      ) : null}
    </div>
  );
}
