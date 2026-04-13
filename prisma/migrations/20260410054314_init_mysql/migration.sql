-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('SDM', 'SPECIALIST', 'HR_HEAD') NOT NULL,
    `image` VARCHAR(191) NULL,
    `azure_ad_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_azure_ad_id_key`(`azure_ad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `is_blacklisted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `candidates_name_idx`(`name`),
    INDEX `candidates_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partners` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `standard_checks` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `partners_name_key`(`name`),
    UNIQUE INDEX `partners_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_clients` (
    `id` VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `client_name` VARCHAR(191) NOT NULL,
    `usa_checks` JSON NULL,
    `canada_checks` JSON NULL,
    `latam_checks` JSON NULL,
    `special_notes` VARCHAR(191) NULL,

    UNIQUE INDEX `partner_clients_partner_id_client_name_key`(`partner_id`, `client_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_check_requirements` (
    `id` VARCHAR(191) NOT NULL,
    `partner_client_id` VARCHAR(191) NOT NULL,
    `check_type` VARCHAR(191) NOT NULL,
    `region` ENUM('USA', 'CANADA', 'LATAM') NOT NULL DEFAULT 'USA',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT true,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bgv_requests` (
    `id` VARCHAR(191) NOT NULL,
    `request_number` VARCHAR(191) NOT NULL,
    `candidate_id` VARCHAR(191) NOT NULL,
    `partner_id` VARCHAR(191) NOT NULL,
    `partner_client_id` VARCHAR(191) NULL,
    `submitted_by_id` VARCHAR(191) NOT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `role_type` ENUM('FTE_W2', 'PRO', 'DISPATCH', 'BACKFILL') NOT NULL,
    `region` ENUM('USA', 'CANADA', 'LATAM') NOT NULL DEFAULT 'USA',
    `bgv_vendor` ENUM('DISA', 'PRECISEHIRE') NOT NULL DEFAULT 'DISA',
    `status` ENUM('PENDING', 'IN_PROGRESS', 'GREEN', 'AMBER', 'RED_FLAG', 'BLACKLISTED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('NORMAL', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'NORMAL',
    `bgv_type` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    `deployment_date` DATETIME(3) NULL,
    `initiation_date` DATETIME(3) NULL,
    `completion_date` DATETIME(3) NULL,
    `letter_issued_date` DATETIME(3) NULL,
    `disa_cost` DECIMAL(65, 30) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bgv_requests_request_number_key`(`request_number`),
    INDEX `bgv_requests_status_idx`(`status`),
    INDEX `bgv_requests_partner_id_idx`(`partner_id`),
    INDEX `bgv_requests_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bgv_checks` (
    `id` VARCHAR(191) NOT NULL,
    `bgv_request_id` VARCHAR(191) NOT NULL,
    `assigned_to_id` VARCHAR(191) NULL,
    `check_type` VARCHAR(191) NOT NULL,
    `requirement_source` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'CLEARED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `remarks` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bgv_checks_bgv_request_id_idx`(`bgv_request_id`),
    INDEX `bgv_checks_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blacklist_entries` (
    `id` VARCHAR(191) NOT NULL,
    `candidate_id` VARCHAR(191) NOT NULL,
    `bgv_request_id` VARCHAR(191) NOT NULL,
    `failed_check` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `blacklisted_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `blacklist_entries_bgv_request_id_key`(`bgv_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `bgv_request_id` VARCHAR(191) NOT NULL,
    `performed_by_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_bgv_request_id_idx`(`bgv_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `bgv_request_id` VARCHAR(191) NULL,
    `trigger_type` VARCHAR(191) NOT NULL,
    `recipient_email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_clients` ADD CONSTRAINT `partner_clients_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_check_requirements` ADD CONSTRAINT `client_check_requirements_partner_client_id_fkey` FOREIGN KEY (`partner_client_id`) REFERENCES `partner_clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_requests` ADD CONSTRAINT `bgv_requests_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_requests` ADD CONSTRAINT `bgv_requests_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_requests` ADD CONSTRAINT `bgv_requests_partner_client_id_fkey` FOREIGN KEY (`partner_client_id`) REFERENCES `partner_clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_requests` ADD CONSTRAINT `bgv_requests_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_requests` ADD CONSTRAINT `bgv_requests_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_checks` ADD CONSTRAINT `bgv_checks_bgv_request_id_fkey` FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bgv_checks` ADD CONSTRAINT `bgv_checks_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blacklist_entries` ADD CONSTRAINT `blacklist_entries_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blacklist_entries` ADD CONSTRAINT `blacklist_entries_bgv_request_id_fkey` FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blacklist_entries` ADD CONSTRAINT `blacklist_entries_blacklisted_by_id_fkey` FOREIGN KEY (`blacklisted_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_bgv_request_id_fkey` FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_performed_by_id_fkey` FOREIGN KEY (`performed_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_bgv_request_id_fkey` FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
