import type { CalculatorMode, PositionDirection } from '@/types'

export const MAGIC_MODAL_LIMITS = {
  minPoints: 2,
  maxPoints: 10,
  percentSumTolerance: 0.1,
  minRisk: 1,
  maxRisk: 999999,
  minCoefficient: 0.1,
  maxCoefficient: 2,
} as const

export type MagicScenarioKey = `${CalculatorMode}:${PositionDirection}`

export interface MagicModalUiText {
  title: string
  countLabel: string
  rangeLabel: string
  distributionLabel: string
  secondaryLabel: string
  secondaryPlaceholder: string
  linearLabel: string
  pointWord: string
}

export const MAGIC_MODAL_UI_TEXT: Record<CalculatorMode, MagicModalUiText> = {
  entry: {
    title: 'Рассчитать набор позиции',
    countLabel: 'Количество точек входа',
    rangeLabel: 'Диапазон цен входов',
    distributionLabel: 'Способ набора позиции',
    secondaryLabel: 'Тейк-профит',
    secondaryPlaceholder: '72000',
    linearLabel: 'Коэффициент увеличения/уменьшения суммы ордеров',
    pointWord: 'входа',
  },
  exit: {
    title: 'Рассчитать выход из позиции',
    countLabel: 'Количество точек выхода',
    rangeLabel: 'Диапазон цен выходов',
    distributionLabel: 'Способ выхода из позиции',
    secondaryLabel: 'Цена входа',
    secondaryPlaceholder: '68000',
    linearLabel: 'Коэффициент увеличения/уменьшения объема выхода',
    pointWord: 'выхода',
  },
}

export interface MagicRangeValues {
  priceFrom: number
  priceTo: number
  stopLoss: number
  secondaryPrice: number
  pointsCount: number
}

export type MagicErrorField = 'priceRange' | 'priceFrom' | 'priceTo'
export type MagicIssueType = 'error' | 'warning'

export interface MagicValidationIssue {
  field: MagicErrorField
  message: string
  type: MagicIssueType
}

interface MagicRangeRuleContext {
  values: MagicRangeValues
  delta: number
  boundary: number
}

type MagicRangeCheck = (context: MagicRangeRuleContext) => MagicValidationIssue | undefined
type BoundaryType = 'min' | 'max'

interface MagicRangeRuleSet {
  boundaryType: BoundaryType
  checks: MagicRangeCheck[]
}

const makeIssue = (
  field: MagicErrorField,
  message: string,
  type: MagicIssueType = 'error',
): MagicValidationIssue => ({ field, message, type })

const getDelta = (priceFrom: number, pointsCount: number) => priceFrom * 0.001 * pointsCount

