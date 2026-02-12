import { z } from 'zod';

// ─── Choice Constants ───────────────────────────────────────────────────────

export const PRODUCT_LINES = [
  'Well Intervention',
  'New Completions',
  'Green Energy',
  'Engineering Service',
  'Testing Service',
  'Training',
] as const;

export const PRODUCT_CATEGORIES = [
  'Safety Valve',
  'Packer',
  'Anchor',
  'Lock',
  'Nipple',
  'Cementing Tool',
  'Frac Sleeve',
  'Service',
] as const;

export const PRODUCT_UNITS = ['Each', 'Set', 'Project', 'Day', 'Hour'] as const;

export type ProductLine = (typeof PRODUCT_LINES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  Title: string;            // Product name
  tss_productCode: string;
  tss_productLine: ProductLine;
  tss_category?: ProductCategory;
  tss_isActive: boolean;
  tss_description?: string;
  tss_basePrice?: number;
  tss_unit?: ProductUnit;
  Created: string;
  Modified: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const productFormSchema = z.object({
  Title: z.string().min(1, 'Product name is required'),
  tss_productCode: z.string().min(1, 'Product code is required'),
  tss_productLine: z.enum(PRODUCT_LINES),
  tss_category: z.enum(PRODUCT_CATEGORIES).optional(),
  tss_isActive: z.boolean().default(true),
  tss_description: z.string().optional(),
  tss_basePrice: z.number().min(0).optional(),
  tss_unit: z.enum(PRODUCT_UNITS).optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;
