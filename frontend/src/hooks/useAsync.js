import { useEffect, useRef, useState } from 'react';

// Runs an async function whenever `key` changes and tracks loading / error / data.
// `key` is a string (e.g. the query string) so callers don't need stable function references.
export function useAsync(fn, key) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((err) => {
        if (cancelled) return;
        const message = err.response?.data?.message || (err.request ? 'Cannot reach the server. Is the backend running?' : err.message);
        setState({ data: null, loading: false, error: message || 'Something went wrong' });
      });
    return () => { cancelled = true; };
  }, [key, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
