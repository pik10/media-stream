import Header from '../components/Navigation/Header';
import ChangePassword from '../components/Auth/ChangePassword';

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={styles.container}>
      <Header />
      <main style={styles.main}>
        <div style={styles.content}>
          <h1 style={styles.pageTitle}>Settings</h1>

          <div style={styles.userInfo}>
            <h3 style={styles.sectionTitle}>Account Information</h3>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Username:</span>
              <span style={styles.infoValue}>{user.username}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>User ID:</span>
              <span style={styles.infoValue}>{user.id}</span>
            </div>
          </div>

          <div style={styles.section}>
            <ChangePassword />
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f0f0f'
  },
  main: {
    padding: '40px 20px'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '32px'
  },
  userInfo: {
    background: '#1a1a1a',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '16px'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #333'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#b0b0b0',
    minWidth: '100px'
  },
  infoValue: {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: '500'
  },
  section: {
    marginBottom: '32px'
  }
};
