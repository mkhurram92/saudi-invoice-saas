-- ============================================================
-- Saudi ZATCA QR Invoice SaaS - Database Schema
-- Phase 1: Invoice Generation with QR Codes
-- ============================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS `saudi_invoice_saas`;
USE `saudi_invoice_saas`;

-- ============================================================
-- TABLE: companies
-- Stores company/vendor information for single-company Phase 1
-- ============================================================
CREATE TABLE `companies` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `tax_id` VARCHAR(15) NOT NULL UNIQUE COMMENT '15-digit ZATCA TIN',
  `address` TEXT,
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `bank_name` VARCHAR(100),
  `bank_account_number` VARCHAR(50),
  `bank_iban` VARCHAR(50),
  `bank_swift` VARCHAR(20),
  `logo_url` VARCHAR(255) COMMENT 'For future logo support',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_tax_id` (`tax_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Company/Vendor master data';

-- ============================================================
-- TABLE: invoices
-- Main invoice storage with ZATCA compliance fields
-- ============================================================
CREATE TABLE `invoices` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Invoice reference number',
  `company_id` INT NOT NULL,
  
  -- Customer Information
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_tax_id` VARCHAR(15) COMMENT 'Customer 15-digit TIN',
  `customer_address` TEXT,
  
  -- Invoice Details
  `invoice_date` DATE NOT NULL,
  `due_date` DATE,
  
  -- Amounts
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `vat_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '15% of subtotal',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Subtotal + VAT',
  `vat_rate` INT NOT NULL DEFAULT 15 COMMENT 'VAT percentage',
  
  -- Additional Info
  `notes` TEXT,
  `payment_method` VARCHAR(50) COMMENT 'bank_transfer, check, cash, credit',
  
  -- ZATCA QR Code
  `qr_code_data` LONGTEXT COMMENT 'Base64 encoded TLV QR data',
  `pdf_url` VARCHAR(255) COMMENT 'S3 or file storage URL',
  
  -- Status
  `status` ENUM('draft', 'issued', 'paid', 'cancelled') NOT NULL DEFAULT 'draft',
  
  -- Metadata
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY `fk_invoices_company` (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_invoice_number` (`invoice_number`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_invoice_date` (`invoice_date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Master invoice records with ZATCA compliance';

-- ============================================================
-- TABLE: invoice_items
-- Line items for each invoice
-- ============================================================
CREATE TABLE `invoice_items` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` INT NOT NULL,
  `description` TEXT NOT NULL COMMENT 'Item/service description (bilingual)',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `quantity` INT NOT NULL DEFAULT 1,
  `total_price` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'unit_price * quantity',
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY `fk_invoice_items_invoice` (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  INDEX `idx_invoice_id` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items for invoices';

-- ============================================================
-- TABLE: invoice_templates
-- Invoice template management for recurring invoices
-- ============================================================
CREATE TABLE `invoice_templates` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `company_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL COMMENT 'Template name (e.g., "Standard Service Invoice")',
  `description` TEXT,
  `template_data` JSON COMMENT 'Stores default values as JSON',
  `is_default` BOOLEAN DEFAULT FALSE,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY `fk_templates_company` (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Invoice templates for Phase 1 template management';

-- ============================================================
-- TABLE: audit_log (Future Phase 2)
-- For ZATCA compliance and audit trail
-- ============================================================
CREATE TABLE `audit_log` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `invoice_id` INT,
  `action` VARCHAR(50) COMMENT 'created, updated, finalized, submitted, rejected',
  `details` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY `fk_audit_invoice` (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  INDEX `idx_invoice_id` (`invoice_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for ZATCA compliance (Phase 2)';

-- ============================================================
-- SAMPLE DATA for Testing
-- ============================================================

-- Insert sample company
INSERT INTO `companies` (
  `name`, `tax_id`, `address`, `phone`, `email`,
  `bank_name`, `bank_account_number`, `bank_iban`, `bank_swift`
) VALUES (
  'Saudi Modern Packaging Co Ltd',
  '300795366400003',
  'PO Box 19596, Jeddah 21445, Kingdom of Saudi Arabia',
  '+966-2-6400000',
  'info@saudmodern.com',
  'Riyadh Bank',
  '1511074159940',
  'SA1320000001511074159940',
  'RIBLSARI151'
);

-- Insert sample invoice template
INSERT INTO `invoice_templates` (
  `company_id`, `name`, `description`, `template_data`, `is_default`
) VALUES (
  1,
  'Standard Service Invoice',
  'Template for standard service invoices',
  JSON_OBJECT(
    'payment_method', 'bank_transfer',
    'vat_rate', 15,
    'item_template', JSON_OBJECT(
      'description', 'Professional Services',
      'unit_price', 0,
      'quantity', 1
    )
  ),
  true
);

-- ============================================================
-- VIEWS (For reporting and convenience)
-- ============================================================

-- View: Recent Invoices
CREATE OR REPLACE VIEW `v_recent_invoices` AS
SELECT 
  i.id,
  i.invoice_number,
  c.name AS company_name,
  i.customer_name,
  i.invoice_date,
  i.subtotal,
  i.vat_amount,
  i.total_amount,
  i.status,
  i.created_at
FROM invoices i
JOIN companies c ON i.company_id = c.id
ORDER BY i.invoice_date DESC
LIMIT 100;

-- View: Invoice Summary by Status
CREATE OR REPLACE VIEW `v_invoice_summary` AS
SELECT 
  i.status,
  COUNT(*) AS total_invoices,
  SUM(i.total_amount) AS total_amount,
  AVG(i.total_amount) AS avg_amount
FROM invoices i
GROUP BY i.status;

-- View: Monthly Invoice Report
CREATE OR REPLACE VIEW `v_monthly_invoices` AS
SELECT 
  DATE_FORMAT(i.invoice_date, '%Y-%m') AS month,
  COUNT(*) AS invoice_count,
  SUM(i.subtotal) AS total_sales,
  SUM(i.vat_amount) AS total_vat,
  SUM(i.total_amount) AS total_revenue
FROM invoices i
WHERE i.status != 'cancelled'
GROUP BY DATE_FORMAT(i.invoice_date, '%Y-%m')
ORDER BY month DESC;

-- ============================================================
-- INDEXES for Performance
-- ============================================================

-- Already created in table definitions, but explicit for clarity:
-- - idx_invoice_number: For quick invoice lookup
-- - idx_company_id: For company filtering
-- - idx_invoice_date: For date range queries
-- - idx_status: For status filtering
-- - idx_created_at: For sorting

-- ============================================================
-- PARTITION SUPPORT (Optional for large databases)
-- ============================================================

/*
-- Partition invoices table by year for large databases:
ALTER TABLE invoices
PARTITION BY RANGE (YEAR(invoice_date)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
*/

-- ============================================================
-- BACKUP & RESTORE HINTS
-- ============================================================

/*
BACKUP:
mysqldump -u root -p saudi_invoice_saas > backup_$(date +%Y%m%d).sql

RESTORE:
mysql -u root -p saudi_invoice_saas < backup_20250815.sql

EXPORT:
SELECT * INTO OUTFILE '/tmp/invoices.csv'
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
FROM invoices;
*/

-- ============================================================
-- END OF SCHEMA
-- ============================================================
