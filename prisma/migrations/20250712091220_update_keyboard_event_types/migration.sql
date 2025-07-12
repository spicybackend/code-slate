/*
  Warnings:

  - The values [TYPING,COPY,PASTE,DELETE,SELECTION_CHANGE] on the enum `EventType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('FOCUS_IN', 'FOCUS_OUT', 'CONTENT_SNAPSHOT');
ALTER TABLE "KeystrokeEvent" ALTER COLUMN "type" TYPE "EventType_new" USING ("type"::text::"EventType_new");
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "EventType_old";
COMMIT;
