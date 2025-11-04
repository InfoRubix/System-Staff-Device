'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HealthScan {
  id: string;
  deviceId: string;
  staffName: string;
  department: string;
  scanTimestamp: Date;

  // Hardware Health
  cpuUsage: number;
  cpuTemp?: number;
  ramUsage: number;
  diskSpaceFree: number;
  diskHealth: 'Good' | 'Warning' | 'Critical';
  batteryHealth?: number;

  // Software Health
  osVersion: string;
  antivirusStatus: 'Active' | 'Inactive' | 'Not Installed';
  firewallStatus: 'Active' | 'Inactive';
  lastUpdate?: Date;

  // Issues
  issues: HealthIssue[];
  overallStatus: 'Healthy' | 'Warning' | 'Critical';
}

interface HealthIssue {
  type: 'hardware' | 'software' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export default function DeviceHealthDashboard() {
  const [healthScans, setHealthScans] = useState<HealthScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Listen to device_scans collection in Firebase
    const q = query(
      collection(db, 'device_scans'),
      orderBy('scanTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans: HealthScan[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        scans.push({
          id: doc.id,
          ...data,
          scanTimestamp: data.scanTimestamp?.toDate() || new Date(),
          lastUpdate: data.lastUpdate?.toDate(),
        } as HealthScan);
      });
      setHealthScans(scans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter scans
  const filteredScans = healthScans.filter((scan) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'healthy' && scan.overallStatus === 'Healthy') ||
      (filter === 'warning' && scan.overallStatus === 'Warning') ||
      (filter === 'critical' && scan.overallStatus === 'Critical');

    const matchesSearch =
      searchTerm === '' ||
      scan.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.department.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Calculate statistics
  const stats = {
    total: healthScans.length,
    healthy: healthScans.filter((s) => s.overallStatus === 'Healthy').length,
    warning: healthScans.filter((s) => s.overallStatus === 'Warning').length,
    critical: healthScans.filter((s) => s.overallStatus === 'Critical').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards - Now Clickable! */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Devices"
          value={stats.total}
          icon="💻"
          color="bg-blue-500"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard
          title="Healthy"
          value={stats.healthy}
          icon="✅"
          color="bg-green-500"
          onClick={() => setFilter('healthy')}
          active={filter === 'healthy'}
        />
        <StatCard
          title="Warnings"
          value={stats.warning}
          icon="⚠️"
          color="bg-yellow-500"
          onClick={() => setFilter('warning')}
          active={filter === 'warning'}
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon="🔴"
          color="bg-red-500"
          onClick={() => setFilter('critical')}
          active={filter === 'critical'}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by staff name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <FilterButton
              label="All"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterButton
              label="Healthy"
              active={filter === 'healthy'}
              onClick={() => setFilter('healthy')}
              color="green"
            />
            <FilterButton
              label="Warning"
              active={filter === 'warning'}
              onClick={() => setFilter('warning')}
              color="yellow"
            />
            <FilterButton
              label="Critical"
              active={filter === 'critical'}
              onClick={() => setFilter('critical')}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Device Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScans.length === 0 ? (
          <div className="col-span-2 bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'No devices match your filters'
                : 'No health scan data available yet. Devices will appear here after their first scan.'}
            </p>
          </div>
        ) : (
          filteredScans.map((scan) => (
            <HealthCard key={scan.id} scan={scan} />
          ))
        )}
      </div>
    </div>
  );
}

