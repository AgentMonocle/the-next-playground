#!/usr/bin/env tsx
/**
 * Seed TSS_Product list with Tejas product catalog.
 *
 * Idempotent: skips products that already exist (matched by tss_productCode).
 *
 * Usage:
 *   cd TSS/scripts
 *   npx tsx seed/seedProducts.ts
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  getAdminClient,
  getSiteId,
  getAllListItems,
  batchCreateItems,
} from '../lib/graphAdmin.js';

const LIST_NAME = 'TSS_Product';

interface ProductData {
  name: string;
  productCode: string;
  productLine: string;
  category: string;
  unit: string;
  basePrice: number;
}

async function main() {
  console.log('📦 Seeding TSS_Product list');
  console.log('================================\n');

  // Load seed data
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataPath = resolve(__dirname, '../data/products.json');
  const products: ProductData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`  Loaded ${products.length} products from seed data`);

  // Connect to Graph
  const client = getAdminClient();
  const siteId = await getSiteId(client);

  // Get existing items to avoid duplicates
  const existing = await getAllListItems(client, siteId, LIST_NAME);
  const existingCodes = new Set<string>();
  for (const item of existing) {
    const fields = item.fields as Record<string, unknown> | undefined;
    if (fields?.tss_productCode) {
      existingCodes.add(fields.tss_productCode as string);
    }
  }
  console.log(`  Found ${existingCodes.size} existing products in SharePoint`);

  // Filter to only new products
  const newProducts = products.filter(p => !existingCodes.has(p.productCode));
  if (newProducts.length === 0) {
    console.log('\n  ✅ All products already exist — nothing to do');
    return;
  }

  console.log(`  Creating ${newProducts.length} new products...\n`);

  // Map to SharePoint fields
  const items = newProducts.map(p => ({
    Title: p.name,
    tss_productCode: p.productCode,
    tss_productLine: p.productLine,
    tss_category: p.category,
    tss_isActive: true,
    tss_basePrice: p.basePrice,
    tss_unit: p.unit,
    tss_description: '',
  }));

  // Batch create
  const created = await batchCreateItems(client, siteId, LIST_NAME, items);

  console.log(`\n================================`);
  console.log(`✅ Seeded ${created} of ${newProducts.length} products`);
}

main().catch((err) => {
  console.error('\n❌ Product seeding failed:', err);
  process.exit(1);
});
