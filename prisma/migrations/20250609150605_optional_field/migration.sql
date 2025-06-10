/*
  Warnings:

  - Made the column `parseText` on table `cvs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cvs" ALTER COLUMN "parseText" SET NOT NULL;
