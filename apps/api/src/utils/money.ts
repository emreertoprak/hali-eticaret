/** Kuruş hassasiyetinde yuvarlama (float hatalarını önlemek için). */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const sumMoney = (values: number[]): number =>
  Math.round(values.reduce((acc, v) => acc + Math.round(v * 100), 0)) / 100;
