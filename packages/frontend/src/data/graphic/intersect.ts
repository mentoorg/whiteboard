import { clamp } from '@vueuse/core'
import { flip } from '../../utils'
import { type PreShape, type LineShape, type CircleShape, type RectShape, point, type ShapeType, line } from './shape'
import { distance, type Vector } from './vector'

type OT<T extends PreShape> = Omit<T, 'type'>

export const ccw = (A: Vector, B: Vector, C: Vector) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
}

export const intersectCircleCircle = (c1: OT<CircleShape>, c2: OT<CircleShape>) => {
    return distance(c1.center, c2.center) < c1.radius + c2.radius
}

export const intersectCircleLine = (c: OT<CircleShape>, l: OT<LineShape>) => {
    const { start, end } = l
    const dx = end.x - start.x
    const dy = end.y - start.y
    const l2 = dx * dx + dy * dy
    const t = ((c.center.x - start.x) * dx + (c.center.y - start.y) * dy) / l2
    const t2 = Math.max(0, Math.min(1, t))
    const projection = {
        x: start.x + t2 * dx,
        y: start.y + t2 * dy,
    }
    return distance(c.center, projection) < c.radius
}

export const intersectPointRect = (p: OT<CircleShape>, r: OT<RectShape>) => {
    const { topLeft, size } = r
    return p.center.x >= topLeft.x && p.center.x <= topLeft.x + size.width
        && p.center.y >= topLeft.y && p.center.y <= topLeft.y + size.height
}

export const intersectCircleRect = (c: OT<CircleShape>, r: OT<RectShape>) => {
    if (c.radius === 0) return intersectPointRect(c, r)
    const { topLeft, size } = r
    const closestPoint = {
        x: clamp(c.center.x, topLeft.x, topLeft.x + size.width),
        y: clamp(c.center.y, topLeft.y, topLeft.y + size.height),
    }
    return distance(c.center, closestPoint) < c.radius
}

export const intersectLineLine = (a: OT<LineShape>, b: OT<LineShape>) => {
    const a1 = a.start
    const a2 = a.end
    const b1 = b.start
    const b2 = b.end

    return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2)
}

export const intersectLineRect = (l: OT<LineShape>, r: OT<RectShape>) => {
    const { topLeft, size } = r

    const topRight = { x: topLeft.x + size.width, y: topLeft.y }
    const bottomLeft = { x: topLeft.x, y: topLeft.y + size.height }
    const bottomRight = { x: topLeft.x + size.width, y: topLeft.y + size.height }

    const lineIntersectsBorder = false
        || intersectLineLine(line(topLeft, topRight), l)
        || intersectLineLine(line(topRight, bottomRight), l)
        || intersectLineLine(line(bottomRight, bottomLeft), l)
        || intersectLineLine(line(bottomLeft, topLeft), l)

    if (lineIntersectsBorder)  return true

    return intersectPointRect(point(l.start), r)
        || intersectPointRect(point(l.end), r)
}

export const intersectRectLine = flip(intersectLineRect)

export const intersectTable: {
    [T in ShapeType]: {
        [U in ShapeType]?: (a: OT<PreShape & { type: T }>, b: OT<PreShape & { type: U }>) => boolean
    }
} = {
    circle: {
        circle: intersectCircleCircle,
        line: intersectCircleLine,
        rect: intersectCircleRect,
    },
    line: {
        line: intersectLineLine,
        rect: intersectLineRect,
    },
    rect: {
        line: intersectRectLine,
    }
}

export const intersect = (a: PreShape, b: PreShape) => intersectTable[a.type]?.[b.type]?.(a as any, b as any) ?? false