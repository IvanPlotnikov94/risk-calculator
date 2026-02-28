<script setup lang="ts">
import { useExitCalculatorStore } from '@/stores/exitCalculator'
import ExitPointRow from './ExitPointRow.vue'
import AllocationIndicator from './AllocationIndicator.vue'

const exitStore = useExitCalculatorStore()

const handleSort = (order: 'original' | 'asc' | 'desc') => {
  exitStore.setSortOrder(order)
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
      <h2 class="text-xl font-semibold text-white">Точки выхода</h2>

      <div class="flex items-center gap-3">
        <!-- Sort buttons -->
        <div v-if="exitStore.exitPoints.length > 0" class="flex gap-2">
          <button
            @click="handleSort('original')"
            :class="[
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              exitStore.sortOrder === 'original'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            ]"
          >
            Исходный порядок
          </button>
          <button
            @click="handleSort('asc')"
            :class="[
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              exitStore.sortOrder === 'asc'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            ]"
          >
            ↑ По возрастанию
          </button>
          <button
            @click="handleSort('desc')"
            :class="[
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              exitStore.sortOrder === 'desc'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            ]"
          >
            ↓ По убыванию
          </button>
        </div>

        <!-- Add exit point button -->
        <button
          @click="exitStore.addExitPoint"
          :disabled="!exitStore.canAddExitPoint"
          :class="[
            'shrink-0 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2',
            exitStore.canAddExitPoint
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
          ]"
          title="Заполните цену входа и объем позиции"
        >
          <span class="text-lg leading-none">+</span>
          <span>Добавить Take Profit</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-700">
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">#</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Цена выхода</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">% объема</th>
            <th class="text-center py-3 px-2 text-sm font-medium text-gray-300">Ср. цена выхода</th>
            <th class="text-center py-3 px-2 text-sm font-medium text-gray-300">Объем (USDT)</th>
            <th class="text-center py-3 px-2 text-sm font-medium text-gray-300">Объем</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">% до TP</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">PnL при TP</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">PnL при SL</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">R/R</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300"></th>
          </tr>
        </thead>
        <tbody>
          <template v-if="exitStore.exitPoints.length === 0">
            <tr>
              <td colspan="11" class="py-5 text-center">
                <p class="text-gray-400 mb-4">Заполните цену входа и объем, затем добавьте точки выхода</p>
                <button
                  @click="exitStore.addExitPoint"
                  :disabled="!exitStore.canAddExitPoint"
                  :class="[
                    'px-4 py-2 rounded-md font-medium transition-colors',
                    exitStore.canAddExitPoint
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  ]"
                >
                  + Добавить Take Profit
                </button>
              </td>
            </tr>
          </template>
          <template v-else>
            <ExitPointRow
              v-for="(ep, index) in exitStore.sortedExitPoints"
              :key="ep.id"
              :exit-point="ep"
              :index="index"
            />
          </template>
        </tbody>
      </table>
    </div>

    <!-- Allocation Indicator -->
    <AllocationIndicator
      v-if="exitStore.exitPoints.length > 0"
      class="mt-6"
    />
  </div>
</template>
