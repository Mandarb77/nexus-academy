/*
 * Flavor text for deep-linked guild skill trees (`/tree/forge`, `/tree/prism`, …)
 *
 * Separated from React components so teachers can rewrite lore without touching layout
 * code. Only a subset of slugs have blocks today; unknown slugs fall back to generic UI
 * in `GuildSkillTreePage`.
 */

export type GuildWelcomeSlug = 'forge' | 'prism' | 'folded' | 'void'

export type GuildWelcomeBlock = {
  /** Display name (e.g. Forge Covenant) */
  orderName: string
  sentences: [string, string]
}

export const GUILD_WELCOME_BY_SLUG: Partial<Record<GuildWelcomeSlug, GuildWelcomeBlock>> = {
  forge: {
    orderName: 'Forge Covenant',
    sentences: [
      'In this guild you will work with 3D printers and TinkerCAD to design and print objects that exist nowhere else in the world.',
      'Your tools are patience, iteration, and the ability to think in three dimensions.',
    ],
  },
  prism: {
    orderName: 'Prism Order',
    sentences: [
      'In this guild you will work with the Glowforge laser cutter and Cuttle to cut, score, and engrave with precision on wood, acrylic, and cardstock.',
      'Your tools are accuracy, design thinking, and an eye for what light does to a material.',
    ],
  },
  folded: {
    orderName: 'Folded Path',
    sentences: [
      'In this guild you will work with the Cricut, Piskel, and Cricut Design Space to cut vinyl, print stickers, and make things that carry your design into the world on objects people actually use.',
      'Your tools are color, pattern, and the courage to make something someone will wear or display.',
    ],
  },
  /* Shown on `/tree/void` when proto email gate passes (voidProtoAccess.ts). */
  void: {
    orderName: 'Void Navigators',
    sentences: [
      'In this guild you will make profile-cut gifts for real people and pets — coasters, holders, and parts that must fit something in the world.',
      'Your tools are observation, tolerance, and the discipline to test on scrap before you cut the real thing.',
    ],
  },
}
