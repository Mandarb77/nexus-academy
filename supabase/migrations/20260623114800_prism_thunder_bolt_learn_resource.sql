insert into public.learn_tool_resources (
  guild,
  title,
  description,
  url,
  status,
  sort_order
)
select
  'Prism',
  'Thunder Bolt Laser — official tutorial videos',
  'Official tutorials from Thunder Laser USA covering setup, LightBurn software, and cutting techniques for the Thunder Bolt laser.',
  'https://www.thunderlaserusa.com/learn-bolt/',
  'approved',
  4
where not exists (
  select 1
  from public.learn_tool_resources
  where guild = 'Prism'
    and url = 'https://www.thunderlaserusa.com/learn-bolt/'
);
