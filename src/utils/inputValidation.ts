const MAX_PRICE = 9999999
const PRICE_DECIMALS = 9
const MIN_PERCENT = 0.5
const MAX_PERCENT = 100
const PERCENT_DECIMALS = 2

export const PRICE_INT_MAX_INPUT_DIGITS = 10

const sanitizeDecimalStr = (s: string, maxDecimals: number): string => {
  const normalized = s.replace(',', '.')
  const [int, dec] = normalized.split('.')
  const intPart = int?.replace(/\D/g, '') ?? ''
  const decPart = dec?.replace(/\D/g, '').slice(0, maxDecimals) ?? ''
  if (decPart.length > 0) return `${intPart || '0'}.${decPart}`
  return intPart
}

const stripLeadingZeros = (s: string): string => {
  if (!s || s === '.') return s
  const [int, dec] = s.split('.')
  const i = int?.replace(/^0+/, '') || '0'
  return dec !== undefined ? `${i}.${dec}` : i
}

export const parsePrice = (raw: string): number => {
  const s = sanitizeDecimalStr(raw, PRICE_DECIMALS)
  const n = parseFloat(s)
  if (Number.isNaN(n) || n <= 0) return 0
  return Math.min(n, MAX_PRICE)
}

export const parsePercent = (raw: string): number => {
  const s = stripLeadingZeros(sanitizeDecimalStr(raw, PERCENT_DECIMALS))
  if (!s) return 0
  const n = parseFloat(s)
  if (Number.isNaN(n)) return 0
  const clamped = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, n))
  return Math.round(clamped * 100) / 100
}

export const formatPriceDisplay = (n: number): string => {
  if (n === 0 || Number.isNaN(n)) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(PRICE_DECIMALS).replace(/\.?0+$/, '')
}

export const formatPercentDisplay = (n: number): string => {
  if (n === 0 || Number.isNaN(n)) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(PERCENT_DECIMALS).replace(/\.?0+$/, '')
}

const isDecimalSeparator = (key: string) => key === '.' || key === ','

export const handleDecimalKeydown = (e: KeyboardEvent, currentValue: string) => {
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length > 1) return
  if (/\d/.test(e.key)) return
  if (isDecimalSeparator(e.key)) {
    if (currentValue.includes('.')) e.preventDefault()
    return
  }
  e.preventDefault()
}

export const sanitizePricePaste = (text: string): number =>
  parsePrice(text.replace(/,/g, '.'))

export const sanitizePercentPaste = (text: string): number =>
  parsePercent(text.replace(/,/g, '.'))
