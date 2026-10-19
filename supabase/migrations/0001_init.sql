-- Holofoil : schéma initial
-- Toutes les mutations de jeu passent par le serveur Next.js (clé service_role)
-- via les fonctions ci-dessous. Les clients n'ont qu'un accès en lecture (RLS).

-- ============ Tables ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  avatar text,
  booster_anchor timestamptz not null default now() - interval '150 minutes', -- réserve pleine (15) à la création
  bonus_boosters int not null default 0 check (bonus_boosters >= 0),
  created_at timestamptz not null default now()
);

create table public.wallet (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins int not null default 200 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create table public.user_cards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null,
  set_id text not null,
  quantity int not null check (quantity >= 0),
  first_obtained_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create index user_cards_set_idx on public.user_cards (user_id, set_id);

create table public.openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  set_id text not null,
  cards jsonb not null,
  value int not null,
  source text not null check (source in ('free', 'bonus')),
  created_at timestamptz not null default now()
);
create index openings_user_idx on public.openings (user_id, created_at desc);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  offer_card_id text not null,
  request_card_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'failed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (from_user <> to_user)
);
create index trades_from_idx on public.trades (from_user, created_at desc);
create index trades_to_idx on public.trades (to_user, created_at desc);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  items jsonb not null,
  earned int not null,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Cache serveur des données TCGdex (sets, cartes)
