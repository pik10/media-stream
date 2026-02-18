import { useState, useEffect } from 'react';
import { admin } from '../../services/api';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import ToastStack from '../UI/ToastStack';
import { useToasts } from '../../hooks/useToasts';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const { toasts, showToast, dismissToast } = useToasts();
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();
  const currentUserId = Number(currentUser.id);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await admin.listUsers({ search: searchQuery });
      setUsers(response.data.users);
      setPageError('');
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setPageError('Failed to load users');
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
    if (userId === currentUserId && currentStatus === true) return;

    try {
      await admin.updateUser(userId, { is_active: !currentStatus });
      await fetchUsers();
      showToast('success', `User marked as ${currentStatus ? 'inactive' : 'active'}`);
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('error', err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    if (userId === currentUserId && currentStatus === true) return;

    try {
      await admin.updateUser(userId, { is_admin: !currentStatus });
      await fetchUsers();
      showToast('success', `${currentStatus ? 'Removed' : 'Granted'} admin privileges`);
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('error', err.response?.data?.error || 'Failed to update admin status');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    const { id: userId, username } = deletingUser;
    try {
      await admin.deleteUser(userId);
      await fetchUsers();
      showToast('success', `Deleted user "${username}"`);
      setDeletingUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('error', err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleUnlockUser = async (userId, username) => {
    try {
      await admin.unlockUser(userId);
      await fetchUsers();
      showToast('success', `Cleared lockout for ${username}`);
    } catch (err) {
      console.error('Failed to unlock user:', err);
      showToast('error', err.response?.data?.error || 'Failed to unlock user');
    }
  };

  const handleResetPassword = (user) => {
    setResettingUser(user);
  };

  const handlePasswordResetSuccess = async () => {
    await fetchUsers();
    showToast('success', 'Password reset successfully');
  };

  const handleCreateSuccess = async () => {
    await fetchUsers();
    showToast('success', 'User created successfully');
  };

  const handleEditSuccess = async () => {
    await fetchUsers();
    showToast('success', 'User updated successfully');
  };

  if (loading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  const formatLockoutStatus = (user) => {
    if (user.is_locked && user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60000));
      return `Locked (${minutes}m)`;
    }

    if ((user.failed_attempts || 0) > 0) {
      return `${user.failed_attempts} failed`;
    }

    return 'None';
  };

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

      {pageError && <div style={styles.error}>{pageError}</div>}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

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
              <th style={styles.th}>Lockout</th>
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
                  {(() => {
                    const isSelf = Number(user.id) === currentUserId;
                    const disableAdminToggle = isSelf && user.is_admin;
                    return (
                  <button
                    onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                    disabled={disableAdminToggle}
                    title={disableAdminToggle ? 'You cannot remove your own admin privileges' : ''}
                    style={{
                      ...(user.is_admin ? styles.adminBadge : styles.notAdminBadge),
                      ...(disableAdminToggle ? styles.disabledToggle : {})
                    }}
                  >
                    {user.is_admin ? '✓ Admin' : 'User'}
                  </button>
                    );
                  })()}
                </td>
                <td style={styles.td}>
                  {(() => {
                    const isSelf = Number(user.id) === currentUserId;
                    const disableActiveToggle = isSelf && user.is_active;
                    return (
                  <button
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    disabled={disableActiveToggle}
                    title={disableActiveToggle ? 'You cannot deactivate your own account' : ''}
                    style={{
                      ...(user.is_active ? styles.activeBadge : styles.inactiveBadge),
                      ...(disableActiveToggle ? styles.disabledToggle : {})
                    }}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                    );
                  })()}
                </td>
                <td style={styles.td}>
                  <span style={user.is_locked ? styles.lockedBadge : styles.lockoutText}>
                    {formatLockoutStatus(user)}
                  </span>
                </td>
                <td style={styles.td}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <div className="ms-table-actions" style={styles.actions}>
                    {(user.is_locked || (user.failed_attempts || 0) > 0) && (
                      <button
                        onClick={() => handleUnlockUser(user.id, user.username)}
                        style={styles.unlockButton}
                        title="Clear lockout and failed attempts"
                      >
                        🔓
                      </button>
                    )}
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
                      onClick={() => setDeletingUser({ id: user.id, username: user.username })}
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
          onCreated={handleCreateSuccess}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUserId={currentUserId}
          onClose={() => setEditingUser(null)}
          onUpdated={handleEditSuccess}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={handlePasswordResetSuccess}
        />
      )}

      {deletingUser && (
        <div style={styles.confirmOverlay} onClick={() => setDeletingUser(null)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>Delete User</h3>
            <p style={styles.confirmText}>
              Are you sure you want to delete user "{deletingUser.username}"? This action cannot be undone.
            </p>
            <div style={styles.confirmActions}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                style={styles.confirmCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                style={styles.confirmDelete}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
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
  disabledToggle: {
    opacity: 0.55,
    cursor: 'not-allowed'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  lockoutText: {
    color: '#aaa',
    fontSize: '12px'
  },
  lockedBadge: {
    color: '#f59e0b',
    fontSize: '12px',
    fontWeight: '600'
  },
  unlockButton: {
    padding: '6px 10px',
    backgroundColor: '#f59e0b',
    color: '#111',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
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
  },
  confirmOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1300
  },
  confirmModal: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '420px',
    padding: '20px'
  },
  confirmTitle: {
    margin: 0,
    marginBottom: '12px',
    color: '#fff',
    fontSize: '20px'
  },
  confirmText: {
    margin: 0,
    marginBottom: '18px',
    color: '#ccc',
    lineHeight: 1.4
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  confirmCancel: {
    padding: '10px 14px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  confirmDelete: {
    padding: '10px 14px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  }
};
