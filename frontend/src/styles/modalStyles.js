// Shared styles for all modal components
// Used by: CreateUserModal, EditUserModal, ResetPasswordModal, etc.

export const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modal: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%'
  },

  title: {
    fontSize: '24px',
    color: '#fff',
    marginBottom: '20px'
  },

  error: {
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  label: {
    fontSize: '14px',
    color: '#aaa',
    fontWeight: '600'
  },

  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    outline: 'none'
  },

  checkboxField: {
    display: 'flex',
    alignItems: 'center'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },

  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },

  checkboxText: {
    color: '#fff',
    fontSize: '16px'
  },

  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },

  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  submitButton: {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};
