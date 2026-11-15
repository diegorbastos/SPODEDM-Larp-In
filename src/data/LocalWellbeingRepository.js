import { WellbeingRepository } from '../domain/WellbeingRepository.js';
import { initialState, validateState } from '../domain/wellbeing.js';

export const STORAGE_KEY = '@larp-in/wellbeing/v1';

export class LocalWellbeingRepository extends WellbeingRepository {
  constructor(storage) {
    super();
    this.storage = storage;
  }
  async load() {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw === null) return initialState();
    try { return validateState(JSON.parse(raw)); }
    catch { throw new Error('Não foi possível ler seus dados locais. Tente novamente ou restaure os dados.'); }
  }
  async save(state) {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(validateState(state)));
  }
}
