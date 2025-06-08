/*
  Warnings:

  - You are about to drop the column `jobTitle` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `cvs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "jobTitle",
DROP COLUMN "name";
