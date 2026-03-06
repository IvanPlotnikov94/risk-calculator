<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { useCalculatorStore } from '@/stores/calculator'
import { useExitCalculatorStore } from '@/stores/exitCalculator'
import type { CalculatorMode, DistributionMode, EntryAutoCalculateParams, ExitAutoCalculateParams } from '@/types'
import { handleDecimalKeydown } from '@/utils/inputValidation'
import {
  MAGIC_MODAL_LIMITS,
  MAGIC_MODAL_UI_TEXT,
  buildLinearPercents,
  formatDecimal,
  parseDecimal,
  sanitizeDecimalInput,
  validateRangeByScenario,
} from '@/utils/magicPositionModal'

interface MagicModalForm {
  riskUSDT: string
  pointsCount: number
  priceFrom: string
  priceTo: string
  distributionMode: DistributionMode
  manualPercents: string[]
  linearCoefficient: number
  stopLoss: string
  secondaryPrice: string
}

type PrimaryFieldKey = keyof Pick<MagicModalForm, 'riskUSDT' | 'priceFrom' | 'priceTo' | 'stopLoss' | 'secondaryPrice'>
type ValidationTarget = {
  riskUSDT: number
  pointsCount: number
  priceFrom: number
  priceTo: number
  stopLoss: number
  secondaryPrice: number
  linearCoefficient: number
}

const STORAGE_KEYS: Record<CalculatorMode, string> = {
  entry: 'risk-calculator-magic-entry',
  exit: 'risk-calculator-magic-exit',
}

