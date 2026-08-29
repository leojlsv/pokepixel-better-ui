export function createLogger(namespace, debug = false) {
  const prefix = `[PPBUI:${namespace}]`;

  return {
    debug: (...args) => debug && console.debug(prefix, ...args),
    info: (...args) => debug && console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}
