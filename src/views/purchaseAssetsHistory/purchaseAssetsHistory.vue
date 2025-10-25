<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import PurchaseHistoryDetail from '@/components/PurchaseAssetsHistoryDetail.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import Select from 'primevue/select';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ErrorMessage from '../../components/ErrorMessage.vue';
import SuccessMessage from '../../components/SuccessMessage.vue';
import ConfirmationDeleteMessage from '../../components/VerifyDelete.vue';
import PurchaseAssetsHistoryMobileScreen from '../Mobile/transactionAssets/PurchaseAssetsHistory.vue';
const { t } = useI18n()

const showConfirmDialog = ref(false);
const pendingDeleteHistoryId = ref(null);

const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);

// const successAudio = new Audio('/sounds/success.mp3');
// const errorAudio = new Audio('/sounds/error.mp3');



const props = defineProps({
    selectedHistoryId: {
        type: String,
        default: null
    }
});

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

const emit = defineEmits(['close']);
const branchStore = useBranchStore();
const historyData = ref([]);
const paginationKey = ref(0);
const branchData = ref([]);
const userData = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const limitedPerPage = ref(10);
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const showDetailModal = ref(false);
const selectedHistoryId = ref(null);
const transferStock = ref([]);
const checkoutStock = ref([]);
const checkoutAmounts = ref({});
// Add a cache for transactions
const transactionCache = ref({});
const employeeData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);

const {
    canCreatePurchaseHistory,
    canViewPurchaseHistory,
    canUpdatePurchaseHistory,
    canDeletePurchaseHistory
} = useUserPermission();


const ShowDetail = (itemId) => {
    // Make sure itemId is a string
    selectedHistoryId.value = String(itemId);
    showDetailModal.value = true;
};



const handleListenToPagination = (items) => {
    historyData.value = items || [];
};

const refreshPagination = () => {
    paginationKey.value += 1;
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}





const handleSearch = () => {
    fetchHistoryDetail();
};

const clearFilter = () => {
    formSelectedEmployee.value = null;
    selectAssetData.value = null;
    searchQuery.value = '';
    fetchHistoryDetail();
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



const getBranchName = (branchId) => {
    const branch = branchData.value.find(branch => branch._id === branchId);
    return branch ? branch.abbreviation : '-';
};

const fetchBranch = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true },
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching branch data:", error);
    }
}



// Add new methods to calculate amounts
// const getTransferAmount = (cuttingStockIds, itemBranchId) => {
//     if (!cuttingStockIds || !Array.isArray(cuttingStockIds) || cuttingStockIds.length === 0) return 0;
//
//     // Get current branch ID
//     const currentBranchId = branchStore.getBranchId;
//
//     // For source branch records (outgoing transfers)
//     if (itemBranchId === currentBranchId) {
//         // Find outgoing transfer records for this item and branch
//         const transfers = transferStock.value.filter(stock =>
//             cuttingStockIds.includes(stock._id) &&
//             stock.type === "transfer" &&
//             stock.branchId === currentBranchId &&
//             stock.amount < 0 // Negative amount indicates outgoing transfer
//         );
//
//         // Calculate total transferred amount (absolute value of negative amounts)
//         const totalAmount = transfers.reduce((sum, stock) => sum + Math.abs(stock.amount || 0), 0);
//         return totalAmount || 0;
//     }
//     else {
//         // For destination branch records (incoming transfers)
//         const transfers = transferStock.value.filter(stock =>
//             cuttingStockIds.includes(stock._id) &&
//             stock.type === "transfer" &&
//             stock.amount > 0 // Positive amount indicates incoming transfer
//         );
//
//         // Calculate total incoming amount
//         const totalAmount = transfers.reduce((sum, stock) => sum + (stock.amount || 0), 0);
//         return totalAmount || 0;
//     }
// };

