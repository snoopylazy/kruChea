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
            default: 4000, // Default to 4 seconds
        },
    },
    setup(props) {
        const isVisible = ref(props.visible);

        // Hide message after duration
        const hideMessage = () => {
            isVisible.value = false;
        };

        // Close message manually
        const closeMessage = () => {
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

        // Handle mouse enter event
        const handleMouseEnter = () => {
            // For example, you could extend the duration when the mouse enters
            if (props.duration) {
                setTimeout(hideMessage, props.duration + 2000); // Extend duration for 2 seconds on mouseenter
            }
        };

        // Handle mouse leave event
        const handleMouseLeave = () => {
            // Reset the duration or any other behavior you need
            setTimeout(hideMessage, props.duration);
        };

        return { isVisible, closeMessage, handleMouseEnter, handleMouseLeave };
    },
});
</script>

<template>
    <transition name="fade-up">
        <div v-if="isVisible"
            class="fixed top-4 left-[40%] transform bg-red-100 text-red-800 border-l-8 border-red-600 p-4 rounded-lg shadow-lg max-w-sm w-full flex items-center space-x-3 z-50"
            @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">

            <!-- Error Icon -->
            <i class="fa-regular fa-face-frown text-4xl"></i>

            <!-- Message -->
            <div class="flex-1">
                <p class="text-md font-semibold">Sorry !!</p>
                <p class="text-sm mt-2">{{ message }}</p>
            </div>

            <!-- Close Button -->
            <button @click="closeMessage" class="text-red-600 hover:text-red-800">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
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