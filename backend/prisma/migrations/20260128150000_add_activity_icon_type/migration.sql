-- AlterTable: Add iconType and iconValue columns to ActivityIcon
ALTER TABLE "ActivityIcon" ADD COLUMN "iconType" TEXT NOT NULL DEFAULT 'emoji';
ALTER TABLE "ActivityIcon" ADD COLUMN "iconValue" TEXT;
