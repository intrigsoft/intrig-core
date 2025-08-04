import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

export function useDebounceState<T>(
  initialValue: T,
  delayMs: number
): [T, Dispatch<SetStateAction<T>>, T] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const handler = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // clear any pending timer
    if (handler.current) {
      clearTimeout(handler.current);
    }
    // schedule update
    handler.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // cleanup on value or delay change (and on unmount)
    return () => {
      if (handler.current) {
        clearTimeout(handler.current);
      }
    };
  }, [value, delayMs]);

  return [value, setValue, debouncedValue];
}
