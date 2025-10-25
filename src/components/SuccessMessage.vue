<script>
import { defineComponent, ref, onMounted, watch } from "vue";

export default defineComponent({
    props: {
        message: {
            type: String,
            required: true,
        },
        visible: {
            type: Boolean,
            default: true,
        },
        duration: {
            type: Number,
            default: 5000, // Default to 5 seconds
        },
    },
    setup(props) {
        const isVisible = ref(props.visible);

        // Hide message after duration
        const hideMessage = () => {
            isVisible.value = false;
        };

        // Auto-hide after duration
        onMounted(() => {
            if (props.visible) {
                setTimeout(hideMessage, props.duration);
            }
        });

        // Watch for visibility changes
        watch(() => props.visible, (newVal) => {
            if (newVal) {
                isVisible.value = true;
                setTimeout(hideMessage, props.duration);
            }
        });

        return { isVisible };
    },
});
</script>

<template>
    <transition name="fade-up">
        <div v-if="isVisible"
            class="fixed top-4 left-[40%] transform bg-emerald-100 text-emerald-800 border-l-8 border-emerald-600 p-4 rounded-lg shadow-lg max-w-sm w-full flex items-center space-x-3 z-50">

            <!-- Success Icon -->
            <i class="fa-regular fa-face-smile text-4xl"></i>

            <!-- Message -->
            <div class="flex-1">
                <p class="text-md font-semibold">Yeeeeee !!!!</p>
                <p class="text-sm mt-2">{{ message }}</p>
            </div>
        </div>
    </transition>
</template>

<style scoped>
/* Animation for fade up */
.fade-up-enter-active,
.fade-up-leave-active {
    transition: all 0.5s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
    transform: translateY(20px);
    /* Starts 20px below and moves up */
    opacity: 0;
}

.fade-up-enter-to,
.fade-up-leave-from {
    transform: translateY(0);
    /* Ends at natural position */
    opacity: 1;
}
</style>