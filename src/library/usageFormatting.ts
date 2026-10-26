export const formatQuantity = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2)

// 2dp is fine for monthly/aggregate totals, but a single raw event (e.g. one 5-minute scrape
// interval's worth of usage) can be a small enough fraction of a credit to round to "0.00" at
// that precision even though it isn't actually zero. Extend precision only when needed, so
// aggregates stay clean while individual transactions don't look free.
export const formatCredits = (value: number) => {
  if (value === 0) return '0.00'
  if (Math.abs(value) >= 0.01) return value.toFixed(2)
  for (let decimalPlaces = 3; decimalPlaces <= 8; decimalPlaces += 1) {
    if (Number(value.toFixed(decimalPlaces)) !== 0) return value.toFixed(decimalPlaces)
  }
  return value.toFixed(8)
}
