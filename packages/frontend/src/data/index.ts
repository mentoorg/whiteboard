import type { Events } from '../utils/emitter'
import type { Action } from './action'
import type { Shape, Size } from './graphic/shape'
import type { Vector } from './graphic/vector'

export type OutputMode = 'svg' | 'canvas'

export interface Viewport extends Vector {
    scale: number
}

export const getViewBox = ({ size: { width, height }, viewport: { x, y, scale } }: WhiteboardData) =>
    `${x} ${y} ${width / scale} ${height / scale}`

export const createIdGenerator = () => {
    let id = 0
    return () => id ++
}

export interface GlobalEvents extends Events {
    'enter-shape': [ shape: Shape ]
    'leave-shape': [ shape: Shape ]
    'gesture-start': [ pos: Vector ]
    'gesture-move': [ pos: Vector ]
    'gesture-end': [ pos: Vector ]
    'set-cursor': [ cursor: string | undefined | null ]
}

export interface WhiteboardData {
    size: Size
    viewport: Viewport
    shapes: Shape[]
    history: Action[]
    historyIndex: number
}