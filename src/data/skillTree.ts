export type GuildId = 'forge' | 'prism'

export type SkillTile = {
  key: string
  name: string
  wp: number
}

export type Guild = {
  id: GuildId
  name: string
  tiles: SkillTile[]
}

/** WP per tile — all skills award 10 Workshop Points when approved. */
const WP = 10

export const GUILDS: Guild[] = [
  {
    id: 'forge',
    name: 'Forge',
    tiles: [
      { key: 'forge_navigate_tinkercad', name: 'Navigate TinkerCAD', wp: WP },
      { key: 'forge_create_model', name: 'Create a model', wp: WP },
      { key: 'forge_export_stl', name: 'Export STL file', wp: WP },
      { key: 'forge_check_size', name: 'Check size before printing', wp: WP },
      { key: 'forge_design_3dp', name: 'Design for 3D printing', wp: WP },
    ],
  },
  {
    id: 'prism',
    name: 'Prism',
    tiles: [
      { key: 'prism_vector_raster', name: 'Vector vs raster', wp: WP },
      { key: 'prism_cuttle_shapes', name: 'Create shapes in Cuttle', wp: WP },
      { key: 'prism_label_lines', name: 'Label cut and engrave lines', wp: WP },
      { key: 'prism_glowforge_safe', name: 'Glowforge safe operation', wp: WP },
      { key: 'prism_test_cut', name: 'Run a test cut', wp: WP },
    ],
  },
]
