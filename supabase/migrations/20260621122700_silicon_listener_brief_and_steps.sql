-- Silicon Covenant LISTENER: quest brief + seven checklist steps.

update public.tiles
set
  tile_description = $desc$SIGNAL was simple: you told the device what to do, it did it. The world didn't have a say.

LISTENER is different. Now the device is paying attention to something — a sound, a touch, a light level, a temperature. When the condition is met, it responds. One sensor, one output, one loop. The logic is still simple. But now the device is reacting to the world instead of just announcing itself.

The connection between the input and the output has to make sense for the person it's for. A light sensor that triggers a sound for no reason is a demonstration. A light sensor that tells someone their plant needs more sun is a device. The sensor serves the recipient — not the other way around.

Breadboard still fine. The behavior is still what matters.$desc$,
  steps = $steps$[
    {"description": "Name the person, the sensor you're using, and what the device will do when the condition is met — write it in your journal before opening MakeCode.", "requiresApproval": false},
    {"description": "Connect your sensor to the micro:bit. Check the MakeCode reference if you're not sure which pins to use.", "requiresApproval": false},
    {"description": "Build the input-output loop in MakeCode — when this happens, do that.", "requiresApproval": false},
    {"description": "Upload and test. Does the device respond when you expect it to? Does it ignore you when it shouldn't be responding?", "requiresApproval": false},
    {"description": "Adjust the threshold or the logic until the behavior matches your intention — not just sometimes, reliably.", "requiresApproval": false},
    {"description": "Give it to the person it's for.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-02-listener';
