import { useCallback, useEffect, useRef, useState } from 'react';
import { isTransientTorchError } from '@/utils/camera/torch';

const PROBE_RETRY_MS = 1500;
const PROBE_MAX_ATTEMPTS = 8;

export function useTorch(adapter, options = {}) {
    const { active = true, warmupMs = 600 } = options;

    const [supported, setSupported] = useState(null);
    const [on, setOn] = useState(false);
    const [busy, setBusy] = useState(false);

    const onRef = useRef(false);
    const adapterRef = useRef(adapter);
    adapterRef.current = adapter;

    useEffect(() => {
        if (!active) return undefined;
        let cancelled = false;
        let timer = null;
        let attempts = 0;

        const probe = async () => {
            if (cancelled) return;
            attempts += 1;
            try {
                const result = await adapterRef.current.isSupported();
                if (!cancelled) setSupported(Boolean(result));
            } catch (err) {
                if (!isTransientTorchError(err)) {
                    if (!cancelled) setSupported(false);
                    return;
                }
                if (attempts < PROBE_MAX_ATTEMPTS && !cancelled) {
                    timer = setTimeout(probe, PROBE_RETRY_MS);
                }
            }
        };

        timer = setTimeout(probe, warmupMs);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [active, warmupMs]);

    useEffect(() => {
        if (active) return;
        if (onRef.current) {
            onRef.current = false;
            setOn(false);
        }
    }, [active]);

    const setTorch = useCallback(
        async (next) => {
            if (!active) return false;
            setBusy(true);
            try {
                await adapterRef.current.set(next);
                onRef.current = next;
                setOn(next);
                return true;
            } catch (err) {
                console.warn('[useTorch] set failed:', err?.message ?? err);
                if (!isTransientTorchError(err)) setSupported(false);
                return false;
            } finally {
                setBusy(false);
            }
        },
        [active],
    );

    const toggle = useCallback(() => setTorch(!onRef.current), [setTorch]);

    useEffect(
        () => () => {
            if (!onRef.current) return;
            Promise.resolve(adapterRef.current?.set(false)).catch(() => { });
        },
        [],
    );

    return {
        supported: supported !== false,
        probed: supported !== null,
        on,
        busy,
        toggle,
        setTorch,
    };
}