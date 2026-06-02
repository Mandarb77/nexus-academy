/*
 * Guild banner images — used on per-guild quest home pages as small thumbnails.
 * Main nav / guild list uses SVG marks (`GuildMark`) instead of these assets.
 */

import forgeBanner from '../assets/forge-banner.png'
import prismBanner from '../assets/prism-banner.png'
import foldedBanner from '../assets/folded-banner.png'
import siliconBanner from '../assets/silicon-banner.png'
import voidBanner from '../assets/void-banner.png'
import type { GuildMarkSlug } from '../components/GuildMark'

export function guildBannerSrc(slug: GuildMarkSlug): string | null {
  if (slug === 'forge') return forgeBanner
  if (slug === 'prism') return prismBanner
  if (slug === 'folded') return foldedBanner
  if (slug === 'silicon') return siliconBanner
  if (slug === 'void') return voidBanner
  return null
}
