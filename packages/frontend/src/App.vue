<script setup lang="ts">
import { reactive } from 'vue';
import Whiteboard from './components/Whiteboard.vue'
import { type WhiteboardData } from './data'
import Debugger from './components/Debugger.vue'

const isDebugging = import.meta.env.DEV

const data: WhiteboardData = reactive({
    size: { width: 600, height: 600 },
    viewport: { x: 0, y: 0, scale: 1 },
    shapes: [],
    history: [],
    historyIndex: 0,
})
</script>

<template>
    <Whiteboard
        output-mode="svg"
        :data="data"
    />
    <Debugger v-if="isDebugging" />
</template>
