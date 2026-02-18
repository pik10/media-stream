export default function PageError({ message, style }) {
  if (!message) return null;

  return (
    <div style={{ ...styles.error, ...style }}>
      {message}
    </div>
  );
}

const styles = {
  error: {
    padding: '12px',
    borderRadius: '6px',
    background: '#dc2626',
    color: 'white',
    marginBottom: '20px'
  }
};
