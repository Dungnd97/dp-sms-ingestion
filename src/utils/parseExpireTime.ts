export function parseExpireTime(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/) // ví dụ: 24h, 30m
  if (!match) return 0

  const num = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return num * 1000
    case 'm':
      return num * 60 * 1000
    case 'h':
      return num * 60 * 60 * 1000
    case 'd':
      return num * 24 * 60 * 60 * 1000
    default:
      return 0
  }
}
