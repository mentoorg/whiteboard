<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { createEmitter, type Emitter, type Events } from '../../utils/emitter'
import BrushEditor from './BrushEditor.vue'
import { log } from '../../store/debug'
import { objectFromEntries, type RemoveIndex } from '../../utils'
import type { WhiteboardData, GlobalEvents } from '../../data'
import { addShapeA, removeShapesA, undoAction, redoAction } from '../../data/action'
import { type CircleShape, type Vector, addShape, addShapeRel, intersect, rectP, removeShapes, viewportTransform } from '../../data/graphic'

const props = defineProps<{
    data: WhiteboardData
    outputEl: Element | null | undefined
    bus: Emitter<GlobalEvents>
}>()

// Tools

type ToolHandle = Emitter<ToolEvents>

interface ToolEvents extends Events {
    start: []
    end: []
    gesturemove: [ pos: Vector ]
    gesturestart: [ pos: Vector ]
    gestureend: [ pos: Vector ]
    zoom: [ dir: 1 | -1, pos: Vector ]
}

const setups: (() => void)[] = []

const createToolHandle = (setup: (handle: ToolHandle) => void): ToolHandle => {
    const handle = createEmitter()
    setups.push(() => setup(handle))
    return handle
}

const setCursor = (cursor: string | null | undefined) => props.bus.emit('set-cursor', cursor)
const resetCursor = () => setCursor(currentMode.value?.cursor)

const TOOL_NAMES = [ 'move', 'line', 'rect', 'erase', 'clear', 'color', 'undo', 'redo' ] as const
type ToolName = typeof TOOL_NAMES[number]

interface Tool {
    type: 'mode' | 'action' | 'switch'
    cursor?: string
    handle: ToolHandle
    isDisabled?: () => boolean
}

interface ToolState {
    active: boolean
    disabled: boolean
}

