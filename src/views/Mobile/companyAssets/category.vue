<script setup>
import API_CONFIGS from '@/api/config';
import getStatusClass from '@/components/GetStatusClass.vue';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket'; // Make sure this path is correct
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n()

// Store and user/branch data
const branchStore = useBranchStore();
const userId = ref(branchStore.getUserId);
const branchId = ref(branchStore.getBranchId);

// State variables
const searchText = ref('');
const searchQuery = ref('');
const categoryItems = ref([]);
const showConfirmDialog = ref(false);
const pendingCategoryId = ref(null);
const loading = ref(false);
const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);
const startDate = ref(null);
const endDate = ref(null);
const isLoading = ref(false);
const totalPages = ref(1);
const limitedPerPage = ref(10); // Default to 10 items per page
const currentPage = ref(1);
const pageSize = ref(10); // Default to 10 items per page
const paginationKey = ref(0);
const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '500' },
    { name: '1000' }
]);


const currentPageIsLastRecord = ref(false); // Track if current page is last record
const openDropdownId = ref(null);
const dropdownRefs = ref({}); // Store refs for dropdowns
const dateRange = ref(null);

watch(dateRange, (newVal) => {
    if (Array.isArray(newVal) && newVal.length === 2) {
        startDate.value = newVal[0];
        endDate.value = newVal[1];
    } else {
        startDate.value = null;
        endDate.value = null;
    }
});

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

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




const items = ref([
    { label: '10', value: 10 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1000', value: 1000 },
]);

// Pagination event handlers
const handleListenIsLastRecordOnPage = (page) => {
    currentPageIsLastRecord.value = page;
    if (currentPage.value > 1 && page) {
        currentPage.value -= 1;
        fetchCategories();
    }
};

const handleListenToPagination = async (items) => {
    categoryItems.value = items;

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


const handleSearch = () => {
    currentPage.value = 1;
    searchText.value = searchQuery.value;
    fetchCategories();
};


const clearFilters = () => {
    searchText.value = '';
    searchQuery.value = '';
    currentPage.value = 1;
    startDate.value = null;
    endDate.value = null;
    dateRange.value = null;

    fetchCategories();
};

// Fetch categories with pagination and search
const fetchCategories = async () => {
    try {
        isLoading.value = true;
        categoryItems.value = [];

        // Build dynamic conditions for date filtering
        const dynamicConditions = [];

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
            dynamicConditions: JSON.stringify(dynamicConditions),

        };


        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Category`, { params, headers: API_CONFIGS.headers });


        categoryItems.value = response.data.data;

    } catch (error) {
        console.error("Error fetching categories:", error);
        errorMessage.value = t('Failed to fetch categories.');
        showErrorMessage.value = true;
        // errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        isLoading.value = false;
    }
}

// Delete category
const deleteCategory = (categoryId) => {
    pendingCategoryId.value = categoryId;
    showConfirmDialog.value = true;
};

// Confirm deletion
const handleDeleteConfirmation = async () => {
    try {
        loading.value = true;
        showConfirmDialog.value = false;
        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/Category/${pendingCategoryId.value}`, { headers: API_CONFIGS.headers });

        successMessage.value = t('Successfully deleted');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => showSuccessMessage.value = false, 800);
    } catch (error) {
        console.error("Error in handleDeleteConfirmation:", error);
        errorMessage.value = t('Failed to delete category. Please try again.');
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
        pendingCategoryId.value = null;
    }
};




const setupSocketListeners = () => {
    socket.off('dataUpdate');
    socket.on('dataUpdate', async (data) => {
        if (data.collection === 'Category') {
            await fetchCategories(); // Refresh data on insert, update, delete
        }
    });
};

// Initialize on mount
onMounted(async () => {
    document.addEventListener('click', handleClickOutside);
    setDefaultMonthRange();
    setupSocketListeners(); // Add this line
});

// Cleanup on unmount
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    socket.off('dataUpdate'); // Remove socket listener
});

// Watch for changes and refetch categories
watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
    fetchCategories();
}, { immediate: true });

watch(selectedRow, (newValue) => {
    pageSize.value = parseInt(newValue.name, 10);
    limitedPerPage.value = pageSize.value;
    currentPage.value = 1;
});


