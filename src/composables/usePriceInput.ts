import { ref, watch } from 'vue'
import {
  parsePrice,
  formatPriceDisplay,
  handleDecimalKeydown,
  sanitizePricePaste,
  PRICE_INT_MAX_INPUT_DIGITS,
} from '@/utils/inputValidation'

const PRICE_DECIMALS = 9

export const usePriceInput = (
  priceSource: () => number,
  onUpdate: (value: number) => void,
) => {
  const priceDisplay = ref('')

  watch(
    priceSource,
    (v) => {
      if (priceDisplay.value.endsWith('.') && v === 0) return
      priceDisplay.value = formatPriceDisplay(v)
    },
    { immediate: true },
  )

  const handlePriceKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) return
    handleDecimalKeydown(e, (e.target as HTMLInputElement).value)
  }

  const handlePriceInput = (e: Event) => {
    const el = e.target as HTMLInputElement
    const raw = el.value.replace(',', '.')
    const [int, dec] = raw.split('.')
    const intPart = (int?.replace(/\D/g, '') ?? '').slice(0, PRICE_INT_MAX_INPUT_DIGITS)
    const decPart = (dec?.replace(/\D/g, '') ?? '').slice(0, PRICE_DECIMALS)
    const rawStr = decPart.length > 0 ? `${intPart || '0'}.${decPart}` : intPart
    const value = parsePrice(rawStr)
    const displayStr = raw.endsWith('.') ? raw : formatPriceDisplay(value)
    priceDisplay.value = displayStr
    el.value = displayStr
    onUpdate(value)
  }

  const handlePricePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const value = sanitizePricePaste(e.clipboardData?.getData('text') ?? '')
    onUpdate(value)
    priceDisplay.value = formatPriceDisplay(value)
  }

  return { priceDisplay, handlePriceKeydown, handlePriceInput, handlePricePaste }
}
