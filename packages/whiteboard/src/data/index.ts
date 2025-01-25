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

export type PreShape =
    | LineShape
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

export interface CircleShape extends Strokable, Fillable, Vector {
    type: 'circle'
    radius: number
}

export interface RectShape extends Strokable, Fillable, Vector, Size {
    type: 'rect'
}

export type WhiteboardData = {
    size: Size
    viewBox: ViewBox
    shapes: Shape[]
}
