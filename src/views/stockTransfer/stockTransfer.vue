<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import StockTransferForm from '@/components/StockTransferForm.vue';
import TransferDetail from '@/components/TransferStockDetail.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import { useAssetDropdown } from '@/composable/useAssetData';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import Select from 'primevue/select';
import { onMounted, ref, watch } from 'vue';
import ErrorMessage from '../../components/ErrorMessage.vue';
import SuccessMessage from '../../components/SuccessMessage.vue';
import StockTransferMobileScreen from '../Mobile/transactionAssets/StockTransfer.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()



const {
    isAssetSearchOpen,
    filteredAssets,
    fetchAssets,
    handleAssetClickOutside,
    searchInputAsset,
    selectedAsset,
    assetSearchInputRef,
    getAssetName,
    toggleAssetSearch,
    updateFilteredAssets,
    selectAsset,
} = useAssetDropdown(API_CONFIGS.BASE_URL);

const branchStore = useBranchStore();

// States
const showTransferModal = ref(false);
const showDetailModal = ref(false);
const showDeleteConfirmModal = ref(false);
const pendingDeleteId = ref(null);
const isLoading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const tableData = ref([]);

// Table data will be filtered by backend, not computed property
const stockTransferData = ref([]);
const branchesMap = ref({}); // For storing branch ID to name/abbreviation mapping
const selectedTransferId = ref(null);
const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);
// Add paginationKey for refresh
const paginationKey = ref(0);
const userData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);


// Row selection
const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '200' },
    { name: '500' },
    { name: '1000' }
]);

// Watch for row selection changes
watch(selectedRow, (newVal) => {
    pageSize.value = parseInt(newVal.name);
    currentPage.value = 1; // Reset to first page
    fetchStockTransfer();
});

// Watch for search query changes
watch(searchQuery, (newVal) => {
    searchText.value = newVal;
    currentPage.value = 1; // Reset to first page
    fetchStockTransfer();
}, { debounce: 300 });

// Show modal functions
function showModal() {
    showTransferModal.value = true;
}

function ShowDetail(id) {
    showDetailModal.value = true;
    selectedTransferId.value = id;
}

// Function to refresh pagination
const refreshPagination = () => {
    paginationKey.value++;
};

// Pagination event handlers
const handleListenToPagination = (items) => {
    tableData.value = items;
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}

const handleSearch = () => {
    fetchStockTransfer();
};

