-- Add device tracking and real-time sync fields
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "lastHeartbeat" TIMESTAMP(3);
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "playbackState" TEXT DEFAULT 'stopped';
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "playbackSpeed" DOUBLE PRECISION DEFAULT 1.0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "progress_lastWatched_idx" ON "progress"("lastWatched");

-- Create heartbeat tracking table for analytics
CREATE TABLE IF NOT EXISTS "playback_heartbeats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "positionSeconds" INTEGER NOT NULL,
    "deviceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "playback_heartbeats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "playback_heartbeats_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS "playback_heartbeats_userId_lessonId_idx" ON "playback_heartbeats"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "playback_heartbeats_timestamp_idx" ON "playback_heartbeats"("timestamp");
