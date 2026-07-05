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
      'In this guild you will work with the Thunder Bolt laser and LightBurn to cut, score, and engrave with precision on wood, acrylic, and cardstock.',
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
  void: {
    orderName: 'Void Navigators',
    sentences: [
      'In this guild you will work with Carbide Create and the CNC to v-carve, pocket, and inlay wood and Delrin for real recipients.',
      'Your tools are feed and depth, joint fit, and the discipline to simulate before you cut the real thing.',
    ],
  },
}
