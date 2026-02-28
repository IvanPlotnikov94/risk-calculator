import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCalculatorStore } from './calculator'
import { useExitCalculatorStore } from './exitCalculator'

describe('Exit Calculator Store', () => {
  let calcStore: ReturnType<typeof useCalculatorStore>
  let exitStore: ReturnType<typeof useExitCalculatorStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    calcStore = useCalculatorStore()
    exitStore = useExitCalculatorStore()
  })

  it('initializes with default values', () => {
    expect(exitStore.entryPrice).toBeNull()
    expect(exitStore.totalVolume).toBeNull()
    expect(exitStore.exitPoints.length).toBe(0)
    expect(exitStore.sortOrder).toBe('original')
  })

  it('adds a new exit point', () => {
    exitStore.addExitPoint()
    expect(exitStore.exitPoints.length).toBe(1)
    expect(exitStore.exitPoints[0].exitPrice).toBe(0)
    expect(exitStore.exitPoints[0].percent).toBe(0)
  })

  it('removes an exit point', () => {
    exitStore.addExitPoint()
    const id = exitStore.exitPoints[0].id
    exitStore.removeExitPoint(id)
    expect(exitStore.exitPoints.length).toBe(0)
  })

  it('updates exit point fields', () => {
    exitStore.addExitPoint()
    const id = exitStore.exitPoints[0].id
    exitStore.updateExitPoint(id, 'exitPrice', 90000)
    exitStore.updateExitPoint(id, 'percent', 40)
    expect(exitStore.exitPoints[0].exitPrice).toBe(90000)
    expect(exitStore.exitPoints[0].percent).toBe(40)
  })

  describe('Allocation tracking', () => {
    it('calculates total allocated percent', () => {
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 40)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 25)
      expect(exitStore.totalAllocatedPercent).toBe(65)
      expect(exitStore.remainingPercent).toBe(35)
    })

    it('detects fully allocated', () => {
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)
      expect(exitStore.isFullyAllocated).toBe(true)
      expect(exitStore.isOverAllocated).toBe(false)
    })

    it('detects over-allocated', () => {
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 60)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 50)
      expect(exitStore.isOverAllocated).toBe(true)
    })

    it('calculates max available percent for a specific exit', () => {
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 60)
      const max = exitStore.maxAvailablePercent(exitStore.exitPoints[1].id)
      expect(max).toBe(40)
    })
  })

  describe('Validation', () => {
    it('validates exit price for Long (must be above entry)', () => {
      calcStore.direction = 'long'
      exitStore.entryPrice = 88000
      exitStore.addExitPoint()
      const id = exitStore.exitPoints[0].id

      exitStore.updateExitPoint(id, 'exitPrice', 90000)
      expect(exitStore.isExitPriceValid(id)).toBe(true)

      exitStore.updateExitPoint(id, 'exitPrice', 85000)
      expect(exitStore.isExitPriceValid(id)).toBe(false)
    })

    it('validates exit price for Short (must be below entry)', () => {
      calcStore.direction = 'short'
      exitStore.entryPrice = 88000
      exitStore.addExitPoint()
      const id = exitStore.exitPoints[0].id

      exitStore.updateExitPoint(id, 'exitPrice', 85000)
      expect(exitStore.isExitPriceValid(id)).toBe(true)

      exitStore.updateExitPoint(id, 'exitPrice', 90000)
      expect(exitStore.isExitPriceValid(id)).toBe(false)
    })

    it('validates stop loss for Long (must be below entry)', () => {
      calcStore.direction = 'long'
      exitStore.entryPrice = 88000

      calcStore.stopLoss = 85000
      expect(exitStore.isStopLossValidForExit).toBe(true)

      calcStore.stopLoss = 90000
      expect(exitStore.isStopLossValidForExit).toBe(false)
    })

    it('validates stop loss for Short (must be above entry)', () => {
      calcStore.direction = 'short'
      exitStore.entryPrice = 88000

      calcStore.stopLoss = 90000
      expect(exitStore.isStopLossValidForExit).toBe(true)

      calcStore.stopLoss = 85000
      expect(exitStore.isStopLossValidForExit).toBe(false)
    })
  })

  describe('PnL calculations - spec worked example', () => {
    // Direction: Long, Entry: 88000, SL: 85000, Volume: $1000
    // TP-1: 90000 (40%), TP-2: 91000 (25%), TP-3: 92000 (20%), TP-4: 94000 (15%)
    beforeEach(() => {
      calcStore.direction = 'long'
      calcStore.stopLoss = 85000
      exitStore.entryPrice = 88000
      exitStore.totalVolume = 1000

      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.addExitPoint()

      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 40)

      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'exitPrice', 91000)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 25)

      exitStore.updateExitPoint(exitStore.exitPoints[2].id, 'exitPrice', 92000)
      exitStore.updateExitPoint(exitStore.exitPoints[2].id, 'percent', 20)

      exitStore.updateExitPoint(exitStore.exitPoints[3].id, 'exitPrice', 94000)
      exitStore.updateExitPoint(exitStore.exitPoints[3].id, 'percent', 15)
    })

    it('calculates TP-1 PnL at TP correctly', () => {
      const scenarios = exitStore.exitScenarios
      // TP-1: $400 / 90000 * (90000 - 88000) = 0.00444 * 2000 = $8.89
      expect(scenarios[0].pnlAtTP).toBeCloseTo(8.89, 1)
    })

    it('calculates TP-1 PnL at SL correctly', () => {
      const scenarios = exitStore.exitScenarios
      // Remaining: $600, SL loss: ($600/85000) * (85000 - 88000) = -$21.18
      // PnL at SL after TP-1: 8.89 + (-21.18) = -$12.29
      expect(scenarios[0].pnlAtSL).toBeCloseTo(-12.29, 1)
    })

    it('calculates TP-2 PnL at TP correctly (cumulative)', () => {
      const scenarios = exitStore.exitScenarios
      // TP-2: $250 / 91000 * (91000 - 88000) = 0.002747 * 3000 = $8.24
      // Cumulative: $8.89 + $8.24 = $17.13
      expect(scenarios[1].pnlAtTP).toBeCloseTo(17.13, 1)
    })

    it('calculates TP-2 PnL at SL correctly', () => {
      const scenarios = exitStore.exitScenarios
      // Remaining: $350, SL loss: ($350/85000) * (85000 - 88000) = -$12.35
      // PnL at SL after TP-2: 17.13 + (-12.35) = $4.78
      expect(scenarios[1].pnlAtSL).toBeCloseTo(4.78, 1)
    })

    it('PnL at SL monotonically increases across exits (when defined)', () => {
      const scenarios = exitStore.exitScenarios
      for (let i = 1; i < scenarios.length; i++) {
        const curr = scenarios[i].pnlAtSL
        const prev = scenarios[i - 1].pnlAtSL
        if (curr !== undefined && prev !== undefined) {
          expect(curr).toBeGreaterThan(prev)
        }
      }
    })

    it('calculates volume USDT per exit correctly', () => {
      const scenarios = exitStore.exitScenarios
      expect(scenarios[0].volumeUSDT).toBeCloseTo(400, 0)
      expect(scenarios[1].volumeUSDT).toBeCloseTo(250, 0)
      expect(scenarios[2].volumeUSDT).toBeCloseTo(200, 0)
      expect(scenarios[3].volumeUSDT).toBeCloseTo(150, 0)
    })

    it('calculates volume in ticker correctly', () => {
      const scenarios = exitStore.exitScenarios
      // 400 / 90000 = 0.004444
      expect(scenarios[0].volumeTicker).toBeCloseTo(0.004444, 4)
      // 250 / 91000 = 0.002747
      expect(scenarios[1].volumeTicker).toBeCloseTo(0.002747, 4)
    })

    it('calculates % to TP correctly', () => {
      const scenarios = exitStore.exitScenarios
      // TP-1: (90000 - 88000) / 88000 * 100 = 2.27%
      expect(scenarios[0].percentToTP).toBeCloseTo(2.27, 1)
      // TP-4: (94000 - 88000) / 88000 * 100 = 6.82%
      expect(scenarios[3].percentToTP).toBeCloseTo(6.82, 1)
    })

    it('calculates R/R per row using original risk as denominator', () => {
      const scenarios = exitStore.exitScenarios
      // Original risk = (1000/85000) * (85000 - 88000) = -$35.29
      // TP-1 R/R = |8.89| / |35.29| = 0.252
      expect(scenarios[0].riskReward).toBeCloseTo(0.252, 2)
      // TP-2 R/R = |17.13| / |35.29| = 0.485
      expect(scenarios[1].riskReward).toBeCloseTo(0.485, 2)
    })

    it('R/R monotonically increases across exits', () => {
      const scenarios = exitStore.exitScenarios
      for (let i = 1; i < scenarios.length; i++) {
        expect(scenarios[i].riskReward).toBeGreaterThan(scenarios[i - 1].riskReward)
      }
    })
  })

  describe('Position summary', () => {
    beforeEach(() => {
      calcStore.direction = 'long'
      calcStore.stopLoss = 85000
      exitStore.entryPrice = 88000
      exitStore.totalVolume = 1000

      exitStore.addExitPoint()
      exitStore.addExitPoint()

      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 60)

      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'exitPrice', 92000)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 40)
    })

    it('calculates avg exit price (weighted)', () => {
      const summary = exitStore.exitPositionSummary
      // (90000 * 0.6 + 92000 * 0.4) / (0.6 + 0.4) = 90800
      expect(summary.avgExitPrice).toBeCloseTo(90800, 0)
    })

    it('calculates total volume in ticker', () => {
      const summary = exitStore.exitPositionSummary
      // 600/90000 + 400/92000 = 0.006667 + 0.004348 = 0.011014
      expect(summary.totalVolumeTicker).toBeCloseTo(0.011014, 4)
    })

    it('calculates total volume in USDT', () => {
      const summary = exitStore.exitPositionSummary
      expect(summary.totalVolumeUSDT).toBeCloseTo(1000, 0)
    })

    it('calculates risk at SL (no TP hit)', () => {
      const summary = exitStore.exitPositionSummary
      // (1000 / 85000) * (85000 - 88000) = 0.011765 * (-3000) = -$35.29
      expect(summary.riskSL).toBeCloseTo(-35.29, 1)
    })

    it('calculates profit at all TPs', () => {
      const summary = exitStore.exitPositionSummary
      // Exit 1: (600/90000) * (90000 - 88000) = 0.006667 * 2000 = $13.33
      // Exit 2: (400/92000) * (92000 - 88000) = 0.004348 * 4000 = $17.39
      // Total: $30.72
      expect(summary.profitTP).toBeCloseTo(30.72, 0)
    })

    it('calculates R/R for full position', () => {
      const summary = exitStore.exitPositionSummary
      // R/R = |30.72| / |-35.29| = 0.87
      expect(summary.riskReward).toBeCloseTo(0.87, 1)
    })

    it('last scenario pnlAtTP equals summary profitTP when fully allocated', () => {
      const scenarios = exitStore.exitScenarios
      const summary = exitStore.exitPositionSummary
      const lastScenario = scenarios[scenarios.length - 1]
      expect(lastScenario.pnlAtTP).toBeCloseTo(summary.profitTP, 2)
    })

    it('last scenario pnlAtSL is undefined when 100% allocated (position fully closed, SL unreachable)', () => {
      const scenarios = exitStore.exitScenarios
      const lastScenario = scenarios[scenarios.length - 1]
      expect(lastScenario.pnlAtSL).toBeUndefined()
    })

    it('last scenario R/R equals summary R/R when fully allocated', () => {
      const scenarios = exitStore.exitScenarios
      const summary = exitStore.exitPositionSummary
      const lastScenario = scenarios[scenarios.length - 1]
      expect(lastScenario.riskReward).toBeCloseTo(summary.riskReward, 4)
    })

    it('hasMeaningfulExitSummary is true when data is complete', () => {
      expect(exitStore.hasMeaningfulExitSummary).toBe(true)
    })

    it('hasMeaningfulExitSummary is false when entry price is missing', () => {
      exitStore.entryPrice = null
      expect(exitStore.hasMeaningfulExitSummary).toBe(false)
    })
  })

  describe('Sorting', () => {
    beforeEach(() => {
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 92000)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[2].id, 'exitPrice', 94000)
    })

    it('sorts by original order', () => {
      exitStore.setSortOrder('original')
      const sorted = exitStore.sortedExitPoints
      expect(sorted[0].exitPrice).toBe(92000)
      expect(sorted[1].exitPrice).toBe(90000)
      expect(sorted[2].exitPrice).toBe(94000)
    })

    it('sorts ascending by price', () => {
      exitStore.setSortOrder('asc')
      const sorted = exitStore.sortedExitPoints
      expect(sorted[0].exitPrice).toBe(90000)
      expect(sorted[1].exitPrice).toBe(92000)
      expect(sorted[2].exitPrice).toBe(94000)
    })

    it('sorts descending by price', () => {
      exitStore.setSortOrder('desc')
      const sorted = exitStore.sortedExitPoints
      expect(sorted[0].exitPrice).toBe(94000)
      expect(sorted[1].exitPrice).toBe(92000)
      expect(sorted[2].exitPrice).toBe(90000)
    })
  })

  describe('Execution order', () => {
    beforeEach(() => {
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 92000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 30)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 40)
      exitStore.updateExitPoint(exitStore.exitPoints[2].id, 'exitPrice', 94000)
      exitStore.updateExitPoint(exitStore.exitPoints[2].id, 'percent', 30)
    })

    it('Long: ascending (closest TP first)', () => {
      calcStore.direction = 'long'
      const ordered = exitStore.executionOrderExits
      expect(ordered[0].exitPrice).toBe(90000)
      expect(ordered[1].exitPrice).toBe(92000)
      expect(ordered[2].exitPrice).toBe(94000)
    })

    it('Short: descending (closest TP first)', () => {
      calcStore.direction = 'short'
      const ordered = exitStore.executionOrderExits
      expect(ordered[0].exitPrice).toBe(94000)
      expect(ordered[1].exitPrice).toBe(92000)
      expect(ordered[2].exitPrice).toBe(90000)
    })
  })

  describe('Short position PnL', () => {
    beforeEach(() => {
      calcStore.direction = 'short'
      calcStore.stopLoss = 92000
      exitStore.entryPrice = 90000
      exitStore.totalVolume = 1000

      exitStore.addExitPoint()
      exitStore.addExitPoint()

      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 88000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 50)

      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'exitPrice', 85000)
      exitStore.updateExitPoint(exitStore.exitPoints[1].id, 'percent', 50)
    })

    it('calculates positive PnL at TP for Short', () => {
      const scenarios = exitStore.exitScenarios
      // Exit at 88000 (Short profit): (500/88000) * (90000 - 88000) = 0.005682 * 2000 = $11.36
      expect(scenarios[0].pnlAtTP).toBeCloseTo(11.36, 1)
    })

    it('calculates PnL at SL for Short', () => {
      const scenarios = exitStore.exitScenarios
      // After first exit: remaining $500
      // SL loss: (500/92000) * (90000 - 92000) = 0.005435 * (-2000) = -$10.87
      // PnL at SL = 11.36 + (-10.87) = $0.49
      expect(scenarios[0].pnlAtSL).toBeCloseTo(0.49, 0)
    })

    it('calculates summary risk at SL for Short', () => {
      const summary = exitStore.exitPositionSummary
      // Full SL without exits: (1000/92000) * (90000 - 92000) = -$21.74
      expect(summary.riskSL).toBeCloseTo(-21.74, 1)
    })
  })

  describe('Edge cases', () => {
    it('single exit at 100%', () => {
      calcStore.direction = 'long'
      calcStore.stopLoss = 85000
      exitStore.entryPrice = 88000
      exitStore.totalVolume = 1000

      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)

      const scenarios = exitStore.exitScenarios
      expect(scenarios.length).toBe(1)
      // PnL at TP: (1000/90000) * 2000 = $22.22
      expect(scenarios[0].pnlAtTP).toBeCloseTo(22.22, 1)
      // PnL at SL не рассчитывается: 100% объёма на последнем выходе — позиция закрыта
      expect(scenarios[0].pnlAtSL).toBeUndefined()
    })

    it('returns empty scenarios when entry price is not set', () => {
      exitStore.totalVolume = 1000
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)
      expect(exitStore.exitScenarios.length).toBe(0)
    })

    it('returns empty scenarios when total volume is not set', () => {
      exitStore.entryPrice = 88000
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 90000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)
      expect(exitStore.exitScenarios.length).toBe(0)
    })

    it('canAddExitPoint is false when entry/volume not set', () => {
      expect(exitStore.canAddExitPoint).toBe(false)
      exitStore.entryPrice = 88000
      expect(exitStore.canAddExitPoint).toBe(false)
      exitStore.totalVolume = 1000
      expect(exitStore.canAddExitPoint).toBe(true)
    })

    it('canAddExitPoint is false when fully allocated', () => {
      exitStore.entryPrice = 88000
      exitStore.totalVolume = 1000
      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)
      expect(exitStore.canAddExitPoint).toBe(false)
    })

    it('detects suspicious R/R', () => {
      calcStore.direction = 'long'
      calcStore.stopLoss = 87999
      exitStore.entryPrice = 88000
      exitStore.totalVolume = 1000

      exitStore.addExitPoint()
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'exitPrice', 100000)
      exitStore.updateExitPoint(exitStore.exitPoints[0].id, 'percent', 100)

      expect(exitStore.isRiskRewardSuspicious).toBe(true)
    })
  })
})
