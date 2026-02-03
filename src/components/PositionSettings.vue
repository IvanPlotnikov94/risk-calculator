<script setup lang="ts">
import { useCalculatorStore } from '@/stores/calculator'
import type { PositionDirection } from '@/types'

const store = useCalculatorStore()

const handleDirectionChange = (dir: PositionDirection) => {
  store.setDirection(dir)
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <h2 class="text-xl font-semibold text-white mb-4">Настройки позиции</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Ticker -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Тикер
        </label>
        <input
          v-model="store.ticker"
          type="text"
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="BTC"
        />
      </div>

      <!-- Direction -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Направление
        </label>
        <div class="flex gap-2">
          <button
            @click="handleDirectionChange('long')"
            :class="[
              'flex-1 px-4 py-2 rounded-md font-medium transition-colors',
              store.direction === 'long'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            ]"
          >
            Long
          </button>
          <button
            @click="handleDirectionChange('short')"
            :class="[
              'flex-1 px-4 py-2 rounded-md font-medium transition-colors',
              store.direction === 'short'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            ]"
          >
            Short
          </button>
        </div>
      </div>

      <!-- Stop Loss -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Стоп-лосс
        </label>
        <input
          v-model.number="store.stopLoss"
          type="number"
          step="0.01"
          :class="[
            'w-full px-3 py-2 bg-slate-700 rounded-md text-white focus:outline-none focus:ring-2',
            !store.isStopLossValid
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500'
          ]"
          placeholder="93000"
        />
        <div
          v-if="!store.isStopLossValid"
          class="mt-1 text-xs text-yellow-400 flex items-center gap-1"
        >
          <span>⚠️</span>
          <span>{{ store.stopLossValidationMessage }}</span>
        </div>
      </div>

      <!-- Take Profit -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Тейк-профит
        </label>
        <input
          v-model.number="store.takeProfit"
          type="number"
          step="0.01"
          :class="[
            'w-full px-3 py-2 bg-slate-700 rounded-md text-white focus:outline-none focus:ring-2',
            !store.isTakeProfitValid
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500'
          ]"
          placeholder="85000"
        />
        <div
          v-if="!store.isTakeProfitValid"
          class="mt-1 text-xs text-yellow-400 flex items-center gap-1"
        >
          <span>⚠️</span>
          <span>{{ store.takeProfitValidationMessage }}</span>
        </div>
      </div>

      <!-- Add Entry Button -->
      <div class="flex items-end">
        <button
          @click="store.addEntry"
          class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          + Добавить вход
        </button>
      </div>
    </div>
  </div>
</template>
