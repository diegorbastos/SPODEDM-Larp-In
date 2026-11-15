import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const Context = createContext(null);
const unavailable = { available: false, active: false, selected: [], reportOnly: false };

export function WellbeingProvider({ service, protection, children }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [device, setDevice] = useState(unavailable);
  const [deviceError, setDeviceError] = useState('');

  function accept(result) {
    setState(result.state); setDevice(result.status); setClock(Date.now()); setDeviceError(result.status.usageError || '');
  }
  async function recover(e) {
    setDevice(previous => ({ ...previous, active: false }));
    setDeviceError(e.message || 'Não foi possível atualizar a proteção.');
    try { setState(await service.load()); } catch (localError) { setError(localError.message); }
  }
  async function execute(method, ...args) {
    setBusy(true); setError('');
    try { accept(await protection.perform(method, ...args)); return true; }
    catch (e) { setError(e.message); await recover(e); return false; }
    finally { setBusy(false); }
  }
  async function control(method, ...args) {
    setBusy(true); setDeviceError('');
    try {
      const result = await protection[method](...args);
      if (result?.state) accept(result);
      else if (method !== 'showReport') accept(await protection.refresh());
      return true;
    } catch (e) { await recover(e); return false; }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let mounted = true;
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const local = await service.load();
        if (mounted) setState(local);
        const result = await protection.refresh();
        if (mounted) accept(result);
      } catch (e) {
        if (mounted) { setDeviceError(e.message); setDevice(previous => ({ ...previous, active: false })); }
      } finally { refreshing = false; }
    }
    refresh();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') refresh(); });
    const interval = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30000);
    return () => { mounted = false; subscription.remove(); clearInterval(interval); };
  }, [service, protection]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), state?.focus ? 1000 : 30000);
    return () => clearInterval(timer);
  }, [state?.focus?.id]);
  useEffect(() => {
    if (state?.focus && clock >= state.focus.endsAt && !busy && !error) execute('load');
  }, [clock, state?.focus?.id, busy, error]);

  return <Context.Provider value={{ state, error: error || (!state ? deviceError : ''), busy, clock, execute,
    device, deviceError, control, clearError: () => { setError(''); setDeviceError(''); } }}>{children}</Context.Provider>;
}
export function useWellbeing() { return useContext(Context); }
