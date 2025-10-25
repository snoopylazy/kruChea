<script setup>
import API_CONFIGS from '@/api/config';
import getStatusClass from '@/components/GetStatusClass.vue';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { getNextNumberId } from '@/composable/getNextId';
import { fetchTimestamp } from '@/composable/timestamp';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import { Switch } from '@headlessui/vue';
import axios from 'axios';
import Select from 'primevue/select';
import { onMounted, onUnmounted, ref, watch, } from 'vue';
import { useI18n } from 'vue-i18n';
import ErrorMessage from '../../components/ErrorMessage.vue';
import SuccessMessage from '../../components/SuccessMessage.vue';
import ConfirmationDeleteMessage from '../../components/VerifyDelete.vue';
import assetMobileScreen from '../Mobile/companyAssets/Assets.vue';
const { t } = useI18n()

const {
    canCreateCategory,
    canUpdateCategory,
    canDeleteCategory,
    canViewCategory,
    canReviewCategory,
    canCopyAsset
} = useUserPermission();

// Modal
const openModal = ref(false);
const openEdit = ref(false);
const enabled = ref(true);
const isOpen = ref(false);
const items = ref([10, 50, 100, 500, 1000]);
const selectedItem = ref(10);
const isBranchSearchOpen = ref(false);
const branchSearchInput = ref(null);
const categoryItems = ref([]);
const selectedCategory = ref(null);
const selectedSubCategory = ref(null);
const name = ref('');
const status = ref(true);
const description = ref('');
const loading = ref(false);
const branchStore = useBranchStore();

// State for success and error messages
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");

// Pagination
const assetData = ref([]);
const isLoading = ref(false);
const searchQuery = ref('');
const limitedPerPage = ref(10);
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const paginationKey = ref(0);

// Add refresh pagination function
const refreshPagination = () => {
    paginationKey.value++;
};

const showConfirmDialog = ref(false);
const pendingAssetId = ref(null);
const isDeleting = ref(false);

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

const toggleDropdownRow = () => {
    if (searchText.value) {
        isOpen.value;
    } else {
        isOpen.value = !isOpen.value;
    }
};

const selectItem = (item) => {
    selectedItem.value = item;
    limitedPerPage.value = item;
    pageSize.value = item;
    isOpen.value = false;
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

const showModal = () => {
    openModal.value = true;
};

const clearForm = () => {
    name.value = '';
    status.value = true;
    description.value = '';
    selectedCategory.value = '';
    selectedSubCategory.value = '';
};

const closeForm = () => {
    openModal.value = false;
    clearForm();
    fetchAsset();
    refreshPagination();
};

const closeEdit = () => {
    openEdit.value = false;
    clearForm();
    refreshPagination();
};

// CopyAsset
const showCopyModal = ref(false);

function copyProduct() {
    showCopyModal.value = true;
}

const handleListenToPagination = (items) => {
    assetData.value = items || [];
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
};

const handleClickOutside = (event) => {
    if (
        !event.target.closest(".dropdown-branch") &&
        !event.target.closest(".dropdown-row") &&
        event.target !== branchSearchInput.value
    ) {
        isBranchSearchOpen.value = false;
        isOpen.value = false;
    }
};

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

const branchData = ref([]);
const fetchBranches = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching branches:", error);
    }
};

const getBranchName = (id) => {
    const findBranch = branchData.value.find((d) => d._id === id);
    if (!findBranch) {
        return "UnknownBranch";
    }
    return findBranch.abbreviation || "UnknownBranch";
};

const fetchAsset = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { headers: API_CONFIGS.headers });
        assetData.value = response.data.data || [];
    } catch (error) {
        console.error("Cannot get asset data", error);
    }
};

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