// Stat Card Component - Now Clickable!
function StatCard({
  title,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left w-full ${
        active ? 'ring-4 ring-blue-300 shadow-xl' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {active && (
            <p className="text-xs text-blue-600 font-semibold mt-1">
              ✓ Active Filter
            </p>
          )}
        </div>
        <div className={`${color} text-white rounded-full p-3 text-2xl`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

// Filter Button Component
function FilterButton({
  label,
  active,
  onClick,
  color = 'blue',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    red: 'bg-red-500 hover:bg-red-600',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? `${colors[color]} text-white`
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

// Health Card Component
function HealthCard({ scan }: { scan: HealthScan }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    Healthy: 'bg-green-100 text-green-800 border-green-200',
    Warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Critical: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons = {
    Healthy: '✅',
    Warning: '⚠️',
    Critical: '🔴',
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className={`p-4 border-l-4 ${statusColors[scan.overallStatus]}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{scan.staffName}</h3>
            <p className="text-sm text-gray-600">{scan.department}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{statusIcons[scan.overallStatus]}</div>
            <div className="text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last scan: {scan.scanTimestamp.toLocaleString()}
        </p>
      </div>

      {/* Health Metrics */}
      <div className="p-4 space-y-3">
        {/* CPU */}
        <MetricBar
          label="CPU Usage"
          value={scan.cpuUsage}
          max={100}
          unit="%"
          color={scan.cpuUsage > 80 ? 'red' : scan.cpuUsage > 60 ? 'yellow' : 'green'}
        />

        {/* RAM */}
        <MetricBar
          label="RAM Usage"
          value={scan.ramUsage}
          max={100}
          unit="%"
          color={scan.ramUsage > 85 ? 'red' : scan.ramUsage > 70 ? 'yellow' : 'green'}
        />

        {/* Disk */}
        <MetricBar
          label="Disk Free"
          value={scan.diskSpaceFree}
          max={500}
          unit="GB"
          color={scan.diskSpaceFree < 20 ? 'red' : scan.diskSpaceFree < 50 ? 'yellow' : 'green'}
        />

        {/* Battery (if laptop) */}
        {scan.batteryHealth !== undefined && (
          <MetricBar
            label="Battery Health"
            value={scan.batteryHealth}
            max={100}
            unit="%"
            color={scan.batteryHealth < 50 ? 'red' : scan.batteryHealth < 70 ? 'yellow' : 'green'}
          />
        )}

        {/* Security Status */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Antivirus:</span>
          <span
            className={`font-medium ${
              scan.antivirusStatus === 'Active' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {scan.antivirusStatus}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Firewall:</span>
          <span
            className={`font-medium ${
              scan.firewallStatus === 'Active' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {scan.firewallStatus}
          </span>
        </div>

        {/* Issues */}
        {scan.issues.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Issues ({scan.issues.length})
            </p>
            <div className="space-y-1">
              {scan.issues.slice(0, isExpanded ? scan.issues.length : 3).map((issue, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded ${
                    issue.severity === 'critical'
                      ? 'bg-red-50 text-red-800'
                      : issue.severity === 'high'
                      ? 'bg-orange-50 text-orange-800'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-50 text-yellow-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-3 border-t mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Device Details
            </p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Device ID:</span>
                <span className="font-mono text-gray-900">{scan.deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">OS Version:</span>
                <span className="text-gray-900">{scan.osVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Disk Health:</span>
                <span
                  className={`font-medium ${
                    scan.diskHealth === 'Good'
                      ? 'text-green-600'
                      : scan.diskHealth === 'Warning'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {scan.diskHealth}
                </span>
              </div>
              {scan.lastUpdate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Update:</span>
                  <span className="text-gray-900">{scan.lastUpdate.toLocaleDateString()}</span>
                </div>
              )}
              {scan.cpuTemp && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CPU Temperature:</span>
                  <span
                    className={`font-medium ${
                      scan.cpuTemp > 80 ? 'text-red-600' : scan.cpuTemp > 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}
                  >
                    {scan.cpuTemp}°C
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons in Expanded View */}
            <div className="flex gap-2 mt-4 pt-3 border-t">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert('View full details for ' + scan.staffName);
                }}
                className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors"
              >
                View Full Report
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert('Contact ' + scan.staffName);
                }}
                className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded transition-colors"
              >
                Contact Staff
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Bar Component
function MetricBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: 'green' | 'yellow' | 'red';
}) {
  const percentage = (value / max) * 100;
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {value.toFixed(1)} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
