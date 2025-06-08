/*
  Warnings:

  - You are about to drop the column `jobTitle` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `rawText` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `education` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pdfUrl` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `technicalSkills` on the `cvs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `profesionalExperience` on the `cvs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "jobTitle",
DROP COLUMN "rawText",
ADD COLUMN     "education" JSONB NOT NULL,
ADD COLUMN     "pdfUrl" TEXT NOT NULL,
DROP COLUMN "technicalSkills",
ADD COLUMN     "technicalSkills" JSONB NOT NULL,
DROP COLUMN "profesionalExperience",
ADD COLUMN     "profesionalExperience" JSONB NOT NULL;
