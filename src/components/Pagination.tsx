interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage: _itemsPerPage,
  startIndex,
  endIndex,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white/50 border-2 border-white rounded-lg">
      {/* Info */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-semibold">{startIndex}</span> to{' '}
        <span className="font-semibold">{Math.min(endIndex, totalItems)}</span> of{' '}
        <span className="font-semibold">{totalItems}</span> results
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            md:bg-white md:border-2 md:border-gray-300 md:text-gray-700 md:hover:bg-gray-50 md:hover:border-gray-400
            bg-blue-600 border-2 border-blue-700 text-white"
        >
          Previous
        </button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...' || page === currentPage}
              className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-2 border-blue-700'
                    : page === '...'
                    ? 'cursor-default text-gray-400'
                    : 'md:bg-white md:border-2 md:border-gray-300 md:text-gray-700 md:hover:bg-gray-50 md:hover:border-gray-400 bg-gray-100 border-2 border-gray-300 text-gray-700'
                }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Mobile: Current Page Indicator */}
        <div className="sm:hidden px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium border-2 border-blue-700">
          {currentPage} / {totalPages}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            md:bg-white md:border-2 md:border-gray-300 md:text-gray-700 md:hover:bg-gray-50 md:hover:border-gray-400
            bg-blue-600 border-2 border-blue-700 text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
