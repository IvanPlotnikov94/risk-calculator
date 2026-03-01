<script setup lang="ts">
import { computed } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import type { Entry } from '@/types'
import { usePriceInput } from '@/composables/usePriceInput'
import { formatNumber, formatCurrency, formatPercent } from '@/utils/formatters'

const props = defineProps<{
  entry: Entry
  index: number
}>()

const store = useCalculatorStore()

const { priceDisplay, handlePriceKeydown, handlePriceInput, handlePricePaste } = usePriceInput(
  () => props.entry.price,
  (value) => store.updateEntry(props.entry.id, 'price', value),
)

const scenario = computed(() => store.getScenarioForEntry(props.entry.id))

const isEntryValid = computed(() => store.isEntryValid(props.entry.id))

const entryValidationMessage = computed(() => {
  if (isEntryValid.value || props.entry.price <= 0) return ''
  return store.direction === 'short'
    ? 'Цена входа должна быть между TP и SL'
    : 'Цена входа должна быть между SL и TP'
})

const handleRemove = () => store.removeEntry(props.entry.id)

const handleDigitsOnlyKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'v') e.preventDefault()
    return
  }
  if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault()
}

const handlePaste = (e: ClipboardEvent) => e.preventDefault()

const handleAmountChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value, 10)
  store.updateEntry(props.entry.id, 'amount', isNaN(value) ? 0 : value)
}

const applyPreset = (presetValue: number) => store.applyPreset(props.entry.id, presetValue)
</script>

<template>
  <tr class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
    <td class="py-3 px-2 text-gray-300">{{ index + 1 }}</td>

    <td class="py-3 px-2">
      <div class="relative">
        <input
          :value="priceDisplay"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          aria-label="Цена входа, от 0 до 9999999"
          @input="handlePriceInput"
          @keydown="handlePriceKeydown"
          @paste="handlePricePaste"
          :class="[
            'w-32 px-2 py-1 bg-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2',
            !isEntryValid && entry.price > 0
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500',
          ]"
          placeholder="90000"
        />
        <div
          v-if="!isEntryValid && entry.price > 0"
          class="absolute left-0 top-full mt-1 text-xs text-yellow-400 whitespace-nowrap flex items-center gap-1 z-10"
        >
          <span>⚠️</span>
          <span>{{ entryValidationMessage }}</span>
        </div>
      </div>
    </td>

    <td class="py-3 px-2">
      <input
        :value="entry.amount || ''"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        aria-label="Сумма в USDT, только цифры"
        @input="handleAmountChange"
        @keydown="handleDigitsOnlyKeydown"
        @paste="handlePaste"
        class="w-32 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="100"
      />
    </td>

    <td class="py-3 px-2">
      <div class="flex gap-1">
        <button
          v-for="(preset, i) in store.presets"
          :key="i"
          v-show="preset > 0"
          @click="applyPreset(preset)"
          class="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition-colors"
        >
          {{ preset }}
        </button>
      </div>
    </td>

    <td class="py-3 px-2 text-white font-medium">
      {{ formatNumber(scenario?.avgPrice, 2) }}
    </td>

    <td class="py-3 px-2 text-gray-300 text-sm">
      {{ formatNumber(scenario?.totalQty, 6) }}
    </td>

    <td class="py-3 px-2 text-red-400 font-medium">
      {{ formatPercent(scenario?.percentToStop, 2) }}
    </td>

    <td class="py-3 px-2 text-green-400 font-medium">
      {{ formatPercent(scenario?.percentToTake, 2) }}
    </td>

    <td class="py-3 px-2 text-red-400 font-medium">
      {{ formatCurrency(scenario?.pnlAtStop) }}
    </td>

    <td class="py-3 px-2 text-green-400 font-medium">
      {{ formatCurrency(scenario?.pnlAtTake) }}
    </td>

    <td class="py-3 px-2 text-white font-medium">
      {{ formatNumber(scenario?.riskReward, 2) }}
    </td>

    <td class="py-3 px-2">
      <button
        @click="handleRemove"
        class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        aria-label="Удалить точку входа"
        tabindex="0"
      >
        ✕
      </button>
    </td>
  </tr>
</template>
