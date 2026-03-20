/**
 * Sistema de Cache para Dashboard
 * Centraliza todas as operações de cache da aplicação
 * com suporte a TTL, invalidação e segurança
 */

export type CacheKey = string;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // TTL em ms (padrão: 5 minutos)
}

export class CacheManager {
  private cache: Map<CacheKey, CacheEntry<unknown>>;
  private defaultTTL = 5 * 60 * 1000; // 5 minutos por padrão

  constructor() {
    this.cache = new Map();
  }

  /**
   * Gera uma chave de cache a partir de parâmetros variáveis
   * Exemplo: generateKey('dashboard', 'senso', { filtro: 'valor' })
   */
  static generateKey(...parts: (string | object | undefined)[]): CacheKey {
    return parts
      .filter((part) => part !== undefined)
      .map((part) => {
        if (typeof part === "object") {
          // Ordena as chaves para garantir consistência
          return JSON.stringify(part, Object.keys(part).sort());
        }
        return String(part);
      })
      .join("::");
  }

  /**
   * Obtém um valor do cache se ainda estiver válido
   */
  get<T>(key: CacheKey): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Define um valor no cache com TTL
   */
  set<T>(key: CacheKey, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Executa uma função e cacheia o resultado
   * Se o resultado está em cache, retorna o cached sem executar a função
   */
  async getOrExecute<T>(
    key: CacheKey,
    fn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    // Tenta obter do cache primeiro
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Se não está em cache, executa a função
    const result = await fn();

    // Armazena no cache para próximas requisições
    this.set(key, result, options);

    return result;
  }

  /**
   * Invalida uma chave de cache específica
   */
  invalidate(key: CacheKey): void {
    this.cache.delete(key);
  }

  /**
   * Invalida múltiplas chaves usando padrão (prefixo)
   * Exemplo: invalidateByPattern('dashboard:senso:*')
   */
  invalidateByPattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}`);

    Array.from(this.cache.keys()).forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtém informações sobre o cache (útil para debug)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Exporta instância única (singleton)
export const cacheManager = new CacheManager();

/**
 * Hook para usar cache em componentes
 */
export async function withCache<T>(
  key: CacheKey,
  fn: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  return cacheManager.getOrExecute(key, fn, { ttl });
}
