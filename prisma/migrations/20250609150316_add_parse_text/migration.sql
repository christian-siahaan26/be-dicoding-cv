/*
  Warnings:

  - Added the required column `parseText` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "parseText" TEXT NOT NULL;
