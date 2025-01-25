<script setup lang="ts">
import { computed, reactive, ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { addShape, type Vector, type WhiteboardData } from '../../data'

interface ToolHandle<S> {
    state: Ref<S>
    reset: () => void
    onClick: (ev: MouseEvent) => void
    onMove: (ev: MouseEvent) => void
}        

type MouseListener<S> = (handle: ToolHandle<S>, pos: Vector) => void

const createToolHandle = <S>(
    {
        state: initialState,
        onClick,
        onMove,
        onReset,
    }: {
        state: S,
        onClick?: MouseListener<S>,
        onMove?: MouseListener<S>,
        onReset?: (handle: ToolHandle<S>) => void
    },
): ToolHandle<S> => {
    const state = ref(initialState) as Ref<S>

    const wrapMouseListener = (inner?: MouseListener<S>) => {
        if (inner) return (ev: MouseEvent) => {
            const rect = outputBoundingRect.value
            if (! rect) return

            const pos = {
                x: ev.clientX - rect.left,
                y: ev.clientY - rect.top,
            }
            inner(handle, pos)
        }
        return () => {}
    }

    const handle = {
        state,
        reset: () => {
            onReset?.(handle)
            state.value = initialState
        },
        onClick: wrapMouseListener(onClick),
        onMove: wrapMouseListener(onMove),
    }

    return handle
}

type LineToolState =
    | { state: 'wait-for-start' }
    | {
        state: 'wait-for-end'
        start: Vector
        disposeStartPoint: () => void
        disposePreview?: () => void
    }

const TOOLS = {
    select: {
        handler: createToolHandle({
            state: {},
            onClick: () => {},
        })
    },
    line: {
        handler: createToolHandle<LineToolState>({
            state: { state: 'wait-for-start' },
            onClick: ({ state, reset }, pos) => {
                if (state.value.state === 'wait-for-start') {
                    const disposeStartPoint = addShape(props.data, {
                        type: 'circle',
                        ...pos,
                        radius: 3,
                        fill: 'transparent',
                        stroke: '#000',
                    })
                    state.value = { state: 'wait-for-end', start: pos, disposeStartPoint }
                }
                else {
                    state.value.disposeStartPoint()
                    addShape(props.data, {
                        type: 'line',
                        start: state.value.start,
                        end: pos,
                        stroke: brush.strokeColor,
                    })
                    reset()
                }
            },
            onMove: ({ state }, pos) => {
                if (state.value.state !== 'wait-for-end') return
                state.value.disposePreview?.()
                const disposePreviewLine = addShape(props.data, {
                    type: 'line',
                    start: state.value.start,
                    end: pos,
                    stroke: brush.strokeColor,
                })
                const disposePreviewCircle = addShape(props.data, {
                    type: 'circle',
                    ...pos,
                    radius: 3,
                    fill: 'transparent',
                    stroke: '#000',
                })
                state.value.disposePreview = () => {
                    disposePreviewLine()
                    disposePreviewCircle()
                }
            },
            onReset: ({ state }) => {
                if (state.value.state === 'wait-for-start') return
                state.value.disposeStartPoint()
                state.value.disposePreview?.()
            }
        })
    }
} satisfies Record<string, {
    handler: ToolHandle<any>
}>

type Tool = keyof typeof TOOLS

const selectedToolName = ref<Tool>('line')
const selectedTool = computed(() => TOOLS[selectedToolName.value])

interface Brush {
    strokeColor: string
    fillColor: string
}
const brush = reactive<Brush>({
    strokeColor: 'black',
    fillColor: 'transparent'
})

const props = defineProps<{
    data: WhiteboardData
    outputEl: Element | null | undefined
}>()
const outputBoundingRect = computed(() => props.outputEl?.getBoundingClientRect())

useEventListener(() => props.outputEl, 'click', (ev: MouseEvent) => {
    selectedTool.value.handler.onClick(ev)
})

useEventListener(window, 'mousemove', (ev: MouseEvent) => {
    selectedTool.value.handler.onMove(ev)
})
</script>

<template>
    <div class="toolbar">
        <div v-for="_tool, toolName in TOOLS">
            <button
                :key="toolName"
                class="tool-button"
                :class="{ selected: selectedToolName === toolName }"
                @click="selectedToolName = toolName"
            >
                {{ toolName }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    display: flex;
    gap: 1em;
}

.tool-button {
    width: 4em;
    height: 4em;

    border-radius: .5em;
    border: none;

    background-color: #aaa;
    color: #000;
    transition: background-color .2s, color .2s;
}

.tool-button:hover, .tool-button.selected {
    background-color: #000;
    color: #fff;
}
</style>