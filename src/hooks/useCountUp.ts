import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  duration?: number; // Animation duration in milliseconds
  easing?: (t: number) => number; // Easing function
}

export function useCountUp(
  target: number,
  options: UseCountUpOptions = {}
) {
  const { duration = 1000, easing = (t) => t * (2 - t) } = options; // Default easeOutQuad
  const [current, setCurrent] = useState(target);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<number>(target);
  const mountTimeRef = useRef<number>(Date.now());
  const INIT_GRACE_PERIOD = 2000; // 2 seconds grace period after mount

  useEffect(() => {
    // If we're within the grace period after mount, don't animate
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < INIT_GRACE_PERIOD) {
      setCurrent(target);
      return;
    }

    // If target hasn't changed, don't animate
    if (target === current) return;

    // Only animate if the new value is higher (count up only)
    if (target < current) {
      setCurrent(target);
      return;
    }

    setIsAnimating(true);
    startValueRef.current = current;
    startTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || now);
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = easing(progress);
      const newValue = startValueRef.current + (target - startValueRef.current) * easedProgress;
      
      setCurrent(Math.round(newValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration, easing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { value: current, isAnimating };
} 