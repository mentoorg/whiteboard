import { remove } from "../utils"

export type OutputMode = 'svg' | 'canvas'

export interface Vector {
    x: number
    y: number
}

export type Transform = (a: Vector) => Vector

export interface Size {
    width: number
    height: number
}

export interface Viewport extends Vector {
    scale: number
}

export const getViewBox = ({ size: { width, height }, viewport: { x, y, scale } }: WhiteboardData) =>
    `${x} ${y} ${width / scale} ${height / scale}`

export const createIdGenerator = () => {
    let id = 0
    return () => id ++
}
export const genShapeId = createIdGenerator()

export const addShape = (data: WhiteboardData, preShape: PreShape) => {
    const id = genShapeId()
    const shape = { ...preShape, id }
    data.shapes.push(shape)
    return {
        shape,
        removeShape: () => remove(data.shapes, it => it.id === id)
    }
}

export const addShapeRel = (data: WhiteboardData, preShape: PreShape) => (
    addShape(data, transformShape(preShape, a =>
        vectorAdd(vectorMul(a, 1 / data.viewport.scale), data.viewport)
    ))
)

export const addShapeWithAction = (data: WhiteboardData, preShape: PreShape) => {
    const shapeHandle = addShapeRel(data, preShape)
    pushAction(data, { type: 'add_shape', shape: shapeHandle.shape })
    return shapeHandle
}

export const vectorAdd = (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
})

export const vectorMul = (a: Vector, k: number): Vector => ({
    x: a.x * k,
    y: a.y * k,
})

export const transformShape = <S extends PreShape>(shape: S, trans: Transform): S => {
    switch (shape.type) {
        case 'line': return {
            ...shape,
            start: trans(shape.start),
            end: trans(shape.end),
        }
        case 'rect': return {
            ...shape,
            topLeft: trans(shape.topLeft),
        }
        case 'circle': return {
            ...shape,
            center: trans(shape.center),
        }
    }
}

export type PreShape =
    | LineShape
    | RectShape
    | CircleShape

export type Shape = PreShape & {
    id: number
}

export interface Strokable {
    stroke?: string
}

export interface Fillable {
    fill?: string
}

export interface LineShape extends Strokable {
    type: 'line'
    start: Vector
    end: Vector
}

export interface RectShape extends Strokable, Fillable {
    type: 'rect'
    topLeft: Vector
    size: Size
}

export const createRectFromPoints = (start: Vector, end: Vector): RectShape => {
    return {
        type: 'rect',
        topLeft: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
        },
        size: {
            width: Math.abs(start.x - end.x),
            height: Math.abs(start.y - end.y),
        }
    }
}

export interface CircleShape extends Strokable, Fillable {
    type: 'circle'
    radius: number
    center: Vector
}

export type Action =
    | AddShapeAction

export interface AddShapeAction {
    type: 'add_shape'
    shape: Shape
}

export const pushAction = (data: WhiteboardData, action: Action) => {
    data.history.splice(data.historyIndex)
    data.history.push(action)
    data.historyIndex ++
}

export const undoAction = (data: WhiteboardData) => {
    if (! data.historyIndex) return

    const action = data.history[-- data.historyIndex]

    switch (action.type) {
        case 'add_shape':
            remove(data.shapes, it => it.id === action.shape.id)
            break
    }
}

export const redoAction = (data: WhiteboardData) => {
    if (data.historyIndex === data.history.length) return

    const action = data.history[data.historyIndex ++]

    switch (action.type) {
        case 'add_shape':
            data.shapes.push(action.shape)
            break
    }
}

export interface WhiteboardData {
    size: Size
    viewport: Viewport
    shapes: Shape[]
    history: Action[]
    historyIndex: number
}