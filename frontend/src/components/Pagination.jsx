export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show: [1] ... [4] [5] [6] ... [10]
      const half = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, currentPage + half);

      if (currentPage <= half) {
        end = maxVisible;
      } else if (currentPage >= totalPages - half) {
        start = totalPages - maxVisible + 1;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="ms-pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="ms-pagination-button"
      >
        ← Previous
      </button>

      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="ms-pagination-ellipsis">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            className={`ms-pagination-button ${page === currentPage ? 'ms-pagination-button-active' : ''}`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ms-pagination-button"
      >
        Next →
      </button>
    </div>
  );
}
