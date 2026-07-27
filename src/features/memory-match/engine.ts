import { SYMBOLS, getLevel } from "./config";
import type { MemoryCard } from "./types";

export function secureShuffle<T>(items: T[]): T[] {
  const output = [...items];
  const values = new Uint32Array(output.length);
  if (typeof crypto !== "undefined") crypto.getRandomValues(values);
  else for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 2 ** 32);
  for (let i = output.length - 1; i > 0; i--) {
    const j = values[i] % (i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function createDeck(level: number): MemoryCard[] {
  const config = getLevel(level);
  const pairCount = (config.rows * config.columns) / 2;
  const symbols = secureShuffle(SYMBOLS).slice(0, pairCount);
  return secureShuffle(symbols.flatMap((symbol) => [
    { ...symbol, cardId: `${symbol.id}-a`, matched: false },
    { ...symbol, cardId: `${symbol.id}-b`, matched: false }
  ]));
}
