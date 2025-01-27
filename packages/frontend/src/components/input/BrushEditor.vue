<script setup lang="ts">
import ColorPicker from './ColorPicker.vue';

const strokeColor = defineModel<string>('stroke')
const fillColor = defineModel<string>('fill')
</script>

<template>
    <div class="brush-editor">
        <div>
            Stroke <ColorPicker v-model="strokeColor"/>
        </div>
        <div>
            Fill <ColorPicker v-model="fillColor"/>
        </div>
    </div>
</template>

<style scoped>
.brush-editor {
    display: flex;
    flex-direction: column;
    white-space: nowrap;
}

.brush-editor > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.color-picker {
    margin-left: .5em;
}

.brush-editor input[type="color"] {
    width: 1em;
    height: 1em;
    border: none;
}
</style>