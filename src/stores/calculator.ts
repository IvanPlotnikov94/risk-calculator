import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Entry, PositionDirection, PartialScenario, PositionSummary } from '@/types'

export const useCalculatorStore = defineStore('calculator', () => {
  // State
  const ticker = ref<string>('BTC')
  const direction = ref<PositionDirection>('long')
  const entries = ref<Entry[]>([])
  const stopLoss = ref<number | null>(null)
  const takeProfit = ref<number | null>(null)
  const presets = ref<number[]>([50, 100, 200, 500, 1000])
  
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

  // Calculate partial scenarios (only when "Цена входа" and "Сумма (USDT)" are both filled)
  const partialScenarios = computed((): PartialScenario[] => {
    const ordered = executionOrderEntries.value
    const scenarios: PartialScenario[] = []

    for (let i = 0; i < ordered.length; i++) {
      const entriesUpToI = ordered.slice(0, i + 1)
      const filledUpToI = entriesUpToI.filter(isEntryFilled)
      const currentFilled = isEntryFilled(ordered[i])

      if (!currentFilled) {
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

  // Position summary (only when all entries have price and amount filled)
  const hasValidPositionSummary = computed(() => {
    return entries.value.length > 0 && entries.value.every(isEntryFilled)
  })

  const positionSummary = computed((): PositionSummary => {
    if (!hasValidPositionSummary.value) {
      return {
        totalQty: 0,
        totalAmount: 0,
        avgPrice: 0,
        riskUSD: 0,
        rewardUSD: 0,
        riskReward: 0,
      }
    }

    const lastScenario = partialScenarios.value[partialScenarios.value.length - 1]
    if (!lastScenario || lastScenario.avgPrice === undefined) {
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
      totalQty: lastScenario.totalQty ?? 0,
      totalAmount: lastScenario.totalAmount ?? 0,
      avgPrice: lastScenario.avgPrice,
      riskUSD: Math.abs(lastScenario.pnlAtStop ?? 0),
      rewardUSD: Math.abs(lastScenario.pnlAtTake ?? 0),
      riskReward: lastScenario.riskReward ?? 0,
    }
  })

  // Check if R/R is suspicious (only when we have valid summary)
  const isRiskRewardSuspicious = computed(() => {
    if (!hasValidPositionSummary.value) return false
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

  // Validation: Check if a specific entry price is valid
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

  return {
    // State
    ticker,
    direction,
    entries,
    stopLoss,
    takeProfit,
    presets,
    sortOrder,
    
    // Computed
    sortedEntries,
    executionOrderEntries,
    partialScenarios,
    positionSummary,
    hasValidPositionSummary,
    isRiskRewardSuspicious,
    canAddEntry,
    
    // Validation
    isStopLossValid,
    isTakeProfitValid,
    isEntryValid,
    stopLossValidationMessage,
    takeProfitValidationMessage,
    
    // Actions
    addEntry,
    removeEntry,
    updateEntry,
    applyPreset,
    setSortOrder,
    setDirection,
    getScenarioForEntry,
  }
})
