-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PROSPECT',
    "authProvider" TEXT NOT NULL DEFAULT 'EMAIL',
    "googleSub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetsRange" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectProfile" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "isBusinessOwner" BOOLEAN NOT NULL DEFAULT false,
    "hasConcentratedStock" BOOLEAN NOT NULL DEFAULT false,
    "wantsPrivateMarkets" BOOLEAN NOT NULL DEFAULT false,
    "wantsLendingSolutions" BOOLEAN NOT NULL DEFAULT false,
    "needsTaxCoordination" BOOLEAN NOT NULL DEFAULT false,
    "servicePreference" TEXT NOT NULL DEFAULT 'full-service',
    "investmentStylePreference" TEXT NOT NULL DEFAULT 'moderate',
    "summaryText" TEXT,

    CONSTRAINT "ProspectProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfp" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "questions" TEXT NOT NULL DEFAULT '[]',
    "freeResponseLimit" INTEGER NOT NULL DEFAULT 3,
    "paidUnlockPrice" INTEGER NOT NULL DEFAULT 499,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rfp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firmName" TEXT NOT NULL,
    "leadAdvisorName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmType" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "clientMinimum" TEXT NOT NULL,
    "bio" TEXT,
    "servicesOffered" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfpInvitation" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',

    CONSTRAINT "RfpInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorResponse" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "aumFeeBps" INTEGER NOT NULL,
    "estimatedAnnualCost" DOUBLE PRECISION NOT NULL,
    "lendingSpreadBps" INTEGER,
    "privateMarketsAccess" TEXT,
    "clientsPerAdvisor" INTEGER NOT NULL,
    "taxCoordinationLevel" TEXT NOT NULL,
    "differentiationText" TEXT NOT NULL,
    "concessionsText" TEXT,
    "normalizedData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonView" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "visibleResponseCount" INTEGER NOT NULL DEFAULT 3,
    "isPaywalled" BOOLEAN NOT NULL DEFAULT true,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',

    CONSTRAINT "ComparisonView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectProfile_prospectId_key" ON "ProspectProfile"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_userId_key" ON "Advisor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RfpInvitation_inviteToken_key" ON "RfpInvitation"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorResponse_invitationId_key" ON "AdvisorResponse"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "ComparisonView_rfpId_key" ON "ComparisonView"("rfpId");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectProfile" ADD CONSTRAINT "ProspectProfile_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfp" ADD CONSTRAINT "Rfp_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advisor" ADD CONSTRAINT "Advisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfpInvitation" ADD CONSTRAINT "RfpInvitation_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "Rfp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfpInvitation" ADD CONSTRAINT "RfpInvitation_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorResponse" ADD CONSTRAINT "AdvisorResponse_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "Rfp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorResponse" ADD CONSTRAINT "AdvisorResponse_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorResponse" ADD CONSTRAINT "AdvisorResponse_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "RfpInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonView" ADD CONSTRAINT "ComparisonView_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "Rfp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
