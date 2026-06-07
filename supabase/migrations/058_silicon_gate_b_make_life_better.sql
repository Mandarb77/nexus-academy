-- Silicon Covenant Gate B — replace FIELD WORK copy with "Make life better".

update public.tiles
set
  skill_name = 'Gate B · Make life better',
  tile_description = 'Find someone with a real need · design something that improves their daily life · light, sound, motion, or weather sensing',
  recipient_guidance = 'Someone with a real need — light, sound, motion, or weather sensing must improve their daily life.',
  subtitle = 'e.g. a nightlight that shifts color with barometric pressure · a sound alert for someone hard of hearing · a motion sensor for a pet',
  chips = $chips$[
    {"label": "micro:bit", "kind": "platform"},
    {"label": "Arduino unlocked", "kind": "platform"},
    {"label": "soldered", "kind": "technique"}
  ]$chips$::jsonb
where slug = 'silicon-gate-field-work';
