if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    Telegram: {
      WebApp: {}
    }
  };
}

const win = globalThis.window as any;
if (typeof win.addEventListener !== 'function') {
  win.addEventListener = () => undefined;
}

if (typeof win.removeEventListener !== 'function') {
  win.removeEventListener = () => undefined;
}

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {};
}
