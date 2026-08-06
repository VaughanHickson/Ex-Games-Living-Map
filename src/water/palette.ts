export type RgbColour = {
  red: number
  green: number
  blue: number
}

export const palette = {
  deepBlue: { red: 16, green: 57, blue: 77 },
  oceanBlue: { red: 31, green: 101, blue: 128 },
  blueGreen: { red: 44, green: 137, blue: 128 },
  livingGreen: { red: 88, green: 176, blue: 103 },
  softSage: { red: 145, green: 200, blue: 166 },
  mistWhite: { red: 231, green: 242, blue: 243 },
} as const satisfies Record<string, RgbColour>
