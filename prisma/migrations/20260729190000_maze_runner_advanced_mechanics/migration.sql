ALTER TABLE "maze_runner_attempts"
  ADD COLUMN "hazard_freeze_moves" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "chaser_x" INTEGER,
  ADD COLUMN "chaser_y" INTEGER,
  ADD COLUMN "bonus_chest_points" INTEGER NOT NULL DEFAULT 0;
