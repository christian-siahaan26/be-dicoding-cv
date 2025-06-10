/*
  Warnings:

  - Added the required column `fixCv` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobRecommendation` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobTitle` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "fixCv" JSONB NOT NULL,
ADD COLUMN     "jobRecommendation" JSONB NOT NULL,
ADD COLUMN     "jobTitle" TEXT NOT NULL;
