<template>
    <div v-if="show" class="fixed inset-0 flex items-start justify-center pt-10 bg-black bg-opacity-50 z-50 font-khmer">
        <div class="bg-emerald-700 text-white rounded-lg w-96 shadow-lg overflow-hidden">
            <div class="bg-emerald-800 p-4 text-center text-lg font-semibold">
                <h3>{{ $t('Confirmation Delete') }}
                </h3>
            </div>
            <div class="p-6 text-center">
                <p>{{$t('Are you really want to delete this data?')}}</p>
            </div>
            <div class="p-4 flex justify-between">
                <button @click="cancel"
                    class="px-4 py-2 border-2 border-white text-white rounded hover:bg-emerald-600 transition">
                    {{$t('no')}}
                </button>
                <button @click="confirm"
                    class="px-4 py-2 bg-white text-emerald-700 rounded hover:bg-gray-200 transition">
                    {{$t('Yes')}}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    show: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['cancel', 'confirm']);

const cancel = () => emit('cancel');
const confirm = () => emit('confirm');
</script>
