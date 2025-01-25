<script setup lang="ts">
import { computed, ref } from 'vue';
import type { OutputMode, WhiteboardData } from '../data'
import BasicInput from './input/BasicInput.vue'
import SvgOutput from './output/SvgOutput.vue'

defineProps<{
    outputMode: OutputMode
    data: WhiteboardData
}>()

const outputComp = ref<InstanceType<typeof SvgOutput> | null>(null)
const outputEl = computed(() => outputComp.value?.outputEl)

const cursor = ref('auto')
const setCursor = (value: string) => {
    cursor.value = value
}
</script>

<template>
    <div
        class="whiteboard"
        :style="{ cursor }"
    >
        <BasicInput
            :data="data"
            :output-el="outputEl"
            @set-cursor="setCursor"
        />

        <SvgOutput
            v-if="outputMode === 'svg'"
            ref="outputComp"
            :data="data"
        />
    </div>
</template>