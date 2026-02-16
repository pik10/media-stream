import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <header className="header">
      <div className="container">
        <div className="brand" onClick={() => handleNavClick('/')}>
          <span className="brandIcon">🎬</span>
          <span className="brandText">Media Stream</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="nav">
          <button
            onClick={() => navigate('/')}
            className={`navButton ${isActive('/') && location.pathname === '/' ? 'navButtonActive' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/libraries')}
            className={`navButton ${isActive('/libraries') ? 'navButtonActive' : ''}`}
          >
            Libraries
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`navButton ${isActive('/settings') ? 'navButtonActive' : ''}`}
          >
            Settings
          </button>
        </nav>

        <button onClick={handleLogout} className="logoutButton">
          Logout
        </button>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="hamburger"
          aria-label="Toggle menu"
        >
          <div className="hamburgerLine"></div>
          <div className="hamburgerLine"></div>
          <div className="hamburgerLine"></div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobileMenu">
          <button
            onClick={() => handleNavClick('/')}
            className={`mobileNavButton ${isActive('/') && location.pathname === '/' ? 'mobileNavButtonActive' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavClick('/libraries')}
            className={`mobileNavButton ${isActive('/libraries') ? 'mobileNavButtonActive' : ''}`}
          >
            Libraries
          </button>
          <button
            onClick={() => handleNavClick('/settings')}
            className={`mobileNavButton ${isActive('/settings') ? 'mobileNavButtonActive' : ''}`}
          >
            Settings
          </button>
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="mobileLogoutButton"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
