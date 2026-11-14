-- Generated from dentist-on_261114.backup (PostgreSQL 17)
SET statement_timeout = 0;
SET check_function_bodies = false;
SELECT pg_catalog.set_config('search_path', '', false);

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'staff'
);

CREATE FUNCTION public.admin_create_distributor_invite(p_dist uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare t text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if exists (select 1 from public.distributors where id = p_dist and user_id is not null) then raise exception 'already_linked'; end if;
  update public.distributors set invite_token = t, invite_expires = now() + interval '7 days' where id = p_dist;
  if not found then raise exception 'not_found'; end if;
  return t;
end $$;

CREATE FUNCTION public.admin_exists() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select exists (select 1 from public.user_roles where role = 'admin') $$;

CREATE FUNCTION public.admin_set_distributor(p_user uuid, p_dist uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  perform set_config('app.allow_dist', '1', true);
  update public.customers set distributor_id = p_dist where user_id = p_user;
end $$;

CREATE FUNCTION public.admin_unlink_distributor(p_dist uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  update public.distributors set user_id = null, portal_email = '', invite_token = null, invite_expires = null where id = p_dist;
end $$;

CREATE FUNCTION public.ask_material(p_name text, p_brand text, p_qty integer, p_note text, p_image text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_clinic text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select clinic_name into v_clinic from public.customers
    where user_id = auth.uid() and status = 'approved';
  if not found then raise exception 'account not approved'; end if;

  p_name := btrim(coalesce(p_name, '')); p_brand := btrim(coalesce(p_brand, ''));
  p_note := btrim(coalesce(p_note, ''));
  if char_length(p_name) not between 2 and 120 then raise exception 'invalid name'; end if;
  if char_length(p_brand) > 80 or char_length(p_note) > 500 then raise exception 'too long'; end if;
  if p_qty is null or p_qty not between 1 and 100000 then raise exception 'invalid quantity'; end if;
  if p_image is not null and p_image <> ''
     and p_image not like '%/request-images/' || auth.uid()::text || '/%' then
    raise exception 'invalid image';
  end if;

  if (select count(*) from public.material_requests
        where user_id = auth.uid() and status = 'جديد') >= 5 then
    raise exception 'too many open requests';
  end if;
  if exists (select 1 from public.material_requests
        where user_id = auth.uid() and created_at > now() - interval '30 seconds') then
    raise exception 'slow down';
  end if;

  insert into public.material_requests (user_id, name, brand, qty, note, image_url)
  values (auth.uid(), p_name, p_brand, p_qty, p_note, nullif(p_image, ''))
  returning id into v_id;

  begin
    perform public.notify_admin('طلب توفر جديد', left(coalesce(v_clinic, '') || ' يسأل عن: ' || p_name, 150));
  exception when others then null;
  end;
  return v_id;
end $$;

CREATE FUNCTION public.assign_first_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

CREATE FUNCTION public.attach_distributor(p_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare d_id uuid; n int;
begin
  if auth.uid() is null then return false; end if;
  select id into d_id from public.distributors where code = upper(trim(p_code)) and active;
  if d_id is null then return false; end if;
  perform set_config('app.allow_dist', '1', true);
  update public.customers set distributor_id = d_id where user_id = auth.uid() and distributor_id is null;
  get diagnostics n = row_count;
  return n > 0;
end $$;

CREATE FUNCTION public.audit_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_old jsonb; v_new jsonb; v_row jsonb; v_k text; v_diff jsonb := '{}'::jsonb; v_email text;
begin
  -- نسجّل فقط أفعال المدير والموظفين (لا العمليات الآلية ولا الزبائن)
  if auth.uid() is null
     or not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'staff')) then
    return null;
  end if;
  if TG_OP <> 'INSERT' then v_old := to_jsonb(old); end if;
  if TG_OP <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  if TG_OP = 'UPDATE' then
    for v_k in select jsonb_object_keys(v_new) loop
      if v_k not in ('updated_at', 'items') and v_new->v_k is distinct from v_old->v_k then
        v_diff := v_diff || jsonb_build_object(v_k, jsonb_build_object(
          'from', public.audit_trim(v_old->v_k), 'to', public.audit_trim(v_new->v_k)));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then return null; end if;
  else
    v_diff := jsonb_build_object('name', coalesce(v_row->>'name', v_row->>'role', v_row->>'key'));
  end if;

  select email into v_email from auth.users where id = auth.uid();
  insert into public.audit_log (user_id, user_email, action, entity, entity_id, details)
  values (auth.uid(), v_email, lower(TG_OP), TG_TABLE_NAME,
          coalesce(v_row->>'id', v_row->>'user_id', v_row->>'key'), v_diff);
  return null;
end $$;

CREATE FUNCTION public.audit_trim(j jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  select case when jsonb_typeof(j) = 'string' and char_length(j #>> '{}') > 200
              then to_jsonb(left(j #>> '{}', 200) || '…') else j end
$$;

CREATE FUNCTION public.best_sellers() RETURNS TABLE(product_id text, qty bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select i->>'id', sum((i->>'qty')::int)::bigint
  from public.orders o, jsonb_array_elements(o.items) i
  where o.status <> 'ملغي' and o.created_at > now() - interval '90 days'
  group by 1 order by 2 desc limit 200
$$;

CREATE FUNCTION public.check_coupon(p_code text) RETURNS TABLE(name text, percent numeric, scope text, target text, min_order numeric)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select x.name, x.percent, x.scope, x.target, x.min_order
  from public.promotions x
  where x.code = upper(trim(p_code)) and x.active
    and (x.starts_at is null or x.starts_at <= now()) and (x.ends_at is null or x.ends_at > now())
    and (x.max_uses is null or x.used_count < x.max_uses)
$$;

CREATE FUNCTION public.claim_distributor_invite(p_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare d_id uuid; em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return false; end if;
  if public.has_role(auth.uid(), 'admin') then raise exception 'is_admin'; end if;
  if exists (
    select 1 from public.customers c
    where c.user_id = auth.uid()
      and (coalesce(trim(c.clinic_name), '') <> '' or c.status::text <> 'pending' or c.distributor_id is not null
           or exists (select 1 from public.orders o where o.customer_id = c.user_id))
  ) then raise exception 'is_customer'; end if;
  select id into d_id from public.distributors
   where invite_token = p_token and invite_expires > now() and user_id is null and active for update;
  if d_id is null then return false; end if;
  update public.distributors set user_id = auth.uid(), portal_email = em, invite_token = null, invite_expires = null where id = d_id;
  -- سجل «عميل» فارغ أُنشئ تلقائياً عند التسجيل لا لزوم له للموزع
  delete from public.customers where user_id = auth.uid() and status::text = 'pending' and coalesce(trim(clinic_name), '') = '';
  return true;
end $$;

CREATE FUNCTION public.create_customer_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (select 1 from public.user_roles where user_id = new.id and role = 'admin') then
    if (select count(*) from public.customers where created_at > now() - interval '1 hour') >= 30 then
      raise exception 'too many signups';
    end if;
    insert into public.customers (user_id, clinic_name, phone, address)
    values (new.id, coalesce(new.raw_user_meta_data->>'clinic_name',''), coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.raw_user_meta_data->>'address',''));
  end if;
  return new;
end $$;

CREATE FUNCTION public.distributor_by_code(p_code text) RETURNS TABLE(name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select d.name from public.distributors d where d.code = upper(trim(p_code)) and d.active limit 1 $$;

CREATE FUNCTION public.distributor_doctors() RETURNS TABLE(user_id uuid, clinic_name text, phone text, status text, created_at timestamp with time zone, orders_count bigint, orders_total numeric, last_order timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select c.user_id, c.clinic_name, c.phone, c.status::text, c.created_at,
         count(o.id) filter (where o.status <> 'ملغي'),
         coalesce(sum(o.total) filter (where o.status <> 'ملغي'), 0)::numeric,
         max(o.created_at) filter (where o.status <> 'ملغي')
  from public.customers c
  join public.distributors d on d.id = c.distributor_id and d.user_id = auth.uid() and d.active
  left join public.orders o on o.customer_id = c.user_id
  group by c.user_id, c.clinic_name, c.phone, c.status, c.created_at
  order by c.created_at desc
$$;

CREATE FUNCTION public.distributor_orders(p_limit integer DEFAULT 300) RETURNS TABLE(id uuid, created_at timestamp with time zone, clinic_name text, total numeric, status text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select o.id, o.created_at, c.clinic_name, o.total::numeric, o.status::text
  from public.orders o
  join public.customers c on c.user_id = o.customer_id
  join public.distributors d on d.id = c.distributor_id and d.user_id = auth.uid() and d.active
  order by o.created_at desc
  limit least(greatest(coalesce(p_limit, 300), 1), 500)
$$;

CREATE FUNCTION public.guard_customer_distributor() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ begin
  if new.distributor_id is distinct from old.distributor_id
     and coalesce(current_setting('app.allow_dist', true), '') <> '1'
     and not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    new.distributor_id := old.distributor_id;
  end if;
  return new;
end $$;

CREATE FUNCTION public.has_perm(_uid uuid, _perm text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select public.has_role(_uid, 'admin')
      or (public.has_role(_uid, 'staff') and exists (
            select 1 from public.staff_profiles s where s.user_id = _uid and _perm = any(s.permissions)))
$$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

CREATE FUNCTION public.is_approved_customer(_uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select exists (select 1 from public.customers where user_id = _uid and status = 'approved') $$;

CREATE FUNCTION public.mark_used_sold(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ begin
  update public.used_items set status = 'sold', decided_at = now() where id = p_id and user_id = auth.uid() and status = 'approved';
end $$;

CREATE FUNCTION public.my_distributor() RETURNS TABLE(name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select d.name from public.customers c join public.distributors d on d.id = c.distributor_id where c.user_id = auth.uid() limit 1 $$;

CREATE FUNCTION public.my_distributor_portal() RETURNS TABLE(id uuid, name text, phone text, code text, active boolean, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select d.id, d.name, d.phone, d.code, d.active, d.created_at from public.distributors d where d.user_id = auth.uid() limit 1 $$;

CREATE FUNCTION public.notify_admin(p_title text, p_message text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
declare t text;
begin
  select value into t from public.notify_settings where key = 'ntfy_topic';
  if t is null or t = '' then return; end if;
  perform net.http_post(url := 'https://ntfy.sh', body := jsonb_build_object('topic', t, 'title', p_title, 'message', p_message),
                        headers := '{"Content-Type":"application/json"}'::jsonb);
exception when others then null; -- الإشعار لا يجب أن يعطّل التسجيل أو الطلب
end $$;

CREATE FUNCTION public.notify_low_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare th numeric;
begin
  select nullif(trim(both '"' from value::text), '')::numeric into th from public.shop_config where key = 'low_stock_threshold';
  th := coalesce(th, 5);
  if new.stock is not null and new.stock <= th and (old.stock is null or old.stock > th) then
    perform public.notify_admin('مخزون منخفض', new.name || ' — المتبقي ' || new.stock);
  end if;
  return new;
end $$;

CREATE FUNCTION public.notify_new_customer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin perform public.notify_admin('تسجيل جديد بانتظار الموافقة', new.clinic_name || ' — ' || new.phone); return new; end $$;

CREATE FUNCTION public.notify_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
begin perform public.notify_admin('طلب جديد', new.customer_name || ' — ' || new.total || '$'); return new; end $_$;

CREATE FUNCTION public.notify_stock_watchers() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_n int;
begin
  if old.stock is not null and old.stock <= 0 and (new.stock is null or new.stock > 0) then
    select count(*) into v_n from public.stock_watch where product_id = new.id and notified_at is null;
    if v_n > 0 then
      begin
        perform public.notify_admin('توفّر منتج', v_n || ' عميل ينتظرون: ' || left(new.name, 80));
      exception when others then null;
      end;
    end if;
  end if;
  return new;
end $$;

CREATE FUNCTION public.orders_require_approved() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if not exists (select 1 from public.customers where user_id = auth.uid() and status = 'approved') then
    raise exception 'account not approved';
  end if;
  new.customer_id := auth.uid();
  return new;
end $$;

CREATE FUNCTION public.orders_set_completed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status = 'مكتمل' and (tg_op = 'INSERT' or old.status is distinct from 'مكتمل') then
    new.completed_at := now();
  elsif new.status <> 'مكتمل' then
    new.completed_at := null;
  end if;
  return new;
end $$;

CREATE FUNCTION public.orders_staff_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if public.has_role(auth.uid(), 'staff') and not public.has_role(auth.uid(), 'admin') then
    if (to_jsonb(new) - 'status' - 'paid' - 'completed_at')
       is distinct from (to_jsonb(old) - 'status' - 'paid' - 'completed_at') then
      raise exception 'staff may only change status and payment';
    end if;
  end if;
  return new;
end $$;

CREATE FUNCTION public.place_order(p_name text, p_phone text, p_address text, p_items jsonb, p_zone text DEFAULT NULL::text, p_coupon text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  c public.customers%rowtype;
  cp public.promotions%rowtype;
  have_cp boolean := false;
  it jsonb;
  p public.products%rowtype;
  q int; base numeric; pct numeric; auto_pct numeric; cp_pct numeric; unit numeric;
  list_sub numeric := 0; sub numeric := 0; lines jsonb := '[]'::jsonb;
  disc numeric; fee numeric := 0; total numeric; rate numeric; min_o numeric; fees jsonb; oid uuid;
begin
  select * into c from public.customers where user_id = auth.uid() and status = 'approved';
  if not found then raise exception 'account not approved'; end if;

  if p_name is null or length(trim(p_name)) < 2 or length(p_name) > 120
     or p_address is null or length(trim(p_address)) < 3 or length(p_address) > 300
     or p_phone is null or p_phone !~ '^[0-9+\s-]{7,20}$' then
    raise exception 'invalid details';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'empty order';
  end if;

  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    select * into cp from public.promotions
      where code = upper(trim(p_coupon)) and active
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
        and (max_uses is null or used_count < max_uses)
      for update;
    if not found then raise exception 'invalid coupon'; end if;
    have_cp := true;
  end if;

  disc := coalesce(c.discount_percent, 0);
  for it in select value from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 10000 then raise exception 'bad quantity'; end if;
    select * into p from public.products where id = it->>'id' and active for update;
    if not found then raise exception 'product unavailable'; end if;
    if p.stock is not null and p.stock < q then raise exception 'product unavailable'; end if;

    base := case when q >= 10 then p.bulk_price else p.price end;
    select coalesce(max(x.percent), 0) into auto_pct from public.promotions x
      where x.code is null and x.active
        and (x.starts_at is null or x.starts_at <= now()) and (x.ends_at is null or x.ends_at > now())
        and (x.scope = 'all' or (x.scope = 'category' and x.target = p.category) or (x.scope = 'product' and x.target = p.id));
    cp_pct := 0;
    if have_cp and (cp.scope = 'all' or (cp.scope = 'category' and cp.target = p.category) or (cp.scope = 'product' and cp.target = p.id)) then
      cp_pct := cp.percent;
    end if;
    pct := greatest(disc, auto_pct, cp_pct);

    unit := round(base * (1 - pct / 100), 2);
    list_sub := list_sub + base * q;
    sub := sub + unit * q;
    lines := lines || jsonb_build_object('id', p.id, 'name', p.name, 'qty', q, 'unit', unit, 'discount_pct', pct);
    if p.stock is not null then update public.products set stock = stock - q where id = p.id; end if;
  end loop;

  if have_cp then
    if list_sub < cp.min_order then raise exception 'coupon minimum'; end if;
    update public.promotions set used_count = used_count + 1 where id = cp.id;
  end if;

  select nullif(trim(both '"' from value::text), '')::numeric into min_o from public.shop_config where key = 'min_order_usd';
  if coalesce(min_o, 0) > 0 and sub < min_o then raise exception 'below minimum order'; end if;

  select value into fees from public.shop_config where key = 'delivery_fees';
  if fees is not null and jsonb_typeof(fees) = 'object' and fees <> '{}'::jsonb then
    if p_zone is null or not (fees ? p_zone) then raise exception 'zone required'; end if;
    fee := coalesce((fees->>p_zone)::numeric, 0);
  end if;

  total := sub + fee;
  select nullif(trim(both '"' from value::text), '')::numeric into rate from public.store_settings where key = 'usd_to_syp';

  insert into public.orders (customer_name, phone, address, items, total, total_syp, exchange_rate, delivery_fee, zone, coupon, discount_total)
  values (trim(p_name), trim(p_phone), trim(p_address), lines, total,
          case when coalesce(rate, 0) > 0 then round(total * rate) else 0 end, coalesce(rate, 0), fee, p_zone,
          case when have_cp then cp.code else null end, round(list_sub - sub, 2))
  returning id into oid;
  return oid;
end $_$;

CREATE FUNCTION public.review_stats() RETURNS TABLE(product_id text, avg_rating numeric, n bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select product_id, round(avg(rating)::numeric, 1), count(*) from public.product_reviews where not hidden group by product_id $$;

CREATE FUNCTION public.submit_review(p_product text, p_rating integer, p_comment text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare rid uuid; nm text; bought boolean;
begin
  if auth.uid() is null or not public.is_approved_customer(auth.uid()) then raise exception 'not approved'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'bad rating'; end if;
  if not exists (select 1 from public.products where id = p_product and active) then raise exception 'product unavailable'; end if;
  select clinic_name into nm from public.customers where user_id = auth.uid();
  -- التحقق من الشراء: ظهور معرّف المنتج في عناصر طلب غير ملغي لهذا الزبون
  select exists (
    select 1 from public.orders o
    where o.customer_id = auth.uid() and o.status <> 'ملغي' and o.items::text like '%"' || p_product || '"%'
  ) into bought;
  insert into public.product_reviews(product_id, user_id, author, rating, comment, verified)
  values (p_product, auth.uid(), left(coalesce(nm, ''), 80), p_rating, left(coalesce(p_comment, ''), 600), coalesce(bought, false))
  on conflict (product_id, user_id) do update
    set rating = excluded.rating, comment = excluded.comment, verified = excluded.verified, hidden = false, created_at = now()
  returning id into rid;
  return rid;
end $$;

CREATE FUNCTION public.submit_service_request(p_kind text, p_title text, p_qty integer, p_buy_from text, p_note text, p_urgent boolean, p_image text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare new_id uuid;
begin
  if auth.uid() is null or not public.is_approved_customer(auth.uid()) then raise exception 'not approved'; end if;
  if p_kind not in ('outside', 'maintenance') then raise exception 'bad kind'; end if;
  if length(trim(coalesce(p_title, ''))) < 2 then raise exception 'bad title'; end if;
  if (select count(*) from public.service_requests where user_id = auth.uid() and status in ('جديد', 'قيد المراجعة')) >= 8 then
    raise exception 'too many open';
  end if;
  if exists (select 1 from public.service_requests where user_id = auth.uid() and created_at > now() - interval '15 seconds') then
    raise exception 'slow down';
  end if;
  insert into public.service_requests(user_id, kind, title, qty, buy_from, note, urgent, image_url)
  values (
    auth.uid(), p_kind, left(trim(p_title), 120), greatest(1, least(coalesce(p_qty, 1), 9999)),
    left(coalesce(p_buy_from, ''), 200), left(coalesce(p_note, ''), 800), coalesce(p_urgent, false), nullif(p_image, '')
  ) returning id into new_id;
  begin
    perform public.notify_admin(
      case when p_kind = 'maintenance' then 'طلب صيانة جديد' else 'طلب إضافي جديد' end,
      left(trim(p_title), 80)
    );
  exception when others then null; end;
  return new_id;
end $$;

CREATE FUNCTION public.submit_used_item(p_title text, p_description text, p_category text, p_condition text, p_price numeric, p_images text[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare new_id uuid;
begin
  if auth.uid() is null or not public.is_approved_customer(auth.uid()) then raise exception 'not approved'; end if;
  if length(trim(coalesce(p_title, ''))) < 2 then raise exception 'bad title'; end if;
  if (select count(*) from public.used_items where user_id = auth.uid() and status in ('pending', 'approved')) >= 12 then
    raise exception 'too many open';
  end if;
  if exists (select 1 from public.used_items where user_id = auth.uid() and created_at > now() - interval '15 seconds') then
    raise exception 'slow down';
  end if;
  insert into public.used_items(user_id, title, description, category, condition, price, image_urls)
  values (
    auth.uid(), left(trim(p_title), 120), left(coalesce(p_description, ''), 1000), left(coalesce(p_category, ''), 60),
    case when p_condition in ('ممتازة', 'جيدة', 'مقبولة') then p_condition else 'جيدة' end,
    case when p_price is null or p_price < 0 then null else p_price end,
    coalesce((select array_agg(u) from (select u from unnest(coalesce(p_images, '{}')) u limit 4) s), '{}')
  ) returning id into new_id;
  begin perform public.notify_admin('أداة مستعملة جديدة', left(trim(p_title), 80)); exception when others then null; end;
  return new_id;
end $$;

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ begin new.updated_at = now(); return new; end $$;

CREATE FUNCTION public.track_order(p_ref text, p_phone text) RETURNS TABLE(status text, total numeric, created_at timestamp with time zone, items jsonb)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select o.status, o.total, o.created_at, o.items
  from public.orders o
  where length(trim(p_ref)) >= 8
    and starts_with(o.id::text, lower(trim(p_ref)))
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 7
    and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  limit 1
$$;

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    details jsonb
);

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.customer_carts (
    user_id uuid NOT NULL,
    items jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reminded_at timestamp with time zone
);

CREATE TABLE public.customers (
    user_id uuid NOT NULL,
    clinic_name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    discount_percent numeric DEFAULT 0 NOT NULL,
    distributor_id uuid,
    CONSTRAINT customers_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT customers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE public.distributors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    code text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    portal_email text DEFAULT ''::text NOT NULL,
    invite_token text,
    invite_expires timestamp with time zone
);

CREATE TABLE public.material_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    brand text DEFAULT ''::text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    image_url text,
    status text DEFAULT 'جديد'::text NOT NULL,
    reply_price numeric,
    reply_note text DEFAULT ''::text NOT NULL,
    product_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    replied_at timestamp with time zone,
    CONSTRAINT material_requests_brand_check CHECK ((char_length(brand) <= 80)),
    CONSTRAINT material_requests_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120))),
    CONSTRAINT material_requests_note_check CHECK ((char_length(note) <= 500)),
    CONSTRAINT material_requests_qty_check CHECK (((qty >= 1) AND (qty <= 100000))),
    CONSTRAINT material_requests_reply_note_check CHECK ((char_length(reply_note) <= 500)),
    CONSTRAINT material_requests_reply_price_check CHECK (((reply_price IS NULL) OR (reply_price >= (0)::numeric))),
    CONSTRAINT material_requests_status_check CHECK ((status = ANY (ARRAY['جديد'::text, 'متوفرة'::text, 'غير متوفرة'::text, 'ستتوفر قريباً'::text])))
);

CREATE TABLE public.notify_settings (
    key text NOT NULL,
    value text NOT NULL
);

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'جديد'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    exchange_rate numeric DEFAULT 0 NOT NULL,
    total_syp numeric DEFAULT 0 NOT NULL,
    customer_id uuid,
    paid boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    zone text,
    coupon text,
    discount_total numeric DEFAULT 0 NOT NULL
);

CREATE TABLE public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text NOT NULL,
    user_id uuid NOT NULL,
    author text DEFAULT ''::text NOT NULL,
    rating integer NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE public.products (
    id text NOT NULL,
    name text NOT NULL,
    brand text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'أدوات يدوية'::text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    bulk_price numeric DEFAULT 0 NOT NULL,
    image text DEFAULT 'instruments'::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stock integer,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    bundle_items jsonb,
    audience text,
    CONSTRAINT products_stock_check CHECK (((stock IS NULL) OR (stock >= 0)))
);

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    percent numeric NOT NULL,
    scope text DEFAULT 'all'::text NOT NULL,
    target text,
    code text,
    min_order numeric DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT promotions_code_check CHECK (((code IS NULL) OR (code = upper(code)))),
    CONSTRAINT promotions_max_uses_check CHECK (((max_uses IS NULL) OR (max_uses > 0))),
    CONSTRAINT promotions_percent_check CHECK (((percent > (0)::numeric) AND (percent <= (90)::numeric))),
    CONSTRAINT promotions_scope_check CHECK ((scope = ANY (ARRAY['all'::text, 'category'::text, 'product'::text])))
);

CREATE TABLE public.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    buy_from text DEFAULT ''::text NOT NULL,
    note text DEFAULT ''::text NOT NULL,
    urgent boolean DEFAULT false NOT NULL,
    image_url text,
    status text DEFAULT 'جديد'::text NOT NULL,
    reply_price numeric,
    reply_note text DEFAULT ''::text NOT NULL,
    replied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_requests_kind_check CHECK ((kind = ANY (ARRAY['outside'::text, 'maintenance'::text])))
);

CREATE TABLE public.shop_config (
    key text NOT NULL,
    value jsonb NOT NULL
);

CREATE TABLE public.staff_profiles (
    user_id uuid NOT NULL,
    email text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    permissions text[] DEFAULT '{orders}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.stock_watch (
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);

CREATE TABLE public.store_settings (
    key text NOT NULL,
    value numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_settings_value_check CHECK ((value >= (0)::numeric))
);

CREATE TABLE public.used_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    condition text DEFAULT 'جيدة'::text NOT NULL,
    price numeric,
    image_urls text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    decided_at timestamp with time zone
);

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);

