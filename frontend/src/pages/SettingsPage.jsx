import { useEffect, useState } from 'react';
import Header from '../components/Navigation/Header';
import ChangePassword from '../components/Auth/ChangePassword';

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const storedTheme = localStorage.getItem('ms-theme');
    const nextTheme = storedTheme === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, []);

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('ms-theme', nextTheme);
    document.body.dataset.theme = nextTheme;
  };

  return (
    <div className="ms-settings-shell">
      <Header />
      <main className="ms-page ms-settings-main">
        <div className="ms-content-narrow">
          <h1 className="ms-page-title ms-settings-title">Settings</h1>

          <div className="ms-settings-card">
            <h3 className="ms-settings-section-title">Account Information</h3>
            <div className="ms-info-row">
              <span className="ms-info-label">Username:</span>
              <span className="ms-info-value">{user.username}</span>
            </div>
            <div className="ms-info-row">
              <span className="ms-info-label">User ID:</span>
              <span className="ms-info-value">{user.id}</span>
            </div>
          </div>

          <div className="ms-settings-card">
            <h3 className="ms-settings-section-title">Appearance</h3>
            <p className="ms-settings-theme-help">Choose your preferred color theme.</p>
            <div className="ms-settings-theme-options">
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`ms-button ms-button-pad-md ${theme === 'dark' ? 'ms-button-primary' : 'ms-button-ghost'}`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`ms-button ms-button-pad-md ${theme === 'light' ? 'ms-button-primary' : 'ms-button-ghost'}`}
              >
                Light
              </button>
            </div>
          </div>

          <div className="ms-settings-section">
            <ChangePassword />
          </div>
        </div>
      </main>
    </div>
  );
}
