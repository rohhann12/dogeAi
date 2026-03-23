#!/usr/bin/env node
/**
 * Graph Builder
 * Queries SQLite and builds nodes + edges JSON for the frontend graph visualization.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../data/o2c.db');
const OUTPUT_PATH = path.resolve(__dirname, '../data/graph.json');

const db = new Database(DB_PATH, { readonly: true });

const nodes = [];
const edges = [];

// Color palette for node types
const COLORS = {
  SalesOrder: '#3B82F6',        // blue
  SalesOrderItem: '#93C5FD',    // light blue
  Delivery: '#10B981',          // green
  DeliveryItem: '#6EE7B7',      // light green
  BillingDocument: '#F59E0B',   // orange
  BillingDocumentItem: '#FCD34D', // light orange
  JournalEntry: '#8B5CF6',      // purple
  Payment: '#EF4444',           // red
  Customer: '#F97316',          // amber
  Product: '#14B8A6',           // teal
  Plant: '#6B7280',             // gray
};

function addNode(id, type, label, metadata = {}) {
  nodes.push({ id, type, label, color: COLORS[type], metadata });
}

function addEdge(source, target, relationship, metadata = {}) {
  edges.push({ source, target, relationship, metadata });
}

// ====== NODES ======

console.log('Building nodes...');

// 1. Sales Orders
const salesOrders = db.prepare('SELECT * FROM sales_order_headers').all();
for (const so of salesOrders) {
  addNode(`SO:${so.sales_order}`, 'SalesOrder', `SO ${so.sales_order}`, {
    entity: 'Sales Order',
    salesOrder: so.sales_order,
    type: so.sales_order_type,
    salesOrg: so.sales_organization,
    totalNetAmount: so.total_net_amount,
    currency: so.transaction_currency,
    creationDate: so.creation_date,
    deliveryStatus: so.overall_delivery_status,
    soldToParty: so.sold_to_party,
    requestedDeliveryDate: so.requested_delivery_date,
  });
}
console.log(`  SalesOrders: ${salesOrders.length}`);

// 2. Sales Order Items
const soItems = db.prepare('SELECT soi.*, pd.product_description FROM sales_order_items soi LEFT JOIN product_descriptions pd ON soi.material = pd.product AND pd.language = \'EN\'').all();
for (const item of soItems) {
  addNode(`SOI:${item.sales_order}:${item.sales_order_item}`, 'SalesOrderItem',
    `Item ${item.sales_order_item}`, {
      entity: 'Sales Order Item',
      salesOrder: item.sales_order,
      item: item.sales_order_item,
      material: item.material,
      materialDesc: item.product_description || '',
      quantity: item.requested_quantity,
      unit: item.requested_quantity_unit,
      netAmount: item.net_amount,
      currency: item.transaction_currency,
      plant: item.production_plant,
    });
}
console.log(`  SalesOrderItems: ${soItems.length}`);

// 3. Delivery Headers
const deliveries = db.prepare('SELECT * FROM outbound_delivery_headers').all();
for (const del of deliveries) {
  addNode(`DEL:${del.delivery_document}`, 'Delivery', `Del ${del.delivery_document}`, {
    entity: 'Delivery',
    deliveryDocument: del.delivery_document,
    creationDate: del.creation_date,
    goodsMovementDate: del.actual_goods_movement_date,
    goodsMovementStatus: del.overall_goods_movement_status,
    pickingStatus: del.overall_picking_status,
    shippingPoint: del.shipping_point,
  });
}
console.log(`  Deliveries: ${deliveries.length}`);

// 4. Delivery Items
const delItems = db.prepare('SELECT * FROM outbound_delivery_items').all();
for (const item of delItems) {
  addNode(`DI:${item.delivery_document}:${item.delivery_document_item}`, 'DeliveryItem',
    `DItem ${item.delivery_document_item}`, {
      entity: 'Delivery Item',
      deliveryDocument: item.delivery_document,
      item: item.delivery_document_item,
      quantity: item.actual_delivery_quantity,
      unit: item.delivery_quantity_unit,
      plant: item.plant,
      storageLocation: item.storage_location,
      referenceSalesOrder: item.reference_sd_document,
    });
}
console.log(`  DeliveryItems: ${delItems.length}`);

// 5. Billing Document Headers
const billHeaders = db.prepare('SELECT * FROM billing_document_headers').all();
for (const bh of billHeaders) {
  addNode(`BILL:${bh.billing_document}`, 'BillingDocument', `Bill ${bh.billing_document}`, {
    entity: 'Billing Document',
    billingDocument: bh.billing_document,
    type: bh.billing_document_type,
    creationDate: bh.creation_date,
    billingDate: bh.billing_document_date,
    isCancelled: !!bh.billing_document_is_cancelled,
    totalNetAmount: bh.total_net_amount,
    currency: bh.transaction_currency,
    accountingDocument: bh.accounting_document,
    soldToParty: bh.sold_to_party,
    companyCode: bh.company_code,
    fiscalYear: bh.fiscal_year,
  });
}
console.log(`  BillingDocuments: ${billHeaders.length}`);

// 6. Billing Document Items
const billItems = db.prepare('SELECT * FROM billing_document_items').all();
for (const bi of billItems) {
  addNode(`BI:${bi.billing_document}:${bi.billing_document_item}`, 'BillingDocumentItem',
    `BItem ${bi.billing_document_item}`, {
      entity: 'Billing Document Item',
      billingDocument: bi.billing_document,
      item: bi.billing_document_item,
      material: bi.material,
      quantity: bi.billing_quantity,
      unit: bi.billing_quantity_unit,
      netAmount: bi.net_amount,
      currency: bi.transaction_currency,
      referenceDelivery: bi.reference_sd_document,
    });
}
console.log(`  BillingDocumentItems: ${billItems.length}`);

// 7. Journal Entries (deduplicated by accounting_document)
const journalEntries = db.prepare(`
  SELECT accounting_document, company_code, fiscal_year, reference_document,
    gl_account, profit_center, transaction_currency,
    SUM(amount_in_transaction_currency) as total_amount,
    posting_date, document_date, accounting_document_type,
    customer, clearing_accounting_document, clearing_date,
    COUNT(*) as line_items
  FROM journal_entry_items
  GROUP BY company_code, fiscal_year, accounting_document
`).all();
for (const je of journalEntries) {
  addNode(`JE:${je.accounting_document}`, 'JournalEntry', `JE ${je.accounting_document}`, {
    entity: 'Journal Entry',
    accountingDocument: je.accounting_document,
    companyCode: je.company_code,
    fiscalYear: je.fiscal_year,
    referenceDocument: je.reference_document,
    glAccount: je.gl_account,
    totalAmount: je.total_amount,
    currency: je.transaction_currency,
    postingDate: je.posting_date,
    documentType: je.accounting_document_type,
    customer: je.customer,
    clearingDocument: je.clearing_accounting_document,
    clearingDate: je.clearing_date,
    lineItems: je.line_items,
  });
}
console.log(`  JournalEntries: ${journalEntries.length}`);

// 8. Payments (deduplicated by accounting_document)
const paymentRows = db.prepare(`
  SELECT accounting_document, company_code, fiscal_year,
    clearing_accounting_document, clearing_date,
    SUM(amount_in_transaction_currency) as total_amount,
    transaction_currency, customer, posting_date, document_date,
    gl_account, profit_center,
    COUNT(*) as line_items
  FROM payments
  GROUP BY company_code, fiscal_year, accounting_document
`).all();
for (const p of paymentRows) {
  addNode(`PAY:${p.accounting_document}`, 'Payment', `Pay ${p.accounting_document}`, {
    entity: 'Payment',
    accountingDocument: p.accounting_document,
    companyCode: p.company_code,
    fiscalYear: p.fiscal_year,
    clearingDocument: p.clearing_accounting_document,
    clearingDate: p.clearing_date,
    totalAmount: p.total_amount,
    currency: p.transaction_currency,
    customer: p.customer,
    postingDate: p.posting_date,
    lineItems: p.line_items,
  });
}
console.log(`  Payments: ${paymentRows.length}`);

// 9. Customers (Business Partners)
const customers = db.prepare(`
  SELECT bp.*, bpa.city_name, bpa.country, bpa.region, bpa.street_name, bpa.postal_code
  FROM business_partners bp
  LEFT JOIN business_partner_addresses bpa ON bp.business_partner = bpa.business_partner
`).all();
for (const c of customers) {
  addNode(`CUST:${c.customer}`, 'Customer', c.business_partner_name || `Customer ${c.customer}`, {
    entity: 'Customer',
    customer: c.customer,
    businessPartner: c.business_partner,
    name: c.business_partner_name,
    fullName: c.business_partner_full_name,
    category: c.business_partner_category,
    city: c.city_name,
    country: c.country,
    region: c.region,
    street: c.street_name,
    postalCode: c.postal_code,
  });
}
console.log(`  Customers: ${customers.length}`);

// 10. Products
const products = db.prepare(`
  SELECT p.*, pd.product_description
  FROM products p
  LEFT JOIN product_descriptions pd ON p.product = pd.product AND pd.language = 'EN'
`).all();
for (const p of products) {
  addNode(`PROD:${p.product}`, 'Product', p.product_description || p.product, {
    entity: 'Product',
    product: p.product,
    description: p.product_description,
    type: p.product_type,
    oldId: p.product_old_id,
    grossWeight: p.gross_weight,
    netWeight: p.net_weight,
    weightUnit: p.weight_unit,
    productGroup: p.product_group,
    baseUnit: p.base_unit,
    division: p.division,
  });
}
console.log(`  Products: ${products.length}`);

// 11. Plants (only those referenced by delivery items)
const plantRows = db.prepare(`
  SELECT DISTINCT p.* FROM plants p
  WHERE p.plant IN (SELECT DISTINCT plant FROM outbound_delivery_items)
`).all();
for (const p of plantRows) {
  addNode(`PLANT:${p.plant}`, 'Plant', p.plant_name || `Plant ${p.plant}`, {
    entity: 'Plant',
    plant: p.plant,
    name: p.plant_name,
    salesOrganization: p.sales_organization,
    distributionChannel: p.distribution_channel,
  });
}
console.log(`  Plants: ${plantRows.length}`);

// ====== EDGES ======

console.log('\nBuilding edges...');

// Build node ID sets for validation
const nodeIds = new Set(nodes.map(n => n.id));

function safeAddEdge(source, target, rel, meta = {}) {
  if (nodeIds.has(source) && nodeIds.has(target)) {
    addEdge(source, target, rel, meta);
    return true;
  }
  return false;
}

// 1. SalesOrder → SalesOrderItem (has_item)
let count = 0;
for (const item of soItems) {
  if (safeAddEdge(`SO:${item.sales_order}`, `SOI:${item.sales_order}:${item.sales_order_item}`, 'has_item')) count++;
}
console.log(`  SalesOrder→SalesOrderItem: ${count}`);

// 2. SalesOrderItem → Product (for_material)
count = 0;
for (const item of soItems) {
  if (item.material && safeAddEdge(`SOI:${item.sales_order}:${item.sales_order_item}`, `PROD:${item.material}`, 'for_material')) count++;
}
console.log(`  SalesOrderItem→Product: ${count}`);

// 3. SalesOrder → Customer (sold_to)
count = 0;
for (const so of salesOrders) {
  if (so.sold_to_party && safeAddEdge(`SO:${so.sales_order}`, `CUST:${so.sold_to_party}`, 'sold_to')) count++;
}
console.log(`  SalesOrder→Customer: ${count}`);

// 4. Delivery → DeliveryItem (has_item)
count = 0;
for (const item of delItems) {
  if (safeAddEdge(`DEL:${item.delivery_document}`, `DI:${item.delivery_document}:${item.delivery_document_item}`, 'has_item')) count++;
}
console.log(`  Delivery→DeliveryItem: ${count}`);

// 5. DeliveryItem → SalesOrderItem (fulfills) — need to match item format (000010 → 10)
count = 0;
for (const item of delItems) {
  if (item.reference_sd_document && item.reference_sd_document_item) {
    const soItemNum = String(parseInt(item.reference_sd_document_item, 10));
    const targetId = `SOI:${item.reference_sd_document}:${soItemNum}`;
    if (safeAddEdge(`DI:${item.delivery_document}:${item.delivery_document_item}`, targetId, 'fulfills', {
      salesOrder: item.reference_sd_document,
      salesOrderItem: soItemNum,
    })) count++;
  }
}
console.log(`  DeliveryItem→SalesOrderItem: ${count}`);

// 6. DeliveryItem → Plant (ships_from)
count = 0;
for (const item of delItems) {
  if (item.plant && safeAddEdge(`DI:${item.delivery_document}:${item.delivery_document_item}`, `PLANT:${item.plant}`, 'ships_from')) count++;
}
console.log(`  DeliveryItem→Plant: ${count}`);

// 7. BillingDocument → BillingDocumentItem (has_item)
count = 0;
for (const bi of billItems) {
  if (safeAddEdge(`BILL:${bi.billing_document}`, `BI:${bi.billing_document}:${bi.billing_document_item}`, 'has_item')) count++;
}
console.log(`  BillingDocument→BillingDocumentItem: ${count}`);

// 8. BillingDocumentItem → DeliveryItem (billed_for)
count = 0;
for (const bi of billItems) {
  if (bi.reference_sd_document && bi.reference_sd_document_item) {
    // billing items reference delivery documents, item format needs padding
    const delItemPadded = String(bi.reference_sd_document_item).padStart(6, '0');
    const targetId = `DI:${bi.reference_sd_document}:${delItemPadded}`;
    if (safeAddEdge(`BI:${bi.billing_document}:${bi.billing_document_item}`, targetId, 'billed_for', {
      deliveryDocument: bi.reference_sd_document,
      deliveryItem: delItemPadded,
    })) count++;
  }
}
console.log(`  BillingDocumentItem→DeliveryItem: ${count}`);

// 9. BillingDocument → JournalEntry (creates_journal)
count = 0;
for (const bh of billHeaders) {
  if (bh.accounting_document && safeAddEdge(`BILL:${bh.billing_document}`, `JE:${bh.accounting_document}`, 'creates_journal')) count++;
}
console.log(`  BillingDocument→JournalEntry: ${count}`);

// 10. BillingDocument → Customer (billed_to)
count = 0;
for (const bh of billHeaders) {
  if (bh.sold_to_party && safeAddEdge(`BILL:${bh.billing_document}`, `CUST:${bh.sold_to_party}`, 'billed_to')) count++;
}
console.log(`  BillingDocument→Customer: ${count}`);

// 11. JournalEntry → Payment (cleared_by) — via clearing_accounting_document
count = 0;
const payByAcctDoc = new Map();
for (const p of paymentRows) {
  payByAcctDoc.set(p.accounting_document, p);
}
for (const je of journalEntries) {
  if (je.clearing_accounting_document) {
    // The clearing doc might itself be a payment, or the payment shares the same acct doc
    const payTarget = `PAY:${je.accounting_document}`;
    if (nodeIds.has(payTarget) && je.accounting_document !== je.clearing_accounting_document) {
      // Journal entry's own acct doc has a payment record
      safeAddEdge(`JE:${je.accounting_document}`, payTarget, 'cleared_by');
      count++;
    } else {
      // Try matching on clearing document
      const clearingPayId = `PAY:${je.clearing_accounting_document}`;
      // Don't self-link
      if (nodeIds.has(clearingPayId) && `JE:${je.accounting_document}` !== clearingPayId) {
        safeAddEdge(`JE:${je.accounting_document}`, clearingPayId, 'cleared_by');
        count++;
      }
    }
  }
}
console.log(`  JournalEntry→Payment: ${count}`);

// 12. Payment → Customer (paid_by)
count = 0;
for (const p of paymentRows) {
  if (p.customer && safeAddEdge(`PAY:${p.accounting_document}`, `CUST:${p.customer}`, 'paid_by')) count++;
}
console.log(`  Payment→Customer: ${count}`);

// ====== OUTPUT ======

const graph = { nodes, edges };
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graph, null, 2));

console.log(`\n=== Graph Summary ===`);
console.log(`Nodes: ${nodes.length}`);
console.log(`Edges: ${edges.length}`);
console.log(`Output: ${OUTPUT_PATH}`);

// Node type breakdown
const typeCounts = {};
for (const n of nodes) {
  typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
}
console.log('\nNode breakdown:');
for (const [type, c] of Object.entries(typeCounts)) {
  console.log(`  ${type}: ${c}`);
}

// Edge type breakdown
const edgeCounts = {};
for (const e of edges) {
  edgeCounts[e.relationship] = (edgeCounts[e.relationship] || 0) + 1;
}
console.log('\nEdge breakdown:');
for (const [rel, c] of Object.entries(edgeCounts)) {
  console.log(`  ${rel}: ${c}`);
}

db.close();
