export interface Vector {
    x: number
    y: number
}

export const vAdd = (a: Vector, b: Vector): Vector => ({
    x: a.x + b.x,
    y: a.y + b.y,
})

export const vMul = (a: Vector, k: number): Vector => ({
    x: a.x * k,
    y: a.y * k,
})

export const distance = (a: Vector, b: Vector): number => (
    Math.hypot(a.x - b.x, a.y - b.y)
)