const props = defineProps<{
  modelValue: boolean
  mode: CalculatorMode
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const calculatorStore = useCalculatorStore()
const exitStore = useExitCalculatorStore()

const uiText = computed(() => MAGIC_MODAL_UI_TEXT[props.mode])
const storageKey = computed(() => STORAGE_KEYS[props.mode])
const modeDirection = computed(() => calculatorStore.direction)

const form = reactive<MagicModalForm>({
  riskUSDT: '',
  pointsCount: 3,
  priceFrom: '',
  priceTo: '',
  distributionMode: 'linear',
  manualPercents: ['34', '33', '33'],
  linearCoefficient: 1,
  stopLoss: '',
  secondaryPrice: '',
})

const errorMap = reactive<Record<string, string>>({})
const warningMap = reactive<Record<string, string>>({})
const isLiveValidationEnabled = ref(false)

const baseSchema = z.object({
  riskUSDT: z.number().min(MAGIC_MODAL_LIMITS.minRisk).max(MAGIC_MODAL_LIMITS.maxRisk),
  pointsCount: z.number().int().min(MAGIC_MODAL_LIMITS.minPoints).max(MAGIC_MODAL_LIMITS.maxPoints),
  priceFrom: z.number().positive(),
  priceTo: z.number().positive(),
  stopLoss: z.number().positive(),
  secondaryPrice: z.number().positive(),
  linearCoefficient: z.number().min(MAGIC_MODAL_LIMITS.minCoefficient).max(MAGIC_MODAL_LIMITS.maxCoefficient),
})

const title = computed(() => uiText.value.title)
const countLabel = computed(() => uiText.value.countLabel)
const rangeLabel = computed(() => uiText.value.rangeLabel)
const distributionLabel = computed(() => uiText.value.distributionLabel)
const secondaryLabel = computed(() => uiText.value.secondaryLabel)
const secondaryPlaceholder = computed(() => uiText.value.secondaryPlaceholder)
const linearLabel = computed(() => uiText.value.linearLabel)
const pointWord = computed(() => uiText.value.pointWord)

const normalizeManualPercents = () => {
  while (form.manualPercents.length < form.pointsCount) form.manualPercents.push('')
  if (form.manualPercents.length > form.pointsCount) form.manualPercents.splice(form.pointsCount)
}

const setEqualManualPercents = () => {
  if (form.pointsCount <= 0) return
  const percents = buildLinearPercents(form.pointsCount, 1)
  form.manualPercents = percents.map((percent) => {
    const fixed = percent.toFixed(2)
    return fixed.replace(/\.?0+$/, '')
  })
}

const manualPercentNumbers = computed(() => form.manualPercents.map((item) => parseDecimal(item)))
const manualPercentSum = computed(() =>
  manualPercentNumbers.value.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
)
const manualPercentRemaining = computed(() => 100 - manualPercentSum.value)

const linearPreviewPercents = computed(() => buildLinearPercents(form.pointsCount, form.linearCoefficient))

const clearErrors = () => {
  Object.keys(errorMap).forEach((key) => delete errorMap[key])
  Object.keys(warningMap).forEach((key) => delete warningMap[key])
}

const parseFormNumericValues = () => ({
  riskUSDT: parseDecimal(form.riskUSDT),
  pointsCount: form.pointsCount,
  priceFrom: parseDecimal(form.priceFrom),
  priceTo: parseDecimal(form.priceTo),
  stopLoss: parseDecimal(form.stopLoss),
  secondaryPrice: parseDecimal(form.secondaryPrice),
  linearCoefficient: form.linearCoefficient,
})

const validateRequiredFields = (): boolean => {
  let valid = true
  const requiredStringFields: Array<{ key: keyof Pick<MagicModalForm, 'riskUSDT' | 'priceFrom' | 'priceTo' | 'stopLoss' | 'secondaryPrice'>; label: string }> = [
    { key: 'riskUSDT', label: 'Пожалуйста, заполните поле' },
    { key: 'priceFrom', label: 'Пожалуйста, заполните поле' },
    { key: 'priceTo', label: 'Пожалуйста, заполните поле' },
    { key: 'stopLoss', label: 'Пожалуйста, заполните поле' },
    { key: 'secondaryPrice', label: 'Пожалуйста, заполните поле' },
  ]
  for (const { key, label } of requiredStringFields) {
    if (!form[key].trim()) {
      errorMap[key] = label
      valid = false
    }
  }
  return valid
}

const validateManualDistribution = () => {
  delete errorMap.manualPercents
  if (form.distributionMode !== 'manual') return

  const invalidPercentIndex = manualPercentNumbers.value.findIndex(
    (percent) => !Number.isFinite(percent) || percent < 0.1 || percent > 100,
  )
  if (invalidPercentIndex >= 0) {
    errorMap.manualPercents = `Процент для ${pointWord.value} ${invalidPercentIndex + 1} должен быть от 0.1 до 100`
    return
  }

  if (Math.abs(manualPercentSum.value - 100) > MAGIC_MODAL_LIMITS.percentSumTolerance) {
    errorMap.manualPercents = 'Сумма процентов должна равняться 100%'
  }
}

const validate = () => {
  clearErrors()

  if (!validateRequiredFields()) return false

  const numericValues = parseFormNumericValues()
  const parsed = baseSchema.safeParse(numericValues)

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const path = issue.path[0]
      if (typeof path !== 'string' || errorMap[path]) return
      errorMap[path] = path === 'riskUSDT'
        ? 'Риск должен быть от 1 до 999999 USDT'
        : 'Заполните поле корректно'
    })
    return false
  }

  validateManualDistribution()
  if (errorMap.manualPercents) return false

  const rangeIssues = validateRangeByScenario(props.mode, modeDirection.value, {
    priceFrom: parsed.data.priceFrom,
    priceTo: parsed.data.priceTo,
    stopLoss: parsed.data.stopLoss,
    secondaryPrice: parsed.data.secondaryPrice,
    pointsCount: parsed.data.pointsCount,
  })

  rangeIssues.forEach((issue) => {
    if (issue.type === 'warning') {
      if (!warningMap[issue.field]) warningMap[issue.field] = issue.message
    } else {
      if (!errorMap[issue.field]) errorMap[issue.field] = issue.message
    }
  })

  return Object.keys(errorMap).length === 0 && Object.keys(warningMap).length === 0
}

const getDistributionPercents = () =>
  form.distributionMode === 'manual' ? manualPercentNumbers.value : linearPreviewPercents.value

const parseValidatedTarget = (): ValidationTarget => ({
  riskUSDT: parseDecimal(form.riskUSDT),
  pointsCount: form.pointsCount,
  priceFrom: parseDecimal(form.priceFrom),
  priceTo: parseDecimal(form.priceTo),
  stopLoss: parseDecimal(form.stopLoss),
  secondaryPrice: parseDecimal(form.secondaryPrice),
  linearCoefficient: form.linearCoefficient,
})

