import { useState, useEffect } from 'react';

export default function SearchBar({ value, onChange, placeholder = "Search videos...", margin = '20px auto' }) {
  const [inputValue, setInputValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSearch = () => {
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className="ms-searchbar" style={{ ...styles.container, margin }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={styles.input}
      />
      <div className="ms-searchbar-actions" style={styles.buttonContainer}>
        {inputValue && (
          <button
            onClick={handleClear}
            style={styles.clearButton}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <button
          onClick={handleSearch}
          style={styles.searchButton}
          aria-label="Search"
        >
          🔍
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    margin: '20px auto'
  },
  input: {
    width: '100%',
    padding: '12px 80px 12px 16px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  buttonContainer: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1
  },
  searchButton: {
    background: '#3b82f6',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '6px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
