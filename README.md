# AmbatuGrow ERP - Inventory Department Terminal

Welcome to the **AmbatuGrow ERP** repository. This branch is isolated and optimized exclusively for the **Inventory Department**, providing a high-performance, professional-grade terminal for tracking stock, managing transactions, mapping warehouse locations, and reporting.

---

## 📊 Entity-Relationship Diagram (ERD)

The database schema is designed for consistency, concurrency control (via pessimistic transaction locking), and full audit logging. Below is the interactive visual representation of our entities and their relationships.

```mermaid
erDiagram
    Product {
        int product_id PK
        string sku
        string name
        string description
        int category_id FK
        int min_quantity_threshold
    }

    InventoryLocation {
        int inventory_id PK
        int product_id FK
        int warehouse_id FK
        string zone
        int quantity
        string expiration_date
    }

    StockTransaction {
        int transaction_id PK
        int product_id FK
        string transaction_type
        int quantity
        string transaction_date
    }

    Category {
        int category_id PK
        string name
    }

    Warehouse {
        int warehouse_id PK
        string name
    }

    PurchaseRequisition {
        int requisition_id PK
        string requesting_department
        string status
    }

    PurchaseOrder {
        int po_id PK
        int requisition_id FK
        int supplier_id FK
        string status
        string order_date
    }

    PoItem {
        int po_item_id PK
        int po_id FK
        int product_id FK
        int quantity
    }

    GoodsReceipt {
        int receipt_id PK
        int po_id FK
        string receipt_date
        string three_way_match_status
    }

    Supplier {
        int supplier_id PK
        string supplier_name
        string contact_info
        float performance_rating
    }

    Customer {
        int customer_id PK
        string first_name
        string last_name
        string email
        string phone
    }

    SalesOrder {
        int order_id PK
        int customer_id FK
        string order_date
        string status
        float total_amount
        float tax_amount
        float discount_amount
    }

    OrderItem {
        int order_item_id PK
        int order_id FK
        int product_id FK
        int quantity
        float unit_price
    }

    ShipmentTracking {
        int shipment_id PK
        string reference_type
        int reference_id
        string status
        string route_details
    }

    SupportAgent {
        int agent_id PK
        string name
        string department
    }

    SupportTicket {
        int ticket_id PK
        int customer_id FK
        int agent_id FK
        string status
        string priority
        string sla_due_date
    }

    TicketInteractionLog {
        int log_id PK
        int ticket_id FK
        string interaction_type
        string message_body
        string timestamp
    }

    AuditLog {
        int audit_id PK
        string timestamp
        string user_role
        string action
        string description
        string table_name
        int record_id
    }

    %% Relationships
    Category ||--o{ Product : "classifies"
    Product ||--o{ InventoryLocation : "stocked_at"
    Warehouse ||--o{ InventoryLocation : "contains"
    Product ||--|{ StockTransaction : "logs_changes"
    
    PurchaseRequisition ||--|{ PurchaseOrder : "generates"
    Supplier ||--o{ PurchaseOrder : "receives"
    PurchaseOrder ||--o{ PoItem : "details"
    Product ||--o{ PoItem : "ordered_in"
    PurchaseOrder ||--o{ GoodsReceipt : "verifies"

    Customer ||--|{ SalesOrder : "places"
    SalesOrder ||--o{ OrderItem : "contains"
    Product ||--o{ OrderItem : "sold_in"

    Customer ||--|{ SupportTicket : "opens"
    SupportAgent ||--|{ SupportTicket : "assignee"
    SupportTicket ||--|{ TicketInteractionLog : "appends"
```

---

## 🗃️ Data Dictionary

### 1. `Product`
Stores catalog details for agricultural seeds and products.
* **`product_id` (INT, PK)**: Unique product key.
* **`sku` (VARCHAR, Unique)**: Stock Keeping Unit identifier.
* **`name` (VARCHAR)**: Display name.
* **`description` (TEXT)**: Product specifications and guidelines.
* **`category_id` (INT, FK)**: Links to Category.
* **`min_quantity_threshold` (INT)**: Minimum limit triggering low-stock alerts.

