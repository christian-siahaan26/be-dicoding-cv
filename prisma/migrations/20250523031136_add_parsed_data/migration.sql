/*
  Warnings:

  - You are about to drop the column `address` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `certifications` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `education` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `languages` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `phone_number` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `portofolio_link` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `cvs` table. All the data in the column will be lost.
  - You are about to drop the column `work_experience` on the `cvs` table. All the data in the column will be lost.
  - Added the required column `cv_text` to the `cvs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cvs" DROP COLUMN "address",
DROP COLUMN "birth_date",
DROP COLUMN "certifications",
DROP COLUMN "education",
DROP COLUMN "email",
DROP COLUMN "full_name",
DROP COLUMN "gender",
DROP COLUMN "languages",
DROP COLUMN "phone_number",
DROP COLUMN "portofolio_link",
DROP COLUMN "skills",
DROP COLUMN "summary",
DROP COLUMN "work_experience",
ADD COLUMN     "cv_text" TEXT NOT NULL,
ADD COLUMN     "parsed_data" JSONB;
