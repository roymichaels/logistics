export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return order === 'asc' ? comparison : -comparison;
  });
};

export const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const mapValues = <T extends Record<string, unknown>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): Record<keyof T, U> => {
  const result = {} as Record<keyof T, U>;
  (Object.keys(obj) as Array<keyof T>).forEach((key) => {
    result[key] = fn(obj[key], key);
  });
  return result;
};

export const arrayToMap = <T>(array: T[], key: keyof T): Map<unknown, T> => {
  return new Map(array.map((item) => [item[key], item]));
};

export const flatten = <T>(array: T[][]): T[] => {
  return array.reduce((acc, val) => acc.concat(val), []);
};

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const merge = <T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  return Object.assign({}, target, ...sources);
};

export const difference = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter((item) => !array2.includes(item));
};

export const intersection = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter((item) => array2.includes(item));
};

export const sumBy = <T>(array: T[], key: keyof T): number => {
  return array.reduce((sum, item) => sum + Number(item[key]), 0);
};

export const countBy = <T>(array: T[], key: keyof T): Record<string, number> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    result[groupKey] = (result[groupKey] || 0) + 1;
    return result;
  }, {} as Record<string, number>);
};
