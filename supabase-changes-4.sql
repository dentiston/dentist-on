-- =====================================================================
-- supabase-changes-4.sql  —  الموزعون + الباقات + المستعمل + الطلبات الإضافية والصيانة
-- نفّذه عبر Lovable كـ migration كما هو (مرة واحدة). آمن لإعادة التنفيذ.
-- لا يلمس place_order ولا أي دالة/جدول موجود سوى إضافة أعمدة جديدة.
-- =====================================================================

-- ---------- دوال مساعدة ----------
create or replace function public.is_approved_customer(_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.customers where user_id = _uid and status = 'approved') $$;

-- ---------- 1) الموزعون وروابط الإحالة ----------
create table if not exists public.distributors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  code text not null unique,
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.distributors enable row level security;
grant select, insert, update, delete on public.distributors to authenticated;
grant all on public.distributors to service_role;
drop policy if exists "admin manage distributors" on public.distributors;
create policy "admin manage distributors" on public.distributors for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

alter table public.customers add column if not exists distributor_id uuid references public.distributors(id) on delete set null;

-- حماية: الزبون لا يغيّر موزّعه بنفسه (التغيير فقط عبر الدالتين أدناه أو المدير)
create or replace function public.guard_customer_distributor()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.distributor_id is distinct from old.distributor_id
     and coalesce(current_setting('app.allow_dist', true), '') <> '1'
     and not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    new.distributor_id := old.distributor_id;
  end if;
  return new;
end $$;
drop trigger if exists guard_customer_distributor on public.customers;
create trigger guard_customer_distributor before update on public.customers
for each row execute function public.guard_customer_distributor();

-- اسم الموزع من الكود (للعرض في صفحة التسجيل) — متاح للجميع
create or replace function public.distributor_by_code(p_code text)
returns table(name text) language sql stable security definer set search_path = public
as $$ select d.name from public.distributors d where d.code = upper(trim(p_code)) and d.active limit 1 $$;
grant execute on function public.distributor_by_code(text) to anon, authenticated;

-- ربط الطبيب بالموزع (مرة واحدة فقط، ما دام غير مرتبط بموزع)
create or replace function public.attach_distributor(p_code text)
returns boolean language plpgsql security definer set search_path = public
as $$
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
grant execute on function public.attach_distributor(text) to authenticated;

-- اسم موزّع الطبيب الحالي
create or replace function public.my_distributor()
returns table(name text) language sql stable security definer set search_path = public
as $$ select d.name from public.customers c join public.distributors d on d.id = c.distributor_id where c.user_id = auth.uid() limit 1 $$;
grant execute on function public.my_distributor() to authenticated;

-- المدير: نقل طبيب إلى موزع آخر أو إزالته (p_dist = null)
create or replace function public.admin_set_distributor(p_user uuid, p_dist uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  perform set_config('app.allow_dist', '1', true);
  update public.customers set distributor_id = p_dist where user_id = p_user;
end $$;
grant execute on function public.admin_set_distributor(uuid, uuid) to authenticated;

-- ---------- 2) العروض والبكجات: تُباع كمنتج عادي (فيعمل place_order دون تعديل) ----------
alter table public.products add column if not exists bundle_items jsonb;
alter table public.products add column if not exists audience text;

-- ---------- 3) الأدوات المستعملة (تظهر بعد موافقة المدير) ----------
create table if not exists public.used_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default '',
  condition text not null default 'جيدة',
  price numeric,                                   -- null = على السوم
  image_urls text[] not null default '{}',
  status text not null default 'pending',          -- pending | approved | rejected | sold
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.used_items enable row level security;
grant select, update, delete on public.used_items to authenticated;
grant all on public.used_items to service_role;

drop policy if exists "used select" on public.used_items;
create policy "used select" on public.used_items for select to authenticated using (
  user_id = auth.uid()
  or public.has_role(auth.uid(), 'admin')
  or (status = 'approved' and public.is_approved_customer(auth.uid()))
);
drop policy if exists "used admin update" on public.used_items;
create policy "used admin update" on public.used_items for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "used delete own or admin" on public.used_items;
create policy "used delete own or admin" on public.used_items for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.submit_used_item(
  p_title text, p_description text, p_category text, p_condition text, p_price numeric, p_images text[]
) returns uuid language plpgsql security definer set search_path = public
as $$
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
grant execute on function public.submit_used_item(text, text, text, text, numeric, text[]) to authenticated;

create or replace function public.mark_used_sold(p_id uuid)
returns void language plpgsql security definer set search_path = public
as $$ begin
  update public.used_items set status = 'sold', decided_at = now() where id = p_id and user_id = auth.uid() and status = 'approved';
end $$;
grant execute on function public.mark_used_sold(uuid) to authenticated;

-- ---------- 4) الطلبات الإضافية (من خارج المتجر) + طلبات الصيانة ----------
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('outside', 'maintenance')),
  title text not null,                              -- المادة المطلوبة أو الجهاز المراد صيانته
  qty integer not null default 1,
  buy_from text not null default '',                -- مكان الشراء المفضّل (اختياري)
  note text not null default '',
  urgent boolean not null default false,
  image_url text,
  status text not null default 'جديد',
  reply_price numeric,
  reply_note text not null default '',
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.service_requests enable row level security;
grant select, update, delete on public.service_requests to authenticated;
grant all on public.service_requests to service_role;

drop policy if exists "service select" on public.service_requests;
create policy "service select" on public.service_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "service admin update" on public.service_requests;
create policy "service admin update" on public.service_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "service delete" on public.service_requests;
create policy "service delete" on public.service_requests for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') or (user_id = auth.uid() and status = 'جديد'));

create or replace function public.submit_service_request(
  p_kind text, p_title text, p_qty integer, p_buy_from text, p_note text, p_urgent boolean, p_image text
) returns uuid language plpgsql security definer set search_path = public
as $$
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
grant execute on function public.submit_service_request(text, text, integer, text, text, boolean, text) to authenticated;
