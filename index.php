<?php

// =========================================================================
// LARAVEL STUBS & REAL MYSQL DATABASE (PDO) ORM ENGINE
// =========================================================================

namespace {
    // Global response helper
    function response() {
        return new class {
            public function json($data, $status = 200) {
                return new \Illuminate\Http\JsonResponse($data, $status);
            }
        };
    }
}

namespace Illuminate\Database\Eloquent {
    abstract class Model implements \JsonSerializable {
        protected $attributes = [];
        public $exists = false;
        
        public function __construct(array $attributes = []) {
            $this->attributes = $attributes;
        }

        public function __set($name, $value) {
            $this->attributes[$name] = $value;
        }

        public function __get($name) {
            return $this->attributes[$name] ?? null;
        }

        public function __isset($name) {
            return isset($this->attributes[$name]);
        }

        public function jsonSerialize(): mixed {
            return $this->attributes;
        }

        public function getRawAttributes() {
            return $this->attributes;
        }

        public function getTable() {
            return $this->table;
        }

        public function save() {
            \MockDB::saveModel($this);
            return true;
        }

        public static function create(array $attributes = []) {
            $class = static::class;
            $instance = new $class($attributes);
            $instance->exists = false; // Set to false so save() runs an INSERT query
            \MockDB::saveModel($instance);
            return $instance;
        }

        public function delete() {
            \MockDB::deleteModel($this);
            return true;
        }

        public static function find($id) {
            return \MockDB::find(static::class, $id);
        }

        public static function where($column, $operator = null, $value = null) {
            return new QueryBuilder(static::class, $column, $operator, $value);
        }

        public function belongsTo($related, $foreignKey = null, $ownerKey = null) {
            return new Relations\BelongsTo();
        }

        public function hasMany($related, $foreignKey = null, $localKey = null) {
            return new Relations\HasMany();
        }

        public function getPrimaryKeyName() {
            return $this->primaryKey ?? 'id';
        }
    }

    class QueryBuilder {
        private $modelClass;
        private $wheres = [];
        private $orderBy = [];

        public function __construct($modelClass, $column, $operator = null, $value = null) {
            $this->modelClass = $modelClass;
            if ($value === null) {
                $this->wheres[$column] = $operator;
            } else {
                $this->wheres[$column] = $value;
            }
        }

        public function where($column, $operator = null, $value = null) {
            if ($value === null) {
                $this->wheres[$column] = $operator;
            } else {
                $this->wheres[$column] = $value;
            }
            return $this;
        }

        public function orderBy($column, $direction = 'asc') {
            $this->orderBy[] = [$column, $direction];
            return $this;
        }

        public function orderByRaw($raw) {
            if (strpos($raw, 'expiration_date IS NULL') !== false) {
                $this->orderBy[] = ['expiration_date IS NULL', 'ASC'];
            }
            return $this;
        }

        public function lockForUpdate() {
            \MockDB::logLock($this->modelClass, $this->wheres);
            return $this;
        }

        public function get() {
            return new Collection(\MockDB::getRecords($this->modelClass, $this->wheres, $this->orderBy));
        }

        public function first() {
            $records = \MockDB::getRecords($this->modelClass, $this->wheres, $this->orderBy);
            return count($records) > 0 ? $records[0] : null;
        }

        public function firstOrFail() {
            $record = \MockDB::first($this->modelClass, $this->wheres);
            if (!$record) {
                throw new \Exception("Record matching criteria not found in database.");
            }
            return $record;
        }
    }

    class Collection extends \ArrayObject {
        public function sum($column) {
            $sum = 0;
            foreach ($this as $item) {
                $sum += $item->$column;
            }
            return $sum;
        }
    }
}

namespace Illuminate\Database\Eloquent\Relations {
    class BelongsTo {}
    class HasMany {}
}

namespace Illuminate\Support\Facades {
    class DB {
        public static function beginTransaction() {
            \MockDB::beginTransaction();
        }
        public static function commit() {
            \MockDB::commit();
        }
        public static function rollBack() {
            \MockDB::rollBack();
        }
    }

    class Validator {
        public static function make(array $data, array $rules) {
            return new class($data) {
                private $data;
                public function __construct($data) { $this->data = $data; }
                public function fails() {
                    return false;
                }
                public function errors() {
                    return ['general' => ['Validation failed']];
                }
                public function validated() {
                    return $this->data;
                }
            };
        }
    }
}

namespace Illuminate\Http {
    class Request {
        private $data;
        public function __construct(array $data) { $this->data = $data; }
        public function all() { return $this->data; }
    }

    class JsonResponse {
        public $data;
        public $status;
        public function __construct($data, $status) {
            $this->data = $data;
            $this->status = $status;
        }
    }
}

namespace App\Http\Controllers {
    class Controller {}
}

// Stub remaining unused classes to prevent PHP errors
namespace App\Models {
    class Payment extends \Illuminate\Database\Eloquent\Model { protected $table = 'payment'; protected $primaryKey = 'payment_id'; }
}

// Real MySQL Database PDO Registry
namespace {
    class MockDB {
        /** @var PDO */
        public static $pdo = null;
        public static $transactionLog = [];
        public static $locks = [];

