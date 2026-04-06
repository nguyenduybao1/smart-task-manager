'use client';

import { useAnalytics } from '@/hooks/useTasks';

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) return null;

  const completionPct = Math.round(analytics.completionRate * 100);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total"       value={analytics.total}      color="text-gray-700" />
        <StatCard label="Done"        value={analytics.done}       color="text-green-600" />
        <StatCard label="In Progress" value={analytics.inProgress} color="text-blue-600" />
        <StatCard label="Overdue"     value={analytics.overdue}    color="text-red-600" />
      </div>

      {/* Completion Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completion Rate</span>
          <span className="text-sm font-bold text-gray-900">{completionPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* By Priority */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">By Priority</h3>
        <div className="space-y-2">
          <PriorityBar label="Critical" value={analytics.byPriority.critical} total={analytics.total} color="bg-red-500" />
          <PriorityBar label="High"     value={analytics.byPriority.high}     total={analytics.total} color="bg-orange-500" />
          <PriorityBar label="Medium"   value={analytics.byPriority.medium}   total={analytics.total} color="bg-yellow-500" />
          <PriorityBar label="Low"      value={analytics.byPriority.low}      total={analytics.total} color="bg-green-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function PriorityBar({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  );
}