import { ClassifiedError } from "../error/ErrorTypes";

export interface DiagnosticEntry {
  type: 'log' | 'warn' | 'error' | 'query' | 'event' | 'nav';
  message: string;
  payload?: any;
  timestamp: number;
}

class DiagnosticsStore {
  history: DiagnosticEntry[] = [];

  log(entry: DiagnosticEntry) {
    this.history.push(entry);
    if (this.history.length > 500) this.history.shift();
  }

  getAll() {
    return [...this.history];
  }

  clear() {
    this.history = [];
  }
}

export const Diagnostics = new DiagnosticsStore();
