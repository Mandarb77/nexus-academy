/**
 * Generates print-ready guild mark SVGs for large-format output.
 * Run: npx tsx scripts/export-guild-marks.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, '..', 'exports', 'guild-marks-print')

const GUILDS = {
  forge: {
    label: 'FORGE',
    slug: 'forge',
    hex: '#C47B2B',
    rgb: [196, 123, 43],
  },
  prism: {
    label: 'PRISM ORDER',
    slug: 'prism',
    hex: '#378ADD',
    rgb: [55, 138, 221],
  },
  folded: {
    label: 'FOLDED PATH',
    slug: 'folded',
    hex: '#D85A30',
    rgb: [216, 90, 48],
  },
  silicon: {
    label: 'SILICON COVENANT',
    slug: 'silicon',
    hex: '#6B5B8A',
    rgb: [107, 91, 138],
  },
  void: {
    label: 'VOID NAVIGATORS',
    slug: 'void',
    hex: '#2A6B6B',
    rgb: [42, 107, 107],
  },
} as const

const MARK_FILL = '#1A1714'
const PANEL = '#F0EBE1'
const RULE = '#B8B2A6'
const INK_SECONDARY = '#4A453F'

type GuildSlug = keyof typeof GUILDS

/** Native mark geometry — outer oval center and radii in 120×172 viewBox */
const MARK_LAYOUT: Record<GuildSlug, { cx: number; cy: number; rx: number; ry: number }> = {
  void: { cx: 60, cy: 88, rx: 54, ry: 80 },
  silicon: { cx: 60, cy: 86, rx: 52, ry: 78 },
  folded: { cx: 60, cy: 86, rx: 52, ry: 78 },
  prism: { cx: 60, cy: 86, rx: 52, ry: 78 },
  forge: { cx: 60, cy: 86, rx: 52, ry: 78 },
}

const MARK_VIEW_W = 120
const MARK_VIEW_H = 172

function centeredMarkTransform(
  slug: GuildSlug,
  targetCx: number,
  targetCy: number,
  scale: number,
): string {
  const { cx, cy } = MARK_LAYOUT[slug]
  return `translate(${targetCx} ${targetCy}) scale(${scale}) translate(${-cx} ${-cy})`
}

function cartoucheFrame(
  slug: GuildSlug,
  targetCx: number,
  targetCy: number,
  scale: number,
  pad = 7,
) {
  const { rx, ry } = MARK_LAYOUT[slug]
  return {
    cx: targetCx,
    cy: targetCy,
    rx: rx * scale + pad,
    ry: ry * scale + pad,
  }
}

