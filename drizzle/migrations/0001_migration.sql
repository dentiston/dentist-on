drop policy if exists "public read settings" on public.store_settings;
create policy "public read exchange rate" on public.store_settings for select to anon, authenticated using (key = 'usd_to_syp');
create policy "admin read settings" on public.store_settings for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "public read config" on public.shop_config;
create policy "public read storefront config" on public.shop_config for select to anon, authenticated using (key in ('min_order_usd','delivery_fees','home'));

drop policy if exists "public read product images" on storage.objects;