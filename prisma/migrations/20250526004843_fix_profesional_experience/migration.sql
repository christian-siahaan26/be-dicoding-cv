/*
  Warnings:

  - You are about to drop the column `professionalExperience` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `profesionalExperience` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "professionalExperience",
ADD COLUMN     "profesionalExperience" TEXT NOT NULL;