const addProduct = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t("Please enter asset name");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
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
            throw new Error("Failed to generate idCustom");
        }

        const requestBody = {
            fields: {
                idCustom: idCustom,
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
                branchId: branchStore.branchId,
                createdAt: timestamp,
                createdBy: branchStore.userId
            }
        };

        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAsset`, requestBody, { headers: API_CONFIGS.headers });

        successMessage.value = t("Create Asset Successfully");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => showSuccessMessage.value = false, 800);

        closeForm();
        clearForm();
    } catch (error) {
        console.error("Error adding Asset:", error.response?.data || error.message);
        errorMessage.value = t("Create Asset Failed");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
    }
};

function getCategoryNameById(id) {
    const category = categoryItems.value.find(c => c._id === id);
    return category ? category.name : "";
}

const updateCustomId = (oldIdCustom, newName) => {
    const parts = oldIdCustom.split('-');
    if (parts.length < 2) {
        return oldIdCustom;
    }

    const number = parts[parts.length - 1];
    const sanitizedNewName = newName.replace(/\s+/g, '').toLowerCase();
    return `${sanitizedNewName}-${number}`;
};

const currentProductId = ref('');
const editBTN = (product) => {
    openEdit.value = true;
    currentProductId.value = product._id;
    name.value = product.name;
    description.value = product.description;
    status.value = product.status;
    enabled.value = product.status === true;

    const category = categoryItems.value.find(cat => cat._id === product.category._id);
    if (category) {
        selectedCategory.value = category;
        if (product.category.subCategory?.name) {
            // Add subcategory to options if missing
            if (
                Array.isArray(category.subCategory) &&
                !category.subCategory.some(sub => sub.name === product.category.subCategory.name)
            ) {
                category.subCategory.push({
                    name: product.category.subCategory.name,
                });
            }
            const subcategory = category.subCategory.find(sub =>
                sub.name && product.category.subCategory.name &&
                sub.name.trim().toLowerCase() === product.category.subCategory.name.trim().toLowerCase()
            );
            selectedSubCategory.value = subcategory || product.category.subCategory;
        } else {
            selectedSubCategory.value = null;
        }
    } else {
        selectedCategory.value = null;
        selectedSubCategory.value = null;
    }
};



const editProduct = async () => {
    try {
        if (!name.value) {
            errorMessage.value = t("Please enter asset name");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
            return;
        }

        if (!selectedCategory.value && !selectedSubCategory.value) {
            errorMessage.value = t("Please select a category");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
            return;
        }

        loading.value = true;
        const timestamp = await fetchTimestamp();

        const currentProduct = assetData.value.find(item => item._id === currentProductId.value);
        const newIdCustom = updateCustomId(currentProduct.idCustom, name.value);

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

        const response = await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${currentProductId.value}`,
            requestBody, { headers: API_CONFIGS.headers }
        );

        successMessage.value = t("Update Asset Successfully");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => showSuccessMessage.value = false, 800);

        closeEdit();
        clearForm();
    } catch (error) {
        console.error("Update failed:", error.response?.data || error.message);
        errorMessage.value = t("Update Asset Failed");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
    }
};

const checkAssetTransactions = async (assetId) => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'assetId', operator: '==', value: assetId },
                { field: 'actualReturnDate', operator: '==', value: null },
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        return response.data.data.length > 0;
    } catch (error) {
        console.error('Error checking transactions:', error);
        return true;
    }
};

const purchaseAsset = ref([]);
const checkPurchaseAsset = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'assetIds', operator: 'arrayContains', value: assetId },
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params, headers: API_CONFIGS.headers });
        purchaseAsset.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching purchase assets:', error);
    }
};

const deleteProduct = (assetId) => {
    pendingAssetId.value = assetId;
    showConfirmDialog.value = true;
};

