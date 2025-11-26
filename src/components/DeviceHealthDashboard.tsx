'use client';

import { useState } from 'react';
import { formatDate, formatDateTime, formatTime } from '@/lib/dateFormat';

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

  // Network Health
  wifiSignalStrength?: number;  // 0-100%
  wifiLinkSpeed?: number;       // Mbps
  wifiSsid?: string;            // Network name
  wifiStatus?: string;          // Connected/Disconnected

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

interface DeviceHealthDashboardProps {
  scans: HealthScan[];
}

export default function DeviceHealthDashboard({ scans }: DeviceHealthDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter scans
  const filteredScans = scans.filter((scan) => {
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
    total: scans.length,
    healthy: scans.filter((s) => s.overallStatus === 'Healthy').length,
    warning: scans.filter((s) => s.overallStatus === 'Warning').length,
    critical: scans.filter((s) => s.overallStatus === 'Critical').length,
  };

  if (scans.length === 0) {
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
          icon=""
          color="bg-blue-500"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard
          title="Healthy"
          value={stats.healthy}
          icon=""
          color="bg-green-500"
          onClick={() => setFilter('healthy')}
          active={filter === 'healthy'}
        />
        <StatCard
          title="Warnings"
          value={stats.warning}
          icon=""
          color="bg-yellow-500"
          onClick={() => setFilter('warning')}
          active={filter === 'warning'}
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon=""
          color="bg-red-500"
          onClick={() => setFilter('critical')}
          active={filter === 'critical'}
        />
      </div>

      {/* Filters and Search */}
      <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-4">
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

      {/* Device Health Cards - Compact List */}
      <div className="backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow">
        {filteredScans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {searchTerm || filter !== 'all'
                ? 'No devices match your filters'
                : 'No health scan data available yet. Devices will appear here after their first scan.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredScans.map((scan) => (
              <HealthCard key={scan.id} scan={scan} />
            ))}
          </div>
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
      className={`backdrop-blur-2xl bg-white/30 border-4 border-white rounded-lg shadow p-6 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 text-left w-full ${
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
    blue: active ? 'bg-blue-100 border-4 border-blue-300 hover:bg-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800' : 'bg-gray-100 border-4 border-gray-300 hover:bg-gray-200 hover:border-gray-400 text-gray-700 hover:text-gray-800',
    green: active ? 'bg-green-100 border-4 border-green-300 hover:bg-green-200 hover:border-green-400 text-green-700 hover:text-green-800' : 'bg-gray-100 border-4 border-gray-300 hover:bg-gray-200 hover:border-gray-400 text-gray-700 hover:text-gray-800',
    yellow: active ? 'bg-yellow-100 border-4 border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400 text-yellow-700 hover:text-yellow-800' : 'bg-gray-100 border-4 border-gray-300 hover:bg-gray-200 hover:border-gray-400 text-gray-700 hover:text-gray-800',
    red: active ? 'bg-red-100 border-4 border-red-300 hover:bg-red-200 hover:border-red-400 text-red-700 hover:text-red-800' : 'bg-gray-100 border-4 border-gray-300 hover:bg-gray-200 hover:border-gray-400 text-gray-700 hover:text-gray-800',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
}

// Health Card Component - Compact Design
function HealthCard({ scan }: { scan: HealthScan }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    Healthy: 'bg-green-100 text-green-800',
    Warning: 'bg-yellow-100 text-yellow-800',
    Critical: 'bg-red-100 text-red-800',
  };

  const _statusIcons = {
    Healthy: '',
    Warning: '',
    Critical: '',
  };

  return (
    <div className="hover:bg-gray-50 transition-colors">
      {/* Compact Header - Always Visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          {/* Left: Staff Name and Department */}
          <div className="flex items-center gap-3 flex-1">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{scan.staffName}</h3>
              <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                {scan.department}
              </span>
            </div>
          </div>

          {/* Right: Status Badge and Arrow */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors[scan.overallStatus]}`}>
              <span className="text-sm font-semibold">{scan.overallStatus}</span>
            </div>
            <div className="text-gray-400 text-xl">
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>

        {!isExpanded && (
          <p className="text-xs text-gray-500 mt-2">
            Click for details • Last scan: {formatDate(scan.scanTimestamp)} at {formatTime(scan.scanTimestamp)}
          </p>
        )}
      </div>

      {/* Expanded Details - Only Show When Clicked */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Scan Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800">
              📅 Last scanned: {formatDateTime(scan.scanTimestamp)}
            </p>
          </div>

          {/* Hardware Metrics */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>💻</span> Hardware Health
            </h4>

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
              label="Disk Free Space"
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

            {/* WiFi Signal Strength */}
            {scan.wifiSignalStrength !== undefined && (
              <MetricBar
                label="WiFi Signal"
                value={scan.wifiSignalStrength}
                max={100}
                unit="%"
                color={scan.wifiSignalStrength < 40 ? 'red' : scan.wifiSignalStrength < 70 ? 'yellow' : 'green'}
              />
            )}

            {/* WiFi Network Info */}
            {scan.wifiSsid && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Network (SSID)</span>
                  <span className="font-medium text-gray-900">{scan.wifiSsid}</span>
                </div>
                {scan.wifiLinkSpeed && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Link Speed</span>
                    <span className="font-medium text-gray-900">{scan.wifiLinkSpeed} Mbps</span>
                  </div>
                )}
                {scan.wifiStatus && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${scan.wifiStatus.toLowerCase().includes('connected') ? 'text-green-600' : 'text-red-600'}`}>
                      {scan.wifiStatus}
                    </span>
                  </div>
                )}
              </div>
            )}

            {scan.cpuTemp && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">CPU Temperature</span>
                  <span
                    className={`font-medium ${
                      scan.cpuTemp > 80 ? 'text-red-600' : scan.cpuTemp > 70 ? 'text-yellow-600' : 'text-green-600'
                    }`}
                  >
                    {scan.cpuTemp}°C
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Security Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>🛡️</span> Security Status
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
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
            </div>
          </div>

          {/* Issues */}
          {scan.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>⚠️</span> Issues ({scan.issues.length})
              </h4>
              <div className="space-y-2">
                {scan.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`text-xs p-3 rounded-lg ${
                      issue.severity === 'critical'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : issue.severity === 'high'
                        ? 'bg-orange-50 text-orange-800 border border-orange-200'
                        : issue.severity === 'medium'
                        ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-semibold uppercase">{issue.severity}:</span>
                      <span>{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>📋</span> Device Information
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Device ID:</span>
                <span className="font-mono text-gray-900 text-xs">{scan.deviceId}</span>
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
                  <span className="text-gray-600">Last System Update:</span>
                  <span className="text-gray-900">{formatDate(scan.lastUpdate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
