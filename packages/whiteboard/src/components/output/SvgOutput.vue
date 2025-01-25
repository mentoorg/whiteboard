<script setup lang="ts">
import { ref } from 'vue';
import { viewBoxToString, type WhiteboardData } from '../../data'

defineProps<{
    data: WhiteboardData
}>()

const outputEl = ref<SVGElement | null>(null)
defineExpose({ outputEl })
</script>

<template>
    <svg
        ref="outputEl"
        xmlns="http://www.w3.org/2000/svg"
        :width="data.size.width"
        :height="data.size.height"
        :viewBox="viewBoxToString(data.viewBox)"
    >
        <g v-for="shape in data.shapes">
            <line
                v-if="shape.type === 'line'"
                :x1="shape.start.x"
                :y1="shape.start.y"
                :x2="shape.end.x"
                :y2="shape.end.y"
                :stroke="shape.stroke"
            ></line>

            <circle
                v-else-if="shape.type === 'circle'"
                :cx="shape.x"
                :cy="shape.y"
                :r="shape.radius"
                :fill="shape.fill"
                :stroke="shape.stroke"
            ></circle>
        </g>
    </svg>
</template>