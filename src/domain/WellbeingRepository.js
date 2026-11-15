/**
 * Porta do domínio. Implementações devem ler/gravar um retrato completo de forma
 * assíncrona e rejeitar a Promise em caso de falha. Nunca retornar defaults para
 * esconder corrupção. A aplicação recebe esta porta por injeção manual.
 */
export class WellbeingRepository {
  async load() { throw new Error('Implemente load().'); }
  async save(_state) { throw new Error('Implemente save(state).'); }
}
