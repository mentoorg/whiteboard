<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { addShapeRel, type Vector, type WhiteboardData } from '../../data'
import { createEmitter, type Emitter, type Events } from '../../utils/emitter'
import BrushEditor from './BrushEditor.vue'

type ToolHandle = Emitter<ToolEvents>

interface ToolEvents extends Events {
    start: []
    end: []
    click: [ pos: Vector ]
    mousemove: [ pos: Vector ]
    mousedown: [ pos: Vector ]
    mouseup: [ pos: Vector ]
}

const createToolHandle = (setup: (handle: ToolHandle) => void): ToolHandle => {
    const handle = createEmitter()
    setup(handle)
    return handle
}

const TOOL_NAMES = [ 'move', 'line', 'clear', 'color' ] as const
type ToolName = typeof TOOL_NAMES[number]

interface Tool {
    type: 'mode' | 'action' | 'switch'
    handle: ToolHandle
    active?: boolean
}

const showColorPicker = ref(false)

const TOOLS: Record<ToolName, Tool> = reactive({
    move: {
        type: 'mode',
        handle: createToolHandle(handle => {
            type MoveToolState =
                | { state: 'wait-for-start' }
                | { state: 'wait-for-end', start: Vector }
            const state = ref<MoveToolState>({ state: 'wait-for-start' })

            handle.on('start', () => {
                emit('setCursor', 'all-scroll')
            })

            handle.on('mousedown', pos => {
                if (state.value.state === 'wait-for-start') {
                    state.value = { state: 'wait-for-end', start: pos }
                }
            })
            handle.on('mousemove', pos => {
                if (state.value.state !== 'wait-for-end') return
                const oldPos = state.value.start
                state.value.start = pos
                props.data.viewBox.x -= pos.x - oldPos.x
                props.data.viewBox.y -= pos.y - oldPos.y
            })
            handle.on('mouseup', () => {
                state.value = { state: 'wait-for-start' }
            })
        })
    },
    line: {
        type: 'mode',
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
            handle.on('mousedown', pos => {
                if (state.value.state === 'wait-for-start') {
                    const disposeStartPoint = addShapeRel(props.data, {
                        type: 'circle',
                        center: pos,
                        radius: 3,
                    })
                    state.value = { state: 'wait-for-end', start: pos, disposeStartPoint }
                }
            })
            handle.on('mouseup', pos => {
                if (state.value.state === 'wait-for-end') {
                    state.value.disposeStartPoint()
                    addShapeRel(props.data, {
                        type: 'line',
                        start: state.value.start,
                        end: pos,
                        stroke: brush.strokeColor,
                    })
                    end()
                    start()
                }
            })
            handle.on('mousemove', pos => {
                if (state.value.state !== 'wait-for-end') return
                state.value.disposePreview?.()
                const disposePreviewLine = addShapeRel(props.data, {
                    type: 'line',
                    start: state.value.start,
                    end: pos,
                    stroke: brush.strokeColor,
                })
                const disposePreviewCircle = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                })
                state.value.disposePreview = () => {
                    disposePreviewLine()
                    disposePreviewCircle()
                }
            })
        })
    },
    clear: {
        type: 'action',
        handle: createToolHandle(handle => {
            handle.on('start', () => {
                props.data.shapes = []
            })
        })
    },
    color: {
        type: 'switch',
        handle: createToolHandle(handle => {
            handle.on('start', () => {
                showColorPicker.value = ! showColorPicker.value
            })
        })
    }
})

const activeTool = ref<Tool | null>(null)

interface Brush {
    strokeColor: string
    fillColor: string
}
const brush = reactive<Brush>({
    strokeColor: 'black',
    fillColor: 'transparent'
})

Object.assign(window, { brush })

const props = defineProps<{
    data: WhiteboardData
    outputEl: Element | null | undefined
}>()

const emit = defineEmits<{
    setCursor: [ cursor: string ]
}>()

const wrapMouseListener = (listener: (pos: Vector) => void) => (ev: MouseEvent) => {
    const rect = props.outputEl?.getBoundingClientRect()
    if (! rect) return

    const pos = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
    }
    listener(pos)
}

const mouseEvents = [ 'mousemove', 'mousedown', 'mouseup' ] satisfies Array<keyof WindowEventMap>
mouseEvents.forEach(event => useEventListener(window, event, wrapMouseListener(pos => (
    activeTool.value?.handle.emit(event, pos)
))))

const selectTool = (tool: Tool) => {
    if (tool.type === 'mode') {
        if (activeTool.value === tool) return
        const lastTool = activeTool.value
        if (lastTool) {
            lastTool.active = false
            lastTool.handle.emit('end')
        }
        activeTool.value = tool
        tool.active = true
    }
    tool.handle.emit('start')
    if (tool.type === 'switch') {
        tool.active = ! tool.active
    }
}

selectTool(TOOLS.line)
</script>

<template>
    <div class="whiteboard-input">
        <div class="toolbar">
            <div
                v-for="tool, toolName in TOOLS"
                class="tool"
                :key="toolName"
                :data-tool="toolName"
            >
                <button
                    class="tool-button"
                    :class="{ active: tool.active }"
                    @click.stop="selectTool(tool)"
                >
                    {{ toolName }}
                </button>

                <BrushEditor
                    v-if="toolName === 'color'"
                    class="popup"
                    v-show="showColorPicker"
                    v-model:stroke="brush.strokeColor"
                    v-model:fill="brush.fillColor"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    display: flex;
    gap: 1em;
}

.tool {
    position: relative;
}

.tool-button {
    width: 4em;
    height: 4em;

    border-radius: .5em;
    border: none;

    background-color: #fff;
    color: #000;
    border: 1px solid #000;
    transition: background-color .2s, color .2s;

    cursor: pointer;
}

.tool-button:hover, .tool-button.active {
    background-color: #000;
    color: #fff;
}

.popup {
    position: absolute;
    top: calc(100% + .5em);
    left: 0;
    z-index: 1;

    background-color: #fff;
    border: 1px solid #000;
    border-radius: .5em;
    padding: .5em;
}
</style>