// Add this method to fetch all stock records
// const fetchTransferStock = async () => {
//     try {
//         // Fetch ALL cutting stock records, not just for the current branch
//         const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { headers: API_CONFIGS.headers });
//         transferStock.value = response.data.data || [];
//
//         const typeCount = {};
//         transferStock.value.forEach(stock => {
//             typeCount[stock.type] = (typeCount[stock.type] || 0) + 1;
//         });
//
//         const transferRecords = transferStock.value.filter(stock => stock.type === "transfer");
//     } catch (error) {
//         console.error("Error fetching transfer data:", error);
//     }
// };

// We'll use the same data for both checkout and transfer
const fetchCheckoutStock = async () => {
    try {
        // Only care about checkout type
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { headers: API_CONFIGS.headers });
        checkoutStock.value = (response.data.data || []).filter(stock => stock.type === "check-out");
    } catch (error) {
        console.error("Error setting checkout data:", error);
    }
};

// Add a debug function to check checkout records for a specific item
const debugCheckoutRecords = (item) => {
    if (!item || !item.cuttingStockIds || item.cuttingStockIds.length === 0) return;

    // Get all checkout records for this item
    const checkouts = checkoutStock.value.filter(stock =>
        item.cuttingStockIds.includes(stock._id) &&
        stock.type === "check-out" &&
        stock.branchId === item.branchId
    );

    // Only care about checkouts now
    const totalCheckedOut = checkouts.reduce((sum, stock) => sum + Math.abs(stock.amount || 0), 0);
    return {
        checkouts: checkouts.length,
        totalCheckedOut,
        originalQty: item.asset.qty,
        remaining: item.asset.qty - totalCheckedOut
    };
};

// Update getCheckoutAmount to take branchId parameter
const getCheckoutAmount = async (cuttingStockIds, itemBranchId, historyId) => {
    if (!cuttingStockIds || !Array.isArray(cuttingStockIds) || cuttingStockIds.length === 0) return 0;

    const currentBranchId = itemBranchId || branchStore.getBranchId;

    // Find checkouts that match this specific purchase history
    const checkouts = checkoutStock.value.filter(stock =>
        stock.type === "check-out" &&
        stock.purchaseAssetHistoryId === historyId // Match the specific history record
    );

    let totalAmount = 0;

    // Calculate total amount from matching checkouts
    for (const checkout of checkouts) {
        if (checkout.ref && transactionCache.value[checkout.ref]) {
            totalAmount += Math.abs(checkout.amount || 0);
        }
    }

    return totalAmount;
};

const fetchHistoryDetail = async () => {
    try {
        isLoading.value = true;

        // Always get the current branch ID from the store
        const currentBranchId = branchStore.getBranchId;

        if (props.selectedHistoryId) {
            const params = {
                dynamicConditions: JSON.stringify([
                    { field: '_id', operator: '==', value: props.selectedHistoryId },
                    { field: 'branchId', operator: '==', value: currentBranchId } // Add branch filter
                ])
            };

            const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params, headers: API_CONFIGS.headers });
            historyData.value = response.data.data && response.data.data.length > 0 ? [response.data.data[0]] : [];
        } else {
            // Build dynamic conditions for filters
            const dynamicConditions = [
                { field: 'branchId', operator: '==', value: currentBranchId }
            ];
            if (formSelectedEmployee.value) {
                dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
            }
            if (selectAssetData.value) {
                dynamicConditions.push({ field: 'asset.assetName', operator: '==', value: selectAssetData.value.name });
            }

            const params = {
                sortOrder: 'asc',
                populate: JSON.stringify(['createdBy']),
                dynamicConditions: JSON.stringify(dynamicConditions)
            };

            const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params, headers: API_CONFIGS.headers });
            historyData.value = response.data.data || [];
        }

    } catch (error) {
        console.error("Error fetching history data:", error);
    } finally {
        isLoading.value = false;
    }
};


// Confirm Delete
const openConfirmDialog = (id) => {
    pendingDeleteHistoryId.value = id;
    showConfirmDialog.value = true;
};


