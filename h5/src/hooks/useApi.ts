/**
 * 通用数据获取 Hook
 * 支持 loading / error / data 三状态，自动处理异步请求
 *
 * 使用方式：
 *   const { data, loading, error, refetch } = useApi(() => api.items.getList());
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await fetcherRef.current();
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败，请重试';
      setState({ data: null, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

/**
 * 防抖 Hook（用于搜索输入）
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 倒计时 Hook（用于发布后自动跳转）
 */
export function useCountdown(seconds: number): { count: number; start: () => void; reset: () => void } {
  const [count, setCount] = useState(seconds);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && count > 0) {
      timerRef.current = setInterval(() => {
        setCount((c) => {
          if (c <= 1) {
            setRunning(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, count]);

  const start = useCallback(() => {
    setCount(seconds);
    setRunning(true);
  }, [seconds]);

  const reset = useCallback(() => {
    setRunning(false);
    setCount(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [seconds]);

  return { count, start, reset };
}
