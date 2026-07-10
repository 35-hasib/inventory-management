import { useEffect, useState } from "react";

// Returns a debounced copy of `value` that only updates after `delay` ms have
// passed without a change. Use for search inputs so the API is called once the
// user stops typing, not on every keystroke.
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
