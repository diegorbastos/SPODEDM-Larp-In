import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { normalizeShortVideoBlocks } from '../../domain/wellbeing';

const Context = createContext(null);
const ClockContext = createContext(Date.now());
const unavailable = {
  available: false,
  platform: 'expo-go',
  active: false,
  monitoringActive: false,
  shortVideoActive: false,
  usageAuthorized: false,
  blockingAuthorized: false,
  selected: [],
  blockedToday: 0,
  blockedByTarget: { reels: 0, shorts: 0, tiktok: 0, others: 0 },
};

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function WellbeingProvider({ service, protection, children }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [liveClock, setLiveClock] = useState(Date.now());
  const [device, setDevice] = useState(unavailable);
  const [deviceError, setDeviceError] = useState('');

  const mountedRef = useRef(true);
  const loadedRef = useRef(false);
  const pendingRef = useRef(0);
  const refreshingRef = useRef(false);
  const focusFinishingRef = useRef(false);

  const beginBusy = useCallback(() => {
    pendingRef.current += 1;
    if (mountedRef.current) setBusy(true);
  }, []);

  const endBusy = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    if (mountedRef.current && pendingRef.current === 0) setBusy(false);
  }, []);

  const accept = useCallback(result => {
    if (!mountedRef.current || !result) return;
    loadedRef.current = true;
    const now = Date.now();
    setState(result.state);
    setDevice(result.status);
    setClock(now);
    setLiveClock(now);
    setDeviceError(result.status?.usageError || '');
  }, []);

  const recover = useCallback(async e => {
    if (!mountedRef.current) return;
    setDevice(previous => ({ ...previous, active: false, shortVideoActive: false }));
    setDeviceError(e?.message || 'Não foi possível atualizar a proteção.');
    try {
      const local = await service.load();
      if (mountedRef.current) {
        loadedRef.current = true;
        setState(local);
      }
    } catch (localError) {
      if (mountedRef.current) setError(localError?.message || 'Erro ao carregar dados locais.');
    }
  }, [service]);

  const syncDevice = useCallback(async ({ loadLocalFirst = false, silent = false } = {}) => {
    if (refreshingRef.current) return null;
    refreshingRef.current = true;
    try {
      if (loadLocalFirst && !loadedRef.current) {
        try {
          const local = await service.load();
          if (mountedRef.current) {
            loadedRef.current = true;
            setState(local);
          }
        } catch (storageErr) {
          if (mountedRef.current && !silent) setError(storageErr?.message || '');
        }
      }

      const result = await withTimeout(
        protection.refresh(),
        6000,
        'Tempo de resposta do Android excedido.'
      );
      accept(result);
      return result;
    } catch (e) {
      if (mountedRef.current) {
        if (!silent || !loadedRef.current) {
          setDeviceError(e?.message || 'Falha ao sincronizar com o Android.');
        }
        setDevice(previous => ({ ...previous, active: false, shortVideoActive: false }));
      }
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [accept, protection, service]);

  const execute = useCallback(async (method, ...args) => {
    const isQuickToggle = method === 'setShortVideoBlock' || method === 'setAllShortVideoBlocks';
    if (!isQuickToggle) beginBusy();
    setError('');

    // Atualização otimista instantânea para toggles de Reels/Shorts/TikTok/Afins (0ms de atraso percebido).
    if (method === 'setShortVideoBlock' && mountedRef.current) {
      const [targetId, enabled] = args;
      setState(prev => prev ? {
        ...prev,
        shortVideoBlocks: { ...normalizeShortVideoBlocks(prev.shortVideoBlocks), [targetId]: !!enabled },
      } : prev);
    } else if (method === 'setAllShortVideoBlocks' && mountedRef.current) {
      const flag = !!args[0];
      setState(prev => prev ? {
        ...prev,
        shortVideoBlocks: { reels: flag, shorts: flag, tiktok: flag, others: flag },
      } : prev);
    }

    try {
      const result = await withTimeout(
        protection.perform(method, ...args),
        8000,
        'A operação demorou mais que o esperado. Tente novamente.'
      );
      accept(result);
      return true;
    } catch (e) {
      if (mountedRef.current) setError(e?.message || 'Não foi possível concluir esta ação.');
      await recover(e);
      return false;
    } finally {
      if (!isQuickToggle) endBusy();
    }
  }, [accept, beginBusy, endBusy, protection, recover]);

  const control = useCallback(async (method, ...args) => {
    const lockUi = method !== 'getInstalledApps';
    if (lockUi) beginBusy();
    setDeviceError('');
    try {
      const result = await withTimeout(
        protection[method](...args),
        8000,
        'O Android demorou para responder. Tente novamente.'
      );
      if (result?.state) {
        accept(result);
      } else if (method === 'requestUsageAccess' || method === 'requestBlockingAccess') {
        setTimeout(() => { syncDevice({ silent: true }); }, 400);
      } else if (method !== 'getInstalledApps') {
        const refreshed = await syncDevice({ silent: false });
        if (!refreshed) return false;
      }
      return result !== undefined && result !== null ? result : true;
    } catch (e) {
      if (method === 'getInstalledApps') return [];
      await recover(e);
      return false;
    } finally {
      if (lockUi) endBusy();
    }
  }, [accept, beginBusy, endBusy, protection, recover, syncDevice]);

  const clearError = useCallback(() => {
    setError('');
    setDeviceError('');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let resumeRecheckTimer = null;

    syncDevice({ loadLocalFirst: true, silent: true });

    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        syncDevice({ silent: true });
        if (resumeRecheckTimer) clearTimeout(resumeRecheckTimer);
        resumeRecheckTimer = setTimeout(() => {
          if (mountedRef.current && AppState.currentState === 'active') {
            syncDevice({ silent: true });
          }
        }, 600);
      }
    });

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncDevice({ silent: true });
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      if (resumeRecheckTimer) clearTimeout(resumeRecheckTimer);
      subscription.remove();
      clearInterval(interval);
    };
  }, [syncDevice]);

  useEffect(() => {
    const hasFocus = Boolean(state?.focus);
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveClock(now);
      if (!hasFocus) setClock(now);
    }, hasFocus ? 1000 : 30000);
    return () => clearInterval(timer);
  }, [state?.focus?.id]);

  useEffect(() => {
    if (!state?.focus) {
      focusFinishingRef.current = false;
      return;
    }
    if (liveClock >= state.focus.endsAt && !busy && !focusFinishingRef.current) {
      focusFinishingRef.current = true;
      execute('load').finally(() => {
        focusFinishingRef.current = false;
      });
    }
  }, [liveClock, state?.focus?.id, state?.focus?.endsAt, busy, execute]);

  const value = useMemo(() => ({
    state,
    error: error || (!state ? deviceError : ''),
    busy,
    clock,
    execute,
    device,
    deviceError,
    control,
    clearError,
  }), [state, error, deviceError, busy, clock, execute, device, control, clearError]);

  return (
    <Context.Provider value={value}>
      <ClockContext.Provider value={liveClock}>
        {children}
      </ClockContext.Provider>
    </Context.Provider>
  );
}

export function useWellbeing() { return useContext(Context); }
export function useClock() { return useContext(ClockContext); }
