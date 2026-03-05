import type { CalculatorMode, PositionDirection } from '@/types'
import { INPUT_VALIDATION_REVIEW_PROMPT, MAGIC_VALIDATION_MESSAGES } from '@/utils/magicValidationMessages'

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

export type MagicErrorField = 'priceRange' | 'priceFrom' | 'priceTo' | 'stopLoss' | 'secondaryPrice'
export type MagicIssueType = 'error' | 'warning'

export interface MagicValidationIssue {
  field: MagicErrorField
  message: string
  type: MagicIssueType
}

type MagicScenarioRuleResolver = (values: MagicRangeValues) => MagicValidationIssue[]

const makeIssue = (
  field: MagicErrorField,
  message: string,
  type: MagicIssueType = 'error',
): MagicValidationIssue => ({ field, message, type })

interface RangePoint {
  field: 'priceFrom' | 'priceTo'
  value: number
}

const getRangePoints = (values: MagicRangeValues): RangePoint[] => [
  { field: 'priceFrom', value: values.priceFrom },
  { field: 'priceTo', value: values.priceTo },
]

const collectInvalidRangeFields = (
  points: RangePoint[],
  isInvalid: (value: number) => boolean,
): MagicErrorField[] =>
  points
    .filter((point) => isInvalid(point.value))
    .map((point) => point.field)

const createRangeTargetIssues = (
  points: RangePoint[],
  targetField: 'secondaryPrice' | 'stopLoss',
  areAllInvalidMessage: string,
  rangeFieldMessage: string,
  invalidFields: MagicErrorField[],
): MagicValidationIssue[] => {
  if (invalidFields.length === 0) return []

  if (invalidFields.length === points.length) {
    return [makeIssue(targetField, `${areAllInvalidMessage} ${INPUT_VALIDATION_REVIEW_PROMPT}`)]
  }

  return [
    makeIssue(targetField, `${areAllInvalidMessage} ${INPUT_VALIDATION_REVIEW_PROMPT}`),
    ...invalidFields.map((field) => makeIssue(field, `${rangeFieldMessage} ${INPUT_VALIDATION_REVIEW_PROMPT}`)),
  ]
}

const buildEntryLongIssues = (values: MagicRangeValues): MagicValidationIssue[] => {
  const points = getRangePoints(values)
  const tpInvalidFields = collectInvalidRangeFields(points, (value) => value >= values.secondaryPrice)
  const slInvalidFields = collectInvalidRangeFields(points, (value) => value <= values.stopLoss)

  return [
    ...createRangeTargetIssues(
      points,
      'secondaryPrice',
      MAGIC_VALIDATION_MESSAGES.entry.long.takeProfitRange,
      MAGIC_VALIDATION_MESSAGES.entry.long.takeProfitRangePoint,
      tpInvalidFields,
    ),
    ...createRangeTargetIssues(
      points,
      'stopLoss',
      MAGIC_VALIDATION_MESSAGES.entry.long.stopLossRange,
      MAGIC_VALIDATION_MESSAGES.entry.long.stopLossRangePoint,
      slInvalidFields,
    ),
  ]
}

const buildEntryShortIssues = (values: MagicRangeValues): MagicValidationIssue[] => {
  const points = getRangePoints(values)
  const tpInvalidFields = collectInvalidRangeFields(points, (value) => value <= values.secondaryPrice)
  const slInvalidFields = collectInvalidRangeFields(points, (value) => value >= values.stopLoss)

  return [
    ...createRangeTargetIssues(
      points,
      'secondaryPrice',
      MAGIC_VALIDATION_MESSAGES.entry.short.takeProfitRange,
      MAGIC_VALIDATION_MESSAGES.entry.short.takeProfitRangePoint,
      tpInvalidFields,
    ),
    ...createRangeTargetIssues(
      points,
      'stopLoss',
      MAGIC_VALIDATION_MESSAGES.entry.short.stopLossRange,
      MAGIC_VALIDATION_MESSAGES.entry.short.stopLossRangePoint,
      slInvalidFields,
    ),
  ]
}

const buildExitLongIssues = (values: MagicRangeValues): MagicValidationIssue[] => {
  const points = getRangePoints(values)
  const entryInvalidFields = collectInvalidRangeFields(points, (value) => value <= values.secondaryPrice)
  const slRangeInvalidFields = collectInvalidRangeFields(points, (value) => value <= values.stopLoss)

  return [
    ...createRangeTargetIssues(
      points,
      'secondaryPrice',
      MAGIC_VALIDATION_MESSAGES.exit.long.entryPriceRange,
      MAGIC_VALIDATION_MESSAGES.exit.long.entryPriceRangePoint,
      entryInvalidFields,
    ),
    ...(values.stopLoss >= values.secondaryPrice
      ? [makeIssue('stopLoss', `${MAGIC_VALIDATION_MESSAGES.exit.long.stopLossEntryPrice} ${INPUT_VALIDATION_REVIEW_PROMPT}`)]
      : []),
    ...createRangeTargetIssues(
      points,
      'stopLoss',
      MAGIC_VALIDATION_MESSAGES.exit.long.stopLossRange,
      MAGIC_VALIDATION_MESSAGES.exit.long.stopLossRangePoint,
      slRangeInvalidFields,
    ),
  ]
}

const buildExitShortIssues = (values: MagicRangeValues): MagicValidationIssue[] => {
  const points = getRangePoints(values)
  const entryInvalidFields = collectInvalidRangeFields(points, (value) => value >= values.secondaryPrice)
  const slRangeInvalidFields = collectInvalidRangeFields(points, (value) => value >= values.stopLoss)

  return [
    ...createRangeTargetIssues(
      points,
      'secondaryPrice',
      MAGIC_VALIDATION_MESSAGES.exit.short.entryPriceRange,
      MAGIC_VALIDATION_MESSAGES.exit.short.entryPriceRangePoint,
      entryInvalidFields,
    ),
    ...(values.stopLoss <= values.secondaryPrice
      ? [makeIssue('stopLoss', `${MAGIC_VALIDATION_MESSAGES.exit.short.stopLossEntryPrice} ${INPUT_VALIDATION_REVIEW_PROMPT}`)]
      : []),
    ...createRangeTargetIssues(
      points,
      'stopLoss',
      MAGIC_VALIDATION_MESSAGES.exit.short.stopLossRange,
      MAGIC_VALIDATION_MESSAGES.exit.short.stopLossRangePoint,
      slRangeInvalidFields,
    ),
  ]
}

const RULES_BY_SCENARIO: Record<MagicScenarioKey, MagicScenarioRuleResolver> = {
  'entry:long': buildEntryLongIssues,
  'entry:short': buildEntryShortIssues,
  'exit:long': buildExitLongIssues,
  'exit:short': buildExitShortIssues,
}

export const getMagicScenarioKey = (mode: CalculatorMode, direction: PositionDirection): MagicScenarioKey =>
  `${mode}:${direction}`

export const validateRangeByScenario = (
  mode: CalculatorMode,
  direction: PositionDirection,
  values: MagicRangeValues,
) => {
  const key = getMagicScenarioKey(mode, direction)
  return RULES_BY_SCENARIO[key](values)
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
