-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('NEW', 'ADD_ON');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "isClient" BOOLEAN NOT NULL DEFAULT false,
    "isProspect" BOOLEAN NOT NULL DEFAULT false,
    "isAcqVendor" BOOLEAN NOT NULL DEFAULT false,
    "isMappingVendor" BOOLEAN NOT NULL DEFAULT false,
    "vendorType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "qboCustomerId" TEXT,
    "qboVendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL DEFAULT '',
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSensor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sensorType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "list" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientContactId" TEXT,
    "dvtPmId" TEXT,
    "opportunityType" "OpportunityType" NOT NULL DEFAULT 'NEW',
    "parentProjectId" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "folderUrl" TEXT,
    "comments" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "legacyId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Preparing Proposal',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "lastClientContactDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "proposalValue" DECIMAL(14,2),
    "internalCost" DECIMAL(14,2),
    "mappingAcres" DECIMAL(14,2),
    "flightAcres" DECIMAL(14,2),
    "isLinear" BOOLEAN NOT NULL DEFAULT false,
    "linearMiles" DECIMAL(12,2),
    "linearWidthFt" DECIMAL(12,2),
    "gsdCm" DECIMAL(8,2),
    "lidarPpsm" DECIMAL(8,2),
    "projectType" TEXT,
    "sensorType" TEXT,
    "deliverables" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionQuote" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sensorId" TEXT,
    "cost" DECIMAL(14,2),
    "frameCount" INTEGER,
    "quoteDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingQuote" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "cost" DECIMAL(14,2),
    "days" INTEGER,
    "quoteDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MappingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientContactId" TEXT,
    "dvtPmId" TEXT,
    "proposalId" TEXT,
    "versionId" TEXT,
    "parentProjectId" TEXT,
    "addOnSeq" INTEGER,
    "acquisitionMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Awarded',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pidOrTargets" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "acres" DECIMAL(14,2),
    "linearMiles" DECIMAL(12,2),
    "projectType" TEXT,
    "sensorType" TEXT,
    "deliverables" TEXT,
    "folderUrl" TEXT,
    "comments" TEXT,
    "clientPoJob" TEXT,
    "invoiceNumbers" TEXT,
    "contractValue" DECIMAL(14,2),
    "billedAmount" DECIMAL(14,2),
    "acqVendorId" TEXT,
    "acqCost" DECIMAL(14,2),
    "processingVendorId" TEXT,
    "processingCost" DECIMAL(14,2),
    "mobCosts" DECIMAL(14,2),
    "invoicePaid" BOOLEAN NOT NULL DEFAULT false,
    "awardDate" TIMESTAMP(3),
    "scheduledClientDelivery" TIMESTAMP(3),
    "acqVendorNtp" TIMESTAMP(3),
    "dateFlown" TIMESTAMP(3),
    "controlOut" TIMESTAMP(3),
    "controlIn" TIMESTAMP(3),
    "controlToFlightProvider" TIMESTAMP(3),
    "imageryIn" TIMESTAMP(3),
    "lidarIn" TIMESTAMP(3),
    "acqDataQc" TIMESTAMP(3),
    "sentToSub" TIMESTAMP(3),
    "atIn" TIMESTAMP(3),
    "atApproved" TIMESTAMP(3),
    "orthoIn" TIMESTAMP(3),
    "mappingIn" TIMESTAMP(3),
    "subDeliveryPromised" TIMESTAMP(3),
    "actualClientDelivery" TIMESTAMP(3),
    "invoiceDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT,
    "projectId" TEXT,
    "folder" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "externalUrl" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'Note',
    "body" TEXT NOT NULL,
    "proposalId" TEXT,
    "projectId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_initials_key" ON "User"("initials");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_qboCustomerId_key" ON "Company"("qboCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_qboVendorId_key" ON "Company"("qboVendorId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSensor_companyId_name_key" ON "VendorSensor"("companyId", "name");

-- CreateIndex
CREATE INDEX "ListItem_list_sortOrder_idx" ON "ListItem"("list", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_list_value_key" ON "ListItem"("list", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_number_key" ON "Proposal"("number");

-- CreateIndex
CREATE INDEX "Proposal_companyId_idx" ON "Proposal"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_code_key" ON "ProposalVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_versionNo_key" ON "ProposalVersion"("proposalId", "versionNo");

-- CreateIndex
CREATE INDEX "AcquisitionQuote_versionId_idx" ON "AcquisitionQuote"("versionId");

-- CreateIndex
CREATE INDEX "MappingQuote_versionId_idx" ON "MappingQuote"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_number_key" ON "Project"("number");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSensor" ADD CONSTRAINT "VendorSensor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_dvtPmId_fkey" FOREIGN KEY ("dvtPmId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionQuote" ADD CONSTRAINT "AcquisitionQuote_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionQuote" ADD CONSTRAINT "AcquisitionQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionQuote" ADD CONSTRAINT "AcquisitionQuote_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "VendorSensor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingQuote" ADD CONSTRAINT "MappingQuote_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProposalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingQuote" ADD CONSTRAINT "MappingQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_dvtPmId_fkey" FOREIGN KEY ("dvtPmId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProposalVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_acqVendorId_fkey" FOREIGN KEY ("acqVendorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_processingVendorId_fkey" FOREIGN KEY ("processingVendorId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
