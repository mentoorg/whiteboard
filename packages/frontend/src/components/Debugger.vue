<script setup lang="ts">
import { logsAggregated } from '../store/debug'
</script>

<template>
    <div class="logs">
        <div
            v-for="log, index in logsAggregated"
            :key="index"
            class="log"
            :class="log.type"
        >
            {{ log.msg }}
            <span v-if="log.count > 1" class="log-count">
                (x{{ log.count }})
            </span>
        </div>
    </div>
</template>

<style scoped>
.logs {
    position: fixed;
    z-index: 1000;
    top: 0;
    width: 200px;
    left: calc(100vw - 200px);
    background: #000;
    color: #fff;
    font-family: monospace;
}

.log-count {
    color: #888;
}

.log.warn {
    color: #ff0;
}

.log.error {
    color: #f00;
}
</style>