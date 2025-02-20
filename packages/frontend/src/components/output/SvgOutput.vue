<script setup lang="ts">
import { computed, ref } from 'vue';
import { getViewBox, type WhiteboardData } from '../../data'
import { type Shape } from '../../data/graphic'

const props = defineProps<{
    data: WhiteboardData
}>()

const emit = defineEmits<{
    enterShape: [ Shape ]
    leaveShape: [ Shape ]
}>()

const outputEl = ref<SVGElement | null>(null)
defineExpose({ outputEl })

const shapes = computed(() => props.data.shapes
    .filter(shape => ! ('visible' in shape) || shape.visible)
)

Object.assign(window, { shapes: props.data.shapes })
</script>

<template>
    <svg
        ref="outputEl"
        xmlns="http://www.w3.org/2000/svg"
        :width="data.size.width"
        :height="data.size.height"
        :viewBox="getViewBox(data)"
    >
        <g
            v-for="shape in shapes"
            @mouseenter="emit('enterShape', shape)"
            @mouseleave="emit('leaveShape', shape)"
        >
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
                :cx="shape.center.x"
                :cy="shape.center.y"
                :r="shape.radius"
                :fill="shape.fill ?? 'none'"
                :stroke="shape.stroke ?? '#000'"
            ></circle>

            <rect
                v-else-if="shape.type === 'rect'"
                :x="shape.topLeft.x"
                :y="shape.topLeft.y"
                :width="shape.size.width"
                :height="shape.size.height"
                :fill="shape.fill ?? 'none'"
                :stroke="shape.stroke ?? '#000'"
            ></rect>
        </g>
    </svg>
</template>