-- AmbatuGrow ERP - Complete Database Schema DDL Script
-- Target Engine: MySQL / MariaDB (InnoDB)

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- 1. Core & Master Data
-- -----------------------------------------------------

DROP TABLE IF EXISTS `Roles`;
CREATE TABLE `Roles` (
    `role_id` VARCHAR(20) PRIMARY KEY,
    `role_name` VARCHAR(100) UNIQUE NOT NULL,
    `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
    `user_id` VARCHAR(20) PRIMARY KEY,
    `role_id` VARCHAR(20) NOT NULL,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `Roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Addresses`;
CREATE TABLE `Addresses` (
    `address_id` INT AUTO_INCREMENT PRIMARY KEY,
    `street` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `zipcode` VARCHAR(20) NOT NULL,
    `country` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Units_of_Measure`;
CREATE TABLE `Units_of_Measure` (
    `uom_id` INT AUTO_INCREMENT PRIMARY KEY,
    `uom_code` VARCHAR(10) NOT NULL,
    `uom_name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Payment_Terms`;
CREATE TABLE `Payment_Terms` (
    `payment_term_id` INT AUTO_INCREMENT PRIMARY KEY,
    `term_code` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `net_days` INT NOT NULL,
    `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Currencies`;
CREATE TABLE `Currencies` (
    `currency_id` INT AUTO_INCREMENT PRIMARY KEY,
    `currency_code` CHAR(3) NOT NULL,
    `currency_name` VARCHAR(50) NOT NULL,
    `exchange_rate` DECIMAL(10,4) NOT NULL DEFAULT 1.0000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------
-- 2. Product & Inventory Management (PIM / WMS)
-- -----------------------------------------------------

DROP TABLE IF EXISTS `Categories`;
CREATE TABLE `Categories` (
    `category_id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_name` VARCHAR(100) NOT NULL,
    `parent_category_id` INT NULL,
    FOREIGN KEY (`parent_category_id`) REFERENCES `Categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Products`;
CREATE TABLE `Products` (
    `product_id` INT AUTO_INCREMENT PRIMARY KEY,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category_id` INT NOT NULL,
    `uom_id` INT NOT NULL,
    `currency_id` INT NOT NULL,
    `base_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `min_quantity_threshold` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `lead_time_days` INT NOT NULL DEFAULT 0,
    FOREIGN KEY (`category_id`) REFERENCES `Categories` (`category_id`),
    FOREIGN KEY (`uom_id`) REFERENCES `Units_of_Measure` (`uom_id`),
    FOREIGN KEY (`currency_id`) REFERENCES `Currencies` (`currency_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Warehouses`;
CREATE TABLE `Warehouses` (
    `warehouse_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `address_id` INT NOT NULL,
    `capacity_sqm` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (`address_id`) REFERENCES `Addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Warehouse_Zones`;
CREATE TABLE `Warehouse_Zones` (
    `zone_id` INT AUTO_INCREMENT PRIMARY KEY,
    `warehouse_id` INT NOT NULL,
    `zone_name` VARCHAR(50) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    FOREIGN KEY (`warehouse_id`) REFERENCES `Warehouses` (`warehouse_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Inventory_Locations`;
CREATE TABLE `Inventory_Locations` (
    `inventory_id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `warehouse_id` INT NOT NULL,
    `zone_id` INT NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `expiration_date` DATE NULL,
    FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`),
    FOREIGN KEY (`warehouse_id`) REFERENCES `Warehouses` (`warehouse_id`),
    FOREIGN KEY (`zone_id`) REFERENCES `Warehouse_Zones` (`zone_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Stock_Transactions`;
CREATE TABLE `Stock_Transactions` (
    `transaction_id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `warehouse_id` INT NOT NULL,
    `transaction_type` ENUM('Stock-in', 'Stock-out', 'Transfer') NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL,
    `transaction_date` DATETIME NOT NULL,
    `reference_id` INT NULL,
    FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`),
    FOREIGN KEY (`warehouse_id`) REFERENCES `Warehouses` (`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------
-- 3. Procurement & Supply Chain (SCM)
-- -----------------------------------------------------

DROP TABLE IF EXISTS `Suppliers`;
CREATE TABLE `Suppliers` (
    `supplier_id` INT AUTO_INCREMENT PRIMARY KEY,
    `supplier_name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `address_id` INT NOT NULL,
    `status` ENUM('Active', 'Inactive', 'Blacklisted') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (`address_id`) REFERENCES `Addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Product_Suppliers`;
CREATE TABLE `Product_Suppliers` (
    `product_id` INT NOT NULL,
    `supplier_id` INT NOT NULL,
    `supplier_sku` VARCHAR(50) NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `lead_time_days` INT NOT NULL DEFAULT 0,
    `is_preferred` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`product_id`, `supplier_id`),
    FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`) ON DELETE CASCADE,
    FOREIGN KEY (`supplier_id`) REFERENCES `Suppliers` (`supplier_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Purchase_Orders`;
CREATE TABLE `Purchase_Orders` (
    `po_id` INT AUTO_INCREMENT PRIMARY KEY,
    `po_number` VARCHAR(50) NOT NULL UNIQUE,
    `supplier_id` INT NOT NULL,
    `requisition_id` INT NULL,
    `payment_term_id` INT NOT NULL,
    `currency_id` INT NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `order_date` DATETIME NOT NULL,
    `created_by` VARCHAR(20) NOT NULL,
    FOREIGN KEY (`supplier_id`) REFERENCES `Suppliers` (`supplier_id`),
    FOREIGN KEY (`payment_term_id`) REFERENCES `Payment_Terms` (`payment_term_id`),
    FOREIGN KEY (`currency_id`) REFERENCES `Currencies` (`currency_id`),
    FOREIGN KEY (`created_by`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `PO_Items`;
CREATE TABLE `PO_Items` (
    `po_item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `po_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` DECIMAL(10,2) NOT NULL,
    `uom_id` INT NOT NULL,
    `unit_price` DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (`po_id`) REFERENCES `Purchase_Orders` (`po_id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `Products` (`product_id`),
    FOREIGN KEY (`uom_id`) REFERENCES `Units_of_Measure` (`uom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Supplier_Invoices`;
CREATE TABLE `Supplier_Invoices` (
    `invoice_id` INT AUTO_INCREMENT PRIMARY KEY,
    `supplier_id` INT NOT NULL,
    `po_id` INT NOT NULL,
    `invoice_number` VARCHAR(100) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    FOREIGN KEY (`supplier_id`) REFERENCES `Suppliers` (`supplier_id`),
    FOREIGN KEY (`po_id`) REFERENCES `Purchase_Orders` (`po_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------
-- 4. Sales & Customer Management (CRM)
-- -----------------------------------------------------

DROP TABLE IF EXISTS `Customers`;
CREATE TABLE `Customers` (
    `customer_id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `address_id` INT NOT NULL,
    FOREIGN KEY (`address_id`) REFERENCES `Addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Sales_Orders`;
CREATE TABLE `Sales_Orders` (
    `order_id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `rep_id` VARCHAR(20) NOT NULL,
    `order_date` DATETIME NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `payment_term_id` INT NOT NULL,
    `currency_id` INT NOT NULL,
    FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`),
    FOREIGN KEY (`rep_id`) REFERENCES `Users` (`user_id`),
    FOREIGN KEY (`payment_term_id`) REFERENCES `Payment_Terms` (`payment_term_id`),
    FOREIGN KEY (`currency_id`) REFERENCES `Currencies` (`currency_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Billing_Details`;
CREATE TABLE `Billing_Details` (
    `billing_id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `address_id` INT NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `Sales_Orders` (`order_id`) ON DELETE CASCADE,
    FOREIGN KEY (`address_id`) REFERENCES `Addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------
-- 5. Helpdesk & Logistics
-- -----------------------------------------------------

DROP TABLE IF EXISTS `Tickets`;
CREATE TABLE `Tickets` (
    `ticket_id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `order_id` INT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `priority` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Low',
    FOREIGN KEY (`customer_id`) REFERENCES `Customers` (`customer_id`),
    FOREIGN KEY (`order_id`) REFERENCES `Sales_Orders` (`order_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Shipments`;
CREATE TABLE `Shipments` (
    `shipment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `reference_type` ENUM('Inbound', 'Outbound') NOT NULL,
    `reference_id` INT NOT NULL,
    `destination_address_id` INT NOT NULL,
    FOREIGN KEY (`destination_address_id`) REFERENCES `Addresses` (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
