<script setup>
import { ref, defineEmits } from 'vue';
import axios from 'axios';

const name = ref('John Doe');
const email = ref('john.doe@example.com');
const imageUrl = ref('');
const imageFile = ref(null);

const emit = defineEmits(['close']);

const onFileChange = (event) => {
    
};

const updateProfile = async () => {
    try {

    } catch (error) {
        console.error('Failed to update profile', error);
    }
};

const btnSave = () => {
    
};
</script>

<template>
    <!-- Edit User -->
    <div class="p-5 w-[40%] bg-white shadow-md rounded-md m-5 font-khmer h-auto">
        <h3 class="my-1 font-semibold">កែសម្រួលព័ត៌មានអ្នកប្រើប្រាស់</h3>
        <form @submit.prevent="updateProfile">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <!-- Profile Picture Section -->
                <div class="flex flex-col items-center mb-10">
                    <div
                        class="w-24 h-24 flex items-center justify-center border border-gray-300 rounded-full bg-gray-100">
                        <img v-if="imageUrl" :src="imageUrl" alt="Profile Image"
                            class="w-full h-full rounded-full object-cover" />
                        <i v-else class="fa-solid fa-user text-3xl text-gray-500"></i>
                    </div>
                    <input type="file" class="mt-2 text-sm w-1/2" />
                </div>

                <!-- User Information -->
                <div class="md:col-span-2">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 text-left">ឈ្មោះ</label>
                        <input v-model="name" type="text" class="mt-1 p-2 border rounded-lg w-full" required />
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 text-left">Email</label>
                        <input v-model="email" type="email" class="mt-1 p-2 border rounded-lg w-full" required />
                    </div>

                    <!-- Submit Button -->
                    <div class="flex justify-end">
                        <button type="button" class="px-2 py-1 bg-red-600 text-white rounded-lg mx-1"
                            @click="$emit('close')">Cancel</button>
                        <button type="submit" class="px-2 py-1 bg-emerald-600 text-white rounded-lg">Save</button>
                    </div>
                </div>
            </div>
        </form>
    </div>

</template>

<style scoped>
/* Add your custom styling here */
</style>