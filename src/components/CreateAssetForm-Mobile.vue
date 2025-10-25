<script setup>
import API_CONFIGS from '@/api/config';
import { getNextNumberId } from '@/composable/getNextId';
import { fetchTimestamp } from '@/composable/timestamp';
import { useBranchStore } from '@/store/branchStore';
import { Switch } from '@headlessui/vue';
import axios from 'axios';
import CascadeSelect from 'primevue/cascadeselect';
import Select from 'primevue/select';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()


// Route
const route = useRoute();
const router = useRouter();

// Modal state
const enabled = ref(true);
const selectedCategory = ref(null);
const selectedSubCategory = ref(null);
const name = ref('');
const status = ref(true);
const description = ref('');
const categoryItems = ref([]);
const loading = ref(false);
const branchStore = useBranchStore();
const selectCategory = ref();
const currentProductId = ref('');

// State for success and error messages
const showSuccessMessage = ref(false);
const successMessage = ref('');
const showErrorMessage = ref(false);
const errorMessage = ref('');

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

// Clear form
const clearForm = () => {
    name.value = '';
    status.value = true;
    description.value = '';
    selectedCategory.value = null;
    selectedSubCategory.value = null;
    selectCategory.value = null;
};

// Fetch categories
async function fetchCategories() {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true }
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Category`, { params, headers: API_CONFIGS.headers });

        categoryItems.value = response.data.data.map(cat => ({
            ...cat,
            subCategory: Array.isArray(cat.subCategory)
                ? cat.subCategory.filter(sub => sub && sub.name) // or another property that always exists
                : []
        }));
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

// Fetch branches
const branchData = ref([]);
const fetchBranches = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching branches:', error);
    }
};

// Get branch name
const getBranchName = (id) => {
    const findBranch = branchData.value.find((d) => d._id === id);
    return findBranch ? findBranch.abbreviation || 'UnknownBranch' : 'UnknownBranch';
};

// Get category name by ID
const getCategoryNameById = (id) => {
    const category = categoryItems.value.find(c => c._id === id);
    return category ? category.name : '';
};

// Custom ID generation
const handleCustomId = async () => {
    try {
        const branchId = branchStore.getBranchId;


        if (!branchId) {
            return null;
        }

        const assetName = name.value.replace(/\s+/g, '').toLowerCase();
        const params = {
            sortField: 'createdAt',
            sortOrder: 'desc',
            limit: 1,
            dynamicConditions: JSON.stringify([
                // { field: 'branchId', operator: '==', value: branchId },
                { field: 'status', operator: '==', value: true },
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        let lastId = response.data?.data?.[0]?.idCustom || null;
        let lastNumber = lastId ? lastId.match(/(\d+)$/)?.[0] : null;
        const nextNumber = getNextNumberId(lastNumber);
        return `${assetName}-${nextNumber}`;
    } catch (error) {
        console.error("Error in handleCustomId:", error);
    }
};

// Fetch asset data for edit mode
const fetchAssetById = async (id) => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
            params: {
                sortOrder: 'desc',
                dynamicConditions: JSON.stringify([
                    { field: '_id', operator: '==', value: id }
                ])
            }, headers: API_CONFIGS.headers
        });
        const asset = response.data.data?.[0];
        if (asset) {
            currentProductId.value = asset._id;
            name.value = asset.name || '';
            status.value = asset.status || true;
            description.value = asset.description || '';
            enabled.value = asset.status || true;
            const category = categoryItems.value.find(cat => cat._id === asset.category._id);
            if (category) {
                selectedCategory.value = category;
                if (asset.category.subCategory?.name) {
                    // Add subcategory to options if missing
                    if (
                        Array.isArray(category.subCategory) &&
                        !category.subCategory.some(sub => sub.name === asset.category.subCategory.name)
                    ) {
                        category.subCategory.push({
                            name: asset.category.subCategory.name,
                        });
                    }
                    const subcategory = category.subCategory.find(sub =>
                        sub.name && asset.category.subCategory.name &&
                        sub.name.trim().toLowerCase() === asset.category.subCategory.name.trim().toLowerCase()
                    );
                    selectedSubCategory.value = subcategory || asset.category.subCategory;
                } else {
                    selectedSubCategory.value = null;
                }
            } else {
                selectedCategory.value = null;
                selectedSubCategory.value = null;
            }
        }
    } catch (error) {
        console.error('Error fetching asset:', error);
        errorMessage.value = t('Failed to load asset data');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    }
};

// Create asset
const handleCreate = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t('Please enter asset name');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }
        if (
            selectedCategory.value &&
            Array.isArray(selectedCategory.value.subCategory) &&
            selectedCategory.value.subCategory.filter(sub => sub && sub.name).length > 0 &&
            !selectedSubCategory.value
        ) {
            errorMessage.value = t('Please select a subCategory');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        loading.value = true;
        const timestamp = await fetchTimestamp();
        const idCustom = await handleCustomId();

        if (!idCustom) {
            throw new Error('Failed to generate idCustom');
        }

        const requestBody = {
            fields: {
                idCustom,
                status: status.value,
                name: name.value,
                description: description.value,
                category: {
                    _id: selectedSubCategory.value?.parentId || selectedCategory.value?._id,
                    categoryName: getCategoryNameById(selectedSubCategory.value?.parentId || selectedCategory.value?._id),
                    subCategory: selectedSubCategory.value
                        ? {
                            name: selectedSubCategory.value.name.trim(),
                            description: selectedSubCategory.value.description?.trim() || "",
                        }
                        : null,
                },
                branchId: branchStore.getBranchId,
                createdAt: timestamp,
                createdBy: branchStore.userId
            }
        };

        await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAsset`, requestBody, { headers: API_CONFIGS.headers });

        successMessage.value = t('Asset created successfully');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
            router.push('/company-assets');
        }, 500);

        clearForm();
    } catch (error) {
        console.error('Error adding asset:', error.response?.data || error.message);
        errorMessage.value = t('Failed to create asset');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        loading.value = false;
    }
};

