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

export const addShape = (data: WhiteboardData, shape: PreShape) => {
    const id = genShapeId()
    data.shapes.push({ ...shape, id })
    return () => {
        remove(data.shapes, it => it.id === id)
    }
}

export const addShapeRel = (data: WhiteboardData, shape: PreShape) => {
    return addShape(data, moveShape(shape, data.viewBox))
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

export interface WhiteboardAction {
    // TODO
}

export interface WhiteboardData {
    size: Size
    viewBox: ViewBox
    shapes: Shape[]
    history: WhiteboardAction[]
}
