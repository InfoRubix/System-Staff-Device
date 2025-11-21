'use client';

import { useState, useEffect } from 'react';

interface YearMonthFilterProps {
  onFilterChange: (year: string, month: string) => void;
  availableYears?: number[];
}

export default function YearMonthFilter({ onFilterChange, availableYears }: YearMonthFilterProps) {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Generate years list (use provided or default to last 5 years)
  const years = availableYears || Array.from({ length: 5 }, (_, i) => currentYear - i);

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  useEffect(() => {
    onFilterChange(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, onFilterChange]);

  const handleReset = () => {
    setSelectedYear('all');
    setSelectedMonth('all');
  };

  return (
    <div className="backdrop-blur-2xl bg-white/50 border-4 border-blue-200 rounded-xl p-4 mb-6 shadow-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">Filter by Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium"
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={selectedYear === 'all'}
            className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="all">All Months</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          {/* Reset Button */}
          {(selectedYear !== 'all' || selectedMonth !== 'all') && (
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>

        {/* Current Selection Display */}
        <div className="text-sm text-gray-600 font-medium">
          {selectedYear === 'all' ? (
            <span className="text-blue-600">Showing: All Time</span>
          ) : selectedMonth === 'all' ? (
            <span className="text-blue-600">Showing: {selectedYear}</span>
          ) : (
            <span className="text-blue-600">
              Showing: {months[parseInt(selectedMonth)].label} {selectedYear}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
