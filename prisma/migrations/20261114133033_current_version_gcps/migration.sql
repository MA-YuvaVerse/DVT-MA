-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "gcpCount" INTEGER;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "currentVersionId" TEXT;

-- AlterTable
ALTER TABLE "ProposalVersion" ADD COLUMN     "gcpCount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_currentVersionId_key" ON "Proposal"("currentVersionId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProposalVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

