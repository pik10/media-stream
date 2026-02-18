const styles = {
  container: {
    position: 'fixed',
    top: '84px',
    right: '24px',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '360px'
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    color: '#fff',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
  },
  success: {
    backgroundColor: '#10b981'
  },
  error: {
    backgroundColor: '#dc2626'
  },
  close: {
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: 0
  }
};

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            ...(toast.type === 'error' ? styles.error : styles.success)
          }}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            style={styles.close}
            title="Dismiss notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
