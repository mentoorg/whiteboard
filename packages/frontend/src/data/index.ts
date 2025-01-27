import { remove } from "../utils"

export type OutputMode = 'svg' | 'canvas'

export interface Vector {
    x: number
    y: number
}

export interface Size {
    width: number
    height: number
}

export interface ViewBox extends Vector, Size {}

export const viewBoxToString = ({ x, y, width, height }: ViewBox) =>
    `${x} ${y} ${width} ${height}`

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

export const addShapeRel = (data: WhiteboardData, preShape: PreShape) => {
    return addShape(data, moveShape(preShape, data.viewBox))
}

export const addShapeWithAction = (data: WhiteboardData, preShape: PreShape) => {
    const shapeHandle = addShapeRel(data, preShape)
    pushAction(data, { type: 'add_shape', shape: shapeHandle.shape })
    return shapeHandle
}

export const vectorAdd = (a: Vector, b: Vector): Vector => {
    return { x: a.x + b.x, y: a.y + b.y }
}

export const moveShape = <S extends PreShape>(shape: S, delta: Vector): S => {
    switch (shape.type) {
        case 'line': return {
            ...shape,
            start: vectorAdd(shape.start, delta),
            end: vectorAdd(shape.end, delta),
        }
        case 'rect': return {
            ...shape,
            topLeft: vectorAdd(shape.topLeft, delta),
        }
        case 'circle': return {
            ...shape,
            center: vectorAdd(shape.center, delta),
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

export interface WhiteboardData {
    size: Size
    viewBox: ViewBox
    shapes: Shape[]
    history: Action[]
    historyIndex: number
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