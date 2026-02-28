<script setup lang="ts">
import { computed } from 'vue'
import { useExitCalculatorStore } from '@/stores/exitCalculator'

const exitStore = useExitCalculatorStore()

const RADIUS = 40
const STROKE = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SIZE = (RADIUS + STROKE) * 2

const allocated = computed(() => Math.min(exitStore.totalAllocatedPercent, 100))
const remaining = computed(() => exitStore.remainingPercent)

const allocatedDash = computed(() => {
  const len = (allocated.value / 100) * CIRCUMFERENCE
  return `${len} ${CIRCUMFERENCE - len}`
})

const statusColor = computed(() => {
  if (exitStore.isOverAllocated) return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500' }
  if (exitStore.isFullyAllocated) return { stroke: '#22c55e', text: 'text-green-400', bg: 'bg-green-500' }
  return { stroke: '#3b82f6', text: 'text-blue-400', bg: 'bg-blue-500' }
})

const statusMessage = computed(() => {
  if (exitStore.isOverAllocated) return 'Сумма превышает 100%'
  if (exitStore.isFullyAllocated) return 'Объем распределен полностью'
  return 'Распределите весь объем (100%)'
})
</script>

<template>
  <div class="flex items-center gap-6 py-3">
    <!-- Donut chart -->
    <div class="relative shrink-0">
      <svg
        :width="SIZE"
        :height="SIZE"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        class="transform -rotate-90"
      >
        <!-- Background ring -->
        <circle
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
          :stroke-width="STROKE"
          class="stroke-slate-700"
        />
        <!-- Allocated arc -->
        <circle
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
          :stroke-width="STROKE"
          :stroke="statusColor.stroke"
          stroke-linecap="round"
          :stroke-dasharray="allocatedDash"
          class="transition-all duration-500 ease-out"
          :style="{ filter: exitStore.isFullyAllocated ? `drop-shadow(0 0 4px ${statusColor.stroke})` : 'none' }"
        />
      </svg>
      <!-- Center text -->
      <div class="absolute inset-0 flex items-center justify-center">
        <span :class="['text-sm font-bold', statusColor.text]">
          {{ Math.round(allocated) }}%
        </span>
      </div>
    </div>

    <!-- Labels -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-3 text-sm">
        <div class="flex items-center gap-2">
          <span :class="['w-2.5 h-2.5 rounded-full', statusColor.bg]" />
          <span class="text-gray-300">Распределено: <span class="text-white font-medium">{{ allocated.toFixed(1) }}%</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-600" />
          <span class="text-gray-300">Осталось: <span class="text-white font-medium">{{ remaining.toFixed(1) }}%</span></span>
        </div>
      </div>
      <div
        :class="[
          'text-xs flex items-center gap-1',
          exitStore.isOverAllocated ? 'text-red-400' : exitStore.isFullyAllocated ? 'text-green-400' : 'text-yellow-400'
        ]"
      >
        <span v-if="exitStore.isFullyAllocated">✓</span>
        <span v-else>⚠</span>
        <span>{{ statusMessage }}</span>
      </div>
    </div>
  </div>
</template>
