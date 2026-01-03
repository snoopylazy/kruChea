<script setup>
import API_CONFIGS from '@/api/config';
import getStatusClass from '@/components/GetStatusClass.vue';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import '@fortawesome/fontawesome-free/css/all.css';
import { Switch } from '@headlessui/vue';
import axios from 'axios';
import Select from 'primevue/select';
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ErrorMessage from '../../components/ErrorMessage.vue';
import SuccessMessage from '../../components/SuccessMessage.vue';
import ConfirmationDeleteMessage from '../../components/VerifyDelete.vue';
import CategoryMobileScreen from '../Mobile/companyAssets/category.vue';
const { t } = useI18n()

// Use store getters directly for better performance
const branchStore = useBranchStore();


// Form Data
const openModal = ref(false);
const openEdit = ref(false);
const enabled = ref(true);
const isOpen = ref(false);

const items = ref([10, 50, 100, 500, 1000]);
const selectedItem = ref(10);
const isExistCategoryName = ref(false);
const loading = ref(false);
const name = ref('');
const description = ref('');
const status = ref(true);
const currentCategoryId = ref(null);
const currentPage = ref(10);
const paginationKey = ref(0);
const searchText = ref('');
const searchQuery = ref('');
const limitedPerPage = ref(10);

const userId = branchStore.getUserId;
const branchId = branchStore.getBranchId;
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");
const isLoading = ref(false);
const currentPageIsLastRecord = ref(null);
const tableData = ref([])
const pageSize = ref(10)

// Additional refs for preserving creation data
const createdAt = ref(null);
const createdBy = ref(null);

//Delete
const showConfirmDialog = ref(false);
const pendingCategoryId = ref(null);

//Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3')

// SubCategory
const subcategories = ref([{ name: '', description: '' }]);  // Start with one subcategory input

const showSubcategoryInput = ref(true);  // Make sure the input area is visible

const addSubcategory = () => {
    subcategories.value.push({ name: '', description: '' });  // Add new empty subcategory
};

const removeSubcategory = (index) => {
    if (subcategories.value.length > 1) {
        subcategories.value.splice(index, 1);
    }  // Remove a specific subcategory
};


const handleListenToPagination = async (items) => {
    tableData.value = items || [];
};

const handleListenIsLoading = (status) => {

    isLoading.value = status;
};


const handleListenIsLastRecordOnPage = (page) => {
    currentPageIsLastRecord.value = page;
    if (currentPage.value > 1) {
        currentPage.value -= 1;
    }
};

// Row
const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '200' },
    { name: '500' },
    { name: '1000' }
]);



// Dropdown handlers
const toggleDropdownRow = () => {
    if (searchText.value) {
        isOpen.value
    } else {
        isOpen.value = !isOpen.value;
    }
};

const selectItem = (item) => {
    selectedItem.value = item;
    limitedPerPage.value = item;
    isOpen.value = false;
};

const handleClickOutside = (event) => {
    if (!event.target.closest('.dropdown-row')) {
        isOpen.value = false;
    }
};


// Modal handlers
const showModal = () => {
    openModal.value = true;
    clearForm();
};

const closeForm = () => {
    openModal.value = false;
};

const closeEdit = () => {
    openEdit.value = false;
};

const clearForm = () => {
    name.value = '';
    description.value = '';
    status.value = true;
    subcategories.value = [{ name: '', description: '' }];
};