const handleDeleteConfirmation = async () => {
    if (!pendingDeleteHistoryId.value) return;

    try {
        isLoading.value = true;
        showConfirmDialog.value = false;

        await deletePurchaseAssetHistory(pendingDeleteHistoryId.value);

        successMessage.value = "Successfully deleted history item";
        showSuccessMessage.value = true;
        setTimeout(() => (showSuccessMessage.value = false), 800);

        refreshPagination();
    } catch (error) {
        console.error("Error deleting history item:", error);
        errorMessage.value = "Failed to delete history item. Please try again.";
        showErrorMessage.value = true;
        setTimeout(() => (showErrorMessage.value = false), 5000);

    } finally {
        isLoading.value = false;
        pendingDeleteHistoryId.value = null;
    }
};



// Modified delete function to enforce FIFO
const deletePurchaseAssetHistory = async (historyId) => {
    try {
        const itemToDelete = historyData.value.find(item => item._id === historyId);

        if (!itemToDelete) {
            errorMessage.value = "No data found to delete.";
            showErrorMessage.value = true;
            // errorAudio.play(); // This line was commented out in the original file
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            return;
        }

        isLoading.value = true;

        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyId}`, {
            headers: API_CONFIGS.headers
        });

        if (response.status === 200) {
            historyData.value = historyData.value.filter(item => item._id !== historyId);

            await fetchHistoryDetail();

            // ✅ Success message
            successMessage.value = "Item deleted successfully.";
            showSuccessMessage.value = true;
            setTimeout(() => {
                showSuccessMessage.value = false;
            }, 5000);
        }
    } catch (error) {
        console.error("Error deleting history item:", error);

        errorMessage.value = "Something went wrong while deleting.";
        showErrorMessage.value = true;
        // errorAudio.play(); // This line was commented out in the original file
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        isLoading.value = false;
    }
};


watch(() => props.selectedHistoryId, () => {
    if (props.selectedHistoryId) {
        fetchHistoryDetail();
    }
}, { immediate: false });

watch(selectedRow, (newValue) => {
    if (newValue) {
        pageSize.value = parseInt(newValue.name);
        fetchHistoryDetail();
    }
}, { immediate: true });

watch(searchQuery, () => {
    searchText.value = searchQuery.value;
    fetchHistoryDetail();
}, { deep: true });



const logTransferDetails = (item) => {
    if (!item || !item.cuttingStockIds || item.cuttingStockIds.length === 0) return;


    const transferCuts = transferStock.value.filter(cut =>
        item.cuttingStockIds.includes(cut._id) &&
        cut.type === "transfer"
    );


    transferCuts.forEach((cut, index) => {
        console.log(`Transfer ${index + 1}: amount=${cut.amount}, direction=${cut.amount < 0 ? 'OUT' : 'IN'}, branchId=${cut.branchId}`);
    });

    const displayedTransferAmount = getTransferAmount(item.cuttingStockIds, item.branchId);
};




const fetchAllTransactions = async () => {
    try {
        // Get ALL transactions
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { headers: API_CONFIGS.headers });
        const transactions = response.data.data || [];

        // Clear existing cache
        transactionCache.value = {};

        // Cache transactions by both ID and ref
        transactions.forEach(transaction => {
            if (transaction._id) {
                transactionCache.value[transaction._id] = transaction;
            }
            if (transaction.ref && transaction.ref !== transaction._id) {
                transactionCache.value[transaction.ref] = transaction;
            }
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
    }
};

const displayOutOfStock = (item) => {
    // First check the database status
    if (item.status === true) return true;

    // Check if this is a transfer destination record (isTransfer = true)
    // Transfer destination records should not be marked as out of stock unless their status is true
    if (item.isTransfer === true) {
        return false;
    }

    // For source records (isPurchase = true), check if they have been transferred out
    if (item.cuttingStockIds && item.cuttingStockIds.length > 0) {
        // Check for checkout records first
        const checkoutRecords = checkoutStock.value.filter(cut =>
            item.cuttingStockIds.includes(cut._id) &&
            cut.type === "check-out" &&
            cut.branchId === item.branchId
        );

        const transferRecords = transferStock.value.filter(cut =>
            item.cuttingStockIds.includes(cut._id) &&
            cut.type === "transfer" &&
            cut.amount < 0 &&
            cut.branchId === item.branchId
        );

        // Calculate total checkout amount
        const checkedOutAmount = checkoutRecords.reduce((sum, cut) => sum + Math.abs(cut.amount || 0), 0);

        // Calculate total transferred amount
        const transferredAmount = transferRecords.reduce((sum, cut) => sum + Math.abs(cut.amount || 0), 0);

        // Combined total of checked out and transferred
        const totalRemoved = checkedOutAmount + transferredAmount;

        // If combined total equals or exceeds the original quantity, it's out of stock
        if (totalRemoved >= item.asset.qty) {
            return true;
        }
    }

    // Otherwise, it's in stock
    return false;
};


// Update the watch function to properly handle transaction updates
watch(() => historyData.value, async (newData) => {
    if (!newData || !Array.isArray(newData)) return;

    // Reset checkout amounts
    checkoutAmounts.value = {};

    // First ensure we have all transactions
    await fetchAllTransactions();

    // Then calculate checkout amounts
    for (const item of newData) {
        if (item && item.cuttingStockIds) {
            checkoutAmounts.value[item._id] = await getCheckoutAmount(
                item.cuttingStockIds,
                item.branchId,
                item._id // Pass the history ID
            );
        }
    }
}, { immediate: true });

// Add watch for transferStock and checkoutStock changes
// watch([() => transferStock.value, () => checkoutStock.value], async () => {
//     if (historyData.value && historyData.value.length > 0) {
//         for (const item of historyData.value) {
//             if (item && item.cuttingStockIds && item.cuttingStockIds.length > 0) {
//                 checkoutAmounts.value[item._id] = await getCheckoutAmount(
//                     item.cuttingStockIds,
//                     item.branchId,
//                     item._id
//                 );
//             }
//         }
//     }
// }, { deep: true });


// Watch for branch changes
watch(() => branchStore.branchId, (newBranchId, oldBranchId) => {
    if (newBranchId !== oldBranchId) {

        fetchHistoryDetail();

        // Only care about checkouts now
        fetchCheckoutStock();
        fetchAllTransactions().then(() => {
            if (historyData.value && historyData.value.length > 0) {
                for (const item of historyData.value) {
                    if (item && item.cuttingStockIds) {
                        checkoutAmounts.value[item._id] = getCheckoutAmount(
                            item.cuttingStockIds,
                            item.branchId,
                            item._id
                        );
                    }
                }
            }
        });
    }
}, { immediate: true });

// Call it on component mount and whenever needed
onMounted(async () => {
    fetchBranch();
    fetchAsset();
    fetchUser();
    await fetchCheckoutStock(); // Only care about checkouts now
    await fetchAllTransactions(); // Cache all transactions

    // Fetch history data

    // Trigger a manual refresh of the checkout amounts
    if (historyData.value && historyData.value.length > 0) {
        for (const item of historyData.value) {
            if (item && item.cuttingStockIds) {
                checkoutAmounts.value[item._id] = await getCheckoutAmount(
                    item.cuttingStockIds,
                    item.branchId,
                    item._id
                );
            }
        }
    }
});


</script>


<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer overflow-y-auto hidden md:block">
        <p class="text-left font-semibold text-lg">{{$t('Purchase Asset History')}}</p>
        <div class="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 text-left">
            <div class="card flex justify-start gap-4 items-center w-full md:w-auto lg:w-48 xl:w-60">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />


                <!-- <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="displayName"
                    optionValue="_id" placeholder="Select Employee" class="w-full" :filter="true" /> -->
                <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                    :placeholder="$t('Employee')" class="w-full" :filter="true" />


                <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name"
                    :placeholder="$t('Select Asset')" class="w-full" filter />


                <div class="flex  gap-4">
                    <button @click="clearFilter"
                        class=" my-auto bg-gradient-to-br from-red-400 to-red-700 text-white px-4 py-2 rounded-md hover:from-red-500 hover:to-red-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50">{{$t('Clear')}}</button>
                    <button @click="handleSearch"
                        class="my-auto bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">{{$t('Show')}}</button>
                </div>

            </div>
            <!-- <div class="w-full md:w-auto lg:w-48 xl:w-60 flex items-center mr-3">
                <div class="w-full">
                    <input v-model="searchQuery" type="text" placeholder="Search by Name..."
                        class="p-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-400 outline-none pl-3 pr-10 hover:border-emerald-500">
                </div>
            </div> -->
        </div>
        <div class="overflow-x-auto mt-3">
            <div v-if="isLoading" class="absolute inset-0 bg-opacity-70 flex items-center justify-center z-10 mt-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
            <table class="min-w-full border-collapse border border-gray-400 p-2" :class="{ 'opacity-50': isLoading }">
                <thead class="bg-gray-100 text-xs">
                    <tr>
                        <th class="border border-gray-300 p-2">{{$t('No')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('CreatedBy')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Branch')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('CreateAt')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Asset Name')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Quantity')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Asset Checkout')}}</th>
                        <!-- <th class="border border-gray-300 p-2">{{$t('Asset Transfer')}}</th> -->
                        <th class="border border-gray-300 p-2">{{$t('Type')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Status')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Actions')}}</th>
                    </tr>
                </thead>
                <tbody v-if="historyData.length > 0" class="text-sm">
                    <tr v-for="(item, index) in historyData" :key="item._id"
                        class="hover:bg-emerald-100 transition-colors duration-200"
                        :class="{ 'bg-[#34D399] text-white': index % 2 !== 0 }">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">{{ item.createdBy?.displayName || '' }}</td>
                        <td class="border border-gray-300 p-2">{{ getBranchName(item.branchId) }}</td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <td class="border border-gray-300 p-2">{{ item.asset.assetName }}</td>
                        <td class="border border-gray-300 p-2">{{ item.asset.qty }}</td>
                        <td class="border border-gray-300 p-2">{{ checkoutAmounts[item._id] || 0 }}</td>
                        <!-- <td class="border border-gray-300 p-2">{{ getTransferAmount(item.cuttingStockIds, item.branchId)
                        }}</td> -->

                        <td class="border border-gray-300 p-2">{{ item.isPurchase ? 'ទិញក្នុងសាខា' : item.isTransfer ?
                            'ផ្ទេរពីសាខា' : ''
                        }}</td>

                        <td class="border border-gray-300 p-2">
                            <span
                                class="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm"
                                :class="displayOutOfStock(item)
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white ring-1 ring-red-300'
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white ring-1 ring-green-300'">
                                <i class="mr-1.5"
                                    :class="displayOutOfStock(item) ? 'fas fa-times-circle' : 'fas fa-check-circle'"></i>
                                {{ displayOutOfStock(item) ? 'Out of Stock' : 'In Stock' }}
                            </span>
                        </td>
                        <td class="flex text-center justify-center p-2 mt-1">
                            <i class="fa-solid fa-eye cursor-pointer text-orange-500 mr-2 hover:text-orange-600 hover:scale-125 transform transition duration-150 ease-in-out"
                                :class="item.isTransfer ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''"
                                @click="item.isPurchase ? ShowDetail(item._id) : null" :aria-disabled="item.isTransfer"
                                title="View"></i>
                            <!-- <i @click="openConfirmDialog(item._id)"
        class="fa-solid fa-trash cursor-pointer text-red-600 ml-2 hover:text-red-700"></i> -->
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500">
                        <td colspan="10" class="font-khmer text-center text-lg">{{$t('No data found!')}}</td>
                    </tr>
                </tbody>
            </table>
            <PaginationTwo :key="paginationKey" :currentPage="currentPage"
                @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
                @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
                :searchQuery="searchText" />
        </div>
    </div>
    <PurchaseHistoryDetail v-if="showDetailModal" :selectedHistoryId="selectedHistoryId"
        @close="showDetailModal = false" />
    <PurchaseAssetsHistoryMobileScreen class="block md:hidden" />

    <!-- Confirm Message -->
    <ConfirmationDeleteMessage :show="showConfirmDialog" @cancel="showConfirmDialog = false"
        @confirm="handleDeleteConfirmation" />

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