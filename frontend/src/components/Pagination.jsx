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
    <div style={styles.container}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={styles.button}
      >
        ← Previous
      </button>

      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} style={styles.ellipsis}>...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            style={{
              ...styles.button,
              ...(page === currentPage ? styles.activeButton : {})
            }}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={styles.button}
      >
        Next →
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    margin: '30px 0',
    flexWrap: 'wrap'
  },
  button: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '2px solid #333',
    borderRadius: '6px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6'
  },
  ellipsis: {
    padding: '8px',
    color: '#666'
  }
};
