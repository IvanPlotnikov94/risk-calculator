<script setup lang="ts">
import { useCalculatorStore } from '@/stores/calculator'
import { useExitCalculatorStore } from '@/stores/exitCalculator'

const store = useCalculatorStore()
const exitStore = useExitCalculatorStore()

const formatNumber = (num: number | undefined, decimals: number = 2, suffix: string = ''): string => {
  if (num === undefined || Number.isNaN(num) || !exitStore.hasMeaningfulExitSummary) return ''
  return `${num.toFixed(decimals)}${suffix ? ' ' + suffix : ''}`
}

const formatCurrency = (num: number | undefined): string => {
  if (num === undefined || Number.isNaN(num) || !exitStore.hasMeaningfulExitSummary) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
</script>

<template>
  <div v-if="exitStore.hasMeaningfulExitSummary" class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <h2 class="text-xl font-semibold text-white mb-4">Сводка по позиции</h2>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <!-- Average Exit Price -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Средняя цена выхода</div>
        <div class="text-xl font-bold text-white">
          {{ formatNumber(exitStore.exitPositionSummary.avgExitPrice) }}
        </div>
      </div>

      <!-- Total Volume (Ticker) -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Общий объем</div>
        <div class="text-xl font-bold text-white">
          {{ formatNumber(exitStore.exitPositionSummary.totalVolumeTicker, 6, store.ticker) }}
        </div>
      </div>

      <!-- Total Volume (USDT) -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Общая сумма</div>
        <div class="text-xl font-bold text-white">
          {{ formatCurrency(exitStore.exitPositionSummary.totalVolumeUSDT) }}
        </div>
      </div>

      <!-- Risk (SL) -->
      <div class="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div class="text-sm text-red-300 mb-1">Риск (SL)</div>
        <div class="text-xl font-bold text-red-400">
          {{ formatCurrency(exitStore.exitPositionSummary.riskSL) }}
        </div>
      </div>

      <!-- Profit (TP) -->
      <div class="bg-green-900/30 border border-green-700 rounded-lg p-4">
        <div class="text-sm text-green-300 mb-1">Прибыль (TP)</div>
        <div class="text-xl font-bold text-green-400">
          {{ formatCurrency(exitStore.exitPositionSummary.profitTP) }}
        </div>
      </div>

      <!-- R/R -->
      <div
        :class="[
          'rounded-lg p-4',
          exitStore.isRiskRewardSuspicious
            ? 'bg-yellow-900/30 border border-yellow-700'
            : 'bg-slate-700'
        ]"
      >
        <div
          :class="[
            'text-sm mb-1',
            exitStore.isRiskRewardSuspicious ? 'text-yellow-300' : 'text-gray-400'
          ]"
        >
          R/R
        </div>
        <div
          :class="[
            'text-xl font-bold',
            exitStore.isRiskRewardSuspicious ? 'text-yellow-400' : 'text-white'
          ]"
        >
          {{ formatNumber(exitStore.exitPositionSummary.riskReward) }}
        </div>
        <div
          v-if="exitStore.isRiskRewardSuspicious"
          class="text-xs text-yellow-300 mt-1"
        >
          ⚠️ Проверьте данные
        </div>
      </div>
    </div>
  </div>
</template>
