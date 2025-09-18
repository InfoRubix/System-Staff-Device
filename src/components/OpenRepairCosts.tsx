'use client';

import { useBudget } from '../contexts/BudgetContext';
import { useDevices } from '../contexts/DeviceContext';

function OpenRepairCosts() {
  const { getOpenRepairCosts, getTotalProjectedSpend, loading } = useBudget();
  const { devices } = useDevices();

  const openRepairs = getOpenRepairCosts();
  const totalProjected = getTotalProjectedSpend();

  // Helper function to get device info by ID
  const getDeviceInfo = (deviceId: string) => {
    const device = devices?.find(d => d.id === deviceId);
    return device ? {
      name: device.staffName,
      department: device.department,
      deviceModel: device.deviceModel || 'Unknown Model'
    } : {
      name: 'Unknown Device',
      department: 'Unknown',
      deviceModel: 'Unknown Model'
    };
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('MYR', 'RM');
  };

  // Format date
  const formatDate = (date?: Date): string => {
    if (!date) return 'TBD';
    return date.toLocaleDateString('en-MY', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Open Repair Costs</h3>
          <div className="animate-pulse w-20 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Open Repair Costs</h3>
          <p className="text-sm text-gray-600">Active repairs contributing to projected spend</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Projected</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalProjected)}</p>
        </div>
      </div>

      {/* Table */}
      {openRepairs.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Open Repairs</h4>
          <p className="text-gray-600">All devices are in good condition!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Device</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Issue Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Est. Cost</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">ETA</th>
              </tr>
            </thead>
            <tbody>
              {openRepairs.map((repair) => {
                const deviceInfo = getDeviceInfo(repair.deviceId);
                return (
                  <tr key={repair.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{deviceInfo.name}</p>
                        <p className="text-xs text-gray-500">{deviceInfo.deviceModel}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {deviceInfo.department}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{repair.issueType}</p>
                        {repair.estimationExplanation && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-600">Age-based estimate:</p>
                            <div className="mt-1">
                              <span className="inline-flex px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                {repair.ageAtFailure} years old → {((repair.estimatedCost / (repair.ageAtFailure <= 3 ? 0.20 : repair.ageAtFailure <= 7 ? 0.50 : repair.ageAtFailure <= 10 ? 0.80 : 1.00)) / 1000).toFixed(1)}k replacement
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {repair.ageAtFailure <= 3 ? '20%' : repair.ageAtFailure <= 7 ? '50%' : repair.ageAtFailure <= 10 ? '80%' : '100%'} of replacement cost
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(repair.estimatedCost)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(repair.status)}`}>
                        {repair.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-600">
                      {formatDate(repair.eta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {openRepairs.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{openRepairs.length} open repair{openRepairs.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>
                {openRepairs.filter(r => r.status === 'In Progress').length} in progress
              </span>
              <span>•</span>
              <span>
                {openRepairs.filter(r => r.status === 'Open').length} pending
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Average Cost</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(totalProjected / openRepairs.length)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpenRepairCosts;