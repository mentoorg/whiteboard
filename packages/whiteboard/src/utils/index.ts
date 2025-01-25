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