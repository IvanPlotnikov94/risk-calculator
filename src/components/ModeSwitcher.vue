<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import type { CalculatorMode } from '@/types'

const store = useCalculatorStore()

const modes: { key: CalculatorMode; label: string; tooltip: string }[] = [
  {
    key: 'entry',
    label: 'Multiple Entry',
    tooltip: 'Режим усреднения позиции: несколько точек входа с разными ценами и объемами, один общий Stop Loss и один Take Profit',
  },
  {
    key: 'exit',
    label: 'Multiple Exit',
    tooltip: 'Режим частичного закрытия: одна точка входа, один Stop Loss, несколько точек выхода с распределением объема позиции',
  },
]

const activeIndex = computed(() => modes.findIndex(m => m.key === store.mode))

const hoveredTooltip = ref<CalculatorMode | null>(null)

const handleModeChange = (mode: CalculatorMode) => {
  store.setMode(mode)
}

const handleKeyDown = (e: KeyboardEvent, mode: CalculatorMode) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleModeChange(mode)
  }
}
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <div class="relative inline-flex bg-slate-800 rounded-xl p-1 shadow-xl border border-slate-700/50">
      <!-- Sliding indicator -->
      <div
        class="absolute top-1 bottom-1 rounded-lg bg-blue-600 shadow-lg shadow-blue-600/25 transition-all duration-300 ease-out"
        :style="{
          width: `calc(50% - 4px)`,
          left: activeIndex === 0 ? '4px' : 'calc(50% + 0px)',
        }"
        aria-hidden="true"
      />

      <button
        v-for="m in modes"
        :key="m.key"
        :class="[
          'relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 whitespace-nowrap',
          store.mode === m.key
            ? 'text-white'
            : 'text-gray-400 hover:text-gray-200'
        ]"
        :aria-pressed="store.mode === m.key"
        role="tab"
        :tabindex="0"
        @click="handleModeChange(m.key)"
        @keydown="handleKeyDown($event, m.key)"
      >
        {{ m.label }}

        <!-- Info icon with tooltip -->
        <span
          class="relative inline-flex"
          @mouseenter="hoveredTooltip = m.key"
          @mouseleave="hoveredTooltip = null"
        >
          <span
            :class="[
              'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none border transition-colors',
              store.mode === m.key
                ? 'border-blue-300/50 text-blue-200'
                : 'border-gray-500 text-gray-500'
            ]"
            aria-label="Подробнее о режиме"
          >
            i
          </span>

          <!-- Tooltip -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="hoveredTooltip === m.key"
              class="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs text-gray-300 font-normal shadow-xl z-50 leading-relaxed"
            >
              {{ m.tooltip }}
              <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-l border-t border-slate-600 rotate-45" />
            </div>
          </Transition>
        </span>
      </button>
    </div>
  </div>
</template>
