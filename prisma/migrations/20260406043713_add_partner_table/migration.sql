/*
  Warnings:

  - You are about to drop the `CheckMatrix` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partner` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SDM', 'SPECIALIST', 'HR_HEAD');

-- CreateEnum
CREATE TYPE "BGVStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'GREEN', 'AMBER', 'RED_FLAG', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'CLEARED', 'FAILED');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('FTE_W2', 'PRO', 'DISPATCH', 'BACKFILL');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('USA', 'CANADA', 'LATAM');

-- CreateEnum
CREATE TYPE "BGVVendor" AS ENUM ('DISA', 'PRECISEHIRE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'MEDIUM', 'HIGH');

-- DropTable
DROP TABLE "CheckMatrix";

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "Partner";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "azure_ad_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "standard_checks" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_clients" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "usa_checks" JSONB,
    "canada_checks" JSONB,
    "latam_checks" JSONB,
    "special_notes" TEXT,

    CONSTRAINT "partner_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_check_requirements" (
    "id" TEXT NOT NULL,
    "partner_client_id" TEXT NOT NULL,
    "check_type" TEXT NOT NULL,
    "region" "Region" NOT NULL DEFAULT 'USA',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,

    CONSTRAINT "client_check_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bgv_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "partner_client_id" TEXT,
    "submitted_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "role_type" "RoleType" NOT NULL,
    "region" "Region" NOT NULL DEFAULT 'USA',
    "bgv_vendor" "BGVVendor" NOT NULL DEFAULT 'DISA',
    "status" "BGVStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "bgv_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "deployment_date" TIMESTAMP(3),
    "initiation_date" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "letter_issued_date" TIMESTAMP(3),
    "disa_cost" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bgv_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bgv_checks" (
    "id" TEXT NOT NULL,
    "bgv_request_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "check_type" TEXT NOT NULL,
    "requirement_source" TEXT,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bgv_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklist_entries" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "bgv_request_id" TEXT NOT NULL,
    "failed_check" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blacklisted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "bgv_request_id" TEXT NOT NULL,
    "performed_by_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "bgv_request_id" TEXT,
    "trigger_type" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_azure_ad_id_key" ON "users"("azure_ad_id");

-- CreateIndex
CREATE INDEX "candidates_name_idx" ON "candidates"("name");

-- CreateIndex
CREATE INDEX "candidates_email_idx" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_name_key" ON "partners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "partners_code_key" ON "partners"("code");

-- CreateIndex
CREATE UNIQUE INDEX "partner_clients_partner_id_client_name_key" ON "partner_clients"("partner_id", "client_name");

-- CreateIndex
CREATE UNIQUE INDEX "bgv_requests_request_number_key" ON "bgv_requests"("request_number");

-- CreateIndex
CREATE INDEX "bgv_requests_status_idx" ON "bgv_requests"("status");

-- CreateIndex
CREATE INDEX "bgv_requests_partner_id_idx" ON "bgv_requests"("partner_id");

-- CreateIndex
CREATE INDEX "bgv_requests_created_at_idx" ON "bgv_requests"("created_at");

-- CreateIndex
CREATE INDEX "bgv_checks_bgv_request_id_idx" ON "bgv_checks"("bgv_request_id");

-- CreateIndex
CREATE INDEX "bgv_checks_status_idx" ON "bgv_checks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "blacklist_entries_bgv_request_id_key" ON "blacklist_entries"("bgv_request_id");

-- CreateIndex
CREATE INDEX "activity_logs_bgv_request_id_idx" ON "activity_logs"("bgv_request_id");

-- AddForeignKey
ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_check_requirements" ADD CONSTRAINT "client_check_requirements_partner_client_id_fkey" FOREIGN KEY ("partner_client_id") REFERENCES "partner_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_requests" ADD CONSTRAINT "bgv_requests_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_requests" ADD CONSTRAINT "bgv_requests_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_requests" ADD CONSTRAINT "bgv_requests_partner_client_id_fkey" FOREIGN KEY ("partner_client_id") REFERENCES "partner_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_requests" ADD CONSTRAINT "bgv_requests_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_requests" ADD CONSTRAINT "bgv_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_checks" ADD CONSTRAINT "bgv_checks_bgv_request_id_fkey" FOREIGN KEY ("bgv_request_id") REFERENCES "bgv_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bgv_checks" ADD CONSTRAINT "bgv_checks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_bgv_request_id_fkey" FOREIGN KEY ("bgv_request_id") REFERENCES "bgv_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist_entries" ADD CONSTRAINT "blacklist_entries_blacklisted_by_id_fkey" FOREIGN KEY ("blacklisted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_bgv_request_id_fkey" FOREIGN KEY ("bgv_request_id") REFERENCES "bgv_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_bgv_request_id_fkey" FOREIGN KEY ("bgv_request_id") REFERENCES "bgv_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
