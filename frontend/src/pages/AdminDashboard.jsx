import { useState } from 'react';
import Header from '../components/Navigation/Header';
import UserManagement from '../components/Admin/UserManagement';
import Statistics from '../components/Admin/Statistics';
import Performance from '../components/Admin/Performance';
import AdminSettings from '../components/Admin/AdminSettings';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <>
      <Header />
      <div className="ms-page ms-page-wide ms-page-tall">
        <h1 className="ms-page-title ms-admin-title">Admin Dashboard</h1>

        <div className="ms-tabs ms-admin-tabs">
          <button
            className={`ms-admin-tab ${activeTab === 'users' ? 'ms-admin-tab-active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            ◉ User Management
          </button>
          <button
            className={`ms-admin-tab ${activeTab === 'stats' ? 'ms-admin-tab-active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            ▦ Statistics
          </button>
          <button
            className={`ms-admin-tab ${activeTab === 'performance' ? 'ms-admin-tab-active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            ◴ Performance
          </button>
          <button
            className={`ms-admin-tab ${activeTab === 'settings' ? 'ms-admin-tab-active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙ Settings
          </button>
        </div>

        <div className="ms-admin-content">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'stats' && <Statistics />}
          {activeTab === 'performance' && <Performance />}
          {activeTab === 'settings' && <AdminSettings />}
        </div>
      </div>
    </>
  );
}
