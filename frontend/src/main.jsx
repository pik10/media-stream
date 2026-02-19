import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

try {
  const storedTheme = localStorage.getItem('ms-theme');
  const theme = storedTheme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = theme;
} catch (e) {
  document.body.dataset.theme = 'dark';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
