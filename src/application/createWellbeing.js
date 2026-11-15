import { dayKey, initialState, validateState, wholeMinutes } from '../domain/wellbeing.js';

export function createWellbeing(repository, now = () => new Date()) {
  // Serializa read-modify-write: dois toques não podem sobrescrever os dados.
  let queue = Promise.resolve();
  function exclusive(task) {
    const operation = queue.then(task);
    queue = operation.catch(() => {});
    return operation;
  }
  function reconcile(state, date) {
    if (state.focus && date.getTime() >= state.focus.endsAt) {
      state.sessions = [...state.sessions, { ...state.focus, status: 'completed', finishedAt: state.focus.endsAt }];
      state.focus = null;
    }
    const cutoff = new Date(date);
    cutoff.setDate(cutoff.getDate() - 89);
    state.usage = state.usage.filter(e => e.day >= dayKey(cutoff));
    state.sessions = state.sessions.filter(s => s.finishedAt >= cutoff.getTime()).slice(-200);
    return state;
  }
  function change(action) {
    return exclusive(async () => {
      const date = now();
      const state = reconcile(validateState(await repository.load()), date);
      action(state, date);
      validateState(state);
      await repository.save(state);
      return state;
    });
  }
  function preference(state, id) {
    const item = state.preferences.find(p => p.id === id);
    if (!item) throw new Error('Rede não encontrada.');
    return item;
  }
  return {
    load: () => change(() => {}),
    setProtection: enabled => change(state => { state.protectionEnabled = !!enabled; }),
    importUsage: entries => change(state => {
      for (const entry of entries) {
        preference(state, entry.networkId);
        wholeMinutes(entry.minutes, 0);
        if (entry.source !== 'device' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.day)) throw new Error('Registro automático inválido.');
      }
      state.usage = [...state.usage.filter(old => !entries.some(e => e.day === old.day && e.networkId === old.networkId)), ...entries];
    }),
    completeOnboarding: () => change(state => { state.onboarded = true; }),
    updatePreference: (id, limit, intention) => change(state => {
      const item = preference(state, id);
      const text = String(intention).trim();
      if (!text || text.length > 100) throw new Error('Escreva uma intenção com até 100 caracteres.');
      item.limit = wholeMinutes(limit);
      item.intention = text;
    }),
    recordUsage: (id, minutes) => change((state, date) => {
      preference(state, id);
      const value = wholeMinutes(minutes, 0);
      const day = dayKey(date);
      const others = state.usage.filter(e => e.day === day && e.networkId !== id).reduce((sum, e) => sum + e.minutes, 0);
      if (others + value > 1440) throw new Error('O total do dia não pode ultrapassar 1.440 minutos.');
      state.usage = [...state.usage.filter(e => e.day !== day || e.networkId !== id), { day, networkId: id, minutes: value }];
    }),
    startFocus: minutes => change((state, date) => {
      if (state.focus) throw new Error('Você já tem uma sessão de foco em andamento.');
      const duration = wholeMinutes(minutes, 1, 120);
      state.focus = { id: String(date.getTime()), startedAt: date.getTime(), endsAt: date.getTime() + duration * 60000, minutes: duration };
    }),
    cancelFocus: () => change((state, date) => {
      if (state.focus) {
        state.sessions = [...state.sessions, { ...state.focus, status: 'cancelled', finishedAt: date.getTime() }];
        state.focus = null;
      }
    }),
    reset: () => exclusive(async () => {
      const state = initialState();
      await repository.save(state);
      return state;
    }),
  };
}
