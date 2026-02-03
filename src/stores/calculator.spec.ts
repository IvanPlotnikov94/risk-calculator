import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCalculatorStore } from './calculator'

describe('Calculator Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default values', () => {
    const store = useCalculatorStore()
    
    expect(store.ticker).toBe('BTC')
    expect(store.direction).toBe('short')
    expect(store.entries.length).toBe(2)
    expect(store.stopLoss).toBe(92000)
    expect(store.takeProfit).toBe(85000)
  })

  it('adds a new entry', () => {
    const store = useCalculatorStore()
    const initialLength = store.entries.length
    
    store.addEntry()
    
    expect(store.entries.length).toBe(initialLength + 1)
  })

  it('removes an entry', () => {
    const store = useCalculatorStore()
    const firstEntryId = store.entries[0].id
    
    store.removeEntry(firstEntryId)
    
    expect(store.entries.find(e => e.id === firstEntryId)).toBeUndefined()
  })

  it('updates entry price', () => {
    const store = useCalculatorStore()
    const firstEntry = store.entries[0]
    
    store.updateEntry(firstEntry.id, 'price', 95000)
    
    expect(store.entries[0].price).toBe(95000)
  })

  it('calculates average price correctly for short', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 90000, amount: 100, originalIndex: 0 },
      { id: '2', price: 91000, amount: 100, originalIndex: 1 },
    ]
    
    const summary = store.positionSummary
    
    // avg = (100 + 100) / (100/90000 + 100/91000)
    // avg = 200 / (0.00111111 + 0.00109890)
    // avg ≈ 90495.05
    expect(Math.round(summary.avgPrice)).toBe(90495)
  })

  it('calculates PnL correctly for short position', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 90000, amount: 100, originalIndex: 0 },
    ]
    store.stopLoss = 92000
    store.takeProfit = 85000
    
    const summary = store.positionSummary
    
    // qty = 100 / 90000 = 0.00111111
    // avgPrice = 90000
    // pnlAtStop = (90000 - 92000) * 0.00111111 = -2.22
    // pnlAtTake = (90000 - 85000) * 0.00111111 = 5.56
    
    expect(summary.riskUSD).toBeCloseTo(2.22, 1)
    expect(summary.rewardUSD).toBeCloseTo(5.56, 1)
  })

  it('calculates R/R correctly', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 90000, amount: 100, originalIndex: 0 },
    ]
    store.stopLoss = 92000
    store.takeProfit = 85000
    
    const summary = store.positionSummary
    
    // R/R = 5.56 / 2.22 ≈ 2.5
    expect(summary.riskReward).toBeCloseTo(2.5, 1)
  })

  it('orders entries correctly for short execution', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 91000, amount: 100, originalIndex: 0 },
      { id: '2', price: 90000, amount: 100, originalIndex: 1 },
      { id: '3', price: 92000, amount: 100, originalIndex: 2 },
    ]
    
    const ordered = store.executionOrderEntries
    
    // Short: ascending order
    expect(ordered[0].price).toBe(90000)
    expect(ordered[1].price).toBe(91000)
    expect(ordered[2].price).toBe(92000)
  })

  it('orders entries correctly for long execution', () => {
    const store = useCalculatorStore()
    store.direction = 'long'
    store.entries = [
      { id: '1', price: 89000, amount: 100, originalIndex: 0 },
      { id: '2', price: 90000, amount: 100, originalIndex: 1 },
      { id: '3', price: 88000, amount: 100, originalIndex: 2 },
    ]
    
    const ordered = store.executionOrderEntries
    
    // Long: descending order
    expect(ordered[0].price).toBe(90000)
    expect(ordered[1].price).toBe(89000)
    expect(ordered[2].price).toBe(88000)
  })

  it('detects suspicious R/R values', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 90000, amount: 100, originalIndex: 0 },
    ]
    store.stopLoss = 90100 // Very close stop
    store.takeProfit = 80000 // Very far take
    
    expect(store.isRiskRewardSuspicious).toBe(true)
  })

  it('applies preset correctly', () => {
    const store = useCalculatorStore()
    const firstEntry = store.entries[0]
    
    store.applyPreset(firstEntry.id, 500)
    
    expect(store.entries[0].amount).toBe(500)
  })

  it('sorts entries by original order', () => {
    const store = useCalculatorStore()
    store.entries = [
      { id: '1', price: 91000, amount: 100, originalIndex: 2 },
      { id: '2', price: 90000, amount: 100, originalIndex: 0 },
      { id: '3', price: 92000, amount: 100, originalIndex: 1 },
    ]
    
    store.setSortOrder('original')
    const sorted = store.sortedEntries
    
    expect(sorted[0].originalIndex).toBe(0)
    expect(sorted[1].originalIndex).toBe(1)
    expect(sorted[2].originalIndex).toBe(2)
  })

  it('calculates partial scenarios correctly', () => {
    const store = useCalculatorStore()
    store.direction = 'short'
    store.entries = [
      { id: '1', price: 90000, amount: 100, originalIndex: 0 },
      { id: '2', price: 91000, amount: 100, originalIndex: 1 },
    ]
    store.stopLoss = 92000
    store.takeProfit = 85000
    
    const scenarios = store.partialScenarios
    
    expect(scenarios.length).toBe(2)
    
    // First scenario: only first entry
    expect(scenarios[0].entryPrice).toBe(90000)
    expect(scenarios[0].avgPrice).toBe(90000)
    
    // Second scenario: both entries
    expect(scenarios[1].entryPrice).toBe(91000)
    expect(Math.round(scenarios[1].avgPrice)).toBe(90495)
  })

  describe('Validation', () => {
    it('validates stop loss correctly for short position', () => {
      const store = useCalculatorStore()
      store.direction = 'short'
      store.entries = [
        { id: '1', price: 90000, amount: 100, originalIndex: 0 },
        { id: '2', price: 91000, amount: 100, originalIndex: 1 },
      ]
      
      // Invalid: SL at same level as entry
      store.stopLoss = 91000
      expect(store.isStopLossValid).toBe(false)
      
      // Invalid: SL below entries
      store.stopLoss = 90000
      expect(store.isStopLossValid).toBe(false)
      
      // Valid: SL above all entries
      store.stopLoss = 92000
      expect(store.isStopLossValid).toBe(true)
    })

    it('validates stop loss correctly for long position', () => {
      const store = useCalculatorStore()
      store.direction = 'long'
      store.entries = [
        { id: '1', price: 90000, amount: 100, originalIndex: 0 },
        { id: '2', price: 89000, amount: 100, originalIndex: 1 },
      ]
      
      // Invalid: SL at same level as entry
      store.stopLoss = 89000
      expect(store.isStopLossValid).toBe(false)
      
      // Invalid: SL above entries
      store.stopLoss = 90000
      expect(store.isStopLossValid).toBe(false)
      
      // Valid: SL below all entries
      store.stopLoss = 88000
      expect(store.isStopLossValid).toBe(true)
    })

    it('validates take profit correctly for short position', () => {
      const store = useCalculatorStore()
      store.direction = 'short'
      store.entries = [
        { id: '1', price: 90000, amount: 100, originalIndex: 0 },
        { id: '2', price: 91000, amount: 100, originalIndex: 1 },
      ]
      
      // Invalid: TP above entries
      store.takeProfit = 91000
      expect(store.isTakeProfitValid).toBe(false)
      
      // Valid: TP below all entries
      store.takeProfit = 85000
      expect(store.isTakeProfitValid).toBe(true)
    })

    it('validates take profit correctly for long position', () => {
      const store = useCalculatorStore()
      store.direction = 'long'
      store.entries = [
        { id: '1', price: 90000, amount: 100, originalIndex: 0 },
        { id: '2', price: 89000, amount: 100, originalIndex: 1 },
      ]
      
      // Invalid: TP below entries
      store.takeProfit = 89000
      expect(store.isTakeProfitValid).toBe(false)
      
      // Valid: TP above all entries
      store.takeProfit = 95000
      expect(store.isTakeProfitValid).toBe(true)
    })

    it('validates entry prices correctly for short position', () => {
      const store = useCalculatorStore()
      store.direction = 'short'
      store.stopLoss = 93000
      store.takeProfit = 85000
      
      const validEntry = { id: '1', price: 90000, amount: 100, originalIndex: 0 }
      const invalidEntryAboveSL = { id: '2', price: 94000, amount: 100, originalIndex: 1 }
      const invalidEntryBelowTP = { id: '3', price: 84000, amount: 100, originalIndex: 2 }
      
      store.entries = [validEntry, invalidEntryAboveSL, invalidEntryBelowTP]
      
      expect(store.isEntryValid(validEntry.id)).toBe(true)
      expect(store.isEntryValid(invalidEntryAboveSL.id)).toBe(false)
      expect(store.isEntryValid(invalidEntryBelowTP.id)).toBe(false)
    })

    it('validates entry prices correctly for long position', () => {
      const store = useCalculatorStore()
      store.direction = 'long'
      store.stopLoss = 2800
      store.takeProfit = 3500
      
      const validEntry = { id: '1', price: 3000, amount: 100, originalIndex: 0 }
      const invalidEntryBelowSL = { id: '2', price: 2700, amount: 100, originalIndex: 1 }
      const invalidEntryAboveTP = { id: '3', price: 3600, amount: 100, originalIndex: 2 }
      
      store.entries = [validEntry, invalidEntryBelowSL, invalidEntryAboveTP]
      
      expect(store.isEntryValid(validEntry.id)).toBe(true)
      expect(store.isEntryValid(invalidEntryBelowSL.id)).toBe(false)
      expect(store.isEntryValid(invalidEntryAboveTP.id)).toBe(false)
    })

    it('provides validation messages', () => {
      const store = useCalculatorStore()
      store.direction = 'short'
      store.entries = [{ id: '1', price: 90000, amount: 100, originalIndex: 0 }]
      
      // Invalid SL
      store.stopLoss = 89000
      expect(store.stopLossValidationMessage).toContain('выше')
      
      // Valid SL
      store.stopLoss = 91000
      expect(store.stopLossValidationMessage).toBe('')
      
      // Invalid TP
      store.takeProfit = 91000
      expect(store.takeProfitValidationMessage).toContain('ниже')
      
      // Valid TP
      store.takeProfit = 85000
      expect(store.takeProfitValidationMessage).toBe('')
    })

    it('handles empty entries gracefully in validation', () => {
      const store = useCalculatorStore()
      store.entries = []
      
      // Should be valid when no entries
      expect(store.isStopLossValid).toBe(true)
      expect(store.isTakeProfitValid).toBe(true)
    })

    it('ignores zero-price entries in validation', () => {
      const store = useCalculatorStore()
      store.direction = 'short'
      store.stopLoss = 93000
      store.takeProfit = 85000
      store.entries = [
        { id: '1', price: 0, amount: 0, originalIndex: 0 },
        { id: '2', price: 90000, amount: 100, originalIndex: 1 },
      ]
      
      // Should be valid because we ignore zero prices
      expect(store.isStopLossValid).toBe(true)
      expect(store.isTakeProfitValid).toBe(true)
    })
  })
})
