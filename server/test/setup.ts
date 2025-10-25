// Silence noisy logs (JSON payloads, error stacks) during tests
const noop = () => {};

// Keep a minimal info output if needed; for now suppress all to prioritize G/W/T test names
// You can switch to a formatter here if you want custom messages.
global.console.log = noop as any;
global.console.error = noop as any;
global.console.warn = noop as any;

