-- Silicon Covenant UNDER THE SURFACE: quest brief + nine checklist steps.

update public.tiles
set
  tile_description = $desc$You already made something for this person. It worked — or mostly worked. You gave it away and moved on.

This one asks you to go back.

Not to add features. Not to make it bigger or more impressive. To make it better at the thing it was already trying to do. Cleaner code. A more reliable threshold. An enclosure that actually fits. A behavior that serves the recipient more precisely now that you know them better than you did when you started.

The improvement has to be deliberate — you name what was wrong, you name what you changed, and you name why the change makes it better for this specific person. "I rebuilt it" is not enough. "I rebuilt it because the threshold was too sensitive for the way she actually uses it" is.

Same recipient. Same job. Better device.$desc$,
  steps = $steps$[
    {"description": "Choose a prior project to rebuild. Name what specifically wasn't good enough — write it in your journal before opening anything.", "requiresApproval": false},
    {"description": "Name the improvement you're going to make and why it serves the recipient better than the original did.", "requiresApproval": false},
    {"description": "Open the original MakeCode project. Read the code before changing anything.", "requiresApproval": false},
    {"description": "Make the specific improvement you named. Don't add new features — fix the thing you identified.", "requiresApproval": false},
    {"description": "Test the improved behavior against the original problem. Is it actually better, or just different?", "requiresApproval": false},
    {"description": "If the enclosure needs improving too, rebuild it. Same standard: deliberate, named, better for this person.", "requiresApproval": false},
    {"description": "Solder if not already soldered.", "requiresApproval": false},
    {"description": "Return it to the recipient or give them the improved version.", "requiresApproval": false},
    {"description": "Photograph the finished device with the person it's for.", "requiresApproval": false}
  ]$steps$::jsonb
where slug = 'silicon-05-under-the-surface';
