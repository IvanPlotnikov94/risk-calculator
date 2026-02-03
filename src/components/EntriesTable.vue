<script setup lang="ts">
import { useCalculatorStore } from '@/stores/calculator'
import EntryRow from './EntryRow.vue'

const store = useCalculatorStore()

const handleSort = (order: 'original' | 'asc' | 'desc') => {
  store.setSortOrder(order)
}
</script>

<template>
  <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-white">Точки входа</h2>
      
      <!-- Sort buttons -->
      <div class="flex gap-2">
        <button
          @click="handleSort('original')"
          :class="[
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            store.sortOrder === 'original'
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
            store.sortOrder === 'asc'
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
            store.sortOrder === 'desc'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          ]"
        >
          ↓ По убыванию
        </button>
      </div>
    </div>

    <!-- Presets -->
    <div class="mb-4 p-3 bg-slate-700 rounded-lg">
      <div class="text-sm text-gray-300 mb-2">Пресеты размеров:</div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(_, index) in store.presets"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            v-model.number="store.presets[index]"
            type="number"
            class="w-24 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <span class="text-gray-400 text-sm">USDT</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-700">
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">#</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Цена входа</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Сумма (USDT)</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Пресеты</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Средняя цена</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">Объем</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">% до SL</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">% до TP</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">PnL при SL</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">PnL при TP</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300">R/R</th>
            <th class="text-left py-3 px-2 text-sm font-medium text-gray-300"></th>
          </tr>
        </thead>
        <tbody>
          <EntryRow
            v-for="(entry, index) in store.sortedEntries"
            :key="entry.id"
            :entry="entry"
            :index="index"
          />
        </tbody>
      </table>
    </div>

    <div v-if="store.entries.length === 0" class="text-center py-8 text-gray-400">
      Нет точек входа. Добавьте первый вход, чтобы начать расчет.
    </div>
  </div>
</template>