create table public.tcg_cache (
  key text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ============ RLS : lecture seule côté client ============

alter table public.profiles enable row level security;
alter table public.wallet enable row level security;
alter table public.user_cards enable row level security;
alter table public.openings enable row level security;
alter table public.trades enable row level security;
alter table public.sales enable row level security;
alter table public.user_achievements enable row level security;
alter table public.tcg_cache enable row level security;

create policy "profils publics" on public.profiles for select using (true);
create policy "collections publiques" on public.user_cards for select using (true);
create policy "succès publics" on public.user_achievements for select using (true);
create policy "mon portefeuille" on public.wallet for select using (auth.uid() = user_id);
create policy "mes ouvertures" on public.openings for select using (auth.uid() = user_id);
create policy "mes ventes" on public.sales for select using (auth.uid() = user_id);
create policy "mes échanges" on public.trades for select
  using (auth.uid() = from_user or auth.uid() = to_user);
-- tcg_cache : aucune policy => accessible uniquement via service_role

-- ============ Fonctions de jeu (atomiques) ============

-- Ouverture d'un booster : consomme un booster (gratuit puis bonus),
-- ajoute les cartes, journalise. Renvoie l'id de l'ouverture et les cartes nouvelles.
create or replace function public.commit_opening(
  p_user uuid,
  p_set_id text,
  p_cards jsonb,          -- [{ "cardId": "...", ... }] (DrawnCard[])
  p_value int,
  p_interval_seconds int,
  p_max int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_anchor timestamptz;
  v_bonus int;
  v_avail int;
  v_source text;
  v_card jsonb;
  v_card_id text;
  v_new text[] := '{}';
  v_inserted boolean;
  v_opening uuid;
  v_interval interval := make_interval(secs => p_interval_seconds);
begin
  select booster_anchor, bonus_boosters into v_anchor, v_bonus
    from profiles where id = p_user for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  v_avail := least(p_max, floor(extract(epoch from (now() - v_anchor)) / p_interval_seconds)::int);
  if v_avail >= 1 then
    update profiles
      set booster_anchor = greatest(v_anchor, now() - v_interval * p_max) + v_interval
      where id = p_user;
    v_source := 'free';
  elsif v_bonus > 0 then
    update profiles set bonus_boosters = bonus_boosters - 1 where id = p_user;
    v_source := 'bonus';
  else
    raise exception 'NO_BOOSTER';
  end if;

  for v_card in select * from jsonb_array_elements(p_cards) loop
    v_card_id := v_card->>'cardId';
    insert into user_cards (user_id, card_id, set_id, quantity)
      values (p_user, v_card_id, p_set_id, 1)
      on conflict (user_id, card_id) do update set quantity = user_cards.quantity + 1
      returning (xmax = 0) into v_inserted;
    -- xmax = 0 <=> la ligne vient d'être insérée : carte obtenue pour la 1re fois
    if v_inserted then v_new := array_append(v_new, v_card_id); end if;
  end loop;

  insert into openings (user_id, set_id, cards, value, source)
    values (p_user, p_set_id, p_cards, p_value, v_source)
    returning id into v_opening;

  return jsonb_build_object('openingId', v_opening, 'source', v_source, 'newCardIds', to_jsonb(v_new));
end $$;

-- Vente de doublons : on garde toujours au moins 1 exemplaire
create or replace function public.sell_cards(p_user uuid, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_qty int;
  v_earned int := 0;
  v_coins int;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty < 1 then raise exception 'NOT_ENOUGH_CARDS'; end if;
    update user_cards set quantity = quantity - v_qty
      where user_id = p_user and card_id = v_item->>'cardId' and quantity - v_qty >= 1;
    if not found then raise exception 'NOT_ENOUGH_CARDS'; end if;
    v_earned := v_earned + v_qty * (v_item->>'unitPrice')::int;
  end loop;

  update wallet set coins = coins + v_earned, updated_at = now()
    where user_id = p_user returning coins into v_coins;
  insert into sales (user_id, items, earned) values (p_user, p_items, v_earned);
  return jsonb_build_object('earned', v_earned, 'coins', v_coins);
end $$;

create or replace function public.buy_bonus_booster(p_user uuid, p_price int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update wallet set coins = coins - p_price, updated_at = now()
    where user_id = p_user and coins >= p_price;
  if not found then raise exception 'NOT_ENOUGH_COINS'; end if;
  update profiles set bonus_boosters = bonus_boosters + 1 where id = p_user;
end $$;

-- Acceptation / refus d'un échange par le destinataire
create or replace function public.respond_trade(p_trade uuid, p_user uuid, p_accept boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  t trades%rowtype;
begin
  select * into t from trades where id = p_trade for update;
  if not found or t.to_user <> p_user or t.status <> 'pending' then
    raise exception 'TRADE_INVALID';
  end if;

  if not p_accept then
    update trades set status = 'declined', resolved_at = now() where id = p_trade;
    return 'declined';
  end if;

  -- Verrouille les deux lignes de cartes puis vérifie la possession
  perform 1 from user_cards
    where (user_id = t.from_user and card_id = t.offer_card_id)
       or (user_id = t.to_user and card_id = t.request_card_id)
    for update;

  update user_cards set quantity = quantity - 1
    where user_id = t.from_user and card_id = t.offer_card_id and quantity >= 1;
  if not found then
    update trades set status = 'failed', resolved_at = now() where id = p_trade;
    return 'failed';
  end if;
  update user_cards set quantity = quantity - 1
    where user_id = t.to_user and card_id = t.request_card_id and quantity >= 1;
  if not found then
    raise exception 'TRADE_INVALID'; -- annule aussi la décrémentation précédente
  end if;

  -- Le set "de classeur" est repris de la ligne du donneur (les sous-sets y sont déjà rattachés)
  insert into user_cards (user_id, card_id, set_id, quantity)
    values (t.to_user, t.offer_card_id,
      (select set_id from user_cards where user_id = t.from_user and card_id = t.offer_card_id), 1)
    on conflict (user_id, card_id) do update set quantity = user_cards.quantity + 1;
  insert into user_cards (user_id, card_id, set_id, quantity)
    values (t.from_user, t.request_card_id,
      (select set_id from user_cards where user_id = t.to_user and card_id = t.request_card_id), 1)
    on conflict (user_id, card_id) do update set quantity = user_cards.quantity + 1;

  delete from user_cards where user_id in (t.from_user, t.to_user) and quantity = 0;
  update trades set status = 'accepted', resolved_at = now() where id = p_trade;
  return 'accepted';
end $$;

-- Agrégats pour le classement
create or replace function public.leaderboard_rows()
returns table (user_id uuid, set_id text, uniq bigint, total bigint)
language sql stable security definer set search_path = public as $$
  select user_id, set_id, count(*) filter (where quantity > 0), coalesce(sum(quantity), 0)
  from user_cards group by user_id, set_id
$$;

-- Les fonctions de jeu ne sont appelables que par le serveur (service_role)
revoke execute on function public.commit_opening(uuid, text, jsonb, int, int, int) from public, anon, authenticated;
revoke execute on function public.sell_cards(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.buy_bonus_booster(uuid, int) from public, anon, authenticated;
revoke execute on function public.respond_trade(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.leaderboard_rows() from public, anon, authenticated;
