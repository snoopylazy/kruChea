<template>
    <div v-if="isSplashVisible" class="splash-screen">
        <div class="splash-content">
            <img src="../assets/totoro.gif" alt="Logo" class="mx-auto" />
        </div>
    </div>
</template>

<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    isSplashVisible: {
        type: Boolean,
        required: true
    }
});
</script>

<style scoped>
.splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    flex-direction: column;
}

.splash-content img {
    animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}
</style>