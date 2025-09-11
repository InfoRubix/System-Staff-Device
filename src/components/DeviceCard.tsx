'use client';

import { useState } from 'react';
import { Device } from '../types/device';

interface DeviceCardProps {
  device: Device;
  onEdit: (device: Device) => void;
  onDelete: (id: string) => void;
}

function DeviceCard({ device, onEdit, onDelete }: DeviceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'Working':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Broken':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'Under Repair':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getOwnershipBadge = (ownership: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    return ownership === 'Company-owned'
      ? `${baseClasses} bg-blue-100 text-blue-800`
      : `${baseClasses} bg-purple-100 text-purple-800`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg touch-manipulation">
      {/* Compact Header - Always Visible */}
      <div 
        className="p-3 sm:p-4 cursor-pointer select-none active:bg-gray-50 transition-colors duration-150"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {device.staffName}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <span className="text-xs sm:text-sm font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full inline-block w-fit">
                {device.department}
              </span>
              <span className={`${getStatusBadge(device.status)} inline-block w-fit`}>
                {device.status}
              </span>
            </div>
          </div>
          
          {/* Expand/Collapse Icon */}
          <div className="ml-3 sm:ml-4 flex-shrink-0 p-1">
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
          {/* Device Information */}
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
            {/* Basic Device Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Device Information</h4>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Model:</span>
                  <span className="text-sm sm:text-base text-gray-900 font-medium break-words">{device.deviceModel}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Type:</span>
                  <span className="text-sm sm:text-base text-gray-900">{device.deviceType}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">OS:</span>
                  <span className="text-sm sm:text-base text-gray-900 break-words">{device.operatingSystem}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Ownership:</span>
                  <span className={getOwnershipBadge(device.ownership)}>{device.ownership}</span>
                </div>
              </div>
            </div>

            {/* Hardware Specifications */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Hardware Specifications</h4>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Processor:</span>
                  <span className="text-sm sm:text-base text-gray-900 font-medium break-words text-left sm:text-right">{device.processor}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">RAM:</span>
                  <span className="text-sm sm:text-base text-gray-900">{device.ram}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Graphics:</span>
                  <span className="text-sm sm:text-base text-gray-900 font-medium break-words text-left sm:text-right">{device.graphics}</span>
                </div>
                <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Storage:</span>
                  <span className="text-sm sm:text-base text-gray-900">{device.storage}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {device.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-md break-words">
                  {device.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(device);
                }}
                className="flex-1 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
              >
                ✏️ Edit Device
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(device.id);
                }}
                className="flex-1 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation"
              >
                🗑️ Delete Device
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceCard;