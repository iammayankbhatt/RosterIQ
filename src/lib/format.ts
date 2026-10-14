const LAKH = 100_000
const CRORE = 10_000_000

const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹1,62,000 — full Indian digit grouping */
export function formatINR(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}₹${grouped.format(Math.abs(Math.round(n)))}`
}

/** ₹1.62 lakh · ₹2.4 crore · below a lakh falls back to grouped rupees (₹30,000) */
export function formatLakh(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= CRORE) return `${sign}₹${trim(abs / CRORE)} crore`
  if (abs >= LAKH) return `${sign}₹${trim(abs / LAKH)} lakh`
  return formatINR(n)
}

function trim(v: number): string {
  return v.toFixed(2).replace(/\.?0+$/, '')
}
