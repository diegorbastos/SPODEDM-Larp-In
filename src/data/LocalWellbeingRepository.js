import { WellbeingRepository } from '../domain/WellbeingRepository.js';
import { initialState, validateState } from '../domain/wellbeing.js';

export const STORAGE_KEY = '@larp-in/wellbeing/v1';

export class LocalWellbeingRepository extends WellbeingRepository {
  /**
   * @param {import('react-native-mmkv').MMKV | { getItem: Function, setItem: Function }} storage
   */
  constructor(storage) {
    super();
    this.storage = storage;
  }

  /**
   * Carrega o estado validado.
   * Mantém o contrato assíncrono (Promise) da porta do domínio, aproveitando a leitura síncrona da JSI.
   */
  async load() {
    try {
      let raw = null;
      if (this.storage) {
        if (typeof this.storage.getString === 'function') {
          raw = this.storage.getString(STORAGE_KEY) ?? null;
        } else if (typeof this.storage.getItem === 'function') {
          raw = await this.storage.getItem(STORAGE_KEY);
        }
      }

      if (raw === null || raw === undefined) return initialState();
      return validateState(JSON.parse(raw));
    } catch {
      throw new Error('Não foi possível ler seus dados locais. Tente novamente ou restaure os dados.');
    }
  }

  /**
   * Grava o estado validado no storage.
   */
  async save(state) {
    const serialized = JSON.stringify(validateState(state));
    try {
      if (this.storage) {
        if (typeof this.storage.set === 'function') {
          this.storage.set(STORAGE_KEY, serialized);
        } else if (typeof this.storage.setItem === 'function') {
          await this.storage.setItem(STORAGE_KEY, serialized);
        }
      }
    } catch (error) {
      throw new Error(`Falha ao persistir dados locais: ${error.message}`);
    }
  }
}

