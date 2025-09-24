-- Add position tracking fields to Progress
ALTER TABLE "progress" ADD COLUMN "positionSeconds" INTEGER DEFAULT 0;
ALTER TABLE "progress" ADD COLUMN "durationSeconds" INTEGER DEFAULT 0;