### 2. `InventoryLocation`
Maps stock quantities to specific zones in warehouses.
* **`inventory_id` (INT, PK)**: Unique location record key.
* **`product_id` (INT, FK)**: Links to Product.
* **`warehouse_id` (INT, FK)**: Links to Warehouse.
* **`zone` (VARCHAR)**: Coordinate grid zone (e.g. A1, B2).
* **`quantity` (INT)**: Stock count in zone.
* **`expiration_date` (DATE)**: Expiration limit for perishable inventory.

### 3. `StockTransaction`
Maintains an immutable historical record of stock changes.
* **`transaction_id` (INT, PK)**: Unique transaction key.
* **`product_id` (INT, FK)**: Links to Product.
* **`transaction_type` (VARCHAR)**: Type of change (`ADJUSTMENT`, `TRANSFER`, `RECEIPT`, `DISPATCH`).
* **`quantity` (INT)**: Count delta (positive/negative).
* **`transaction_date` (TIMESTAMP)**: Action timestamp.

### 4. `PurchaseRequisition`
Internal request from department staffs for procurement restocking.
* **`requisition_id` (INT, PK)**: Unique requisition ID.
* **`requesting_department` (VARCHAR)**: Originating team context.
* **`status` (VARCHAR)**: Approvals workflow status (`pending`, `approved`, `rejected`).

### 5. `PurchaseOrder`
Outgoing order generated and sent to suppliers.
* **`po_id` (INT, PK)**: Unique PO reference.
* **`requisition_id` (INT, FK)**: Links back to requesting requisition.
* **`supplier_id` (INT, FK)**: Links to target Supplier.
* **`status` (VARCHAR)**: Order lifecycle state (`issued`, `completed`).
* **`order_date` (TIMESTAMP)**: PO creation timestamp.

### 6. `GoodsReceipt`
Details processed during goods inbound delivery verification (3-way match).
* **`receipt_id` (INT, PK)**: Unique GR key.
* **`po_id` (INT, FK)**: Links to matching PO.
* **`receipt_date` (TIMESTAMP)**: Check-in timestamp.
* **`three_way_match_status` (VARCHAR)**: Matching audit result (`matched`, `discrepancy`).

### 7. `Supplier`
Vendor directory records.
* **`supplier_id` (INT, PK)**: Unique vendor reference.
* **`supplier_name` (VARCHAR)**: Corporate vendor name.
* **`contact_info` (TEXT)**: Primary phone, address, and email coordinates.
* **`performance_rating` (FLOAT)**: Calculated SLA rating.

### 8. `Customer`
Storefront buyer directory accounts.
* **`customer_id` (INT, PK)**: Unique client profile ID.
* **`first_name` (VARCHAR)**: First name.
* **`last_name` (VARCHAR)**: Last name.
* **`email` (VARCHAR)**: Primary email.
* **`phone` (VARCHAR)**: Phone coordinates.

### 9. `SalesOrder`
Completed storefront checkout records.
* **`order_id` (INT, PK)**: Unique invoice ID.
* **`customer_id` (INT, FK)**: Buyer link.
* **`order_date` (TIMESTAMP)**: Checkout checkout timestamp.
* **`status` (VARCHAR)**: Processing lifecycle state.
* **`total_amount` (DECIMAL)**: Total paid value.

### 10. `AuditLog`
System activity audit trail of user actions.
* **`audit_id` (INT, PK)**: Unique log entry key.
* **`timestamp` (TIMESTAMP)**: Event time.
* **`user_role` (VARCHAR)**: Active session role of user.
* **`action` (VARCHAR)**: Operation name.
* **`description` (TEXT)**: Detailed breakdown delta.

---

## 🛠️ Getting Started

### Prerequisites
* PHP 8.1+
* Apache / WampServer (with MySQL support)

### Run Server Locally
1. Start your local server or run:
   ```bash
   php -S 127.0.0.1:8080 index.php
   ```
2. Navigate to [http://127.0.0.1:8080](http://127.0.0.1:8080) to access the Inventory Terminal interface.
