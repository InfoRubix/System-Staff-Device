'use client';

import { useMemo, useState, useEffect } from 'react';
import BudgetCard from './BudgetCard';
import Navigation from './Navigation';

// Dynamic Chart.js imports for better performance
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';

// Lazy load chart components with better loading states
const Pie = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Pie })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">Loading chart...</span>
      </div>
    </div>
  )
});

const Bar = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Bar })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">Loading chart...</span>
      </div>
    </div>
  )
});

const Line = dynamic(() => import('react-chartjs-2').then((mod) => ({ default: mod.Line })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">Loading chart...</span>
      </div>
    </div>
  )
});

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

interface AnalyticsData {
  statusDistribution: Record<string, number>;
  deviceTypeDistribution: Record<string, number>;
  osAgeData: Record<string, number>;
  departmentDistribution: Record<string, number>;
  issuesTrend: Array<{
    month: string;
    broken: number;
    needsRepair: number;
    working: number;
  }>;
  kpiMetrics: {
    upgradePercentage: number;
    upgradeStats: {
      upgraded: number;
      total: number;
    };
    osDistribution: {
      Windows: number;
      iOS: number;
      Android: number;
    };
  };
  totalDevices: number;
  lastUpdated: string;
  cached?: boolean;
  cacheAge?: number;
}

function OptimizedDataAnalysis() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data from API
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/analytics/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Chart data generators using server data
  const statusData = useMemo(() => {
    if (!analyticsData) return { labels: [], datasets: [] };

    const labels = Object.keys(analyticsData.statusDistribution);
    const data = Object.values(analyticsData.statusDistribution);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Green for Working
          'rgba(239, 68, 68, 0.8)',   // Red for Broken
          'rgba(245, 158, 11, 0.8)',  // Yellow for Needs Repair
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 2,
      }],
    };
  }, [analyticsData]);

  const deviceTypeData = useMemo(() => {
    if (!analyticsData) return { labels: [], datasets: [] };

    const labels = Object.keys(analyticsData.deviceTypeDistribution);
    const data = Object.values(analyticsData.deviceTypeDistribution);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue
          'rgba(168, 85, 247, 0.8)',   // Purple
          'rgba(236, 72, 153, 0.8)',   // Pink
          'rgba(34, 197, 94, 0.8)',    // Green
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
      }],
    };
  }, [analyticsData]);

  const osAgeChartData = useMemo(() => {
    if (!analyticsData) return { labels: [], datasets: [] };

    const labels = Object.keys(analyticsData.osAgeData);
    const data = Object.values(analyticsData.osAgeData);

    return {
      labels,
      datasets: [{
        label: 'OS Age (Years)',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      }],
    };
  }, [analyticsData]);

  const issuesTrendData = useMemo(() => {
    if (!analyticsData) return { labels: [], datasets: [] };

    const labels = analyticsData.issuesTrend.map(item => item.month);

    return {
      labels,
      datasets: [
        {
          label: 'Working',
          data: analyticsData.issuesTrend.map(item => item.working),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Broken',
          data: analyticsData.issuesTrend.map(item => item.broken),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Needs Repair',
          data: analyticsData.issuesTrend.map(item => item.needsRepair),
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div>
                <div className="text-gray-800 font-medium">Loading Analytics...</div>
                <div className="text-sm text-gray-500 mt-1">Fetching data from server</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="text-center py-12">
            <div className="text-red-600 font-medium">Error loading analytics</div>
            <div className="text-sm text-gray-500 mt-1">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <div id="analysis-content" className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Data Analysis</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Visual insights and analytics for device management
            {analyticsData?.cached && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Cached ({analyticsData.cacheAge}s ago)
              </span>
            )}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Left side - KPI Cards cluster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Upgrade Card */}
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Upgrade</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                {analyticsData?.kpiMetrics.upgradePercentage}% upgraded
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                {analyticsData?.kpiMetrics.upgradeStats.upgraded} of {analyticsData?.kpiMetrics.upgradeStats.total} devices upgraded
              </p>
            </div>

            {/* OS Card */}
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">OS</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                Win: {analyticsData?.kpiMetrics.osDistribution.Windows}% | iOS: {analyticsData?.kpiMetrics.osDistribution.iOS}% | And: {analyticsData?.kpiMetrics.osDistribution.Android}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Current OS breakdown</p>
            </div>

            {/* Total Devices Card */}
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Total</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                {analyticsData?.totalDevices} devices
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Across all departments</p>
            </div>

            {/* Last Updated Card */}
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Updated</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {analyticsData?.lastUpdated ? new Date(analyticsData.lastUpdated).toLocaleTimeString() : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Last refresh time</p>
            </div>
          </div>

          {/* Right side - Budget Card */}
          <BudgetCard />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Device Status Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Status Distribution</h3>
            <div className="h-64 sm:h-80">
              <Pie data={statusData} />
            </div>
          </div>

          {/* Device Type Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Type Distribution</h3>
            <div className="h-64 sm:h-80">
              <Pie data={deviceTypeData} />
            </div>
          </div>

          {/* OS Age Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Operating System Age Analysis</h3>
            <div className="h-64 sm:h-80">
              <Bar data={osAgeChartData} />
            </div>
          </div>

          {/* Issues Trend Chart */}
          <div className="bg-white dark:bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4">Device Issues Trend (Last 12 Months)</h3>
            <div className="h-64 sm:h-80">
              <Line data={issuesTrendData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OptimizedDataAnalysis;