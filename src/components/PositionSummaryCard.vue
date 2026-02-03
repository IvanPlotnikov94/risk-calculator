<script setup lang="ts">
import { useCalculatorStore } from '@/stores/calculator'

const store = useCalculatorStore()

const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals)
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <h2 class="text-xl font-semibold text-white mb-4">Сводка по позиции (все входы)</h2>
    
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <!-- Average Price -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Средняя цена</div>
        <div class="text-xl font-bold text-white">
          {{ formatNumber(store.positionSummary.avgPrice, 2) }}
        </div>
      </div>

      <!-- Total Quantity -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Общий объем</div>
        <div class="text-xl font-bold text-white">
          {{ formatNumber(store.positionSummary.totalQty, 6) }}
        </div>
      </div>

      <!-- Total Amount -->
      <div class="bg-slate-700 rounded-lg p-4">
        <div class="text-sm text-gray-400 mb-1">Общая сумма</div>
        <div class="text-xl font-bold text-white">
          {{ formatCurrency(store.positionSummary.totalAmount) }}
        </div>
      </div>

      <!-- Risk -->
      <div class="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div class="text-sm text-red-300 mb-1">Риск (SL)</div>
        <div class="text-xl font-bold text-red-400">
          {{ formatCurrency(store.positionSummary.riskUSD) }}
        </div>
      </div>

      <!-- Reward -->
      <div class="bg-green-900/30 border border-green-700 rounded-lg p-4">
        <div class="text-sm text-green-300 mb-1">Прибыль (TP)</div>
        <div class="text-xl font-bold text-green-400">
          {{ formatCurrency(store.positionSummary.rewardUSD) }}
        </div>
      </div>

      <!-- Risk/Reward -->
      <div 
        :class="[
          'rounded-lg p-4',
          store.isRiskRewardSuspicious 
            ? 'bg-yellow-900/30 border border-yellow-700' 
            : 'bg-slate-700'
        ]"
      >
        <div 
          :class="[
            'text-sm mb-1',
            store.isRiskRewardSuspicious ? 'text-yellow-300' : 'text-gray-400'
          ]"
        >
          R/R
        </div>
        <div 
          :class="[
            'text-xl font-bold',
            store.isRiskRewardSuspicious ? 'text-yellow-400' : 'text-white'
          ]"
        >
          {{ formatNumber(store.positionSummary.riskReward, 2) }}
        </div>
        <div 
          v-if="store.isRiskRewardSuspicious" 
          class="text-xs text-yellow-300 mt-1"
        >
          ⚠️ Проверьте данные
        </div>
      </div>
    </div>
  </div>
</template>
