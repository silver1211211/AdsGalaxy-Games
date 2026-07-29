import { createHash } from "crypto";

export type Point = { x: number; y: number };
export type MazeLevel = {
  level: number; width: number; height: number; walls: boolean[][];
  start: Point; exit: Point; solution: Point[];
  key: (Point & { id: string }) | null;
  gate: (Point & { id: string; keyId: string }) | null;
  trap: Point | null;
  movingHazard: { track: Point[] } | null;
  chaserStart: Point | null;
  collectible: (Point & { id: string; kind: "COIN" | "STAR" | "GEM" });
  parTimeMs: number; targetTimeMs: number;
};

function rng(seed: string) {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0) || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const key = (p: Point) => `${p.x}:${p.y}`;
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export function levelDimensions(level: number) {
  if (level <= 3) return 9;
  if (level <= 10) return 11;
  return 13;
}

export function bfs(walls: boolean[][], start: Point, exit: Point, blocked?: Point) {
  const queue: Point[] = [start], previous = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (same(current, exit)) break;
    for (const next of [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ]) {
      if (next.y < 0 || next.x < 0 || next.y >= walls.length || next.x >= walls[0].length) continue;
      if (walls[next.y][next.x] || (blocked && same(next, blocked)) || previous.has(key(next))) continue;
      previous.set(key(next), current); queue.push(next);
    }
  }
  if (!previous.has(key(exit))) return [];
  const path: Point[] = [];
  for (let cursor: Point | null = exit; cursor; cursor = previous.get(key(cursor)) ?? null) path.push(cursor);
  return path.reverse();
}

export function generateMaze(level: number, seed: string): MazeLevel {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error("INVALID_LEVEL");
  const size = levelDimensions(level), random = rng(`${seed}:${level}:v1`);
  const walls = Array.from({ length: size }, () => Array(size).fill(true));
  const start = { x: 1, y: 1 }, stack = [start]; walls[1][1] = false;
  const directions = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }];
  while (stack.length) {
    const current = stack[stack.length - 1];
    const candidates = directions.map((d) => ({ x: current.x + d.x, y: current.y + d.y, d }))
      .filter((p) => p.x > 0 && p.y > 0 && p.x < size - 1 && p.y < size - 1 && walls[p.y][p.x]);
    if (!candidates.length) { stack.pop(); continue; }
    const next = candidates[Math.floor(random() * candidates.length)];
    walls[current.y + next.d.y / 2][current.x + next.d.x / 2] = false;
    walls[next.y][next.x] = false; stack.push(next);
  }
  const exit = { x: size - 2, y: size - 2 };
  walls[exit.y][exit.x] = false;
  const solution = bfs(walls, start, exit);
  if (!solution.length) throw new Error("UNSOLVABLE_MAZE");
  const gateIndex = level >= 4 ? Math.max(4, Math.floor(solution.length * .68)) : -1;
  const keyIndex = gateIndex > 0 ? Math.max(2, Math.floor(gateIndex * .45)) : -1;
  const gate = gateIndex > 0 ? { ...solution[gateIndex], id: "gate-1", keyId: "key-1" } : null;
  const keyItem = keyIndex > 0 ? { ...solution[keyIndex], id: "key-1" } : null;
  const open = walls.flatMap((row, y) => row.map((wall, x) => wall ? null : ({ x, y })).filter(Boolean) as Point[]);
  const optional = open.filter((p) => !solution.some((s) => same(s, p)) && !same(p, start) && !same(p, exit));
  const collectiblePoint = optional[Math.floor(random() * optional.length)] ?? solution[Math.floor(solution.length / 2)];
  const trapPoint = level >= 4 && optional.length > 1 ? optional[(Math.floor(random() * optional.length) + 1) % optional.length] : null;
  const hazardAnchor = level >= 7
    ? optional.find((p) => optional.some((candidate) => Math.abs(candidate.x - p.x) + Math.abs(candidate.y - p.y) === 1))
    : undefined;
  const hazardNeighbor = hazardAnchor
    ? optional.find((p) => Math.abs(p.x - hazardAnchor.x) + Math.abs(p.y - hazardAnchor.y) === 1)
    : undefined;
  return {
    level, width: size, height: size, walls, start, exit, solution,
    key: keyItem, gate, trap: trapPoint,
    movingHazard: hazardAnchor && hazardNeighbor ? { track: [hazardAnchor, hazardNeighbor] } : null,
    chaserStart: level >= 15 ? start : null,
    collectible: { ...collectiblePoint, id: "collectible-1", kind: level % 5 === 0 ? "GEM" : level % 3 === 0 ? "STAR" : "COIN" },
    parTimeMs: solution.length * (850 + level * 15),
    targetTimeMs: solution.length * (600 + level * 10),
  };
}

export function movingHazardPosition(maze: MazeLevel, moveCount: number) {
  const track = maze.movingHazard?.track;
  return track?.length ? track[Math.max(0, moveCount) % track.length] : null;
}

export function chaserStep(maze: MazeLevel, chaser: Point, player: Point) {
  const path = bfs(maze.walls, chaser, player);
  return path[1] ?? chaser;
}

export function validateMaze(maze: MazeLevel) {
  const path = bfs(maze.walls, maze.start, maze.exit);
  if (!path.length) return false;
  if (maze.key && maze.gate) {
    const toKey = bfs(maze.walls, maze.start, maze.key, maze.gate);
    if (!toKey.length) return false;
  }
  return !maze.walls[maze.start.y][maze.start.x]
    && !maze.walls[maze.exit.y][maze.exit.x]
    && !maze.walls[maze.collectible.y][maze.collectible.x];
}

export function nextPosition(position: Point, direction: "UP" | "DOWN" | "LEFT" | "RIGHT") {
  const delta = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[direction];
  return { x: position.x + delta[0], y: position.y + delta[1] };
}
