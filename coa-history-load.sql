-- COA HISTORY LOAD — CertiPure (certipure.net)
-- Supabase project: hciwyzxiauamfmrpvion
-- Run in the Supabase Dashboard -> SQL Editor (paste all, click Run).
-- Idempotent: safe to re-run. It re-levels the schema and reloads every batch.

-- 1) Make sure the coas table + every column this site needs exists.
CREATE TABLE IF NOT EXISTS public.coas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS product_id   uuid;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS lab_name     text;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS test_date    date;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS size         text;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS net_content  text;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS purity       text;
ALTER TABLE public.coas ADD COLUMN IF NOT EXISTS pdf_url      text;

-- 1b) Legacy column from the old single-COA design — make sure it can't block
-- inserts (we no longer populate it; the page now uses the `purity` text column).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='coas' AND column_name='purity_percent'
  ) THEN
    ALTER TABLE public.coas ALTER COLUMN purity_percent DROP NOT NULL;
  END IF;
END $$;

-- 2) Allow the public website (anon role) to READ COAs.
ALTER TABLE public.coas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='coas' AND policyname='Public can read coas'
  ) THEN
    CREATE POLICY "Public can read coas" ON public.coas FOR SELECT USING (true);
  END IF;
END $$;

-- 3) Clear existing COA rows for these products, then load full history.
DELETE FROM public.coas WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN ('nad-plus-500mg', 'glp-3-30mg', 'ss-31-50mg', 'mots-c-40mg', 'cjc-no-dac-ipamorelin-10mg', 'klow-blend-80mg', 'tesamorelin-10mg', 'tb-500-10mg', 'ghk-cu-50mg', 'glp-3-10mg', 'bpc-tb-research-blend-20mg')
);

INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPND07-1', '500mg', '511.26mg', '99.93%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/nad-plus-coa.pdf'
FROM public.products WHERE slug = 'nad-plus-500mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPRT07-2', '30mg', '32.01mg', '99.78%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/glp-3-30mg-coa.pdf'
FROM public.products WHERE slug = 'glp-3-30mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPSS07-1', '50mg', '48.36mg', '99.90%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/ss-31-coa.pdf'
FROM public.products WHERE slug = 'ss-31-50mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPMC07-1', '40mg', '41.89mg', '99.46%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/mots-c-coa.pdf'
FROM public.products WHERE slug = 'mots-c-40mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPCP07-1', '10mg', 'Ipamorelin 4.66mg / CJC-1295 4.07mg', '99.89%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/cjc-ipamorelin-coa.pdf'
FROM public.products WHERE slug = 'cjc-no-dac-ipamorelin-10mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPKL07-1', '80mg', 'GHK-Cu 52.67mg / KPV 11.35mg / BPC-157 11.75mg / TB-500 12.06mg', '99.64%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/klow-blend-coa.pdf'
FROM public.products WHERE slug = 'klow-blend-80mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-04', 'CP-TSM10-0531-1', '10mg', '12.16mg', '99.88%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/tesamorelin-coa.pdf'
FROM public.products WHERE slug = 'tesamorelin-10mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-04', 'CP-TB5-0531-1', '10mg', '6.38mg', '99.55%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/tb-500-coa.pdf'
FROM public.products WHERE slug = 'tb-500-10mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPGC07-1', '50mg', '50.75mg', '99.77%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/ghk-cu-coa%20(1).pdf'
FROM public.products WHERE slug = 'ghk-cu-50mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-04', 'CP-GHK100-0531-1', '50mg', '101.72mg', '99.87%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/ghk-cu-coa.pdf'
FROM public.products WHERE slug = 'ghk-cu-50mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPRT07-1', '10mg', '10.97mg', '99.49%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/glp-3-10mg-coa%20(1).pdf'
FROM public.products WHERE slug = 'glp-3-10mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-09', 'CP-RT10-0605-1', '10mg', '11.44mg', '99.81%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/glp-3-10mg-coa.pdf'
FROM public.products WHERE slug = 'glp-3-10mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-29', 'CPWV07-1', '20mg', 'BPC-157 13.85mg / TB-500 13.84mg', '99.46%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/bpc-157-tb-500-blend-coa%20(1).pdf'
FROM public.products WHERE slug = 'bpc-tb-research-blend-20mg';
INSERT INTO public.coas (product_id, lab_name, test_date, batch_number, size, net_content, purity, pdf_url)
SELECT id, 'Freedom Diagnostics', '2026-06-04', 'CP-WV20-0531-1', '20mg', NULL, '99.72%', 'https://hciwyzxiauamfmrpvion.supabase.co/storage/v1/object/public/coa-documents/bpc-157-tb-500-blend-coa.pdf'
FROM public.products WHERE slug = 'bpc-tb-research-blend-20mg';

-- 4) Sanity check — how many COA rows now exist per product (newest first):
-- SELECT p.slug, c.batch_number, c.test_date, c.purity, c.net_content
-- FROM coas c JOIN products p ON p.id = c.product_id
-- ORDER BY p.slug, c.test_date DESC;
