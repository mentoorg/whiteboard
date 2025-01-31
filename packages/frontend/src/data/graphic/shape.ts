import { reactive } from 'vue'
import { createIdGenerator, type WhiteboardData } from '..'
import { remove, type Pred } from '../../utils'
import { vAdd, vMul, type Vector } from './vector'

export interface Size {
    width: number
    height: number
}

export type Transform = (a: Vector) => Vector

export const shapePosProps: {
    [T in ShapeType]: (keyof (PreShape & { type: T }))[]
} = {
    circle: [ 'center' ],
    line: [ 'start', 'end' ],
    rect: [ 'topLeft' ],
}

export const transform = <S extends PreShape & { type: T }, T extends ShapeType>(shape: S, trans: Transform): S => {
    shapePosProps[shape.type].forEach(k => {
        shape[k] = trans(shape[k] as Vector)
    })
    return shape
}

export type PreShape = (
    | CircleShape
    | LineShape
    | RectShape
) & {
    visible?: boolean
    system?: boolean
}

export type ShapeType = PreShape['type']

export type Shape = PreShape & {
    id: number
}

export interface Strokable {
    stroke?: string
}

export interface Fillable {
    fill?: string
}

export interface CircleShape extends Strokable, Fillable {
    type: 'circle'
    radius: number
    center: Vector
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

export const circle = (center: Vector, radius: number): CircleShape => ({
    type: 'circle',
    center,
    radius,
})

export const point = (pos: Vector): CircleShape => ({
    type: 'circle',
    center: pos,
    radius: 0,
})

export const line = (start: Vector, end: Vector): LineShape => ({
    type: 'line',
    start,
    end,
})

export const rectP = (start: Vector, end: Vector): RectShape => ({
    type: 'rect',
    topLeft: {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
    },
    size: {
        width: Math.abs(start.x - end.x),
        height: Math.abs(start.y - end.y),
    }
})

export const genShapeId = createIdGenerator()

export const addShape = (data: WhiteboardData, preShape: PreShape) => {
    const id = genShapeId()
    const shape = Object.assign(preShape, { id })
    data.shapes.push(shape)
    return {
        shape,
        removeShape: () => remove(data.shapes, it => it.id === id)
    }
}

export const viewportTransform = (data: WhiteboardData): Transform => (
    a => vAdd(vMul(a, 1 / data.viewport.scale), data.viewport)
)

export const addShapeRel = (data: WhiteboardData, preShape: PreShape) => (
    addShape(data, transform(preShape, viewportTransform(data)))
)

export const setShapes = (data: WhiteboardData, shapes: Shape[]) => {
    data.shapes = reactive(shapes)
}

export const removeShapes = (data: WhiteboardData, pred: Pred<Shape>) => {
    const removed: Shape[] = []
    setShapes(data, data.shapes.filter(it => {
        if (pred(it)) {
            removed.push(it)
            return false
        }
        return true
    }))
    return removed
}