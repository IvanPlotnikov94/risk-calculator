export const formatNumber = (num: number | undefined, decimals = 2): string => {
  if (num === undefined || Number.isNaN(num)) return ''
  return num.toFixed(decimals)
}

export const formatCurrency = (num: number | undefined): string => {
  if (num === undefined || Number.isNaN(num)) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export const formatPercent = (num: number | undefined, decimals = 2): string => {
  if (num === undefined || Number.isNaN(num)) return ''
  return num.toFixed(decimals) + '%'
}
