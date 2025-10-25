<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import TransferDetail from '@/components/StockTransferDetail-Mobile.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import { DatePicker, Select } from 'primevue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const openDropdownId = ref(null);
const dropdownRefs = ref({});

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


const branchStore = useBranchStore();

// States
const isLoading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const tableData = ref([]);
const stockTransferData = ref([]);
const branchesMap = ref({}); // For storing branch ID to name/abbreviation mapping
const selectedTransferId = ref(null);
const showDetailModal = ref(false);
const showDeleteConfirmModal = ref(false);
const pendingDeleteId = ref(null);
const userData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);
const showSuccessMessage = ref(false);
const successMessage = ref('');
const showErrorMessage = ref(false);
const errorMessage = ref('');

// Date filters
const startDate = ref(null);
const endDate = ref(null);

// Row selection
const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '1' },
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '200' },
    { name: '500' },
    { name: '1000' }
]);


const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    startDate.value = now.startOf('month').format('DD/MM/YYYY');
    endDate.value = now.endOf('month').format('DD/MM/YYYY');
};



// Watch for row selection changes
watch(selectedRow, (newVal) => {
    pageSize.value = parseInt(newVal.name, 10);
    currentPage.value = 1; // Reset to first page
    fetchStockTransfer();
});

// Watch for search query changes
watch(searchQuery, (newVal) => {
    searchText.value = newVal;
    currentPage.value = 1; // Reset to first page
    fetchStockTransfer();
}, { debounce: 300 });

// Pagination event handlers
const handleListenToPagination = (items) => {
    if (items && Array.isArray(items)) {
        tableData.value = items;
    }
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}

// Search and filter functions
const handleSearch = () => {
    currentPage.value = 1;
    fetchStockTransfer();
};

const clearFilters = () => {
    searchQuery.value = '';
    startDate.value = null;
    endDate.value = null;
    dateRange.value = null; if (startDate.value) {
        const filterStartDate = moment(startDate.value).startOf('day').tz('UTC').toDate();
        dynamicConditions.push({
            field: 'createdAt',
            operator: '&gte',
            value: filterStartDate,
            type: "Date"
        });
    }
    if (endDate.value) {
        const filterEndDate = moment(endDate.value).endOf('day').tz('UTC').toDate();
        dynamicConditions.push({
            field: 'createdAt',
            operator: '&lte',
            value: filterEndDate,
            type: "Date"
        });
    } if (startDate.value) {
        const filterStartDate = moment(startDate.value).startOf('day').tz('UTC').toDate();
        dynamicConditions.push({
            field: 'createdAt',
            operator: '&gte',
            value: filterStartDate,
            type: "Date"
        });
    }
    if (endDate.value) {
        const filterEndDate = moment(endDate.value).endOf('day').tz('UTC').toDate();
        dynamicConditions.push({
            field: 'createdAt',
            operator: '&lte',
            value: filterEndDate,
            type: "Date"
        });
    }
    formSelectedEmployee.value = null;
    selectAssetData.value = null;
    currentPage.value = 1;
    fetchStockTransfer();
    setDefaultMonthRange()
};




const fetchAsset = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'branchId', operator: '==', value: branchStore.getBranchId },
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        companyAssetData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching company asset data:", error);

    }
};




const fetchUser = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'branchId', operator: '==', value: branchStore.getBranchId },
                { field: 'status', operator: '==', value: true },
                { field: 'mainRole', operator: '!=', value: 'Public User' } // Assuming you want only employees
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        // Add label property for Select

        // console.log("User data response:", response.data.data);
        userData.value = (response.data.data || []).map(user => ({
            ...user,
            label: user.displayName || user.userName || '',
        }));
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};



// Fetch all branches for display
const fetchBranches = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        const branches = response.data.data || [];

        // Create a mapping of branch IDs to abbreviations
        branches.forEach(branch => {
            branchesMap.value[branch._id] = {
                abbreviation: branch.abbreviation || 'Unknown',
                name: branch.name || 'Unknown'
            };
        });

    } catch (error) {
        console.error("Error fetching branches:", error);
    }
};

