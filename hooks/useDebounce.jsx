import { useState, useEffect } from 'react';

/**
 * A custom hook that debounces a value. This is useful for delaying a computation
 * (like an API call for search) until the user has stopped typing for a specified time.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value, which updates only after the delay has passed.
 */
export function useDebounce(value, delay) {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Return a cleanup function that will be called if the value changes
    // before the delay has passed. This cancels the previous timer and
    // restarts it, effectively "debouncing" the value update.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // This effect re-runs only when the value or delay changes

  return debouncedValue;
}