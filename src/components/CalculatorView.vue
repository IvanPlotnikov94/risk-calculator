<script setup lang="ts">
import PositionSettings from './PositionSettings.vue'
import EntriesTable from './EntriesTable.vue'
import PositionSummaryCard from './PositionSummaryCard.vue'
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-white mb-2">Risk Calculator</h1>
      <p class="text-gray-400">Калькулятор рисков для трейдинга с множественными входами</p>
    </div>

    <!-- Position Settings -->
    <PositionSettings />

    <!-- Position Summary -->
    <PositionSummaryCard />

    <!-- Entries Table -->
    <EntriesTable />
  </div>
</template>