const {
    canCreateCategory,
    canViewCategory,
    canUpdateCategory,
    canDeleteCategory
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

        <!-- Back Link -->
        <router-link to="/" class="flex items-center space-x-2 text-emerald-600 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Category') }}</span>
        </router-link>

        <!-- Filters and Controls -->
        <div class="w-full rounded-2xl shadow-md mt-1 bg-white px-4 py-6 space-y-5">
            <!-- Date Range (in 1 row) -->
            <div class="flex items-end justify-between space-x-2 text-start">
                <!-- <div class="flex flex-col flex-1">
                    <label for="startDate" class="text-xs mb-1 text-gray-600">Start Date</label>
                    <DatePicker v-model="startDate" showIcon fluid iconDisplay="input" inputId="startDate" class="" />
                </div>
                <div class="text-gray-500 pb-5">
                    <i class="fa-solid fa-arrows-left-right text-sm"></i>
                </div>
                <div class="flex flex-col flex-1">
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

            <!-- Search Input and Buttons -->
            <div class="flex items-center space-x-3">
                <input v-model="searchQuery" type="text" :placeholder="$t('Search by Name...')"
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" />

                <!-- <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                    <i class="fa-solid fa-filter"></i>
                </button> -->

                <!-- <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                    <i class="fa-solid fa-xmark"></i>
                </button> -->
            </div>

            <!-- Select + Add Button in 1 row, spaced between -->
            <div class="flex items-center justify-between space-x-3">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <router-link v-if="canCreateCategory()" to="/create-category-form-mobile" title="Add Category"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md flex items-center justify-center transition-all duration-300">
                    <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>{{ $t('Create') }}</span>
                </router-link>
            </div>
        </div>



        <!-- No Data Message -->
        <div v-if="categoryItems.length === 0" class="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.75 9.75h.008v.008H9.75V9.75zM14.25 9.75h.008v.008h-.008V9.75zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-medium">{{ $t('No data!') }}</p>
            <p class="text-sm text-gray-500">{{ $t("Please check back later or add new data.") }}</p>
        </div>


        <!-- Category List (permission) -->
        <div v-else-if="canViewCategory()">
            <div v-for="category in categoryItems" :key="category._id" v-intersect
                class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <!-- Info Section -->
                <div class="space-y-2 text-gray-700 w-full text-left text-xs">
                    <p class="">
                        <strong class="text-gray-500">{{ $t('Name') }}:</strong>
                        <span class="font-medium text-gray-900 ml-1">{{ category.name }}</span>
                    </p>

                    <p class="">
                        <strong class="text-gray-500">{{ $t('SubCategory') }}:</strong>
                        <span class="ml-1">
                            {{
                                category.subCategory && category.subCategory.length > 0
                                    ? category.subCategory.map(sub => sub.name).slice(0, 3).join(", ")
                            : "N/A"
                            }}
                        </span>
                    </p>

                    <p class="">
                        <strong class="text-gray-500">{{ $t('Description') }}:</strong>
                        <span class="ml-1">{{ category.description || "N/A" }}</span>
                    </p>

                    <p class="flex items-center ">
                        <strong class="text-gray-500">{{ $t('Status') }}:</strong>
                        <i :class="getStatusClass(category.status)" class="ml-2 text-lg" aria-hidden="true"></i>
                    </p>

                    <hr class="my-2 h-2" />

                    <div class="flex justify-between text-[10px] ">
                        <p class="flex">
                            <strong class="text-gray-500">{{ $t('CreateAt') }}:</strong>
                            <span class="ml-1 flex gap-1">
                                <i class="fas fa-calendar text-gray-500  my-auto"></i>
                                {{ formatDateKhmer(category.createdAt) }}
                            </span>
                        </p>
                        <p class="flex">
                            <strong class="text-gray-500">{{ $t('UpdateAt') }}:</strong>
                            <span class="ml-1 flex gap-1 my-auto">
                                <i class="fas fa-calendar text-gray-500  my-auto"></i>
                                {{ formatDateKhmer(category.updatedAt) }}
                            </span>
                        </p>
                    </div>


                </div>

                <!-- Dropdown Menu (Top Right) -->
                <div class="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto"
                    :ref="setDropdownRef(category._id)">
                    <i class="fa-solid fa-ellipsis-vertical cursor-pointer text-gray-400 hover:text-emerald-500 p-2 text-lg"
                        aria-label="Options menu"
                        @click.stop="openDropdownId = openDropdownId === category._id ? null : category._id"
                        tabindex="0"></i>

                    <div v-if="openDropdownId === category._id"
                        class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <router-link v-if="canUpdateCategory()" :to="`/create-category-form-mobile/${category._id}`"
                            @click.stop
                            class="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-purple-100">
                            <i class="fa-solid fa-pen"></i> {{ $t('Edit') }}
                        </router-link>
                        <button v-if="canDeleteCategory()" @click.stop="deleteCategory(category._id)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-100 w-full text-left">
                            <i class="fa-solid fa-trash"></i> {{ $t('Delete') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination Component -->
        <PaginationTwo v-if="categoryItems.length > 0"  :currentPage="currentPage"
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