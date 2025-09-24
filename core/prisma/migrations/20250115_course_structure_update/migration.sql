-- Step 1: Create modules table
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- Create index for modules
CREATE INDEX "modules_courseId_order_idx" ON "modules"("courseId", "order");

-- Step 2: Rename lessons table to sub_lessons
ALTER TABLE "lessons" RENAME TO "sub_lessons";

-- Step 3: Add moduleId column to sub_lessons
ALTER TABLE "sub_lessons" ADD COLUMN "moduleId" TEXT;

-- Step 4: Create temporary modules for existing lessons grouped by course
INSERT INTO "modules" ("id", "title", "description", "order", "courseId", "createdAt", "updatedAt")
SELECT 
    'mod_' || "courseId" || '_1' as "id",
    'Module 1' as "title",
    'Default module for migrated lessons' as "description",
    1 as "order",
    "courseId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "sub_lessons"
GROUP BY "courseId";

-- Step 5: Update sub_lessons to reference the new modules
UPDATE "sub_lessons" 
SET "moduleId" = 'mod_' || "courseId" || '_1';

-- Step 6: Make moduleId NOT NULL after populating
ALTER TABLE "sub_lessons" ALTER COLUMN "moduleId" SET NOT NULL;

-- Step 7: Drop the old courseId column from sub_lessons
ALTER TABLE "sub_lessons" DROP COLUMN "courseId";

-- Step 8: Rename foreign key columns in related tables
ALTER TABLE "playback_heartbeats" RENAME COLUMN "lessonId" TO "subLessonId";
ALTER TABLE "progress" RENAME COLUMN "lessonId" TO "subLessonId";

-- Step 9: Drop and recreate indexes with new names
DROP INDEX IF EXISTS "lessons_courseId_order_idx";
CREATE INDEX "sub_lessons_moduleId_order_idx" ON "sub_lessons"("moduleId", "order");

DROP INDEX IF EXISTS "playback_heartbeats_userId_lessonId_idx";
CREATE INDEX "playback_heartbeats_userId_subLessonId_idx" ON "playback_heartbeats"("userId", "subLessonId");

DROP INDEX IF EXISTS "progress_userId_lessonId_key";
ALTER TABLE "progress" ADD CONSTRAINT "progress_userId_subLessonId_key" UNIQUE("userId", "subLessonId");

-- Step 10: Add foreign key constraints
ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey" 
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sub_lessons" ADD CONSTRAINT "sub_lessons_moduleId_fkey" 
    FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update existing foreign key constraints
ALTER TABLE "playback_heartbeats" DROP CONSTRAINT IF EXISTS "playback_heartbeats_lessonId_fkey";
ALTER TABLE "playback_heartbeats" ADD CONSTRAINT "playback_heartbeats_subLessonId_fkey" 
    FOREIGN KEY ("subLessonId") REFERENCES "sub_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "progress" DROP CONSTRAINT IF EXISTS "progress_lessonId_fkey";
ALTER TABLE "progress" ADD CONSTRAINT "progress_subLessonId_fkey" 
    FOREIGN KEY ("subLessonId") REFERENCES "sub_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
