<script setup lang="ts">
import { computed } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import type { Entry } from '@/types'

const props = defineProps<{
  entry: Entry
  index: number
}>()

const store = useCalculatorStore()

const scenario = computed(() => {
  return store.getScenarioForEntry(props.entry.id)
})

const isEntryValid = computed(() => {
  return store.isEntryValid(props.entry.id)
})

const entryValidationMessage = computed(() => {
  if (isEntryValid.value || props.entry.price <= 0) return ''
  
  if (store.direction === 'short') {
    return 'Цена входа должна быть между TP и SL'
  } else {
    return 'Цена входа должна быть между SL и TP'
  }
})

const formatNumber = (num: number | undefined, decimals: number = 2): string => {
  if (num === undefined) return '-'
  return num.toFixed(decimals)
}

const formatCurrency = (num: number | undefined): string => {
  if (num === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

const handleRemove = () => {
  store.removeEntry(props.entry.id)
}

const handlePriceChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  store.updateEntry(props.entry.id, 'price', isNaN(value) ? 0 : value)
}

const handleAmountChange = (e: Event) => {
  const value = parseFloat((e.target as HTMLInputElement).value)
  store.updateEntry(props.entry.id, 'amount', isNaN(value) ? 0 : value)
}

const applyPreset = (presetValue: number) => {
  store.applyPreset(props.entry.id, presetValue)
}
</script>

<template>
  <tr class="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
    <!-- Index -->
    <td class="py-3 px-2 text-gray-300">{{ index + 1 }}</td>
    
    <!-- Price -->
    <td class="py-3 px-2">
      <div class="relative">
        <input
          :value="entry.price"
          @input="handlePriceChange"
          type="number"
          step="0.01"
          :class="[
            'w-32 px-2 py-1 bg-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2',
            !isEntryValid && entry.price > 0
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500'
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
    
    <!-- Amount -->
    <td class="py-3 px-2">
      <input
        :value="entry.amount"
        @input="handleAmountChange"
        type="number"
        step="0.01"
        class="w-32 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="100"
      />
    </td>
    
    <!-- Presets -->
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
    
    <!-- Average Price -->
    <td class="py-3 px-2 text-white font-medium">
      {{ formatNumber(scenario?.avgPrice, 2) }}
    </td>
    
    <!-- Total Quantity -->
    <td class="py-3 px-2 text-gray-300 text-sm">
      {{ formatNumber(scenario?.totalQty, 6) }}
    </td>
    
    <!-- % to SL -->
    <td class="py-3 px-2 text-red-400 font-medium">
      {{ formatNumber(scenario?.percentToStop, 2) }}%
    </td>
    
    <!-- % to TP -->
    <td class="py-3 px-2 text-green-400 font-medium">
      {{ formatNumber(scenario?.percentToTake, 2) }}%
    </td>
    
    <!-- PnL at SL -->
    <td class="py-3 px-2 text-red-400 font-medium">
      {{ formatCurrency(scenario?.pnlAtStop) }}
    </td>
    
    <!-- PnL at TP -->
    <td class="py-3 px-2 text-green-400 font-medium">
      {{ formatCurrency(scenario?.pnlAtTake) }}
    </td>
    
    <!-- R/R -->
    <td class="py-3 px-2 text-white font-medium">
      {{ formatNumber(scenario?.riskReward, 2) }}
    </td>
    
    <!-- Remove button -->
    <td class="py-3 px-2">
      <button
        @click="handleRemove"
        class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
      >
        ✕
      </button>
    </td>
  </tr>
</template>
