import { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await admin.listUsers({ search: searchQuery });
      setUsers(response.data.users);
      setError('');
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await admin.updateUser(userId, { is_active: !currentStatus });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} admin privileges?`)) {
      return;
    }

    try {
      await admin.updateUser(userId, { is_admin: !currentStatus });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await admin.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleResetPassword = (user) => {
    setResettingUser(user);
  };

  const handlePasswordResetSuccess = () => {
    setSuccessMessage('Password reset successfully');
    fetchUsers();
    // Auto-dismiss after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  return (
    <div className="ms-admin-users" style={styles.container}>
      <div className="ms-admin-users-header" style={styles.header}>
        <div className="ms-admin-search" style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search users... (press Enter)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.searchInput}
          />
          <button
            onClick={handleSearch}
            style={styles.searchButton}
            title="Search"
          >
            🔍
          </button>
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
              style={styles.clearButton}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          + Create User
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {successMessage && <div style={styles.success}>{successMessage}</div>}

      <div className="ms-table-scroll" style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Username</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Libraries</th>
              <th style={styles.th}>Login Count</th>
              <th style={styles.th}>Admin</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{user.username}</td>
                <td style={styles.td}>{user.email || '-'}</td>
                <td style={styles.td}>{user.library_count}</td>
                <td style={styles.td}>{user.login_count || 0}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                    style={user.is_admin ? styles.adminBadge : styles.notAdminBadge}
                  >
                    {user.is_admin ? '✓ Admin' : 'User'}
                  </button>
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    style={user.is_active ? styles.activeBadge : styles.inactiveBadge}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={styles.td}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <div className="ms-table-actions" style={styles.actions}>
                    <button
                      onClick={() => setEditingUser(user)}
                      style={styles.actionButton}
                      title="Edit user"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleResetPassword(user)}
                      style={styles.actionButton}
                      title="Reset password"
                    >
                      ⟳
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      style={styles.deleteButton}
                      title="Delete user"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div style={styles.empty}>No users found</div>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={fetchUsers}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={handlePasswordResetSuccess}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '10px'
  },
  searchContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    outline: 'none'
  },
  searchButton: {
    padding: '12px 16px',
    fontSize: '18px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  clearButton: {
    padding: '12px 16px',
    fontSize: '18px',
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  createButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#aaa',
    fontSize: '18px'
  },
  error: {
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  success: {
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '20px',
    animation: 'fadeIn 0.3s ease-out'
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    borderBottom: '2px solid #333',
    color: '#aaa',
    fontWeight: '600',
    fontSize: '14px',
    textTransform: 'uppercase'
  },
  tr: {
    borderBottom: '1px solid #333'
  },
  td: {
    padding: '16px',
    color: '#fff',
    fontSize: '14px'
  },
  adminBadge: {
    padding: '4px 12px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  notAdminBadge: {
    padding: '4px 12px',
    backgroundColor: '#333',
    color: '#aaa',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  activeBadge: {
    padding: '4px 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  inactiveBadge: {
    padding: '4px 12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    padding: '6px 10px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  deleteButton: {
    padding: '6px 10px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '16px'
  }
};
