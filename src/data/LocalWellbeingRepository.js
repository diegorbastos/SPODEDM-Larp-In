import { WellbeingRepository } from '../domain/WellbeingRepository.js';
import { initialState, validateState } from '../domain/wellbeing.js';

export const STORAGE_KEY = '@larp-in/wellbeing/v1';

export class LocalWellbeingRepository extends WellbeingRepository {
  constructor(storage) {
    super();
    this.storage = storage;
  }

  async load() {
    try {
      const raw = this.storage ? await this.storage.getItem(STORAGE_KEY) : null;
      if (raw === null || raw === undefined) return initialState();
      return validateState(JSON.parse(raw));
    } catch {
      throw new Error('Não foi possível ler seus dados locais. Tente novamente ou restaure os dados.');
    }
  }

  async save(state) {
    const serialized = JSON.stringify(validateState(state));
    try {
      if (this.storage) {
        await this.storage.setItem(STORAGE_KEY, serialized);
      }
    } catch (error) {
      throw new Error(`Falha ao persistir dados locais: ${error.message}`);
    }
  }
}
