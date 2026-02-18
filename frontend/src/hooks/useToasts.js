import { useCallback, useEffect, useRef, useState } from 'react';

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((type, text, timeoutMs = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, type, text }]);

    if (timeoutMs > 0) {
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, timeoutMs);
      timersRef.current.set(id, timer);
    }
  }, []);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  return { toasts, showToast, dismissToast };
}