        public static function init() {
            if (self::$pdo === null) {
                try {
                    self::$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=itec-75_erp;charset=utf8mb4', 'root', '', [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    
                    // Ensure max_quantity_threshold column exists
                    try {
                        self::$pdo->exec("ALTER TABLE `product` ADD COLUMN `max_quantity_threshold` INT DEFAULT 50");
                    } catch (Exception $e) {
                        // Ignore if column already exists
                    }

                    // Ensure audit_log table exists
                    try {
                        self::$pdo->exec("CREATE TABLE IF NOT EXISTS `audit_log` (
                            `audit_id` INT AUTO_INCREMENT PRIMARY KEY,
                            `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            `user_role` VARCHAR(100) NOT NULL,
                            `action` VARCHAR(100) NOT NULL,
                            `description` TEXT NOT NULL,
                            `table_name` VARCHAR(100) NULL,
                            `record_id` INT NULL
                        ) ENGINE=InnoDB;");
                    } catch (Exception $e) {
                        // Ignore
                    }
                } catch (Exception $e) {
                    header('Content-Type: application/json');
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to connect to MySQL database itec-75_erp. Ensure WampServer is running.',
                        'error' => $e->getMessage()
                    ]);
                    exit;
                }
            }
            self::$transactionLog = [];
            self::$locks = [];

            // Auto-seed if tables are empty
            $stmt = self::$pdo->query("SELECT COUNT(*) FROM `customer`");
            if ($stmt->fetchColumn() == 0) {
                self::resetToDefaults();
            }
        }

        public static function beginTransaction() {
            self::$pdo->beginTransaction();
            self::$transactionLog[] = "DATABASE TRANSACTION STARTED";
        }

        public static function commit() {
            self::$pdo->commit();
            self::$transactionLog[] = "DATABASE TRANSACTION COMMITTED";
        }

        public static function rollBack() {
            self::$pdo->rollBack();
            self::$transactionLog[] = "DATABASE TRANSACTION ROLLED BACK";
        }

        public static function logLock($class, $wheres) {
            $temp = new $class();
            self::$locks[] = "Acquired pessimistic lock (FOR UPDATE) on table `{$temp->getTable()}` matching " . json_encode($wheres);
        }

        public static function saveModel($instance) {
            $table = $instance->getTable();
            $pk = $instance->getPrimaryKeyName();
            $attributes = $instance->getRawAttributes();

            if ($instance->exists) {
                // UPDATE query
                $id = $attributes[$pk];
                unset($attributes[$pk]);
                
                $setParts = [];
                $params = [':pk_val' => $id];
                foreach ($attributes as $col => $val) {
                    $setParts[] = "`$col` = :$col";
                    $params[":$col"] = $val;
                }
                
                $sql = "UPDATE `$table` SET " . implode(', ', $setParts) . " WHERE `$pk` = :pk_val";
                $stmt = self::$pdo->prepare($sql);
                $stmt->execute($params);
            } else {
                // INSERT query
                if (isset($attributes[$pk]) && $attributes[$pk] === null) {
                    unset($attributes[$pk]);
                }
                
                $cols = [];
                $placeholders = [];
                $params = [];
                foreach ($attributes as $col => $val) {
                    $cols[] = "`$col`";
                    $placeholders[] = ":$col";
                    $params[":$col"] = $val;
                }
                
                $sql = "INSERT INTO `$table` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = self::$pdo->prepare($sql);
                $stmt->execute($params);
                
                $insertId = self::$pdo->lastInsertId();
                $instance->$pk = $insertId;
                $instance->exists = true;
            }
        }

        public static function deleteModel($instance) {
            $table = $instance->getTable();
            $pk = $instance->getPrimaryKeyName();
            $id = $instance->$pk;

            $sql = "DELETE FROM `$table` WHERE `$pk` = :id";
            $stmt = self::$pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $instance->exists = false;
        }

        public static function find($class, $id) {
            $temp = new $class();
            $table = $temp->getTable();
            $pk = $temp->getPrimaryKeyName();
            
            $stmt = self::$pdo->prepare("SELECT * FROM `$table` WHERE `$pk` = :id");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            
            if (!$row) return null;
            
            $instance = new $class($row);
            $instance->exists = true;
            return $instance;
        }

        public static function first($class, $wheres) {
            $records = self::getRecords($class, $wheres);
            return count($records) > 0 ? $records[0] : null;
        }

        public static function getRecords($class, $wheres, $orderBy = []) {
            $temp = new $class();
            $table = $temp->getTable();
            
            $sql = "SELECT * FROM `$table`";
            $params = [];
            if (!empty($wheres)) {
                $whereParts = [];
                foreach ($wheres as $col => $val) {
                    $whereParts[] = "`$col` = :$col";
                    $params[":$col"] = $val;
                }
                $sql .= " WHERE " . implode(' AND ', $whereParts);
            }
            
            if (!empty($orderBy)) {
                $orderParts = [];
                foreach ($orderBy as $rule) {
                    $col = $rule[0];
                    $dir = $rule[1];
                    if ($col === 'expiration_date IS NULL') {
                        $orderParts[] = "expiration_date IS NULL ASC";
                    } elseif ($col === 'expiration_date IS NULL ASC') {
                        $orderParts[] = "expiration_date IS NULL ASC";
                    } else {
                        $orderParts[] = "`$col` $dir";
                    }
                }
                $sql .= " ORDER BY " . implode(', ', $orderParts);
            }
            
            $stmt = self::$pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            
            $result = [];
            foreach ($rows as $row) {
                $instance = new $class($row);
                $instance->exists = true;
                $result[] = $instance;
            }
            return $result;
        }

        public static function resetToDefaults() {
            try {
                self::$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                
                // Truncate tables
                $tables = [
                    'audit_log', 'ticket_interaction_log', 'support_ticket', 'support_agent',
                    'shipment_tracking', 'goods_receipt', 'po_item', 'purchase_order', 
                    'purchase_requisition', 'supplier', 'stock_transaction', 'order_item', 
                    'sales_order', 'inventory_location', 'product', 'customer', 'warehouse', 'category'
                ];
                foreach ($tables as $t) {
                    self::$pdo->exec("TRUNCATE TABLE `$t`;");
                }
                
                self::$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                
                // Seed Categories
                $stmt = self::$pdo->prepare("INSERT INTO `category` (category_id, category_name) VALUES (:id, :name)");
                $stmt->execute([':id' => 3, ':name' => 'Seeds']);
                $stmt->execute([':id' => 4, ':name' => 'Agricultural Produce']);
                $stmt->execute([':id' => 5, ':name' => 'Fertilizers']);
                $stmt->execute([':id' => 6, ':name' => 'Farm Pets']);
                
                // Seed Warehouses
                $stmt = self::$pdo->prepare("INSERT INTO `warehouse` (warehouse_id, location_name) VALUES (:id, :name)");
                $stmt->execute([':id' => 1, ':name' => 'Warehouse 1 (Indang Main)']);
                $stmt->execute([':id' => 2, ':name' => 'Warehouse 2 (Cavite Agri-Park)']);
                
                // Seed Customers
                $stmt = self::$pdo->prepare("INSERT INTO `customer` (customer_id, first_name, last_name, email, phone) VALUES (:id, :fn, :ln, :em, :ph)");
                $stmt->execute([':id' => 1, ':fn' => 'John', ':ln' => 'Doe', ':em' => 'john.doe@example.com', ':ph' => '+1-555-0199']);
                $stmt->execute([':id' => 2, ':fn' => 'Jane', ':ln' => 'Smith', ':em' => 'jane.smith@example.com', ':ph' => '+1-555-0144']);
                
                // Seed Suppliers
                $stmt = self::$pdo->prepare("INSERT INTO `supplier` (supplier_id, supplier_name, contact_info, performance_rating) VALUES (:id, :name, :contact, :rating)");
                $stmt->execute([':id' => 1, ':name' => 'Agricultural Extension Services', ':contact' => 'extension@agri.gov.ph', ':rating' => 4.90]);
                $stmt->execute([':id' => 2, ':name' => 'Indang Organic Farm Supplies', ':contact' => 'contact@indangorganic.com', ':rating' => 4.40]);

                // Seed Products (Agriculture E-commerce Catalog)
                $stmt = self::$pdo->prepare("INSERT INTO `product` (product_id, sku, name, description, category_id, min_quantity_threshold) VALUES (:id, :sku, :name, :desc, :cat, :thresh)");
                // 1. Seeds
                $stmt->execute([':id' => 10, ':sku' => 'SEED-TOM-01', ':name' => 'Tomato Seeds (Pack of 50)', ':desc' => 'Premium high-yield tomato seeds', ':cat' => 3, ':thresh' => 5]);
                $stmt->execute([':id' => 11, ':sku' => 'SEED-LET-02', ':name' => 'Lettuce Seeds (Pack of 100)', ':desc' => 'Hydroponic-ready green leaf lettuce seeds', ':cat' => 3, ':thresh' => 5]);
                // 2. Agricultural Produce
                $stmt->execute([':id' => 12, ':sku' => 'PROD-HON-03', ':name' => 'Wild Honey (375ml)', ':desc' => '100% pure wild honey harvested from natural forest reserves', ':cat' => 4, ':thresh' => 3]);
                $stmt->execute([':id' => 13, ':sku' => 'PROD-COF-04', ':name' => 'Aguinaldo Blend Coffee (250g)', ':desc' => 'Signature robusta and excelsa coffee blend', ':cat' => 4, ':thresh' => 4]);
                $stmt->execute([':id' => 14, ':sku' => 'PROD-KAO-05', ':name' => 'Sweetened Kaong (Jar)', ':desc' => 'Indang signature sweetened sugar palm fruit', ':cat' => 4, ':thresh' => 3]);
                // 3. Fertilizers
                $stmt->execute([':id' => 15, ':sku' => 'FERT-ORG-06', ':name' => 'Organic Compost (5kg)', ':desc' => 'Nutrient-rich organic compost produced from farm waste recycling', ':cat' => 5, ':thresh' => 10]);
                // 4. Farm Pets
                $stmt->execute([':id' => 16, ':sku' => 'PET-CHIK-07', ':name' => 'Native Chicken (Layer)', ':desc' => 'Healthy free-range native layer chicken', ':cat' => 6, ':thresh' => 2]);
                $stmt->execute([':id' => 17, ':sku' => 'PET-GOAT-08', ':name' => 'Anglo-Nubian Kid (Goat)', ':desc' => 'High-quality Anglo-Nubian goat kid for breeding', ':cat' => 6, ':thresh' => 1]);
                
                // Seed Inventory Locations
                $stmt = self::$pdo->prepare("INSERT INTO `inventory_location` (inventory_id, product_id, warehouse_id, zone, quantity, expiration_date) VALUES (:id, :pid, :wid, :zone, :qty, :exp)");
                $stmt->execute([':id' => 101, ':pid' => 10, ':wid' => 1, ':zone' => 'A1', ':qty' => 20, ':exp' => '2027-06-30']);
                $stmt->execute([':id' => 102, ':pid' => 12, ':wid' => 1, ':zone' => 'A2', ':qty' => 15, ':exp' => '2028-12-31']);
                $stmt->execute([':id' => 103, ':pid' => 13, ':wid' => 2, ':zone' => 'B1', ':qty' => 8, ':exp' => '2027-01-15']);
                $stmt->execute([':id' => 104, ':pid' => 15, ':wid' => 2, ':zone' => 'B2', ':qty' => 35, ':exp' => null]);
                $stmt->execute([':id' => 105, ':pid' => 16, ':wid' => 1, ':zone' => 'Poultry', ':qty' => 12, ':exp' => null]);
                $stmt->execute([':id' => 106, ':pid' => 17, ':wid' => 2, ':zone' => 'Barn', ':qty' => 3, ':exp' => null]);

                // Seed Support Agents
                $stmt = self::$pdo->prepare("INSERT INTO `support_agent` (agent_id, name, department) VALUES (:id, :name, :dept)");
                $stmt->execute([':id' => 1, ':name' => 'Helpdesk Manager', ':dept' => 'Customer Support']);
                $stmt->execute([':id' => 2, ':name' => 'Technical Support Specialist', ':dept' => 'IT Operations']);

                // Seed Support Tickets & Interaction Logs
                $stmt = self::$pdo->prepare("INSERT INTO `support_ticket` (ticket_id, customer_id, agent_id, status, priority, sla_due_date) VALUES (:id, :cid, :aid, :status, :pri, :sla)");
                // SLA due date: 1 hour ago (demonstrates SLA tracking indicators)
                $slaTime = date('Y-m-d H:i:s', time() - 3600);
                $stmt->execute([':id' => 1, ':cid' => 1, ':aid' => 1, ':status' => 'Open', ':pri' => 'High', ':sla' => $slaTime]);

                $stmt = self::$pdo->prepare("INSERT INTO `ticket_interaction_log` (log_id, ticket_id, interaction_type, message_body) VALUES (:id, :tid, :type, :body)");
                $stmt->execute([':id' => 1, ':tid' => 1, ':type' => 'customer_message', ':body' => 'I ordered a Mega Widget, but I need details on my delivery schedule. Please advise.']);

                // Seed Inbound/Outbound Shipment Tracking
                $stmt = self::$pdo->prepare("INSERT INTO `shipment_tracking` (shipment_id, reference_type, reference_id, status, route_details) VALUES (:id, :type, :ref_id, :status, :route)");
                $stmt->execute([':id' => 1, ':type' => 'inbound', ':ref_id' => 1, ':status' => 'In Transit', ':route' => 'Shipped from Supplier Warehouse. Destination: Warehouse Alpha A1']);
                
            } catch (Exception $e) {
                throw $e;
            }
        }
    }

    // Load Eloquent models and checkout controller files
    require_once __DIR__ . '/app/Models/Customer.php';
    require_once __DIR__ . '/app/Models/Product.php';
    require_once __DIR__ . '/app/Models/SalesOrder.php';
    require_once __DIR__ . '/app/Models/InventoryLocation.php';
    require_once __DIR__ . '/app/Models/OrderItem.php';
    require_once __DIR__ . '/app/Models/StockTransaction.php';
    require_once __DIR__ . '/app/Models/Supplier.php';
    require_once __DIR__ . '/app/Models/PurchaseOrder.php';
    require_once __DIR__ . '/app/Models/PoItem.php';
    require_once __DIR__ . '/app/Models/GoodsReceipt.php';
    require_once __DIR__ . '/app/Models/SupportAgent.php';
    require_once __DIR__ . '/app/Models/SupportTicket.php';
    require_once __DIR__ . '/app/Models/TicketInteractionLog.php';
    require_once __DIR__ . '/app/Models/PurchaseRequisition.php';
    require_once __DIR__ . '/app/Models/ShipmentTracking.php';
    require_once __DIR__ . '/app/Models/AuditLog.php';
    require_once __DIR__ . '/app/Exceptions/InsufficientStockException.php';
    require_once __DIR__ . '/app/Http/Controllers/StorefrontCheckoutController.php';

    // =========================================================================
    // HTTP ROUTING PORTION
    // =========================================================================

    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];

    // Route: Root or index.html -> serve frontend UI
    if ($uri === '/' || $uri === '/index.html') {
        header('Content-Type: text/html; charset=UTF-8');
        echo file_get_contents(__DIR__ . '/public/index.html');
        exit;
    } 
    
    // Route: Public assets
    elseif (preg_match('/^\/public\/(.+)$/', $uri, $matches)) {
        $file = __DIR__ . '/public/' . $matches[1];
        if (file_exists($file) && is_file($file)) {
            if (str_ends_with($file, '.css')) {
                header('Content-Type: text/css');
            } elseif (str_ends_with($file, '.js')) {
                header('Content-Type: application/javascript');
            }
            echo file_get_contents($file);
        } else {
            header("HTTP/1.0 404 Not Found");
            echo "404 Not Found";
        }
        exit;
    } 
    
    // Route: GET /api/inventory -> Return current database state from MySQL
    elseif ($uri === '/api/inventory' && $method === 'GET') {
        header('Content-Type: application/json');
        MockDB::init();
        
        echo json_encode([
            'success' => true,
            'inventory' => MockDB::getRecords(\App\Models\InventoryLocation::class, []),
            'sales_orders' => MockDB::getRecords(\App\Models\SalesOrder::class, []),
            'order_items' => MockDB::getRecords(\App\Models\OrderItem::class, []),
            'stock_transactions' => MockDB::getRecords(\App\Models\StockTransaction::class, []),
            'products' => MockDB::getRecords(\App\Models\Product::class, []),
            'customers' => MockDB::getRecords(\App\Models\Customer::class, []),
            'shipments' => MockDB::getRecords(\App\Models\ShipmentTracking::class, [])
        ]);
        exit;
    } 

    // Route: GET /api/audit-logs -> Return system audit logs sorted by id desc
    elseif ($uri === '/api/audit-logs' && $method === 'GET') {
        header('Content-Type: application/json');
        MockDB::init();
        
        echo json_encode([
            'success' => true,
            'audit_logs' => MockDB::getRecords(\App\Models\AuditLog::class, [], ['audit_id' => 'DESC'])
        ]);
        exit;
    }
    
    // Route: GET /api/procurement -> Return suppliers, POs, requisitions
    elseif ($uri === '/api/procurement' && $method === 'GET') {
        header('Content-Type: application/json');
        MockDB::init();
        
        echo json_encode([
            'success' => true,
            'suppliers' => MockDB::getRecords(\App\Models\Supplier::class, []),
            'purchase_orders' => MockDB::getRecords(\App\Models\PurchaseOrder::class, []),
            'po_items' => MockDB::getRecords(\App\Models\PoItem::class, []),
            'goods_receipts' => MockDB::getRecords(\App\Models\GoodsReceipt::class, []),
            'requisitions' => MockDB::getRecords(\App\Models\PurchaseRequisition::class, [])
        ]);
        exit;
    }

    // Route: POST /api/products -> Add a Product
    elseif ($uri === '/api/products' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        try {
            $product = \App\Models\Product::create([
                'sku' => $payload['sku'],
                'name' => $payload['name'],
                'description' => $payload['description'] ?? null,
                'category_id' => 3, // Defaults to Seeds
                'min_quantity_threshold' => (int)($payload['min_quantity_threshold'] ?? 5),
                'max_quantity_threshold' => (int)($payload['max_quantity_threshold'] ?? 50)
            ]);
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'PRODUCT_CREATE',
                'description' => "Created product '{$product->name}' (SKU: {$product->sku})",
                'table_name' => 'product',
                'record_id' => $product->product_id
            ]);
            echo json_encode(['success' => true, 'data' => $product]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/products/update -> Edit a Product
    elseif ($uri === '/api/products/update' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        $productId = $payload['product_id'] ?? null;
        
        try {
            $product = \App\Models\Product::find($productId);
            if (!$product) throw new Exception("Product not found.");
            
            $product->sku = $payload['sku'];
            $product->name = $payload['name'];
            $product->description = $payload['description'] ?? null;
            $product->min_quantity_threshold = (int)($payload['min_quantity_threshold'] ?? 5);
            $product->max_quantity_threshold = (int)($payload['max_quantity_threshold'] ?? 50);
            $product->save();
            
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'PRODUCT_UPDATE',
                'description' => "Updated catalog properties for '{$product->name}' (SKU: {$product->sku})",
                'table_name' => 'product',
                'record_id' => $product->product_id
            ]);
            echo json_encode(['success' => true, 'data' => $product]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/products/delete -> Delete a Product
    elseif ($uri === '/api/products/delete' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        $productId = $payload['product_id'] ?? null;
        
        try {
            $product = \App\Models\Product::find($productId);
            if (!$product) throw new Exception("Product not found.");
            
            $product->delete();
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'PRODUCT_DELETE',
                'description' => "Deleted product catalog ID {$productId}",
                'table_name' => 'product',
                'record_id' => $productId
            ]);
            echo json_encode(['success' => true, 'message' => 'Product deleted successfully.']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/transfer-stock -> Transfer stock between locations
    elseif ($uri === '/api/transfer-stock' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $pid = $payload['product_id'] ?? null;
        $fromWid = $payload['from_warehouse_id'] ?? null;
        $fromZone = $payload['from_zone'] ?? null;
        $toWid = $payload['to_warehouse_id'] ?? null;
        $toZone = $payload['to_zone'] ?? null;
        $qty = (int)($payload['quantity'] ?? 0);
        
        if (!$pid || !$fromWid || !$fromZone || !$toWid || !$toZone || $qty <= 0) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Invalid payload credentials.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            // 1. Fetch source and lock it
            $source = \App\Models\InventoryLocation::where('product_id', $pid)
                ->where('warehouse_id', $fromWid)
                ->where('zone', $fromZone)
                ->lockForUpdate()
                ->first();
                
            if (!$source || $source->quantity < $qty) {
                throw new Exception("Insufficient stock at source warehouse location.");
            }
            
            // 2. Decrement source
            $source->quantity -= $qty;
            $source->save();
            
            // 3. Increment / Create destination
            $dest = \App\Models\InventoryLocation::where('product_id', $pid)
                ->where('warehouse_id', $toWid)
                ->where('zone', $toZone)
                ->lockForUpdate()
                ->first();
                
            if ($dest) {
                $dest->quantity += $qty;
                $dest->save();
            } else {
                \App\Models\InventoryLocation::create([
                    'product_id' => $pid,
                    'warehouse_id' => $toWid,
                    'zone' => $toZone,
                    'quantity' => $qty,
                    'expiration_date' => $source->expiration_date
                ]);
            }
            
            // 4. Log transfer transaction
            \App\Models\StockTransaction::create([
                'product_id' => $pid,
                'transaction_type' => 'transfer',
                'quantity' => $qty
            ]);

            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'STOCK_TRANSFER',
                'description' => "Transferred {$qty} units of product ID {$pid} from Warehouse {$fromWid} (Zone {$fromZone}) to Warehouse {$toWid} (Zone {$toZone})",
                'table_name' => 'inventory_location',
                'record_id' => $pid
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'message' => "Successfully transferred $qty units."]);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/requisitions -> Create Requisition
    elseif ($uri === '/api/requisitions' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        try {
            $req = \App\Models\PurchaseRequisition::create([
                'requesting_department' => $payload['requesting_department'],
                'status' => 'pending'
            ]);
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'REQUISITION_CREATE',
                'description' => "Submitted purchase requisition #{$req->requisition_id} for department '{$payload['requesting_department']}'",
                'table_name' => 'purchase_requisition',
                'record_id' => $req->requisition_id
            ]);
            echo json_encode(['success' => true, 'data' => $req]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/requisitions/approve -> Approve/Reject Requisition
    elseif ($uri === '/api/requisitions/approve' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        $reqId = $payload['requisition_id'] ?? null;
        $status = $payload['status'] ?? 'approved';
        
        try {
            $req = \App\Models\PurchaseRequisition::find($reqId);
            if (!$req) throw new Exception("Requisition not found.");
            
            $req->status = $status;
            $req->save();
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'REQUISITION_' . strtoupper($status),
                'description' => "Manager updated status of requisition #{$reqId} to: '{$status}'",
                'table_name' => 'purchase_requisition',
                'record_id' => $reqId
            ]);
            echo json_encode(['success' => true, 'data' => $req]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: GET /api/helpdesk -> Get tickets, agents, and history log
    elseif ($uri === '/api/helpdesk' && $method === 'GET') {
        header('Content-Type: application/json');
        MockDB::init();
        
        echo json_encode([
            'success' => true,
            'tickets' => MockDB::getRecords(\App\Models\SupportTicket::class, []),
            'agents' => MockDB::getRecords(\App\Models\SupportAgent::class, []),
            'logs' => MockDB::getRecords(\App\Models\TicketInteractionLog::class, [])
        ]);
        exit;
    }

    // Route: POST /api/tickets -> Create Support Ticket
    elseif ($uri === '/api/tickets' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        MockDB::beginTransaction();
        try {
            // SLA due date: now + 24 hours
            $sla = date('Y-m-d H:i:s', time() + 24 * 3600);
            
            $ticket = \App\Models\SupportTicket::create([
                'customer_id' => $payload['customer_id'],
                'agent_id' => $payload['agent_id'] ?? null,
                'status' => 'Open',
                'priority' => $payload['priority'] ?? 'Low',
                'sla_due_date' => $sla
            ]);
            
            \App\Models\TicketInteractionLog::create([
                'ticket_id' => $ticket->ticket_id,
                'interaction_type' => 'customer_message',
                'message_body' => $payload['message']
            ]);

            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'TICKET_CREATE',
                'description' => "Created support ticket #{$ticket->ticket_id} (Priority: {$ticket->priority}) for Customer #{$payload['customer_id']}",
                'table_name' => 'support_ticket',
                'record_id' => $ticket->ticket_id
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'data' => $ticket]);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/tickets/interaction -> Add Interaction Log
    elseif ($uri === '/api/tickets/interaction' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $ticketId = $payload['ticket_id'] ?? null;
        $type = $payload['interaction_type'] ?? 'internal_note';
        $body = $payload['message_body'] ?? '';
        $status = $payload['status'] ?? null;
        $escalateTo = $payload['escalate_to'] ?? null;
        $userRole = $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist';
        
        if (!$ticketId || empty($body)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Ticket ID and message body are required.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            $ticket = \App\Models\SupportTicket::find($ticketId);
            if (!$ticket) throw new Exception("Ticket not found.");
            
            // Add interaction log
            \App\Models\TicketInteractionLog::create([
                'ticket_id' => $ticketId,
                'interaction_type' => $type,
                'message_body' => $body
            ]);
            
            // Update status if passed
            if ($status) {
                $ticket->status = $status;
            }
            // Update priority if passed
            $priority = $payload['priority'] ?? null;
            if ($priority) {
                $ticket->priority = $priority;
            }
            // Escalation logic: update assignee
            if ($escalateTo) {
                $ticket->agent_id = $escalateTo;
            }
            $ticket->save();
            
            // Write System Activity Audit Log
            \App\Models\AuditLog::create([
                'user_role' => $userRole,
                'action' => $escalateTo ? 'TICKET_ESCALATED' : 'TICKET_REPLY',
                'description' => $escalateTo 
                    ? "Escalated ticket #{$ticketId} to agent ID {$escalateTo}. Note: {$body}" 
                    : "Logged ticket #{$ticketId} interaction (Type: {$type}, Status: " . ($status ?: $ticket->status) . ")",
                'table_name' => 'support_ticket',
                'record_id' => $ticketId
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'message' => 'Interaction logged and ticket updated.']);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/agents/update -> Update Support Agent profile details
    elseif ($uri === '/api/agents/update' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $agentId = $payload['agent_id'] ?? null;
        $name = $payload['name'] ?? null;
        $department = $payload['department'] ?? null;
        
        if (!$agentId || empty($name)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Agent ID and Name are required.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            $agent = \App\Models\SupportAgent::find($agentId);
            if (!$agent) {
                throw new Exception("Agent not found.");
            }
            
            $agent->name = $name;
            $agent->department = $department;
            $agent->save();
            
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'PROFILE_UPDATE',
                'description' => "Updated profile for agent #{$agentId} (New Name: '{$name}', Dept: '{$department}')",
                'table_name' => 'support_agent',
                'record_id' => $agentId
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'message' => 'Profile updated successfully.', 'data' => $agent]);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/adjust-stock -> Direct manual adjustment of stock
    elseif ($uri === '/api/adjust-stock' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $productId = $payload['product_id'] ?? null;
        $warehouseId = $payload['warehouse_id'] ?? null;
        $zone = $payload['zone'] ?? 'A1';
        $qty = $payload['quantity'] ?? 0;
        $expiration = $payload['expiration_date'] ?? null;
        
        if (!$productId || !$warehouseId) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Product and Warehouse are required.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            $loc = \App\Models\InventoryLocation::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->where('zone', $zone)
                ->first();
                
            if ($loc) {
                $loc->quantity += $qty;
                if ($loc->quantity < 0) $loc->quantity = 0;
                if ($expiration) $loc->expiration_date = $expiration;
                $loc->save();
            } else {
                \App\Models\InventoryLocation::create([
                    'product_id' => $productId,
                    'warehouse_id' => $warehouseId,
                    'zone' => $zone,
                    'quantity' => max(0, $qty),
                    'expiration_date' => $expiration ?: null
                ]);
            }
            
            \App\Models\StockTransaction::create([
                'product_id' => $productId,
                'transaction_type' => ($qty >= 0) ? 'stock-in' : 'stock-out',
                'quantity' => abs($qty)
            ]);

            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'STOCK_ADJUST',
                'description' => "Adjusted stock for product ID {$productId} in Warehouse {$warehouseId} Zone {$zone} by {$qty} units",
                'table_name' => 'inventory_location',
                'record_id' => $productId
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'message' => 'Stock adjusted successfully.']);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }
    
    // Route: POST /api/reset -> Factory reset database tables
    elseif ($uri === '/api/reset' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        MockDB::resetToDefaults();
        echo json_encode(['success' => true, 'message' => 'Database reset successful']);
        exit;
    } 
    
    // Route: POST /api/checkout -> Storefront checkout
    elseif ($uri === '/api/checkout' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $request = new \Illuminate\Http\Request($payload);
        $controller = new \App\Http\Controllers\StorefrontCheckoutController();
        $response = $controller->checkout($request);
        
        $responseData = $response->data;
        if (is_array($responseData)) {
            $responseData['_transaction_log'] = MockDB::$transactionLog;
            $responseData['_locks'] = MockDB::$locks;
            
            if ($response->status === 200 && ($responseData['success'] ?? false)) {
                $order = $responseData['data'] ?? null;
                if ($order) {
                    $orderId = is_array($order) ? ($order['order_id'] ?? null) : ($order->order_id ?? null);
                    $totalAmount = is_array($order) ? ($order['total_amount'] ?? 0) : ($order->total_amount ?? 0);
                    $customerId = is_array($order) ? ($order['customer_id'] ?? 0) : ($order->customer_id ?? 0);
                    try {
                        \App\Models\AuditLog::create([
                            'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                            'action' => 'CHECKOUT_COMPLETED',
                            'description' => "Placed sales order #{$orderId} for Customer #{$customerId} totaling ₱" . number_format($totalAmount, 2),
                            'table_name' => 'sales_order',
                            'record_id' => $orderId
                        ]);
                    } catch (Exception $e) {}
                }
            }
        }
        
        http_response_code($response->status);
        echo json_encode($responseData);
        exit;
    }

    // Route: POST /api/purchase-order -> Create a Purchase Order
    elseif ($uri === '/api/purchase-order' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $supplierId = $payload['supplier_id'] ?? null;
        $items = $payload['items'] ?? [];
        $reqId = $payload['requisition_id'] ?? null;
        
        if (!$supplierId || empty($items)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Supplier and items are required.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            $po = \App\Models\PurchaseOrder::create([
                'supplier_id' => $supplierId,
                'status' => 'sent',
                'requisition_id' => $reqId
            ]);
            
            foreach ($items as $item) {
                \App\Models\PoItem::create([
                    'po_id' => $po->po_id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity']
                ]);
            }
            
            \App\Models\AuditLog::create([
                'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                'action' => 'PO_CREATE',
                'description' => "Generated Purchase Order #{$po->po_id} for Supplier ID {$supplierId}" . ($reqId ? " from Requisition #{$reqId}" : ""),
                'table_name' => 'purchase_order',
                'record_id' => $po->po_id
            ]);
            
            MockDB::commit();
            echo json_encode(['success' => true, 'data' => $po, '_transaction_log' => MockDB::$transactionLog]);
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Route: POST /api/receive-goods -> Simulates receiving goods (3-Way Matching & restocks inventory)
    elseif ($uri === '/api/receive-goods' && $method === 'POST') {
        header('Content-Type: application/json');
        MockDB::init();
        
        $json = file_get_contents('php://input');
        $payload = json_decode($json, true) ?? [];
        
        $poId = $payload['po_id'] ?? null;
        $warehouseId = $payload['warehouse_id'] ?? 1;
        $zone = $payload['zone'] ?? 'A1';
        $invoicePrice = (float)($payload['invoice_price'] ?? 0);
        $deliveryQty = (int)($payload['delivery_qty'] ?? 0);
        
        if (!$poId) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'PO ID is required.']);
            exit;
        }
        
        MockDB::beginTransaction();
        try {
            /** @var \App\Models\PurchaseOrder $po */
            $po = \App\Models\PurchaseOrder::find($poId);
            if (!$po) {
                throw new Exception("Purchase Order #$poId not found.");
            }
            if ($po->status === 'delivered') {
                throw new Exception("Purchase Order #$poId has already been received.");
            }
            
            // Get PO items to calculate expectations
            $poItems = MockDB::getRecords(\App\Models\PoItem::class, ['po_id' => $poId]);
            $expectedQty = 0;
            $expectedPrice = 0.00;
            foreach ($poItems as $item) {
                $expectedQty += $item['quantity'];
                // Catalog standard price widget 10 = 49.99, widget 12 = 99.99
                $expectedPrice += $item['quantity'] * ($item['product_id'] == 10 ? 49.99 : 99.99);
            }
            
            // Perform 3-Way Match Check
            $qtyMatched = ($deliveryQty === $expectedQty);
            $priceMatched = (abs($invoicePrice - $expectedPrice) < 0.01);
            $matchStatus = ($qtyMatched && $priceMatched) ? 'matched' : 'mismatched';
            
            // 1. Create Goods Receipt Match Log
            $receipt = \App\Models\GoodsReceipt::create([
                'po_id' => $poId,
                'three_way_match_status' => $matchStatus
            ]);
            
            if ($matchStatus === 'matched') {
                // 2. Match succeeded - update PO Status to delivered
                $po->status = 'delivered';
                $po->save();
                
                // 3. Increment stock & log stock-in
                foreach ($poItems as $item) {
                    $pid = $item['product_id'];
                    $qty = $item['quantity'];
                    
                    $loc = \App\Models\InventoryLocation::where('product_id', $pid)
                        ->where('warehouse_id', $warehouseId)
                        ->where('zone', $zone)
                        ->first();
                    
                    if ($loc) {
                        $loc->quantity += $qty;
                        $loc->save();
                    } else {
                        \App\Models\InventoryLocation::create([
                            'product_id' => $pid,
                            'warehouse_id' => $warehouseId,
                            'zone' => $zone,
                            'quantity' => $qty,
                            'expiration_date' => null
                        ]);
                    }
                    
                    \App\Models\StockTransaction::create([
                        'product_id' => $pid,
                        'transaction_type' => 'stock-in',
                        'quantity' => $qty
                    ]);
                }
                
                // 4. Log shipment tracking
                \App\Models\ShipmentTracking::create([
                    'reference_type' => 'inbound',
                    'reference_id' => $poId,
                    'status' => 'Delivered',
                    'route_details' => 'Received at Warehouse ' . $warehouseId . ' Zone ' . $zone
                ]);
                
                \App\Models\AuditLog::create([
                    'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                    'action' => 'GOODS_RECEIVE_MATCHED',
                    'description' => "3-Way Match Verified! Stock updated for PO #{$poId}. (Received Qty: {$deliveryQty}, Invoice Price: ₱" . number_format($invoicePrice, 2) . ")",
                    'table_name' => 'goods_receipt',
                    'record_id' => $receipt->receipt_id
                ]);
                
                MockDB::commit();
                echo json_encode([
                    'success' => true,
                    'match_status' => 'matched',
                    'message' => '3-Way Match Verified! Stock updated successfully.',
                    '_transaction_log' => MockDB::$transactionLog
                ]);
            } else {
                // 5. Match failed - do NOT update stock, but save mismatched match audit log
                \App\Models\AuditLog::create([
                    'user_role' => $_SERVER['HTTP_X_USER_ROLE'] ?? 'Technical Support Specialist',
                    'action' => 'GOODS_RECEIVE_MISMATCHED',
                    'description' => "3-Way Match Mismatch! PO #{$poId} flagged and held. Expected Qty: {$expectedQty} (Got: {$deliveryQty}). Expected Price: ₱{$expectedPrice} (Got: ₱{$invoicePrice})",
                    'table_name' => 'goods_receipt',
                    'record_id' => $receipt->receipt_id
                ]);
                
                MockDB::commit();
                echo json_encode([
                    'success' => false,
                    'match_status' => 'mismatched',
                    'message' => "3-Way Match Mismatch! Expected Qty: $expectedQty (Got: $deliveryQty). Expected Price: ₱$expectedPrice (Got: ₱$invoicePrice). Goods flagged and held.",
                    '_transaction_log' => MockDB::$transactionLog
                ]);
            }
        } catch (Exception $e) {
            MockDB::rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }

    // Default 404 handler
    header("HTTP/1.0 404 Not Found");
    echo "404 Not Found";
    exit;
}
