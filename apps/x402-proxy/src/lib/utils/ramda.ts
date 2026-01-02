/**
 * Ramda utility functions for functional programming patterns
 */
import * as R from "ramda";

// Re-export commonly used Ramda functions
export const {
  // Object manipulation
  pick,
  omit,
  prop,
  propOr,
  path,
  pathOr,
  assoc,
  assocPath,
  dissoc,
  mergeRight,
  mergeDeepRight,
  evolve,
  keys,
  values,
  toPairs,
  fromPairs,

  // Array manipulation
  map,
  filter,
  find,
  findIndex,
  reject,
  reduce,
  head,
  tail,
  last,
  init,
  take,
  drop,
  slice,
  concat,
  flatten,
  uniq,
  uniqBy,
  sortBy,
  groupBy,
  indexBy,
  partition,
  zip,
  zipObj,

  // Function composition
  pipe,
  compose,
  curry,
  partial,
  flip,
  identity,
  always,
  tap,
  tryCatch,

  // Logic
  ifElse,
  when,
  unless,
  cond,
  both,
  either,
  complement,
  allPass,
  anyPass,

  // Predicates
  isEmpty,
  isNil,
  equals,
  propEq,
  pathEq,

  // String
  split,
  join,
  trim,
  toLower,
  toUpper,
  replace,
  test,
  match,
} = R;

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = <T>(fallback: T) =>
  R.tryCatch(JSON.parse, R.always(fallback));

/**
 * Remove null/undefined values from object
 */
export const compactObject = R.reject(R.isNil);

/**
 * Deep merge with null removal
 */
export const mergeClean = R.pipe(R.mergeDeepRight, compactObject);

/**
 * Get nested value with default
 */
export const getIn = <T>(defaultValue: T, pathArray: (string | number)[]) =>
  R.pathOr(defaultValue, pathArray);

/**
 * Update nested value
 */
export const setIn = <T>(pathArray: (string | number)[], value: T) =>
  R.assocPath(pathArray, value);

/**
 * Check if object has all specified keys
 */
export const hasKeys = (...keys: string[]) =>
  R.allPass(keys.map((k) => R.has(k)));

/**
 * Transform object keys
 */
export const mapKeys = <T extends object>(
  fn: (key: string) => string,
  obj: T
): Record<string, unknown> =>
  R.pipe(
    R.toPairs,
    R.map(([k, v]) => [fn(k as string), v] as [string, unknown]),
    R.fromPairs
  )(obj);

/**
 * Convert camelCase to snake_case
 */
export const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * Convert snake_case to camelCase
 */
export const snakeToCamel = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Safe property access that returns undefined for null/undefined objects
 */
export const safeProp =
  <K extends string>(key: K) =>
  <T extends Record<K, unknown>>(obj: T | null | undefined): T[K] | undefined =>
    obj == null ? undefined : obj[key];

/**
 * Async pipe - compose async functions
 */
export const pipeAsync =
  <T>(...fns: Array<(arg: T) => Promise<T> | T>) =>
  async (initial: T): Promise<T> => {
    let result = initial;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
