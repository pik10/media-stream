import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <header className="header">
      <div className="headerContainer">
        <button
          type="button"
          className="brand"
          aria-label="Go to home"
          onClick={() => handleNavClick('/')}
        >
          <span className="brandIcon">🎬</span>
          <span className="brandText">Media Stream</span>
        </button>

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
          {isAdmin() && (
            <button
              onClick={() => navigate('/admin')}
              className={`navButton ${isActive('/admin') ? 'navButtonActive' : ''}`}
              style={{
                color: isActive('/admin') ? '#fff' : '#3b82f6',
                fontWeight: '600'
              }}
            >
              ⚡ Admin
            </button>
          )}
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
          {isAdmin() && (
            <button
              onClick={() => handleNavClick('/admin')}
              className={`mobileNavButton ${isActive('/admin') ? 'mobileNavButtonActive' : ''}`}
              style={{
                color: isActive('/admin') ? '#fff' : '#3b82f6',
                fontWeight: '600'
              }}
            >
              ⚡ Admin
            </button>
          )}
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