const MODE_CALCULATORS = {
  entry: {
    run: (target: ValidationTarget, distributionPercents: number[]) =>
      calculatorStore.calculateEntriesFromRisk({
        riskUSDT: target.riskUSDT,
        entriesCount: target.pointsCount,
        priceFrom: target.priceFrom,
        priceTo: target.priceTo,
        stopLoss: target.stopLoss,
        takeProfit: target.secondaryPrice,
        distributionPercents,
      } satisfies EntryAutoCalculateParams),
    getActualRisk: () => calculatorStore.positionSummary.riskUSD,
  },
  exit: {
    run: (target: ValidationTarget, distributionPercents: number[]) =>
      exitStore.calculateExitsFromRisk({
        riskUSDT: target.riskUSDT,
        exitsCount: target.pointsCount,
        priceFrom: target.priceFrom,
        priceTo: target.priceTo,
        stopLoss: target.stopLoss,
        entryPrice: target.secondaryPrice,
        distributionPercents,
      } satisfies ExitAutoCalculateParams),
    getActualRisk: () => Math.abs(exitStore.exitPositionSummary.riskSL),
  },
} as const

const closeModal = () => emit('update:modelValue', false)

const handleClearForm = () => {
  isLiveValidationEnabled.value = false

  form.riskUSDT = ''
  form.pointsCount = MAGIC_MODAL_LIMITS.minPoints
  form.priceFrom = ''
  form.priceTo = ''
  form.distributionMode = 'linear'
  form.linearCoefficient = 1
  form.manualPercents = Array.from({ length: form.pointsCount }, () => '')
  form.stopLoss = ''
  form.secondaryPrice = ''

  clearErrors()
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target !== event.currentTarget) return
  closeModal()
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !props.modelValue) return
  closeModal()
}

const handleCountDecrease = () => {
  form.pointsCount = Math.max(MAGIC_MODAL_LIMITS.minPoints, form.pointsCount - 1)
}

const handleCountIncrease = () => {
  form.pointsCount = Math.min(MAGIC_MODAL_LIMITS.maxPoints, form.pointsCount + 1)
}

const handleDecimalFieldInput = (field: PrimaryFieldKey, event: Event) => {
  const input = event.target as HTMLInputElement
  const sanitized = sanitizeDecimalInput(input.value)
  form[field] = sanitized
  input.value = sanitized
  if (isLiveValidationEnabled.value) {
    validate()
  }
}

const handleManualPercentInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const sanitized = sanitizeDecimalInput(input.value, 2)
  form.manualPercents[index] = sanitized
  input.value = sanitized
  validateManualDistribution()
  if (isLiveValidationEnabled.value) {
    validate()
  }
}

const saveDraft = () => {
  localStorage.setItem(storageKey.value, JSON.stringify(form))
}

const loadDraft = () => {
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as Partial<MagicModalForm>
    form.riskUSDT = typeof parsed.riskUSDT === 'string' ? parsed.riskUSDT : form.riskUSDT
    form.pointsCount = typeof parsed.pointsCount === 'number'
      ? Math.min(Math.max(parsed.pointsCount, MAGIC_MODAL_LIMITS.minPoints), MAGIC_MODAL_LIMITS.maxPoints)
      : form.pointsCount
    form.priceFrom = typeof parsed.priceFrom === 'string' ? parsed.priceFrom : form.priceFrom
    form.priceTo = typeof parsed.priceTo === 'string' ? parsed.priceTo : form.priceTo
    form.distributionMode = parsed.distributionMode === 'manual' ? 'manual' : 'linear'
    form.manualPercents = Array.isArray(parsed.manualPercents)
      ? parsed.manualPercents.map((item) => String(item ?? ''))
      : form.manualPercents
    form.linearCoefficient = typeof parsed.linearCoefficient === 'number'
      ? Math.min(Math.max(parsed.linearCoefficient, MAGIC_MODAL_LIMITS.minCoefficient), MAGIC_MODAL_LIMITS.maxCoefficient)
      : form.linearCoefficient
    form.stopLoss = typeof parsed.stopLoss === 'string' ? parsed.stopLoss : form.stopLoss
    form.secondaryPrice = typeof parsed.secondaryPrice === 'string' ? parsed.secondaryPrice : form.secondaryPrice
  } catch {
    localStorage.removeItem(storageKey.value)
  }
}

