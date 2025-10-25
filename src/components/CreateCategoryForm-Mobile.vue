<script setup>
import API_CONFIGS from '@/api/config';
import { fetchTimestamp } from '@/composable/timestamp';
import { useBranchStore } from '@/store/branchStore';
import '@fortawesome/fontawesome-free/css/all.css';
import { Switch } from '@headlessui/vue';
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// Form Data
const enabled = ref(true);
const isExistCategoryName = ref(false);
const loading = ref(false);
const searchQuery = ref('');
const name = ref('');
const description = ref('');
const status = ref(true);
const currentCategoryId = ref(null);
const branchStore = useBranchStore();
const userId = ref(branchStore.getUserId);
const branchId = ref(branchStore.getBranchId);
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");
const searchText = ref("");
const createdAt = ref(null);
const createdBy = ref(null);

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

// SubCategory
const subcategories = ref([{ name: '', description: '' }]);
const showSubcategoryInput = ref(true);

const addSubcategory = () => {
    subcategories.value.push({ name: '', description: '' });
};

const removeSubcategory = (index) => {
    if (subcategories.value.length > 1) {
        subcategories.value.splice(index, 1);
    }
};

watch(searchQuery, (newValue) => {
    searchText.value = newValue;
}, { immediate: true });


const clearForm = () => {
    name.value = '';
    description.value = '';
    status.value = true;
    enabled.value = true;
    subcategories.value = [{ name: '', description: '' }];
    currentCategoryId.value = null; // Reset ID
    createdAt.value = null;
    createdBy.value = null;
};


// Create Category
const addCategory = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t('Please enter the Category Name');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        if (
            !subcategories.value.length ||
            subcategories.value.some(sub => !sub.name.trim())
        ) {
            errorMessage.value = t('Please enter at least one valid subcategory');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        const names = subcategories.value.map(sub => sub.name.trim().toLowerCase());
        const hasDuplicate = names.some((name, index) => names.indexOf(name) !== index);

        if (hasDuplicate) {
            errorMessage.value = t('Subcategory names must be unique');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        isExistCategoryName.value = false;
        loading.value = true;
        const timestamp = await fetchTimestamp();
        const requestBody = {
            fields: {
                name: name.value,
                status: status.value,
                description: description.value,
                createdBy: userId.value,
                subCategory: subcategories.value.map(sub => ({
                    name: sub.name.trim(),
                    description: sub.description.trim(),
                    createdAt: timestamp,
                    createdBy: userId.value,
                })),
                branchId: branchId.value,
                createdAt: timestamp,
            },
        };
        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/Category`, requestBody, { headers: API_CONFIGS.headers });
        clearForm();

        successMessage.value = t('Successfully created');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            afterSuccessfulOperation();
        }, 500);
    } catch (error) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage.value = t('Category name already exists');
        } else {
            errorMessage.value = t('Please try again');
        }
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        loading.value = false;
    }
};



// Edit Category
const editCategory = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t('Please enter the Category Name');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        if (
            !subcategories.value.length ||
            subcategories.value.some(sub => !sub.name.trim())
        ) {
            errorMessage.value = t('Please enter at least one valid subcategory');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        const names = subcategories.value.map(sub => sub.name.trim().toLowerCase());
        const hasDuplicate = names.some((name, index) => names.indexOf(name) !== index);

        if (hasDuplicate) {
            errorMessage.value = t('Subcategory names must be unique');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        loading.value = true;
        const timestamp = await fetchTimestamp();
        const requestBody = {
            fields: {
                name: name.value,
                status: status.value,
                description: description.value,
                createdAt: createdAt.value,
                createdBy: createdBy.value,
                subCategory: subcategories.value.map(sub => ({
                    name: sub.name.trim(),
                    description: sub.description.trim(),
                    createdAt: sub.createdAt || timestamp, // Use existing or new timestamp
                    createdBy: sub.createdBy || userId.value, // Use existing or current user
                    updatedAt: timestamp,
                    updatedBy: userId.value,
                })),
                updatedBy: userId.value,
                updatedAt: timestamp,
            }
        };
        const response = await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/Category/${currentCategoryId.value}`, requestBody, { headers: API_CONFIGS.headers });
        console.log(requestBody);
        clearForm();

        successMessage.value = t('Successfully updated');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
            afterSuccessfulOperation();
        }, 500);
    } catch (error) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage.value = t('Category name already exists');
        } else {
            errorMessage.value = t('Please try again');
        }
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        loading.value = false;
    }
};

watch(
    () => [branchStore.getUserId, branchStore.getBranchId],
    ([newUserId, newBranchId]) => {
        userId.value = newUserId;
        branchId.value = newBranchId;
    },
    { immediate: true }
);

watch(enabled, (newValue) => {
    status.value = newValue;
});

const route = useRoute();
const router = useRouter();


