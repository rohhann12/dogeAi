#!/usr/bin/env node
/**
 * Data Ingestion Script
 * Reads all JSONL files from the SAP O2C dataset and loads them into SQLite.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(__dirname, '../../data/sap-o2c-data');
const DB_PATH = path.resolve(__dirname, '../data/o2c.db');

// Ensure output directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Delete existing DB if present
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');

// Table schemas — column names mapped from camelCase JSONL keys to snake_case SQL columns
const TABLE_SCHEMAS = {
  sales_order_headers: {
    columns: {
      sales_order: 'TEXT PRIMARY KEY',
      sales_order_type: 'TEXT',
      sales_organization: 'TEXT',
      distribution_channel: 'TEXT',
      organization_division: 'TEXT',
      sales_group: 'TEXT',
      sales_office: 'TEXT',
      sold_to_party: 'TEXT',
      creation_date: 'TEXT',
      created_by_user: 'TEXT',
      last_change_date_time: 'TEXT',
      total_net_amount: 'REAL',
      overall_delivery_status: 'TEXT',
      overall_ord_reltd_billg_status: 'TEXT',
      overall_sd_doc_reference_status: 'TEXT',
      transaction_currency: 'TEXT',
      pricing_date: 'TEXT',
      requested_delivery_date: 'TEXT',
      header_billing_block_reason: 'TEXT',
      delivery_block_reason: 'TEXT',
      incoterms_classification: 'TEXT',
      incoterms_location1: 'TEXT',
      customer_payment_terms: 'TEXT',
      total_credit_check_status: 'TEXT',
    },
    keyMap: {
      salesOrder: 'sales_order', salesOrderType: 'sales_order_type',
      salesOrganization: 'sales_organization', distributionChannel: 'distribution_channel',
      organizationDivision: 'organization_division', salesGroup: 'sales_group',
      salesOffice: 'sales_office', soldToParty: 'sold_to_party',
      creationDate: 'creation_date', createdByUser: 'created_by_user',
      lastChangeDateTime: 'last_change_date_time', totalNetAmount: 'total_net_amount',
      overallDeliveryStatus: 'overall_delivery_status',
      overallOrdReltdBillgStatus: 'overall_ord_reltd_billg_status',
      overallSdDocReferenceStatus: 'overall_sd_doc_reference_status',
      transactionCurrency: 'transaction_currency', pricingDate: 'pricing_date',
      requestedDeliveryDate: 'requested_delivery_date',
      headerBillingBlockReason: 'header_billing_block_reason',
      deliveryBlockReason: 'delivery_block_reason',
      incotermsClassification: 'incoterms_classification',
      incotermsLocation1: 'incoterms_location1',
      customerPaymentTerms: 'customer_payment_terms',
      totalCreditCheckStatus: 'total_credit_check_status',
    },
  },
  sales_order_items: {
    columns: {
      sales_order: 'TEXT',
      sales_order_item: 'TEXT',
      sales_order_item_category: 'TEXT',
      material: 'TEXT',
      requested_quantity: 'REAL',
      requested_quantity_unit: 'TEXT',
      transaction_currency: 'TEXT',
      net_amount: 'REAL',
      material_group: 'TEXT',
      production_plant: 'TEXT',
      storage_location: 'TEXT',
      sales_document_rjcn_reason: 'TEXT',
      item_billing_block_reason: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (sales_order, sales_order_item)',
    keyMap: {
      salesOrder: 'sales_order', salesOrderItem: 'sales_order_item',
      salesOrderItemCategory: 'sales_order_item_category', material: 'material',
      requestedQuantity: 'requested_quantity', requestedQuantityUnit: 'requested_quantity_unit',
      transactionCurrency: 'transaction_currency', netAmount: 'net_amount',
      materialGroup: 'material_group', productionPlant: 'production_plant',
      storageLocation: 'storage_location', salesDocumentRjcnReason: 'sales_document_rjcn_reason',
      itemBillingBlockReason: 'item_billing_block_reason',
    },
  },
  sales_order_schedule_lines: {
    columns: {
      sales_order: 'TEXT',
      sales_order_item: 'TEXT',
      schedule_line: 'TEXT',
      confirmed_delivery_date: 'TEXT',
      order_quantity_unit: 'TEXT',
      confd_order_qty_by_matl_avail_check: 'REAL',
    },
    primaryKey: 'PRIMARY KEY (sales_order, sales_order_item, schedule_line)',
    keyMap: {
      salesOrder: 'sales_order', salesOrderItem: 'sales_order_item',
      scheduleLine: 'schedule_line', confirmedDeliveryDate: 'confirmed_delivery_date',
      orderQuantityUnit: 'order_quantity_unit',
      confdOrderQtyByMatlAvailCheck: 'confd_order_qty_by_matl_avail_check',
    },
  },
  outbound_delivery_headers: {
    columns: {
      delivery_document: 'TEXT PRIMARY KEY',
      actual_goods_movement_date: 'TEXT',
      creation_date: 'TEXT',
      delivery_block_reason: 'TEXT',
      hdr_general_incompletion_status: 'TEXT',
      header_billing_block_reason: 'TEXT',
      last_change_date: 'TEXT',
      overall_goods_movement_status: 'TEXT',
      overall_picking_status: 'TEXT',
      overall_proof_of_delivery_status: 'TEXT',
      shipping_point: 'TEXT',
    },
    keyMap: {
      deliveryDocument: 'delivery_document', actualGoodsMovementDate: 'actual_goods_movement_date',
      creationDate: 'creation_date', deliveryBlockReason: 'delivery_block_reason',
      hdrGeneralIncompletionStatus: 'hdr_general_incompletion_status',
      headerBillingBlockReason: 'header_billing_block_reason',
      lastChangeDate: 'last_change_date',
      overallGoodsMovementStatus: 'overall_goods_movement_status',
      overallPickingStatus: 'overall_picking_status',
      overallProofOfDeliveryStatus: 'overall_proof_of_delivery_status',
      shippingPoint: 'shipping_point',
    },
  },
  outbound_delivery_items: {
    columns: {
      delivery_document: 'TEXT',
      delivery_document_item: 'TEXT',
      actual_delivery_quantity: 'REAL',
      batch: 'TEXT',
      delivery_quantity_unit: 'TEXT',
      item_billing_block_reason: 'TEXT',
      last_change_date: 'TEXT',
      plant: 'TEXT',
      reference_sd_document: 'TEXT',
      reference_sd_document_item: 'TEXT',
      storage_location: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (delivery_document, delivery_document_item)',
    keyMap: {
      deliveryDocument: 'delivery_document', deliveryDocumentItem: 'delivery_document_item',
      actualDeliveryQuantity: 'actual_delivery_quantity', batch: 'batch',
      deliveryQuantityUnit: 'delivery_quantity_unit',
      itemBillingBlockReason: 'item_billing_block_reason',
      lastChangeDate: 'last_change_date', plant: 'plant',
      referenceSdDocument: 'reference_sd_document',
      referenceSdDocumentItem: 'reference_sd_document_item',
      storageLocation: 'storage_location',
    },
  },
  billing_document_headers: {
    columns: {
      billing_document: 'TEXT PRIMARY KEY',
      billing_document_type: 'TEXT',
      creation_date: 'TEXT',
      last_change_date_time: 'TEXT',
      billing_document_date: 'TEXT',
      billing_document_is_cancelled: 'INTEGER',
      cancelled_billing_document: 'TEXT',
      total_net_amount: 'REAL',
      transaction_currency: 'TEXT',
      company_code: 'TEXT',
      fiscal_year: 'TEXT',
      accounting_document: 'TEXT',
      sold_to_party: 'TEXT',
    },
    keyMap: {
      billingDocument: 'billing_document', billingDocumentType: 'billing_document_type',
      creationDate: 'creation_date', lastChangeDateTime: 'last_change_date_time',
      billingDocumentDate: 'billing_document_date',
      billingDocumentIsCancelled: 'billing_document_is_cancelled',
      cancelledBillingDocument: 'cancelled_billing_document',
      totalNetAmount: 'total_net_amount', transactionCurrency: 'transaction_currency',
      companyCode: 'company_code', fiscalYear: 'fiscal_year',
      accountingDocument: 'accounting_document', soldToParty: 'sold_to_party',
    },
  },
  billing_document_items: {
    columns: {
      billing_document: 'TEXT',
      billing_document_item: 'TEXT',
      material: 'TEXT',
      billing_quantity: 'REAL',
      billing_quantity_unit: 'TEXT',
      net_amount: 'REAL',
      transaction_currency: 'TEXT',
      reference_sd_document: 'TEXT',
      reference_sd_document_item: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (billing_document, billing_document_item)',
    keyMap: {
      billingDocument: 'billing_document', billingDocumentItem: 'billing_document_item',
      material: 'material', billingQuantity: 'billing_quantity',
      billingQuantityUnit: 'billing_quantity_unit', netAmount: 'net_amount',
      transactionCurrency: 'transaction_currency',
      referenceSdDocument: 'reference_sd_document',
      referenceSdDocumentItem: 'reference_sd_document_item',
    },
  },
  billing_document_cancellations: {
    columns: {
      billing_document: 'TEXT PRIMARY KEY',
      billing_document_type: 'TEXT',
      creation_date: 'TEXT',
      last_change_date_time: 'TEXT',
      billing_document_date: 'TEXT',
      billing_document_is_cancelled: 'INTEGER',
      cancelled_billing_document: 'TEXT',
      total_net_amount: 'REAL',
      transaction_currency: 'TEXT',
      company_code: 'TEXT',
      fiscal_year: 'TEXT',
      accounting_document: 'TEXT',
      sold_to_party: 'TEXT',
    },
    keyMap: {
      billingDocument: 'billing_document', billingDocumentType: 'billing_document_type',
      creationDate: 'creation_date', lastChangeDateTime: 'last_change_date_time',
      billingDocumentDate: 'billing_document_date',
      billingDocumentIsCancelled: 'billing_document_is_cancelled',
      cancelledBillingDocument: 'cancelled_billing_document',
      totalNetAmount: 'total_net_amount', transactionCurrency: 'transaction_currency',
      companyCode: 'company_code', fiscalYear: 'fiscal_year',
      accountingDocument: 'accounting_document', soldToParty: 'sold_to_party',
    },
  },
  journal_entry_items: {
    columns: {
      company_code: 'TEXT',
      fiscal_year: 'TEXT',
      accounting_document: 'TEXT',
      accounting_document_item: 'TEXT',
      gl_account: 'TEXT',
      reference_document: 'TEXT',
      cost_center: 'TEXT',
      profit_center: 'TEXT',
      transaction_currency: 'TEXT',
      amount_in_transaction_currency: 'REAL',
      company_code_currency: 'TEXT',
      amount_in_company_code_currency: 'REAL',
      posting_date: 'TEXT',
      document_date: 'TEXT',
      accounting_document_type: 'TEXT',
      assignment_reference: 'TEXT',
      last_change_date_time: 'TEXT',
      customer: 'TEXT',
      financial_account_type: 'TEXT',
      clearing_date: 'TEXT',
      clearing_accounting_document: 'TEXT',
      clearing_doc_fiscal_year: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (company_code, fiscal_year, accounting_document, accounting_document_item)',
    keyMap: {
      companyCode: 'company_code', fiscalYear: 'fiscal_year',
      accountingDocument: 'accounting_document', accountingDocumentItem: 'accounting_document_item',
      glAccount: 'gl_account', referenceDocument: 'reference_document',
      costCenter: 'cost_center', profitCenter: 'profit_center',
      transactionCurrency: 'transaction_currency',
      amountInTransactionCurrency: 'amount_in_transaction_currency',
      companyCodeCurrency: 'company_code_currency',
      amountInCompanyCodeCurrency: 'amount_in_company_code_currency',
      postingDate: 'posting_date', documentDate: 'document_date',
      accountingDocumentType: 'accounting_document_type',
      assignmentReference: 'assignment_reference',
      lastChangeDateTime: 'last_change_date_time', customer: 'customer',
      financialAccountType: 'financial_account_type', clearingDate: 'clearing_date',
      clearingAccountingDocument: 'clearing_accounting_document',
      clearingDocFiscalYear: 'clearing_doc_fiscal_year',
    },
  },
  payments: {
    columns: {
      company_code: 'TEXT',
      fiscal_year: 'TEXT',
      accounting_document: 'TEXT',
      accounting_document_item: 'TEXT',
      clearing_date: 'TEXT',
      clearing_accounting_document: 'TEXT',
      clearing_doc_fiscal_year: 'TEXT',
      amount_in_transaction_currency: 'REAL',
      transaction_currency: 'TEXT',
      amount_in_company_code_currency: 'REAL',
      company_code_currency: 'TEXT',
      customer: 'TEXT',
      invoice_reference: 'TEXT',
      invoice_reference_fiscal_year: 'TEXT',
      sales_document: 'TEXT',
      sales_document_item: 'TEXT',
      posting_date: 'TEXT',
      document_date: 'TEXT',
      assignment_reference: 'TEXT',
      gl_account: 'TEXT',
      financial_account_type: 'TEXT',
      profit_center: 'TEXT',
      cost_center: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (company_code, fiscal_year, accounting_document, accounting_document_item)',
    keyMap: {
      companyCode: 'company_code', fiscalYear: 'fiscal_year',
      accountingDocument: 'accounting_document', accountingDocumentItem: 'accounting_document_item',
      clearingDate: 'clearing_date', clearingAccountingDocument: 'clearing_accounting_document',
      clearingDocFiscalYear: 'clearing_doc_fiscal_year',
      amountInTransactionCurrency: 'amount_in_transaction_currency',
      transactionCurrency: 'transaction_currency',
      amountInCompanyCodeCurrency: 'amount_in_company_code_currency',
      companyCodeCurrency: 'company_code_currency', customer: 'customer',
      invoiceReference: 'invoice_reference',
      invoiceReferenceFiscalYear: 'invoice_reference_fiscal_year',
      salesDocument: 'sales_document', salesDocumentItem: 'sales_document_item',
      postingDate: 'posting_date', documentDate: 'document_date',
      assignmentReference: 'assignment_reference', glAccount: 'gl_account',
      financialAccountType: 'financial_account_type', profitCenter: 'profit_center',
      costCenter: 'cost_center',
    },
  },
  business_partners: {
    columns: {
      business_partner: 'TEXT PRIMARY KEY',
      customer: 'TEXT',
      business_partner_category: 'TEXT',
      business_partner_full_name: 'TEXT',
      business_partner_grouping: 'TEXT',
      business_partner_name: 'TEXT',
      correspondence_language: 'TEXT',
      created_by_user: 'TEXT',
      creation_date: 'TEXT',
      first_name: 'TEXT',
      form_of_address: 'TEXT',
      industry: 'TEXT',
      last_change_date: 'TEXT',
      last_name: 'TEXT',
      organization_bp_name1: 'TEXT',
      organization_bp_name2: 'TEXT',
      business_partner_is_blocked: 'INTEGER',
      is_marked_for_archiving: 'INTEGER',
    },
    keyMap: {
      businessPartner: 'business_partner', customer: 'customer',
      businessPartnerCategory: 'business_partner_category',
      businessPartnerFullName: 'business_partner_full_name',
      businessPartnerGrouping: 'business_partner_grouping',
      businessPartnerName: 'business_partner_name',
      correspondenceLanguage: 'correspondence_language',
      createdByUser: 'created_by_user', creationDate: 'creation_date',
      firstName: 'first_name', formOfAddress: 'form_of_address',
      industry: 'industry', lastChangeDate: 'last_change_date',
      lastName: 'last_name', organizationBpName1: 'organization_bp_name1',
      organizationBpName2: 'organization_bp_name2',
      businessPartnerIsBlocked: 'business_partner_is_blocked',
      isMarkedForArchiving: 'is_marked_for_archiving',
    },
  },
  business_partner_addresses: {
    columns: {
      business_partner: 'TEXT',
      address_id: 'TEXT',
      validity_start_date: 'TEXT',
      validity_end_date: 'TEXT',
      address_time_zone: 'TEXT',
      city_name: 'TEXT',
      country: 'TEXT',
      postal_code: 'TEXT',
      region: 'TEXT',
      street_name: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (business_partner, address_id)',
    keyMap: {
      businessPartner: 'business_partner', addressId: 'address_id',
      validityStartDate: 'validity_start_date', validityEndDate: 'validity_end_date',
      addressTimeZone: 'address_time_zone', cityName: 'city_name',
      country: 'country', postalCode: 'postal_code', region: 'region',
      streetName: 'street_name',
    },
  },
  customer_company_assignments: {
    columns: {
      customer: 'TEXT',
      company_code: 'TEXT',
      reconciliation_account: 'TEXT',
      payment_terms: 'TEXT',
      payment_methods_list: 'TEXT',
      deletion_indicator: 'INTEGER',
      customer_account_group: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (customer, company_code)',
    keyMap: {
      customer: 'customer', companyCode: 'company_code',
      reconciliationAccount: 'reconciliation_account', paymentTerms: 'payment_terms',
      paymentMethodsList: 'payment_methods_list', deletionIndicator: 'deletion_indicator',
      customerAccountGroup: 'customer_account_group',
    },
  },
  customer_sales_area_assignments: {
    columns: {
      customer: 'TEXT',
      sales_organization: 'TEXT',
      distribution_channel: 'TEXT',
      division: 'TEXT',
      currency: 'TEXT',
      customer_payment_terms: 'TEXT',
      delivery_priority: 'TEXT',
      incoterms_classification: 'TEXT',
      incoterms_location1: 'TEXT',
      shipping_condition: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (customer, sales_organization, distribution_channel, division)',
    keyMap: {
      customer: 'customer', salesOrganization: 'sales_organization',
      distributionChannel: 'distribution_channel', division: 'division',
      currency: 'currency', customerPaymentTerms: 'customer_payment_terms',
      deliveryPriority: 'delivery_priority',
      incotermsClassification: 'incoterms_classification',
      incotermsLocation1: 'incoterms_location1', shippingCondition: 'shipping_condition',
    },
  },
  products: {
    columns: {
      product: 'TEXT PRIMARY KEY',
      product_type: 'TEXT',
      creation_date: 'TEXT',
      created_by_user: 'TEXT',
      last_change_date: 'TEXT',
      is_marked_for_deletion: 'INTEGER',
      product_old_id: 'TEXT',
      gross_weight: 'REAL',
      weight_unit: 'TEXT',
      net_weight: 'REAL',
      product_group: 'TEXT',
      base_unit: 'TEXT',
      division: 'TEXT',
      industry_sector: 'TEXT',
    },
    keyMap: {
      product: 'product', productType: 'product_type',
      creationDate: 'creation_date', createdByUser: 'created_by_user',
      lastChangeDate: 'last_change_date', isMarkedForDeletion: 'is_marked_for_deletion',
      productOldId: 'product_old_id', grossWeight: 'gross_weight',
      weightUnit: 'weight_unit', netWeight: 'net_weight',
      productGroup: 'product_group', baseUnit: 'base_unit',
      division: 'division', industrySector: 'industry_sector',
    },
  },
  product_descriptions: {
    columns: {
      product: 'TEXT',
      language: 'TEXT',
      product_description: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (product, language)',
    keyMap: {
      product: 'product', language: 'language', productDescription: 'product_description',
    },
  },
  plants: {
    columns: {
      plant: 'TEXT PRIMARY KEY',
      plant_name: 'TEXT',
      valuation_area: 'TEXT',
      plant_customer: 'TEXT',
      plant_supplier: 'TEXT',
      factory_calendar: 'TEXT',
      sales_organization: 'TEXT',
      address_id: 'TEXT',
      distribution_channel: 'TEXT',
      division: 'TEXT',
      language: 'TEXT',
    },
    keyMap: {
      plant: 'plant', plantName: 'plant_name', valuationArea: 'valuation_area',
      plantCustomer: 'plant_customer', plantSupplier: 'plant_supplier',
      factoryCalendar: 'factory_calendar', salesOrganization: 'sales_organization',
      addressId: 'address_id', distributionChannel: 'distribution_channel',
      division: 'division', language: 'language',
    },
  },
  product_plants: {
    columns: {
      product: 'TEXT',
      plant: 'TEXT',
      country_of_origin: 'TEXT',
      profit_center: 'TEXT',
      mrp_type: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (product, plant)',
    keyMap: {
      product: 'product', plant: 'plant', countryOfOrigin: 'country_of_origin',
      profitCenter: 'profit_center', mrpType: 'mrp_type',
    },
  },
  product_storage_locations: {
    columns: {
      product: 'TEXT',
      plant: 'TEXT',
      storage_location: 'TEXT',
    },
    primaryKey: 'PRIMARY KEY (product, plant, storage_location)',
    keyMap: {
      product: 'product', plant: 'plant', storageLocation: 'storage_location',
    },
  },
};

// Map folder names to table names
const FOLDER_TO_TABLE = {
  sales_order_headers: 'sales_order_headers',
  sales_order_items: 'sales_order_items',
  sales_order_schedule_lines: 'sales_order_schedule_lines',
  outbound_delivery_headers: 'outbound_delivery_headers',
  outbound_delivery_items: 'outbound_delivery_items',
  billing_document_headers: 'billing_document_headers',
  billing_document_items: 'billing_document_items',
  billing_document_cancellations: 'billing_document_cancellations',
  journal_entry_items_accounts_receivable: 'journal_entry_items',
  payments_accounts_receivable: 'payments',
  business_partners: 'business_partners',
  business_partner_addresses: 'business_partner_addresses',
  customer_company_assignments: 'customer_company_assignments',
  customer_sales_area_assignments: 'customer_sales_area_assignments',
  products: 'products',
  product_descriptions: 'product_descriptions',
  plants: 'plants',
  product_plants: 'product_plants',
  product_storage_locations: 'product_storage_locations',
};

function createTable(tableName, schema) {
  const colDefs = Object.entries(schema.columns)
    .map(([col, type]) => `"${col}" ${type}`)
    .join(',\n  ');
  const pk = schema.primaryKey ? `,\n  ${schema.primaryKey}` : '';
  const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs}${pk}\n)`;
  db.exec(sql);
  console.log(`  Created table: ${tableName}`);
}

function loadFolder(folderName, tableName, schema) {
  const folderPath = path.join(DATA_DIR, folderName);
  if (!fs.existsSync(folderPath)) {
    console.log(`  Skipping ${folderName} — folder not found`);
    return 0;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jsonl'));
  const colNames = Object.keys(schema.columns);
  const placeholders = colNames.map(() => '?').join(', ');
  const insertSQL = `INSERT OR IGNORE INTO "${tableName}" (${colNames.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  const insert = db.prepare(insertSQL);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });

  let totalRows = 0;
  for (const file of files) {
    const lines = fs.readFileSync(path.join(folderPath, file), 'utf-8').split('\n').filter(Boolean);
    const rows = lines.map(line => {
      const obj = JSON.parse(line);
      return colNames.map(col => {
        // Find the camelCase key for this column
        const camelKey = Object.entries(schema.keyMap).find(([, v]) => v === col)?.[0];
        let val = camelKey ? obj[camelKey] : obj[col];
        // Handle nulls and objects
        if (val === null || val === undefined) return null;
        if (typeof val === 'object') return JSON.stringify(val);
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val;
      });
    });
    insertMany(rows);
    totalRows += rows.length;
  }
  return totalRows;
}

// Main
console.log('=== SAP O2C Data Ingestion ===\n');
console.log('Creating tables...');
for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
  createTable(tableName, schema);
}

console.log('\nLoading data...');
let grandTotal = 0;
for (const [folder, table] of Object.entries(FOLDER_TO_TABLE)) {
  const schema = TABLE_SCHEMAS[table];
  if (!schema) {
    console.log(`  No schema for ${table}, skipping`);
    continue;
  }
  const count = loadFolder(folder, table, schema);
  console.log(`  ${table}: ${count} rows loaded`);
  grandTotal += count;
}

// Create useful indexes
console.log('\nCreating indexes...');
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_so_items_order ON sales_order_items(sales_order)',
  'CREATE INDEX IF NOT EXISTS idx_so_items_material ON sales_order_items(material)',
  'CREATE INDEX IF NOT EXISTS idx_del_items_doc ON outbound_delivery_items(delivery_document)',
  'CREATE INDEX IF NOT EXISTS idx_del_items_ref ON outbound_delivery_items(reference_sd_document)',
  'CREATE INDEX IF NOT EXISTS idx_bill_items_doc ON billing_document_items(billing_document)',
  'CREATE INDEX IF NOT EXISTS idx_bill_items_ref ON billing_document_items(reference_sd_document)',
  'CREATE INDEX IF NOT EXISTS idx_bill_headers_acct ON billing_document_headers(accounting_document)',
  'CREATE INDEX IF NOT EXISTS idx_journal_acct ON journal_entry_items(accounting_document)',
  'CREATE INDEX IF NOT EXISTS idx_journal_ref ON journal_entry_items(reference_document)',
  'CREATE INDEX IF NOT EXISTS idx_journal_clearing ON journal_entry_items(clearing_accounting_document)',
  'CREATE INDEX IF NOT EXISTS idx_payments_clearing ON payments(clearing_accounting_document)',
  'CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer)',
  'CREATE INDEX IF NOT EXISTS idx_so_headers_sold ON sales_order_headers(sold_to_party)',
  'CREATE INDEX IF NOT EXISTS idx_bill_headers_sold ON billing_document_headers(sold_to_party)',
  'CREATE INDEX IF NOT EXISTS idx_bp_customer ON business_partners(customer)',
];
for (const idx of indexes) {
  db.exec(idx);
}
console.log('  Created 15 indexes');

console.log(`\nDone! Total rows: ${grandTotal}`);
console.log(`Database: ${DB_PATH}`);

db.close();
