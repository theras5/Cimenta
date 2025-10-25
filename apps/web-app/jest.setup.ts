import '@testing-library/jest-dom';

// Silenciar warnings de React sobre "not wrapped in act(...)" para una salida más limpia en CI
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = args?.[0];
  if (typeof msg === 'string' && (msg.includes('not wrapped in act') || msg.includes('act(...)'))) {
    return;
  }
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args?.[0];
  if (typeof msg === 'string' && (msg.includes('not wrapped in act') || msg.includes('act(...)'))) {
    return;
  }
  originalWarn(...args);
};
