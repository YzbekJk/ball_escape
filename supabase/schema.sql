-- Аккаунты (ник + пароль) и лидерборды для сайта. Вставить целиком в Supabase → SQL Editor → Run.
-- Таблицы закрыты (RLS без политик): с сайта к ним можно обращаться только через функции lb_* ниже.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id         bigint generated always as identity primary key,
  nick       text not null,
  nick_lc    text generated always as (lower(nick)) stored unique,
  pass_hash  text not null,
  token      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  game   text primary key,
  better text not null check (better in ('high', 'low')),
  min_v  numeric not null,
  max_v  numeric not null
);

create table if not exists public.scores (
  player_id  bigint not null references public.players(id) on delete cascade,
  game       text   not null references public.games(game),
  best       numeric not null,
  plays      int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (player_id, game)
);
create index if not exists scores_game_best on public.scores (game, best);

alter table public.players enable row level security;
alter table public.games   enable row level security;
alter table public.scores  enable row level security;

insert into public.games (game, better, min_v, max_v) values
  ('tetris',     'high', 0,   5000000),
  ('pop-cats',   'high', 0,   2000),
  ('corn-farm',  'high', 0,   1000000000),
  ('rotten-bus', 'low',  30,  36000)
on conflict (game) do update set better = excluded.better, min_v = excluded.min_v, max_v = excluded.max_v;

-- ---------- регистрация ----------
create or replace function public.lb_register(p_nick text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare n text := btrim(p_nick); tok text := encode(gen_random_bytes(24), 'hex');
begin
  if n !~ '^[A-Za-zА-Яа-яЁё0-9_ .-]{3,16}$' then return json_build_object('error', 'Ник: 3–16 символов (буквы, цифры, _ . -)'); end if;
  if length(coalesce(p_pass, '')) < 4 or length(p_pass) > 72 then return json_build_object('error', 'Пароль: от 4 до 72 символов'); end if;
  if exists (select 1 from players where nick_lc = lower(n)) then return json_build_object('error', 'Такой ник уже занят'); end if;
  insert into players (nick, pass_hash, token) values (n, crypt(p_pass, gen_salt('bf')), tok);
  return json_build_object('token', tok, 'nick', n);
end $$;

-- ---------- вход ----------
create or replace function public.lb_login(p_nick text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r players%rowtype;
begin
  select * into r from players where nick_lc = lower(btrim(p_nick));
  if not found or r.pass_hash <> crypt(coalesce(p_pass, ''), r.pass_hash) then return json_build_object('error', 'Неверный ник или пароль'); end if;
  return json_build_object('token', r.token, 'nick', r.nick);   -- токен постоянный: можно играть с нескольких устройств
end $$;

-- ---------- проверка токена ----------
create or replace function public.lb_whoami(p_token text) returns json
language sql security definer set search_path = public, extensions as $$
  select coalesce((select json_build_object('nick', nick) from players where token = p_token), json_build_object('error', 'bad token'));
$$;

-- ---------- отправка результата (сохраняется только лучший) ----------
create or replace function public.lb_submit(p_token text, p_game text, p_value numeric) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare pid bigint; g games%rowtype; old numeric; improved boolean := false;
begin
  select id into pid from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  select * into g from games where game = p_game;
  if not found then return json_build_object('error', 'Неизвестная игра'); end if;
  if p_value is null or p_value < g.min_v or p_value > g.max_v then return json_build_object('error', 'Результат вне допустимых пределов'); end if;
  select best into old from scores where player_id = pid and game = p_game;
  if old is null then
    insert into scores (player_id, game, best) values (pid, p_game, p_value); improved := true;
  else
    improved := (g.better = 'high' and p_value > old) or (g.better = 'low' and p_value < old);
    update scores set plays = plays + 1, best = case when improved then p_value else best end, updated_at = now() where player_id = pid and game = p_game;
  end if;
  return json_build_object('ok', true, 'improved', improved);
end $$;

-- ---------- таблица лидеров + место игрока ----------
create or replace function public.lb_top(p_game text, p_limit int default 20, p_token text default null) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare g games%rowtype; rows json; me json; pid bigint;
begin
  select * into g from games where game = p_game;
  if not found then return json_build_object('error', 'Неизвестная игра'); end if;
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 100);
  with ranked as (
    select p.id, p.nick, s.best,
           rank() over (order by case when g.better = 'high' then -s.best else s.best end, s.updated_at) as rnk
    from scores s join players p on p.id = s.player_id where s.game = p_game
  )
  select coalesce(json_agg(json_build_object('rank', rnk, 'nick', nick, 'best', best) order by rnk), '[]'::json) into rows
  from (select * from ranked order by rnk limit p_limit) t;
  select id into pid from players where token = p_token;
  if pid is not null then
    with ranked as (
      select s.player_id, s.best,
             rank() over (order by case when g.better = 'high' then -s.best else s.best end, s.updated_at) as rnk
      from scores s where s.game = p_game
    )
    select json_build_object('rank', rnk, 'best', best) into me from ranked where player_id = pid;
  end if;
  return json_build_object('better', g.better, 'rows', rows, 'me', me);
end $$;

-- доступ с сайта (anon-ключ) — только к функциям
revoke all on function public.lb_register(text, text), public.lb_login(text, text), public.lb_whoami(text),
  public.lb_submit(text, text, numeric), public.lb_top(text, int, text) from public;
grant execute on function public.lb_register(text, text), public.lb_login(text, text), public.lb_whoami(text),
  public.lb_submit(text, text, numeric), public.lb_top(text, int, text) to anon, authenticated;

-- обновить кэш API, чтобы новые функции сразу стали видны сайту
notify pgrst, 'reload schema';
