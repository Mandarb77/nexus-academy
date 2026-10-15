/*
 * Silicon Tile 1 (SIGNAL) — teacher-led MakeCode lesson, this slug only.
 *
 * PatentLedger stays Plan/Work/Record for every other tile. SIGNAL uses three
 * instructional pages in code (bold / lists / inline code) because the DB brief
 * cannot render that formatting.
 */

export const SILICON_SIGNAL_SLUG = 'silicon-01-signal'

export const SILICON_SIGNAL_INBOX_LABEL = 'Silicon 1 demo: ready to watch'

export const SILICON_SIGNAL_TAB_TITLES = {
  1: 'The Code',
  2: 'Connect to the micro:bit',
  3: 'Demonstrate Your Code',
} as const

export function isSiliconSignalLessonTile(tile: { slug?: string | null }): boolean {
  return (tile.slug ?? '').trim() === SILICON_SIGNAL_SLUG
}

export const SILICON_SIGNAL_PAGE_COPY: Record<1 | 2 | 3, string> = {
  1: `**What you're making today**
A micro:bit that does two things:
1. When you **shake** it, the picture on the screen changes.
2. When you press **A**, it plays one sound. When you press **B**, it plays a different sound.

This is how we work with the micro:bit. Everything you build in this guild starts the same way: write it, test it, send it.

**Set up your workspace**
1. Open Chrome and go to **makecode.microbit.org**.
2. Click **New Project**. Name it \`FirstName_LastInitial_shake\` (for example, \`Maya_R_shake\`). Click **Create**.
3. You'll see a grey \`on start\` block and a \`forever\` block. Leave them. You'll add new blocks beside them.

**Part 1: Shake changes the picture**
1. Click **Input** in the toolbox. Drag \`on shake\` onto the empty workspace.
2. Click **Basic**. Drag \`show icon\` and snap it inside \`on shake\`. It clicks into place with a small snap.
3. Click the heart on the block to pick your own picture from the grid.
4. Test it: in the simulator (the micro:bit drawing on the left), click **SHAKE**. Your picture should appear. If nothing happens, check that \`show icon\` is *inside* the \`on shake\` block, not floating next to it.

**Part 2: Button A plays a sound**
1. Click **Input**. Drag \`on button A pressed\` onto the workspace.
2. Click **Music**. Drag \`play tone Middle C for 1 beat\` and snap it inside the \`on button A pressed\` block.
3. Click the note (Middle C) and pick a note for A.
4. Test it: click **A** on the simulator. You should hear the note. If you hear nothing, check your computer's volume.

**Part 3: Button B plays a different sound**
1. Right-click your \`on button A pressed\` block and choose **Duplicate**.
2. Click the dropdown on the new block's header and change **A** to **B**.
3. Change the note to a different one from A.
4. Test it: click **B** on the simulator. It should sound different from A.

**Check your code before moving on**
Your workspace should have exactly three event blocks: \`on shake\`, \`on button A pressed\`, \`on button B pressed\`. Each should have one block inside it. Test all three in the simulator, one after another.

When the code works in the simulator, go to page 2. The simulator proves your code is right. Page 2 puts it on the real micro:bit.`,

  2: `You've proven your code in the simulator. Now you'll put it on the real micro:bit.

**Part 1: Plug it in**
1. Pick up your micro:bit by its edges. Don't squeeze the board or touch the gold strip along the bottom.
2. Find the small USB port on the **top edge**, next to the screen's side.
3. Plug the small end of the USB cable into the micro:bit. Plug the big end into your computer. If your computer only has USB-C ports, ask for an adapter.
4. Check that it has power: a small light on the back near the USB port should turn on. The screen may also show a scrolling message or an old program. That's normal.
5. If nothing lights up, try a different USB port. If that doesn't help, try a different cable. Some cables only charge and can't carry data.

**Part 2: Connect MakeCode to it**
1. Go back to your project in **makecode.microbit.org** (use Chrome).
2. Next to the **Download** button at the bottom, click the small **...** button.
3. Click **Connect device**. Follow the pop-up and click **Next** until you see a list.
4. Choose **BBC micro:bit CMSIS-DAP** and click **Connect**.
5. You've connected when the Download button changes to show your micro:bit's name or a small USB mark. You only do this once per computer.

**Part 3: Send your code**
1. Click **Download**.
2. Watch the light on the back of the micro:bit. It flashes while your code is loading. **Don't unplug anything while it flashes.**
3. When the flashing stops, your program starts on its own.
4. If MakeCode saves a file to your Downloads folder instead of sending it, use the fix below.

**If it won't connect: the drag-and-drop fix**
1. Click **Download**. A file ending in \`.hex\` lands in your Downloads folder.
2. Open your computer's file browser. Look for a drive called **MICROBIT**.
3. Drag the \`.hex\` file onto **MICROBIT**.
4. Wait for the light on the back to stop flashing. Your code is now on the micro:bit.

**Still stuck? Try these, in order**
1. Unplug the micro:bit and plug it back in.
2. Close other MakeCode tabs, then refresh the page.
3. Make sure you're using Chrome.
4. Try another USB port.
5. Raise your hand.

**Check your work before moving on**
Without touching the computer, try all three on the real micro:bit:
- **Shake it.** Your picture appears.
- **Press A.** One sound plays.
- **Press B.** A different sound plays.

If all three work, go to page 3. If one doesn't, go back to page 1, fix that block, and download again.`,

  3: `Your micro:bit works. Now show it.

**Get ready**
1. Make sure your micro:bit is still plugged in or running, and your code is on it.
2. Hold the micro:bit in your hand with the screen facing up. The sound comes from the micro:bit itself, not your computer.

**Part 1: Say it first**
Before you press anything, tell your teacher what it's going to do, in your own words. For example: "When I shake it, the screen changes to a heart. A plays a low note. B plays a high one." Say it once, out loud, then do it.

**Part 2: Show all three, in order**
1. **Shake** the micro:bit. Show your teacher the picture.
2. Press **A**. Let the sound play all the way through.
3. Press **B**. Let the sound play all the way through.
4. Do all three again, so your teacher can see it wasn't a fluke.

**Part 3: Answer one question**
Your teacher will ask you one thing about your code. You might be asked:
- "Show me the block that makes it play a sound."
- "What would you change to make B play a different note?"
- "What happens if you shake it twice?"

Point to the block on your screen if you need to. You don't need the perfect words.

**If it doesn't match what you said**
That's useful, not a failure. The micro:bit does exactly what you told it, not what you meant. Look at your code, find the difference between what you said and what it did, fix it, download again, and show it once more.

**When your teacher signs off**
You've finished this challenge. Your teacher will mark it done, and you can go on to the next one.`,
}
