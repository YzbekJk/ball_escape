-- Аккаунты (ник + пароль) и лидерборды для сайта. Вставить целиком в Supabase → SQL Editor → Run.
-- Таблицы закрыты (RLS без политик): с сайта к ним можно обращаться только через функции lb_* ниже.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id         bigint generated always as identity primary key,
  nick       text not null,
  nick_lc    text generated always as (lower(nick)) stored unique,
  pass_hash  text not null,
  token      text not null unique,
  created_at timestamptz not null default now(),
  is_creator boolean not null default false      -- красная галочка «Создатель»; выдаётся только вручную через SQL
);
alter table public.players add column if not exists is_creator boolean not null default false;

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
  ('rotten-bus', 'low',  30,  36000),
  ('svetofor',   'high', 0,   5000),
  ('trampolines','high', 0,   100000),
  ('peach-drop', 'high', 0,   1000000000),
  ('bank',       'high', 0,   5000)
on conflict (game) do update set better = excluded.better, min_v = excluded.min_v, max_v = excluded.max_v;

-- ---------- регистрация ----------
create or replace function public.lb_register(p_nick text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare n text := btrim(p_nick); tok text := encode(gen_random_bytes(24), 'hex');
begin
  if n !~ '^[A-Za-zА-Яа-яЁё0-9_ .-]{3,16}$' then return json_build_object('error', 'Ник: 3–16 символов (буквы, цифры, _ . -)'); end if;
  if length(coalesce(p_pass, '')) < 4 or length(p_pass) > 72 then return json_build_object('error', 'Пароль: от 4 до 72 символов'); end if;
  if exists (select 1 from players where nick_lc = lower(n)) then return json_build_object('error', 'Такой ник уже занят'); end if;
  insert into players (nick, pass_hash, token) values (n, crypt(p_pass, gen_salt('bf')), tok);
  return json_build_object('token', tok, 'nick', n);
end $fn$;

-- ---------- вход ----------
create or replace function public.lb_login(p_nick text, p_pass text) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare r players%rowtype;
begin
  select * into r from players where nick_lc = lower(btrim(p_nick));
  if not found or r.pass_hash <> crypt(coalesce(p_pass, ''), r.pass_hash) then return json_build_object('error', 'Неверный ник или пароль'); end if;
  return json_build_object('token', r.token, 'nick', r.nick, 'creator', r.is_creator);   -- токен постоянный: можно играть с нескольких устройств
end $fn$;

-- ---------- проверка токена ----------
create or replace function public.lb_whoami(p_token text) returns json
language sql security definer set search_path = public, extensions as $fn$
  select coalesce((select json_build_object('nick', nick, 'creator', is_creator) from players where token = p_token), json_build_object('error', 'bad token'));
$fn$;

-- ---------- отправка результата (сохраняется только лучший) ----------
create or replace function public.lb_submit(p_token text, p_game text, p_value numeric) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint; g games%rowtype; old numeric; improved boolean := false;
begin
  select id into pid from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  select * into g from games where game = p_game;
  if not found then return json_build_object('error', 'Неизвестная игра'); end if;
  if exists (select 1 from scores where player_id = pid and updated_at > now() - interval '2 seconds') then return json_build_object('error', 'Слишком часто, подождите пару секунд'); end if;
  if p_value is null or p_value < g.min_v or p_value > g.max_v then return json_build_object('error', 'Результат вне допустимых пределов'); end if;
  select best into old from scores where player_id = pid and game = p_game;
  if old is null then
    insert into scores (player_id, game, best) values (pid, p_game, p_value); improved := true;
  else
    improved := (g.better = 'high' and p_value > old) or (g.better = 'low' and p_value < old);
    update scores set plays = plays + 1, best = case when improved then p_value else best end, updated_at = now() where player_id = pid and game = p_game;
  end if;
  return json_build_object('ok', true, 'improved', improved);
end $fn$;

-- ---------- таблица лидеров + место игрока ----------
create or replace function public.lb_top(p_game text, p_limit int default 20, p_token text default null) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare g games%rowtype; rows json; me json; pid bigint;
begin
  select * into g from games where game = p_game;
  if not found then return json_build_object('error', 'Неизвестная игра'); end if;
  p_limit := least(greatest(coalesce(p_limit, 20), 1), 100);
  with ranked as (
    select p.id, p.nick, p.is_creator, s.best,
           rank() over (order by case when g.better = 'high' then -s.best else s.best end, s.updated_at) as rnk
    from scores s join players p on p.id = s.player_id where s.game = p_game
  )
  select coalesce(json_agg(json_build_object('rank', rnk, 'nick', nick, 'best', best, 'creator', is_creator) order by rnk), '[]'::json) into rows
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
end $fn$;

-- доступ с сайта (anon-ключ) — только к функциям
grant usage on schema public to anon, authenticated;
revoke all on function public.lb_register(text, text), public.lb_login(text, text), public.lb_whoami(text),
  public.lb_submit(text, text, numeric), public.lb_top(text, int, text) from public;
grant execute on function public.lb_register(text, text), public.lb_login(text, text), public.lb_whoami(text),
  public.lb_submit(text, text, numeric), public.lb_top(text, int, text) to anon, authenticated;

-- ---------- прогресс игр (сохранение уровня в аккаунте) ----------
create table if not exists public.progress (
  player_id  bigint not null references public.players(id) on delete cascade,
  game       text   not null,
  value      numeric not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, game)
);
alter table public.progress enable row level security;

