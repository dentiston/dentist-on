-- Generated from dentist-on_261114.backup (PostgreSQL 17)
SET statement_timeout = 0;
SET check_function_bodies = false;
SELECT pg_catalog.set_config('search_path', '', false);

REVOKE ALL ON FUNCTION public.admin_create_distributor_invite(p_dist uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_create_distributor_invite(p_dist uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_create_distributor_invite(p_dist uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_exists() TO anon;
GRANT ALL ON FUNCTION public.admin_exists() TO authenticated;
GRANT ALL ON FUNCTION public.admin_exists() TO service_role;

GRANT ALL ON FUNCTION public.admin_set_distributor(p_user uuid, p_dist uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_set_distributor(p_user uuid, p_dist uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_set_distributor(p_user uuid, p_dist uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_unlink_distributor(p_dist uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_unlink_distributor(p_dist uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_unlink_distributor(p_dist uuid) TO service_role;

REVOKE ALL ON FUNCTION public.ask_material(p_name text, p_brand text, p_qty integer, p_note text, p_image text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.ask_material(p_name text, p_brand text, p_qty integer, p_note text, p_image text) TO anon;
GRANT ALL ON FUNCTION public.ask_material(p_name text, p_brand text, p_qty integer, p_note text, p_image text) TO authenticated;
GRANT ALL ON FUNCTION public.ask_material(p_name text, p_brand text, p_qty integer, p_note text, p_image text) TO service_role;

GRANT ALL ON FUNCTION public.assign_first_admin() TO anon;
GRANT ALL ON FUNCTION public.assign_first_admin() TO authenticated;
GRANT ALL ON FUNCTION public.assign_first_admin() TO service_role;

GRANT ALL ON FUNCTION public.attach_distributor(p_code text) TO anon;
GRANT ALL ON FUNCTION public.attach_distributor(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.attach_distributor(p_code text) TO service_role;

GRANT ALL ON FUNCTION public.audit_trigger() TO anon;
GRANT ALL ON FUNCTION public.audit_trigger() TO authenticated;
GRANT ALL ON FUNCTION public.audit_trigger() TO service_role;

GRANT ALL ON FUNCTION public.audit_trim(j jsonb) TO anon;
GRANT ALL ON FUNCTION public.audit_trim(j jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.audit_trim(j jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.best_sellers() FROM PUBLIC;
GRANT ALL ON FUNCTION public.best_sellers() TO anon;
GRANT ALL ON FUNCTION public.best_sellers() TO authenticated;
GRANT ALL ON FUNCTION public.best_sellers() TO service_role;

REVOKE ALL ON FUNCTION public.check_coupon(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_coupon(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.check_coupon(p_code text) TO service_role;

REVOKE ALL ON FUNCTION public.claim_distributor_invite(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_distributor_invite(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.claim_distributor_invite(p_token text) TO service_role;

GRANT ALL ON FUNCTION public.create_customer_profile() TO anon;
GRANT ALL ON FUNCTION public.create_customer_profile() TO authenticated;
GRANT ALL ON FUNCTION public.create_customer_profile() TO service_role;

GRANT ALL ON FUNCTION public.distributor_by_code(p_code text) TO anon;
GRANT ALL ON FUNCTION public.distributor_by_code(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.distributor_by_code(p_code text) TO service_role;

REVOKE ALL ON FUNCTION public.distributor_doctors() FROM PUBLIC;
GRANT ALL ON FUNCTION public.distributor_doctors() TO authenticated;
GRANT ALL ON FUNCTION public.distributor_doctors() TO service_role;

REVOKE ALL ON FUNCTION public.distributor_orders(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.distributor_orders(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.distributor_orders(p_limit integer) TO service_role;

GRANT ALL ON FUNCTION public.guard_customer_distributor() TO anon;
GRANT ALL ON FUNCTION public.guard_customer_distributor() TO authenticated;
GRANT ALL ON FUNCTION public.guard_customer_distributor() TO service_role;

REVOKE ALL ON FUNCTION public.has_perm(_uid uuid, _perm text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_perm(_uid uuid, _perm text) TO anon;
GRANT ALL ON FUNCTION public.has_perm(_uid uuid, _perm text) TO authenticated;
GRANT ALL ON FUNCTION public.has_perm(_uid uuid, _perm text) TO service_role;

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;

GRANT ALL ON FUNCTION public.is_approved_customer(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_approved_customer(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_approved_customer(_uid uuid) TO service_role;

GRANT ALL ON FUNCTION public.mark_used_sold(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_used_sold(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_used_sold(p_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.my_distributor() TO anon;
GRANT ALL ON FUNCTION public.my_distributor() TO authenticated;
GRANT ALL ON FUNCTION public.my_distributor() TO service_role;

REVOKE ALL ON FUNCTION public.my_distributor_portal() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_distributor_portal() TO authenticated;
GRANT ALL ON FUNCTION public.my_distributor_portal() TO service_role;

REVOKE ALL ON FUNCTION public.notify_admin(p_title text, p_message text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_admin(p_title text, p_message text) TO service_role;

GRANT ALL ON FUNCTION public.notify_low_stock() TO anon;
GRANT ALL ON FUNCTION public.notify_low_stock() TO authenticated;
GRANT ALL ON FUNCTION public.notify_low_stock() TO service_role;

GRANT ALL ON FUNCTION public.notify_new_customer() TO anon;
GRANT ALL ON FUNCTION public.notify_new_customer() TO authenticated;
GRANT ALL ON FUNCTION public.notify_new_customer() TO service_role;

GRANT ALL ON FUNCTION public.notify_new_order() TO anon;
GRANT ALL ON FUNCTION public.notify_new_order() TO authenticated;
GRANT ALL ON FUNCTION public.notify_new_order() TO service_role;

GRANT ALL ON FUNCTION public.notify_stock_watchers() TO anon;
GRANT ALL ON FUNCTION public.notify_stock_watchers() TO authenticated;
GRANT ALL ON FUNCTION public.notify_stock_watchers() TO service_role;

GRANT ALL ON FUNCTION public.orders_require_approved() TO anon;
GRANT ALL ON FUNCTION public.orders_require_approved() TO authenticated;
GRANT ALL ON FUNCTION public.orders_require_approved() TO service_role;

GRANT ALL ON FUNCTION public.orders_set_completed_at() TO anon;
GRANT ALL ON FUNCTION public.orders_set_completed_at() TO authenticated;
GRANT ALL ON FUNCTION public.orders_set_completed_at() TO service_role;

GRANT ALL ON FUNCTION public.orders_staff_guard() TO anon;
GRANT ALL ON FUNCTION public.orders_staff_guard() TO authenticated;
GRANT ALL ON FUNCTION public.orders_staff_guard() TO service_role;

REVOKE ALL ON FUNCTION public.place_order(p_name text, p_phone text, p_address text, p_items jsonb, p_zone text, p_coupon text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.place_order(p_name text, p_phone text, p_address text, p_items jsonb, p_zone text, p_coupon text) TO authenticated;
GRANT ALL ON FUNCTION public.place_order(p_name text, p_phone text, p_address text, p_items jsonb, p_zone text, p_coupon text) TO service_role;

GRANT ALL ON FUNCTION public.review_stats() TO anon;
GRANT ALL ON FUNCTION public.review_stats() TO authenticated;
GRANT ALL ON FUNCTION public.review_stats() TO service_role;

GRANT ALL ON FUNCTION public.submit_review(p_product text, p_rating integer, p_comment text) TO anon;
GRANT ALL ON FUNCTION public.submit_review(p_product text, p_rating integer, p_comment text) TO authenticated;
GRANT ALL ON FUNCTION public.submit_review(p_product text, p_rating integer, p_comment text) TO service_role;

GRANT ALL ON FUNCTION public.submit_service_request(p_kind text, p_title text, p_qty integer, p_buy_from text, p_note text, p_urgent boolean, p_image text) TO anon;
GRANT ALL ON FUNCTION public.submit_service_request(p_kind text, p_title text, p_qty integer, p_buy_from text, p_note text, p_urgent boolean, p_image text) TO authenticated;
GRANT ALL ON FUNCTION public.submit_service_request(p_kind text, p_title text, p_qty integer, p_buy_from text, p_note text, p_urgent boolean, p_image text) TO service_role;

GRANT ALL ON FUNCTION public.submit_used_item(p_title text, p_description text, p_category text, p_condition text, p_price numeric, p_images text[]) TO anon;
GRANT ALL ON FUNCTION public.submit_used_item(p_title text, p_description text, p_category text, p_condition text, p_price numeric, p_images text[]) TO authenticated;
GRANT ALL ON FUNCTION public.submit_used_item(p_title text, p_description text, p_category text, p_condition text, p_price numeric, p_images text[]) TO service_role;

GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.track_order(p_ref text, p_phone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.track_order(p_ref text, p_phone text) TO anon;
GRANT ALL ON FUNCTION public.track_order(p_ref text, p_phone text) TO authenticated;
GRANT ALL ON FUNCTION public.track_order(p_ref text, p_phone text) TO service_role;

GRANT ALL ON TABLE public.audit_log TO service_role;
GRANT SELECT ON TABLE public.audit_log TO authenticated;

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;

GRANT ALL ON TABLE public.customer_carts TO anon;
GRANT ALL ON TABLE public.customer_carts TO authenticated;
GRANT ALL ON TABLE public.customer_carts TO service_role;

GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO service_role;

GRANT ALL ON TABLE public.distributors TO anon;
GRANT ALL ON TABLE public.distributors TO authenticated;
GRANT ALL ON TABLE public.distributors TO service_role;

GRANT ALL ON TABLE public.material_requests TO service_role;
GRANT SELECT,DELETE,UPDATE ON TABLE public.material_requests TO authenticated;

GRANT ALL ON TABLE public.notify_settings TO anon;
GRANT ALL ON TABLE public.notify_settings TO authenticated;
GRANT ALL ON TABLE public.notify_settings TO service_role;

GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.orders TO anon;
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

GRANT ALL ON TABLE public.product_reviews TO anon;
GRANT ALL ON TABLE public.product_reviews TO authenticated;
GRANT ALL ON TABLE public.product_reviews TO service_role;

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

GRANT ALL ON TABLE public.promotions TO anon;
GRANT ALL ON TABLE public.promotions TO authenticated;
GRANT ALL ON TABLE public.promotions TO service_role;

GRANT ALL ON TABLE public.service_requests TO anon;
GRANT ALL ON TABLE public.service_requests TO authenticated;
GRANT ALL ON TABLE public.service_requests TO service_role;

GRANT ALL ON TABLE public.shop_config TO anon;
GRANT ALL ON TABLE public.shop_config TO authenticated;
GRANT ALL ON TABLE public.shop_config TO service_role;

GRANT ALL ON TABLE public.staff_profiles TO service_role;
GRANT SELECT ON TABLE public.staff_profiles TO authenticated;

GRANT ALL ON TABLE public.stock_watch TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stock_watch TO authenticated;

GRANT ALL ON TABLE public.store_settings TO anon;
GRANT ALL ON TABLE public.store_settings TO authenticated;
GRANT ALL ON TABLE public.store_settings TO service_role;

GRANT ALL ON TABLE public.used_items TO anon;
GRANT ALL ON TABLE public.used_items TO authenticated;
GRANT ALL ON TABLE public.used_items TO service_role;

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_carts
    ADD CONSTRAINT customer_carts_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.distributors
    ADD CONSTRAINT distributors_code_key UNIQUE (code);

ALTER TABLE ONLY public.distributors
    ADD CONSTRAINT distributors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT material_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notify_settings
    ADD CONSTRAINT notify_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_user_id_key UNIQUE (product_id, user_id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_code_key UNIQUE (code);

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shop_config
    ADD CONSTRAINT shop_config_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.stock_watch
    ADD CONSTRAINT stock_watch_pkey PRIMARY KEY (user_id, product_id);

ALTER TABLE ONLY public.store_settings
    ADD CONSTRAINT store_settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY public.used_items
    ADD CONSTRAINT used_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

CREATE UNIQUE INDEX distributors_invite_token_key ON public.distributors USING btree (invite_token) WHERE (invite_token IS NOT NULL);

CREATE UNIQUE INDEX distributors_user_id_key ON public.distributors USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_admin();

CREATE TRIGGER on_auth_user_created_customer AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile();

CREATE TRIGGER audit_customers AFTER UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_orders AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_products AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_promotions AFTER INSERT OR DELETE OR UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_shop_config AFTER INSERT OR UPDATE ON public.shop_config FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_store_settings AFTER INSERT OR UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_user_roles AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER guard_customer_distributor BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.guard_customer_distributor();

CREATE TRIGGER notify_low_stock AFTER UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();

CREATE TRIGGER notify_new_customer AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.notify_new_customer();

CREATE TRIGGER notify_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE TRIGGER orders_require_approved BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_require_approved();

CREATE TRIGGER orders_set_completed_at BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_set_completed_at();

CREATE TRIGGER orders_staff_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_staff_guard();

CREATE TRIGGER products_notify_watchers AFTER UPDATE OF stock ON public.products FOR EACH ROW WHEN ((old.stock IS DISTINCT FROM new.stock)) EXECUTE FUNCTION public.notify_stock_watchers();

CREATE TRIGGER store_settings_touch BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE ONLY public.customer_carts
    ADD CONSTRAINT customer_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributors(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.distributors
    ADD CONSTRAINT distributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT material_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stock_watch
    ADD CONSTRAINT stock_watch_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stock_watch
    ADD CONSTRAINT stock_watch_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.used_items
    ADD CONSTRAINT used_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "admin delete" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin deletes requests" ON public.material_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin deletes watch" ON public.stock_watch FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin insert settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin manage distributors" ON public.distributors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin manage promos" ON public.promotions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin notify settings" ON public.notify_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin read carts" ON public.customer_carts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin read customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin read settings" ON public.store_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin reads requests" ON public.material_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin reads staff" ON public.staff_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin reads watch" ON public.stock_watch FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update carts" ON public.customer_carts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin update settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin updates requests" ON public.material_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin updates watch" ON public.stock_watch FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin write config" ON public.shop_config TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "approved customer adds watch" ON public.stock_watch FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.customers c
  WHERE ((c.user_id = auth.uid()) AND (c.status = 'approved'::text)))) AND (( SELECT count(*) AS count
   FROM public.stock_watch w
  WHERE (w.user_id = auth.uid())) < 50)));

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer reads own requests" ON public.material_requests FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "customer reads own watch" ON public.stock_watch FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "customer removes own watch" ON public.stock_watch FOR DELETE TO authenticated USING ((user_id = auth.uid()));

ALTER TABLE public.customer_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart insert" ON public.customer_carts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "own cart read" ON public.customer_carts FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "own cart update" ON public.customer_carts FOR UPDATE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "own customer" ON public.customers FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "own orders" ON public.orders FOR SELECT TO authenticated USING ((customer_id = auth.uid()));

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active" ON public.products FOR SELECT USING ((active OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "public read automatic promos" ON public.promotions FOR SELECT USING (((code IS NULL) AND active AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))));

CREATE POLICY "public read exchange rate" ON public.store_settings FOR SELECT TO authenticated, anon USING ((key = 'usd_to_syp'::text));

CREATE POLICY "public read storefront config" ON public.shop_config FOR SELECT TO authenticated, anon USING ((key = ANY (ARRAY['min_order_usd'::text, 'delivery_fees'::text, 'home'::text, 'about'::text])));

CREATE POLICY "public read whatsapp number" ON public.store_settings FOR SELECT USING ((key = 'whatsapp'::text));

CREATE POLICY "reviews admin update" ON public.product_reviews FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "reviews delete" ON public.product_reviews FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "reviews read" ON public.product_reviews FOR SELECT TO authenticated, anon USING (((NOT hidden) OR (user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "service admin update" ON public.service_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "service delete" ON public.service_requests FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((user_id = auth.uid()) AND (status = 'جديد'::text))));

CREATE POLICY "service select" ON public.service_requests FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated USING ((public.has_perm(auth.uid(), 'customers'::text) OR public.has_perm(auth.uid(), 'requests'::text)));

CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'orders'::text));

CREATE POLICY "staff reads own profile" ON public.staff_profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "staff reads requests" ON public.material_requests FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'requests'::text));

CREATE POLICY "staff reads watch" ON public.stock_watch FOR SELECT TO authenticated USING (public.has_perm(auth.uid(), 'requests'::text));

CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'orders'::text)) WITH CHECK (public.has_perm(auth.uid(), 'orders'::text));

CREATE POLICY "staff updates requests" ON public.material_requests FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'requests'::text)) WITH CHECK (public.has_perm(auth.uid(), 'requests'::text));

CREATE POLICY "staff updates watch" ON public.stock_watch FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(), 'requests'::text)) WITH CHECK (public.has_perm(auth.uid(), 'requests'::text));

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "used admin update" ON public.used_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "used delete own or admin" ON public.used_items FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "used select" ON public.used_items FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR ((status = 'approved'::text) AND public.is_approved_customer(auth.uid()))));

ALTER TABLE public.used_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.customers;

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.orders;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;

