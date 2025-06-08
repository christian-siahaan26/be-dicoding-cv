/*
  Warnings:

  - Added the required column `appliedPosition` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matchScore` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "appliedPosition" TEXT NOT NULL,
ADD COLUMN     "matchScore" DOUBLE PRECISION NOT NULL;
