import { useState, useEffect, useRef, useCallback } from 'react';

export function useTaskStream<T>(url: string) {
    const [tasks, setTasks] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchStream = useCallback(async () => {
        // Cancel previous request if active
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError('');
        setTasks([]);

        try {
            const res = await fetch(url, {
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) throw new Error('Failed to fetch stream');
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the incomplete line in buffer

                const newItems: T[] = [];
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            newItems.push(parsed);
                        } catch (e) {
                            console.warn('Failed to parse NDJSON line', e);
                        }
                    }
                }

                if (newItems.length > 0) {
                    setTasks(prev => [...prev, ...newItems]);
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const parsed = JSON.parse(buffer);
                    setTasks(prev => [...prev, parsed]);
                } catch { }
            }

        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                return; // Ignore aborts
            }
            setError(err instanceof Error ? err.message : 'Unknown stream error');
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchStream();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchStream]);

    return { tasks, loading, error, refresh: fetchStream, setTasks };
}
