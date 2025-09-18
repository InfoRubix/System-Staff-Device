'use client';

import { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';

function BudgetCard() {
  const {
    currentBudget,
    budgetAlerts,
    getBudgetChangePercentage,
    getEstimatedRepairCosts,
    getEstimatedReplacementCosts,
    getEstimationByDeviceType,
    getEstimationByDepartment,
    loading
  } = useBudget();
  
  const [showPopup, setShowPopup] = useState(false);

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

  const changePercentage = getBudgetChangePercentage();
  const isIncrease = changePercentage >= 0;
  const formattedPercentage = Math.abs(changePercentage).toFixed(1);

  // Get estimation totals
  const estimatedRepairCosts = getEstimatedRepairCosts();
  const estimatedReplacementCosts = getEstimatedReplacementCosts();
  const totalEstimation = estimatedRepairCosts + estimatedReplacementCosts;

  // Get department breakdown
  const departmentBreakdown = getEstimationByDepartment();

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
        className="bg-white dark:bg-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 p-3 sm:p-4 h-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
        onClick={() => setShowPopup(true)}
      >
        {/* Card Content */}
        <div className="h-full flex flex-col justify-center items-center text-center">
          <div className="mb-2 sm:mb-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 sm:mb-2">Estimated Total Cost</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-MY', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 leading-tight">
              {formatCurrency(totalEstimation)}
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span>Click for details</span>
          </div>
        </div>
      </div>

      {/* Department Breakdown Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPopup(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 w-full max-w-md sm:max-w-2xl mx-auto my-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl sm:text-2xl font-bold z-10"
              >
                ×
              </button>

              {/* Modal Content */}
              <div className="pt-6 sm:pt-8 space-y-4 sm:space-y-6">
                {/* Title */}
                <div className="text-center">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-1 pr-8">
                    Estimated Cost Breakdown by Department
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {new Date().toLocaleDateString('en-MY', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Department Breakdown */}
                {Object.keys(departmentBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(departmentBreakdown).map(([department, costs]) => {
                      const subtotal = costs.repair + costs.replacement;
                      if (subtotal === 0) return null;

                      return (
                        <div key={department} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="font-semibold text-gray-900 dark:text-white mb-3">{department}</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Estimated Repairs:</span>
                              <span className="font-medium text-orange-700 dark:text-orange-400">{formatCurrency(costs.repair)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Estimated Replacements:</span>
                              <span className="font-medium text-red-700 dark:text-red-400">{formatCurrency(costs.replacement)}</span>
                            </div>
                            <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                              <div className="flex justify-between font-semibold">
                                <span className="text-gray-800 dark:text-gray-200">Subtotal:</span>
                                <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Overall Total */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 rounded-lg p-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800 dark:text-white">Overall Estimated Total Cost:</span>
                        <span className="text-xl font-bold text-blue-900 dark:text-blue-300">{formatCurrency(totalEstimation)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 text-center">
                    <div className="mb-2">
                      <svg className="w-8 h-8 mx-auto text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-white font-medium">
                      No Repair or Replacement Costs
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      All devices are in good condition
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BudgetCard;

