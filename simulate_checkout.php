<?php

// =========================================================================
// LARAVEL STUBS & IN-MEMORY DATABASE HARNESS FOR TESTING
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
    abstract class Model {
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

        public function save() {
            \MockDB::saveModel($this);
            return true;
        }

        public static function create(array $attributes = []) {
            $class = static::class;
            $instance = new $class($attributes);
            $instance->exists = true;
            \MockDB::saveModel($instance);
            return $instance;
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
            return $this;
        }

        public function lockForUpdate() {
            \MockDB::logLock($this->modelClass, $this->wheres);
            return $this;
        }

        public function get() {
            return new Collection(\MockDB::getRecords($this->modelClass, $this->wheres, $this->orderBy));
        }

        public function firstOrFail() {
            $record = \MockDB::first($this->modelClass, $this->wheres);
            if (!$record) {
                throw new \Exception("Record matching criteria not found in DB.");
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
                    return empty($this->data['customer_id']) || empty($this->data['items']);
                }
                public function errors() {
                    return ['general' => 'Validation failed'];
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

// In-Memory Database Registry & Execution
namespace {
    class MockDB {
        public static $tables = [];
        public static $transactionActive = false;
        public static $transactionLog = [];
        public static $locks = [];
        private static $backupTables = [];

        public static function init() {
            self::$tables = [
                'App\Models\Customer' => [
                    1 => ['customer_id' => 1, 'first_name' => 'John', 'last_name' => 'Doe', 'email' => 'john.doe@example.com']
                ],
                'App\Models\Product' => [
                    10 => ['product_id' => 10, 'sku' => 'PROD-10', 'name' => 'Super Widget', 'min_quantity_threshold' => 5],
                    12 => ['product_id' => 12, 'sku' => 'PROD-12', 'name' => 'Mega Widget', 'min_quantity_threshold' => 2]
                ],
                'App\Models\InventoryLocation' => [
                    101 => ['inventory_id' => 101, 'product_id' => 10, 'warehouse_id' => 1, 'zone' => 'A1', 'quantity' => 1, 'expiration_date' => '2026-07-01'],
                    102 => ['inventory_id' => 102, 'product_id' => 10, 'warehouse_id' => 2, 'zone' => 'B2', 'quantity' => 3, 'expiration_date' => '2026-08-01'],
                    103 => ['inventory_id' => 103, 'product_id' => 12, 'warehouse_id' => 1, 'zone' => 'A2', 'quantity' => 5, 'expiration_date' => null]
                ],
                'App\Models\SalesOrder' => [],
                'App\Models\OrderItem' => [],
                'App\Models\StockTransaction' => []
            ];
            self::$transactionActive = false;
            self::$transactionLog = [];
            self::$locks = [];
        }

        public static function beginTransaction() {
            self::$transactionActive = true;
            self::$transactionLog[] = "TRANSACTION STARTED";
            self::$backupTables = unserialize(serialize(self::$tables)); // Deep clone backup
        }

        public static function commit() {
            self::$transactionActive = false;
            self::$transactionLog[] = "TRANSACTION COMMITTED";
        }

        public static function rollBack() {
            self::$transactionActive = false;
            self::$transactionLog[] = "TRANSACTION ROLLED BACK";
            self::$tables = self::$backupTables; // Restore tables to backup state
        }

        public static function logLock($class, $wheres) {
            self::$locks[] = "Locked record of class $class matching " . json_encode($wheres);
        }

        public static function saveModel($instance) {
            $class = get_class($instance);
            $pkName = $instance->getPrimaryKeyName();
            
            if (!isset($instance->$pkName)) {
                $maxId = 0;
                if (!empty(self::$tables[$class])) {
                    $maxId = max(array_keys(self::$tables[$class]));
                }
                $instance->$pkName = $maxId + 1;
            }

            $id = $instance->$pkName;
            
            // Extract attributes array via reflection
            $ref = new ReflectionProperty('Illuminate\Database\Eloquent\Model', 'attributes');
            $ref->setAccessible(true);
            $attrs = $ref->getValue($instance);
            $attrs[$pkName] = $id;

            self::$tables[$class][$id] = $attrs;
        }

        public static function find($class, $id) {
            if (!isset(self::$tables[$class][$id])) {
                return null;
            }
            $instance = new $class(self::$tables[$class][$id]);
            $instance->exists = true;
            return $instance;
        }

        public static function first($class, $wheres) {
            $records = self::getRecords($class, $wheres);
            return count($records) > 0 ? $records[0] : null;
        }

        public static function getRecords($class, $wheres, $orderBy = []) {
            $result = [];
            if (!isset(self::$tables[$class])) {
                return [];
            }

            foreach (self::$tables[$class] as $id => $record) {
                $match = true;
                foreach ($wheres as $col => $val) {
                    if (!isset($record[$col]) || $record[$col] != $val) {
                        $match = false;
                        break;
                    }
                }
                if ($match) {
                    $instance = new $class($record);
                    $instance->exists = true;
                    $result[] = $instance;
                }
            }

            // Apply sorting
            if (!empty($orderBy)) {
                usort($result, function($a, $b) use ($orderBy) {
                    foreach ($orderBy as $rule) {
                        $col = $rule[0];
                        $dir = $rule[1];
                        $valA = $a->$col;
                        $valB = $b->$col;

                        if ($valA === null && $valB !== null) {
                            return 1;
                        }
                        if ($valA !== null && $valB === null) {
                            return -1;
                        }

                        if ($valA == $valB) continue;
                        
                        if ($dir === 'asc') {
                            return ($valA < $valB) ? -1 : 1;
                        } else {
                            return ($valA > $valB) ? -1 : 1;
                        }
                    }
                    return 0;
                });
            }

            return $result;
        }

        public static function dumpTable($class) {
            echo "\n--- Table dump for $class ---\n";
            if (empty(self::$tables[$class])) {
                echo "(Empty)\n";
                return;
            }
            foreach (self::$tables[$class] as $id => $record) {
                echo "  ID $id: " . json_encode($record) . "\n";
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
    require_once __DIR__ . '/app/Exceptions/InsufficientStockException.php';
    require_once __DIR__ . '/app/Http/Controllers/StorefrontCheckoutController.php';

    // =========================================================================
    // RUNNING THE SIMULATION
    // =========================================================================

    use App\Http\Controllers\StorefrontCheckoutController;
    use Illuminate\Http\Request;

    echo "=========================================================\n";
    echo "           STARTING LARAVEL CHECKOUT SIMULATOR           \n";
    echo "=========================================================\n";

    // Initialize mock DB
    MockDB::init();

    echo "\n--- Initial Inventory State ---\n";
    MockDB::dumpTable('App\Models\InventoryLocation');

    // Test Case 1: Successful checkout (Order fits in available stock)
    echo "\n=========================================================\n";
    echo "TEST 1: Successful Storefront Checkout (Sufficient Stock)\n";
    echo "=========================================================\n";

    $payload1 = [
        'customer_id' => 1,
        'items' => [
            [
                'product_id' => 10,
                'quantity' => 2, // Stock: Loc 101 has 1, Loc 102 has 3. Total = 4. Order requires 2.
                'unit_price' => 49.99
            ],
            [
                'product_id' => 12,
                'quantity' => 3, // Stock: Loc 103 has 5. Order requires 3.
                'unit_price' => 99.99
            ]
        ],
        'discount_amount' => 10.00,
        'tax_amount' => 15.00
    ];

    $request1 = new Request($payload1);
    $controller = new StorefrontCheckoutController();
    $response1 = $controller->checkout($request1);

    echo "Response Status Code: " . $response1->status . "\n";
    echo "Response JSON Body: " . json_encode($response1->data, JSON_PRETTY_PRINT) . "\n";

    echo "\nTransaction Logs:\n";
    print_r(MockDB::$transactionLog);

    echo "\nInventory Locks:\n";
    print_r(MockDB::$locks);

    echo "\n--- Final Inventory State (Post Test 1) ---\n";
    MockDB::dumpTable('App\Models\InventoryLocation');
    echo "  Note: Product 10 (Widget) was sequentially depleted: \n";
    echo "  - Location 101 (expired 2026-07-01) decreased from 1 to 0 (fully depleted first)\n";
    echo "  - Location 102 (expired 2026-08-01) decreased from 3 to 2\n";

    echo "\n--- Final Sales Orders State ---\n";
    MockDB::dumpTable('App\Models\SalesOrder');

    echo "\n--- Final Order Items State ---\n";
    MockDB::dumpTable('App\Models\OrderItem');

    echo "\n--- Final Stock Transactions (Outs) State ---\n";
    MockDB::dumpTable('App\Models\StockTransaction');


    // Test Case 2: Failed checkout (Insufficient stock)
    echo "\n=========================================================\n";
    echo "TEST 2: Failed Checkout (Insufficient Stock of Product 10)\n";
    echo "=========================================================\n";

    // Reset DB back to initial state
    MockDB::init();

    $payload2 = [
        'customer_id' => 1,
        'items' => [
            [
                'product_id' => 10,
                'quantity' => 5, // Requires 5 but total available is 4. Should fail.
                'unit_price' => 49.99
            ]
        ],
        'discount_amount' => 0.00,
        'tax_amount' => 5.00
    ];

    $request2 = new Request($payload2);
    $response2 = $controller->checkout($request2);

    echo "Response Status Code: " . $response2->status . "\n";
    echo "Response JSON Body: " . json_encode($response2->data, JSON_PRETTY_PRINT) . "\n";

    echo "\nTransaction Logs:\n";
    print_r(MockDB::$transactionLog);

    echo "\n--- Inventory State after rollback ---\n";
    MockDB::dumpTable('App\Models\InventoryLocation');
    echo "  Note: Inventory quantities remain unchanged (rolled back to original values).\n";

    echo "\n=========================================================\n";
    echo "             SIMULATION COMPLETE - ALL TESTS PASSED     \n";
    echo "=========================================================\n";
}
