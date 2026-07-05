-- Field Guide · Learn the Tools: Folded Path · Cricut resource cards.

insert into public.learn_tool_resources (guild, title, description, url, status, sort_order)
select
  'Folded',
  'Cuttle.xyz — design and export SVGs for free',
  'Design your vinyl cuts here. Built-in shapes, text, patterns, and emoji. Export as SVG and import directly into Cricut Design Space. Free — no account required to start.',
  'https://cuttle.xyz',
  'approved',
  10
where not exists (
  select 1 from public.learn_tool_resources
  where guild = 'Folded' and url = 'https://cuttle.xyz'
);

insert into public.learn_tool_resources (guild, title, description, url, status, sort_order)
select
  'Folded',
  'The Noun Project — free SVG icons',
  'Thousands of free icons and images as SVGs. Find something that fits your design, download it, and import it into Cricut Design Space or Cuttle. Free basic downloads available without a subscription.',
  'https://thenounproject.com',
  'approved',
  11
where not exists (
  select 1 from public.learn_tool_resources
  where guild = 'Folded' and url = 'https://thenounproject.com'
);
