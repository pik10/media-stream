export default function PageLoading({ message = 'Loading...', style }) {
  return (
    <div style={{ ...styles.loading, ...style }}>
      {message}
    </div>
  );
}

const styles = {
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#b0b0b0',
    fontSize: '18px'
  }
};