create or replace function public.lb_progress_set(p_token text, p_game text, p_value numeric) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint;
begin
  select id into pid from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  if p_game is null or length(p_game) > 40 or p_value is null or p_value < 0 or p_value > 1000000 then return json_build_object('error', 'Недопустимое значение'); end if;
  insert into progress (player_id, game, value) values (pid, p_game, p_value)
    on conflict (player_id, game) do update set value = excluded.value, updated_at = now();
  return json_build_object('ok', true);
end $fn$;

create or replace function public.lb_progress_get(p_token text, p_game text) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint; v numeric;
begin
  select id into pid from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  select value into v from progress where player_id = pid and game = p_game;
  return json_build_object('value', v);
end $fn$;

revoke all on function public.lb_progress_set(text, text, numeric), public.lb_progress_get(text, text) from public;
grant execute on function public.lb_progress_set(text, text, numeric), public.lb_progress_get(text, text) to anon, authenticated;

-- обновить кэш API, чтобы новые функции сразу стали видны сайту
notify pgrst, 'reload schema';


-- ---------- библиотека MIDI-мелодий сообщества ----------
-- Хранится только компактная мелодия (JSON: ноты и паузы), не сам файл: обычно 1–10 КБ.
-- Лимиты, чтобы не переполнить базу: до 40 КБ на мелодию, до 15 мелодий на игрока, до 3000 мелодий всего.
create table if not exists public.midis (
  id         bigint generated always as identity primary key,
  player_id  bigint not null references public.players(id) on delete cascade,
  title      text not null,
  data       text not null,
  notes      int  not null,
  downloads  int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists midis_created on public.midis (created_at desc);
create index if not exists midis_downloads on public.midis (downloads desc);
alter table public.midis enable row level security;

create or replace function public.midi_upload(p_token text, p_title text, p_data text) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint; v jsonb; cnt int; t text := btrim(coalesce(p_title, '')); new_id bigint;
begin
  select id into pid from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  if char_length(t) < 1 or char_length(t) > 40 then return json_build_object('error', 'Название: от 1 до 40 символов'); end if;
  if p_data is null or char_length(p_data) > 40000 then return json_build_object('error', 'Мелодия слишком большая'); end if;
  begin v := p_data::jsonb; exception when others then return json_build_object('error', 'Неверный формат мелодии'); end;
  if jsonb_typeof(v) <> 'object' or jsonb_typeof(v->'n') <> 'array' or jsonb_typeof(v->'d') <> 'array' then return json_build_object('error', 'Неверный формат мелодии'); end if;
  cnt := jsonb_array_length(v->'n');
  if cnt < 2 or cnt > 3000 or cnt <> jsonb_array_length(v->'d') then return json_build_object('error', 'Нот должно быть от 2 до 3000'); end if;
  if exists (select 1 from jsonb_array_elements(v->'n') e where jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric not between 0 and 127)
     or exists (select 1 from jsonb_array_elements(v->'d') e where jsonb_typeof(e) <> 'number' or (e #>> '{}')::numeric not between 0 and 1000) then
    return json_build_object('error', 'Неверные значения нот');
  end if;
  if (select count(*) from midis where player_id = pid) >= 15 then return json_build_object('error', 'У вас уже 15 мелодий — удалите старую'); end if;
  if (select count(*) from midis) >= 3000 then return json_build_object('error', 'Библиотека заполнена'); end if;
  if exists (select 1 from midis where player_id = pid and created_at > now() - interval '10 seconds') then return json_build_object('error', 'Слишком часто, подождите немного'); end if;
  insert into midis (player_id, title, data, notes) values (pid, t, jsonb_build_object('n', v->'n', 'd', v->'d')::text, cnt) returning id into new_id;
  return json_build_object('ok', true, 'id', new_id);
end $fn$;

create or replace function public.midi_list(p_sort text default 'new', p_limit int default 40, p_token text default null) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint; rows json;
begin
  select id into pid from players where token = p_token;
  p_limit := least(greatest(coalesce(p_limit, 40), 1), 100);
  select coalesce(json_agg(json_build_object('id', id, 'title', title, 'nick', nick, 'creator', is_creator, 'notes', notes, 'downloads', downloads, 'mine', (player_id = pid)) order by ord), '[]'::json) into rows
  from (
    select m.id, m.title, p.nick, p.is_creator, m.notes, m.downloads, m.player_id,
           row_number() over (order by case when p_sort = 'top' then m.downloads end desc nulls last, m.created_at desc) as ord
    from midis m join players p on p.id = m.player_id
    order by ord limit p_limit
  ) t;
  return json_build_object('rows', rows);
end $fn$;

create or replace function public.midi_get(p_id bigint) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare d text; t text;
begin
  update midis set downloads = downloads + 1 where id = p_id returning data, title into d, t;
  if d is null then return json_build_object('error', 'Мелодия не найдена'); end if;
  return json_build_object('title', t, 'data', d);
end $fn$;

create or replace function public.midi_delete(p_token text, p_id bigint) returns json
language plpgsql security definer set search_path = public, extensions as $fn$
declare pid bigint; creator boolean;
begin
  select id, is_creator into pid, creator from players where token = p_token;
  if pid is null then return json_build_object('error', 'Нужно войти в аккаунт'); end if;
  delete from midis where id = p_id and (player_id = pid or creator);
  if not found then return json_build_object('error', 'Нельзя удалить эту мелодию'); end if;
  return json_build_object('ok', true);
end $fn$;

revoke all on function public.midi_upload(text, text, text), public.midi_list(text, int, text), public.midi_get(bigint), public.midi_delete(text, bigint) from public;
grant execute on function public.midi_upload(text, text, text), public.midi_list(text, int, text), public.midi_get(bigint), public.midi_delete(text, bigint) to anon, authenticated;

-- ---------- защита таблиц ----------
-- Таблицы закрыты полностью: RLS включён, политик нет, прямые права у anon/authenticated отняты.
-- С сайта можно работать только через функции lb_* и midi_* (security definer), которые проверяют токен и пределы значений.
-- НЕ добавляйте политику «SELECT для всех» на players: там хэши паролей и токены входа.
alter table public.players  force row level security;
alter table public.games    force row level security;
alter table public.scores   force row level security;
alter table public.progress force row level security;
alter table public.midis    force row level security;
revoke all on public.players, public.games, public.scores, public.progress, public.midis from anon, authenticated;
