const PRESET_TAG_COLORS = {
  fragile: {
    bgColor: '#c62828',
    textColor: '#ffffff',
  },
  donotstack: {
    bgColor: '#f9a825',
    textColor: '#1f1f1f',
  },
  heavy: {
    bgColor: '#212121',
    textColor: '#ffffff',
  },
}

const CUSTOM_TAG_PALETTE = [
  { bgColor: '#00695c', textColor: '#ffffff' },
  { bgColor: '#1565c0', textColor: '#ffffff' },
  { bgColor: '#6a1b9a', textColor: '#ffffff' },
  { bgColor: '#2e7d32', textColor: '#ffffff' },
  { bgColor: '#00838f', textColor: '#ffffff' },
  { bgColor: '#ef6c00', textColor: '#ffffff' },
  { bgColor: '#5d4037', textColor: '#ffffff' },
  { bgColor: '#ad1457', textColor: '#ffffff' },
]

const normalizeTag = (tag) => String(tag || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const getHash = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getTagChipSx = (tag) => {
  const normalized = normalizeTag(tag)
  const preset = PRESET_TAG_COLORS[normalized]

  if (preset) {
    return {
      bgcolor: preset.bgColor,
      color: preset.textColor,
      '& .MuiChip-label': { fontWeight: 500 },
    }
  }

  if (!normalized) {
    return {}
  }

  const paletteIndex = getHash(normalized) % CUSTOM_TAG_PALETTE.length
  const paletteColor = CUSTOM_TAG_PALETTE[paletteIndex]

  return {
    bgcolor: paletteColor.bgColor,
    color: paletteColor.textColor,
    '& .MuiChip-label': { fontWeight: 500 },
  }
}