const syncPrimaryFields = () => {
  const secondaryValueByMode: Record<CalculatorMode, number | null> = {
    entry: calculatorStore.takeProfit,
    exit: exitStore.entryPrice,
  }
  form.stopLoss = formatDecimal(calculatorStore.stopLoss)
  form.secondaryPrice = formatDecimal(secondaryValueByMode[props.mode])
}

const handleCalculate = () => {
  isLiveValidationEnabled.value = true
  if (!validate()) return

  const calculator = MODE_CALCULATORS[props.mode]
  const target = parseValidatedTarget()
  const distributionPercents = getDistributionPercents()
  const isCalculated = calculator.run(target, distributionPercents)

  if (!isCalculated) {
    errorMap.form = 'Не удалось рассчитать позицию. Проверьте корректность данных.'
    return
  }

  const actualRisk = calculator.getActualRisk()
  const deviation = target.riskUSDT > 0 ? Math.abs(actualRisk - target.riskUSDT) / target.riskUSDT : 1
  if (deviation > 0.03) {
    errorMap.riskUSDT = 'Расчет не сошелся с риском в пределах 3%. Уточните входные данные.'
    return
  }

  closeModal()
}

watch(
  () => form.pointsCount,
  (value) => {
    if (!Number.isFinite(value)) {
      form.pointsCount = MAGIC_MODAL_LIMITS.minPoints
      return
    }
    if (value < MAGIC_MODAL_LIMITS.minPoints) form.pointsCount = MAGIC_MODAL_LIMITS.minPoints
    if (value > MAGIC_MODAL_LIMITS.maxPoints) form.pointsCount = MAGIC_MODAL_LIMITS.maxPoints
    if (form.distributionMode === 'manual') {
      setEqualManualPercents()
    } else {
      normalizeManualPercents()
    }
    validateManualDistribution()
  },
  { immediate: true },
)

watch(
  () => form.distributionMode,
  (mode) => {
    if (mode === 'manual') {
      setEqualManualPercents()
    }
    validateManualDistribution()
  },
)

watch(
  () => props.modelValue,
  (isOpen) => {
    clearErrors()
    isLiveValidationEnabled.value = false
    if (!isOpen) return
    loadDraft()
    syncPrimaryFields()
    normalizeManualPercents()
  },
)

watch(
  form,
  () => {
    saveDraft()
  },
  { deep: true },
)

watch(
  () => props.mode,
  () => {
    clearErrors()
    isLiveValidationEnabled.value = false
    loadDraft()
    syncPrimaryFields()
    normalizeManualPercents()
  },
)

