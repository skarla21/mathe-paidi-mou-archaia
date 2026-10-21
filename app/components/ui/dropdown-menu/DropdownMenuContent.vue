<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import {
  DropdownMenuPortal,
  DropdownMenuContent as RadixContent,
} from "radix-vue";
import { cn } from "~/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
  sideOffset?: number;
  align?: "start" | "center" | "end";
}

const props = withDefaults(defineProps<Props>(), {
  sideOffset: 4,
  align: "start",
});
</script>

<template>
  <DropdownMenuPortal>
    <RadixContent
      :side-offset="props.sideOffset"
      :align="props.align"
      :class="
        cn(
          'z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_10px_24px_rgba(42,36,32,0.08)]',
          props.class,
        )
      "
    >
      <slot />
    </RadixContent>
  </DropdownMenuPortal>
</template>
