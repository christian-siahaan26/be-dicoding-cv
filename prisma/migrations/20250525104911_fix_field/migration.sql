/*
  Warnings:

  - You are about to drop the column `cv_text` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `parsed_data` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `jobTitle` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professionalExperience` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rawText` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `technicalSkills` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "cv_text",
DROP COLUMN "parsed_data",
ADD COLUMN     "jobTitle" TEXT NOT NULL,
ADD COLUMN     "professionalExperience" TEXT NOT NULL,
ADD COLUMN     "rawText" TEXT NOT NULL,
ADD COLUMN     "technicalSkills" TEXT NOT NULL;
