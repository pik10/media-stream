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
    } catch (err) {
      console.error('Failed to update user:', err);
      showToast('error', err.response?.data?.error || 'Failed to update admin status');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    const { id: userId } = deletingUser;
    try {
      await admin.deleteUser(userId);
      await fetchUsers();
      setDeletingUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast('error', err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await admin.unlockUser(userId);
      await fetchUsers();
    } catch (err) {
      console.error('Failed to unlock user:', err);
      showToast('error', err.response?.data?.error || 'Failed to unlock user');
    }
  };

  if (loading) {
    return <div className="ms-admin-loading">Loading users...</div>;
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

  const renderAdminToggle = (user) => {
    const isSelf = Number(user.id) === currentUserId;
    const disableAdminToggle = isSelf && user.is_admin;

    return (
      <button
        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
        disabled={disableAdminToggle}
        title={disableAdminToggle ? 'You cannot remove your own admin privileges' : ''}
        className={`ms-admin-pill ${user.is_admin ? 'ms-admin-pill-primary' : 'ms-admin-pill-muted'} ${disableAdminToggle ? 'ms-admin-pill-disabled' : ''}`}
      >
        {user.is_admin ? '✓ Admin' : 'User'}
      </button>
    );
  };

  const renderActiveToggle = (user) => {
    const isSelf = Number(user.id) === currentUserId;
    const disableActiveToggle = isSelf && user.is_active;

    return (
      <button
        onClick={() => handleToggleActive(user.id, user.is_active)}
        disabled={disableActiveToggle}
        title={disableActiveToggle ? 'You cannot deactivate your own account' : ''}
        className={`ms-admin-pill ${user.is_active ? 'ms-admin-pill-success' : 'ms-admin-pill-danger'} ${disableActiveToggle ? 'ms-admin-pill-disabled' : ''}`}
      >
        {user.is_active ? 'Active' : 'Inactive'}
      </button>
    );
  };

  const renderActions = (user, mobile = false) => (
    <div className={`ms-table-actions ms-admin-actions ${mobile ? 'ms-admin-actions-mobile' : ''}`}>
      {(user.is_locked || (user.failed_attempts || 0) > 0) && (
        <button
          onClick={() => handleUnlockUser(user.id)}
          className={`ms-button ms-button-warning-solid ms-admin-action-btn ${mobile ? 'ms-admin-action-btn-text' : ''}`}
          title="Clear lockout and failed attempts"
        >
          {mobile ? 'Unlock' : '🔓'}
        </button>
      )}
      <button
        onClick={() => setEditingUser(user)}
        className={`ms-button ms-button-neutral ms-admin-action-btn ${mobile ? 'ms-admin-action-btn-text' : ''}`}
        title="Edit user"
      >
        {mobile ? 'Edit' : '✎'}
      </button>
      <button
        onClick={() => setResettingUser(user)}
        className={`ms-button ms-button-neutral ms-admin-action-btn ${mobile ? 'ms-admin-action-btn-text' : ''}`}
        title="Reset password"
      >
        {mobile ? 'Reset' : '⟳'}
      </button>
      <button
        onClick={() => setDeletingUser({ id: user.id, username: user.username })}
        className={`ms-button ms-button-danger-solid ms-admin-action-btn ${mobile ? 'ms-admin-action-btn-text' : ''}`}
        title="Delete user"
      >
        {mobile ? 'Delete' : '✕'}
      </button>
    </div>
  );

  return (
    <div className="ms-admin-users">
      <div className="ms-admin-users-header">
        <div className="ms-admin-search">
          <input
            type="text"
            placeholder="Search users... (press Enter)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="ms-input ms-input-md ms-admin-search-input"
          />
          <button
            onClick={handleSearch}
            className="ms-button ms-button-neutral ms-admin-icon-button"
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
              className="ms-button ms-button-neutral-soft ms-admin-icon-button"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ms-button ms-button-primary ms-button-pad-md ms-admin-create-button"
        >
          + Create User
        </button>
      </div>

      {pageError && <div className="ms-admin-error ms-mb-20">{pageError}</div>}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="ms-desktop-only">
        <div className="ms-table-scroll ms-admin-table-wrap">
          <table className="ms-admin-table">
            <thead>
              <tr>
                <th className="ms-admin-th">Username</th>
                <th className="ms-admin-th">Email</th>
                <th className="ms-admin-th">Libraries</th>
                <th className="ms-admin-th">Login Count</th>
                <th className="ms-admin-th">Admin</th>
                <th className="ms-admin-th">Status</th>
                <th className="ms-admin-th">Lockout</th>
                <th className="ms-admin-th">Created</th>
                <th className="ms-admin-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="ms-admin-tr">
                  <td className="ms-admin-td">{user.username}</td>
                  <td className="ms-admin-td">{user.email || '-'}</td>
                  <td className="ms-admin-td">{user.library_count}</td>
                  <td className="ms-admin-td">{user.login_count || 0}</td>
                  <td className="ms-admin-td">{renderAdminToggle(user)}</td>
                  <td className="ms-admin-td">{renderActiveToggle(user)}</td>
                  <td className="ms-admin-td">
                    <span className={user.is_locked ? 'ms-admin-lockout-warning' : 'ms-admin-lockout-text'}>
                      {formatLockoutStatus(user)}
                    </span>
                  </td>
                  <td className="ms-admin-td">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="ms-admin-td">{renderActions(user)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ms-mobile-only">
        <div className="ms-admin-mobile-list">
          {users.map((user) => (
            <article key={user.id} className="ms-admin-mobile-card">
              <h4 className="ms-admin-mobile-title">{user.username}</h4>
              <div className="ms-admin-mobile-kv">
                <span className="ms-admin-mobile-key">Email</span>
                <span className="ms-admin-mobile-value">{user.email || '-'}</span>
                <span className="ms-admin-mobile-key">Libraries</span>
                <span className="ms-admin-mobile-value">{user.library_count}</span>
                <span className="ms-admin-mobile-key">Logins</span>
                <span className="ms-admin-mobile-value">{user.login_count || 0}</span>
                <span className="ms-admin-mobile-key">Lockout</span>
                <span className={`ms-admin-mobile-value ${user.is_locked ? 'ms-admin-lockout-warning' : 'ms-admin-lockout-text'}`}>
                  {formatLockoutStatus(user)}
                </span>
                <span className="ms-admin-mobile-key">Created</span>
                <span className="ms-admin-mobile-value">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              <div className="ms-admin-mobile-actions">
                {renderAdminToggle(user)}
                {renderActiveToggle(user)}
              </div>
              {renderActions(user, true)}
            </article>
          ))}
        </div>
      </div>

      {users.length === 0 && !loading && (
        <div className="ms-admin-empty">No users found</div>
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
          currentUserId={currentUserId}
          onClose={() => setEditingUser(null)}
          onUpdated={fetchUsers}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      {deletingUser && (
        <div className="ms-confirm-overlay" onClick={() => setDeletingUser(null)}>
          <div className="ms-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ms-confirm-title">Delete User</h3>
            <p className="ms-confirm-text">
              Are you sure you want to delete user "{deletingUser.username}"? This action cannot be undone.
            </p>
            <div className="ms-confirm-actions">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="ms-button ms-button-ghost ms-button-pad-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="ms-button ms-button-danger ms-button-pad-md"
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
