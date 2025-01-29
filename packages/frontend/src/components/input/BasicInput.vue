<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { addShapeRel, addShapeWithAction, createRectFromPoints, redoAction, undoAction, type Vector, type WhiteboardData } from '../../data'
import { createEmitter, type Emitter, type Events } from '../../utils/emitter'
import BrushEditor from './BrushEditor.vue'
import { log } from '../../store/debug'
import type { RemoveIndex } from '../../utils'

type ToolHandle = Emitter<ToolEvents>

interface ToolEvents extends Events {
    start: []
    end: []
    gesturemove: [ pos: Vector ]
    gesturestart: [ pos: Vector ]
    gestureend: [ pos: Vector ]
    zoom: [ dir: 1 | -1, pos: Vector ]
}

const createToolHandle = (setup: (handle: ToolHandle) => void): ToolHandle => {
    const handle = createEmitter()
    setup(handle)
    return handle
}

const TOOL_NAMES = [ 'select', 'move', 'line', 'rect', 'clear', 'color', 'undo', 'redo' ] as const
type ToolName = typeof TOOL_NAMES[number]

interface Tool {
    type: 'mode' | 'action' | 'switch'
    handle: ToolHandle
    active?: boolean
    disabled?: boolean
}

const showColorPicker = ref(false)

const TOOLS: Record<ToolName, Tool> = reactive({
    select: {
        type: 'mode',
        handle: createToolHandle(handle => {
            handle.on('start', () => {
                emit('setCursor', 'default')
            })
        })
    },
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

            handle.on('gesturestart', pos => {
                if (state.value.state !== 'wait-for-start') return
                emit('setTempCursor', 'all-scroll')
                state.value = { state: 'wait-for-end', start: pos }
            })
            handle.on('gesturemove', pos => {
                if (state.value.state !== 'wait-for-end') return
                const oldPos = state.value.start
                state.value.start = pos
                props.data.viewport.x -= pos.x - oldPos.x
                props.data.viewport.y -= pos.y - oldPos.y
            })
            handle.on('gestureend', () => {
                emit('setTempCursor', null)
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
                    end: Vector
                    removeStartPoint: () => void
                    removePreview?: () => void
                }
            const state = ref<LineToolState>({ state: 'wait-for-start' })

            const start = () => {
                emit('setCursor', 'crosshair')
                state.value = { state: 'wait-for-start' }
            }
            const end = () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    state.value.removePreview?.()
                }
            }

            handle.on('start', start)
            handle.on('end', end)
            handle.on('gesturestart', pos => {
                if (state.value.state === 'wait-for-start') {
                    const { removeShape: removeStartPoint } = addShapeRel(props.data, {
                        type: 'circle',
                        center: pos,
                        radius: 3,
                    })
                    state.value = {
                        state: 'wait-for-end',
                        start: pos,
                        end: pos,
                        removeStartPoint
                    }
                }
            })
            handle.on('gesturemove', pos => {
                if (state.value.state !== 'wait-for-end') return
                state.value.end = pos
                state.value.removePreview?.()
                const { removeShape: removePreviewLine } = addShapeRel(props.data, {
                    type: 'line',
                    start: state.value.start,
                    end: pos,
                    stroke: brush.strokeColor,
                })
                const { removeShape: removePreviewCircle } = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                })
                state.value.removePreview = () => {
                    removePreviewLine()
                    removePreviewCircle()
                }
            })
            handle.on('gestureend', () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    addShapeWithAction(props.data, {
                        type: 'line',
                        start: state.value.start,
                        end: state.value.end,
                        stroke: brush.strokeColor,
                    })
                    end()
                    start()
                }
            })
        })
    },
    rect: {
        type: 'mode',
        handle: createToolHandle(handle => {
            type RectToolState =
                | { state: 'wait-for-start' }
                | {
                    state: 'wait-for-end'
                    start: Vector
                    end: Vector
                    removeStartPoint: () => void
                    removePreview?: () => void
                }
            const state = ref<RectToolState>({ state: 'wait-for-start' })

            const start = () => {
                emit('setCursor', 'crosshair')
                state.value = { state: 'wait-for-start' }
            }
            const end = () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    state.value.removePreview?.()
                }
            }

            handle.on('start', start)
            handle.on('end', end)
            handle.on('gesturestart', pos => {
                if (state.value.state !== 'wait-for-start') return

                const { removeShape: removeStartPoint } = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                })
                state.value = {
                    state: 'wait-for-end',
                    start: pos,
                    end: pos,
                    removeStartPoint
                }
            })
            handle.on('gesturemove', pos => {
                if (state.value.state !== 'wait-for-end') return
                state.value.end = pos
                state.value.removePreview?.()
                const { removeShape: removePreviewRect } = addShapeRel(props.data, {
                    ...createRectFromPoints(state.value.start, pos),
                    stroke: brush.strokeColor,
                    fill: brush.fillColor,
                })
                const { removeShape: removePreviewCircle } = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                })
                state.value.removePreview = () => {
                    removePreviewRect()
                    removePreviewCircle()
                }
            })
            handle.on('gestureend', () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    addShapeWithAction(props.data, {
                        ...createRectFromPoints(state.value.start, state.value.end),
                        stroke: brush.strokeColor,
                        fill: brush.fillColor,
                    })
                    end()
                    start()
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
    },
    undo: {
        type: 'action',
        disabled: computed(() => props.data.historyIndex === 0),
        handle: createToolHandle(handle => {
            handle.on('start', () => undoAction(props.data))
        })
    },
    redo: {
        type: 'action',
        disabled: computed(() => props.data.historyIndex === props.data.history.length),
        handle: createToolHandle(handle => {
            handle.on('start', () => redoAction(props.data))
        })
    },
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

