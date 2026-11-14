-- Generated from dentist-on_261114.backup (PostgreSQL 17)
SET statement_timeout = 0;
SET check_function_bodies = false;
SELECT pg_catalog.set_config('search_path', '', false);

-- storage.buckets
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('product-images', 'product-images', NULL, '2026-11-06 21:18:48.742035+00', '2026-11-06 21:18:48.742035+00', 't', 'f', NULL, NULL, NULL, 'STANDARD', 'DISABLED', NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) VALUES ('request-images', 'request-images', NULL, '2026-11-07 07:01:11.615521+00', '2026-11-07 07:01:11.615521+00', 't', 'f', '3145728', '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD', 'DISABLED', NULL, NULL) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin delete product images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'product-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "admin update product images" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'product-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "admin upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'product-images'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "customers upload request images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'request-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.user_id = auth.uid()) AND (c.status = 'approved'::text))))));

