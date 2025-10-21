/**
 * Polyfills for test environment
 * Must be loaded first in test setup
 */

// TextEncoder/TextDecoder polyfills for Node environment
if (typeof global !== 'undefined' && !global.TextEncoder) {
  const util = require('util');
  global.TextEncoder = util.TextEncoder;
  global.TextDecoder = util.TextDecoder;
}

// Additional globals that might be missing in test environment
if (typeof globalThis !== 'undefined') {
  if (!globalThis.TextEncoder) {
    const util = require('util');
    globalThis.TextEncoder = util.TextEncoder;
    globalThis.TextDecoder = util.TextDecoder;
  }
}

// Export to ensure module is loaded
export {};