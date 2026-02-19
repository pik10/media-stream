import { useState, useEffect } from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search videos...', margin = '20px auto' }) {
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
    <div className="ms-searchbar" style={{ '--ms-search-margin': margin }}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="ms-input ms-input-md ms-searchbar-input"
      />
      <div className="ms-searchbar-actions">
        {inputValue && (
          <button
            onClick={handleClear}
            className="ms-searchbar-clear"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <button
          onClick={handleSearch}
          className="ms-searchbar-submit"
          aria-label="Search"
        >
          🔍
        </button>
      </div>
    </div>
  );
}
