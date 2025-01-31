export type Pred<T> = (x: T) => boolean

export type Disposer = () => void

export const remove = <T>(xs: T[], pred: Pred<T>) => {
    const index = xs.findIndex(pred)
    if (index !== -1) xs.splice(index, 1)
}

export const eq = <T>(x: T) => (y: T) => x === y

export type RemoveIndex<T> = {
    [K in keyof T as
        string extends K ? never :
        number extends K ? never :
        symbol extends K ? never :
        K
    ]: T[K]
}

export const flip = <T, U, R>(f: (x: T, y: U) => R): (y: U, x: T) => R => (y, x) => f(x, y)

export const objectFromEntries = <K extends string | number | symbol, V>(entries: [ K, V ][]) =>
    Object.fromEntries(entries) as Record<K, V>

export const objectAssign = <T extends object, U extends Partial<T>>(target: T, source: U): T =>
    Object.assign(target, source)