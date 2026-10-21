<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { DropdownMenuItem } from "radix-vue";
import { cn } from "~/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
  disabled?: boolean;
  inset?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  inset: false,
});
</script>

<template>
  <DropdownMenuItem
    :disabled="props.disabled"
    :inset="props.inset"
    :class="
      cn(
        'relative flex min-h-9 cursor-pointer select-none items-center rounded-lg px-2.5 text-sm outline-none transition-[background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-secondary focus:bg-secondary data-highlighted:bg-secondary data-disabled:pointer-events-none data-disabled:opacity-50',
        '[&>a]:block [&>a]:w-full [&>a]:no-underline [&>a]:text-inherit',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
