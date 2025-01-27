import { computed, reactive } from 'vue'

export type LogType = 'info' | 'warn' | 'error'

export interface Log {
    type: LogType
    msg: string
}

export interface LogAggregated extends Log {
    count: number
}

export const logs = reactive<Log[]>([])

export const logsAggregated = computed(() => {
    const res: LogAggregated[] = []
    logs.forEach(log => {
        const last = res[res.length - 1]
        if (last && last.type === log.type && last.msg === log.msg) {
            last.count ++
        }
        else {
            res.push({ ...log, count: 1 })
        }
    })
    return res.reverse()
})

export const log = (msg: string, type: LogType = 'info') => {
    logs.push({ type, msg })
    console[type](msg)
}

window.addEventListener('error', (event) => {
    log(event.message, 'error')
})