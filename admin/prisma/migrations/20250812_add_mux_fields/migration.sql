-- AlterTable
ALTER TABLE "public"."lessons" ADD COLUMN "muxPolicy" TEXT DEFAULT 'public';
ALTER TABLE "public"."lessons" ADD COLUMN "muxReadyAt" TIMESTAMP(3);
ALTER TABLE "public"."lessons" ADD COLUMN "muxError" TEXT;
