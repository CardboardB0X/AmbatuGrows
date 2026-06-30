<?php

namespace App\Exceptions;

use Exception;

class InsufficientStockException extends Exception
{
    /**
     * The SKU or name of the product that is out of stock.
     *
     * @var string
     */
    protected $productIdentifier;

    /**
     * The quantity that was requested.
     *
     * @var int
     */
    protected $requestedQuantity;

    /**
     * The quantity that was actually available.
     *
     * @var int
     */
    protected $availableQuantity;

    /**
     * Create a new exception instance.
     *
     * @param string $productIdentifier
     * @param int $requestedQuantity
     * @param int $availableQuantity
     */
    public function __construct(string $productIdentifier, int $requestedQuantity, int $availableQuantity)
    {
        $this->productIdentifier = $productIdentifier;
        $this->requestedQuantity = $requestedQuantity;
        $this->availableQuantity = $availableQuantity;

        parent::__construct(
            "Insufficient stock for product [{$productIdentifier}]. Requested: {$requestedQuantity}, Available: {$availableQuantity}."
        );
    }

    /**
     * Get the product identifier.
     *
     * @return string
     */
    public function getProductIdentifier(): string
    {
        return $this->productIdentifier;
    }

    /**
     * Get the requested quantity.
     *
     * @return int
     */
    public function getRequestedQuantity(): int
    {
        return $this->requestedQuantity;
    }

    /**
     * Get the available quantity.
     *
     * @return int
     */
    public function getAvailableQuantity(): int
    {
        return $this->availableQuantity;
    }
}
