import Header from '../components/Navigation/Header';
import ChangePassword from '../components/Auth/ChangePassword';

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

          <div className="ms-settings-section">
            <ChangePassword />
          </div>
        </div>
      </main>
    </div>
  );
}
