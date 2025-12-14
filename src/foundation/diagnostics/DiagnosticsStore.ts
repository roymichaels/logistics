import { ClassifiedError } from "../error/ErrorTypes";

export interface DiagnosticEntry {
  type: 'log' | 'warn' | 'error' | 'query' | 'event' | 'nav' | 'domain_event';
  message: string;
  payload?: any;
  data?: any;
  severity?: string;
  timestamp: number;
}

class DiagnosticsStoreClass {
  history: DiagnosticEntry[] = [];

  log(entry: DiagnosticEntry) {
    this.history.push(entry);
    if (this.history.length > 500) this.history.shift();
  }

  logEvent(entry: Omit<DiagnosticEntry, 'timestamp'> & { timestamp?: number }) {
    const finalEntry: DiagnosticEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now(),
    };
    this.log(finalEntry);
  }

  getAll() {
    return [...this.history];
  }

  clear() {
    this.history = [];
  }
}

export const Diagnostics = new DiagnosticsStoreClass();
export const DiagnosticsStore = Diagnostics;
