import { useState, useEffect, useRef } from 'react';

/**
 * useLazyLoad - Intersection Observer hook for lazy loading
 * Returns a ref to attach to an element and a boolean indicating visibility
 * Element renders only when it enters the viewport
 */
export default function useLazyLoad(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Start loading 100px before element enters viewport
        ...options
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isVisible];
}