const RULES_BY_SCENARIO: Record<MagicScenarioKey, MagicRangeRuleSet> = {
  'entry:long': {
    boundaryType: 'max',
    checks: [
      ({ values }) =>
        values.priceFrom > values.priceTo
          ? undefined
          : makeIssue('priceRange', 'Для Long цена "От" должна быть выше цены "До"'),
      ({ values }) =>
        values.priceFrom < values.secondaryPrice
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть ниже тейк-профита'),
      ({ values }) =>
        values.priceFrom > values.stopLoss
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть выше стоп-лосса'),
      ({ values }) =>
        values.priceTo > values.stopLoss
          ? undefined
          : makeIssue('priceTo', 'Цена "До" должна быть выше стоп-лосса'),
      ({ values, boundary }) =>
        values.priceTo <= boundary
          ? undefined
          : makeIssue('priceTo', `Укажите корректную цену. Максимум ${boundary.toFixed(2)}`, 'warning'),
    ],
  },
  'entry:short': {
    boundaryType: 'min',
    checks: [
      ({ values }) =>
        values.priceFrom < values.priceTo
          ? undefined
          : makeIssue('priceRange', 'Для Short цена "От" должна быть ниже цены "До"'),
      ({ values }) =>
        values.priceFrom > values.secondaryPrice
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть выше тейк-профита'),
      ({ values }) =>
        values.priceFrom < values.stopLoss
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть ниже стоп-лосса'),
      ({ values }) =>
        values.priceTo < values.stopLoss
          ? undefined
          : makeIssue('priceTo', 'Цена "До" должна быть ниже стоп-лосса'),
      ({ values, boundary }) =>
        values.priceTo >= boundary
          ? undefined
          : makeIssue('priceTo', `Укажите корректную цену. Минимум ${boundary.toFixed(2)}`, 'warning'),
    ],
  },
  'exit:long': {
    boundaryType: 'min',
    checks: [
      ({ values }) =>
        values.priceFrom < values.priceTo
          ? undefined
          : makeIssue('priceRange', 'Для Long цена "От" должна быть ниже цены "До"'),
      ({ values }) =>
        values.priceFrom > values.secondaryPrice
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть выше цены входа'),
      ({ values, boundary }) =>
        values.priceTo >= boundary
          ? undefined
          : makeIssue('priceTo', `Укажите корректную цену. Минимум ${boundary.toFixed(2)}`, 'warning'),
    ],
  },
  'exit:short': {
    boundaryType: 'max',
    checks: [
      ({ values }) =>
        values.priceFrom > values.priceTo
          ? undefined
          : makeIssue('priceRange', 'Для Short цена "От" должна быть выше цены "До"'),
      ({ values }) =>
        values.priceFrom < values.secondaryPrice
          ? undefined
          : makeIssue('priceFrom', 'Цена "От" должна быть ниже цены входа'),
      ({ values, boundary }) =>
        values.priceTo <= boundary
          ? undefined
          : makeIssue('priceTo', `Укажите корректную цену. Максимум ${boundary.toFixed(2)}`, 'warning'),
    ],
  },
}

const getBoundary = (boundaryType: BoundaryType, priceFrom: number, delta: number) =>
  boundaryType === 'min' ? priceFrom + delta : priceFrom - delta

export const getMagicScenarioKey = (mode: CalculatorMode, direction: PositionDirection): MagicScenarioKey =>
  `${mode}:${direction}`

export const getRangeBoundaryHint = (
  mode: CalculatorMode,
  direction: PositionDirection,
  priceFrom: number,
  pointsCount: number,
) => {
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) return ''

  const key = getMagicScenarioKey(mode, direction)
  const rule = RULES_BY_SCENARIO[key]
  const boundary = getBoundary(rule.boundaryType, priceFrom, getDelta(priceFrom, pointsCount))
  const label = rule.boundaryType === 'min' ? 'Минимум "До"' : 'Максимум "До"'
  return `${label}: ${boundary.toFixed(2)}`
}

export const validateRangeByScenario = (
  mode: CalculatorMode,
  direction: PositionDirection,
  values: MagicRangeValues,
) => {
  const key = getMagicScenarioKey(mode, direction)
  const rule = RULES_BY_SCENARIO[key]
  const delta = getDelta(values.priceFrom, values.pointsCount)
  const boundary = getBoundary(rule.boundaryType, values.priceFrom, delta)
  const context: MagicRangeRuleContext = { values, delta, boundary }

  return rule.checks
    .map((check) => check(context))
    .filter((issue): issue is MagicValidationIssue => issue !== undefined)
}

export const parseDecimal = (value: string) => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return NaN
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

export const formatDecimal = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return String(value)
}

export const sanitizeDecimalInput = (value: string, decimals = 6) => {
  const normalized = value.replace(',', '.')
  const safe = normalized.replace(/[^\d.]/g, '')
  const [intPartRaw = '', decimalPartRaw = ''] = safe.split('.')
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || (safe.startsWith('0') ? '0' : '')
  const decimalPart = decimalPartRaw.slice(0, decimals)
  if (safe.includes('.')) return `${intPart || '0'}.${decimalPart}`
  return intPart
}

export const buildLinearPercents = (pointsCount: number, coefficient: number) => {
  const rawWeights = Array.from({ length: pointsCount }, (_, index) => Math.pow(coefficient, index))
  const total = rawWeights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return Array.from({ length: pointsCount }, () => 0)

  const percents = rawWeights.map((weight) => (weight / total) * 100)
  const rounded = percents.map((percent) => Math.round(percent * 100) / 100)
  const diff = 100 - rounded.reduce((sum, percent) => sum + percent, 0)
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + diff) * 100) / 100
  return rounded
}