const TOOLS: Record<ToolName, Tool> = {
    move: {
        type: 'mode',
        cursor: 'all-scroll',
        handle: createToolHandle(handle => {
            type MoveToolState =
                | { state: 'wait-for-start' }
                | { state: 'wait-for-end', start: Vector }
            const state = ref<MoveToolState>({ state: 'wait-for-start' })

            handle.on('gesturestart', pos => {
                if (state.value.state !== 'wait-for-start') return
                setCursor('all-scroll')
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
                resetCursor()
                state.value = { state: 'wait-for-start' }
            })
        })
    },
    line: {
        type: 'mode',
        cursor: 'crosshair',
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
                        system: true,
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
                    system: true,
                })
                const { removeShape: removePreviewCircle } = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                    system: true,
                })
                state.value.removePreview = () => {
                    removePreviewLine()
                    removePreviewCircle()
                }
            })
            handle.on('gestureend', () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    addShapeA(props.data, {
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
        cursor: 'crosshair',
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
                    system: true,
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
                    ...rectP(state.value.start, pos),
                    stroke: brush.strokeColor,
                    fill: brush.fillColor,
                    system: true,
                })
                const { removeShape: removePreviewCircle } = addShapeRel(props.data, {
                    type: 'circle',
                    center: pos,
                    radius: 3,
                    system: true,
                })
                state.value.removePreview = () => {
                    removePreviewRect()
                    removePreviewCircle()
                }
            })
            handle.on('gestureend', () => {
                if (state.value.state === 'wait-for-end') {
                    state.value.removeStartPoint()
                    addShapeA(props.data, {
                        ...rectP(state.value.start, state.value.end),
                        stroke: brush.strokeColor,
                        fill: brush.fillColor,
                    })
                    end()
                    start()
                }
            })
        })
    },
    erase: {
        type: 'mode',
        cursor: 'crosshair',
        handle: createToolHandle(handle => {
            let state: 'idle' | 'work' = 'idle'

            const eraser: CircleShape = reactive({
                type: 'circle',
                center: computed(() => viewportTransform(props.data)(mouse.value)),
                radius: 10,
                visible: computed(() => toolsState.erase.active),
                system: true,
            })
            addShape(props.data, eraser)

            handle.on('gesturestart', () => {
                state = 'work'
            })
            handle.on('gesturemove', () => {
                if (state !== 'work') return
                removeShapesA(props.data, it => it !== eraser && intersect(eraser, it))
            })
            handle.on('gestureend', () => {
                state = 'idle'
            })
        })
    },
    clear: {
        type: 'action',
        handle: createToolHandle(handle => {
            handle.on('start', () => {
                removeShapesA(props.data, it => ! it.system)
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
        isDisabled: () => props.data.historyIndex === 0,
        handle: createToolHandle(handle => {
            handle.on('start', () => undoAction(props.data))
        })
    },
    redo: {
        type: 'action',
        isDisabled: () => props.data.historyIndex === props.data.history.length,
        handle: createToolHandle(handle => {
            handle.on('start', () => redoAction(props.data))
        })
    },
}

const toolsState: Record<ToolName, ToolState> = reactive(
    objectFromEntries(TOOL_NAMES.map(name => [ name, {
        active: false,
        disabled: TOOLS[name].isDisabled ? computed(TOOLS[name].isDisabled) : false,
    } ]))
)

const activateTool = (toolName: ToolName) => {
    const toolState = toolsState[toolName]
    const tool = TOOLS[toolName]
    if (toolState.disabled) return
    if (tool.type === 'mode') {
        if (currentMode.value === tool) return
        const lastModeName = currentModeName.value
        if (lastModeName) {
            toolsState[lastModeName].active = false
            TOOLS[lastModeName].handle.emit('end')
        }
        currentModeName.value = toolName
        resetCursor()
        toolState.active = true
    }
    tool.handle.emit('start')
    if (tool.type === 'switch') {
        toolState.active = ! toolState.active
    }
}

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

// State

const currentModeName = ref<ToolName | null>(null)
const currentMode = computed(() => currentModeName.value ? TOOLS[currentModeName.value] : null)

const showColorPicker = ref(false) // TODO: refactor to Tool

interface Brush {
    strokeColor: string
    fillColor: string
}
const brush = reactive<Brush>({
    strokeColor: 'black',
    fillColor: 'transparent'
})

// Event handling

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

const gestureEventList = [
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

const mouse = ref<Vector>({ x: 0, y: 0 })

let lastButtons = 0
gestureEventList.forEach(({ from, to, target, prevent }) => useEventListener(
    target === 'output' ? () => props.outputEl : window,
    from,
    (ev: MouseEvent | TouchEvent) => {
        log(from + ('buttons' in ev ? ` b=${ev.buttons}` : ''))
        if (prevent) ev.preventDefault()
        const pos = mouse.value = getRelPos(ev)
        let tool: Tool | null = null
        if (isTouchEvent(ev)) tool = currentMode.value
        else {
            let buttons = from === 'mouseup' ? lastButtons : (lastButtons = ev.buttons)
            if (buttons === 4) tool = TOOLS.move
            else if (buttons === 1) tool = currentMode.value
        }
        tool?.handle.emit(to, pos)
    })
)

useEventListener(() => props.outputEl, 'wheel', (ev: WheelEvent) => {
    ev.preventDefault()
    const dir = ev.deltaY < 0 ? 1 : -1 // up: zoom in, down: zoom out
    zoomHandle.emit('zoom', dir, getRelPos(ev))
})

props.bus.on('enter-shape', shape => {
    log(`entershape ${shape.type}#${shape.id}`)
})

// Initialization

removeShapes(props.data, it => !! it.system)
setups.forEach(setup => setup())
activateTool('move')
</script>

<template>
    <div class="whiteboard-input">
        <div class="toolbar">
            <div
                v-for="state, name in toolsState"
                class="tool"
                :key="name"
                :data-tool="name"
            >
                <button
                    class="tool-button"
                    :class="{ active: state.active }"
                    :disabled="state.disabled"
                    @click.capture.stop="activateTool(name)"
                >
                    {{ name }}
                </button>

                <BrushEditor
                    v-if="name === 'color'"
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