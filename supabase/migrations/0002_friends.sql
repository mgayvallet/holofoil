-- Holofoil : amis

create table public.friendships (
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- Une seule relation par paire, quel que soit le sens
create unique index friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;
create policy "mes amitiés" on public.friendships for select
  using (auth.uid() = requester or auth.uid() = addressee);

-- Envoi atomique : si l'autre joueur avait déjà demandé, l'amitié est acceptée
create or replace function public.send_friend_request(p_from uuid, p_to uuid, p_max int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  f friendships%rowtype;
  n int;
begin
  if p_from = p_to then raise exception 'FRIEND_INVALID: soi-même'; end if;
  perform 1 from profiles where id = p_to;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into f from friendships
    where (requester = p_from and addressee = p_to) or (requester = p_to and addressee = p_from)
    for update;
  if found then
    if f.status = 'accepted' then raise exception 'FRIEND_INVALID: déjà amis'; end if;
    if f.requester = p_from then raise exception 'FRIEND_INVALID: déjà envoyée'; end if;
    update friendships set status = 'accepted' where requester = p_to and addressee = p_from;
    return 'accepted';
  end if;

  select count(*) into n from friendships where requester = p_from or addressee = p_from;
  if n >= p_max then raise exception 'FRIEND_INVALID: liste pleine'; end if;
  insert into friendships (requester, addressee) values (p_from, p_to);
  return 'sent';
end $$;

revoke execute on function public.send_friend_request(uuid, uuid, int) from public, anon, authenticated;
