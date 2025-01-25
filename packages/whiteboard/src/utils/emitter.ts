import { eq, remove, type Disposer, type RemoveIndex } from "."

export type Events = {
    [event: string]: any[]
}

export type Emitter<E extends Events> = {
    on: <K extends keyof RemoveIndex<E>>(event: K, listener: (...args: E[K]) => void) => Disposer
    emit: <K extends keyof RemoveIndex<E>>(event: K, ...args: E[K]) => void
}

export const createEmitter = <E extends Events>(): Emitter<E> => {
    const listeners: {
        [K in keyof E]?: Array<(...args: E[K]) => void>
    } = {}

    const on = <K extends keyof RemoveIndex<E>>(event: K, listener: (...args: E[K]) => void) => {
        (listeners[event] ??= []).push(listener)
        return () => remove(listeners[event]!, eq(listener))
    }

    const emit = <K extends keyof RemoveIndex<E>>(event: K, ...args: E[K]) => {
        listeners[event]?.forEach(listener => listener(...args))
    }

    return { on, emit }
}

