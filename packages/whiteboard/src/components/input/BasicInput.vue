<script setup lang="ts">
import { computed, reactive, ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { addShape, type Vector, type WhiteboardData } from '../../data'
import { createEmitter, type Emitter, type Events } from '../../utils/emitter'

type ToolHandle = Emitter<ToolEvents>

interface ToolEvents extends Events {
    start: []
    end: []
    click: [ pos: Vector ]
    move: [ pos: Vector ]
}

const createToolHandle = (setup: (handle: ToolHandle) => void): ToolHandle => {
    const handle = createEmitter()
    setup(handle)
    return handle
}

const TOOLS = {
    move: {
        handle: createToolHandle(handle => {
            handle.on('start', () => {
                emit('setCursor', 'all-scroll')
            })
        })
    },
    line: {
        handle: createToolHandle(handle => {
            type LineToolState =
                | { state: 'wait-for-start' }
                | {
                    state: 'wait-for-end'
                    start: Vector
                    disposeStartPoint: () => void
                    disposePreview?: () => void
                }
            const state = ref<LineToolState>({ state: 'wait-for-start' })

            const start = () => {
                emit('setCursor', 'crosshair')
                state.value = { state: 'wait-for-start' }
            }
            const end = () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.disposeStartPoint()
                    state.value.disposePreview?.()
                }
            }

            handle.on('start', start)
            handle.on('end', end)
            handle.on('click', pos => {
                if (state.value.state === 'wait-for-start') {
                    const disposeStartPoint = addShape(props.data, {
                        type: 'circle',
                        ...pos,
                        radius: 3,
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
                    end()
                    start()
                }
            })
            handle.on('move', pos => {
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
                })
                state.value.disposePreview = () => {
                    disposePreviewLine()
                    disposePreviewCircle()
                }
            })
        })
    }
} satisfies Record<string, {
    handle: ToolHandle
}>

type ToolName = keyof typeof TOOLS

const selectedToolName = ref<ToolName | null>(null)
const selectedTool = computed(() =>
    selectedToolName.value ? TOOLS[selectedToolName.value] : null
)

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

const emit = defineEmits<{
    setCursor: [ cursor: string ]
}>()

const outputBoundingRect = computed(() => props.outputEl?.getBoundingClientRect())
const wrapMouseListener = (listener: (pos: Vector) => void) => (ev: MouseEvent) => {
    const rect = outputBoundingRect.value
    if (! rect) return

    const pos = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
    }
    listener(pos)
}

useEventListener(window, 'click', wrapMouseListener(pos =>
    selectedTool.value?.handle.emit('click', pos)
))

useEventListener(window, 'mousemove', wrapMouseListener(pos =>
    selectedTool.value?.handle.emit('move', pos)
))

const selectTool = (toolName: ToolName) => {
    if (selectedToolName.value === toolName) return
    selectedTool.value?.handle.emit('end')
    selectedToolName.value = toolName
    selectedTool.value!.handle.emit('start')
}

selectTool('line')
</script>

<template>
    <div class="toolbar">
        <div v-for="_tool, toolName in TOOLS">
            <button
                :key="toolName"
                class="tool-button"
                :class="{ selected: selectedToolName === toolName }"
                @click.stop="selectTool(toolName)"
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

    cursor: pointer;
}

.tool-button:hover, .tool-button.selected {
    background-color: #000;
    color: #fff;
}
</style>