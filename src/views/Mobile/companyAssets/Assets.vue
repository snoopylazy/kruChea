<script setup>
import API_CONFIGS from '@/api/config';
import getStatusClass from '@/components/GetStatusClass.vue';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n()


// Pagination
const searchText = ref('');
const searchQuery = ref('');
const assetData = ref([]);
const openDropdownId = ref(null);
const dropdownRefs = ref({});
const startDate = ref(null);
const endDate = ref(null);
const categoryItems = ref([]);
const pendingAssetId = ref(null);
const showConfirmDialog = ref(false);
const loading = ref(false);
const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);

const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '500' },
    { name: '1000' }
]);
const limitedPerPage = ref(10); // Default to 10 items per page
const currentPage = ref(1);
const pageSize = ref(10); // Default to 10 items per page
const totalPages = ref(1);
const isLoading = ref(false);
const currentPageIsLastRecord = ref(false);
const branchStore = useBranchStore();


// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

const dateRange = ref();

watch(dateRange, (val) => {
    if (val && val.length === 2) {
        startDate.value = val[0];
        endDate.value = val[1];
    } else {
        startDate.value = null;
        endDate.value = null;
    }
});


// Define the directive inside setup
const vIntersect = {
    mounted(el) {
        el.classList.add('opacity-0', 'translate-y-6', 'transition-all', 'duration-700');

        const observer = new IntersectionObserver(([entry], observer) => {
            if (entry.isIntersecting) {
                el.classList.remove('opacity-0', 'translate-y-6');
                el.classList.add('opacity-100', 'translate-y-0');
                observer.unobserve(el);
            }
        }, {
            threshold: 0.1,
        });

        observer.observe(el);
    }
};



const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    startDate.value = now.startOf('month').format('DD/MM/YYYY');
    endDate.value = now.endOf('month').format('DD/MM/YYYY');
};




// Pagination event handlers
const handleListenIsLastRecordOnPage = (page) => {
    currentPageIsLastRecord.value = page;
    if (currentPage.value > 1 && page) {
        currentPage.value -= 1;
    }
};


const handleListenToPagination = async (items) => {
    assetData.value = items;

};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

// Dropdown reference handler
function setDropdownRef(id) {
    return (el) => {
        if (el) {
            dropdownRefs.value[id] = el;
        } else {
            delete dropdownRefs.value[id];
        }
    };
}

// Handle clicks outside dropdown
function handleClickOutside(event) {
    if (openDropdownId.value) {
        const el = dropdownRefs.value[openDropdownId.value];
        if (el && !el.contains(event.target)) {
            openDropdownId.value = null;
        }
    }
}

// Search functionality
const handleSearch = () => {
    currentPage.value = 1;
    fetchAsset();
};



const clearFilters = () => {
    searchText.value = '';
    setDefaultMonthRange();
    currentPage.value = 1;
    dateRange.value = null;
    startDate.value = null;
    endDate.value = null;
    fetchAsset();
};


// Fetch Categories
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

// Fetch Assets
const fetchAsset = async () => {
    try {
        const dynamicConditions = [
            // {
            //     field: 'branchId',
            //     operator: '==',
            //     value: branchStore.getBranchId
            // }
        ];

        if (startDate.value) {
            const filterStartDate = moment(startDate.value, "DD/MM/YYYY").startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&gte',
                value: filterStartDate,
                type: "Date"
            });
        }

        if (endDate.value) {
            const filterEndDate = moment(endDate.value, "DD/MM/YYYY").endOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&lte',
                value: filterEndDate,
                type: "Date"
            });
        }



        const params = {
            sortField: 'createdAt',
            sortOrder: "desc",
            dynamicConditions: JSON.stringify(dynamicConditions),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        assetData.value = response.data.data || [];
    } catch (error) {
        console.error("Cannot get asset data", error.response?.data || error.message);
    }
};

//Fetch Copy Asset Transactions
const copyAsset = ref([])
const fetchCopyAssetTransactions = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'toBranchId', operator: '==', value: branchStore.getBranchId },
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CopyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        copyAsset.value = response.data.data

    } catch (error) {
        console.error('Error checking transactions:', error);
        return true;
    }
};

