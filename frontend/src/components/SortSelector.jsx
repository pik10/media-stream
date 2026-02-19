export default function SortSelector({ sort, order, onSortChange, margin = '16px auto' }) {
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
    <div className="ms-sort-controls" style={{ '--ms-sort-margin': margin }}>
      <label className="ms-sort-label">Sort by:</label>

      <select
        value={sort}
        onChange={handleSortChange}
        className="ms-sort-select"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleOrder}
        className="ms-sort-order"
        title={order === 'asc' ? 'Ascending' : 'Descending'}
      >
        {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
