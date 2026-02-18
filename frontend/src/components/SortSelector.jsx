export default function SortSelector({ sort, order, onSortChange }) {
  const handleSortChange = (e) => {
    onSortChange(e.target.value, order);
  };

  const toggleOrder = () => {
    const newOrder = order === 'asc' ? 'desc' : 'asc';
    onSortChange(sort, newOrder);
  };

  const sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' }
  ];

  return (
    <div className="ms-sort-controls" style={styles.container}>
      <label style={styles.label}>Sort by:</label>

      <select
        value={sort}
        onChange={handleSortChange}
        style={styles.select}
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleOrder}
        style={styles.orderButton}
        title={order === 'asc' ? 'Ascending' : 'Descending'}
      >
        {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '16px auto',
    justifyContent: 'center'
  },
  label: {
    fontSize: '14px',
    color: '#aaa',
    fontWeight: '500'
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '2px solid #333',
    borderRadius: '6px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  orderButton: {
    padding: '8px 12px',
    fontSize: '18px',
    border: '2px solid #333',
    borderRadius: '6px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
    lineHeight: 1,
    minWidth: '40px',
    transition: 'all 0.2s'
  }
};
