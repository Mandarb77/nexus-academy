# Nexus Academy — Guild Marks (Print Export)

Vector SVG files for large-format printing. Generated from the in-app `GuildMark` component.

## Files

| File | Use |
|------|-----|
| `marks/{guild}-mark.svg` | Mark only — transparent background, scale to any size |
| `cartouches/{guild}-cartouche.svg` | Full cartouche with panel, oval frame, and label |
| `nexus-guild-marks-poster-sheet.svg` | All five cartouches on one 24×8 in artboard |
| `guild-colors-reference.svg` | Color swatches for your print shop |
| `guild-colors.json` | Machine-readable color specs |

## Guild accent colors

| Guild | Hex | RGB |
|-------|-----|-----|
| Forge | #C47B2B | 196, 123, 43 |
| Prism Order | #378ADD | 55, 138, 221 |
| Folded Path | #D85A30 | 216, 90, 48 |
| Silicon Covenant | #6B5B8A | 107, 91, 138 |
| Void Navigators | #2A6B6B | 42, 107, 107 |

Supporting colors: mark fill `#1A1714`, cartouche panel `#F0EBE1`, border `#B8B2A6`.

## Print tips

1. **Prefer SVG or PDF** — these are pure vector; open in Illustrator, Inkscape, or Affinity Designer and export PDF at 300 dpi if your shop requests raster.
2. **Regenerate** after mark changes: `npx tsx scripts/export-guild-marks.ts`
3. **Cinzel labels** — cartouche files use Cinzel for guild names. Outline type in your design app before send-to-print if the shop may not have the font installed.
4. **Mark-only files** have no background — place on any poster color you choose.

## Source

Canonical geometry: `src/components/GuildMark.tsx`
