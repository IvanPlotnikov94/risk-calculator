import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Entry,
  PositionDirection,
  CalculatorMode,
  PartialScenario,
  PositionSummary,
  EntryAutoCalculateParams,
} from '@/types'

const PRESETS_STORAGE_KEY = 'risk-calculator-presets'
const DEFAULT_PRESETS = [50, 100, 200, 500, 1000]
const MAX_PRESETS_LENGTH = 20
const MIN_POINTS_COUNT = 2
const MAX_POINTS_COUNT = 10

const loadPresets = (): number[] => {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PRESETS_STORAGE_KEY) : null
    if (raw == null) return [...DEFAULT_PRESETS]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_PRESETS]
    const filtered = parsed
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0)
      .slice(0, MAX_PRESETS_LENGTH)
    return filtered.length > 0 ? filtered : [...DEFAULT_PRESETS]
  } catch {
    return [...DEFAULT_PRESETS]
  }
}

const roundTo = (value: number, decimals = 2) => {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

const normalizePercents = (percents: number[]) => {
  const sum = percents.reduce((acc, value) => acc + value, 0)
  if (sum <= 0) return []
  return percents.map((value) => value / sum)
}

const interpolateValues = (from: number, to: number, pointsCount: number) => {
  if (pointsCount <= 1) return [from]
  const step = (to - from) / (pointsCount - 1)
  return Array.from({ length: pointsCount }, (_, index) => from + step * index)
}

export const useCalculatorStore = defineStore('calculator', () => {
  // Shared state (available in both modes)
  const mode = ref<CalculatorMode>('entry')
  const ticker = ref<string>('BTC')
  const direction = ref<PositionDirection>('long')
  const stopLoss = ref<number | null>(null)

  // Entry-mode specific state
  const entries = ref<Entry[]>([])
  const takeProfit = ref<number | null>(null)
  const presets = ref<number[]>(loadPresets())

  watch(
    presets,
    (newVal) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newVal))
      }
    },
    { deep: true }
  )
  
  // Sorting state
  const sortOrder = ref<'original' | 'asc' | 'desc'>('original')

  // Computed - sorted entries for display
  const sortedEntries = computed(() => {
    const entriesCopy = [...entries.value]
    
    if (sortOrder.value === 'asc') {
      return entriesCopy.sort((a, b) => a.price - b.price)
    } else if (sortOrder.value === 'desc') {
      return entriesCopy.sort((a, b) => b.price - a.price)
    } else {
      return entriesCopy.sort((a, b) => a.originalIndex - b.originalIndex)
    }
  })

  // Get entries in execution order (short: asc, long: desc)
  const executionOrderEntries = computed(() => {
    const entriesCopy = [...entries.value]
    
    if (direction.value === 'short') {
      return entriesCopy.sort((a, b) => a.price - b.price)
    } else {
      return entriesCopy.sort((a, b) => b.price - a.price)
    }
  })

  // Helper: entry is filled when both price and amount are set
  const isEntryFilled = (e: Entry) => e.price > 0 && e.amount > 0

  // Helper: SL/TP is considered set only when it's a valid finite number (not null, not NaN)
  const isSlTpSet = (v: number | null): v is number =>
    v != null && Number.isFinite(v)

  // Validation: Check if a specific entry price is valid (used in partialScenarios and positionSummary)
  const isEntryValid = (entryId: string): boolean => {
    if (!isSlTpSet(stopLoss.value) || !isSlTpSet(takeProfit.value)) return true
    const entry = entries.value.find(e => e.id === entryId)
    if (!entry || entry.price <= 0) return true // Don't validate empty prices

    if (direction.value === 'short') {
      // Short: entry must be between TP and SL
      return entry.price > takeProfit.value && entry.price < stopLoss.value
    } else {
      // Long: entry must be between SL and TP
      return entry.price > stopLoss.value && entry.price < takeProfit.value
    }
  }

  // Calculate partial scenarios (only when "Цена входа" and "Сумма (USDT)" are both filled AND entry is valid)
  const partialScenarios = computed((): PartialScenario[] => {
    const ordered = executionOrderEntries.value
    const scenarios: PartialScenario[] = []

    for (let i = 0; i < ordered.length; i++) {
      const entriesUpToI = ordered.slice(0, i + 1)
      const filledAndValid = (e: Entry) => isEntryFilled(e) && isEntryValid(e.id)
      const filledUpToI = entriesUpToI.filter(filledAndValid)
      const currentFilled = isEntryFilled(ordered[i])
      const currentValid = isEntryValid(ordered[i].id)

      if (!currentFilled) {
        scenarios.push({
          entryId: ordered[i].id,
          entryPrice: ordered[i].price,
        })
        continue
      }

      // Invalid entry (e.g. price outside TP-SL): do not calculate, show minimal scenario (only price/amount columns have data)
      if (!currentValid) {
        scenarios.push({
          entryId: ordered[i].id,
          entryPrice: ordered[i].price,
        })
        continue
      }

      const quantities = filledUpToI.map(e => e.amount / e.price)
      const totalQty = quantities.reduce((sum, qty) => sum + qty, 0)
      const totalAmount = filledUpToI.reduce((sum, e) => sum + e.amount, 0)
      const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0

      if (!isSlTpSet(stopLoss.value) || !isSlTpSet(takeProfit.value)) {
        scenarios.push({
          entryId: ordered[i].id,
          entryPrice: ordered[i].price,
          avgPrice,
          totalQty,
          totalAmount,
          pnlAtStop: 0,
          pnlAtTake: 0,
          percentToStop: 0,
          percentToTake: 0,
          riskReward: 0,
        })
        continue
      }

      const sl = stopLoss.value
      const tp = takeProfit.value
      let pnlAtStop: number
      let pnlAtTake: number
      if (direction.value === 'long') {
        pnlAtStop = (sl - avgPrice) * totalQty
        pnlAtTake = (tp - avgPrice) * totalQty
      } else {
        pnlAtStop = (avgPrice - sl) * totalQty
        pnlAtTake = (avgPrice - tp) * totalQty
      }

      let percentToStop: number
      let percentToTake: number
      if (avgPrice > 0) {
        if (direction.value === 'long') {
          percentToStop = ((avgPrice - sl) / avgPrice) * 100
          percentToTake = ((tp - avgPrice) / avgPrice) * 100
        } else {
          percentToStop = ((sl - avgPrice) / avgPrice) * 100
          percentToTake = ((avgPrice - tp) / avgPrice) * 100
        }
      } else {
        percentToStop = 0
        percentToTake = 0
      }

      const riskUSD = Math.abs(pnlAtStop)
      const rewardUSD = Math.abs(pnlAtTake)
      const riskReward = riskUSD > 0 ? rewardUSD / riskUSD : 0

      scenarios.push({
        entryId: ordered[i].id,
        entryPrice: ordered[i].price,
        avgPrice,
        totalQty,
        totalAmount,
        pnlAtStop,
        pnlAtTake,
        percentToStop,
        percentToTake,
        riskReward,
      })
    }

    return scenarios
  })

  // Get scenario for specific entry
  const getScenarioForEntry = (entryId: string): PartialScenario | undefined => {
    return partialScenarios.value.find(s => s.entryId === entryId)
  }

  // Есть ли хотя бы один рассчитанный вход (заполнен и валиден) — для отображения сводки
  const hasMeaningfulPositionSummary = computed(() =>
    entries.value.some((e) => isEntryFilled(e) && isEntryValid(e.id))
  )

  // Сводка считается только по заполненным и валидным входам (по последнему в порядке исполнения)
  const positionSummary = computed((): PositionSummary => {
    const ordered = executionOrderEntries.value
    let lastFilledValidIndex = -1
    for (let i = 0; i < ordered.length; i++) {
      if (isEntryFilled(ordered[i]) && isEntryValid(ordered[i].id)) lastFilledValidIndex = i
    }
    if (lastFilledValidIndex === -1) {
      return {
        totalQty: 0,
        totalAmount: 0,
        avgPrice: 0,
        riskUSD: 0,
        rewardUSD: 0,
        riskReward: 0,
      }
    }

    const scenario = partialScenarios.value[lastFilledValidIndex]
    if (!scenario || scenario.avgPrice === undefined) {
      return {
        totalQty: 0,
        totalAmount: 0,
        avgPrice: 0,
        riskUSD: 0,
        rewardUSD: 0,
        riskReward: 0,
      }
    }

    return {
      totalQty: scenario.totalQty ?? 0,
      totalAmount: scenario.totalAmount ?? 0,
      avgPrice: scenario.avgPrice,
      riskUSD: Math.abs(scenario.pnlAtStop ?? 0),
      rewardUSD: Math.abs(scenario.pnlAtTake ?? 0),
      riskReward: scenario.riskReward ?? 0,
    }
  })

  // Все входы заполнены (для canAddEntry и обратной совместимости)
  const hasValidPositionSummary = computed(() => {
    return entries.value.length > 0 && entries.value.every(isEntryFilled)
  })

  // Check if R/R is suspicious (when we have meaningful summary)
  const isRiskRewardSuspicious = computed(() => {
    if (!hasMeaningfulPositionSummary.value) return false
    const rr = positionSummary.value.riskReward
    return rr > 10 || rr < 0.2
  })

  // Can add new entry only when SL/TP are set (valid numbers) and all current entries have price and amount filled
  const canAddEntry = computed(() => {
    if (!isSlTpSet(stopLoss.value) || !isSlTpSet(takeProfit.value)) return false
    return entries.value.length === 0 || entries.value.every(isEntryFilled)
  })

  // Validation: Check if stop loss is valid
  const isStopLossValid = computed(() => {
    if (!isSlTpSet(stopLoss.value)) return true
    if (entries.value.length === 0) return true
    
    const entryPrices = entries.value.map(e => e.price).filter(p => p > 0)
    if (entryPrices.length === 0) return true
    
    if (direction.value === 'short') {
      // Short: SL must be higher than all entries
      const maxEntry = Math.max(...entryPrices)
      return stopLoss.value > maxEntry
    } else {
      // Long: SL must be lower than all entries
      const minEntry = Math.min(...entryPrices)
      return stopLoss.value < minEntry
    }
  })

  // Validation: Check if take profit is valid
  const isTakeProfitValid = computed(() => {
    if (!isSlTpSet(takeProfit.value)) return true
    if (entries.value.length === 0) return true
    
    const entryPrices = entries.value.map(e => e.price).filter(p => p > 0)
    if (entryPrices.length === 0) return true
    
    if (direction.value === 'short') {
      // Short: TP must be lower than all entries
      const minEntry = Math.min(...entryPrices)
      return takeProfit.value < minEntry
    } else {
      // Long: TP must be higher than all entries
      const maxEntry = Math.max(...entryPrices)
      return takeProfit.value > maxEntry
    }
  })

  // Get validation message for stop loss
  const stopLossValidationMessage = computed(() => {
    if (isStopLossValid.value) return ''
    
    if (direction.value === 'short') {
      return 'Стоп-лосс должен быть выше всех входов для Short позиции'
    } else {
      return 'Стоп-лосс должен быть ниже всех входов для Long позиции'
    }
  })

  // Get validation message for take profit
  const takeProfitValidationMessage = computed(() => {
    if (isTakeProfitValid.value) return ''
    
    if (direction.value === 'short') {
      return 'Тейк-профит должен быть ниже всех входов для Short позиции'
    } else {
      return 'Тейк-профит должен быть выше всех входов для Long позиции'
    }
  })

  // Есть хотя бы одна рассчитанная точка входа (цена и сумма заполнены, валидации пройдены)
  const hasAtLeastOneCalculatedEntry = computed(() =>
    entries.value.some((e) => isEntryFilled(e) && isEntryValid(e.id))
  )

  // Actions
  const addEntry = () => {
    const maxIndex = entries.value.length > 0 
      ? Math.max(...entries.value.map(e => e.originalIndex))
      : -1
    
    entries.value.push({
      id: crypto.randomUUID(),
      price: 0,
      amount: 0,
      originalIndex: maxIndex + 1,
    })
  }

  const removeEntry = (id: string) => {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  const updateEntry = (id: string, field: 'price' | 'amount', value: number) => {
    const entry = entries.value.find(e => e.id === id)
    if (entry) {
      entry[field] = value
    }
  }

  const applyPreset = (entryId: string, presetValue: number) => {
    const entry = entries.value.find(e => e.id === entryId)
    if (entry) {
      entry.amount = presetValue
    }
  }

  const setSortOrder = (order: 'original' | 'asc' | 'desc') => {
    sortOrder.value = order
  }

  const setDirection = (newDirection: PositionDirection) => {
    direction.value = newDirection
  }

  const setMode = (newMode: CalculatorMode) => {
    mode.value = newMode
  }

  const replaceEntries = (nextEntries: Entry[]) => {
    entries.value = nextEntries.map((entry, index) => ({
      ...entry,
      originalIndex: index,
    }))
    sortOrder.value = 'original'
  }

  const calculateEntriesFromRisk = (params: EntryAutoCalculateParams) => {
    const safeCount = Math.min(Math.max(Math.trunc(params.entriesCount), MIN_POINTS_COUNT), MAX_POINTS_COUNT)
    const normalizedWeights = normalizePercents(params.distributionPercents)
    if (normalizedWeights.length !== safeCount) return false

    const entryPrices = interpolateValues(params.priceFrom, params.priceTo, safeCount)
    const denominator = normalizedWeights.reduce((acc, weight, index) => {
      const currentPrice = entryPrices[index]
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) return acc
      return acc + weight / currentPrice
    }, 0)

    if (denominator <= 0) return false

    const averagePrice = 1 / denominator
    if (!Number.isFinite(averagePrice) || averagePrice <= 0) return false

    const directionMultiplier = direction.value === 'long'
      ? Math.abs(params.stopLoss - averagePrice)
      : Math.abs(averagePrice - params.stopLoss)

    const riskPerOneUSDT = directionMultiplier * denominator
    if (!Number.isFinite(riskPerOneUSDT) || riskPerOneUSDT <= 0) return false

    const totalAmount = params.riskUSDT / riskPerOneUSDT
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return false

    const nextEntries = entryPrices.map((price, index) => ({
      id: crypto.randomUUID(),
      price: roundTo(price, 4),
      amount: roundTo(totalAmount * normalizedWeights[index], 4),
      originalIndex: index,
    }))

    stopLoss.value = params.stopLoss
    takeProfit.value = params.takeProfit
    replaceEntries(nextEntries)
    return true
  }

  return {
    // Shared state
    mode,
    ticker,
    direction,
    stopLoss,

    // Entry-mode state
    entries,
    takeProfit,
    presets,
    sortOrder,
    
    // Computed
    sortedEntries,
    executionOrderEntries,
    partialScenarios,
    positionSummary,
    hasValidPositionSummary,
    hasMeaningfulPositionSummary,
    isRiskRewardSuspicious,
    canAddEntry,
    
    // Validation
    isStopLossValid,
    isTakeProfitValid,
    isEntryValid,
    hasAtLeastOneCalculatedEntry,
    stopLossValidationMessage,
    takeProfitValidationMessage,
    
    // Actions
    setMode,
    addEntry,
    removeEntry,
    updateEntry,
    applyPreset,
    setSortOrder,
    setDirection,
    getScenarioForEntry,
    replaceEntries,
    calculateEntriesFromRisk,
  }
})
