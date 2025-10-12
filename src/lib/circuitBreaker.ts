export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private lastError: Error | null = null;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 10000,
      resetTimeout: 60000
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        console.warn(`Circuit breaker [${this.name}] is OPEN. Next attempt in ${waitTime}s`);
        throw new Error(
          `Circuit breaker is OPEN. Service unavailable. Last error: ${this.lastError?.message || 'Unknown'}`
        );
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      console.log(`Circuit breaker [${this.name}] entering HALF_OPEN state`);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${this.options.timeout}ms`)), this.options.timeout)
    );

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`Circuit breaker [${this.name}] is now CLOSED`);
      }
    }
  }

  private onFailure(error: Error): void {
    this.lastError = error;
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      console.warn(`Circuit breaker [${this.name}] is OPEN (from HALF_OPEN). Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      console.warn(`Circuit breaker [${this.name}] is OPEN (threshold reached). Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null,
      lastError: this.lastError?.message || null
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastError = null;
    console.log(`Circuit breaker [${this.name}] has been reset`);
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
}

export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(cb => cb.reset());
  console.log('All circuit breakers have been reset');
}

export function getCircuitBreakerStats() {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
}
