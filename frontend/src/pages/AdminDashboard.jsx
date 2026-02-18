import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Navigation/Header';
import UserManagement from '../components/Admin/UserManagement';
import Statistics from '../components/Admin/Statistics';
import Performance from '../components/Admin/Performance';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className="ms-page ms-page-wide" style={styles.container}>
        <h1 className="ms-page-title" style={styles.title}>Admin Dashboard</h1>

        <div className="ms-tabs" style={styles.tabs}>
          <button
            style={activeTab === 'users' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('users')}
          >
            ◉ User Management
          </button>
          <button
            style={activeTab === 'stats' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('stats')}
          >
            ▦ Statistics
          </button>
          <button
            style={activeTab === 'performance' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('performance')}
          >
            ◴ Performance
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'stats' && <Statistics />}
          {activeTab === 'performance' && <Performance />}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: '40px 20px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 70px)'
  },
  title: {
    fontSize: '36px',
    color: '#fff',
    marginBottom: '30px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: '2px solid #333'
  },
  tab: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: '#aaa',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeTab: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: 'none',
    borderBottom: '3px solid #3b82f6',
    cursor: 'pointer',
    fontWeight: '600'
  },
  content: {
    marginTop: '20px'
  }
};
