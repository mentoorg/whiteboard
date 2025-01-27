<script setup lang="ts">
const color = defineModel<string>()
</script>

<template>
    <div class="color-picker">
        <label>
            <div class="color-display" :style="{ backgroundColor: color }"></div>
            <input type="color" v-model="color"/>
        </label>
    </div>
</template>

<style scoped>
.color-picker {
    display: inline-block;
}

input[type="color"] {
    display: none;
}

.color-display {
    width: 1em;
    height: 1em;
    border: 1px solid black;
    border-radius: 50%;
    cursor: pointer;
}
</style>