const fetchCategory = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Category`, {
            headers: API_CONFIGS.headers,
        });


        tableData.value = response.data.data || [];

    } catch (error) {
        console.error("Error fetching categories:", error);
        errorMessage.value = t("Failed to fetch categories");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        isLoading.value = false;
    }
}





const addCategory = async () => {
    if (!branchStore.canCreateCategory) {
        errorMessage.value = t("You do not have permission to create categories.");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => { showErrorMessage.value = false; }, 5000);
        return;
    }
    try {
        if (!name.value) {
            errorMessage.value = t("Please enter the Category Name");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }
        if (!subcategories.value.length || subcategories.value.some(sub => !sub.name.trim())) {
            errorMessage.value = t("Please enter at least one valid subcategory");
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
            errorMessage.value = t("Subcategory names must be unique");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }
        isExistCategoryName.value = false;
        isLoading.value = true;
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
                    createdBy: branchStore.getUserId,
                })),
                branchId: branchId.value,
                createdAt: timestamp,
                createdBy: branchStore.getUserId
            },
        };
        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/Category`, requestBody, { headers: API_CONFIGS.headers });
        // Emit socket event for insert
        // socket.emit('dataUpdate', { action: 'insert', collection: 'Category', data: response.data.data?._id });
        closeForm();
        clearForm();
        currentPage.value = 1;
        paginationKey.value++;
        successMessage.value = ("Successfully created");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
        }, 800);
    } catch (error) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage.value = t("Category name already exists");
        } else {
            errorMessage.value = t("Please try again");
        }
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        isLoading.value = false;
    }
};


const editBTN = (category) => {
    openEdit.value = true;
    currentCategoryId.value = category._id;
    name.value = category.name;
    description.value = category.description;
    subcategories.value = category.subCategory.map(sub => ({
        name: sub.name,
        description: sub.description || '',
        createdAt: sub.createdAt,  // preserve old createdAt
        createdBy: sub.createdBy,  // preserve old createdBy
    }));
    status.value = category.status;
    enabled.value = category.status === true;

    // Optional (if you're preserving category createdAt / createdBy too)
    createdAt.value = category.createdAt;
    createdBy.value = category.createdBy;
};

const editCategory = async () => {
    if (!branchStore.canUpdateCategory) {
        errorMessage.value = t("You do not have permission to update categories.");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => { showErrorMessage.value = false; }, 5000);
        return;
    }
    try {
        if (!name.value) {
            errorMessage.value = t("Please enter the Category Name");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }
        if (!subcategories.value.length || subcategories.value.some(sub => !sub.name.trim())) {
            errorMessage.value = $("Please enter at least one valid subcategory");
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
            errorMessage.value = $("Subcategory names must be unique");
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
                    createdAt: sub.createdAt,
                    createdBy: sub.createdBy,
                    updatedAt: timestamp,
                    updatedBy: userId.value,
                })),
                updatedBy: userId.value,
                updatedAt: timestamp,
            }
        };
        const response = await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/Category/${currentCategoryId.value}`, requestBody, { headers: API_CONFIGS.headers });
        // Emit socket event for update
        // socket.emit('dataUpdate', { action: 'update', collection: 'Category', data: response.data.data?._id });
        closeEdit();
        clearForm();
        currentPage.value = 1;
        paginationKey.value++;
        successMessage.value = t("Successfully updated");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
        }, 800);
    } catch (error) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage.value = t("Category name already exists");
        } else {
            errorMessage.value = t("Please try again");
        }
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        isLoading.value = false;
    }
};

const deleteCategory = (categoryId) => {
    pendingCategoryId.value = categoryId;
    showConfirmDialog.value = true;
};

const handleDeleteConfirmation = async () => {
    if (!branchStore.canDeleteCategory) {
        errorMessage.value = t("You do not have permission to delete categories.");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => { showErrorMessage.value = false; }, 5000);
        return;
    }
    try {
        isLoading.value = true;
        showConfirmDialog.value = false;
        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/Category/${pendingCategoryId.value}`, { headers: API_CONFIGS.headers });
        // Emit socket event for delete
        // socket.emit('dataUpdate', { action: 'delete', collection: 'Category', data: response.data.data?._id });
        currentPage.value = 1;
        paginationKey.value++;
        successMessage.value = t("Successfully deleted");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => showSuccessMessage.value = false, 800);
    } catch (error) {
        console.error("Error in handleDeleteConfirmation:", error);
        errorMessage.value = t("Failed to delete category. Please try again.");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        isLoading.value = false;
        pendingCategoryId.value = null;
    }
};


watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
}, { immediate: true });


