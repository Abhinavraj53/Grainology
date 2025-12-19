import { useEffect, useState, RefObject } from 'react';

/**
 * Hook to check if a component is visible in the viewport
 * Only loads data when component is actually visible
 */
export function useIsVisible(ref: RefObject<HTMLElement>, options?: IntersectionObserverInit) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      // If no ref, assume visible (for components that don't use refs)
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}

/**
 * Hook to check if component should load data based on route/visibility
 * For components in panels, checks if the view is active
 */
export function useShouldLoadData(isActive: boolean = true) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Only load if component is active
    if (isActive) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShouldLoad(false);
    }
  }, [isActive]);

  return shouldLoad;
}

