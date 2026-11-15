import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const Context = createContext(null);

export function WellbeingProvider({ service, children }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());

  async function execute(method, ...args) {
    setBusy(true);
    setError('');
    try {
      const next = await service[method](...args);
      setState(next);
      setClock(Date.now());
      return true;
    } catch (e) {
      setError(e.message || 'Não foi possível salvar. Tente novamente.');
      return false;
    } finally { setBusy(false); }
  }

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const next = await service.load();
        if (mounted) { setState(next); setError(''); setClock(Date.now()); }
      } catch (e) { if (mounted) setError(e.message); }
    };
    refresh();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') refresh(); });
    return () => { mounted = false; subscription.remove(); };
  }, [service]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), state?.focus ? 1000 : 30000);
    return () => clearInterval(timer);
  }, [state?.focus?.id]);

  useEffect(() => {
    if (state?.focus && clock >= state.focus.endsAt && !busy && !error) execute('load');
  }, [clock, state?.focus?.id, busy, error]);

  return <Context.Provider value={{ state, error, busy, clock, execute, clearError: () => setError('') }}>{children}</Context.Provider>;
}
export function useWellbeing() { return useContext(Context); }
