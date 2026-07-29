import { describe, expect, it } from "vitest";
import { bfs, chaserStep, generateMaze, movingHazardPosition, nextPosition, validateMaze } from "./engine";

describe("Maze Runner deterministic engine", () => {
  it("creates 20 deterministic, valid and solvable levels", () => {
    for (let level = 1; level <= 20; level++) {
      const a = generateMaze(level, `level-seed-${level}`);
      const b = generateMaze(level, `level-seed-${level}`);
      expect(a).toEqual(b);
      expect(validateMaze(a)).toBe(true);
      expect(bfs(a.walls, a.start, a.exit).length).toBeGreaterThan(1);
      if (a.key && a.gate) expect(bfs(a.walls, a.start, a.key, a.gate).length).toBeGreaterThan(0);
      if (a.movingHazard) {
        expect(a.walls[a.movingHazard.track[0].y][a.movingHazard.track[0].x]).toBe(false);
        expect(movingHazardPosition(a, 0)).not.toEqual(movingHazardPosition(a, 1));
      }
      if (level >= 15) expect(a.chaserStart).toEqual(a.start);
    }
  });
  it("moves orthogonally only", () => {
    expect(nextPosition({ x: 2, y: 2 }, "UP")).toEqual({ x: 2, y: 1 });
    expect(nextPosition({ x: 2, y: 2 }, "RIGHT")).toEqual({ x: 3, y: 2 });
  });
  it("advances a chaser by one legal path cell", () => {
    const maze = generateMaze(20, "chaser-test");
    const player = maze.solution[Math.min(6, maze.solution.length - 1)];
    const next = chaserStep(maze, maze.start, player);
    expect(Math.abs(next.x - maze.start.x) + Math.abs(next.y - maze.start.y)).toBeLessThanOrEqual(1);
    expect(maze.walls[next.y][next.x]).toBe(false);
  });
});