watch(enabled, (newValue) => {
    status.value = newValue;
});

watch(() => branchStore.getBranchId, (newBranchId) => {
    if (newBranchId) {
        currentPage.value = 1;
        paginationKey.value++;
        fetchCategory();
    }
}, { immediate: false });


watch(selectedRow, (newVal) => {
    if (newVal && newVal.name) {
        pageSize.value = Number(newVal.name);
    }
}, { immediate: true });



const setupSocketListeners = () => {
    socket.off("dataUpdate");
    socket.on("dataUpdate", async (data) => {
        if (data.collection === "Category") {
            // Optionally check action: data.action === 'insert' | 'update' | 'delete'
            await fetchCategory(); // Refresh your data
        }
    });
};


onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    fetchCategory();
    setupSocketListeners();
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});


onBeforeUnmount(() => {
    socket.off("dataUpdate");
});

</script>


<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer overflow-y-auto hidden md:block">
        <p class="text-left font-semibold text-lg">{{ $t('Category') }}</p>

        <div class="flex flex-col md:flex-row justify-between items-center mt-4 gap-4  text-left">
            <!-- Show Rows Dropdown -->
            <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />


            <!-- Search Input -->
            <div class="relative w-full md:w-auto lg:w-48 xl:w-60 flex items-center mr-3">
                <div class="relative w-full">
                    <input v-model="searchQuery" type="text" :placeholder="$t('Search by Name...')"
                        class="p-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-400 outline-none pl-3 pr-10 hover:border-emerald-500">
                    <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </span>
                </div>
            </div>

            <!-- Add New Button (permission) -->
            <button v-if="branchStore.canCreateCategory" class="bg-gradient-to-br from-green-400 to-green-700 text-white px-4 py-2 rounded-md 
              hover:from-green-500 hover:to-green-600 text-xs transition-all duration-300 shadow-md 
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                @click="showModal">
                {{ $t('+ Create New') }}
            </button>

        </div>

        <!-- Table (permission) -->
        <div v-if="branchStore.canViewCategory" class="overflow-x-auto mt-3 relative">
            <!-- Loading Overlay -->
            <div v-if="isLoading == true" class="absolute inset-0 bg-opacity-70 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
            <table class="border-collapse border border-gray-400 w-full" :class="{ 'opacity-50': isLoading == true }">
                <thead class="text-xs bg-gray-100 ">
                    <tr>
                        <th class="border border-gray-300 p-2">{{ $t('Name') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('SubCategory') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('CreateAt') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Status') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Description') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Actions') }}</th>
                    </tr>
                </thead>
                <tbody class="text-sm" v-if="tableData.length > 0">
                    <tr v-for="(item, index) in tableData" :key="index"
                        class="hover:bg-emerald-100 transition-colors duration-200">
                        <td class="border border-gray-300 p-2">{{ item.name }}</td>
                        <td class="border border-gray-300 p-2">
                            <span>
                                {{item.subCategory.slice(0, 4).map(sub => sub.name).join(', ')}}
                                <span v-if="item.subCategory.length > 4">...</span>
                            </span>
                        </td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <td class="border border-gray-300 p-2">
                            <i :class="getStatusClass(item.status)"></i>
                        </td>
                        <td class="border border-gray-300 p-2">{{ item.description }}</td>
                        <td class="flex text-center justify-center p-2 mt-1">
                            <i v-if="branchStore.canUpdateCategory"
                                class="fa-solid fa-pen-to-square cursor-pointer text-orange-500 mr-2 hover:text-orange-600 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="() => editBTN(item)"></i>
                            <i v-if="branchStore.canDeleteCategory" @click="deleteCategory(item._id)"
                                class="fa-solid fa-trash cursor-pointer text-red-600 ml-2 hover:text-red-700 hover:scale-125 transform transition duration-150 ease-in-out"></i>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500 ">
                        <td colspan="10" class="font-khmer text-center  text-lg">
                            {{ $t('No data!') }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="flex justify-between">

            <!-- Back to previous page -->
            <!-- <button @click="$router.go(-1)"
                class="opacity-50 border text-black px-3 py-1.5 rounded-md flex items-center mt-10 space-x-2 bg-white font-medium cursor-pointer">
                <i class="fa-solid fa-arrow-left mx-1"></i>
                {{ $t('Back') }}
            </button> -->


            <!-- Pagination Component -->
            <PaginationTwo :key="paginationKey" :currentPage="currentPage"
                @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
                @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
                :searchQuery="searchText" />


        </div>

    </div>



    <!-- Add Category Modal -->
    <div v-if="openModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
        <div class="font-khmer w-[40%] mt-1 p-6 bg-white shadow-md rounded-lg relative z-50 m-auto">
            <!-- Close Button -->
            <i class="fa-solid fa-circle-xmark cursor-pointer text-red-700 text-lg absolute top-3 right-3 
                hover:text-red-500 transform hover:scale-105 transition-all duration-300 ease-in-out"
                @click="closeForm"></i>

            <h2 class="text-lg font-semibold mb-4 text-gray-700 text-center mt-[-15px]">{{ $t('Create Category Form') }}
            </h2>

            <form @submit.prevent="addCategory" class="space-y-4">
                <!-- Category Name -->
                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">
                        {{ $t('Name') }} <span class="text-red-500">*</span>
                    </label>
                    <input v-model="name" class="border mt-1 border-gray-300 p-2 rounded-md focus:ring focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none 
                transition-all duration-300 ease-in-out hover:border-emerald-300" :placeholder="$t('Enter category name')"
                        type="text" required>
                </div>

                <!-- Description -->
                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">
                        {{ $t('Description') }}
                    </label>
                    <textarea v-model="description" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"
                        :placeholder="$t('Description...')"></textarea>
                </div>

                <!-- Subcategory Toggle Button - move to right -->
                <div class="flex justify-end">
                    <button type="button" @click="addSubcategory"
                        class="flex items-center bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">
                        <span class="mr-2">{{ $t('+ Subcategory') }}</span>
                    </button>
                </div>

                <!-- Subcategory Inputs -->
                <div v-if="showSubcategoryInput" class="mt-4 space-y-4">
                    <div v-for="(subcategory, index) in subcategories" :key="index"
                        class="relative bg-white border-l-4 border-emerald-500 shadow-md rounded-lg p-4">

                        <!-- Remove Button -->
                        <button @click="removeSubcategory(index)" title="Delete" :disabled="subcategories.length === 1"
                            class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                            <i class="fas fa-times-circle text-lg"></i>
                        </button>

                        <!-- Name -->
                        <label class="block text-xs font-medium text-gray-700 mb-1 text-start">
                            {{ $t('SubCategory Name')}} 
                            <span class="text-red-500">*</span></label>
                        <input v-model="subcategory.name" type="text" :placeholder="$t('Enter subcategory name')"
                            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all" />

                        <!-- Description -->
                        <label
                            class="block text-xs font-medium text-gray-700 mt-3 mb-1 text-start">{{ $t('Description') }}</label>
                        <textarea v-model="subcategory.description" rows="2"
                            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            :placeholder="$t('Description...')"></textarea>
                    </div>
                </div>

                <!-- Status Toggle -->
                <div class="flex items-center justify-end">
                    <span class="text-gray-700 text-sm m-1">{{ $t('Status') }}</span>
                    <Switch v-model="enabled"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out"
                        :class="enabled ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-gray-300 to-gray-500'">
                        <span class="sr-only">{{ $t('Enable notifications') }}</span>
                        <span
                            class="inline-block h-4 w-4 transform bg-white rounded-full transition-all duration-300 ease-in-out"
                            :class="enabled ? 'translate-x-6' : 'translate-x-1'"></span>
                    </Switch>
                </div>

                <!-- Action Buttons -->
                <div class="flex space-x-2 justify-end">
                    <button type="button" @click="clearForm"
                        class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                        {{ $t('Clear') }}
                    </button>

                    <button type="submit"
                        class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-green-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                        {{ $t('Create') }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Category Modal -->
    <div v-if="openEdit" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
        <div class="font-khmer w-[40%] mt-1 p-6 bg-white shadow-md rounded-lg relative z-50 m-auto">

            <!-- Close Button -->
            <i class="fa-solid fa-circle-xmark cursor-pointer text-red-700 text-lg absolute top-3 right-3 
            hover:text-red-500 transform transition-all duration-300 ease-in-out hover:scale-105"
                @click="closeEdit"></i>

            <!-- Title -->
            <h2 class="text-lg font-semibold mb-4 text-gray-700 text-center mt-[-15px]">{{ $t('Edit Category Form') }}
            </h2>

            <form @submit.prevent="editCategory" class="space-y-4">
                <!-- Category Name -->
                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">
                        {{ $t('Name') }} <span class="text-red-500">*</span>
                    </label>
                    <input v-model="name" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all outline-none duration-300 ease-in-out hover:border-emerald-300" type="text"
                        :placeholder="$t('Enter category name')" required>
                </div>

                <!-- Description -->
                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Description') }}</label>
                    <textarea v-model="description" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                    transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"
                        :placeholder="$t('Description...')"></textarea>
                </div>

                <!-- Subcategory Toggle Button - move to right -->
                <div class="flex justify-end">
                    <button type="button" @click="addSubcategory"
                        class="flex items-center bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">
                        <span class="mr-2">{{ $t('+ Subcategory') }}</span>
                    </button>
                </div>

                <!-- Subcategory Inputs -->
                <div v-if="showSubcategoryInput" class="mt-4 space-y-4">
                    <div v-for="(subcategory, index) in subcategories" :key="index"
                        class="relative bg-white border-l-4 border-emerald-500 shadow-md rounded-lg p-4">

                        <!-- Remove Button -->
                        <button @click="removeSubcategory(index)" title="Delete" :disabled="subcategories.length === 1"
                            class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                            <i class="fas fa-times-circle text-lg"></i>
                        </button>

                        <!-- Name -->
                        <label class="block text-xs font-medium text-gray-700 mb-1 text-start">
                            {{$t('Subcategory Name')}}
                            <span class="text-red-500">*</span></label>
                        <input v-model="subcategory.name" type="text" :placeholder="$t('Enter subcategory name')" required
                            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all" />

                        <!-- Description -->
                        <label
                            class="block text-xs font-medium text-gray-700 mt-3 mb-1 text-start">{{ $t('Description') }}</label>
                        <textarea v-model="subcategory.description" rows="2"
                            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            :placeholder="$t('Description...')"></textarea>
                    </div>
                </div>

                <!-- Status Toggle -->
                <div class="flex items-center justify-end">
                    <span class="text-gray-700 text-sm m-1">{{ $t('Status') }}</span>
                    <Switch v-model="enabled"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out"
                        :class="enabled ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-gray-300 to-gray-500'">
                        <span class="sr-only">{{ $t('Enable notifications') }}</span>
                        <span
                            class="inline-block h-4 w-4 transform bg-white rounded-full transition-all duration-300 ease-in-out"
                            :class="enabled ? 'translate-x-6' : 'translate-x-1'"></span>
                    </Switch>
                </div>

                <!-- Action Buttons -->
                <div class="flex space-x-2 justify-end">
                    <button type="button" @click="clearForm"
                        class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                        {{ $t('Clear') }}
                    </button>
                    <button type="submit"
                        class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-green-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                        {{ $t('Update') }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Confirmation Delete Dialog -->
    <ConfirmationDeleteMessage :show="showConfirmDialog" @cancel="showConfirmDialog = false"
        @confirm="handleDeleteConfirmation" />

    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />

    <!-- Mobile  Layout -->
    <CategoryMobileScreen class="block md:hidden " />

</template>

<style scoped>
tbody tr:nth-child(even) {
    background-color: #34D399;
    color: white;
    /* Optional for better visibility */
}
</style>
