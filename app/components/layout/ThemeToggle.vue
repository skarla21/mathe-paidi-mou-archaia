<script setup lang="ts">
const { toggle, colorMode } = useTheme()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="colorMode === 'dark'"
    class="rounded-lg px-2 py-1.5 flex items-center transition-colors cursor-pointer"
    data-icon-still="off"
    aria-label="Εναλλαγή θέματος"
    @click="toggle"
  >
    <div
      class="relative h-5 w-9 rounded-full transition-colors"
      :class="colorMode === 'dark' ? 'bg-primary' : 'bg-border'"
    >
      <span
        class="absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform flex items-center justify-center"
        :class="colorMode === 'dark' ? 'translate-x-4' : 'translate-x-0.5'"
      >
        <VIcon
          v-if="colorMode === 'dark'"
          name="bi-moon-fill"
          class="size-3 text-blue-400"
          aria-hidden="true"
        />
        <VIcon
          v-else
          name="bi-sun-fill"
          class="size-3 text-amber-500"
          aria-hidden="true"
        />
      </span>
    </div>
  </button>
</template>