// Fetch Category by ID for Editing
const fetchCategoryById = async (id) => {
    try {
        loading.value = true;
        const params = {
            sortOrder: 'desc',
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: id }
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Category`, { params, headers: API_CONFIGS.headers });
        const categories = response.data.data || [];

        if (!categories.length) {
            throw new Error("Category not found");
        }

        const category = categories[0];
        currentCategoryId.value = category._id;
        name.value = category.name || '';
        description.value = category.description || '';
        subcategories.value = category.subCategory?.map(sub => ({
            name: sub.name || '',
            description: sub.description || '',
            createdAt: sub.createdAt,
            createdBy: sub.createdBy,
        })) || [{ name: '', description: '' }];
        status.value = category.status;
        enabled.value = category.status === true;
        createdAt.value = category.createdAt;
        createdBy.value = category.createdBy;

    } catch (error) {
        console.error("Error fetching category:", error);
        errorMessage.value = t('Failed to load category data');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => {
            showErrorMessage.value = false;
            router.push('/category');
        }, 3000);
    } finally {
        loading.value = false;
    }
};

const afterSuccessfulOperation = () => {
    setTimeout(() => {
        router.push('/category');
    }, 0); // Immediate redirect
};

onMounted(() => {
    const categoryId = route.params.id;
    if (categoryId && categoryId !== 'create') { // Explicitly check for valid ID
        fetchCategoryById(categoryId);
    } else {
        console.log("No category ID, initializing create mode");
        clearForm(); // Reset form for create mode
    }
});

const isEditMode = computed(() => !!currentCategoryId.value);

const submitCategory = () => {
    if (isEditMode.value) {
        editCategory();
    } else {
        addCategory();
    }
};
</script>


<template>
    <div>
        <!-- Success Message -->
        <transition name="fade">
            <div v-if="showSuccessMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-green-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ successMessage }}
            </div>
        </transition>

        <!-- Error Message -->
        <transition name="fade">
            <div v-if="showErrorMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-red-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ errorMessage }}
            </div>
        </transition>

        <router-link to="/category"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ isEditMode ? $t('Edit Category') : $t('Create Category') }}</span>
        </router-link>

        <form @submit.prevent="submitCategory"
            class="mt-3 space-y-6 px-4 py-6 text-start bg-white rounded-2xl shadow-lg border border-gray-200 sm:max-w-xl mx-auto">

            <!-- Name Field -->
            <div class="flex flex-col">
                <label for="name" class="text-sm font-semibold text-gray-800 mb-1">
                    {{ $t('Name') }} <span class="text-red-500">*</span>
                </label>
                <input v-model="name" type="text" :placeholder="$t('Enter category name')"
                    class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                <p v-if="showErrorMessage && !name.trim()" class="text-red-500 text-xs mt-1 text-start">
                    {{ $t('Category name required.') }}
                </p>
            </div>

            <!-- Description Field -->
            <div class="flex flex-col">
                <label for="description" class="text-sm font-semibold text-gray-800 mb-1">{{ $t('Descriptions') }}</label>
                <textarea v-model="description" rows="4" :placeholder="$t('Enter description...')"
                    class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"></textarea>
            </div>

            <!-- Add Subcategory Button -->
            <div class="flex justify-end">
                <button type="button" @click="addSubcategory"
                    class="text-xs flex items-center gap-1 bg-emerald-500 text-white px-4 py-2 rounded-md shadow hover:bg-emerald-600 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <i class="fa fa-plus"></i> {{ $t('SubCategory') }} <span>*</span>
                </button>
            </div>

            <!-- Subcategory Inputs -->
            <div v-if="showSubcategoryInput" class="space-y-4">
                <div v-for="(subcategory, index) in subcategories" :key="index"
                    class="relative border-l-4 border-emerald-500 bg-gray-50 shadow rounded-lg p-4">
                    <!-- Remove Button -->
                    <button @click="removeSubcategory(index)" :disabled="subcategories.length === 1" title="Delete"
                        class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        <i class="fas fa-times-circle text-lg"></i>
                    </button>

                    <!-- Subcategory Name -->
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        {{ $t('SubCategory Name') }} <span class="text-red-500">*</span>
                    </label>
                    <input v-model="subcategory.name" type="text" placeholder="Enter subcategory name"
                        class="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    <p v-if="showErrorMessage && !subcategory.name.trim()" class="text-red-500 text-xs mt-1 text-start">
                        {{ $t('Subcategory name is required.') }}
                    </p>

                    <!-- Subcategory Description -->
                    <label class="block text-xs font-medium text-gray-700 mt-3 mb-1">{{ $t('Description') }}</label>
                    <textarea v-model="subcategory.description" rows="2" :placeholder="$t('Description...')"
                        class="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"></textarea>
                </div>
            </div>

            <!-- Status + Submit Button -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                <!-- Status Toggle -->
                <div class="flex items-center">
                    <span class="text-gray-700 text-sm mr-2 font-medium">{{ $t('Status') }}</span>
                    <Switch v-model="enabled"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out"
                        :class="enabled
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                            : 'bg-gradient-to-br from-gray-300 to-gray-500'">
                        <span
                            class="inline-block h-4 w-4 transform bg-white rounded-full transition-all duration-300 ease-in-out"
                            :class="enabled ? 'translate-x-6' : 'translate-x-1'"></span>
                    </Switch>
                </div>

                <!-- Submit Button -->
                <div class="flex justify-end w-full sm:w-auto">
                    <button type="submit"
                        class=" sm:w-auto px-5 py-2.5 text-sm rounded-md bg-emerald-500 text-white font-semibold hover:bg-emerald-700 transition"
                        :disabled="loading">
                        {{ isEditMode ? $t('Update') : $t('Create') }}
                    </button>
                </div>
            </div>
        </form>

    </div>
</template>

<style>
/* Simple fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>