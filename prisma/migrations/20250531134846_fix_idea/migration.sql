/*
  Warnings:

  - You are about to drop the column `appliedPosition` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `education` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `profesionalExperience` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `appliedJob` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `educations` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobTitle` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profesionalExperiences` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "appliedPosition",
DROP COLUMN "education",
DROP COLUMN "pdfUrl",
DROP COLUMN "profesionalExperience",
ADD COLUMN     "appliedJob" TEXT NOT NULL,
ADD COLUMN     "educations" JSONB NOT NULL,
ADD COLUMN     "jobTitle" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "profesionalExperiences" JSONB NOT NULL;
