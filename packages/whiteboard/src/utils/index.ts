export type Pred<T> = (value: T) => boolean

export const remove = <T>(array: T[], pred: Pred<T>) => {
    const index = array.findIndex(pred)
    if (index !== -1) array.splice(index, 1)
}