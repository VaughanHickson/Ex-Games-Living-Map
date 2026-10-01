export const exGamesPalette = {
  forestGreen: '#2F6F3E',
  leafLime: '#7FA650',
  kauriDark: '#17251C',
  manukaGrey: '#4E5D4C',
  mist: '#E8EFE7',
  warmGold: '#D9A441',
} as const

export const exGamesBrand = {
  name: 'NZ Ex Games',
  mission: 'The Race to 2050',
  purpose: 'Protect Our Land. Restore Our Future.',
  masterImagePath: '/brand/ex-games-web-master-image.png',
} as const

/** Same accepted artwork served by WWW; identity only, no map state. */
export const exGamesIdentity = '<img src="https://www.nzexgames.nz/brand/nature-001/nz-ex-games-enriched.webp" alt="NZ Ex Games" width="1320" height="313" style="display:block;width:100%;max-width:544px;height:auto;margin:0 0 12px" />'

/** Public display wording; canonical records are not rewritten. */
export const publicRecordCopy = (text: string) => text
  .replace(/This remains an unclaimed Ex Games profile[^.]*\./g, "This is a sourced public record, not ACTIVE participation. Public profile claiming and correction submission are not available here.")
  .replace(/(?<!NZ )\bEx Games\b/g, "NZ Ex Games")
