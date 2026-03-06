import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCalculatorStore } from './calculator'
import type { ExitPoint, ExitScenario, ExitPositionSummary, ExitAutoCalculateParams } from '@/types'

const MIN_POINTS_COUNT = 2
const MAX_POINTS_COUNT = 10

const roundTo = (value: number, decimals = 2) => {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

const normalizePercents = (percents: number[]) => {
  const sum = percents.reduce((acc, value) => acc + value, 0)
  if (sum <= 0) return []
  return percents.map((value) => (value / sum) * 100)
}

const interpolateValues = (from: number, to: number, pointsCount: number) => {
  if (pointsCount <= 1) return [from]
  const step = (to - from) / (pointsCount - 1)
  return Array.from({ length: pointsCount }, (_, index) => from + step * index)
}

export const useExitCalculatorStore = defineStore('exitCalculator', () => {
  const calcStore = useCalculatorStore()

  // Exit-mode specific state
  const entryPrice = ref<number | null>(null)
  const totalVolume = ref<number | null>(null)
  const exitPoints = ref<ExitPoint[]>([])
  const sortOrder = ref<'original' | 'asc' | 'desc'>('original')

  const isNumSet = (v: number | null): v is number =>
    v != null && Number.isFinite(v) && v > 0

  // Sorted exits for display
  const sortedExitPoints = computed(() => {
    const copy = [...exitPoints.value]
    if (sortOrder.value === 'asc') {
      return copy.sort((a, b) => a.exitPrice - b.exitPrice)
    }
    if (sortOrder.value === 'desc') {
      return copy.sort((a, b) => b.exitPrice - a.exitPrice)
    }
    return copy.sort((a, b) => a.originalIndex - b.originalIndex)
  })

  // Exits in execution order: Long = ascending (closest TP first), Short = descending
  const executionOrderExits = computed(() => {
    const copy = [...exitPoints.value].filter(ep => ep.exitPrice > 0 && ep.percent > 0)
    if (calcStore.direction === 'long') {
      return copy.sort((a, b) => a.exitPrice - b.exitPrice)
    }
    return copy.sort((a, b) => b.exitPrice - a.exitPrice)
  })

  const totalAllocatedPercent = computed(() =>
    exitPoints.value.reduce((sum, ep) => sum + (ep.percent > 0 ? ep.percent : 0), 0)
  )

  const remainingPercent = computed(() =>
    Math.max(0, 100 - totalAllocatedPercent.value)
  )

  const isFullyAllocated = computed(() =>
    Math.abs(totalAllocatedPercent.value - 100) < 0.001
  )

  const isOverAllocated = computed(() =>
    totalAllocatedPercent.value > 100.001
  )

  // Validation: exit price must be in the profitable zone
  const isExitPriceValid = (exitId: string): boolean => {
    if (!isNumSet(entryPrice.value)) return true
    const ep = exitPoints.value.find(e => e.id === exitId)
    if (!ep || ep.exitPrice <= 0) return true

    if (calcStore.direction === 'long') {
      return ep.exitPrice > entryPrice.value
    }
    return ep.exitPrice < entryPrice.value
  }

  // Validation: SL must be on the loss side of entry
  const isStopLossValidForExit = computed(() => {
    const sl = calcStore.stopLoss
    if (sl == null || !Number.isFinite(sl)) return true
    if (!isNumSet(entryPrice.value)) return true

    if (calcStore.direction === 'long') {
      return sl < entryPrice.value
    }
    return sl > entryPrice.value
  })

  const stopLossExitValidationMessage = computed(() => {
    if (isStopLossValidForExit.value) return ''
    if (calcStore.direction === 'long') {
      return 'Стоп-лосс должен быть ниже цены входа для Long позиции'
    }
    return 'Стоп-лосс должен быть выше цены входа для Short позиции'
  })

  // Max available percent for a given exit (100 - all others)
  const maxAvailablePercent = (exitId: string): number => {
    const othersSum = exitPoints.value
      .filter(ep => ep.id !== exitId)
      .reduce((sum, ep) => sum + (ep.percent > 0 ? ep.percent : 0), 0)
    return Math.max(0, 100 - othersSum)
  }

  // Core calculation: exit scenarios
  const exitScenarios = computed((): ExitScenario[] => {
    if (!isNumSet(entryPrice.value) || !isNumSet(totalVolume.value)) return []

    const entry = entryPrice.value
    const volume = totalVolume.value
    const sl = calcStore.stopLoss
    const slSet = sl != null && Number.isFinite(sl) && sl > 0
    const dir = calcStore.direction
    const ordered = executionOrderExits.value

    // Original risk: full position loss at SL without any exits (used as R/R denominator)
    let originalRisk = 0
    if (slSet && sl > 0) {
      if (dir === 'long') {
        originalRisk = (volume / sl) * (sl - entry)
      } else {
        originalRisk = (volume / sl) * (entry - sl)
      }
    }
    const absOriginalRisk = Math.abs(originalRisk)

    const scenarios: ExitScenario[] = []
    let cumulativePnlTP = 0
    let cumulativeVolumeUsed = 0
    let weightedPriceSum = 0
    let weightedPercentSum = 0

    for (let i = 0; i < ordered.length; i++) {
      const ep = ordered[i]
      if (!isExitPriceValid(ep.id)) continue

      const volumeUSDT = volume * (ep.percent / 100)
      const volumeTicker = volumeUSDT / ep.exitPrice

      weightedPriceSum += ep.exitPrice * (ep.percent / 100)
      weightedPercentSum += ep.percent / 100
      const avgExitPrice = weightedPercentSum > 0 ? weightedPriceSum / weightedPercentSum : 0

      let percentToTP: number
      if (dir === 'long') {
        percentToTP = ((ep.exitPrice - entry) / entry) * 100
      } else {
        percentToTP = ((entry - ep.exitPrice) / entry) * 100
      }

      let pnlAtThisExit: number
      if (dir === 'long') {
        pnlAtThisExit = (volumeUSDT / ep.exitPrice) * (ep.exitPrice - entry)
      } else {
        pnlAtThisExit = (volumeUSDT / ep.exitPrice) * (entry - ep.exitPrice)
      }

      cumulativePnlTP += pnlAtThisExit
      cumulativeVolumeUsed += volumeUSDT

      const isLastExitInOrder = i === ordered.length - 1
      const pnlAtSLNotApplicable = isLastExitInOrder && isFullyAllocated.value

      let pnlAtSL: number | undefined = cumulativePnlTP
      if (!pnlAtSLNotApplicable) {
        const remainingVolume = volume - cumulativeVolumeUsed
        if (slSet && sl > 0) {
          let slLoss: number
          if (dir === 'long') {
            slLoss = (remainingVolume / sl) * (sl - entry)
          } else {
            slLoss = (remainingVolume / sl) * (entry - sl)
          }
          pnlAtSL = cumulativePnlTP + slLoss
        }
      } else {
        pnlAtSL = undefined
      }

      const riskReward = absOriginalRisk > 0 ? Math.abs(cumulativePnlTP) / absOriginalRisk : 0

      scenarios.push({
        exitId: ep.id,
        exitPrice: ep.exitPrice,
        percent: ep.percent,
        avgExitPrice,
        volumeUSDT,
        volumeTicker,
        percentToTP,
        pnlAtTP: cumulativePnlTP,
        ...(pnlAtSL !== undefined && { pnlAtSL }),
        riskReward,
      })
    }

    return scenarios
  })

  const getScenarioForExit = (exitId: string): ExitScenario | undefined =>
    exitScenarios.value.find(s => s.exitId === exitId)

  const hasMeaningfulExitSummary = computed(() =>
    exitScenarios.value.length > 0 && isNumSet(entryPrice.value) && isNumSet(totalVolume.value)
  )

  const exitPositionSummary = computed((): ExitPositionSummary => {
    const empty: ExitPositionSummary = {
      avgExitPrice: 0,
      totalVolumeTicker: 0,
      totalVolumeUSDT: 0,
      riskSL: 0,
      profitTP: 0,
      riskReward: 0,
    }

    if (!isNumSet(entryPrice.value) || !isNumSet(totalVolume.value)) return empty

    const entry = entryPrice.value
    const volume = totalVolume.value
    const sl = calcStore.stopLoss
    const slSet = sl != null && Number.isFinite(sl) && sl > 0
    const dir = calcStore.direction
    const validExits = exitPoints.value.filter(ep => ep.exitPrice > 0 && ep.percent > 0 && isExitPriceValid(ep.id))

    if (validExits.length === 0) return empty

    let weightedPriceSum = 0
    let weightedPercentSum = 0
    let totalVolumeTicker = 0
    let totalVolumeUSDT = 0
    let profitTP = 0

    for (const ep of validExits) {
      const volUSDT = volume * (ep.percent / 100)
      const volTicker = volUSDT / ep.exitPrice
      weightedPriceSum += ep.exitPrice * (ep.percent / 100)
      weightedPercentSum += ep.percent / 100
      totalVolumeTicker += volTicker
      totalVolumeUSDT += volUSDT

      if (dir === 'long') {
        profitTP += volTicker * (ep.exitPrice - entry)
      } else {
        profitTP += volTicker * (entry - ep.exitPrice)
      }
    }

    const avgExitPrice = weightedPercentSum > 0 ? weightedPriceSum / weightedPercentSum : 0

    let riskSL = 0
    if (slSet) {
      if (dir === 'long') {
        riskSL = (volume / sl) * (sl - entry)
      } else {
        riskSL = (volume / sl) * (entry - sl)
      }
    }

    const absProfitTP = Math.abs(profitTP)
    const absRiskSL = Math.abs(riskSL)
    const riskReward = absRiskSL > 0 ? absProfitTP / absRiskSL : 0

    return {
      avgExitPrice,
      totalVolumeTicker,
      totalVolumeUSDT,
      riskSL,
      profitTP,
      riskReward,
    }
  })

  const isRiskRewardSuspicious = computed(() => {
    if (!hasMeaningfulExitSummary.value) return false
    const rr = exitPositionSummary.value.riskReward
    return rr > 10 || rr < 0.2
  })

  const canAddExitPoint = computed(() => {
    if (!isNumSet(entryPrice.value)) return false
    if (!isNumSet(totalVolume.value)) return false
    if (isOverAllocated.value) return false
    if (isFullyAllocated.value) return false
    return true
  })

  // Actions
  const addExitPoint = () => {
    const maxIndex = exitPoints.value.length > 0
      ? Math.max(...exitPoints.value.map(e => e.originalIndex))
      : -1

    exitPoints.value.push({
      id: crypto.randomUUID(),
      exitPrice: 0,
      percent: 0,
      originalIndex: maxIndex + 1,
    })
  }

  const removeExitPoint = (id: string) => {
    exitPoints.value = exitPoints.value.filter(e => e.id !== id)
  }

  const clearExitPoints = () => {
    exitPoints.value = []
    sortOrder.value = 'original'
  }

  const updateExitPoint = (id: string, field: 'exitPrice' | 'percent', value: number) => {
    const ep = exitPoints.value.find(e => e.id === id)
    if (ep) {
      ep[field] = value
    }
  }

  const setSortOrder = (order: 'original' | 'asc' | 'desc') => {
    sortOrder.value = order
  }

  const replaceExitPoints = (nextExitPoints: ExitPoint[]) => {
    exitPoints.value = nextExitPoints.map((exitPoint, index) => ({
      ...exitPoint,
      originalIndex: index,
    }))
    sortOrder.value = 'original'
  }

  const calculateExitsFromRisk = (params: ExitAutoCalculateParams) => {
    const safeCount = Math.min(Math.max(Math.trunc(params.exitsCount), MIN_POINTS_COUNT), MAX_POINTS_COUNT)
    const normalizedPercents = normalizePercents(params.distributionPercents)
    if (normalizedPercents.length !== safeCount) return false

    const stopDistance = Math.abs(params.stopLoss - params.entryPrice)
    if (stopDistance <= 0 || params.stopLoss <= 0) return false

    const totalVolumeByRisk = (params.riskUSDT * params.stopLoss) / stopDistance
    if (!Number.isFinite(totalVolumeByRisk) || totalVolumeByRisk <= 0) return false

    const exitPrices = interpolateValues(params.priceFrom, params.priceTo, safeCount)
    const nextExitPoints: ExitPoint[] = exitPrices.map((price, index) => ({
      id: crypto.randomUUID(),
      exitPrice: roundTo(price, 4),
      percent: roundTo(normalizedPercents[index], 2),
      originalIndex: index,
    }))

    const percentDiff = 100 - nextExitPoints.reduce((acc, exitPoint) => acc + exitPoint.percent, 0)
    if (Math.abs(percentDiff) > 0.001) {
      nextExitPoints[safeCount - 1].percent = roundTo(nextExitPoints[safeCount - 1].percent + percentDiff, 2)
    }

    calcStore.stopLoss = params.stopLoss
    entryPrice.value = params.entryPrice
    totalVolume.value = roundTo(totalVolumeByRisk, 2)
    replaceExitPoints(nextExitPoints)
    return true
  }

  return {
    // State
    entryPrice,
    totalVolume,
    exitPoints,
    sortOrder,

    // Computed
    sortedExitPoints,
    executionOrderExits,
    totalAllocatedPercent,
    remainingPercent,
    isFullyAllocated,
    isOverAllocated,
    exitScenarios,
    exitPositionSummary,
    hasMeaningfulExitSummary,
    isRiskRewardSuspicious,
    canAddExitPoint,

    // Validation
    isExitPriceValid,
    isStopLossValidForExit,
    stopLossExitValidationMessage,
    maxAvailablePercent,

    // Actions
    addExitPoint,
    removeExitPoint,
    clearExitPoints,
    updateExitPoint,
    setSortOrder,
    getScenarioForExit,
    replaceExitPoints,
    calculateExitsFromRisk,
  }
})
