<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import { useExitCalculatorStore } from '@/stores/exitCalculator'
import type { PositionDirection } from '@/types'
import MagicPositionModal from './MagicPositionModal.vue'

const store = useCalculatorStore()
const exitStore = useExitCalculatorStore()

const isExitMode = computed(() => store.mode === 'exit')

const handleDirectionChange = (dir: PositionDirection) => {
  store.setDirection(dir)
}

const slValidationActive = computed(() => {
  if (isExitMode.value) {
    return !exitStore.isStopLossValidForExit
  }
  return !store.isStopLossValid
})

const slValidationMessage = computed(() => {
  if (isExitMode.value) {
    return exitStore.stopLossExitValidationMessage
  }
  return store.stopLossValidationMessage
})

const isMagicModalOpen = ref(false)

const handleOpenMagicModal = () => {
  isMagicModalOpen.value = true
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <h2 class="text-xl font-semibold text-white mb-4">Настройки позиции</h2>

    <div class="flex flex-wrap items-start justify-start gap-4 md:gap-6">
      <!-- Ticker -->
      <div class="w-full md:flex-1 md:min-w-[140px] lg:min-w-[150px]">
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
      <div class="w-full md:flex-1 md:min-w-[180px] lg:min-w-[200px]">
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

      <!-- Stop Loss (shared) -->
      <div class="w-full md:flex-1 md:min-w-[150px] lg:min-w-[165px]">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Стоп-лосс
        </label>
        <input
          v-model.number="store.stopLoss"
          type="number"
          step="0.01"
          :class="[
            'w-full px-3 py-2 bg-slate-700 rounded-md text-white focus:outline-none focus:ring-2',
            slValidationActive
              ? 'border-2 border-yellow-500 focus:ring-yellow-500'
              : 'border border-slate-600 focus:ring-blue-500'
          ]"
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
            v-if="slValidationActive"
            class="mt-1 overflow-hidden text-xs text-yellow-400"
          >
            <div class="flex items-start gap-1 whitespace-normal break-words leading-relaxed">
              <span class="mt-0.5">⚠️</span>
              <span>{{ slValidationMessage }}</span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Entry mode: Take Profit -->
      <div v-if="!isExitMode" class="w-full md:flex-1 md:min-w-[150px] lg:min-w-[165px]">
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
        />
        <div
          v-if="!store.isTakeProfitValid"
          class="mt-1 text-xs text-yellow-400 flex items-center gap-1"
        >
          <span>⚠️</span>
          <span>{{ store.takeProfitValidationMessage }}</span>
        </div>
      </div>

      <div
        v-if="!isExitMode"
        class="w-full md:basis-full md:flex md:justify-center xl:ml-auto xl:basis-auto xl:w-auto xl:justify-start xl:pt-7"
      >
        <button
          type="button"
          class="group relative h-[42px] w-full max-w-[260px] md:w-[240px] xl:w-[220px] rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4 py-2 font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_22px_rgba(217,70,239,0.45)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          aria-label="Открыть модальное окно расчета позиции"
          tabindex="0"
          @click="handleOpenMagicModal"
        >
          <span class="absolute inset-0 rounded-xl border border-white/20" />
          <span class="relative flex items-center justify-center gap-2 text-sm">
            <span class="drop-shadow-[0_0_6px_rgba(255,255,255,0.75)]">✨</span>
            <span>Рассчитать позицию</span>
          </span>
        </button>
      </div>

      <!-- Exit mode: Entry Price -->
      <div v-if="isExitMode" class="w-full md:flex-1 md:min-w-[150px] lg:min-w-[165px]">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Цена входа
        </label>
        <input
          v-model.number="exitStore.entryPrice"
          type="number"
          step="0.01"
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="88000"
        />
      </div>

      <!-- Exit mode: Total Volume -->
      <div
        v-if="isExitMode"
        class="w-full md:basis-[calc(50%-0.75rem)] md:min-w-[250px] xl:flex-1 xl:min-w-[165px]"
      >
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Объем позиции (USDT)
        </label>
        <input
          v-model.number="exitStore.totalVolume"
          type="number"
          step="0.01"
          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1000"
        />
      </div>

      <div
        v-if="isExitMode"
        class="w-full md:basis-[calc(50%-0.75rem)] md:min-w-[250px] md:flex md:justify-center md:pt-7 xl:ml-auto xl:basis-auto xl:min-w-0 xl:w-auto xl:justify-start"
      >
        <button
          type="button"
          class="group relative h-[42px] w-full max-w-[260px] md:w-[240px] xl:w-[220px] rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 px-4 py-2 font-semibold text-white shadow-[0_0_16px_rgba(56,189,248,0.35)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_22px_rgba(217,70,239,0.45)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          aria-label="Открыть модальное окно расчета позиции"
          tabindex="0"
          @click="handleOpenMagicModal"
        >
          <span class="absolute inset-0 rounded-xl border border-white/20" />
          <span class="relative flex items-center justify-center gap-2 text-sm">
            <span class="drop-shadow-[0_0_6px_rgba(255,255,255,0.75)]">✨</span>
            <span>Рассчитать позицию</span>
          </span>
        </button>
      </div>
    </div>
  </div>

  <MagicPositionModal
    v-model="isMagicModalOpen"
    :mode="store.mode"
  />
</template>
