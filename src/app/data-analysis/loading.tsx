export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        {/* Header Skeleton */}
        <div className="mb-6 sm:mb-8">
          <div className="h-8 bg-gray-200  rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200  rounded w-96 animate-pulse"></div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Left side - KPI Cards cluster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white  rounded-lg shadow-md p-3 sm:p-4 border border-gray-200 ">
                <div className="h-4 bg-gray-200  rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-6 bg-gray-200  rounded w-24 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200  rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Right side - Budget Card */}
          <div className="bg-white  rounded-lg shadow-md border border-gray-200  p-3 sm:p-4 h-full flex flex-col justify-center items-center text-center">
            <div className="mb-2 sm:mb-3">
              <div className="h-4 bg-gray-200  rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200  rounded w-24 animate-pulse"></div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-12 bg-gray-200  rounded w-40 mb-2 animate-pulse"></div>
            </div>
            <div className="h-3 bg-gray-200  rounded w-20 animate-pulse"></div>
          </div>
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white  p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 ">
              <div className="h-5 bg-gray-200  rounded w-48 mb-3 sm:mb-4 animate-pulse"></div>
              <div className="h-64 sm:h-80 bg-gray-100  rounded flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-4 border-gray-300  border-t-gray-600  rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500 ">Loading chart...</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Export Button Skeleton */}
        <div className="text-center">
          <div className="h-10 bg-gray-200  rounded w-40 mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}