const fetchStockTransfer = async () => {
    try {
        isLoading.value = true;
        const dynamicConditions = [];
        // Add branch filter if needed (uncomment if you want to filter by branch)
        dynamicConditions.push({
            field: 'fromBranchId',
            operator: '==',
            value: branchStore.getBranchId
        });
        if (formSelectedEmployee.value) {
            dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
        }
        if (selectAssetData.value) {
            dynamicConditions.push({ field: 'assetsTransfer.assetId', operator: '==', value: selectAssetData.value._id });
        }


        if (startDate.value) {
            const filterStartDate = moment(startDate.value).startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&gte',
                value: filterStartDate,
                type: "Date"
            });
        }
        if (endDate.value) {
            const filterEndDate = moment(endDate.value).endOf('day').tz('UTC').toDate();
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
            limit: pageSize.value
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params, headers: API_CONFIGS.headers });
        tableData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching stock transfer data:", error);
    } finally {
        isLoading.value = false;
    }
};

const confirmDeleteStockTransfer = (Id) => {
    pendingDeleteId.value = Id;
    showDeleteConfirmModal.value = true;
};


const deleteStockTransfer = async (Id) => {
    try {
        isLoading.value = true;

        const timestamp = await fetchTimestamp()

        const purchaseHistoryParams = {
            dynamicConditions: JSON.stringify([
                { field: 'stockTransferId', operator: '==', value: Id }
            ])
        };

        const purchaseHistoryResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: purchaseHistoryParams, headers: API_CONFIGS.headers });
        const purchaseHistoryRecords = purchaseHistoryResponse.data.data || [];

        for (const historyRecord of purchaseHistoryRecords) {
            const cuttingStockParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'purchaseAssetHistoryId', operator: '==', value: historyRecord._id },
                    { field: 'type', operator: '==', value: 'transfer' }
                ])
            };

            const cuttingStockResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: cuttingStockParams, headers: API_CONFIGS.headers });
            const cuttingStockRecords = cuttingStockResponse.data.data || [];

            if (cuttingStockRecords.length > 0) {
                for (const cuttingStockRecord of cuttingStockRecords) {
                    await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cuttingStockRecord._id}`, { headers: API_CONFIGS.headers });
                }
            }

            await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyRecord._id}`, { headers: API_CONFIGS.headers });
        }

        const allPurchaseHistoryResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { headers: API_CONFIGS.headers });
        const allPurchaseHistoryRecords = allPurchaseHistoryResponse.data.data || [];

        const purchaseHistoryWithCuttingStock = allPurchaseHistoryRecords.filter(record =>
            record.cuttingStockIds && record.cuttingStockIds.includes(Id)
        );

        for (const historyRecord of purchaseHistoryWithCuttingStock) {
            const cuttingStockParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'purchaseAssetHistoryId', operator: '==', value: historyRecord._id },
                    { field: 'type', operator: '==', value: 'transfer' }
                ])
            };

            const cuttingStockResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: cuttingStockParams, headers: API_CONFIGS.headers });
            const cuttingStockRecords = cuttingStockResponse.data.data || [];

            if (cuttingStockRecords.length > 0) {
                for (const cuttingStockRecord of cuttingStockRecords) {
                    await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cuttingStockRecord._id}`, { headers: API_CONFIGS.headers });
                }
            }

            await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyRecord._id}`, { headers: API_CONFIGS.headers });
        }

        const directCuttingStockParams = {
            dynamicConditions: JSON.stringify([
                { field: 'ref', operator: '==', value: Id },
                { field: 'type', operator: '==', value: 'transfer' }
            ])
        };

        const directCuttingStockResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: directCuttingStockParams, headers: API_CONFIGS.headers });
        const directCuttingStockRecords = directCuttingStockResponse.data.data || [];

        if (directCuttingStockRecords.length > 0) {
            for (const cuttingStockRecord of directCuttingStockRecords) {
                await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cuttingStockRecord._id}`, { headers: API_CONFIGS.headers });
            }
        }

        const stockTransferParams = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: Id }
            ])
        };

        const stockTransferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params: stockTransferParams, headers: API_CONFIGS.headers });
        const stockTransferRecord = stockTransferResponse.data.data?.[0];

        if (stockTransferRecord && stockTransferRecord.assetsTransfer) {
            for (const assetTransfer of stockTransferRecord.assetsTransfer) {
                // Step 1: Find and update source asset (from branch)
                const sourceAssetParams = {
                    dynamicConditions: JSON.stringify([
                        { field: '_id', operator: '==', value: assetTransfer.assetId },
                        { field: 'branchId', operator: '==', value: stockTransferRecord.fromBranchId }
                    ])
                };

                const sourceAssetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params: sourceAssetParams, headers: API_CONFIGS.headers });
                const sourceAsset = sourceAssetResponse.data.data?.[0];

                if (sourceAsset) {
                    if (sourceAsset.stockTransferId && sourceAsset.stockTransferId.includes(Id)) {
                        const newTotalStock = sourceAsset.totalStock + parseInt(assetTransfer.qty || 0);
                        const updatedStockTransferIds = sourceAsset.stockTransferId.filter(id => id !== Id);

                        await axios.patch(
                            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${sourceAsset._id}`,
                            {
                                fields: {
                                    totalStock: newTotalStock,
                                    stockTransferId: updatedStockTransferIds,
                                    updatedAt: timestamp,
                                    updatedBy: branchStore.userId
                                }
                            },
                            { headers: API_CONFIGS.headers }
                        );
                    }
                }

                // Find all related assets in destination branch that match any of these conditions
                const relatedAssetsParams = {
                    dynamicConditions: JSON.stringify([
                        {
                            orConditions: [
                                { field: 'mainTransferId', operator: '==', value: assetTransfer.assetId },
                                { field: '_id', operator: '==', value: assetTransfer.assetId },
                                { field: 'stockTransferId', operator: 'arrayContains', value: Id }
                            ]
                        },
                        { field: 'branchId', operator: '==', value: stockTransferRecord.toBranchId }
                    ])
                };

                const relatedAssetsResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params: relatedAssetsParams, headers: API_CONFIGS.headers });
                const relatedAssets = relatedAssetsResponse.data.data || [];

                if (relatedAssets.length > 0) {
                    for (const destAsset of relatedAssets) {
                        if (destAsset.stockTransferId && destAsset.stockTransferId.includes(Id)) {
                            const newTotalStock = destAsset.totalStock - parseInt(assetTransfer.qty || 0);
                            const updatedStockTransferIds = destAsset.stockTransferId.filter(id => id !== Id);

                            await axios.patch(
                                `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${destAsset._id}`,
                                {
                                    fields: {
                                        totalStock: Math.max(0, newTotalStock),
                                        stockTransferId: updatedStockTransferIds,
                                        updatedAt: timestamp,
                                        updatedBy: branchStore.userId
                                    }
                                },
                                { headers: API_CONFIGS.headers }
                            );
                        }
                    }

                    // Clean up related purchase history records
                    for (const destAsset of relatedAssets) {
                        const destHistoryParams = {
                            dynamicConditions: JSON.stringify([
                                { field: 'asset.assetId', operator: '==', value: destAsset._id },
                                { field: 'branchId', operator: '==', value: stockTransferRecord.toBranchId },
                                { field: 'stockTransferId', operator: '==', value: Id }
                            ])
                        };

                        const destHistoryResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
                            { params: destHistoryParams, headers: API_CONFIGS.headers }
                        );
                        const destHistoryRecords = destHistoryResponse.data.data || [];

                        for (const historyRecord of destHistoryRecords) {
                            await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
                                { headers: API_CONFIGS.headers }
                            );
                        }
                    }
                }
            }
        }

        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/StockTransfer/${Id}`, { headers: API_CONFIGS.headers });

        if (response.status === 200) {
            stockTransferData.value = stockTransferData.value.filter(item => item._id !== Id);
            showDeleteConfirmModal.value = false;
            pendingDeleteId.value = null;
            // Emit socket event for real-time delete
            // (You may need to add socket logic if not present)
            // socket.emit('dataUpdate', { collection: 'StockTransfer', action: 'delete', data: response.data.data?._id });
            // Show success message
            successMessage.value = t('Stock transfer deleted successfully!');
            showSuccessMessage.value = true;

            // Hide success message after 3 seconds
            setTimeout(() => {
                showSuccessMessage.value = false;
            }, 3000);
            fetchStockTransfer();
        }

    } catch (error) {
        console.error("Error deleting stock transfer:", error);
        // Show error message with details
        errorMessage.value = error.response?.data?.message || error.message || t('An error occurred while deleting.');
        showErrorMessage.value = true;

        setTimeout(() => {
            showErrorMessage.value = false;
        }, 4000);
    } finally {
        isLoading.value = false;
    }
}


//show detail
function ShowDetail() {
    showDetailModal.value = true;
}

const {
    canCreateTransferStock,
    canViewTransferStock,
    canDeleteTransferStock
} = useUserPermission();

onMounted(async () => {
    await fetchBranches();
    await fetchStockTransfer(); // Add this call
    fetchAsset();
    fetchUser();
    document.addEventListener('click', handleClickOutside);
    setDefaultMonthRange()
});

// Cleanup on unmount
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

</script>

<template>
    <div>
        <!-- Success Message -->
        <transition name="fade">
            <div v-if="showSuccessMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-green-600 rounded shadow-lg"
                role="alert">
                <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-check-circle text-lg"></i>
                    <span class="font-medium">{{ successMessage }}</span>
                </div>
            </div>
        </transition>

        <!-- Error Message -->
        <transition name="fade">
            <div v-if="showErrorMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4 py-3 text-sm text-white bg-red-600 rounded shadow-lg"
                role="alert">
                <div class="flex items-start space-x-2">
                    <i class="fa-solid fa-exclamation-triangle text-lg mt-0.5 flex-shrink-0"></i>
                    <div class="flex-1">
                        <p class="font-semibold mb-1">Delete Failed!</p>
                        <p class="text-xs leading-relaxed">{{ errorMessage }}</p>
                    </div>
                </div>
            </div>
        </transition>

        <router-link to="/" class="flex items-center space-x-2 text-emerald-600 font-medium p-2 w-1/2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Stock transfer') }}</span>
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

            <!-- <div class="flex items-center gap-1 justify-between">
                 <input v-model="searchQuery" type="text" placeholder="Search by Name..."
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" />
                <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                    placeholder="Employee" class="" :filter="true" />


                <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name" placeholder="Asset"
                    class="" filter />
                <div class="flex items-center space-x-2">
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button> 
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button> 
               </div>
            </div> -->

            <div class="text-start">
                <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                    :placeholder="$t('Select Employee')" class="w-full" :filter="true" />
            </div>

            <div class="text-start">
                <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name"
                    :placeholder="$t('Select Asset')" class="w-full" filter />
            </div>

            <!-- Row 2: Action Buttons -->
            <div class="flex items-center justify-between mt-4">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <div class="flex items-center justify-end gap-2">
                    <!-- <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button> -->
                    <!-- Add Button -->
                    <router-link v-if="canCreateTransferStock()" to="/create-stock-transfer-from-mobile"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Add New">
                        <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>{{ $t('Create') }}</span>
                    </router-link>
                </div>
            </div>
        </div>



        <!-- Stock Transfer Items -->
        <div v-if="canViewTransferStock() && tableData.length > 0" class="space-y-4 mt-5">
            <!-- Loading state -->
            <div v-if="isLoading" class="mt-5 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p class="text-gray-500 mt-2">{{ $t('Loading...') }}</p>
            </div>
            <div v-for="(item, index) in tableData" :key="item._id || index" v-intersect
                class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex justify-between items-start gap-4">

                <div class="space-y-2 text-gray-700 w-full text-start text-xs">
                    <p>
                        <strong class="text-gray-500">ID:</strong>
                        <span class="font-medium text-gray-900 ml-1">{{ index + 1 }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('From') }}:</strong>
                        <span class="ml-1">
                            {{ branchesMap[item.fromBranchId]?.abbreviation }}
                        </span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Name') }}:</strong>
                        <span class="ml-1"> {{item.assetsTransfer?.map(asset => asset.assetName).join(', ') ||
                            'N/A'}}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Quantity') }}:</strong>
                        <span class="ml-1"> {{item.assetsTransfer?.reduce((sum, asset) => sum + (parseInt(asset.qty) ||
                            0),
                            0) || 0}}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('To') }}:</strong>
                        <span class="ml-1"> {{ branchesMap[item.toBranchId]?.abbreviation }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Description') }}:</strong>
                        <span class="ml-1"> {{ item.description || 'N/A' }}</span>
                    </p>

                    <hr class="my-2 h-2" />

                    <p class=" items-center">
                        <strong class="text-gray-500">{{ $t('CreateAt') }}:</strong>
                        <span class="ml-1">
                            <i class="fas fa-calendar text-gray-500"></i>
                            {{ formatDateKhmer(item.createdAt) }}</span>
                    </p>

                </div>

                <div class="relative min-w-[32px]" :ref="setDropdownRef(item._id)">
                    <i class="fa-solid fa-ellipsis-vertical cursor-pointer text-gray-500 hover:text-emerald-600 p-2 text-lg"
                        aria-label="Options menu"
                        @click.stop="openDropdownId = openDropdownId === item._id ? null : item._id" tabindex="0"></i>

                    <div v-if="openDropdownId === item._id"
                        class="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-xl z-50 transition-all duration-200">
                        <!-- <RouterLink :to="`/stock-transfer-detail-mobile/${item._id}`"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-left text-blue-700 hover:bg-purple-100 transition-colors">
                            <i class="fa-solid fa-eye"></i> View
                        </RouterLink> -->
                        <button v-if="canDeleteTransferStock()" @click="confirmDeleteStockTransfer(item._id)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-100 w-full transition-colors">
                            <i class="fa-solid fa-trash"></i> {{ $t("Delete") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- No data message -->
        <div v-else-if="!isLoading" class="mt-5 text-center">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <i class="fa-solid fa-inbox text-gray-400 text-2xl mb-3"></i>
                <h3 class="text-gray-600 font-semibold mb-2">{{ $t('No Stock Transfers') }}</h3>
                <!-- <p class="text-gray-500 text-sm">No stock transfer records found.</p> -->
            </div>
        </div>

        <TransferDetail v-if="showDetailModal" :transferId="selectedTransferId" @close="showDetailModal = false" />

        <!-- Delete Confirmation Modal -->
        <div v-if="showDeleteConfirmModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div class="bg-white p-4 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <div class="flex items-center mb-3">
                    <i class="fa-solid fa-exclamation-triangle text-red-500 text-xl mr-2"></i>
                    <h3 class="text-base font-semibold text-gray-900">{{ $t('Confirmation Delete') }}</h3>
                </div>
                <p class="text-gray-700 mb-4 text-sm">
                    {{ $t('Are you sure you want to delete this stock transfer?') }}
                </p>
                <div class="flex justify-end space-x-2">
                    <button @click="showDeleteConfirmModal = false; pendingDeleteId = null"
                        class="px-3 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors text-sm">
                        {{ $t('Cancel') }}
                    </button>
                    <button @click="deleteStockTransfer(pendingDeleteId)"
                        class="px-3 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors text-sm">
                        {{ $t('Delete') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <PaginationTwo v-if="tableData.length > 0" :currentPage="currentPage"
            @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
            @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
            :searchQuery="searchText" />

    </div>
</template>