const clearFilter = () => {
    formSelectedEmployee.value = null;
    selectAssetData.value = null;
    fetchStockTransfer();
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
        // Build dynamic conditions for backend filtering
        const dynamicConditions = [
            { field: 'fromBranchId', operator: '==', value: branchStore.getBranchId }
        ];
        if (formSelectedEmployee.value) {
            dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
        }
        if (selectAssetData.value) {
            dynamicConditions.push({ field: 'assetsTransfer.assetId', operator: '==', value: selectAssetData.value._id });
        }
        const params = {
            populate: JSON.stringify(['createdBy']),
            dynamicConditions: JSON.stringify(dynamicConditions),
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

        // First, get the stock transfer record to check destination branch
        const stockTransferCheckParams = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: Id }
            ])
        };

        const stockTransferCheckResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params: stockTransferCheckParams, headers: API_CONFIGS.headers });
        const stockTransferToCheck = stockTransferCheckResponse.data.data?.[0];

        if (stockTransferToCheck && stockTransferToCheck.assetsTransfer) {
            // Check each transferred asset
            for (const assetTransfer of stockTransferToCheck.assetsTransfer) {
                // Check if destination branch has transferred this asset to other branches
                const forwardTransfersParams = {
                    dynamicConditions: JSON.stringify([
                        { field: 'fromBranchId', operator: '==', value: stockTransferToCheck.toBranchId },
                        { field: 'assetsTransfer.assetId', operator: '==', value: assetTransfer.assetId }
                    ])
                };
                const forwardTransfersResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params: forwardTransfersParams, headers: API_CONFIGS.headers });
                const hasForwardTransfers = forwardTransfersResponse.data.data?.length > 0;

                // Check if destination branch has active transactions with this asset
                const activeTransactionsParams = {
                    dynamicConditions: JSON.stringify([
                        { field: 'asset.assetId', operator: '==', value: assetTransfer.assetId },
                        { field: 'branchId', operator: '==', value: stockTransferToCheck.toBranchId },
                        { field: 'status', operator: '==', value: true }
                    ])
                };
                const activeTransactionsResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: activeTransactionsParams, headers: API_CONFIGS.headers });
                const hasActiveTransactions = activeTransactionsResponse.data.data?.length > 0;

                if (hasForwardTransfers || hasActiveTransactions) {
                    showErrorMessage.value = true;
                    errorMessage.value = 'Cannot delete this transfer. The destination branch has already transferred some assets to other branches or has active transactions.';
                    isLoading.value = false;
                    showDeleteConfirmModal.value = false;
                    pendingDeleteId.value = null;
                    return;
                }
            }
        }

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
                    // First, verify if this transfer ID is still in the stockTransferId array
                    // Only update stock if we haven't processed this transfer deletion yet
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
                    } else {
                        console.log(`Transfer ${Id} already processed for source asset ${sourceAsset._id}`);
                    }


                    const sourceHistoryParams = {
                        dynamicConditions: JSON.stringify([
                            { field: 'asset.assetId', operator: '==', value: assetTransfer.assetId },
                            { field: 'branchId', operator: '==', value: stockTransferRecord.fromBranchId }
                        ])
                    };

                    const sourceHistoryResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: sourceHistoryParams, headers: API_CONFIGS.headers });
                    const sourceHistoryRecords = sourceHistoryResponse.data.data || [];


                    for (const historyRecord of sourceHistoryRecords) {
                        const cuttingStockParams = {
                            dynamicConditions: JSON.stringify([
                                { field: 'purchaseAssetHistoryId', operator: '==', value: historyRecord._id },
                                { field: 'type', operator: '==', value: 'transfer' },
                                { field: 'branchId', operator: '==', value: stockTransferRecord.fromBranchId }
                            ])
                        };
                        const cuttingStockResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: cuttingStockParams, headers: API_CONFIGS.headers });
                        const cuttingStockRecords = cuttingStockResponse.data.data || [];

                        const deletedCuttingStockIds = [];
                        for (const cs of cuttingStockRecords) {
                            await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cs._id}`, { headers: API_CONFIGS.headers });
                            deletedCuttingStockIds.push(cs._id);
                        }

                        const updatedCuttingStockIds = (historyRecord.cuttingStockIds || []).filter(id => !deletedCuttingStockIds.includes(id));

                        await axios.patch(
                            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
                            {
                                fields: {
                                    cuttingStockIds: updatedCuttingStockIds,
                                    status: false, // Set back to in stock
                                    updatedAt: timestamp,
                                    updatedBy: branchStore.userId
                                }
                            },
                            { headers: API_CONFIGS.headers }
                        );

                    }
                } else {
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

                // Use the first found asset as the main destination asset for stock calculations
                const destAsset = relatedAssets[0];

                if (relatedAssets.length > 0) {
                    // Only update stock and IDs if the asset is still being used
                    for (const destAsset of relatedAssets) {
                        if (destAsset.stockTransferId && destAsset.stockTransferId.includes(Id)) {
                            const newTotalStock = destAsset.totalStock - parseInt(assetTransfer.qty || 0);
                            // Remove this transfer ID from the asset's stockTransferId array
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
                        } else {
                            console.log(`Transfer ${Id} already processed for destination asset ${destAsset._id}`);
                        }
                    }

                    // For safety, still check other transactions
                    const otherTransactionsParams = {
                        dynamicConditions: JSON.stringify([
                            { field: 'asset.assetId', operator: '==', value: destAsset._id },
                            { field: 'branchId', operator: '==', value: stockTransferRecord.toBranchId },
                            { field: 'stockTransferId', operator: '!=', value: Id }
                        ])
                    };

                    const otherTransactionsResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
                        { params: otherTransactionsParams, headers: API_CONFIGS.headers }
                    );
                    const hasOtherTransactions = otherTransactionsResponse.data.data?.length > 0;

                    // Check if this asset has been transferred to other branches
                    const otherTransfersParams = {
                        dynamicConditions: JSON.stringify([
                            { field: 'fromBranchId', operator: '==', value: stockTransferRecord.toBranchId },
                            { field: 'assetsTransfer.assetId', operator: '==', value: destAsset._id }
                        ])
                    };

                    const otherTransfersResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`,
                        { params: otherTransfersParams, headers: API_CONFIGS.headers }
                    );
                    const hasOtherTransfers = otherTransfersResponse.data.data?.length > 0;

                    // Only update stock and IDs if the asset is still being used
                    if (destAsset.stockTransferId && destAsset.stockTransferId.includes(Id)) {
                        const newTotalStock = destAsset.totalStock - parseInt(assetTransfer.qty || 0);
                        // Remove this transfer ID from the asset's stockTransferId array
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
                    } else {
                        console.log(`Transfer ${Id} already processed for destination asset ${destAsset._id}`);
                    }

                    // Clean up related purchase history records
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

                    // Delete destination purchase history records
                    for (const historyRecord of destHistoryRecords) {
                        await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
                            { headers: API_CONFIGS.headers }
                        );
                    }
                } else {
                }
            }
        }

        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/StockTransfer/${Id}`, { headers: API_CONFIGS.headers });

        if (response.status === 200) {
            stockTransferData.value = stockTransferData.value.filter(item => item._id !== Id);
            showDeleteConfirmModal.value = false;
            pendingDeleteId.value = null;

            // Emit socket event for real-time delete
            // socket.emit('dataUpdate', { collection: 'StockTransfer', action: 'delete', data: response.data.data?._id });
            refreshPagination();
        }

    } catch (error) {
        console.error("Error deleting stock transfer:", error);
    } finally {
        isLoading.value = false;
    }
}


const setupSocketListeners = () => {
    socket.off("dataUpdate");
    socket.on("dataUpdate", async (data) => {
        if (data.collection === "StockTransfer") {
            // Optionally check action: data.action === 'insert' | 'update' | 'delete'
            await fetchStockTransfer()
        }
    });
};


onMounted(() => {
    fetchBranches();
    fetchUser();
    fetchAsset();
    setupSocketListeners();
});

function handleCreated() {
    showTransferModal.value = false;
    currentPage.value = 1; // <-- refresh the data
    refreshPagination();
}

watch(showTransferModal, (newVal, oldVal) => {
    if (oldVal && !newVal) {
        fetchStockTransfer();
        refreshPagination();
    }
});

</script>

<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">{{$t('Stock Transfer')}}</p>
        <div class="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 text-left">
            <!-- Dropdown ជួរ -->
            <div class="card flex justify-start mt-4 gap-4 mb-4">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <div class="text-left w-full md:w-60 flex gap-4">
                    <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                        :placeholder="$t('Employee')" class="w-full" :filter="true" />


                    <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name"
                        :placeholder="$t('Select transaction')" class="w-full" filter />


                    <div class="flex  gap-4">
                        <button @click="clearFilter"
                            class=" my-auto bg-gradient-to-br from-red-400 to-red-700 text-white px-4 py-2 rounded-md hover:from-red-500 hover:to-red-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50">{{$t('Clear')}}</button>
                        <button @click="handleSearch"
                            class="my-auto bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">{{$t('Show')}}</button>
                    </div>

                </div>

            </div>


            <!-- Date -->
            <!-- <div class="text-left gap-4 bg-white">
                <div class="flex flex-col w-full">
                    <span class="w-auto text-sm text-gray-700">Date Range៖</span>
                    <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon
                        iconDisplay="input" inputId="dateRange" class="w-full" dateFormat="dd/mm/yy"
                        placeholder="Select date range" :defaultViewDate="defaultViewDate" />
                </div>
            </div> -->

            <!-- Search Input -->
            <!-- <div class="relative w-full md:w-auto lg:w-48 xl:w-60 flex items-center mr-3">
                <div class="relative w-full">
                    <input v-model="searchQuery" type="text" placeholder="Search by Name..."
                        class="p-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-400 outline-none pl-3 pr-10 hover:border-emerald-500">
                    <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </span>
                </div>
            </div> -->

            <!--  Transfer Button -->
            <button class="bg-gradient-to-br from-green-400 to-green-700 text-white px-4 py-2 rounded-md 
              hover:from-green-500 hover:to-green-600 text-xs transition-all duration-300 shadow-md 
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                @click="showModal">
                + {{$t('Create New')}}
            </button>
        </div>



        <!-- Table -->
        <div class="overflow-x-auto mt-3 relative">
            <!-- Loading indicator -->
            <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>

            <table class="min-w-full border-collapse border border-gray-400 p-2" :class="{ 'opacity-50': isLoading }">
                <thead class="bg-gray-100 text-xs">
                    <tr>
                        <th class="border border-gray-300 p-2">{{$t('ID')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Created By')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('From Branch')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Name')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Quantity')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('To Branch')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('CreateAt')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Description')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Actions')}}</th>
                    </tr>
                </thead>
                <tbody v-if="tableData.length > 0" class="text-sm hover:bg-green-100 transition-colors duration-200">
                    <tr v-for="(item, index) in tableData" :key="item._id || index">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">
                            {{ item.createdBy?.displayName || item.createdBy || 'N/A' }}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{ branchesMap[item.fromBranchId]?.abbreviation }}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{item.assetsTransfer?.map(asset => asset.assetName).join(', ') || 'N/A'}}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{item.assetsTransfer?.reduce((sum, asset) => sum + (parseInt(asset.qty) || 0), 0) || 0}}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{ branchesMap[item.toBranchId]?.abbreviation }}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{ formatDateKhmer(item.createdAt) }}
                        </td>
                        <td class="border border-gray-300 p-2">
                            {{ item.description || 'N/A' }}
                        </td>
                        <td class="flex text-center justify-center p-2 mt-1">
                            <!-- <i class="fa-solid fa-eye cursor-pointer text-orange-500 mr-2 hover:text-orange-600 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="ShowDetail(item._id)"></i> -->
                            <i @click="confirmDeleteStockTransfer(item._id)"
                                class="fa-solid fa-trash cursor-pointer text-red-600 ml-2 hover:text-red-700 hover:scale-125 transform transition duration-150 ease-in-out"></i>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500 ">
                        <td colspan="10" class="font-khmer text-center text-lg">
                            {{$t('No data found!')}}
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Pagination Component - Pass the appropriate props -->
            <PaginationTwo :key="paginationKey" :currentPage="currentPage"
                @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
                @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
                :searchQuery="searchText" />
        </div>
    </div>

    <!-- Modals -->
    <StockTransferForm v-if="showTransferModal" @close="showTransferModal = false" @created="handleCreated" />
    <TransferDetail v-if="showDetailModal" :transferId="selectedTransferId" @close="showDetailModal = false" />

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50">
        <!-- <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="flex items-center mb-4">
                <i class="fa-solid fa-exclamation-triangle text-red-500 text-2xl mr-3"></i>
                <h3 class="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            </div>
            <p class="text-gray-700 mb-6">
                Are you sure you want to delete this item?
            </p>
            <div class="flex justify-end space-x-3">
                <button @click="showDeleteConfirmModal = false; pendingDeleteId = null"
                    class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
                    Cancel
                </button>
                <button @click="deleteStockTransfer(pendingDeleteId)"
                    class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                    Delete
                </button>
            </div>
        </div> -->
        <div class="bg-emerald-700 text-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <!-- Header -->
            <div class="bg-emerald-800 p-4 text-center text-lg font-semibold">
                <i class="fa-solid fa-exclamation-triangle text-yellow-300 text-xl mr-2"></i>
                <h3 class="inline">{{$t('Confirm Deletion')}}</h3>
            </div>

            <!-- Message -->
            <div class="p-6 text-center">
                <p class="text-white text-base">{{$t('Are you sure you want to delete this item?')}}</p>
            </div>

            <!-- Buttons -->
            <div class="p-4 flex justify-between">
                <button @click="showDeleteConfirmModal = false; pendingDeleteId = null"
                    class="px-4 py-2 border-2 border-white text-white rounded hover:bg-emerald-600 transition">
                    {{$t('Cancel')}}
                </button>
                <button @click="deleteStockTransfer(pendingDeleteId)"
                    class="px-4 py-2 bg-white text-emerald-700 rounded hover:bg-gray-200 transition">
                    {{$t('Delete')}}
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile  Layout -->
    <StockTransferMobileScreen class="block md:hidden" />

    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
</template>

<style scoped>
tbody tr:nth-child(even) {
    background-color: #34D399;
    color: white;
    /* Optional for better visibility */
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