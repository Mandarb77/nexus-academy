-- Rename legacy column cost → gold_cost on gold_purchases (projects that applied 008 before it used gold_cost).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gold_purchases'
      and column_name = 'cost'
  ) then
    alter table public.gold_purchases rename column cost to gold_cost;
  end if;
end $$;
