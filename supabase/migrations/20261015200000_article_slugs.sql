-- Public article URLs use a stable title-derived slug (see shared/utils/slugify.mjs).

alter table public.articles add column if not exists slug text;

-- One-time backfill approximating slugifyGreek; create path uses the JS helper.
create or replace function public._tmp_slugify_greek(input text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
  word text;
  words text[];
  out_parts text[] := '{}';
  i int;
  pair text;
  next_ch text;
  ch text;
  piece text;
  voiced boolean;
  word_out text;
begin
  if input is null or btrim(input) = '' then
    return 'article';
  end if;

  s := lower(normalize(input, nfd));
  s := regexp_replace(s, '[' || chr(768) || '-' || chr(879) || ']', '', 'g');
  s := regexp_replace(s, '[''’΄´`ʹ' || chr(884) || chr(900) || chr(697) || chr(700) || ']', ' ', 'g');

  select coalesce(array_agg(m[1]), '{}')
  into words
  from regexp_matches(s, '[0-9a-zα-ωϊϋς]+', 'g') as m;

  if words is null or cardinality(words) = 0 then
    return 'article';
  end if;

  foreach word in array words loop
    word_out := '';
    i := 1;
    while i <= char_length(word) loop
      pair := substring(word from i for 2);
      next_ch := substring(word from i + 2 for 1);
      piece := null;

      if pair = 'ου' then
        piece := 'ou';
        i := i + 2;
      elsif pair in ('γγ', 'γκ') then
        piece := case when i = 1 and pair = 'γκ' then 'gk' else 'ng' end;
        i := i + 2;
      elsif pair = 'γξ' then
        piece := 'nx';
        i := i + 2;
      elsif pair = 'γχ' then
        piece := 'nch';
        i := i + 2;
      elsif pair = 'μπ' then
        piece := case when i = 1 then 'b' else 'mp' end;
        i := i + 2;
      elsif pair = 'ντ' then
        piece := 'nt';
        i := i + 2;
      elsif pair in ('αυ', 'ευ', 'ηυ') then
        voiced := next_ch <> '' and next_ch = any (array['α','ε','η','ι','ο','υ','ω','β','γ','δ','ζ','λ','μ','ν','ρ']);
        piece := case
          when left(pair, 1) = 'α' then 'a'
          when left(pair, 1) = 'ε' then 'e'
          else 'i'
        end || case when voiced then 'v' else 'f' end;
        i := i + 2;
      else
        ch := substring(word from i for 1);
        piece := case ch
          when 'α' then 'a' when 'β' then 'v' when 'γ' then 'g' when 'δ' then 'd'
          when 'ε' then 'e' when 'ζ' then 'z' when 'η' then 'i' when 'θ' then 'th'
          when 'ι' then 'i' when 'κ' then 'k' when 'λ' then 'l' when 'μ' then 'm'
          when 'ν' then 'n' when 'ξ' then 'x' when 'ο' then 'o' when 'π' then 'p'
          when 'ρ' then 'r' when 'σ' then 's' when 'ς' then 's' when 'τ' then 't'
          when 'υ' then 'y' when 'φ' then 'f' when 'χ' then 'ch' when 'ψ' then 'ps'
          when 'ω' then 'o' when 'ϊ' then 'i' when 'ϋ' then 'y'
          else ch
        end;
        i := i + 1;
      end if;

      word_out := word_out || piece;
    end loop;

    if word_out <> '' then
      out_parts := array_append(out_parts, word_out);
    end if;
  end loop;

  if cardinality(out_parts) = 0 then
    return 'article';
  end if;
  return array_to_string(out_parts, '-');
end;
$$;

with prepared as (
  select
    id,
    public._tmp_slugify_greek(title) as base
  from public.articles
  where slug is null or slug = ''
),
ranked as (
  select
    id,
    base,
    row_number() over (partition by base order by id) as rn
  from prepared
)
update public.articles a
set slug = case
  when r.rn = 1 then r.base
  else r.base || '-' || r.rn::text
end
from ranked r
where a.id = r.id;

update public.articles
set slug = 'article-' || replace(id::text, '-', '')
where slug is null or slug = '';

alter table public.articles alter column slug set not null;

create unique index if not exists articles_slug_key on public.articles (slug);

drop function if exists public._tmp_slugify_greek(text);

notify pgrst, 'reload schema';