watch(
  [() => calculatorStore.stopLoss, () => calculatorStore.takeProfit, () => exitStore.entryPrice, () => props.mode],
  () => {
    if (!props.modelValue) return
    syncPrimaryFields()
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        @click="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            class="w-full max-w-[480px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-fuchsia-500/10"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
          >
            <div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
              <div class="flex items-center gap-2">
                <div class="group relative">
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-slate-800/95 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_14px_rgba(34,211,238,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-fuchsia-400/70 hover:text-white hover:shadow-[0_0_0_1px_rgba(168,85,247,0.35),0_0_18px_rgba(168,85,247,0.32)] focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    aria-label="Очистить поля на форме"
                    title="Очистить поля на форме"
                    tabindex="0"
                    @click="handleClearForm"
                  >
                    <svg
                      class="h-6 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-14deg]"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M7.2 14.2L13.8 7.6C14.7 6.7 16.2 6.7 17.1 7.6L18.8 9.3C19.7 10.2 19.7 11.7 18.8 12.6L12.2 19.2C11.8 19.6 11.3 19.8 10.8 19.8H7.5C6.7 19.8 6 19.1 6 18.3V15.6C6 15.1 6.3 14.6 7.2 14.2Z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M10.9 10.5L15.9 15.5"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M6 17.3H12.8"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                      <path
                        d="M16.9 5.9L20.1 2.7"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <span
                    class="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-slate-600 bg-slate-900/95 px-2 py-1 text-[11px] text-slate-100 opacity-0 shadow-lg shadow-black/35 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                    role="tooltip"
                  >
                    Очистить поля на форме
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-fuchsia-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  aria-label="Закрыть модальное окно"
                  tabindex="0"
                  @click="closeModal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="space-y-4 px-6 py-5">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-200">Риск при стоп-лоссе (USDT)</label>
                <input
                  :value="form.riskUSDT"
                  type="text"
                  inputmode="decimal"
                  placeholder="100"
                  class="w-full rounded-lg border bg-slate-800 px-3 py-2 text-white outline-none transition focus:ring-2"
                  :class="errorMap.riskUSDT ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40' : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/40'"
                  @input="handleDecimalFieldInput('riskUSDT', $event)"
                  @keydown="handleDecimalKeydown($event, form.riskUSDT)"
                />
                <p v-if="errorMap.riskUSDT" class="mt-1 text-xs text-red-400">{{ errorMap.riskUSDT }}</p>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-200">{{ countLabel }}</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="form.pointsCount"
                    type="number"
                    min="2"
                    max="10"
                    class="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                  />
                  <div class="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      class="h-7 w-8 rounded-md border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-cyan-400 hover:text-white"
                      aria-label="Увеличить количество точек"
                      tabindex="0"
                      @click="handleCountIncrease"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      class="h-7 w-8 rounded-md border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-cyan-400 hover:text-white"
                      aria-label="Уменьшить количество точек"
                      tabindex="0"
                      @click="handleCountDecrease"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <p v-if="errorMap.pointsCount" class="mt-1 text-xs text-red-400">{{ errorMap.pointsCount }}</p>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-200">{{ rangeLabel }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      :value="form.priceFrom"
                      type="text"
                      inputmode="decimal"
                      placeholder="От"
                      class="w-full rounded-lg border bg-slate-800 px-3 py-2 text-white outline-none transition focus:ring-2"
                      :class="errorMap.priceFrom ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40' : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/40'"
                      @input="handleDecimalFieldInput('priceFrom', $event)"
                      @keydown="handleDecimalKeydown($event, form.priceFrom)"
                    />
                    <p v-if="errorMap.priceFrom" class="mt-1 text-xs text-red-400">{{ errorMap.priceFrom }}</p>
                    <p v-else-if="warningMap.priceFrom" class="mt-1 text-xs text-yellow-400">{{ warningMap.priceFrom }}</p>
                  </div>
                  <div>
                    <input
                      :value="form.priceTo"
                      type="text"
                      inputmode="decimal"
                      placeholder="До"
                      class="w-full rounded-lg border bg-slate-800 px-3 py-2 text-white outline-none transition focus:ring-2"
                      :class="errorMap.priceTo ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40' : warningMap.priceTo ? 'border-yellow-500 focus:border-yellow-400 focus:ring-yellow-500/40' : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/40'"
                      @input="handleDecimalFieldInput('priceTo', $event)"
                      @keydown="handleDecimalKeydown($event, form.priceTo)"
                    />
                    <p v-if="errorMap.priceTo" class="mt-1 text-xs text-red-400">{{ errorMap.priceTo }}</p>
                    <p v-else-if="warningMap.priceTo" class="mt-1 text-xs text-yellow-400">{{ warningMap.priceTo }}</p>
                  </div>
                </div>
                <p v-if="errorMap.priceRange" class="mt-1 text-xs text-red-400">{{ errorMap.priceRange }}</p>
                <p v-else-if="warningMap.priceRange" class="mt-1 text-xs text-yellow-400">{{ warningMap.priceRange }}</p>
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-200">{{ distributionLabel }}</label>
                <div class="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-1">
                  <button
                    type="button"
                    class="rounded-lg px-3 py-2 text-sm font-medium transition"
                    :class="form.distributionMode === 'manual' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'text-slate-300 hover:bg-slate-700'"
                    tabindex="0"
                    @click="form.distributionMode = 'manual'"
                  >
                    Указать доли вручную
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-3 py-2 text-sm font-medium transition"
                    :class="form.distributionMode === 'linear' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'text-slate-300 hover:bg-slate-700'"
                    tabindex="0"
                    @click="form.distributionMode = 'linear'"
                  >
                    Линейно с коэффициентом
                  </button>
                </div>

                <Transition
                  enter-active-class="transition duration-250 ease-out"
                  enter-from-class="opacity-0 -translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-2"
                >
                  <div v-if="form.distributionMode === 'manual'" class="mt-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                    <div class="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1">
                      <div
                        v-for="(_, index) in form.pointsCount"
                        :key="`manual-${index}`"
                        class="grid grid-cols-[1fr_auto] items-center gap-2"
                      >
                        <label class="text-xs text-slate-300">{{ pointWord }} {{ index + 1 }}</label>
                        <input
                          :value="form.manualPercents[index]"
                          type="text"
                          inputmode="decimal"
                          placeholder="0.0"
                          class="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                          @input="handleManualPercentInput(index, $event)"
                          @keydown="handleDecimalKeydown($event, form.manualPercents[index] ?? '')"
                        />
                      </div>
                    </div>
                    <div class="mt-3 flex items-center justify-between text-xs">
                      <span class="text-slate-300">
                        Итого:
                        <span :class="Math.abs(manualPercentSum - 100) <= 0.1 ? 'text-green-400' : 'text-yellow-300'">
                          {{ manualPercentSum.toFixed(2) }}%
                        </span>
                      </span>
                      <span class="text-slate-300">
                        Осталось:
                        <span :class="manualPercentRemaining >= -0.1 ? 'text-cyan-300' : 'text-red-400'">
                          {{ manualPercentRemaining.toFixed(2) }}%
                        </span>
                      </span>
                    </div>
                    <p v-if="errorMap.manualPercents" class="mt-2 text-xs text-red-400">{{ errorMap.manualPercents }}</p>
                  </div>
                </Transition>

                <Transition
                  enter-active-class="transition duration-250 ease-out"
                  enter-from-class="opacity-0 -translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-2"
                >
                  <div v-if="form.distributionMode === 'linear'" class="mt-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                    <label class="mb-2 block text-xs text-slate-200">{{ linearLabel }}</label>
                    <div class="relative">
                      <input
                        v-model.number="form.linearCoefficient"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-slate-700 via-cyan-500/70 to-fuchsia-500/80"
                      />
                      <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>0.1</span>
                        <span class="rounded-full bg-slate-900 px-2 py-0.5 text-cyan-300 ring-1 ring-cyan-400/50">
                          {{ form.linearCoefficient.toFixed(1) }}
                        </span>
                        <span>2.0</span>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-1.5">
                      <span
                        v-for="(percent, index) in linearPreviewPercents"
                        :key="`preview-${index}`"
                        class="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        {{ pointWord }} {{ index + 1 }}: {{ percent.toFixed(2) }}%
                      </span>
                    </div>
                  </div>
                </Transition>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-200">Стоп-лосс</label>
                  <input
                    :value="form.stopLoss"
                    type="text"
                    inputmode="decimal"
                    placeholder="65000"
                    class="w-full rounded-lg border bg-slate-800 px-3 py-2 text-white outline-none transition focus:ring-2"
                    :class="errorMap.stopLoss ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40' : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/40'"
                    @input="handleDecimalFieldInput('stopLoss', $event)"
                    @keydown="handleDecimalKeydown($event, form.stopLoss)"
                  />
                  <p v-if="errorMap.stopLoss" class="mt-1 text-xs text-red-400">{{ errorMap.stopLoss }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-200">{{ secondaryLabel }}</label>
                  <input
                    :value="form.secondaryPrice"
                    type="text"
                    inputmode="decimal"
                    :placeholder="secondaryPlaceholder"
                    class="w-full rounded-lg border bg-slate-800 px-3 py-2 text-white outline-none transition focus:ring-2"
                    :class="errorMap.secondaryPrice ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40' : 'border-slate-700 focus:border-cyan-400 focus:ring-cyan-500/40'"
                    @input="handleDecimalFieldInput('secondaryPrice', $event)"
                    @keydown="handleDecimalKeydown($event, form.secondaryPrice)"
                  />
                  <p v-if="errorMap.secondaryPrice" class="mt-1 text-xs text-red-400">{{ errorMap.secondaryPrice }}</p>
                </div>
              </div>

              <p v-if="errorMap.form" class="text-xs text-red-400">{{ errorMap.form }}</p>
            </div>

            <div class="border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                class="mx-auto block rounded-xl border border-transparent bg-[linear-gradient(#0f172a,#0f172a),linear-gradient(90deg,#22d3ee,#a855f7)] bg-origin-border bg-clip-padding px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(34,211,238,0.25)] transition hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(168,85,247,0.35)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                aria-label="Рассчитать позицию"
                tabindex="0"
                @click="handleCalculate"
              >
                Рассчитать
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
