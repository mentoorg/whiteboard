<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GlobalEvents, OutputMode, WhiteboardData } from '../data'
import BasicInput from './input/BasicInput.vue'
import SvgOutput from './output/SvgOutput.vue'
import { createEmitter } from '../utils/emitter'

const bus = createEmitter<GlobalEvents>()

defineProps<{
    outputMode: OutputMode
    data: WhiteboardData
}>()

const outputComp = ref<InstanceType<typeof SvgOutput> | null>(null)
const outputEl = computed(() => outputComp.value?.outputEl)

const cursor = ref('auto')

bus.on('set-cursor', value => {
    cursor.value = value ?? 'default'
})
</script>

<template>
    <div
        class="whiteboard"
        :style="{ cursor }"
    >
        <BasicInput
            :data="data"
            :output-el="outputEl"
            :bus="bus"
        />

        <div class="whiteboard-output">
            <SvgOutput
                v-if="outputMode === 'svg'"
                ref="outputComp"
                :data="data"
                @enter-shape="shape => bus.emit('enter-shape', shape)"
                @leave-shape="shape => bus.emit('leave-shape', shape)"
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