import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      if (document.body.dataset.theme === 'light') return 'light';
      return localStorage.getItem('ms-theme') === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  // Check if user is admin
  const isAdmin = () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');
      return user.isAdmin === true;
    } catch (e) {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.body.dataset.theme = nextTheme;
    localStorage.setItem('ms-theme', nextTheme);
  };

  return (
    <header className="ms-header">
      <div className="ms-header-container">
        <button
          type="button"
          className="ms-header-brand"
          aria-label="Go to home"
          onClick={() => handleNavClick('/')}
        >
          <span className="ms-header-brand-icon" aria-hidden="true">▶</span>
          <span className="ms-header-brand-text">Media Stream</span>
        </button>

        {/* Desktop Navigation */}
        <nav className="ms-header-nav">
          <button
            onClick={() => navigate('/')}
            className={`ms-header-nav-button ${isActive('/') && location.pathname === '/' ? 'ms-header-nav-button-active' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/libraries')}
            className={`ms-header-nav-button ${isActive('/libraries') ? 'ms-header-nav-button-active' : ''}`}
          >
            Libraries
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`ms-header-nav-button ${isActive('/settings') ? 'ms-header-nav-button-active' : ''}`}
          >
            Settings
          </button>
          {isAdmin() && (
            <button
              onClick={() => navigate('/admin')}
              className={`ms-header-nav-button ms-header-nav-button-admin ${isActive('/admin') ? 'ms-header-nav-button-active' : ''}`}
            >
              ⚡ Admin
            </button>
          )}
        </nav>

        <div className="ms-header-actions">
          <button
            onClick={handleToggleTheme}
            className="ms-button ms-button-ghost ms-header-theme-button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>
          <button onClick={handleLogout} className="ms-button ms-button-ghost ms-header-logout-button">
            Logout
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="ms-header-hamburger"
          aria-label="Toggle menu"
        >
          <div className="ms-header-hamburger-line"></div>
          <div className="ms-header-hamburger-line"></div>
          <div className="ms-header-hamburger-line"></div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="ms-header-mobile-menu">
          <button
            onClick={() => handleNavClick('/')}
            className={`ms-header-mobile-nav-button ${isActive('/') && location.pathname === '/' ? 'ms-header-mobile-nav-button-active' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('/libraries')}
            className={`ms-header-mobile-nav-button ${isActive('/libraries') ? 'ms-header-mobile-nav-button-active' : ''}`}
          >
            Libraries
          </button>
          <button
            onClick={() => handleNavClick('/settings')}
            className={`ms-header-mobile-nav-button ${isActive('/settings') ? 'ms-header-mobile-nav-button-active' : ''}`}
          >
            Settings
          </button>
          {isAdmin() && (
            <button
              onClick={() => handleNavClick('/admin')}
              className={`ms-header-mobile-nav-button ms-header-mobile-nav-button-admin ${isActive('/admin') ? 'ms-header-mobile-nav-button-active' : ''}`}
            >
              ⚡ Admin
            </button>
          )}
          <button
            onClick={handleToggleTheme}
            className="ms-header-mobile-nav-button ms-header-mobile-theme-button"
          >
            {theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          </button>
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="ms-header-mobile-logout-button"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
