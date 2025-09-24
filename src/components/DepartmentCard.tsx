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
        icon: 'MKT',
        accent: 'text-purple-600'
      },
      'RUBIX': {
        gradient: 'from-blue-500 to-indigo-600',
        bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        icon: 'RBX',
        accent: 'text-blue-600'
      },
      'CONVEY': {
        gradient: 'from-green-500 to-teal-600',
        bg: 'bg-gradient-to-br from-green-50 to-teal-50',
        border: 'border-green-200',
        icon: 'CNV',
        accent: 'text-green-600'
      },
      'ACCOUNT': {
        gradient: 'from-yellow-500 to-orange-600',
        bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
        border: 'border-yellow-200',
        icon: 'ACC',
        accent: 'text-yellow-600'
      },
      'HR': {
        gradient: 'from-rose-500 to-red-600',
        bg: 'bg-gradient-to-br from-rose-50 to-red-50',
        border: 'border-rose-200',
        icon: 'HR',
        accent: 'text-rose-600'
      },
      'LITIGATION': {
        gradient: 'from-gray-600 to-slate-700',
        bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
        border: 'border-gray-200',
        icon: 'LIT',
        accent: 'text-gray-600'
      },
      'SANCO': {
        gradient: 'from-emerald-500 to-green-600',
        bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
        border: 'border-emerald-200',
        icon: 'SAN',
        accent: 'text-emerald-600'
      },
      'POT/POC': {
        gradient: 'from-cyan-500 to-blue-600',
        bg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
        border: 'border-cyan-200',
        icon: 'POC',
        accent: 'text-cyan-600'
      },
      'AFC': {
        gradient: 'from-violet-500 to-purple-600',
        bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
        border: 'border-violet-200',
        icon: 'AFC',
        accent: 'text-violet-600'
      },
      'RDHOMES': {
        gradient: 'from-pink-500 to-rose-600',
        bg: 'bg-gradient-to-br from-pink-50 to-rose-50',
        border: 'border-pink-200',
        icon: 'RD',
        accent: 'text-pink-600'
      },
      'QHOMES': {
        gradient: 'from-indigo-500 to-blue-600',
        bg: 'bg-gradient-to-br from-indigo-50 to-blue-50',
        border: 'border-indigo-200',
        icon: 'QH',
        accent: 'text-indigo-600'
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
      className={`${style.bg} ${style.border} border-2 rounded-lg p-2 sm:p-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-md touch-manipulation group relative overflow-hidden`}
    >

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center justify-center mb-2">
            <div className={`w-6 h-6 bg-gradient-to-r ${style.gradient} rounded-md flex items-center justify-center text-white text-xs font-bold shadow-md`}>
              {style.icon}
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-gray-900  text-xs leading-tight">{department}</h3>
            <div className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium mt-1 ${
              healthPercentage >= 80 ? 'bg-green-100  text-green-800 ' :
              healthPercentage >= 60 ? 'bg-yellow-100  text-yellow-800 ' :
              'bg-red-100  text-red-800 '
            }`}>
              {healthPercentage}%
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-1">
          {/* Total Devices */}
          <div className="bg-white/80  backdrop-blur-sm rounded p-1.5 border border-white/60  text-center">
            <div className="text-sm font-bold text-gray-900 ">{stats.totalDevices}</div>
            <div className="text-xs text-gray-600  leading-tight">Devices</div>
          </div>

          {/* Staff Count */}
          <div className="bg-white/80  backdrop-blur-sm rounded p-1.5 border border-white/60  text-center">
            <div className="text-sm font-bold text-gray-900 ">{stats.staffCount}</div>
            <div className="text-xs text-gray-600  leading-tight">Staff</div>
          </div>

          {/* Working Devices */}
          <div className="bg-white/80  backdrop-blur-sm rounded p-1.5 border border-white/60  text-center">
            <div className="flex items-center justify-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-400  rounded-full"></div>
              <div className="text-sm font-bold text-gray-900 ">{stats.workingDevices}</div>
            </div>
            <div className="text-xs text-gray-600  leading-tight">Working</div>
          </div>

          {/* Issues (Broken + Needs Repair) */}
          <div className="bg-white/80  backdrop-blur-sm rounded p-1.5 border border-white/60  text-center">
            <div className="flex items-center justify-center space-x-1">
              <div className="w-1.5 h-1.5 bg-red-400  rounded-full"></div>
              <div className="text-sm font-bold text-gray-900 ">
                {stats.brokenDevices + stats.underRepairDevices}
              </div>
            </div>
            <div className="text-xs text-gray-600  leading-tight">Issues</div>
          </div>
        </div>

        {/* Click Indicator */}
        <div className="mt-1 text-center">
          <div className="text-xs text-gray-500  group-hover:text-gray-700  transition-colors">
            Click for details
          </div>
        </div>
      </div>
    </div>
  );
}

export default DepartmentCard;