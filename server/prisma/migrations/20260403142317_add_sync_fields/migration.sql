-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
