export function devLog(...args: any[]) {
  // eslint-disable-next-line no-console
  if (typeof __DEV__ !== 'undefined' ? __DEV__ : true) console.log(...args);
}

export function devWarn(...args: any[]) {
  // eslint-disable-next-line no-console
  if (typeof __DEV__ !== 'undefined' ? __DEV__ : true) console.warn(...args);
}


