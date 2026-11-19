export const networks = [
  { id: 'instagram', name: 'Instagram', intention: 'Conversar com quem importa' },
  { id: 'youtube', name: 'YouTube', intention: 'Aprender algo novo' },
  { id: 'tiktok', name: 'TikTok', intention: 'Ver algo que escolhi' },
];

export const shortVideoTargets = [
  { id: 'reels', name: 'Instagram Reels', shortName: 'Reels', icon: 'film-outline', description: 'Pausa os Reels mantendo DMs e feed' },
  { id: 'shorts', name: 'YouTube Shorts', shortName: 'Shorts', icon: 'play-circle-outline', description: 'Pausa os Shorts mantendo vídeos longos' },
  { id: 'tiktok', name: 'TikTok', shortName: 'TikTok', icon: 'logo-tiktok', description: 'Bloqueia o feed infinito do TikTok' },
  { id: 'others', name: 'Kwai, FB Reels e Spotlight', shortName: 'Afins', icon: 'sparkles-outline', description: 'Bloqueia Kwai, Facebook Reels e Spotlight' },
];

export function defaultShortVideoBlocks() {
  return { reels: true, shorts: true, tiktok: true, others: true };
}

export function normalizeShortVideoBlocks(raw) {
  const defaults = defaultShortVideoBlocks();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    reels: typeof raw.reels === 'boolean' ? raw.reels : defaults.reels,
    shorts: typeof raw.shorts === 'boolean' ? raw.shorts : defaults.shorts,
    tiktok: typeof raw.tiktok === 'boolean' ? raw.tiktok : defaults.tiktok,
    others: typeof raw.others === 'boolean' ? raw.others : defaults.others,
  };
}

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function wholeMinutes(value, min = 1, max = 1440) {
  if (!/^\d+$/.test(String(value).trim())) throw new Error('Digite um número inteiro de minutos.');
  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || minutes < min || minutes > max) {
    throw new Error(`Escolha entre ${min} e ${max} minutos.`);
  }
  return minutes;
}

export function initialState() {
  return {
    version: 1,
    onboarded: false,
    protectionEnabled: false,
    shortVideoBlocks: defaultShortVideoBlocks(),
    preferences: networks.map(network => ({ ...network, limit: 30 })),
    usage: [],
    focus: null,
    sessions: [],
  };
}

export function validateState(state) {
  const fail = () => { throw new Error('Os dados locais não puderam ser lidos. Tente novamente ou restaure os dados em Ajustes.'); };
  if (!state || state.version !== 1 || typeof state.onboarded !== 'boolean' ||
      !Array.isArray(state.preferences) || state.preferences.length !== networks.length ||
      !Array.isArray(state.usage) || !Array.isArray(state.sessions)) fail();
  if (networks.some(n => state.preferences.filter(p => p.id === n.id).length !== 1)) fail();
  if (state.protectionEnabled !== undefined && typeof state.protectionEnabled !== 'boolean') fail();
  if (state.shortVideoBlocks !== undefined) {
    if (!state.shortVideoBlocks || typeof state.shortVideoBlocks !== 'object') fail();
    for (const target of shortVideoTargets) {
      const value = state.shortVideoBlocks[target.id];
      if (value !== undefined && typeof value !== 'boolean') fail();
    }
  }
  for (const p of state.preferences) {
    if (!Number.isInteger(p.limit) || p.limit < 1 || p.limit > 1440 ||
        typeof p.intention !== 'string' || p.intention.length > 100) fail();
  }
  const keys = new Set();
  for (const entry of state.usage) {
    const key = `${entry.day}/${entry.networkId}`;
    if (!networks.some(n => n.id === entry.networkId) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.day) ||
        !Number.isInteger(entry.minutes) || entry.minutes < 0 || entry.minutes > 1440 || keys.has(key)) fail();
    keys.add(key);
  }
  const validFocus = f => f && typeof f.id === 'string' && Number.isFinite(f.startedAt) &&
    Number.isFinite(f.endsAt) && Number.isInteger(f.minutes) && f.minutes >= 1 && f.minutes <= 120 &&
    f.endsAt === f.startedAt + f.minutes * 60000;
  if (state.focus !== null && !validFocus(state.focus)) fail();
  for (const session of state.sessions) {
    if (!validFocus(session) || !['completed', 'cancelled'].includes(session.status) ||
        !Number.isFinite(session.finishedAt)) fail();
  }
  return state;
}

export function usageOn(state, day, networkId) {
  return state.usage.find(entry => entry.day === day && entry.networkId === networkId)?.minutes ?? 0;
}

export function summary(state, date = new Date()) {
  const today = dayKey(date);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 6 + i);
    const day = dayKey(d);
    return {
      day,
      label: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()],
      minutes: state.usage.filter(e => e.day === day).reduce((sum, e) => sum + e.minutes, 0),
      recorded: state.usage.some(e => e.day === day),
    };
  });
  return {
    today,
    week,
    total: week[6].minutes,
    recorded: week[6].recorded,
    goal: state.preferences.reduce((sum, p) => sum + p.limit, 0),
    focusMinutes: state.sessions
      .filter(s => s.status === 'completed' && dayKey(new Date(s.finishedAt)) === today)
      .reduce((sum, s) => sum + s.minutes, 0),
  };
}