// Fetch Purchase Asset
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



// Delete asset
const deleteAsset = (assetId) => {
    pendingAssetId.value = assetId;
    showConfirmDialog.value = true;
};

// Confirm deletion
const handleDeleteConfirmation = async () => {
    try {
        loading.value = true;
        showConfirmDialog.value = false;
        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CompanyAsset/${pendingAssetId.value}`, { headers: API_CONFIGS.headers });

        // Refresh the table data after successful deletion

        successMessage.value = t('Successfully deleted');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => showSuccessMessage.value = false, 800);
    } catch (error) {
        console.error("Error in handleDeleteConfirmation:", error);
        errorMessage.value = t('Failed to delete asset. Please try again.');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
        pendingAssetId.value = null;
    }
};

watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
    fetchAsset();
}, { immediate: true });


watch(selectedRow, (newValue) => {
    pageSize.value = parseInt(newValue.name, 10);
    limitedPerPage.value = pageSize.value;
    currentPage.value = 1;
    fetchAsset();
});


// Initialize on mount
onMounted(async () => {
    try {
        await Promise.all([fetchCategories(), fetchCopyAssetTransactions()]);
        document.addEventListener("click", handleClickOutside);
        await fetchAsset(); // <-- Add this line
    } catch (error) {
        console.error("Failed to initialize component:", error);
    }
    setDefaultMonthRange();

});

// Cleanup on unmount
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const {
    canCreateAsset,
    canViewAsset,
    canUpdateAsset,
    canDeleteAsset,
    canCopyAsset
} = useUserPermission();


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


        <router-link to="/" class="flex items-center space-x-2 text-emerald-600 font-medium p-2 w-1/2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('CompanyAsset') }}</span>
        </router-link>

        <div class="w-full bg-white rounded-2xl shadow-md mt-1 px-5 py-6 space-y-4">

            <!-- Row 1: Search Input -->
            <div class="flex items-end space-x-4 text-start">
                <!-- <div class="flex flex-col flex-auto">
                    <label for="startDate" class="text-xs mb-1 text-gray-600">Start Date</label>
                    <DatePicker v-model="startDate" showIcon fluid iconDisplay="input" inputId="startDate" class="" />
                </div>
                <div class="flex items-center justify-center text-gray-500 mb-4">
                    <i class="fa-solid fa-arrows-left-right text-sm"></i>
                </div>
                <div class="flex flex-col flex-auto">
                    <label for="endDate" class="text-xs mb-1 text-gray-600">End Date</label>
                    <DatePicker v-model="endDate" showIcon fluid iconDisplay="input" inputId="endDate" class="" />
                </div> -->
                <div class="flex items-center space-x-2 w-full">
                    <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon
                        iconDisplay="input" inputId="dateRange" class="w-full" dateFormat="dd/mm/yy"
                        :placeholder="$t('Select Date Range')" :defaultViewDate="defaultViewDate" />
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-filter"></i>
                    </button>
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center space-x-3">
                <input v-model="searchQuery" type="text" :placeholder="$t('Search by Name...')"
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" />
                <!-- <div class="flex items-center space-x-2">
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button>
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div> -->
            </div>

            <!-- Row 2: Action Buttons -->
            <div class="flex items-center justify-between mt-4">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />


                <div class="flex items-center justify-end gap-2">

                    <!-- Copy Button (permission) -->
                    <!-- <router-link v-if="canCopyAsset()" to="/copy-asset-form-mobile"
                        class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Copy Existing">
                        <i class="fa-solid fa-copy text-xl mr-1"></i><span>{{$t('Copy')}}</span>
                    </router-link> -->

                    <!-- Add Button (permission) -->
                    <router-link v-if="canCreateAsset()" to="/create-asset-form-mobile"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Add New">
                        <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>{{ $t('Create') }}</span>
                    </router-link>
                </div>
            </div>
        </div>

        <!-- No Data Message -->
        <div v-if="assetData.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.75 9.75h.008v.008H9.75V9.75zM14.25 9.75h.008v.008h-.008V9.75zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-medium">{{ $t('No items found') }}</p>
            <p class="text-sm text-gray-500">{{ $t('Please check back later or add new data.') }}</p>
        </div>

        <!-- Asset List (permission) -->
        <div v-else-if="canViewAsset()">
            <div v-for="(item, index) in assetData" :key="index" v-intersect
                class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <!-- Asset Info -->
                <div class="space-y-2 text-gray-700 w-full text-left text-xs">
                    <p>
                        <strong class="text-gray-500">ID:</strong>
                        <span class="ml-1 font-semibold text-gray-900">{{ item.idCustom }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Name') }}:</strong>
                        <span class="ml-1">{{ item.name }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Category') }}:</strong>
                        <span class="ml-1"><span v-if="item?.category?.subCategory?.name">
                                {{ item.category.categoryName }} - [{{ item.category.subCategory.name }}]
                            </span>
                            <span v-else>
                                {{ item.category.categoryName }}
                            </span></span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Total Stock') }}:</strong>
                        <span class="ml-1">{{ item.totalStock }}</span>
                    </p>

                    <!-- <p>
                        <strong class="text-gray-500">{{ $t('Purchase Price') }}:</strong>
                        <span class="ml-1">{{ item.purchasePrice }}</span>
                    </p> -->

                    <p>
                        <strong class="text-gray-500">{{ $t('Description') }}:</strong>
                        <span class="ml-1">{{ item.description || 'N/A' }}</span>
                    </p>

                    <p class="flex items-center">
                        <strong class="text-gray-500">{{ $t('Status') }}:</strong>
                        <i :class="getStatusClass(item.status)" class="ml-2 text-lg"></i>
                    </p>

                    <hr class="my-2 h-2" />

                    <div class="gap-1 text-[10px] flex">
                        <p class=" items-center">
                            <strong class="text-gray-500">{{ $t('CreateAt') }}:</strong>
                            <span class="ml-1">
                                <i class="fas fa-calendar text-gray-500"></i>
                                {{ formatDateKhmer(item.createdAt) }}</span>
                        </p>
                        <hr class="h-auto border-l border-gray-300 mx-2" />
                        <p class="items-center">
                            <strong class="text-gray-500">{{ $t('UpdateAt') }}:</strong>
                            <span class="ml-1 my-auto">
                                <i class="fas fa-calendar text-gray-500"></i>
                                {{ formatDateKhmer(item.updatedAt) }}</span>
                        </p>
                    </div>
                </div>

                <!-- Dropdown -->
                <div class="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto" :ref="setDropdownRef(item._id)">
                    <i class="fa-solid fa-ellipsis-vertical text-gray-400 hover:text-emerald-600 p-2 text-lg cursor-pointer"
                        aria-label="Options"
                        @click.stop="openDropdownId = openDropdownId === item._id ? null : item._id" tabindex="0"></i>

                    <div v-if="openDropdownId === item._id"
                        class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <router-link v-if="canUpdateAsset() && item._id" :to="`/create-asset-form-mobile/${item._id}`"
                            @click.stop
                            class="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-emerald-100 transition-colors">
                            <i class="fa-solid fa-pen"></i> {{ $t('Edit') }}
                        </router-link>
                        <button v-if="canDeleteAsset()" @click.stop="deleteAsset(item._id)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-100 w-full">
                            <i class="fa-solid fa-trash"></i> {{ $t('Delete') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination Component -->
        <PaginationTwo v-if="assetData.length > 0" :currentPage="currentPage"
            @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
            @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
            :searchQuery="searchText" />

        <!-- Confirm Delete Dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-6 text-center space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">{{ $t('Confirmation Delete') }}</h2>
                <p class="text-sm text-gray-600">{{ $t('Are you really want to delete this data?') }}</p>
                <div class="flex justify-center gap-4 mt-4">
                    <button @click="showConfirmDialog = false"
                        class="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition">
                        {{ $t('no') }}
                    </button>
                    <button @click="handleDeleteConfirmation"
                        class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition">
                        {{ $t('Yes') }}
                    </button>
                </div>
            </div>
        </div>
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