const handleDeleteConfirmation = async () => {
    try {
        loading.value = true;
        showConfirmDialog.value = false;

        const assetToDelete = assetData.value.find(item => item._id === pendingAssetId.value);
        if (!assetToDelete) {
            throw new Error("Asset not found");
        }

        const hasActiveTransactions = await checkAssetTransactions(pendingAssetId.value);
        if (hasActiveTransactions) {
            errorMessage.value = "Sorry, you cannot delete this asset because it has Checkout transactions.";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        const purchaseHistoryParams = {
            dynamicConditions: JSON.stringify([
                { field: 'asset.assetId', operator: '==', value: pendingAssetId.value }
            ])
        };

        const purchaseHistoryResponse = await axios.get(
            `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
            { params: purchaseHistoryParams, headers: API_CONFIGS.headers }
        );

        if (purchaseHistoryResponse.data.data && purchaseHistoryResponse.data.data.length > 0) {
            errorMessage.value = "Sorry, you cannot delete this asset because it has Purchase History records.";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        const hasPurchaseAsset = purchaseAsset.value.some(item => item.assetId === pendingAssetId.value);
        if (hasPurchaseAsset) {
            errorMessage.value = "Sorry, you cannot delete this asset because it has Purchase transactions.";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        const findTransactionsParams = {
            dynamicConditions: JSON.stringify([
                { field: 'assetId', operator: 'arrayContains', value: pendingAssetId.value },
            ])
        };

        const transactionsResponse = await axios.get(
            `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CopyAssetTransaction`,
            { params: findTransactionsParams, headers: API_CONFIGS.headers }
        );

        const assetTransactions = transactionsResponse.data.data || [];

        const deleteTransactionPromises = assetTransactions.map(transaction =>
            axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CopyAssetTransaction/${transaction._id}`, { headers: API_CONFIGS.headers })
        );

        if (deleteTransactionPromises.length > 0) {
            await Promise.all(deleteTransactionPromises);
        }

        if (assetToDelete.copyAssetTransactionId) {
            try {
                await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CopyAssetTransaction/${assetToDelete.copyAssetTransactionId}`, { headers: API_CONFIGS.headers });
            } catch (err) {
                console.warn("Transaction might have been already deleted or doesn't exist:", err.message);
            }
        }

        await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CompanyAsset/${pendingAssetId.value}`, { headers: API_CONFIGS.headers });

        successMessage.value = t("Delete Asset Successfully");
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => (showSuccessMessage.value = false), 800);

        await fetchAsset();
        refreshPagination();
    } catch (error) {
        console.error("Error deleting asset:", error);
        errorMessage.value = t("Delete Asset Failed");
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        loading.value = false;
        pendingAssetId.value = null;
        isDeleting.value = false;
    }
};

watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
}, { immediate: true });

watch(enabled, (newValue) => {
    status.value = newValue;
});

watch(selectedRow, (newVal) => {
    if (newVal && newVal.name) {
        pageSize.value = Number(newVal.name);
    }
}, { immediate: true });

watch(selectedCategory, (newCategory) => {
    if (!newCategory || !Array.isArray(newCategory.subCategory) || newCategory.subCategory.length === 0) {
        selectedSubCategory.value = null;
    }
});

const setupSocketListeners = () => {
    socket.off('dataUpdate');
    socket.on('dataUpdate', async (data) => {
        if (data.collection === 'CompanyAsset') {
            await fetchAsset();
        }
    });
};

