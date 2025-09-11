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
  const [isDeviceInfoExpanded, setIsDeviceInfoExpanded] = useState(false);
  const [isHardwareExpanded, setIsHardwareExpanded] = useState(false);

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
        <div className="px-2 sm:px-3 md:px-4 pb-3 sm:pb-4 bg-gradient-to-b from-gray-50/50 to-white border-t border-gray-100">
          {/* Device Information */}
          <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 md:space-y-6">
            {/* Basic Device Info */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsDeviceInfoExpanded(!isDeviceInfoExpanded)}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-md sm:rounded-lg"></div>
                  <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Device Information</h4>
                </div>
                <div className={`transform transition-transform duration-200 ${isDeviceInfoExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isDeviceInfoExpanded ? 'max-h-96 opacity-100 mt-3 sm:mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-md sm:rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Model</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 break-words ml-6 sm:ml-0 sm:text-right sm:max-w-[60%]">{device.deviceModel}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-md sm:rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Type</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 ml-6 sm:ml-0">{device.deviceType}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-purple-50 rounded-md sm:rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-4 h-4 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Operating System</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 break-words ml-6 sm:ml-0 sm:text-right sm:max-w-[50%]">{device.operatingSystem}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-orange-50 rounded-md sm:rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-4 h-4 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Ownership</span>
                    </div>
                    <span className={`${getOwnershipBadge(device.ownership)} font-semibold ml-6 sm:ml-0`}>{device.ownership}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Specifications */}
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
              <div 
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsHardwareExpanded(!isHardwareExpanded)}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-md sm:rounded-lg"></div>
                  <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Hardware Specifications</h4>
                </div>
                <div className={`transform transition-transform duration-200 ${isHardwareExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isHardwareExpanded ? 'max-h-96 opacity-100 mt-3 sm:mt-4' : 'max-h-0 opacity-0'
              }`}>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 md:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md sm:rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">CPU</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-blue-700">Processor</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 break-words ml-8 sm:ml-0 sm:text-right sm:max-w-[55%]">{device.processor}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-md sm:rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">RAM</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-green-700">Memory</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 ml-8 sm:ml-0">{device.ram}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-md sm:rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">GPU</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-orange-700">Graphics</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 break-words ml-8 sm:ml-0 sm:text-right sm:max-w-[55%]">{device.graphics}</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-md sm:rounded-lg border border-purple-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">SSD</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-purple-700">Storage</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-gray-900 ml-8 sm:ml-0">{device.storage}</span>
                  </div>
                </div>
              </div>
              
              {/* Permanent Notes Area - Always Visible */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-md"></div>
                  <h5 className="text-xs sm:text-sm md:text-base font-bold text-gray-900">Notes</h5>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-md sm:rounded-lg p-2 sm:p-3">
                  {device.notes ? (
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
                      {device.notes}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 italic">
                      No notes available
                    </p>
                  )}
                </div>
              </div>
            </div>


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(device);
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation shadow-md"
              >
                Edit Device
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(device.id);
                }}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 text-white px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation shadow-md"
              >
                Delete Device
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceCard;