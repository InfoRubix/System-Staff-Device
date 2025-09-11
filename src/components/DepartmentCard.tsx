'use client';

import { Department } from '../types/device';

interface DepartmentStats {
  totalDevices: number;
  staffCount: number;
  workingDevices: number;
  brokenDevices: number;
  underRepairDevices: number;
}

interface DepartmentCardProps {
  department: Department;
  stats: DepartmentStats;
  onClick: () => void;
}

function DepartmentCard({ department, stats, onClick }: DepartmentCardProps) {
  // Department colors and emojis
  const getDepartmentStyle = (dept: Department) => {
    const styles = {
      'MARKETING': {
        gradient: 'from-purple-500 to-pink-600',
        bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
        border: 'border-purple-200',
        emoji: '📢',
        accent: 'text-purple-600'
      },
      'RUBIX': {
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        emoji: '🔷',
        accent: 'text-blue-600'
      },
      'CONVEY': {
        gradient: 'from-green-500 to-teal-600',
        bg: 'bg-gradient-to-br from-green-50 to-teal-50',
        border: 'border-green-200',
        emoji: '🚚',
        accent: 'text-green-600'
      },
      'ACCOUNT': {
        gradient: 'from-yellow-500 to-orange-600',
        bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
        border: 'border-yellow-200',
        emoji: '💰',
        accent: 'text-yellow-600'
      },
      'HR': {
        gradient: 'from-rose-500 to-red-600',
        bg: 'bg-gradient-to-br from-rose-50 to-red-50',
        border: 'border-rose-200',
        emoji: '👥',
        accent: 'text-rose-600'
      },
      'LITIGATION': {
        gradient: 'from-gray-600 to-slate-700',
        bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
        border: 'border-gray-200',
        emoji: '⚖️',
        accent: 'text-gray-600'
      },
      'SANCO': {
        gradient: 'from-emerald-500 to-green-600',
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        emoji: '🏥',
        accent: 'text-emerald-600'
      },
      'POT/POC': {
        gradient: 'from-cyan-500 to-blue-600',
        bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
        border: 'border-cyan-200',
        emoji: '🔬',
        accent: 'text-cyan-600'
      },
      'AFC': {
        gradient: 'from-violet-500 to-purple-600',
        bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
        border: 'border-violet-200',
        emoji: '⚡',
        accent: 'text-violet-600'
      }
    };
    
    return styles[dept] || styles['MARKETING'];
  };

  const style = getDepartmentStyle(department);
  const healthPercentage = stats.totalDevices > 0 
    ? Math.round((stats.workingDevices / stats.totalDevices) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className={`${style.bg} ${style.border} border-2 rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-md touch-manipulation group relative overflow-hidden`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-8 gap-1 h-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div key={i} className="bg-current rounded-full"></div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${style.gradient} rounded-lg flex items-center justify-center text-white text-lg sm:text-xl shadow-lg`}>
              {style.emoji}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">{department}</h3>
              <p className="text-xs text-gray-600">Department</p>
            </div>
          </div>
          
          {/* Health Indicator */}
          <div className="text-right">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
              healthPercentage >= 80 ? 'bg-green-100 text-green-800' :
              healthPercentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {healthPercentage}% Healthy
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Total Devices */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalDevices}</div>
            <div className="text-xs text-gray-600">Total Devices</div>
          </div>

          {/* Staff Count */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="text-lg sm:text-xl font-bold text-gray-900">{stats.staffCount}</div>
            <div className="text-xs text-gray-600">Staff Members</div>
          </div>

          {/* Working Devices */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="text-sm sm:text-base font-semibold text-gray-900">{stats.workingDevices}</div>
            </div>
            <div className="text-xs text-gray-600">Working</div>
          </div>

          {/* Issues (Broken + Under Repair) */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="text-sm sm:text-base font-semibold text-gray-900">
                {stats.brokenDevices + stats.underRepairDevices}
              </div>
            </div>
            <div className="text-xs text-gray-600">Issues</div>
          </div>
        </div>

        {/* Click Indicator */}
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
          <span>Click to view details</span>
          <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default DepartmentCard;