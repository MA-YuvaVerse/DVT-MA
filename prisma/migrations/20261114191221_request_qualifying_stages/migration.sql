-- AlterTable
ALTER TABLE "ProposalVersion" ALTER COLUMN "status" SET DEFAULT 'New Request';

-- Rename stages: Open -> Proposal Sent, Open/HIGH -> High Probability
UPDATE "ProposalVersion" SET "status" = 'Proposal Sent' WHERE "status" = 'Open';
UPDATE "ProposalVersion" SET "status" = 'High Probability' WHERE "status" = 'Open/HIGH';
