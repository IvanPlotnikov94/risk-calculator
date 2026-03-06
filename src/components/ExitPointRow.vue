<script setup lang="ts">
import { computed } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import { useExitCalculatorStore } from '@/stores/exitCalculator'
import type { ExitPoint } from '@/types'
import {
  parsePercent,
  formatPercentDisplay,
  sanitizePercentPaste,
} from '@/utils/inputValidation'
import { usePriceInput } from '@/composables/usePriceInput'
import { formatNumber, formatCurrency, formatPercent } from '@/utils/formatters'

const props = defineProps<{
  exitPoint: ExitPoint
  index: number
}>()

const store = useCalculatorStore()
const exitStore = useExitCalculatorStore()

const { priceDisplay, handlePriceKeydown, handlePriceInput, handlePricePaste } = usePriceInput(
  () => props.exitPoint.exitPrice,
  (value) => exitStore.updateExitPoint(props.exitPoint.id, 'exitPrice', value),
)

const scenario = computed(() => exitStore.getScenarioForExit(props.exitPoint.id))

const isPriceValid = computed(() => exitStore.isExitPriceValid(props.exitPoint.id))

const priceValidationMessage = computed(() => {
  if (isPriceValid.value || props.exitPoint.exitPrice <= 0) return ''
  return store.direction === 'long'
    ? 'Цена выхода должна быть выше цены входа для Long'
    : 'Цена выхода должна быть ниже цены входа для Short'
})

const maxPercent = computed(() => exitStore.maxAvailablePercent(props.exitPoint.id))

const isPercentOverflow = computed(
  () => props.exitPoint.percent > 0 && props.exitPoint.percent > maxPercent.value + 0.001,
)

const placeholderPercent = computed(() => {
  if (props.index === 0 && exitStore.exitPoints.length === 1) return '0.5-100%'
  const max = Math.round(maxPercent.value * 100) / 100
  return max > 0 ? `0.5-${max}%` : '0.5%'
})

const isRRSuspicious = computed(() => {
  if (!scenario.value) return false
  return scenario.value.riskReward > 10 || scenario.value.riskReward < 0.2
})

const handlePercentInput = (e: Event) => {
  const value = parsePercent((e.target as HTMLInputElement).value)
  exitStore.updateExitPoint(props.exitPoint.id, 'percent', value)
}

const handlePercentPaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const value = sanitizePercentPaste(e.clipboardData?.getData('text') ?? '')
  exitStore.updateExitPoint(props.exitPoint.id, 'percent', value)
}

const handleRemove = () => exitStore.removeExitPoint(props.exitPoint.id)
</script>

<template>
  <tr class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
    <td class="py-3 px-2 text-gray-300 text-sm">{{ index + 1 }}</td>

    <td class="py-3 px-2 align-top">
      <div class="flex flex-col gap-1">
        <input
          :value="priceDisplay"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          aria-label="Цена выхода, от 0 до 9999999"
          @input="handlePriceInput"
          @keydown="handlePriceKeydown"
          @paste="handlePricePaste"
          :class="[
            'w-28 px-2 py-1 bg-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2',
            !isPriceValid && exitPoint.exitPrice > 0
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500',
          ]"
          placeholder="90000"
        />
        <Transition
          enter-active-class="transition-all duration-250 ease-out"
          enter-from-class="opacity-0 -translate-y-1 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-16"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-16"
          leave-to-class="opacity-0 -translate-y-1 max-h-0"
        >
          <div
            v-if="!isPriceValid && exitPoint.exitPrice > 0"
            class="overflow-hidden text-xs text-yellow-400"
          >
            <div class="flex items-start gap-1 whitespace-normal break-words leading-relaxed">
              <span class="mt-0.5">⚠️</span>
              <span>{{ priceValidationMessage }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </td>

    <td class="py-3 px-2 align-top">
      <div class="flex flex-col gap-1">
        <input
          :value="formatPercentDisplay(exitPoint.percent) || ''"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          aria-label="Процент объема, от 0.5 до 100"
          @input="handlePercentInput"
          @keydown="handlePriceKeydown"
          @paste="handlePercentPaste"
          :class="[
            'w-24 px-2 py-1 bg-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2',
            isPercentOverflow
              ? 'border-2 border-red-500 focus:ring-red-500'
              : 'border border-slate-600 focus:ring-blue-500',
          ]"
          :placeholder="placeholderPercent"
        />
        <Transition
          enter-active-class="transition-all duration-250 ease-out"
          enter-from-class="opacity-0 -translate-y-1 max-h-0"
          enter-to-class="opacity-100 translate-y-0 max-h-16"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 max-h-16"
          leave-to-class="opacity-0 -translate-y-1 max-h-0"
        >
          <div
            v-if="isPercentOverflow"
            class="overflow-hidden text-xs text-red-400"
          >
            <div class="flex items-start gap-1 whitespace-normal break-words leading-relaxed">
              <span class="mt-0.5">⚠️</span>
              <span>Доступно: {{ formatNumber(maxPercent) }}%</span>
            </div>
          </div>
        </Transition>
      </div>
    </td>

    <td class="py-3 px-2 text-center text-white font-medium text-sm">
      {{ scenario ? formatNumber(scenario.avgExitPrice) : '' }}
    </td>

    <td class="py-3 px-2 text-center text-gray-300 text-sm">
      {{ scenario ? formatCurrency(scenario.volumeUSDT) : '' }}
    </td>

    <td class="py-3 px-2 text-center text-gray-300 text-sm">
      <template v-if="scenario">
        {{ formatNumber(scenario.volumeTicker, 6) }} {{ store.ticker }}
      </template>
    </td>

    <td class="py-3 px-2 text-green-400 font-medium text-sm">
      {{ scenario ? formatPercent(scenario.percentToTP) : '' }}
    </td>

    <td class="py-3 px-2 font-medium text-sm">
      <span
        v-if="scenario"
        :class="scenario.pnlAtTP >= 0 ? 'text-green-400' : 'text-red-400'"
      >
        {{ formatCurrency(scenario.pnlAtTP) }}
      </span>
    </td>

    <td class="py-3 px-2 font-medium text-sm text-gray-400">
      <template v-if="scenario">
        <span
          v-if="scenario.pnlAtSL !== undefined"
          :class="scenario.pnlAtSL >= 0 ? 'text-green-400' : 'text-red-400'"
        >
          {{ formatCurrency(scenario.pnlAtSL) }}
        </span>
        <span v-else aria-label="Не применимо — позиция полностью закрыта на последнем TP">—</span>
      </template>
    </td>

    <td class="py-3 px-2 text-sm">
      <div v-if="scenario" class="flex items-center gap-1">
        <span :class="['font-medium', isRRSuspicious ? 'text-yellow-400' : 'text-white']">
          {{ formatNumber(scenario.riskReward) }}
        </span>
        <span
          v-if="isRRSuspicious"
          class="text-yellow-400 text-xs"
          :title="
            scenario.riskReward > 10
              ? 'R/R слишком высокий — проверьте данные'
              : 'R/R слишком низкий — проверьте данные'
          "
        >
          ⚠️
        </span>
      </div>
    </td>

    <td class="py-3 px-2">
      <button
        @click="handleRemove"
        class="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label="Удалить точку выхода"
        tabindex="0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </td>
  </tr>
</template>
