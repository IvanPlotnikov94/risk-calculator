<script setup lang="ts">
import { computed } from 'vue'
import { useCalculatorStore } from '@/stores/calculator'
import ModeSwitcher from './ModeSwitcher.vue'
import PositionSettings from './PositionSettings.vue'
import EntriesTable from './EntriesTable.vue'
import PositionSummaryCard from './PositionSummaryCard.vue'
import ExitPointsTable from './ExitPointsTable.vue'
import ExitPositionSummary from './ExitPositionSummary.vue'

const store = useCalculatorStore()

const isEntryMode = computed(() => store.mode === 'entry')
const isExitMode = computed(() => store.mode === 'exit')
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">Risk Calculator</h1>
      <p class="text-gray-400">Калькулятор рисков для трейдинга</p>
    </div>

    <!-- Mode Switcher -->
    <ModeSwitcher />

    <!-- Position Settings -->
    <PositionSettings />

    <!-- Entry Mode -->
    <template v-if="isEntryMode">
      <EntriesTable />
      <PositionSummaryCard />
    </template>

    <!-- Exit Mode -->
    <template v-if="isExitMode">
      <ExitPointsTable />
      <ExitPositionSummary />
    </template>
  </div>
</template>
