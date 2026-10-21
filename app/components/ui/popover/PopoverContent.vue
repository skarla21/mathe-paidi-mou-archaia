<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { PopoverPortal, PopoverContent as RadixContent } from "radix-vue";
import { cn } from "~/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
  sideOffset?: number;
  align?: "start" | "center" | "end";
  prioritizePosition?: boolean;
  collisionPadding?: number;
}

const props = withDefaults(defineProps<Props>(), {
  sideOffset: 4,
  align: "start",
  prioritizePosition: false,
  collisionPadding: 0,
});
</script>

<template>
  <PopoverPortal>
    <RadixContent
      :side-offset="props.sideOffset"
      :align="props.align"
      :prioritize-position="props.prioritizePosition"
      :collision-padding="props.collisionPadding"
      :class="
        cn(
          'z-50 w-full min-w-32 origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-xl border border-border bg-card p-1 text-card-foreground shadow-[0_10px_24px_rgba(42,36,32,0.08)]',
          props.class,
        )
      "
    >
      <slot />
    </RadixContent>
  </PopoverPortal>
</template>
