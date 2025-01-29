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
const tempCursor = ref<string | null>(null)
const setCursor = (value: string) => {
    cursor.value = value
}
const setTempCursor = (value: string | null) => {
    tempCursor.value = value
}
</script>

<template>
    <div
        class="whiteboard"
        :style="{ cursor: tempCursor ?? cursor }"
    >
        <BasicInput
            :data="data"
            :output-el="outputEl"
            @set-cursor="setCursor"
            @set-temp-cursor="setTempCursor"
        />

        <div class="whiteboard-output">
            <SvgOutput
                v-if="outputMode === 'svg'"
                ref="outputComp"
                :data="data"
            />
        </div>
    </div>
</template>

<style scoped>
.whiteboard-input {
    margin-bottom: 1em;
}

.whiteboard-output {
    width: fit-content;
    border: 1px solid black;
}
</style>