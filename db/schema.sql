-- ─────────────────────────────────────────────────────────────────────────────
--  BGV Portal — MySQL schema (hand-written, no ORM)
--  12 tables. cuid() is replaced by app-side id generation (VARCHAR(30) PK).
-- ─────────────────────────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `email_logs`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `blacklist_entries`;
DROP TABLE IF EXISTS `bgv_checks`;
DROP TABLE IF EXISTS `bgv_requests`;
DROP TABLE IF EXISTS `client_check_requirements`;
DROP TABLE IF EXISTS `partner_clients`;
DROP TABLE IF EXISTS `partners`;
DROP TABLE IF EXISTS `candidates`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── USERS (synced from Azure AD) ──────────────────────────────────────────────
CREATE TABLE `users` (
  `id`           VARCHAR(30)  NOT NULL,
  `name`         VARCHAR(191) NOT NULL,
  `email`        VARCHAR(191) NOT NULL,
  `role`         ENUM('SDM','SPECIALIST','HR_HEAD') NOT NULL,
  `image`        TEXT         NULL,
  `azure_ad_id`  VARCHAR(191) NULL,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email`       (`email`),
  UNIQUE KEY `uk_users_azure_ad_id` (`azure_ad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CANDIDATES ────────────────────────────────────────────────────────────────
CREATE TABLE `candidates` (
  `id`             VARCHAR(30)  NOT NULL,
  `name`           VARCHAR(191) NOT NULL,
  `email`          VARCHAR(191) NOT NULL,
  `phone`          VARCHAR(64)  NULL,
  `date_of_birth`  DATE         NULL,
  `is_blacklisted` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_candidates_name`  (`name`),
  KEY `ix_candidates_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ITO PARTNERS ──────────────────────────────────────────────────────────────
CREATE TABLE `partners` (
  `id`              VARCHAR(30)  NOT NULL,
  `name`            VARCHAR(191) NOT NULL,
  `code`            VARCHAR(16)  NOT NULL,
  `standard_checks` JSON         NULL,
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_partners_name` (`name`),
  UNIQUE KEY `uk_partners_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PARTNER CLIENT ACCOUNTS ───────────────────────────────────────────────────
CREATE TABLE `partner_clients` (
  `id`            VARCHAR(30)  NOT NULL,
  `partner_id`    VARCHAR(30)  NOT NULL,
  `client_name`   VARCHAR(191) NOT NULL,
  `usa_checks`    JSON         NULL,
  `canada_checks` JSON         NULL,
  `latam_checks`  JSON         NULL,
  `special_notes` TEXT         NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_partner_clients_partner_client` (`partner_id`,`client_name`),
  KEY `ix_partner_clients_partner_id` (`partner_id`),
  CONSTRAINT `fk_partner_clients_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CLIENT-SPECIFIC CHECK REQUIREMENTS ────────────────────────────────────────
CREATE TABLE `client_check_requirements` (
  `id`                VARCHAR(30)  NOT NULL,
  `partner_client_id` VARCHAR(30)  NOT NULL,
  `check_type`        VARCHAR(128) NOT NULL,
  `region`            ENUM('USA','CANADA','LATAM') NOT NULL DEFAULT 'USA',
  `is_mandatory`      TINYINT(1)   NOT NULL DEFAULT 1,
  `description`       TEXT         NULL,
  PRIMARY KEY (`id`),
  KEY `ix_ccr_partner_client_id` (`partner_client_id`),
  CONSTRAINT `fk_ccr_partner_client`
    FOREIGN KEY (`partner_client_id`) REFERENCES `partner_clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BGV REQUESTS ──────────────────────────────────────────────────────────────
CREATE TABLE `bgv_requests` (
  `id`                  VARCHAR(30)  NOT NULL,
  `request_number`      VARCHAR(32)  NOT NULL,
  `candidate_id`        VARCHAR(30)  NOT NULL,
  `partner_id`          VARCHAR(30)  NOT NULL,
  `partner_client_id`   VARCHAR(30)  NULL,
  `submitted_by_id`     VARCHAR(30)  NOT NULL,
  `approved_by_id`      VARCHAR(30)  NULL,
  `role_type`           ENUM('FTE_W2','PRO','DISPATCH','BACKFILL') NOT NULL,
  `region`              ENUM('USA','CANADA','LATAM') NOT NULL DEFAULT 'USA',
  `bgv_vendor`          ENUM('DISA','PRECISEHIRE') NOT NULL DEFAULT 'DISA',
  `status`              ENUM('PENDING','IN_PROGRESS','GREEN','AMBER','RED_FLAG','BLACKLISTED')
                          NOT NULL DEFAULT 'PENDING',
  `priority`            ENUM('NORMAL','MEDIUM','HIGH') NOT NULL DEFAULT 'NORMAL',
  `bgv_type`            VARCHAR(64)  NOT NULL DEFAULT 'STANDARD',
  `deployment_date`     DATETIME(3)  NULL,
  `initiation_date`     DATETIME(3)  NULL,
  `completion_date`     DATETIME(3)  NULL,
  `letter_issued_date`  DATETIME(3)  NULL,
  `disa_cost`           DECIMAL(10,2) NULL,
  `notes`               TEXT         NULL,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bgv_requests_number` (`request_number`),
  KEY `ix_bgv_requests_status`      (`status`),
  KEY `ix_bgv_requests_partner_id`  (`partner_id`),
  KEY `ix_bgv_requests_created_at`  (`created_at`),
  KEY `ix_bgv_requests_candidate`   (`candidate_id`),
  CONSTRAINT `fk_bgv_requests_candidate`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`),
  CONSTRAINT `fk_bgv_requests_partner`
    FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`),
  CONSTRAINT `fk_bgv_requests_partner_client`
    FOREIGN KEY (`partner_client_id`) REFERENCES `partner_clients`(`id`),
  CONSTRAINT `fk_bgv_requests_submitted_by`
    FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_bgv_requests_approved_by`
    FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── INDIVIDUAL BGV CHECKS ─────────────────────────────────────────────────────
CREATE TABLE `bgv_checks` (
  `id`                  VARCHAR(30)  NOT NULL,
  `bgv_request_id`      VARCHAR(30)  NOT NULL,
  `assigned_to_id`      VARCHAR(30)  NULL,
  `check_type`          VARCHAR(128) NOT NULL,
  `requirement_source`  VARCHAR(128) NULL,
  `status`              ENUM('PENDING','IN_PROGRESS','CLEARED','FAILED')
                          NOT NULL DEFAULT 'PENDING',
  `started_at`          DATETIME(3)  NULL,
  `completed_at`        DATETIME(3)  NULL,
  `remarks`             TEXT         NULL,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_bgv_checks_request` (`bgv_request_id`),
  KEY `ix_bgv_checks_status`  (`status`),
  CONSTRAINT `fk_bgv_checks_request`
    FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bgv_checks_assigned_to`
    FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BLACKLIST REGISTRY ────────────────────────────────────────────────────────
CREATE TABLE `blacklist_entries` (
  `id`                 VARCHAR(30)  NOT NULL,
  `candidate_id`       VARCHAR(30)  NOT NULL,
  `bgv_request_id`     VARCHAR(30)  NOT NULL,
  `failed_check`       VARCHAR(128) NOT NULL,
  `reason`             TEXT         NOT NULL,
  `blacklisted_by_id`  VARCHAR(30)  NOT NULL,
  `created_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blacklist_entries_request` (`bgv_request_id`),
  KEY `ix_blacklist_entries_candidate` (`candidate_id`),
  CONSTRAINT `fk_blacklist_candidate`
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`),
  CONSTRAINT `fk_blacklist_request`
    FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`),
  CONSTRAINT `fk_blacklist_user`
    FOREIGN KEY (`blacklisted_by_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ACTIVITY LOG (audit trail) ────────────────────────────────────────────────
CREATE TABLE `activity_logs` (
  `id`               VARCHAR(30)  NOT NULL,
  `bgv_request_id`   VARCHAR(30)  NOT NULL,
  `performed_by_id`  VARCHAR(30)  NOT NULL,
  `action`           VARCHAR(128) NOT NULL,
  `details`          TEXT         NULL,
  `created_at`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_activity_logs_request` (`bgv_request_id`),
  CONSTRAINT `fk_activity_logs_request`
    FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_logs_user`
    FOREIGN KEY (`performed_by_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EMAIL LOG ─────────────────────────────────────────────────────────────────
CREATE TABLE `email_logs` (
  `id`               VARCHAR(30)  NOT NULL,
  `bgv_request_id`   VARCHAR(30)  NULL,
  `trigger_type`     VARCHAR(64)  NOT NULL,
  `recipient_email`  VARCHAR(191) NOT NULL,
  `subject`          VARCHAR(255) NOT NULL,
  `status`           VARCHAR(16)  NOT NULL DEFAULT 'SENT',
  `sent_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ix_email_logs_request` (`bgv_request_id`),
  CONSTRAINT `fk_email_logs_request`
    FOREIGN KEY (`bgv_request_id`) REFERENCES `bgv_requests`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
