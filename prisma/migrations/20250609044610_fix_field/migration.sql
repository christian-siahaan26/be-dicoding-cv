/*
  Warnings:

  - Added the required column `jobTitle` to the `cvs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "jobTitle" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;
