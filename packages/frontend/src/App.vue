<script setup lang="ts">
import { reactive } from 'vue';
import Whiteboard from './components/Whiteboard.vue'
import { addShape, type WhiteboardData } from './data'
import Debugger from './components/Debugger.vue';

const isDebugging = import.meta.env.DEV

const mockData: WhiteboardData = reactive({
    size: { width: 800, height: 600 },
    viewBox: { x: 0, y: 0, width: 800, height: 600 },
    shapes: [],
})

addShape(mockData, {
    type: 'line',
    start: { x: 100, y: 100 },
    end: { x: 200, y: 200 },
    stroke: 'red',
})

addShape(mockData, {
    type: 'line',
    start: { x: 200, y: 200 },
    end: { x: 300, y: 100 },
    stroke: 'blue',
})
</script>

<template>
    <Whiteboard
        output-mode="svg"
        :data="mockData"
    />
    <Debugger v-if="isDebugging" />
</template>
