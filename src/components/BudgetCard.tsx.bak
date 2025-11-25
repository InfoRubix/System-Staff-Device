'use client';

import { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';

function BudgetCard() {
  const {
    currentBudget,
    getEstimatedRepairCosts,
    getEstimatedReplacementCosts,
    getEstimationByDepartment,
    getDevicesWithRepairDetails,
    loading
  } = useBudget();

  const [showPopup, setShowPopup] = useState(false);

  // Get devices with repair details from BudgetContext
  const devicesWithIssues = getDevicesWithRepairDetails();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-xl shadow-lg p-6 text-white h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-300 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm opacity-80">Loading</p>
        </div>
      </div>
    );
  }

  if (!currentBudget) {
    return (
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-xl shadow-lg p-6 text-white h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm opacity-80">Budget data unavailable</p>
        </div>
      </div>
    );
  }

  // Get estimation totals
  const estimatedRepairCosts = getEstimatedRepairCosts();
  const estimatedReplacementCosts = getEstimatedReplacementCosts();
  const totalEstimation = estimatedRepairCosts + estimatedReplacementCosts;

  // Get department breakdown
  const departmentBreakdown: Record<string, { repair: number; replacement: number; count: number }> = getEstimationByDepartment();

  // Format number with commas for better readability
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('MYR', 'RM');
  };

  return (
    <>
      <div
        className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-lg shadow-lg p-3 sm:p-4 h-full cursor-pointer hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
        onClick={() => setShowPopup(true)}
      >
        {/* Card Content */}
        <div className="h-full flex flex-col justify-center items-center text-center">
          <div className="mb-2 sm:mb-3">
            <p className="text-xs font-medium text-white/90 mb-1 sm:mb-2">Estimated Repair Cost</p>
            <p className="text-xs text-white/70">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-3 leading-tight drop-shadow-lg">
              {formatCurrency(totalEstimation)}
            </div>
          </div>

          <div className="text-xs text-white/80">
            <span>Click for details</span>
          </div>
        </div>
      </div>

      {/* Detailed Repair Cost Report Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-4">
          {/* Backdrop - Cover entire screen */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPopup(false)}
          ></div>

          {/* Modal Content - Made wider and taller to cover full screen */}
          <div className="relative bg-white rounded-xl shadow-2xl border-2 border-gray-300 w-full max-w-7xl mx-auto my-2 sm:my-4 min-h-[92vh] max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
              >
                ×
              </button>

              {/* Report Header */}
              <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                  Estimated Repair Cost Report
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {new Date().toLocaleDateString('en-MY', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {Object.keys(departmentBreakdown).length > 0 ? (
                <>
                  {/* Department Cost Summary Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 uppercase">Department Cost Summary</h3>
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-300">Department</th>
                            <th className="text-right px-4 py-3 font-bold text-gray-700 border-b-2 border-gray-300">Total Cost (RM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(departmentBreakdown).map(([department, costs], index) => {
                            const subtotal = costs.repair + costs.replacement;
                            if (subtotal === 0) return null;

                            return (
                              <tr key={department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 text-gray-800 border-b border-gray-200">{department}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-900 border-b border-gray-200">
                                  {formatCurrency(subtotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed Breakdown by Staff */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase border-t-2 border-gray-300 pt-6">
                      Detailed Breakdown by Staff
                    </h3>

                    {Object.entries(departmentBreakdown).map(([department, costs]) => {
                      const subtotal = costs.repair + costs.replacement;
                      if (subtotal === 0) return null;

                      const departmentDevices = devicesWithIssues.filter(
                        device => device.department === department
                      );

                      if (departmentDevices.length === 0) return null;

                      return (
                        <div key={department} className="mb-6">
                          {/* Department Header */}
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-t-lg px-4 py-3">
                            <h4 className="font-bold text-gray-800 uppercase">{department} Department</h4>
                          </div>

                          {/* Staff List */}
                          <div className="border-2 border-blue-200 border-t-0 rounded-b-lg overflow-hidden">
                            {departmentDevices.map((device, index) => (
                              <div key={device.id} className={`p-4 ${index !== departmentDevices.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                {/* Staff Info */}
                                <div className="mb-3">
                                  <div className="font-semibold text-gray-900">Staff: {device.staffName}</div>
                                  <div className="text-sm text-gray-600">Email: {device.staffEmail}</div>
                                </div>

                                {/* Issues Table */}
                                <div className="border border-gray-300 rounded-lg overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-300">
                                          Issue Detected
                                        </th>
                                        <th className="text-right px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-300">
                                          Repair Cost (RM)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {device.issues.map((issue, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                                          <td className="px-3 py-2 text-sm text-gray-700">{issue.name}</td>
                                          <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                                            {formatCurrency(issue.cost)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="bg-gray-100">
                                        <td className="px-3 py-2 text-sm font-bold text-gray-800">SUBTOTAL</td>
                                        <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                                          {formatCurrency(device.repairCost)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}

                            {/* Department Total */}
                            <div className="bg-blue-100 px-4 py-3 border-t-2 border-blue-300">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800">
                                  {department} Department Total:
                                </span>
                                <span className="text-lg font-bold text-blue-900">
                                  {formatCurrency(subtotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand Total */}
                  <div className="border-4 border-blue-500 bg-blue-50 rounded-lg p-6">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-800 mb-3 uppercase">
                        Total Estimated Repair Cost
                      </h3>
                      <div className="text-4xl font-bold text-blue-900">
                        {formatCurrency(totalEstimation)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
                  <div className="mb-3">
                    <svg className="w-12 h-12 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-lg text-gray-800 font-bold mb-2">
                    No Repair or Replacement Costs
                  </div>
                  <div className="text-gray-600">
                    All devices are in good condition
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default BudgetCard;