function markPaths(slug: GuildSlug, stroke: string, fill: string): string {
  const g = (inner: string) =>
    `<g stroke="${stroke}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none">${inner}</g>`

  switch (slug) {
    case 'void':
      return `${g(`
          <ellipse cx="60" cy="88" rx="54" ry="80"/>
          <rect x="26" y="60" width="68" height="68"/>
          <circle cx="60" cy="94" r="34"/>
          <line x1="60" y1="51" x2="33" y2="128"/>
          <line x1="60" y1="51" x2="87" y2="128"/>
          <circle cx="60" cy="40" r="11"/>
          <circle cx="60" cy="40" r="5"/>
        `)}
        <polygon points="60,74 66,78 62,86 69,98 62,112 64,122 60,152 56,122 58,112 51,98 58,86 54,78" fill="${fill}"/>`

    case 'silicon':
      return g(`
          <ellipse cx="60" cy="86" rx="52" ry="78"/>
          <line x1="60" y1="30" x2="60" y2="152"/>
          <line x1="60" y1="64" x2="40" y2="46"/>
          <line x1="60" y1="80" x2="28" y2="62"/>
          <line x1="60" y1="104" x2="32" y2="92"/>
          <line x1="60" y1="130" x2="40" y2="116"/>
          <line x1="60" y1="64" x2="80" y2="46"/>
          <line x1="60" y1="80" x2="92" y2="62"/>
          <line x1="60" y1="104" x2="88" y2="92"/>
          <line x1="60" y1="130" x2="80" y2="116"/>
          <circle cx="60" cy="30" r="7"/>
          <circle cx="60" cy="62" r="7"/>
          <circle cx="60" cy="158" r="6"/>
          <circle cx="40" cy="44" r="5"/>
          <circle cx="28" cy="62" r="5"/>
          <circle cx="32" cy="92" r="5"/>
          <circle cx="40" cy="116" r="5"/>
          <circle cx="80" cy="44" r="5"/>
          <circle cx="92" cy="62" r="5"/>
          <circle cx="88" cy="92" r="5"/>
          <circle cx="80" cy="116" r="5"/>
        `)

    case 'folded':
      return g(`
          <ellipse cx="60" cy="86" rx="52" ry="78"/>
          <g transform="translate(60 92) scale(0.22)">
            <polygon points="0,-60 -110,20 0,100 110,20"/>
            <line x1="0" y1="-60" x2="0" y2="100"/>
            <line x1="-110" y1="20" x2="110" y2="20"/>
            <polyline points="-110,20 -220,-50 -170,80"/>
            <line x1="-110" y1="20" x2="-170" y2="80"/>
            <line x1="-220" y1="-50" x2="-170" y2="80"/>
            <polyline points="110,20 220,-50 170,80"/>
            <line x1="110" y1="20" x2="170" y2="80"/>
            <line x1="220" y1="-50" x2="170" y2="80"/>
            <polyline points="-110,20 -60,160 0,100"/>
            <line x1="-110" y1="20" x2="0" y2="100"/>
            <line x1="-60" y1="160" x2="0" y2="100"/>
            <polyline points="0,-60 -30,-140 30,-140"/>
            <line x1="0" y1="-60" x2="30" y2="-140"/>
            <polygon points="-30,-140 30,-140 20,-175 -10,-175"/>
            <polyline points="-10,-175 -40,-200 20,-175"/>
            <line x1="-30" y1="-140" x2="30" y2="-140"/>
          </g>
        `)

    case 'prism':
      return g(`
          <ellipse cx="60" cy="86" rx="52" ry="78"/>
          <line x1="68" y1="86" x2="106" y2="86"/>
          <line x1="66" y1="81" x2="100" y2="51"/>
          <line x1="63" y1="79" x2="83" y2="25"/>
          <line x1="57" y1="79" x2="37" y2="25"/>
          <line x1="54" y1="81" x2="20" y2="51"/>
          <line x1="52" y1="86" x2="14" y2="86"/>
          <line x1="54" y1="91" x2="20" y2="121"/>
          <line x1="57" y1="93" x2="37" y2="147"/>
          <line x1="63" y1="93" x2="83" y2="147"/>
          <line x1="66" y1="91" x2="100" y2="121"/>
          <line x1="58.5" y1="78" x2="58.5" y2="18"/>
          <line x1="61.5" y1="78" x2="61.5" y2="18"/>
          <line x1="58.5" y1="94" x2="58.5" y2="154"/>
          <line x1="61.5" y1="94" x2="61.5" y2="154"/>
          <circle cx="60" cy="86" r="8"/>
        `)

    case 'forge':
      return g(`
          <ellipse cx="60" cy="86" rx="52" ry="78"/>
          <line x1="44" y1="26" x2="76" y2="26"/>
          <line x1="44" y1="26" x2="50" y2="56"/>
          <line x1="76" y1="26" x2="70" y2="56"/>
          <line x1="50" y1="56" x2="70" y2="56"/>
          <line x1="50" y1="56" x2="57" y2="76"/>
          <line x1="70" y1="56" x2="63" y2="76"/>
          <line x1="57" y1="76" x2="60" y2="82"/>
          <line x1="63" y1="76" x2="60" y2="82"/>
          <line x1="60" y1="82" x2="60" y2="96"/>
          <circle cx="60" cy="96" r="2"/>
          <ellipse cx="60" cy="96" rx="20" ry="5"/>
          <line x1="40" y1="96" x2="40" y2="110"/>
          <line x1="80" y1="96" x2="80" y2="110"/>
          <path d="M40 110 A20 5 0 0 1 80 110"/>
          <ellipse cx="60" cy="114" rx="28" ry="6"/>
          <line x1="32" y1="114" x2="32" y2="128"/>
          <line x1="88" y1="114" x2="88" y2="128"/>
          <path d="M32 128 A28 6 0 0 1 88 128"/>
          <ellipse cx="60" cy="132" rx="36" ry="7"/>
          <line x1="24" y1="132" x2="24" y2="146"/>
          <line x1="96" y1="132" x2="96" y2="146"/>
          <path d="M24 146 A36 7 0 0 1 96 146"/>
          <ellipse cx="60" cy="150" rx="46" ry="8"/>
          <path d="M14 150 A46 14 0 0 1 106 150"/>
        `)
  }
}