// Update custom ID for edit mode
const updateCustomId = async (oldIdCustom, newName) => {
    try {
        // Get the current asset data to access its idCustom
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
            params: {
                dynamicConditions: JSON.stringify([
                    { field: '_id', operator: '==', value: currentProductId.value }
                ])
            }, headers: API_CONFIGS.headers
        });

        const currentAsset = response.data.data?.[0];
        if (!currentAsset || !currentAsset.idCustom) {
            throw new Error("Cannot find current asset or its ID");
        }

        const parts = currentAsset.idCustom.split('-');
        if (parts.length !== 3) {
            return currentAsset.idCustom;
        }

        const [branch, , number] = parts;
        const sanitizedNewName = newName.replace(/\s+/g, '').toLowerCase();
        return `${branch}-${sanitizedNewName}-${number}`;
    } catch (error) {
        console.error("Error updating custom ID:", error);
        return null;
    }
}

// Edit asset
const handleEdit = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t('Please enter asset name');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        // if (!selectedSubCategory.value) {
        //     errorMessage.value = t('Please select a category');
        //     showErrorMessage.value = true;
        //     errorAudio.play();
        //     setTimeout(() => (showErrorMessage.value = false), 5000);
        //     return;
        // }

        loading.value = true;
        const timestamp = await fetchTimestamp();
        const newIdCustom = await updateCustomId(currentProductId.value, name.value);

        if (!newIdCustom) {
            throw new Error('Failed to generate updated idCustom');
        }

        const requestBody = {
            fields: {
                idCustom: newIdCustom,
                status: status.value,
                name: name.value,
                description: description.value,
                category: {
                    _id: selectedSubCategory.value?.parentId || selectedCategory.value?._id,
                    categoryName: getCategoryNameById(selectedSubCategory.value?.parentId || selectedCategory.value?._id),
                    subCategory: selectedSubCategory.value
                        ? {
                            name: selectedSubCategory.value.name.trim(),
                            description: selectedSubCategory.value.description?.trim() || "",
                        }
                        : null,
                },
                updatedAt: timestamp,
                updatedBy: branchStore.userId,
            },
        };

        await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${currentProductId.value}`,
            requestBody, { headers: API_CONFIGS.headers }
        );

        successMessage.value = t('Asset updated successfully');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
            router.push('/company-assets');
        }, 500);

        clearForm();
    } catch (error) {
        console.error('Update failed:', error.response?.data || error.message);
        errorMessage.value = t('Failed to update asset');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        loading.value = false;
    }
};

// Watch enabled for status
watch(enabled, (newValue) => {
    status.value = newValue;
});

// Computed property for edit mode
const isEditMode = computed(() => !!currentProductId.value);

// Submit handler
const submitAsset = () => {
    if (isEditMode.value) {
        handleEdit();
    } else {
        handleCreate();
    }
};

// Initialize component
onMounted(async () => {
    try {
        await Promise.all([fetchCategories(), fetchBranches()]);
        const id = route.params.id;
        if (id) {
            currentProductId.value = id;
            await fetchAssetById(id);
        }
    } catch (error) {
        console.error('Failed to initialize component:', error);
    }
});
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

        <!-- Back Button -->
        <router-link to="/company-assets"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ isEditMode ? $t('Edit asset') : $t('Create asset') }}</span>
        </router-link>

        <!-- Create Asset Form -->
        <form @submit.prevent="submitAsset"
            class="mt-3 space-y-6 px-4 py-6 text-start bg-white rounded-2xl shadow-lg border border-gray-200 sm:max-w-xl mx-auto">

            <!-- Name Field -->
            <div class="flex flex-col">
                <label for="name" class="text-sm font-semibold text-gray-800 mb-1">
                    {{ $t('Name') }} <span class="text-red-500">*</span>
                </label>
                <input v-model="name" type="text" :placeholder="$t('Enter asset name')"
                    class="w-full px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                <p v-if="showErrorMessage && !name.trim()" class="text-red-500 text-xs mt-1 text-start">
                    {{ $t('Asset name is required.') }}
                </p>
            </div>

            <!-- Category Dropdown -->
            <div class="flex flex-col">
                <!-- Category Dropdown -->
                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Category') }} <span
                            class="text-red-500">*</span></label>
                    <Select v-model="selectedCategory" :options="categoryItems" optionLabel="name"
                        class="w-full text-left" :placeholder="$t('Select category')" />
                </div>

                <!-- Subcategory Dropdown (only shown if category has subcategories) -->
                <div class="mt-2"
                    v-if="selectedCategory && Array.isArray(selectedCategory.subCategory) && selectedCategory.subCategory.length > 0">
                    <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Subcategory') }}<span
                            class="text-red-500">*</span></label>
                    <Select v-model="selectedSubCategory" :options="selectedCategory.subCategory" optionLabel="name"
                        class="w-full text-left" :placeholder="$t('Select subcategory')" />
                </div>
            </div>

            <!-- Description Field -->
            <div class="flex flex-col">
                <label for="description" class="text-sm font-semibold text-gray-800 mb-1">{{ $t('Descriptions')
                    }}</label>
                <textarea v-model="description" id="description" rows="4" :placeholder="$t('Enter description...')"
                    class="w-full px-4 py-2 text-sm border border-gray-300 rounded-md shadow-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"></textarea>
            </div>

            <!-- Status & Submit -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <!-- Status Toggle -->
                <div class="flex items-center">
                    <span class="text-gray-800 text-sm font-medium mr-2">{{ $t('Status') }}</span>
                    <Switch v-model="enabled"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition duration-300 ease-in-out"
                        :class="enabled
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                            : 'bg-gradient-to-br from-gray-300 to-gray-500'">
                        <span
                            class="inline-block h-4 w-4 transform bg-white rounded-full transition duration-300 ease-in-out"
                            :class="enabled ? 'translate-x-6' : 'translate-x-1'"></span>
                    </Switch>
                </div>

                <!-- Submit Button -->
                <div class="flex justify-end w-full sm:w-auto">
                    <button type="submit"
                        class="sm:w-auto px-5 py-2.5 rounded-md bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-700 transition-all"
                        :disabled="loading">
                        {{ isEditMode ? $t('Update') : $t('Create') }}
                    </button>
                </div>
            </div>
        </form>

    </div>
</template>