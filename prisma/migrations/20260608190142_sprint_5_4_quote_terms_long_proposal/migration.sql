-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteExportType" ADD VALUE 'long_proposal_pptx';
ALTER TYPE "QuoteExportType" ADD VALUE 'long_proposal_pdf';

-- AlterTable
ALTER TABLE "quote_versions" ADD COLUMN     "terms" TEXT NOT NULL DEFAULT 'Quote is valid for 30 days from date of issue.
Payment terms are 75% upfront, 25% on completion unless stated otherwise.
On site works require the provision of accommodation at a rate of 1 room per engineer, parking and access to food & beverage for the entirety of the project. If this is not possible, accommodation and subsistence costs will apply.';
