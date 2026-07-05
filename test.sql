CREATE TABLE Users (
    user_id VARCHAR(20) PRIMARY KEY,
    role_id VARCHAR(20) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(role_id)
        REFERENCES Roles(role_id)
);


INSERT INTO Users VALUES
('USR-000001','ROL-000001','admin',
'admin123','System','Administrator',
'admin@ambatugrow.com','Active',NOW()),

('USR-000002','ROL-000002','inventory1',
'inventory123','Juan','Dela Cruz',
'inventory@ambatugrow.com','Active',NOW()),

('USR-000003','ROL-000003','procurement1',
'proc123','Maria','Santos',
'procurement@ambatugrow.com','Active',NOW()),

('USR-000004','ROL-000004','sales1',
'sales123','Pedro','Reyes',
'sales@ambatugrow.com','Active',NOW()),

('USR-000005','ROL-000005','warehouse1',
'warehouse123','Ana','Garcia',
'warehouse@ambatugrow.com','Active',NOW()),

('USR-000006','ROL-000006','helpdesk1',
'help123','Carlo','Torres',
'helpdesk@ambatugrow.com','Active',NOW()),

('USR-000007','ROL-000007','logistics1',
'logistics123','Liza','Flores',
'logistics@ambatugrow.com','Active',NOW());

CREATE TABLE Roles (
    role_id VARCHAR(20) PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);


INSERT INTO Roles VALUES
('ROL-000001','Administrator','Full system access'),
('ROL-000002','Inventory Manager','Manages products and inventory'),
('ROL-000003','Procurement Officer','Handles purchasing'),
('ROL-000004','Sales Representative','Handles CRM and Sales'),
('ROL-000005','Warehouse Staff','Warehouse operations'),
('ROL-000006','Helpdesk Staff','Customer support'),
('ROL-000007','Logistics Staff','Shipping and deliveries');
