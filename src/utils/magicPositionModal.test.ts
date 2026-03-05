// TODO: add more tests

import { describe, expect, it } from 'vitest'
import { validateRangeByScenario } from '@/utils/magicPositionModal'
import type { CalculatorMode, PositionDirection } from '@/types'

const validate = (mode: CalculatorMode, direction: PositionDirection, values: {
  priceFrom: number
  priceTo: number
  stopLoss: number
  secondaryPrice: number
  pointsCount?: number
}) =>
  validateRangeByScenario(mode, direction, {
    ...values,
    pointsCount: values.pointsCount ?? 4,
  })

describe('validateRangeByScenario', () => {
  it('highlights TP and only invalid upper range bound for entry long partial violation', () => {
    const issues = validate('entry', 'long', {
      priceFrom: 66566,
      priceTo: 75000,
      stopLoss: 65000,
      secondaryPrice: 72000,
    })

    const fields = issues.map((issue) => issue.field)
    expect(fields).toContain('secondaryPrice')
    expect(fields).toContain('priceTo')
    expect(fields).not.toContain('priceFrom')
    expect(fields).not.toContain('priceRange')
  })

  it('highlights only TP for entry long full violation', () => {
    const issues = validate('entry', 'long', {
      priceFrom: 73000,
      priceTo: 75000,
      stopLoss: 65000,
      secondaryPrice: 72000,
    })

    const fields = issues.map((issue) => issue.field)
    expect(fields.filter((field) => field === 'secondaryPrice')).toHaveLength(1)
    expect(fields).not.toContain('priceFrom')
    expect(fields).not.toContain('priceTo')
  })

  it('mirrors TP logic for entry short and flags only violating bound', () => {
    const issues = validate('entry', 'short', {
      priceFrom: 68000,
      priceTo: 75000,
      stopLoss: 76000,
      secondaryPrice: 70000,
    })

    const fields = issues.map((issue) => issue.field)
    expect(fields).toContain('secondaryPrice')
    expect(fields).toContain('priceFrom')
    expect(fields).not.toContain('priceTo')
  })

  it('validates exit long happy path with no issues', () => {
    const issues = validate('exit', 'long', {
      priceFrom: 69000,
      priceTo: 70000,
      stopLoss: 67000,
      secondaryPrice: 68000,
    })

    expect(issues).toHaveLength(0)
  })

  it('validates exit short happy path with no issues', () => {
    const issues = validate('exit', 'short', {
      priceFrom: 64000,
      priceTo: 63000,
      stopLoss: 69000,
      secondaryPrice: 68000,
    })

    expect(issues).toHaveLength(0)
  })

  it('flags stop-loss against entry price for exit long', () => {
    const issues = validate('exit', 'long', {
      priceFrom: 69000,
      priceTo: 70000,
      stopLoss: 68100,
      secondaryPrice: 68000,
    })

    expect(issues.some((issue) => issue.field === 'stopLoss')).toBe(true)
  })
})
