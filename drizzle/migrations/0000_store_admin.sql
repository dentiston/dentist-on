create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

-- first account to sign up becomes the admin
create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.assign_first_admin();

create table public.products (
  id text primary key,
  name text not null,
  brand text not null default '',
  category text not null default 'أدوات يدوية',
  price numeric not null default 0,
  bulk_price numeric not null default 0,
  image text not null default 'instruments',
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read active" on public.products for select using (active or public.has_role(auth.uid(),'admin'));
create policy "admin insert" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update" on public.products for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  items jsonb not null default '[]',
  total numeric not null default 0,
  status text not null default 'جديد',
  created_at timestamptz not null default now()
);
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "anyone can place order" on public.orders for insert to anon, authenticated with check (true);
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.products (id,name,brand,category,price,bulk_price,image,description) values
('exam-kit','طقم أدوات فحص (مرآة، مسبر، ملقط)','DentPro','أدوات يدوية',18,15,'instruments','ستانلس ستيل طبي قابل للتعقيم بالأوتوكلاف، مقابض مخرشة لثبات أعلى.'),
('composite-kit','كمبوزيت ضوئي — طقم 5 ألوان','Restora','مواد ترميمية',65,55,'composite','كمبوزيت نانو هجين بألوان A1–B2، تلميع ممتاز ومقاومة عالية للاهتراء.'),
('turbine','قبضة توربين سريعة مع إضاءة LED','TurboDent','قبضات وأجهزة',240,215,'handpiece','رأس سيراميكي، رذاذ رباعي، ضجيج منخفض، وصلة 4 ثقوب.'),
('probe-set','مسابر لثوية مدرجة — 3 قطع','DentPro','أدوات يدوية',22,18,'instruments','تدريج واضح بالليزر لقياس دقيق لعمق الجيوب.'),
('bond','مادة رابطة عالمية 5 مل','Restora','مواد ترميمية',38,32,'composite','رابط من الجيل الثامن، يعمل بتقنيات الحفر الكلي والذاتي.'),
('contra','قبضة زاوية بطيئة 1:1','TurboDent','قبضات وأجهزة',160,140,'handpiece','مناسبة للتحضير والتلميع، متوافقة مع جميع المحركات القياسية.'),
('gloves','قفازات نتريل — علبة 100','SafeHand','تعقيم ووقاية',7,5.5,'instruments','خالية من البودرة واللاتكس، مقاومة عالية للتمزق.'),
('sterile-pouch','أكياس تعقيم ذاتية الإغلاق — 200','SafeHand','تعقيم ووقاية',12,9,'composite','مؤشر لوني للتعقيم، مقاسات متعددة.');