onMounted(async () => {
    try {
        await Promise.all([fetchCategories(), fetchBranches()]);
        document.addEventListener("click", handleClickOutside);
        setupSocketListeners();
    } catch (error) {
        console.error("Failed to initialize component:", error);
    }
});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">{{ $t('CompanyAsset') }}</p>

        <div class="flex flex-col md:flex-row justify-between items-center mt-4">
            <!-- Show Rows Dropdown -->
            <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

            <!-- Search Input -->
            <div class="relative w-full md:w-auto lg:w-48 xl:w-60 flex items-center mr-3">
                <div class="relative w-full">
                    <input v-model="searchQuery" type="text" :placeholder="$t('Search by Name...')"
                        class="p-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-400 outline-none pl-3 pr-10 hover:border-emerald-500">
                    <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </span>
                </div>
            </div>

            <div class="sm:mt-1">
                <!-- Copy product -->
                <!-- <button v-if="canCopyAsset()" class="mr-2 md:mb-1" @click="copyProduct">
                    <div class="bg-gradient-to-br from-yellow-400 to-yellow-700 text-white px-4 py-2 rounded-md 
                        hover:from-yellow-500 hover:to-yellow-600 text-xs transition-all duration-300 shadow-md 
                          hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50">
                        <i class="fa-solid fa-copy cursor-pointer mr-1"></i>
                        <span class="text-xs">{{$t('Copy Assets')}}</span>
                    </div>
                </button> -->


                <!-- Add New Button (permission) -->
                <button v-if="canCreateCategory()" class="bg-gradient-to-br from-green-400 to-green-700 text-white px-4 py-2 rounded-md 
                    hover:from-green-500 hover:to-green-600 text-xs transition-all duration-300 shadow-md 
                      hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                    @click="showModal">
                    {{ $t('+ Create New') }}
                </button>
            </div>
        </div>

        <!-- Table (permission) -->
        <div v-if="canViewCategory()" class="overflow-x-auto mt-3 relative">
            <div v-if="isLoading == true"
                class="absolute inset-0 bg-opacity-70 flex items-center justify-center z-10 mt-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
            <table class="min-w-full border-collapse border border-gray-400 p-2"
                :class="{ 'opacity-50': isLoading == true }">
                <thead class="bg-gray-100 text-xs">
                    <tr>
                        <th class="border border-gray-300 p-2">{{ $t('ID') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('CreateAt') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Name') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Category') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Stock') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Status') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Description') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Actions') }}</th>
                    </tr>
                </thead>
                <tbody class="text-sm" v-if="assetData.length > 0">
                    <tr v-for="(item, index) in assetData" :key="index"
                        class="hover:bg-emerald-100 transition-colors duration-200">
                        <td class="border border-gray-300 p-2">{{ item.idCustom }}</td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <td class="border border-gray-300 p-2">{{ item.name }}</td>
                        <td class="border border-gray-300 p-2">
                            <span v-if="item?.category?.subCategory?.name">
                                {{ item.category.categoryName }} - [{{ item.category.subCategory.name }}]
                            </span>
                            <span v-else>
                                {{ item.category.categoryName }}
                            </span>
                        </td>
                        <td class="border border-gray-300 p-2">{{ item.totalStock }}</td>
                        <td class="border border-gray-300 p-2">
                            <i :class="getStatusClass(item.status)"></i>
                        </td>
                        <td class="border border-gray-300 p-2">{{ item.description }}</td>
                        <td class="flex text-center justify-center p-2 mt-1">
                            <i v-if="canUpdateCategory()"
                                class="fa-solid fa-pen-to-square cursor-pointer text-orange-500 mr-2 hover:text-orange-600 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="() => editBTN(item)"></i>
                            <i v-if="canDeleteCategory()"
                                class="fa-solid fa-trash cursor-pointer text-red-600 ml-2 hover:text-red-700 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="deleteProduct(item._id)"></i>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500">
                        <td colspan="10" class="font-khmer text-center text-lg">
                            {{ $t('No Data!') }}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="flex justify-between">
                <!-- Pagination Component -->
                <PaginationTwo :key="paginationKey" :currentPage="currentPage"
                    @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
                    @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
                    :searchQuery="searchText" />
            </div>
        </div>


        <!-- Modal for Adding Product -->
        <div v-if="openModal"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
            <div class="font-khmer w-[40%] mt-1 p-6 bg-white shadow-md rounded-lg relative z-50 m-auto">
                <!-- Close Icon -->
                <i class="fa-solid fa-circle-xmark cursor-pointer text-red-700 text-lg absolute top-3 right-3 
        hover:text-red-500 transform hover:scale-105 transition-all duration-300 ease-in-out" @click="closeForm"></i>

                <!-- Title -->
                <h2 class="text-lg font-semibold mb-4 text-gray-700 text-center mt-[-15px]">{{ $t('Create Asset Form')
                    }}</h2>

                <!-- Form -->
                <form @submit.prevent="addProduct" class="grid grid-cols-1 gap-4">

                    <!-- Name Input -->
                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Name') }} <span
                                class="text-red-500">*</span></label>
                        <input v-model="name" class="border mt-1 border-gray-300 p-2 rounded-md focus:ring focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none 
                    transition-all duration-300 ease-in-out hover:border-emerald-300" type="text"
                            :placeholder="$t('Enter assets name')">
                    </div>

                    <!-- Category Dropdown -->
                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Category') }} <span
                                class="text-red-500">*</span></label>
                        <Select v-model="selectedCategory" :options="categoryItems" optionLabel="name"
                            class="w-full text-left" :placeholder="$t('Select category')" />
                    </div>

                    <!-- Subcategory Dropdown (only shown if category has subcategories) -->
                    <div
                        v-if="selectedCategory && Array.isArray(selectedCategory.subCategory) && selectedCategory.subCategory.filter(sub => sub && sub.name).length > 0">
                        <label class="block text-xs text-gray-700 text-left p-1">
                            {{ $t('Subcategory') }}<span class="text-red-500">*</span>
                        </label>
                        <Select v-model="selectedSubCategory" :options="selectedCategory.subCategory" optionLabel="name"
                            class="w-full text-left" :placeholder="$t('Select subcategory')" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Description') }}</label>
                        <textarea v-model="description" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                        transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"
                            :placeholder="$t('Description...')"></textarea>
                    </div>

                    <div class="flex flex-col md:flex-row justify-between items-center w-full">
                        <!-- Status Toggle -->
                        <div class="flex items-center mb-2 md:mb-0">
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
                        <div class="flex space-x-2">
                            <button type="button" @click="clearForm"
                                class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                                {{ $t('Clear') }}
                            </button>
                            <button type="submit"
                                class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-green-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                                {{ $t('Create') }}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>



        <!-- Modal for Editing Product -->
        <div v-if="openEdit"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
            <div class="font-khmer w-[40%] mt-1 p-6 bg-white shadow-md rounded-lg relative z-50 m-auto">
                <!-- Close Icon -->
                <i class="fa-solid fa-circle-xmark cursor-pointer text-red-700 text-lg absolute top-3 right-3 
        hover:text-red-500 transform hover:scale-105 transition-all duration-300 ease-in-out" @click="closeEdit"></i>

                <!-- Title -->
                <h2 class="text-lg font-semibold mb-4 text-gray-700 text-center mt-[-15px]">{{ $t('Edit Asset Form') }}
                </h2>

                <!-- Form -->
                <form @submit.prevent="editProduct" class="grid grid-cols-1 gap-4">

                    <!-- Name Input -->
                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Name') }} <span
                                class="text-red-500">*</span></label>
                        <input v-model="name" class="border mt-1 border-gray-300 p-2 rounded-md focus:ring focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none 
                    transition-all duration-300 ease-in-out hover:border-emerald-300" type="text"
                            :placeholder="$t('Enter assets name')" required>
                    </div>

                    <!-- Category Dropdown -->
                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Category') }} <span
                                class="text-red-500">*</span></label>
                        <Select v-model="selectedCategory" :options="categoryItems" optionLabel="name"
                            class="w-full text-left" :placeholder="$t('Select category')" />
                    </div>

                    <!-- Subcategory Dropdown (only shown if category has subcategories) -->
                    <div
                        v-if="selectedCategory && Array.isArray(selectedCategory.subCategory) && selectedCategory.subCategory.filter(sub => sub && sub.name).length > 0">
                        <label class="block text-xs text-gray-700 text-left p-1">
                            {{ $t('Subcategory') }}<span class="text-red-500">*</span>
                        </label>
                        <Select v-model="selectedSubCategory" :options="selectedCategory.subCategory" optionLabel="name"
                            class="w-full text-left" :placeholder="$t('Select subcategory')" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Description') }}</label>
                        <textarea v-model="description" :placeholder="$t('Description...')" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                        transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"></textarea>
                    </div>

                    <div class="flex flex-col md:flex-row justify-between items-center w-full">
                        <!-- Status Toggle -->
                        <div class="flex items-center mb-2 md:mb-0">
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
                        <div class="flex space-x-2">
                            <button type="button" @click="clearForm"
                                class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                                {{ $t('Clear') }}
                            </button>
                            <button type="submit"
                                class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-green-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                                {{ $t('Update') }}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Copy assets Form -->
    <!-- <CopyAssetsForm v-if="showCopyModal" @close="showCopyModal = false" /> -->

    <!-- Confirmation Delete Dialog -->
    <ConfirmationDeleteMessage :show="showConfirmDialog" @cancel="showConfirmDialog = false"
        @confirm="handleDeleteConfirmation" />


    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />

    <!-- Mobile  Layout -->
    <assetMobileScreen class="block md:hidden" />
</template>


<style scoped>
tbody tr:nth-child(even) {
    background-color: #34D399;
    /* emerald-400 */
    color: white;
}

.max-h-45 {
    max-height: 13rem;
}

.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #34D399;
    /* emerald-400 */
    border-radius: 20px;
    transition: background-color 0.3s ease;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #10B981;
    /* emerald-500 for hover */
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #dcfce7;
    /* lime-100 */
}

/* Firefox */
.overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: #34D399 #dcfce7;
    /* thumb / track */
}
</style>