function svgHeader(title: string, width: string, height: string, viewBox: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="${viewBox}"
  role="img"
  aria-label="${title}">
  <title>${title}</title>
  <desc>Nexus Academy guild mark — vector art for large-format print. Source: nexus-academy GuildMark component.</desc>`
}

function markOnlySvg(slug: GuildSlug): string {
  const guild = GUILDS[slug]
  return `${svgHeader(`${guild.label} guild mark`, '4in', '5.733in', `0 0 ${MARK_VIEW_W} ${MARK_VIEW_H}`)}
  <rect width="100%" height="100%" fill="none"/>
  ${markPaths(slug, guild.hex, MARK_FILL)}
</svg>
`
}

function cartoucheSvg(slug: GuildSlug): string {
  const guild = GUILDS[slug]
  const w = 300
  const h = 370
  const cardCx = w / 2
  const labelBand = 52
  const markCenterY = (h - labelBand) / 2
  const scale = 1.52
  const frame = cartoucheFrame(slug, cardCx, markCenterY, scale)

  return `${svgHeader(`${guild.label} guild cartouche`, '3in', '3.7in', `0 0 ${w} ${h}`)}
  <rect width="${w}" height="${h}" fill="${PANEL}"/>
  <ellipse cx="${frame.cx}" cy="${frame.cy}" rx="${frame.rx}" ry="${frame.ry}" fill="${PANEL}" stroke="${RULE}" stroke-width="2"/>
  <g transform="${centeredMarkTransform(slug, cardCx, markCenterY, scale)}">
    ${markPaths(slug, guild.hex, MARK_FILL)}
  </g>
  <text x="${cardCx}" y="${h - 18}"
    text-anchor="middle"
    font-family="Cinzel, 'Times New Roman', serif"
    font-size="13"
    font-weight="500"
    letter-spacing="3.2"
    fill="${INK_SECONDARY}">${guild.label}</text>
</svg>
`
}

function colorReferenceSvg(): string {
  const swatches = Object.values(GUILDS)
  const extras = [
    { label: 'Mark fill', hex: MARK_FILL },
    { label: 'Cartouche panel', hex: PANEL },
    { label: 'Cartouche border', hex: RULE },
    { label: 'Label ink', hex: INK_SECONDARY },
  ]

  const rows = [...swatches.map((g) => ({ label: g.label, hex: g.hex })), ...extras]
  const rowH = 72
  const h = 80 + rows.length * rowH

  const swatchRows = rows
    .map((row, i) => {
      const y = 64 + i * rowH
      return `
  <rect x="48" y="${y}" width="88" height="48" fill="${row.hex}" stroke="${RULE}" stroke-width="1"/>
  <text x="156" y="${y + 20}" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#1A1714">${row.label}</text>
  <text x="156" y="${y + 40}" font-family="DM Mono, ui-monospace, monospace" font-size="13" fill="#4A453F">${row.hex.toUpperCase()}</text>`
    })
    .join('')

  return `${svgHeader('Nexus Academy guild color reference', '8.5in', `${h / 96}in`, `0 0 680 ${h}`)}
  <rect width="680" height="${h}" fill="#FFFFFF"/>
  <text x="48" y="40" font-family="Cinzel, 'Times New Roman', serif" font-size="22" letter-spacing="2" fill="#1A1714">Nexus Academy — Guild Colors</text>
  ${swatchRows}
</svg>
`
}

function posterSheetSvg(): string {
  const slugs = Object.keys(GUILDS) as GuildSlug[]
  const cardW = 360
  const cardH = 444
  const gap = 48
  const pad = 60
  const totalW = pad * 2 + slugs.length * cardW + (slugs.length - 1) * gap
  const totalH = pad * 2 + cardH + 80

  const cards = slugs
    .map((slug, i) => {
      const guild = GUILDS[slug]
      const x = pad + i * (cardW + gap)
      const y = pad + 80
      const cardCx = x + cardW / 2
      const labelBand = 56
      const markCenterY = y + (cardH - labelBand) / 2
      const scale = 1.52
      const frame = cartoucheFrame(slug, cardCx, markCenterY, scale)

      return `
  <g>
    <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" fill="${PANEL}" stroke="${RULE}" stroke-width="1.5"/>
    <ellipse cx="${frame.cx}" cy="${frame.cy}" rx="${frame.rx}" ry="${frame.ry}" fill="${PANEL}" stroke="${RULE}" stroke-width="2"/>
    <g transform="${centeredMarkTransform(slug, cardCx, markCenterY, scale)}">
      ${markPaths(slug, guild.hex, MARK_FILL)}
    </g>
    <text x="${cardCx}" y="${y + cardH - 36}"
      text-anchor="middle"
      font-family="Cinzel, 'Times New Roman', serif"
      font-size="15"
      font-weight="500"
      letter-spacing="3.5"
      fill="${INK_SECONDARY}">${guild.label}</text>
    <text x="${cardCx}" y="${y + cardH - 14}"
      text-anchor="middle"
      font-family="DM Mono, ui-monospace, monospace"
      font-size="11"
      fill="${guild.hex}">${guild.hex.toUpperCase()}</text>
  </g>`
    })
    .join('')

  return `${svgHeader('Nexus Academy guild marks poster sheet', '24in', '8in', `0 0 ${totalW} ${totalH}`)}
  <rect width="${totalW}" height="${totalH}" fill="#FFFFFF"/>
  <text x="${totalW / 2}" y="52"
    text-anchor="middle"
    font-family="Cinzel, 'Times New Roman', serif"
    font-size="28"
    font-weight="500"
    letter-spacing="4"
    fill="#1A1714">NEXUS ACADEMY — GUILD MARKS</text>
  ${cards}
</svg>
`
}

function readme(): string {
  return `# Nexus Academy — Guild Marks (Print Export)

Vector SVG files for large-format printing. Generated from the in-app \`GuildMark\` component.

## Files

| File | Use |
|------|-----|
| \`marks/{guild}-mark.svg\` | Mark only — transparent background, scale to any size |
| \`cartouches/{guild}-cartouche.svg\` | Full cartouche with panel, oval frame, and label |
| \`nexus-guild-marks-poster-sheet.svg\` | All five cartouches on one 24×8 in artboard |
| \`guild-colors-reference.svg\` | Color swatches for your print shop |
| \`guild-colors.json\` | Machine-readable color specs |

## Guild accent colors

| Guild | Hex | RGB |
|-------|-----|-----|
| Forge | #C47B2B | 196, 123, 43 |
| Prism Order | #378ADD | 55, 138, 221 |
| Folded Path | #D85A30 | 216, 90, 48 |
| Silicon Covenant | #6B5B8A | 107, 91, 138 |
| Void Navigators | #2A6B6B | 42, 107, 107 |

Supporting colors: mark fill \`#1A1714\`, cartouche panel \`#F0EBE1\`, border \`#B8B2A6\`.

## Print tips

1. **Prefer SVG or PDF** — these are pure vector; open in Illustrator, Inkscape, or Affinity Designer and export PDF at 300 dpi if your shop requests raster.
2. **Regenerate** after mark changes: \`npx tsx scripts/export-guild-marks.ts\`
3. **Cinzel labels** — cartouche files use Cinzel for guild names. Outline type in your design app before send-to-print if the shop may not have the font installed.
4. **Mark-only files** have no background — place on any poster color you choose.

## Source

Canonical geometry: \`src/components/GuildMark.tsx\`
`
}

mkdirSync(join(OUT, 'marks'), { recursive: true })
mkdirSync(join(OUT, 'cartouches'), { recursive: true })

for (const slug of Object.keys(GUILDS) as GuildSlug[]) {
  writeFileSync(join(OUT, 'marks', `${slug}-mark.svg`), markOnlySvg(slug), 'utf8')
  writeFileSync(join(OUT, 'cartouches', `${slug}-cartouche.svg`), cartoucheSvg(slug), 'utf8')
}

writeFileSync(join(OUT, 'guild-colors-reference.svg'), colorReferenceSvg(), 'utf8')
writeFileSync(join(OUT, 'nexus-guild-marks-poster-sheet.svg'), posterSheetSvg(), 'utf8')
writeFileSync(
  join(OUT, 'guild-colors.json'),
  JSON.stringify(
    {
      guilds: GUILDS,
      supporting: {
        markFill: MARK_FILL,
        cartouchePanel: PANEL,
        cartoucheBorder: RULE,
        labelInk: INK_SECONDARY,
      },
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  'utf8',
)
writeFileSync(join(OUT, 'README.md'), readme(), 'utf8')

console.log(`Wrote guild mark exports to ${OUT}`)
