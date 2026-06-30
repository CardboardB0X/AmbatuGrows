document.addEventListener('DOMContentLoaded', () => {
    // Automatically inject X-User-Role header to all local API requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
            options.headers = options.headers || {};
            // Retrieve active agent name/role
            let role = 'Technical Support Specialist';
            if (state && state.activeAgentId && state.agents) {
                const agent = state.agents.find(a => a.agent_id === state.activeAgentId);
                if (agent) role = agent.name;
            }
            options.headers['X-User-Role'] = role;
        }
        return originalFetch(url, options);
    };

    // State management
    let state = {
        products: [],
        customers: [],
        inventory: [],
        orders: [],
        orderItems: [],
        transactions: [],
        shipments: [],
        // Procurement & Requisitions
        suppliers: [],
        purchaseOrders: [],
        poItems: [],
        goodsReceipts: [],
        requisitions: [],
        // Helpdesk
        tickets: [],
        agents: [],
        interactionLogs: [],
        activeTicketId: null,
        activeAgentId: 1
    };

    // Active Tab tracking
    let activeTab = 'inventory';
    let popularityChartInstance = null;
    let ticketStatusChartInstance = null;
    
    // Inventory sorting states
    let currentSortColumn = 'sku';
    let currentSortOrder = 'asc';

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const resetDbBtn = document.getElementById('reset-db-btn');

    // Dashboard Elements
    const customerSelect = document.getElementById('customer-select');
    const cartContainer = document.getElementById('cart-items-container');
    const addItemBtn = document.getElementById('add-item-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTax = document.getElementById('summary-tax');
    const summaryDiscount = document.getElementById('summary-discount');
    const summaryTotal = document.getElementById('summary-total');
    const taxInput = document.getElementById('tax-input');
    const discountInput = document.getElementById('discount-input');
    const checkoutSubmitBtn = document.getElementById('checkout-submit-btn');
    
    // Alerts Banner
    const lowStockAlertBox = document.getElementById('low-stock-alert-box');
    const autoReorderBtn = document.getElementById('auto-reorder-btn');

    // Inventory Tab Elements
    const stockAdjustForm = document.getElementById('stock-adjust-form');
    const adjustProductSelect = document.getElementById('adjust-product');
    const adjustWarehouseSelect = document.getElementById('adjust-warehouse');
    const adjustZoneInput = document.getElementById('adjust-zone');
    const adjustQtyInput = document.getElementById('adjust-qty');
    const adjustExpirationInput = document.getElementById('adjust-expiration');

    const stockTransferForm = document.getElementById('stock-transfer-form');
    const transferProductSelect = document.getElementById('transfer-product');
    const transferFromWh = document.getElementById('transfer-from-wh');
    const transferFromZone = document.getElementById('transfer-from-zone');
    const transferToWh = document.getElementById('transfer-to-wh');
    const transferToZone = document.getElementById('transfer-to-zone');
    const transferQtyInput = document.getElementById('transfer-qty');

    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const productModalTitle = document.getElementById('product-modal-title');
    const productModalCloseBtn = document.getElementById('product-modal-close-btn');
    const productModalCancelBtn = document.getElementById('product-modal-cancel-btn');
    const prodIdInput = document.getElementById('prod-id');
    const prodSkuInput = document.getElementById('prod-sku');
    const prodNameInput = document.getElementById('prod-name');
    const prodDescInput = document.getElementById('prod-desc');
    const prodThresholdInput = document.getElementById('prod-threshold');

    // Procurement Tab Elements
    const supplierSelect = document.getElementById('supplier-select');
    const poForm = document.getElementById('po-form');
    const poSubmitBtn = document.getElementById('po-submit-btn');
    const poRequisitionIdInput = document.getElementById('po-requisition-id');
    const requisitionForm = document.getElementById('requisition-form');
    const reqDepartmentInput = document.getElementById('req-department');

    // Helpdesk Tab Elements
    const ticketCustomerSelect = document.getElementById('ticket-customer');
    const ticketAgentSelect = document.getElementById('ticket-agent');
    const ticketPrioritySelect = document.getElementById('ticket-priority');
    const ticketMessageInput = document.getElementById('ticket-message');
    const ticketForm = document.getElementById('ticket-form');
    
    const interactionPanel = document.getElementById('interaction-panel');
    const activeLogTicketIdSpan = document.getElementById('active-log-ticket-id');
    const interactionsContainer = document.getElementById('interactions-container');
    const interactionForm = document.getElementById('interaction-form');
    const interactionTicketIdInput = document.getElementById('interaction-ticket-id');
    const interactionTypeSelect = document.getElementById('interaction-type');
    const interactionStatusSelect = document.getElementById('interaction-status');
    const interactionBodyInput = document.getElementById('interaction-body');
    const faqSearchInput = document.getElementById('faq-search');
    const faqResults = document.getElementById('faq-results');

    // Modals
    const traceModal = document.getElementById('trace-modal');
    const traceTxLog = document.getElementById('trace-transaction-log');
    const traceLocksLog = document.getElementById('trace-locks-log');
    
    const orderItemsModal = document.getElementById('order-items-modal');
    const orderItemsDetailTableBody = document.querySelector('#order-items-detail-table tbody');

    const grModal = document.getElementById('gr-modal');
    const grForm = document.getElementById('gr-form');
    const grPoIdInput = document.getElementById('gr-po-id');
    const grWarehouseSelect = document.getElementById('gr-warehouse');
    const grZoneInput = document.getElementById('gr-zone');
    const grDeliveryQtyInput = document.getElementById('gr-delivery-qty');
    const grInvoicePriceInput = document.getElementById('gr-invoice-price');

    // Shared UI Buttons
    const modalCloseButtons = document.querySelectorAll('.modal-close-btn-action, .gr-close');

    // Toast
    const toast = document.getElementById('toast');
    const toastTitle = toast.querySelector('.toast-title');
    const toastMessage = toast.querySelector('.toast-message');
    const toastCloseBtn = toast.querySelector('.toast-close-btn');

    // =========================================================================
    // TAB ROUTING & SWITCHING
    // =========================================================================

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });

    function switchTab(tabName) {
        if (tabName === 'settings') {
            showToast('Settings System', 'Inventory configuration rules are managed by administrators.', 'info');
            return;
        }
        if (tabName === 'support') {
            showToast('Support Center', 'For assistance, please contact it-support@ambatugrow.com.', 'info');
            return;
        }

        activeTab = tabName;
        
        navItems.forEach(nav => {
            if (nav.dataset.tab === tabName) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });

        tabPanes.forEach(pane => {
            if (pane.id === `tab-${tabName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        if (tabName === 'dashboard') {
            pageTitle.textContent = 'Storefront Checkout & Warehouse Monitor';
            fetchSystemState();
        } else if (tabName === 'inventory') {
            pageTitle.textContent = 'Inventory Tracking Terminal';
            loadInventoryTab();
        } else if (tabName === 'transactions') {
            pageTitle.textContent = 'Stock Transactions Terminal';
            loadInventoryTab();
        } else if (tabName === 'locations') {
            pageTitle.textContent = 'Warehouse Zone Coordinates';
            loadInventoryTab();
        } else if (tabName === 'reports') {
            pageTitle.textContent = 'Inventory Reporting & Alerts';
            loadInventoryTab();
        } else if (tabName === 'orders') {
            pageTitle.textContent = 'Sales Orders Records';
            loadOrdersTab();
        } else if (tabName === 'procurement') {
            pageTitle.textContent = 'Procurement & Supply Chain Management';
            loadProcurementTab();
        } else if (tabName === 'helpdesk') {
            pageTitle.textContent = 'Customer Helpdesk & SLA Tracker';
            loadHelpdeskTab();
        } else if (tabName === 'profile') {
            pageTitle.textContent = 'Agent Profile Dashboard';
            loadProfileTab();
        } else if (tabName === 'audit') {
            pageTitle.textContent = 'System Activity Logs';
            loadAuditTab();
        }
    }

    // =========================================================================
    // DATA RETRIEVAL (API AGGREGATION)
    // =========================================================================

    async function fetchSystemState() {
        try {
            const [invRes, helpRes] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/helpdesk')
            ]);
            
            if (!invRes.ok || !helpRes.ok) throw new Error('Failed to retrieve system state data');
            
            const invData = await invRes.json();
            const helpData = await helpRes.json();
            
            const prevInventory = [...state.inventory];
            const prevOrders = [...state.orders];
            const prevTransactions = [...state.transactions];

            state.products = invData.products || [];
            state.customers = invData.customers || [];
            state.inventory = invData.inventory || [];
            state.orders = invData.sales_orders || [];
            state.orderItems = invData.order_items || [];
            state.transactions = invData.stock_transactions || [];
            state.shipments = invData.shipments || [];

            state.tickets = helpData.tickets || [];
            state.agents = helpData.agents || [];
            state.interactionLogs = helpData.logs || [];

            renderDashboardDropdowns();
            checkLowStockAlerts();
            updateHeaderUserBadge();
            populateHeaderRoleDropdown();
            
            if (activeTab === 'dashboard') {
                renderInventoryTable(document.querySelector('#inventory-table tbody'), prevInventory);
                renderOrdersTable(document.querySelector('#orders-table tbody'), prevOrders);
                renderTransactionsTable(document.querySelector('#transactions-table tbody'), prevTransactions);
            }
        } catch (error) {
            showToast('Error', error.message, 'danger');
        }
    }

    function updateHeaderUserBadge() {
        const activeAgent = state.agents.find(a => a.agent_id === state.activeAgentId);
        const textSpan = document.getElementById('header-user-role') || document.querySelector('.user-badge span');
        if (textSpan && activeAgent) {
            textSpan.textContent = activeAgent.name;
        }
    }

    async function resetDatabase() {
        try {
            const response = await fetch('/api/reset', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                showToast('Success', 'Database reset to factory settings', 'success');
                cartContainer.innerHTML = '';
                addCartRow();
                
                // Hide panel interaction
                interactionPanel.classList.add('hidden');
                
                await fetchSystemState();
                switchTab(activeTab);
            }
        } catch (error) {
            showToast('Error', 'Failed to reset database', 'danger');
        }
    }

    // =========================================================================
    // TAB LOADS
    // =========================================================================

    // 1. INVENTORY TAB
    let filtersInitialized = false;
    function initInventoryFiltersOnce() {
        if (filtersInitialized) return;
        
        const filterWh = document.getElementById('filter-warehouse');
        const filterCat = document.getElementById('filter-category');
        const filterStatus = document.getElementById('filter-status');
        const globalSearch = document.getElementById('global-search-input');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const viewAllLogsBtn = document.getElementById('view-all-logs-btn');
        
        const sortSku = document.getElementById('sort-sku');
        const sortName = document.getElementById('sort-name');
        const sortQty = document.getElementById('sort-qty');
        
        const triggerTableRender = () => renderInventoryTable(document.querySelector('#inventory-master-table tbody'));
        
        if (filterWh) filterWh.addEventListener('change', triggerTableRender);
        if (filterCat) filterCat.addEventListener('change', triggerTableRender);
        if (filterStatus) filterStatus.addEventListener('change', triggerTableRender);
        if (globalSearch) globalSearch.addEventListener('input', triggerTableRender);
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', (e) => {
                e.preventDefault();
                triggerCsvExport();
            });
        }
        
        if (viewAllLogsBtn) {
            viewAllLogsBtn.addEventListener('click', () => {
                const logsTabLink = document.querySelector('.nav-item[data-tab="audit"]');
                if (logsTabLink) logsTabLink.click();
            });
        }
        
        const toggleSort = (col) => {
            if (currentSortColumn === col) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = col;
                currentSortOrder = 'asc';
            }
            
            // Reset icons
            [sortSku, sortName, sortQty].forEach(el => {
                if (!el) return;
                const icon = el.querySelector('i');
                if (icon) {
                    icon.className = 'fa-solid fa-sort';
                    icon.style.opacity = '0.4';
                }
            });
            
            const activeEl = document.getElementById(`sort-${col === 'qty' ? 'qty' : (col === 'name' ? 'name' : 'sku')}`);
            if (activeEl) {
                const icon = activeEl.querySelector('i');
                if (icon) {
                    icon.className = currentSortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                    icon.style.opacity = '1';
                }
            }
            
            triggerTableRender();
        };
        
        if (sortSku) sortSku.addEventListener('click', () => toggleSort('sku'));
        if (sortName) sortName.addEventListener('click', () => toggleSort('name'));
        if (sortQty) sortQty.addEventListener('click', () => toggleSort('qty'));
        
        filtersInitialized = true;
    }

    function triggerCsvExport() {
        let csv = 'SKU,Item Name,Description,Category,Stock Qty,UoM,Status\n';
        state.products.forEach(p => {
            const allocations = state.inventory.filter(item => item.product_id === p.product_id);
            const totalStock = allocations.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
            let uom = p.product_id === 11 ? 'Sacks' : (p.product_id === 13 ? 'Bags' : 'Units');
            let categoryName = (p.product_id === 12 || p.product_id === 14) ? 'Equipment' : 'Agriculture';
            const status = totalStock === 0 ? 'Obsolete' : 'Active';
            
            csv += `"${p.sku}","${p.name}","${p.description || ''}","${categoryName}",${totalStock},"${uom}","${status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'master_inventory_tracking.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Exported', 'Downloaded master inventory CSV report successfully.', 'success');
    }

    async function loadInventoryTab() {
        await fetchSystemState();
        
        initInventoryFiltersOnce();
        
        // Populate adjust/transfer selects
        [adjustProductSelect, transferProductSelect].forEach(select => {
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Choose product...</option>';
                state.products.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.product_id;
                    opt.textContent = `${p.name} (SKU: ${p.sku})`;
                    select.appendChild(opt);
                });
            }
        });

        // Check if filter Category select is populated
        const filterCat = document.getElementById('filter-category');
        if (filterCat && filterCat.children.length <= 1) {
            filterCat.innerHTML = '<option value="">All Categories</option><option value="Agriculture">Agriculture</option><option value="Equipment">Equipment</option>';
        }

        renderInventoryTable(document.querySelector('#inventory-master-table tbody'));
        renderThresholdsReport();
        renderWarehouseOccupancy();
        renderPerishableAlerts();
        renderRecentLogsWidget();
        renderLowStockWidget();
    }

    // 2. ORDERS TAB
    async function loadOrdersTab() {
        await fetchSystemState();
        renderOrdersMasterTable();
        renderShipmentsTable();
        renderLeadsTable();
        renderCustomerLTV();
        renderProductPopularity();
    }

    // 3. PROCUREMENT TAB
    async function loadProcurementTab() {
        try {
            await fetchSystemState();
            
            const response = await fetch('/api/procurement');
            if (!response.ok) throw new Error('Failed to retrieve procurement logs');
            const data = await response.json();

            state.suppliers = data.suppliers || [];
            state.purchaseOrders = data.purchase_orders || [];
            state.poItems = data.po_items || [];
            state.goodsReceipts = data.goods_receipts || [];
            state.requisitions = data.requisitions || [];

            renderProcurementDropdowns();
            renderPoTable();
            renderReceiptsTable();
            renderRequisitionsTable();
            renderSupplierKPI();
            populateRFQProductSelect();
        } catch (error) {
            showToast('Error', error.message, 'danger');
        }
    }

    // 4. HELPDESK TAB
    async function loadHelpdeskTab() {
        try {
            await fetchSystemState();
            autoEscalateOverdueSLATickets();
            renderHelpdeskDropdowns();
            renderTicketsTable();
            populateEscalationAgentSelect();
            renderTicketStatusGauge();
            if (state.activeTicketId) {
                renderConversationThread(state.activeTicketId);
            }
        } catch (error) {
            showToast('Error', error.message, 'danger');
        }
    }

    // 5. PROFILE TAB
    async function loadProfileTab() {
        try {
            await fetchSystemState();
            
            // Populate agent selector
            const selector = document.getElementById('session-agent-select');
            selector.innerHTML = '';
            state.agents.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.agent_id;
                opt.textContent = `${a.name} (${a.department})`;
                if (a.agent_id === state.activeAgentId) opt.selected = true;
                selector.appendChild(opt);
            });

            // Set inputs
            const activeAgent = state.agents.find(a => a.agent_id === state.activeAgentId);
            if (activeAgent) {
                document.getElementById('profile-name').value = activeAgent.name;
                document.getElementById('profile-department').value = activeAgent.department || '';
            }

            renderProfilePerformanceMetrics();
        } catch (error) {
            showToast('Error', error.message, 'danger');
        }
    }

    function renderProfilePerformanceMetrics() {
        const assigned = state.tickets.filter(t => t.agent_id === state.activeAgentId);
        const open = assigned.filter(t => t.status === 'Open' || t.status === 'In Progress');
        
        // Calculate SLA compliance
        let overdueCount = 0;
        assigned.forEach(t => {
            if (t.sla_due_date && t.status !== 'Closed' && t.status !== 'Resolved') {
                const due = new Date(t.sla_due_date);
                const now = new Date('2026-06-29'); // Context date
                if (due.getTime() < now.getTime()) {
                    overdueCount++;
                }
            }
        });

        const complianceRate = assigned.length > 0 
            ? Math.round(((assigned.length - overdueCount) / assigned.length) * 100) 
            : 100;

        document.getElementById('metric-assigned-tickets').textContent = assigned.length;
        document.getElementById('metric-open-tickets').textContent = open.length;
        document.getElementById('metric-sla-compliance').textContent = `${complianceRate}%`;

        // Render My Assigned Tickets List
        const tbody = document.querySelector('#profile-tickets-table tbody');
        tbody.innerHTML = '';
        if (assigned.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No assigned tickets.</td></tr>';
            return;
        }

        assigned.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>#${t.ticket_id}</code></td>
                <td><strong>${t.priority}</strong></td>
                <td>${t.sla_due_date || 'N/A'}</td>
                <td><span class="badge ${t.status === 'Resolved' || t.status === 'Closed' ? 'badge-success' : 'badge-warning'}">${t.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // =========================================================================
    // LOW STOCK MONITOR & AUTO REORDER
    // =========================================================================

    function checkLowStockAlerts() {
        let hasLowStock = false;
        state.products.forEach(p => {
            const productLocations = state.inventory.filter(loc => loc.product_id === p.product_id);
            const totalQty = productLocations.reduce((sum, item) => sum + parseInt(item.quantity), 0);
            
            if (totalQty < (p.min_quantity_threshold || 5)) {
                hasLowStock = true;
            }
        });

        if (lowStockAlertBox) {
            if (hasLowStock) {
                lowStockAlertBox.classList.remove('hidden');
            } else {
                lowStockAlertBox.classList.add('hidden');
            }
        }
    }

    if (autoReorderBtn) {
        autoReorderBtn.addEventListener('click', async () => {
            autoReorderBtn.disabled = true;
            autoReorderBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reordering...';
            
            let count = 0;
            try {
                for (const p of state.products) {
                    const productLocations = state.inventory.filter(loc => loc.product_id === p.product_id);
                    const totalQty = productLocations.reduce((sum, item) => sum + parseInt(item.quantity), 0);
                    
                    if (totalQty < (p.min_quantity_threshold || 5)) {
                        // Create Requisition automatically
                        const response = await fetch('/api/requisitions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ requesting_department: 'Warehouse Operations' })
                        });
                        if (response.ok) count++;
                    }
                }
                
                showToast('Requisitions Generated', `Successfully created ${count} purchase requisitions for low stock items.`, 'success');
                await fetchSystemState();
            } catch (e) {
                showToast('Error', 'Failed to automate re-orders', 'danger');
            } finally {
                autoReorderBtn.disabled = false;
                autoReorderBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate Requisitions';
            }
        });
    }

    // =========================================================================
    // RENDERERS
    // =========================================================================

    function renderDashboardDropdowns() {
        if (customerSelect.children.length <= 1) {
            customerSelect.innerHTML = '<option value="" disabled selected>Choose customer...</option>';
            state.customers.forEach(cust => {
                const opt = document.createElement('option');
                opt.value = cust.customer_id;
                opt.textContent = `${cust.first_name} ${cust.last_name} (${cust.email})`;
                customerSelect.appendChild(opt);
            });
        }
    }

    function renderProcurementDropdowns() {
        supplierSelect.innerHTML = '<option value="" disabled selected>Choose supplier...</option>';
        state.suppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.supplier_id;
            opt.textContent = `${s.supplier_name} (Rating: ${parseFloat(s.performance_rating).toFixed(2)})`;
            supplierSelect.appendChild(opt);
        });

        // Set Product list in PO Line Form
        renderPoProductDropdowns();
    }

    function renderHelpdeskDropdowns() {
        ticketCustomerSelect.innerHTML = '<option value="" disabled selected>Select customer...</option>';
        state.customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.customer_id;
            opt.textContent = `${c.first_name} ${c.last_name}`;
            ticketCustomerSelect.appendChild(opt);
        });

        ticketAgentSelect.innerHTML = '<option value="" disabled selected>Assign agent...</option>';
        state.agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.agent_id;
            opt.textContent = `${a.name} (${a.department})`;
            ticketAgentSelect.appendChild(opt);
        });
    }

    function renderInventoryTable(tbody) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (state.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No products in catalog.</td></tr>';
            return;
        }

        // Apply filters
        const warehouseFilter = document.getElementById('filter-warehouse') ? document.getElementById('filter-warehouse').value : '';
        const categoryFilter = document.getElementById('filter-category') ? document.getElementById('filter-category').value : '';
        const statusFilter = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';

        // Search filter
        const searchVal = document.getElementById('global-search-input') 
            ? (document.getElementById('global-search-input').value || '').toLowerCase().trim() 
            : '';

        let list = [];

        state.products.forEach(p => {
            let allocations = state.inventory.filter(item => item.product_id === p.product_id);
            if (warehouseFilter) {
                allocations = allocations.filter(item => item.warehouse_id === parseInt(warehouseFilter));
            }
            const totalStock = allocations.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);

            // Compute UoM
            let uom = 'Units';
            if (p.product_id === 11) uom = 'Sacks';
            if (p.product_id === 13) uom = 'Bags';

            // Compute Category Name
            let categoryName = 'Agriculture';
            if (p.product_id === 12 || p.product_id === 14) categoryName = 'Equipment';

            // Compute Status
            const status = totalStock === 0 ? 'Obsolete' : 'Active';

            // Filter logic
            if (categoryFilter && categoryName !== categoryFilter) return;
            if (statusFilter && status !== statusFilter) return;

            // Search query logic
            if (searchVal) {
                const match = p.name.toLowerCase().includes(searchVal) || 
                              p.sku.toLowerCase().includes(searchVal) || 
                              (p.description || '').toLowerCase().includes(searchVal) || 
                              categoryName.toLowerCase().includes(searchVal);
                if (!match) return;
            }

            list.push({ p, totalStock, uom, categoryName, status });
        });

        // Inline Column Sorting
        list.sort((a, b) => {
            let valA, valB;
            if (currentSortColumn === 'sku') {
                valA = a.p.sku.toLowerCase();
                valB = b.p.sku.toLowerCase();
            } else if (currentSortColumn === 'name') {
                valA = a.p.name.toLowerCase();
                valB = b.p.name.toLowerCase();
            } else if (currentSortColumn === 'qty') {
                valA = a.totalStock;
                valB = b.totalStock;
            } else {
                valA = a.p.sku.toLowerCase();
                valB = b.p.sku.toLowerCase();
            }
            
            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        list.forEach(item => {
            const statusBadgeClass = item.status === 'Active' ? 'badge-success' : 'badge-secondary';
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td><code>${item.p.sku}</code></td>
                <td><strong>${item.p.name}</strong></td>
                <td><span style="font-size:11px; color:var(--text-muted);">${item.p.description || 'N/A'}</span></td>
                <td>${item.categoryName}</td>
                <td><strong>${item.totalStock}</strong></td>
                <td>${item.uom}</td>
                <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
                <td>
                    <button class="btn btn-text edit-product-btn" data-id="${item.p.product_id}" style="color:var(--color-success); padding:0; border:none; background:none; cursor:pointer; font-weight:600; text-decoration:none; margin-right:8px;">Edit</button>
                    <button class="btn btn-text delete-product-btn" data-id="${item.p.product_id}" style="color:${item.status === 'Obsolete' ? 'var(--color-danger)' : '#f97316'}; padding:0; border:none; background:none; cursor:pointer; font-weight:600; text-decoration:none;">${item.status === 'Obsolete' ? 'Delete' : 'Archive'}</button>
                </td>
            `;

            // Bind click handlers
            tr.querySelector('.edit-product-btn').addEventListener('click', () => openProductModal(item.p.product_id));
            tr.querySelector('.delete-product-btn').addEventListener('click', () => handleDeleteProduct(item.p.product_id));

            tbody.appendChild(tr);
        });

        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No matching inventory records.</td></tr>';
        }
    }

    function renderLowStockWidget() {
        const textEl = document.getElementById('low-stock-widget-text');
        if (!textEl) return;
        
        let count = 0;
        state.products.forEach(p => {
            const productLocations = state.inventory.filter(loc => loc.product_id === p.product_id);
            const totalQty = productLocations.reduce((sum, item) => sum + parseInt(item.quantity), 0);
            if (totalQty < (p.min_quantity_threshold || 5)) {
                count++;
            }
        });
        
        textEl.innerHTML = `<strong>${count} items</strong> below minimum threshold. Action required for replenishment.`;
    }

    function renderRecentLogsWidget() {
        const container = document.getElementById('recent-logs-timeline');
        if (!container) return;
        container.innerHTML = '';
        
        const logs = state.transactions.slice(0, 3);
        if (logs.length === 0) {
            container.innerHTML = '<p class="text-center" style="font-size:11px; color:var(--text-muted); padding:10px 0;">No stock logs recorded.</p>';
            return;
        }
        
        logs.forEach(tx => {
            const p = state.products.find(prod => prod.product_id === tx.product_id) || {};
            const pName = p.name || `Product #${tx.product_id}`;
            
            let typeLabel = 'Stock-In';
            let badgeColor = '#22c55e';
            let icon = 'fa-arrow-down';
            if (tx.transaction_type === 'stock-out') {
                typeLabel = 'Stock-Out';
                badgeColor = '#ef4444';
                icon = 'fa-arrow-up';
            } else if (tx.transaction_type === 'transfer') {
                typeLabel = 'Transfer';
                badgeColor = '#3b82f6';
                icon = 'fa-shuffle';
            }
            
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '12px';
            div.style.alignItems = 'flex-start';
            
            div.innerHTML = `
                <div style="width:26px; height:26px; border-radius:50%; background:${badgeColor}15; display:flex; align-items:center; justify-content:center; color:${badgeColor}; flex-shrink:0;">
                     <i class="fa-solid ${icon}" style="font-size:10px;"></i>
                </div>
                <div style="font-size:11px;">
                     <div style="font-weight:700; color:var(--text-primary);">${typeLabel} ${tx.transaction_type === 'stock-out' ? '-' : '+'}${tx.quantity}</div>
                     <div style="color:var(--text-muted); margin-top:2px;">SKU: ${p.sku || 'N/A'} - ${pName}</div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function renderProductCatalogTable() {
        const tbody = document.querySelector('#product-catalog-table tbody');
        tbody.innerHTML = '';
        state.products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>#${p.product_id}</code></td>
                <td><code>${p.sku}</code></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.min_quantity_threshold} units</td>
                <td>${p.max_quantity_threshold || 50} units</td>
                <td>
                    <button class="btn btn-secondary btn-action edit-product-btn" data-id="${p.product_id}" style="padding: 2px 6px;">Edit</button>
                    <button class="btn btn-secondary btn-action delete-product-btn" data-id="${p.product_id}" style="padding: 2px 6px; border-color:#fca5a5; color:#dc2626;">Delete</button>
                </td>
            `;
            
            // Edit binding
            tr.querySelector('.edit-product-btn').addEventListener('click', () => openProductModal(p.product_id));
            
            // Delete binding
            tr.querySelector('.delete-product-btn').addEventListener('click', () => handleDeleteProduct(p.product_id));
            
            tbody.appendChild(tr);
        });
    }

    function renderOrdersTable(tbody, prevOrders) {
        if (state.orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">No orders placed yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        state.orders.sort((a,b) => b.order_id - a.order_id).forEach(order => {
            const isNew = !prevOrders.find(o => o.order_id === order.order_id);
            
            const tr = document.createElement('tr');
            if (isNew && prevOrders.length > 0) tr.className = 'row-highlight';

            tr.innerHTML = `
                <td><strong>#${order.order_id}</strong></td>
                <td>Customer ${order.customer_id}</td>
                <td><strong>₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
                <td>₱${parseFloat(order.tax_amount).toFixed(2)}</td>
                <td>₱${parseFloat(order.discount_amount).toFixed(2)}</td>
                <td><span class="badge badge-success">${order.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderOrdersMasterTable() {
        const tbody = document.querySelector('#sales-orders-master-table tbody');
        if (state.orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center">No orders found in database.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        state.orders.sort((a,b) => b.order_id - a.order_id).forEach(order => {
            const customer = state.customers.find(c => c.customer_id === order.customer_id) || {};
            const custName = customer.first_name ? `${customer.first_name} ${customer.last_name}` : `Customer #${order.customer_id}`;
            
            const tr = document.createElement('tr');
            const subtotal = parseFloat(order.total_amount) - parseFloat(order.tax_amount) + parseFloat(order.discount_amount);

            tr.innerHTML = `
                <td><strong>#${order.order_id}</strong></td>
                <td><code>${order.order_date || 'Just now'}</code></td>
                <td>${custName}</td>
                <td>₱${subtotal.toFixed(2)}</td>
                <td>₱${parseFloat(order.tax_amount).toFixed(2)}</td>
                <td>₱${parseFloat(order.discount_amount).toFixed(2)}</td>
                <td><strong>₱${parseFloat(order.total_amount).toFixed(2)}</strong></td>
                <td><span class="badge badge-success">${order.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-action view-order-items-btn" data-id="${order.order_id}">
                        <i class="fa-solid fa-magnifying-glass"></i> View Items
                    </button>
                </td>
            `;
            
            tr.querySelector('.view-order-items-btn').addEventListener('click', () => {
                showOrderItemsDetails(order.order_id);
            });

            tbody.appendChild(tr);
        });
    }

    function renderShipmentsTable() {
        const tbody = document.querySelector('#shipment-tracking-table tbody');
        tbody.innerHTML = '';
        if (state.shipments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No shipments logged.</td></tr>`;
            return;
        }
        
        state.shipments.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>#${s.shipment_id}</code></td>
                <td><span class="badge badge-accent">${s.reference_type}</span></td>
                <td><strong>Ref ID #${s.reference_id}</strong></td>
                <td><span class="badge badge-success">${s.status}</span></td>
                <td>${s.route_details || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTransactionsTable(tbody, prevTransactions) {
        if (state.transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No transactions logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        state.transactions.sort((a,b) => b.transaction_id - a.transaction_id).forEach(tx => {
            const isNew = !prevTransactions.find(t => t.transaction_id === tx.transaction_id);

            const tr = document.createElement('tr');
            if (isNew && prevTransactions.length > 0) tr.className = 'row-highlight';

            let typeBadge = 'badge-success';
            if (tx.transaction_type === 'stock-out') typeBadge = 'badge-danger';
            if (tx.transaction_type === 'transfer') typeBadge = 'badge-info';

            tr.innerHTML = `
                <td><strong>#${tx.transaction_id}</strong></td>
                <td>Product ${tx.product_id}</td>
                <td><span class="badge ${typeBadge}">${tx.transaction_type}</span></td>
                <td><strong>${tx.transaction_type === 'stock-out' ? '-' : '+'}${tx.quantity} units</strong></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderRequisitionsTable() {
        const tbody = document.querySelector('#requisitions-table tbody');
        tbody.innerHTML = '';
        if (state.requisitions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No requisitions found.</td></tr>`;
            return;
        }
        
        state.requisitions.forEach(r => {
            const tr = document.createElement('tr');
            
            let actions = '';
            if (r.status === 'pending') {
                actions = `
                    <button class="btn btn-secondary btn-action approve-req-btn" data-id="${r.requisition_id}" style="border-color:#86efac; color:#16a34a; padding: 2px 6px;">Approve</button>
                    <button class="btn btn-secondary btn-action reject-req-btn" data-id="${r.requisition_id}" style="border-color:#fca5a5; color:#dc2626; padding: 2px 6px;">Reject</button>
                `;
            } else if (r.status === 'approved') {
                actions = `
                    <button class="btn btn-primary btn-action make-po-btn" data-id="${r.requisition_id}" style="padding: 2px 6px;">
                        <i class="fa-solid fa-plus"></i> Generate PO
                    </button>
                `;
            } else {
                actions = `<span class="badge">None</span>`;
            }

            let badgeClass = 'badge';
            if (r.status === 'approved') badgeClass = 'badge-success';
            if (r.status === 'rejected') badgeClass = 'badge-danger';

            tr.innerHTML = `
                <td><code>#${r.requisition_id}</code></td>
                <td>${r.requesting_department}</td>
                <td><span class="badge ${badgeClass}">${r.status}</span></td>
                <td>${actions}</td>
            `;
            
            if (r.status === 'pending') {
                tr.querySelector('.approve-req-btn').addEventListener('click', () => handleRequisitionDecision(r.requisition_id, 'approved'));
                tr.querySelector('.reject-req-btn').addEventListener('click', () => handleRequisitionDecision(r.requisition_id, 'rejected'));
            } else if (r.status === 'approved') {
                tr.querySelector('.make-po-btn').addEventListener('click', () => convertRequisitionToPOForm(r.requisition_id));
            }

            tbody.appendChild(tr);
        });
    }

    function renderPoTable() {
        const tbody = document.querySelector('#po-table tbody');
        if (state.purchaseOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No Purchase Orders placed yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        state.purchaseOrders.sort((a,b) => b.po_id - a.po_id).forEach(po => {
            const supplier = state.suppliers.find(s => s.supplier_id === po.supplier_id) || {};
            const supplierName = supplier.supplier_name || `Supplier #${po.supplier_id}`;
            
            const tr = document.createElement('tr');
            
            let actionBtn = '';
            if (po.status === 'sent') {
                actionBtn = `
                    <button class="btn btn-primary btn-action gr-receive-btn" data-id="${po.po_id}">
                        <i class="fa-solid fa-box-open"></i> Receive & 3-Way Match
                    </button>
                `;
            } else {
                actionBtn = `<span class="badge badge-success">Delivered</span>`;
            }

            const statusClass = po.status === 'sent' ? 'badge-warning' : 'badge-success';

            tr.innerHTML = `
                <td><strong>#${po.po_id}</strong></td>
                <td><code>${po.order_date || 'Just now'}</code></td>
                <td>${supplierName}</td>
                <td><span class="badge ${statusClass}">${po.status}</span></td>
                <td>${actionBtn}</td>
            `;

            if (po.status === 'sent') {
                tr.querySelector('.gr-receive-btn').addEventListener('click', () => {
                    openReceiveGoodsModal(po.po_id);
                });
            }

            tbody.appendChild(tr);
        });
    }

    function renderReceiptsTable() {
        const tbody = document.querySelector('#receipts-table tbody');
        if (state.goodsReceipts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">No Goods Receipts processed yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        state.goodsReceipts.sort((a,b) => b.receipt_id - a.receipt_id).forEach(gr => {
            const tr = document.createElement('tr');
            const badgeClass = gr.three_way_match_status === 'matched' ? 'badge-success' : 'badge-danger';
            tr.innerHTML = `
                <td><strong>#${gr.receipt_id}</strong></td>
                <td><strong>PO #${gr.po_id}</strong></td>
                <td><code>${gr.receipt_date || 'Just now'}</code></td>
                <td><span class="badge ${badgeClass}">${gr.three_way_match_status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTicketsTable() {
        const tbody = document.querySelector('#tickets-table tbody');
        tbody.innerHTML = '';
        if (state.tickets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center">No support tickets raised yet.</td></tr>`;
            return;
        }
        
        state.tickets.sort((a,b) => b.ticket_id - a.ticket_id).forEach(ticket => {
            const customer = state.customers.find(c => c.customer_id === ticket.customer_id) || {};
            const agent = state.agents.find(a => a.agent_id === ticket.agent_id) || {};
            const agentName = agent.name ? agent.name : 'Unassigned';
            
            // Check SLA status
            let slaText = ticket.sla_due_date || 'N/A';
            let isOverdue = false;
            if (ticket.sla_due_date && ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
                const due = new Date(ticket.sla_due_date);
                const now = new Date('2026-06-29'); // Current context date
                if (due.getTime() < now.getTime()) {
                    isOverdue = true;
                    slaText = `<span class="text-danger" style="font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> OVERDUE (${ticket.sla_due_date})</span>`;
                }
            }

            const statusClass = ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'badge-success' : 'badge-warning';

            const tr = document.createElement('tr');
            if (isOverdue) tr.style.backgroundColor = 'rgba(239, 68, 68, 0.03)';

            tr.innerHTML = `
                <td><code>#${ticket.ticket_id}</code></td>
                <td>${customer.first_name || 'Unknown'} ${customer.last_name || ''}</td>
                <td>${agentName}</td>
                <td><strong>${ticket.priority}</strong></td>
                <td>${slaText}</td>
                <td><span class="badge ${statusClass}">${ticket.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-action audit-chat-btn" data-id="${ticket.ticket_id}">
                        <i class="fa-solid fa-comments"></i> Chat Audit
                    </button>
                </td>
            `;

            tr.querySelector('.audit-chat-btn').addEventListener('click', () => {
                showInteractionLog(ticket.ticket_id);
            });

            tbody.appendChild(tr);
        });
    }

    function renderConversationThread(ticketId) {
        state.activeTicketId = ticketId;
        activeLogTicketIdSpan.textContent = ticketId;
        interactionTicketIdInput.value = ticketId;
        
        interactionsContainer.innerHTML = '';
        const logs = state.interactionLogs.filter(log => log.ticket_id === ticketId);
        
        if (logs.length === 0) {
            interactionsContainer.innerHTML = '<p class="text-center" style="font-size:11px; color:var(--text-muted);">No messages logged yet.</p>';
            return;
        }

        logs.forEach(log => {
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${log.interaction_type}`;
            
            const meta = log.interaction_type === 'internal_note' ? 'Internal Note' : 'Customer Message';
            bubble.innerHTML = `
                <span>${log.message_body}</span>
                <span class="chat-meta">${meta} | ${log.timestamp || 'Just now'}</span>
            `;
            interactionsContainer.appendChild(bubble);
        });

        // Scroll to bottom
        interactionsContainer.scrollTop = interactionsContainer.scrollHeight;
    }

    // =========================================================================
    // CART & PO ITEMS HELPERS
    // =========================================================================

    function addCartRow() {
        const row = document.createElement('div');
        row.className = 'cart-row';
        
        let productOptions = '<option value="" disabled selected>Select product...</option>';
        state.products.forEach(p => {
            const prices = { 10: 5.00, 11: 4.50, 12: 12.00, 13: 15.00, 14: 6.50, 15: 8.00, 16: 25.00, 17: 150.00 };
            const price = prices[p.product_id] || 10.00;
            productOptions += `<option value="${p.product_id}" data-price="${price}">${p.name} (SKU: ${p.sku})</option>`;
        });

        row.innerHTML = `
            <div class="select-wrapper">
                <select class="cart-product" required>
                    ${productOptions}
                </select>
            </div>
            <input type="number" class="cart-quantity" value="1" min="1" required>
            <input type="number" class="cart-price" value="0.00" min="0" step="0.01" readonly>
            <button type="button" class="btn-remove-item"><i class="fa-solid fa-trash-can"></i></button>
        `;

        const prodSelect = row.querySelector('.cart-product');
        const qtyInput = row.querySelector('.cart-quantity');
        const priceInput = row.querySelector('.cart-price');
        const removeBtn = row.querySelector('.btn-remove-item');

        prodSelect.addEventListener('change', () => {
            const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
            const price = parseFloat(selectedOpt.dataset.price) || 0.00;
            priceInput.value = price.toFixed(2);
            recalculateCartTotals();
        });

        qtyInput.addEventListener('input', recalculateCartTotals);
        removeBtn.addEventListener('click', () => {
            row.remove();
            recalculateCartTotals();
        });

        cartContainer.appendChild(row);
        recalculateCartTotals();
    }

    function recalculateCartTotals() {
        let subtotal = 0;
        const rows = cartContainer.querySelectorAll('.cart-row');
        
        rows.forEach(row => {
            const qty = parseInt(row.querySelector('.cart-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.cart-price').value) || 0;
            subtotal += qty * price;
        });

        const tax = parseFloat(taxInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;
        const total = Math.max(0, subtotal + tax - discount);

        summarySubtotal.textContent = `₱${subtotal.toFixed(2)}`;
        summaryTax.textContent = `+₱${tax.toFixed(2)}`;
        summaryDiscount.textContent = `-₱${discount.toFixed(2)}`;
        summaryTotal.textContent = `₱${total.toFixed(2)}`;
    }

    function renderPoProductDropdowns() {
        const select = poForm.querySelector('.po-product');
        select.innerHTML = '<option value="" disabled selected>Product...</option>';
        state.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.product_id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    }

    // =========================================================================
    // MODALS AND TOASTS
    // =========================================================================

    function showToast(title, message, type = 'success') {
        toast.className = `toast toast-${type}`;
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        const icon = toast.querySelector('.toast-icon');
        icon.className = type === 'success' 
            ? 'toast-icon fa-solid fa-circle-check' 
            : 'toast-icon fa-solid fa-circle-exclamation';

        toast.classList.remove('hidden');
        setTimeout(closeToast, 6000); // 6s to read matching errors
    }

    function closeToast() {
        toast.classList.add('hidden');
    }

    function showTraceLogs(txLog, locksLog) {
        traceTxLog.textContent = Array.isArray(txLog) ? txLog.join('\n') : '(None)';
        traceLocksLog.textContent = Array.isArray(locksLog) ? locksLog.join('\n') : '(None)';
        traceModal.classList.remove('hidden');
    }

    function showOrderItemsDetails(orderId) {
        orderItemsDetailTableBody.innerHTML = '';
        const items = state.orderItems.filter(item => item.order_id === orderId);
        
        if (items.length === 0) {
            orderItemsDetailTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No line items logged.</td></tr>`;
        } else {
            items.forEach(item => {
                const tr = document.createElement('tr');
                const sub = parseFloat(item.quantity) * parseFloat(item.unit_price);
                tr.innerHTML = `
                    <td><strong>Product #${item.product_id}</strong></td>
                    <td>${item.quantity} units</td>
                    <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td><strong>₱${sub.toFixed(2)}</strong></td>
                `;
                orderItemsDetailTableBody.appendChild(tr);
            });
        }
        orderItemsModal.classList.remove('hidden');
    }

    function openReceiveGoodsModal(poId) {
        grPoIdInput.value = poId;
        
        // Clear matching inputs
        grDeliveryQtyInput.value = '';
        grInvoicePriceInput.value = '';
        
        grModal.classList.remove('hidden');
    }

    // Product CRUD Modal Handlers
    function openProductModal(productId = null) {
        if (productId) {
            const p = state.products.find(item => item.product_id === productId);
            if (p) {
                productModalTitle.textContent = 'Edit Existing Product';
                prodIdInput.value = p.product_id;
                prodSkuInput.value = p.sku;
                prodNameInput.value = p.name;
                prodDescInput.value = p.description || '';
                prodThresholdInput.value = p.min_quantity_threshold || 5;
                document.getElementById('prod-max-threshold').value = p.max_quantity_threshold || 50;
            }
        } else {
            productModalTitle.textContent = 'Add New Product Catalog Item';
            productForm.reset();
            prodIdInput.value = '';
            document.getElementById('prod-max-threshold').value = 50;
        }
        productModal.classList.remove('hidden');
    }

    function closeAllModals() {
        traceModal.classList.add('hidden');
        orderItemsModal.classList.add('hidden');
        grModal.classList.add('hidden');
        productModal.classList.add('hidden');
    }

    // =========================================================================
    // CRUD & API FORM SUBMISSIONS
    // =========================================================================

    // 1. Checkout Order Submit
    if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    async function handleCheckoutSubmit(e) {
        e.preventDefault();
        checkoutSubmitBtn.disabled = true;
        checkoutSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Checkout...';

        const customerId = parseInt(customerSelect.value);
        const tax = parseFloat(taxInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;

        const items = [];
        const rows = cartContainer.querySelectorAll('.cart-row');
        rows.forEach(row => {
            const productId = parseInt(row.querySelector('.cart-product').value);
            const quantity = parseInt(row.querySelector('.cart-quantity').value);
            const unitPrice = parseFloat(row.querySelector('.cart-price').value);
            if (productId && quantity > 0) {
                items.push({ product_id: productId, quantity, unit_price: unitPrice });
            }
        });

        const payload = {
            customer_id: customerId,
            items: items,
            tax_amount: tax,
            discount_amount: discount
        };

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (response.ok && result.success) {
                showToast('Order Placed', `Order ID #${result.data.order_id} successfully created!`, 'success');
                showTraceLogs(result._transaction_log, result._locks);
                await fetchSystemState();
            } else {
                showToast('Checkout Failed', result.error || result.message || 'Checkout failed', 'danger');
                await fetchSystemState();
            }
        } catch (error) {
            showToast('System Error', 'Could not establish connection with API', 'danger');
        } finally {
            checkoutSubmitBtn.disabled = false;
            checkoutSubmitBtn.innerHTML = '<i class="fa-solid fa-credit-card"></i> Submit Checkout Order';
        }
    }

    // 2. Direct Stock Adjustment Form
    stockAdjustForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = stockAdjustForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const payload = {
            product_id: parseInt(adjustProductSelect.value),
            warehouse_id: parseInt(adjustWarehouseSelect.value),
            zone: adjustZoneInput.value,
            quantity: parseInt(adjustQtyInput.value),
            expiration_date: adjustExpirationInput.value || null
        };

        try {
            const response = await fetch('/api/adjust-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (response.ok && result.success) {
                showToast('Stock Adjusted', result.message, 'success');
                await loadInventoryTab();
            } else {
                showToast('Error', result.message || 'Failed to adjust stock', 'danger');
            }
        } catch (error) {
            showToast('System Error', 'Could not connect to API', 'danger');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 3. Inter-Warehouse Transfer Form
    stockTransferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = stockTransferForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const payload = {
            product_id: parseInt(transferProductSelect.value),
            from_warehouse_id: parseInt(transferFromWh.value),
            from_zone: transferFromZone.value,
            to_warehouse_id: parseInt(transferToWh.value),
            to_zone: transferToZone.value,
            quantity: parseInt(transferQtyInput.value)
        };

        try {
            const response = await fetch('/api/transfer-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (response.ok && result.success) {
                showToast('Transfer Completed', result.message, 'success');
                await loadInventoryTab();
            } else {
                showToast('Transfer Failed', result.message || 'Stock transfer failed', 'danger');
            }
        } catch (e) {
            showToast('System Error', 'Failed to connect to API', 'danger');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 4. Product Catalog CRUD Form Submit
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = productForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const prodId = prodIdInput.value;
        const url = prodId ? '/api/products/update' : '/api/products';
        
        const payload = {
            product_id: prodId ? parseInt(prodId) : null,
            sku: prodSkuInput.value,
            name: prodNameInput.value,
            description: prodDescInput.value,
            min_quantity_threshold: parseInt(prodThresholdInput.value),
            max_quantity_threshold: parseInt(document.getElementById('prod-max-threshold').value)
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (response.ok && result.success) {
                showToast('Success', 'Product Catalog updated successfully.', 'success');
                closeAllModals();
                await loadInventoryTab();
            } else {
                showToast('Error', result.message || 'Catalog update failed.', 'danger');
            }
        } catch (error) {
            showToast('System Error', 'Failed to communicate with catalog API.', 'danger');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // 5. Handle Delete Product Catalog Item
    async function handleDeleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product from the catalog? This may fail if inventory rows exist.')) {
            return;
        }

        try {
            const response = await fetch('/api/products/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                showToast('Deleted', 'Product catalog record removed.', 'success');
                await loadInventoryTab();
            } else {
                showToast('Delete Failed', result.message || 'Product contains active references.', 'danger');
            }
        } catch (e) {
            showToast('System Error', 'Could not delete product.', 'danger');
        }
    }

    // 6. Submit Requisition
    if (requisitionForm) {
        requisitionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = requisitionForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const payload = {
                requesting_department: reqDepartmentInput.value
            };

            try {
                const response = await fetch('/api/requisitions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('Requisition Submitted', 'Initiated internal requisition request for approval.', 'success');
                    requisitionForm.reset();
                    await loadProcurementTab();
                } else {
                    showToast('Error', 'Requisition submission failed', 'danger');
                }
            } catch (e) {
                showToast('System Error', 'Failed to connect to API', 'danger');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // 7. Requisition Approval Decisions
    async function handleRequisitionDecision(reqId, decision) {
        try {
            const response = await fetch('/api/requisitions/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requisition_id: reqId, status: decision })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                showToast('Decision Recorded', `Requisition has been ${decision}.`, 'success');
                await loadProcurementTab();
            }
        } catch (e) {
            showToast('Error', 'Failed to record approval decision.', 'danger');
        }
    }

    // 8. Requisition to PO Auto-Fill Converter
    function convertRequisitionToPOForm(reqId) {
        poRequisitionIdInput.value = reqId;
        showToast('PO Autofilled', `autofilled PO reference for Approved Requisition #${reqId}`, 'success');
        // Smooth scroll to PO creation panel
        poForm.scrollIntoView({ behavior: 'smooth' });
    }

    // 9. Send Purchase Order Form Submit
    if (poForm) {
        poForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            poSubmitBtn.disabled = true;

            const supplierId = parseInt(supplierSelect.value);
            const productId = parseInt(poForm.querySelector('.po-product').value);
            const qty = parseInt(poForm.querySelector('.po-qty').value);
            const reqId = poRequisitionIdInput.value ? parseInt(poRequisitionIdInput.value) : null;

            const payload = {
                supplier_id: supplierId,
                items: [{ product_id: productId, quantity: qty }],
                requisition_id: reqId
            };

            try {
                const response = await fetch('/api/purchase-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showToast('PO Sent', `Purchase Order #${result.data.po_id} sent.`, 'success');
                    poForm.reset();
                    await loadProcurementTab();
                } else {
                    showToast('Error', result.message || 'Failed to create PO', 'danger');
                }
            } catch (error) {
                showToast('System Error', 'Could not establish connection with API', 'danger');
            } finally {
                poSubmitBtn.disabled = false;
            }
        });
    }

    // 10. Submit Goods Receipt (with 3-Way Match Check)
    if (grForm) {
        grForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = grForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const payload = {
                po_id: parseInt(grPoIdInput.value),
                warehouse_id: parseInt(grWarehouseSelect.value),
                zone: grZoneInput.value,
                delivery_qty: parseInt(grDeliveryQtyInput.value),
                invoice_price: parseFloat(grInvoicePriceInput.value)
            };

            try {
                const response = await fetch('/api/receive-goods', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Succeeded matching
                    showToast('3-Way Match Verified', 'Delivery details matched PO successfully. Warehouse inventory updated.', 'success');
                    closeAllModals();
                    await loadProcurementTab();
                } else {
                    // Failed matching (Quantity/Price mismatches)
                    showToast('Match Discrepancy', result.message || 'Goods match audit failed.', 'danger');
                    closeAllModals();
                    await loadProcurementTab();
                }
            } catch (error) {
                showToast('System Error', 'Could not connect to matching API', 'danger');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // =========================================================================
    // HELPDESK & SUPPORT TICKETS
    // =========================================================================

    // 1. Create Ticket Form
    if (ticketForm) {
        ticketForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = ticketForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const payload = {
                customer_id: parseInt(ticketCustomerSelect.value),
                agent_id: parseInt(ticketAgentSelect.value),
                priority: ticketPrioritySelect.value,
                message: ticketMessageInput.value
            };

            try {
                const response = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('Ticket Opened', `Opened ticket #${result.data.ticket_id} and assigned agent.`, 'success');
                    ticketForm.reset();
                    await loadHelpdeskTab();
                } else {
                    showToast('Error', 'Failed to open ticket', 'danger');
                }
            } catch (e) {
                showToast('System Error', 'Could not open support ticket.', 'danger');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // 2. Click Chat Audit
    function showInteractionLog(ticketId) {
        if (interactionPanel) interactionPanel.classList.remove('hidden');
        renderConversationThread(ticketId);
        
        // Scroll interaction thread to view
        if (interactionPanel) interactionPanel.scrollIntoView({ behavior: 'smooth' });
    }

    // 3. Add Interaction Note Form Submit
    if (interactionForm) {
        interactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = interactionForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const ticketId = parseInt(interactionTicketIdInput.value);
            const escalateSelect = document.getElementById('escalate-agent-select');
            const escalateTo = escalateSelect && escalateSelect.value ? parseInt(escalateSelect.value) : null;
            
            const payload = {
                ticket_id: ticketId,
                interaction_type: interactionTypeSelect.value,
                status: interactionStatusSelect.value,
                message_body: interactionBodyInput.value,
                escalate_to: escalateTo
            };

            try {
                const response = await fetch('/api/tickets/interaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('Log Saved', 'Recorded ticket interaction successfully.', 'success');
                    interactionBodyInput.value = '';
                    if (escalateSelect) escalateSelect.value = '';
                    const faqSelect = document.getElementById('faq-helper-select');
                    if (faqSelect) faqSelect.value = '';
                    await loadHelpdeskTab();
                } else {
                    showToast('Error', 'Failed to update interaction thread.', 'danger');
                }
            } catch (e) {
                showToast('System Error', 'Failed to submit log entry.', 'danger');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // 4. Solution FAQ Search Filter
    if (faqSearchInput) {
        faqSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = faqResults.querySelectorAll('.faq-item');
        
        items.forEach(item => {
            const title = item.querySelector('h5').textContent.toLowerCase();
            const text = item.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(query) || text.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // =========================================================================
    // EVENT LISTENERS & SETUP
    // =========================================================================

    // Product Modal Actions
    addProductBtn.addEventListener('click', () => openProductModal());
    productModalCloseBtn.addEventListener('click', closeAllModals);
    productModalCancelBtn.addEventListener('click', closeAllModals);

    if (addItemBtn) addItemBtn.addEventListener('click', addCartRow);
    resetDbBtn.addEventListener('click', resetDatabase);
    if (taxInput) taxInput.addEventListener('input', recalculateCartTotals);
    if (discountInput) discountInput.addEventListener('input', recalculateCartTotals);
    toastCloseBtn.addEventListener('click', closeToast);
    modalCloseButtons.forEach(btn => btn.addEventListener('click', closeAllModals));

    // Profile Actions Event Listeners
    const profileEditForm = document.getElementById('profile-edit-form');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileEditForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const name = document.getElementById('profile-name').value;
            const dept = document.getElementById('profile-department').value;

            const payload = {
                agent_id: state.activeAgentId,
                name: name,
                department: dept
            };

            try {
                const response = await fetch('/api/agents/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    showToast('Profile Updated', 'Your profile details have been saved in the database.', 'success');
                    await loadProfileTab();
                } else {
                    showToast('Error', result.message || 'Failed to update profile.', 'danger');
                }
            } catch (error) {
                showToast('System Error', 'Could not establish connection with API.', 'danger');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    const sessionAgentSelect = document.getElementById('session-agent-select');
    if (sessionAgentSelect) {
        sessionAgentSelect.addEventListener('change', async (e) => {
            state.activeAgentId = parseInt(e.target.value);
            showToast('User Switch', `Context changed. Active session user updated.`, 'success');
            await loadProfileTab();
        });
    }

    // Sidebar Collapse Toggle logic
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && localStorage.getItem('sidebar-collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        });
    }

    function renderThresholdsReport() {
        const tbody = document.querySelector('#thresholds-report-table tbody');
        tbody.innerHTML = '';
        state.products.forEach(p => {
            const productLocations = state.inventory.filter(item => item.product_id === p.product_id);
            const totalStock = productLocations.reduce((sum, item) => sum + parseInt(item.quantity), 0);
            
            const min = p.min_quantity_threshold || 5;
            const max = p.max_quantity_threshold || 50;
            
            let status = 'OPTIMAL';
            let badgeClass = 'badge-success';
            if (totalStock < min) {
                status = 'UNDERSTOCKED';
                badgeClass = 'badge-danger';
            } else if (totalStock > max) {
                status = 'OVERSTOCKED';
                badgeClass = 'badge-warning';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${p.sku}</code></td>
                <td><strong>${p.name}</strong></td>
                <td>${min} units</td>
                <td>${max} units</td>
                <td><strong>${totalStock}</strong></td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Inventory Master Table Search Filter
    const invSearchFilter = document.getElementById('inventory-search-filter');
    if (invSearchFilter) {
        invSearchFilter.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#inventory-master-table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    // Warehouse Zone Finder (Reduce Search Time)
    const zoneFinderSearch = document.getElementById('zone-finder-search');
    if (zoneFinderSearch) {
        zoneFinderSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const tbody = document.querySelector('#zone-finder-results-table tbody');
            tbody.innerHTML = '';
            
            if (query.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Start typing to search coordinates...</td></tr>';
                return;
            }
            
            // Find products matching query
            const matchedProducts = state.products.filter(p => 
                p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
            );
            
            if (matchedProducts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No matching products found.</td></tr>';
                return;
            }
            
            let foundLocations = [];
            matchedProducts.forEach(p => {
                const locs = state.inventory.filter(item => item.product_id === p.product_id);
                locs.forEach(loc => {
                    foundLocations.push({
                        pName: p.name,
                        warehouse: loc.warehouse_id,
                        zone: loc.zone,
                        quantity: loc.quantity
                    });
                });
            });
            
            if (foundLocations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No physical stock allocated in warehouses.</td></tr>';
                return;
            }
            
            foundLocations.forEach(loc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${loc.pName}</strong></td>
                    <td>Warehouse ${loc.warehouse}</td>
                    <td><code>Zone ${loc.zone}</code></td>
                    <td><strong>${loc.quantity} units</strong></td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    // Leads State Initialization
    state.leads = [
        { name: 'Agriculture Cooperatives', value: 4500.00, status: 'Proposal' },
        { name: 'National Research Grant Project', value: 12500.00, status: 'Won' },
        { name: 'Indang Agricultural Trading', value: 850.00, status: 'New' }
    ];

    async function loadAuditTab() {
        const tbody = document.querySelector('#audit-logs-table tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Fetching activity trail...</td></tr>';
        
        try {
            const response = await fetch('/api/audit-logs');
            const result = await response.json();
            
            if (response.ok && result.success) {
                const logs = result.audit_logs || [];
                if (logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No system actions logged yet.</td></tr>';
                    return;
                }
                
                tbody.innerHTML = '';
                logs.forEach(log => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><code>#${log.audit_id}</code></td>
                        <td><code>${log.timestamp}</code></td>
                        <td><strong>${log.user_role}</strong></td>
                        <td><span class="badge ${log.action.includes('FAIL') || log.action.includes('MISMATCH') ? 'badge-danger' : 'badge-accent'}" style="text-transform:uppercase;">${log.action}</span></td>
                        <td>${log.description}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load audit logs.</td></tr>';
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Network error connecting to logs API.</td></tr>';
        }
    }

    function renderLeadsTable() {
        const tbody = document.querySelector('#leads-table tbody');
        tbody.innerHTML = '';
        if (!state.leads || state.leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No active leads logged.</td></tr>';
            return;
        }
        state.leads.forEach((lead, index) => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'badge-secondary';
            if (lead.status === 'Won') badgeClass = 'badge-success';
            else if (lead.status === 'Proposal') badgeClass = 'badge-accent';
            else if (lead.status === 'Lost') badgeClass = 'badge-danger';
            
            const convertBtn = lead.status === 'Won' 
                ? `<button class="btn btn-primary btn-action convert-lead-btn" data-index="${index}" style="padding: 2px 6px;"><i class="fa-solid fa-credit-card"></i> Convert</button>`
                : '';
                
            tr.innerHTML = `
                <td><strong>${lead.name}</strong></td>
                <td>₱${parseFloat(lead.value).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${lead.status}</span></td>
                <td>
                    ${convertBtn}
                    <button class="btn btn-secondary btn-action delete-lead-btn" data-index="${index}" style="padding: 2px 6px; border-color:#fca5a5; color:#dc2626;"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            
            if (lead.status === 'Won') {
                tr.querySelector('.convert-lead-btn').addEventListener('click', () => {
                    const checkoutTabLink = document.querySelector('.nav-item[data-tab="dashboard"]');
                    if (checkoutTabLink) checkoutTabLink.click();
                    
                    if (state.customers.length > 0) {
                        document.getElementById('customer-select').value = state.customers[0].customer_id;
                    }
                    const cartRows = document.querySelectorAll('.cart-row');
                    cartRows.forEach(r => r.remove());
                    
                    addCartRow();
                    setTimeout(() => {
                        const firstRow = document.querySelector('.cart-row');
                        if (firstRow) {
                            const productSelect = firstRow.querySelector('.cart-product');
                            productSelect.selectedIndex = 1;
                            const qtyInput = firstRow.querySelector('.cart-quantity');
                            qtyInput.value = Math.max(1, Math.round(lead.value / 5.0));
                            productSelect.dispatchEvent(new Event('change'));
                        }
                        showToast('Lead Converted', `Lead details for ${lead.name} transferred to storefront checkout!`, 'success');
                    }, 200);
                });
            }
            
            tr.querySelector('.delete-lead-btn').addEventListener('click', () => {
                state.leads.splice(index, 1);
                renderLeadsTable();
            });
            
            tbody.appendChild(tr);
        });
    }

    function renderSupplierKPI() {
        const tbody = document.querySelector('#supplier-kpi-table tbody');
        tbody.innerHTML = '';
        if (state.suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No suppliers configured.</td></tr>';
            return;
        }
        state.suppliers.forEach(s => {
            const pos = state.purchaseOrders.filter(po => po.supplier_id === s.supplier_id);
            const poIds = pos.map(po => po.po_id);
            
            const receipts = state.goodsReceipts.filter(r => poIds.includes(r.po_id));
            const matched = receipts.filter(r => r.three_way_match_status === 'matched').length;
            const total = receipts.length;
            
            let matchRateStr = 'N/A';
            let status = 'No Deliveries';
            let badgeClass = 'badge-secondary';
            let progressHtml = '';
            
            if (total > 0) {
                const rate = (matched / total) * 100;
                matchRateStr = `${rate.toFixed(0)}%`;
                
                progressHtml = `
                    <div style="background:rgba(255,255,255,0.08); height:4px; border-radius:2px; width:80px; overflow:hidden; margin-top:4px;">
                        <div style="background:var(--accent-color); width:${rate}%; height:100%; border-radius:2px;"></div>
                    </div>
                `;
                
                if (rate >= 90) {
                    status = 'Excellent';
                    badgeClass = 'badge-success';
                } else if (rate >= 60) {
                    status = 'Optimal';
                    badgeClass = 'badge-accent';
                } else {
                    status = 'Needs Review';
                    badgeClass = 'badge-danger';
                }
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.supplier_name}</strong></td>
                <td>${total} processed</td>
                <td>
                    <strong>${matchRateStr}</strong>
                    ${progressHtml}
                </td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function populateEscalationAgentSelect() {
        const select = document.getElementById('escalate-agent-select');
        if (!select) return;
        select.innerHTML = '<option value="" selected>No Escalation</option>';
        state.agents.forEach(a => {
            if (a.agent_id !== state.activeAgentId) {
                const opt = document.createElement('option');
                opt.value = a.agent_id;
                opt.textContent = `${a.name} (${a.department})`;
                select.appendChild(opt);
            }
        });
    }

    // Lead Modal Actions & Setup
    const addLeadBtn = document.getElementById('add-lead-btn');
    const leadModal = document.getElementById('lead-modal');
    const leadForm = document.getElementById('lead-form');
    const leadModalCloseBtn = document.getElementById('lead-modal-close-btn');
    const leadModalCancelBtn = document.getElementById('lead-modal-cancel-btn');

    if (addLeadBtn) {
        addLeadBtn.addEventListener('click', () => {
            leadForm.reset();
            leadModal.classList.remove('hidden');
        });
    }
    if (leadModalCloseBtn) leadModalCloseBtn.addEventListener('click', () => leadModal.classList.add('hidden'));
    if (leadModalCancelBtn) leadModalCancelBtn.addEventListener('click', () => leadModal.classList.add('hidden'));
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('lead-name').value;
            const value = parseFloat(document.getElementById('lead-value').value);
            const status = document.getElementById('lead-status').value;
            
            state.leads = state.leads || [];
            state.leads.push({ name, value, status });
            leadModal.classList.add('hidden');
            renderLeadsTable();
            showToast('Lead Added', 'Sales opportunity logged in pipeline.', 'success');
        });
    }

    // FAQ template select trigger
    const faqSelect = document.getElementById('faq-helper-select');
    if (faqSelect) {
        faqSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const bodyInput = document.getElementById('interaction-body');
            if (!bodyInput) return;
            
            if (val === 'refund') {
                bodyInput.value = 'We apologize for the damaged seed packing. We have processed a replacement order and credited a ₱200 discount to your next purchase.';
            } else if (val === 'delay') {
                bodyInput.value = 'Our delivery dispatch is currently delayed due to extreme local weather conditions. We expect the shipment to arrive at your coordinates in 24 hours.';
            } else if (val === 'care') {
                bodyInput.value = 'For best germination: plant green leaf lettuce seeds in loose organic soil 1/4 inch deep. Keep moist and place under indirect sun.';
            }
        });
    }

    // Warehouse Occupancy Capacity Monitor
    function renderWarehouseOccupancy() {
        const container = document.getElementById('zone-density-widget-container') || document.getElementById('occupancy-container');
        if (!container) return;
        container.innerHTML = '';
        
        // Group inventory by warehouse and zone
        const occupancy = {};
        state.inventory.forEach(item => {
            const whName = item.warehouse_id === 1 ? 'Warehouse A' : 'Warehouse B';
            const key = `${whName} - Zone ${item.zone}`;
            occupancy[key] = (occupancy[key] || 0) + item.quantity;
        });
        
        // Guarantee default zones are rendered
        if (!occupancy['Warehouse A - Zone A1']) occupancy['Warehouse A - Zone A1'] = 0;
        if (!occupancy['Warehouse B - Zone A1']) occupancy['Warehouse B - Zone A1'] = 0;
        
        Object.keys(occupancy).sort().forEach(key => {
            const qty = occupancy[key];
            const pct = Math.min(100, (qty / 100) * 100);
            
            let barColor = '#22c55e'; // Green
            if (qty > 80) barColor = '#ef4444'; // Red
            else if (qty > 40) barColor = '#84cc16'; // Lime
            else if (qty > 10) barColor = '#3b82f6'; // Blue
            else if (qty > 0) barColor = '#f97316'; // Orange
            
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-weight:500;">
                    <span style="color:var(--text-primary); font-weight:700;">${key}</span>
                    <span style="color:var(--text-muted);">${qty} items</span>
                </div>
                <div style="background:rgba(0,0,0,0.05); border-radius:4px; height:6px; overflow:hidden; position:relative; width:100%;">
                    <div style="background:${barColor}; width:${pct}%; height:100%; transition: width 0.3s ease; border-radius:4px;"></div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Perishable Expiration Warnings
    function renderPerishableAlerts() {
        const tbody = document.querySelector('#expiry-alerts-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const perishables = state.inventory.filter(item => item.expiration_date);
        if (perishables.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No expiration dates tracked.</td></tr>';
            return;
        }
        
        const now = new Date();
        now.setHours(0,0,0,0);
        
        let count = 0;
        perishables.forEach(item => {
            const p = state.products.find(prod => prod.product_id === item.product_id);
            if (!p) return;
            
            const exp = new Date(item.expiration_date);
            const diffTime = exp - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let status = 'Optimal';
            let badgeClass = 'badge-success';
            
            if (diffDays < 0) {
                status = 'EXPIRED';
                badgeClass = 'badge-danger';
            } else if (diffDays <= 30) {
                status = `Expiring in ${diffDays}d`;
                badgeClass = 'badge-warning';
            } else {
                return; // Only show alerts for expired/near-expiry stock
            }
            
            count++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td>Wh ${item.warehouse_id} Z ${item.zone}</td>
                <td><code>${item.expiration_date}</code></td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
            `;
            tbody.appendChild(tr);
        });
        
        if (count === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No expired or near-expiry batches.</td></tr>';
        }
    }

    // RFQ cost compare and reorder suggestion
    function populateRFQProductSelect() {
        const select = document.getElementById('rfq-product-select');
        if (!select) return;
        
        const currentSelection = select.value;
        select.innerHTML = '<option value="" disabled selected>Select product...</option>';
        state.products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.product_id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        
        if (currentSelection) {
            select.value = currentSelection;
            triggerRFQComparison(currentSelection);
        }
    }

    function triggerRFQComparison(productId) {
        productId = parseInt(productId);
        const product = state.products.find(p => p.product_id === productId);
        if (!product) return;
        
        const allocations = state.inventory.filter(item => item.product_id === productId);
        const currentStock = allocations.reduce((sum, item) => sum + item.quantity, 0);
        
        document.getElementById('rfq-current-stock').textContent = currentStock;
        
        const min = product.min_quantity_threshold || 5;
        const max = product.max_quantity_threshold || 50;
        
        let suggestion = 0;
        if (currentStock < min) {
            suggestion = max - currentStock;
        }
        
        const sugEl = document.getElementById('rfq-suggested-qty');
        sugEl.textContent = suggestion;
        
        const tbody = document.querySelector('#rfq-compare-table tbody');
        tbody.innerHTML = '';
        
        let cheapestSupplierId = null;
        let cheapestPrice = Infinity;
        
        state.suppliers.forEach((s, idx) => {
            let basePrice = productId === 10 ? 49.99 : 99.99;
            let discount = idx === 0 ? 0.05 : (idx === 1 ? 0.10 : 0.00);
            let quotePrice = basePrice * (1 - discount);
            
            if (quotePrice < cheapestPrice) {
                cheapestPrice = quotePrice;
                cheapestSupplierId = s.supplier_id;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${s.supplier_name}</strong></td>
                <td style="color:var(--accent-color);">₱${quotePrice.toFixed(2)}</td>
                <td>${min} units</td>
                <td>${max} units</td>
            `;
            tbody.appendChild(tr);
        });
        
        state.lastRfqTransferData = {
            productId: productId,
            supplierId: cheapestSupplierId,
            quantity: suggestion > 0 ? suggestion : 10 // Default to 10 if stock level is already optimal
        };
        
        const transferBtn = document.getElementById('rfq-transfer-btn');
        if (transferBtn) {
            transferBtn.disabled = false;
        }
    }

    const rfqProdSelect = document.getElementById('rfq-product-select');
    if (rfqProdSelect) {
        rfqProdSelect.addEventListener('change', (e) => {
            triggerRFQComparison(e.target.value);
        });
    }

    const rfqTransferBtn = document.getElementById('rfq-transfer-btn');
    if (rfqTransferBtn) {
        rfqTransferBtn.addEventListener('click', () => {
            const data = state.lastRfqTransferData;
            if (!data) return;
            
            const supplierSelect = document.getElementById('supplier-select');
            if (supplierSelect) {
                supplierSelect.value = data.supplierId;
                supplierSelect.dispatchEvent(new Event('change'));
            }
            
            const poProdSelect = document.querySelector('.po-product');
            const poQtyInput = document.querySelector('.po-qty');
            
            if (poProdSelect) {
                poProdSelect.value = data.productId;
                poProdSelect.dispatchEvent(new Event('change'));
            }
            if (poQtyInput) {
                poQtyInput.value = data.quantity;
            }
            
            showToast('RFQ Details Filled', `Autofilled PO fields with cheapest supplier & suggested quantity of ${data.quantity} units!`, 'success');
            
            // Scroll to PO form
            document.getElementById('po-form').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // SLA ticket priority auto-escalator
    async function autoEscalateOverdueSLATickets() {
        const now = new Date();
        state.tickets.forEach(async (t) => {
            if (t.status !== 'Resolved' && t.status !== 'Closed' && t.priority !== 'High') {
                const due = new Date(t.sla_due_date);
                if (due < now) {
                    const payload = {
                        ticket_id: t.ticket_id,
                        interaction_type: 'internal_note',
                        status: t.status,
                        priority: 'High',
                        message_body: 'SLA BREACH ALERT: Ticket has passed target resolution time. Automatically escalating priority to High.'
                    };
                    try {
                        await fetch('/api/tickets/interaction', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    } catch (e) {}
                }
            }
        });
    }

    // Customer LTV calculator
    function renderCustomerLTV() {
        const tbody = document.querySelector('#customer-ltv-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (state.customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No customers registered.</td></tr>';
            return;
        }
        
        state.customers.forEach(c => {
            const orders = state.orders.filter(o => o.customer_id === c.customer_id);
            const totalSpend = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
            
            let tier = 'New Customer';
            let badgeClass = 'badge-secondary';
            if (totalSpend > 10000) {
                tier = 'Loyal VIP';
                badgeClass = 'badge-success';
            } else if (totalSpend > 3500) {
                tier = 'Active Buyer';
                badgeClass = 'badge-accent';
            }
            
            const pct = Math.min(100, (totalSpend / 15000) * 100);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>Customer #${c.customer_id}</strong></td>
                <td>${orders.length} orders</td>
                <td style="color:var(--accent-color);">
                    ₱${totalSpend.toFixed(2)}
                    <div style="background:rgba(255,255,255,0.08); height:4px; border-radius:2px; width:110px; overflow:hidden; margin-top:4px;">
                        <div style="background:var(--accent-color); width:${pct}%; height:100%; border-radius:2px;"></div>
                    </div>
                </td>
                <td><span class="badge ${badgeClass}">${tier}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Product Popularity report
    function renderProductPopularity() {
        const tbody = document.querySelector('#product-popularity-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        const sales = {};
        state.orderItems.forEach(item => {
            sales[item.product_id] = (sales[item.product_id] || 0) + parseInt(item.quantity || 0);
        });
        
        const productSales = [];
        state.products.forEach(p => {
            const qty = sales[p.product_id] || 0;
            let basePrice = p.product_id === 10 ? 49.99 : 99.99;
            let salesVal = qty * basePrice;
            productSales.push({
                sku: p.sku,
                name: p.name,
                qty: qty,
                val: salesVal
            });
        });
        
        productSales.sort((a,b) => b.qty - a.qty);
        
        productSales.forEach(item => {
            const pct = Math.min(100, (item.qty / 100) * 100);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${item.sku}</code></td>
                <td><strong>${item.name}</strong></td>
                <td>
                    <strong>${item.qty} units</strong>
                    <div style="background:rgba(0,0,0,0.05); height:4px; border-radius:2px; width:90px; overflow:hidden; margin-top:4px;">
                        <div style="background:var(--color-accent); width:${pct}%; height:100%; border-radius:2px;"></div>
                    </div>
                </td>
                <td style="color:var(--color-accent);">₱${item.val.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Dynamic Chart.js Horizontal Bar Graph
        const ctx = document.getElementById('sales-popularity-chart');
        if (ctx) {
            const labels = productSales.map(item => item.name);
            const dataVals = productSales.map(item => item.qty);
            
            if (popularityChartInstance) {
                popularityChartInstance.destroy();
            }
            
            popularityChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Units Sold',
                        data: dataVals,
                        backgroundColor: '#286629',
                        borderRadius: 4,
                        barThickness: 10
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        x: { display: true, grid: { display: false } },
                        y: { display: true, grid: { display: false }, ticks: { font: { size: 9, family: 'Outfit' } } }
                    }
                }
            });
        }
    }

    // Dynamic Donut Chart Status Gauge Renderer
    function renderTicketStatusGauge() {
        const openEl = document.getElementById('gauge-open-count');
        const progEl = document.getElementById('gauge-progress-count');
        const resEl = document.getElementById('gauge-resolved-count');
        const ctx = document.getElementById('ticket-status-chart');
        
        if (!openEl || !progEl || !resEl) return;
        
        const open = state.tickets.filter(t => t.status === 'Open').length;
        const prog = state.tickets.filter(t => t.status === 'In Progress').length;
        const resolved = state.tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
        
        openEl.textContent = open;
        progEl.textContent = prog;
        resEl.textContent = resolved;
        
        if (ctx) {
            if (ticketStatusChartInstance) {
                ticketStatusChartInstance.destroy();
            }
            
            ticketStatusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Open', 'In Progress', 'Resolved'],
                    datasets: [{
                        data: [open, prog, resolved],
                        backgroundColor: ['#286629', '#ef4444', '#3b82f6'],
                        borderWidth: 1,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    },
                    cutout: '70%'
                }
            });
        }
    }

    // Overridden populateEscalationAgentSelect with workloads
    function populateEscalationAgentSelect() {
        const select = document.getElementById('escalate-agent-select');
        if (!select) return;
        select.innerHTML = '<option value="" selected>No Escalation</option>';
        
        const workloads = {};
        state.agents.forEach(a => {
            const openTickets = state.tickets.filter(t => t.agent_id === a.agent_id && t.status !== 'Resolved' && t.status !== 'Closed').length;
            workloads[a.agent_id] = openTickets;
        });
        
        let lowestAgentId = null;
        let lowestCount = Infinity;
        state.agents.forEach(a => {
            if (a.agent_id !== state.activeAgentId) {
                const count = workloads[a.agent_id] || 0;
                if (count < lowestCount) {
                    lowestCount = count;
                    lowestAgentId = a.agent_id;
                }
            }
        });
        
        state.agents.forEach(a => {
            if (a.agent_id !== state.activeAgentId) {
                const opt = document.createElement('option');
                opt.value = a.agent_id;
                const workload = workloads[a.agent_id] || 0;
                const isSuggested = a.agent_id === lowestAgentId ? ' (Suggested: Lowest Workload)' : '';
                opt.textContent = `${a.name} (${a.department}) - ${workload} Open Tickets${isSuggested}`;
                select.appendChild(opt);
            }
        });
    }

    // Inter-Warehouse Transfer available stock real-time display
    function updateTransferAvailStock() {
        const pidSelect = document.getElementById('transfer-product');
        const whSelect = document.getElementById('transfer-from-wh');
        const zoneInput = document.getElementById('transfer-from-zone');
        const displayEl = document.getElementById('transfer-avail-stock');
        const qtyInput = document.getElementById('transfer-qty');
        
        if (!pidSelect || !whSelect || !zoneInput) return;
        
        const pid = parseInt(pidSelect.value);
        const whId = parseInt(whSelect.value);
        const zone = zoneInput.value.trim();
        
        if (!pid || !whId || !zone) {
            if (displayEl) displayEl.textContent = '0';
            if (qtyInput) qtyInput.removeAttribute('max');
            return;
        }
        
        const loc = state.inventory.find(item => 
            item.product_id === pid && 
            item.warehouse_id === whId && 
            item.zone.toLowerCase() === zone.toLowerCase()
        );
        
        const qty = loc ? loc.quantity : 0;
        if (displayEl) displayEl.textContent = qty;
        if (qtyInput) {
            qtyInput.max = qty;
            if (parseInt(qtyInput.value) > qty) {
                qtyInput.value = qty;
            }
        }
    }

    const tProd = document.getElementById('transfer-product');
    const tWh = document.getElementById('transfer-from-wh');
    const tZone = document.getElementById('transfer-from-zone');
    if (tProd) tProd.addEventListener('change', updateTransferAvailStock);
    if (tWh) tWh.addEventListener('change', updateTransferAvailStock);
    if (tZone) tZone.addEventListener('input', updateTransferAvailStock);

    // Simulate Barcode Scanner in Goods Receipt (3-Way Match)
    const grScanSimBtn = document.getElementById('gr-scan-sim-btn');
    if (grScanSimBtn) {
        grScanSimBtn.addEventListener('click', () => {
            const poId = parseInt(document.getElementById('gr-po-id').value);
            if (!poId) return;
            
            const poItems = state.poItems.filter(item => item.po_id === poId);
            let expectedQty = 0;
            let expectedPrice = 0.00;
            
            poItems.forEach(item => {
                expectedQty += item.quantity;
                expectedPrice += item.quantity * (item.product_id === 10 ? 49.99 : 99.99);
            });
            
            document.getElementById('gr-delivery-qty').value = expectedQty;
            document.getElementById('gr-invoice-price').value = expectedPrice.toFixed(2);
            
            showToast('Barcode Scanned', `Scanned packing slip and invoice for PO #${poId}! Verified Qty: ${expectedQty}, Price: ₱${expectedPrice.toFixed(2)}.`, 'success');
        });
    }

    // Bind visual workflow steps buttons
    const stepButtons = document.querySelectorAll('.workflow-step-btn');
    stepButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-target');
            const navLink = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
            if (navLink) {
                navLink.click();
            }
        });
    });

    // Theme toggle, Keyboard search shortcuts, and Profile dropdown init
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (localStorage.getItem('dark-theme') === 'true') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('dark-theme', isDark);
            themeToggleBtn.innerHTML = isDark 
                ? '<i class="fa-solid fa-sun"></i>' 
                : '<i class="fa-solid fa-moon"></i>';
            showToast('Theme Updated', `Switched to ${isDark ? 'Dark' : 'Light'} theme mode.`, 'success');
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('global-search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    const userBadge = document.getElementById('header-user-badge');
    const roleDropdown = document.getElementById('header-role-dropdown');
    if (userBadge && roleDropdown) {
        userBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            roleDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
            roleDropdown.classList.add('hidden');
        });
    }

    function populateHeaderRoleDropdown() {
        if (!roleDropdown) return;
        roleDropdown.innerHTML = '';
        state.agents.forEach(agent => {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = agent.name;
            a.addEventListener('click', async (e) => {
                e.preventDefault();
                state.activeAgentId = agent.agent_id;
                updateHeaderUserBadge();
                showToast('User Switch', `Switched active session user context to ${agent.name}.`, 'success');
                switchTab(activeTab);
            });
            roleDropdown.appendChild(a);
        });
    }

    // Initial setup
    fetchSystemState().then(() => {
        updateTransferAvailStock();
    });
});