const props = defineProps<{
    data: WhiteboardData
    outputEl: Element | null | undefined
}>()

const emit = defineEmits<{
    setCursor: [ cursor: string ]
    setTempCursor: [ cursor: string | null ]
}>()

const hasTouch = 'TouchEvent' in window
const isTouchEvent = (ev: Event): ev is TouchEvent => hasTouch && ev instanceof TouchEvent

const getRelPos = (ev: MouseEvent | WheelEvent | TouchEvent) => {
    const rect = props.outputEl?.getBoundingClientRect()
    if (! rect) return { x: 0, y: 0 }

    const { clientX, clientY } = isTouchEvent(ev) ? ev.touches[0] ?? {} : ev

    return {
        x: clientX - rect.left,
        y: clientY - rect.top,
    }
}

const eventTable = [
    { from: 'mousedown', to: 'gesturestart', target: 'output', prevent: true },
    { from: 'mousemove', to: 'gesturemove', target: 'window', prevent: true },
    { from: 'mouseup', to: 'gestureend', target: 'window' },
    { from: 'touchstart', to: 'gesturestart', target: 'output', prevent: true },
    { from: 'touchmove', to: 'gesturemove', target: 'window', prevent: true },
    { from: 'touchend', to: 'gestureend', target: 'window' },
    { from: 'touchcancel', to: 'gestureend', target: 'window' },
] satisfies {
    from: keyof WindowEventMap
    to: keyof RemoveIndex<ToolEvents>
    target: 'output' | 'window'
    prevent?: boolean
}[]

let lastButtons = 0
eventTable.forEach(({ from, to, target, prevent }) => useEventListener(
    target === 'output' ? () => props.outputEl : window,
    from,
    (ev: MouseEvent | TouchEvent) => {
        log(from + ('buttons' in ev ? ` b=${ev.buttons}` : ''))
        if (prevent) ev.preventDefault()
        const pos = getRelPos(ev)
        let tool: Tool | null = null
        if (isTouchEvent(ev)) tool = activeTool.value
        else {
            let buttons = from === 'mouseup' ? lastButtons : (lastButtons = ev.buttons)
            if (buttons === 4) tool = TOOLS.move
            else if (buttons === 1) tool = activeTool.value
        }
        tool?.handle.emit(to, pos)
    })
)

const zoomHandle = createToolHandle(handle => {
    handle.on('zoom', (dir, pos) => {
        log(`zoom ${dir}`)
        const { scale: s0, x, y } = props.data.viewport
        const ds = dir * .1
        const s = (s0 * 10 + ds * 10) / 10
        if (s < 0.1 || s > 4.0) return
        const { x: xc, y: yc } = pos
        const dinvs = 1 / s - 1 / s0
        props.data.viewport = {
            scale: s,
            x: x - xc * dinvs,
            y: y - yc * dinvs,
        }
    })
})

useEventListener(() => props.outputEl, 'wheel', (ev: WheelEvent) => {
    ev.preventDefault()
    const dir = ev.deltaY < 0 ? 1 : -1 // up: zoom in, down: zoom out
    zoomHandle.emit('zoom', dir, getRelPos(ev))
})

const selectTool = (tool: Tool) => {
    if (tool.disabled) return
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
                    :class="{
                        active: tool.active,
                    }"
                    :disabled="tool.disabled"
                    @click.capture.stop="selectTool(tool)"
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

.tool-button:not(:disabled):hover, .tool-button.active {
    background-color: #000;
    color: #fff;
}

.tool-button:disabled {
    cursor: not-allowed;
    background-color: #ccc;
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