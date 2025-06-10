/*
  Warnings:

  - You are about to drop the column `profesionalExperiences` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `technicalSkills` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `experiences` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skills` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "profesionalExperiences",
DROP COLUMN "technicalSkills",
ADD COLUMN     "experiences" JSONB NOT NULL,
ADD COLUMN     "skills" JSONB NOT NULL;
