<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import { DatePicker, Select } from 'primevue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const showConfirmDialog = ref(false);
const deleteHistoryId = ref(null);

const openDropdownId = ref(null);
const dropdownRefs = ref({});

function setDropdownRef(id) {
    return (el) => {
        if (el) {
            dropdownRefs.value[id] = el;
        } else {
            delete dropdownRefs.value[id];
        }
    };
}

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
const branchData = ref([]);
const userData = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const limitedPerPage = ref(10);
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const transferStock = ref([]);
const checkoutStock = ref([]);
const checkoutAmounts = ref({});
// Add a cache for transactions
const transactionCache = ref({});
const employeeData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);

// Add missing variables
const startDate = ref(null);
const endDate = ref(null);

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


// Add missing computed properties and functions
const assetCheckoutCounts = computed(() => {
    const counts = {};
    if (historyData.value && Array.isArray(historyData.value)) {
        historyData.value.forEach(item => {
            if (item && item._id) {
                counts[item._id] = checkoutAmounts.value[item._id] || 0;
            }
        });
    }
    return counts;
});

const calculateCuttingStock = (cuttingStocks) => {
    if (!cuttingStocks || !Array.isArray(cuttingStocks)) return 0;
    return cuttingStocks.length;
};

const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    startDate.value = now.startOf('month').format('DD/MM/YYYY');
    endDate.value = now.endOf('month').format('DD/MM/YYYY');
};

const handleSearch = () => {
    currentPage.value = 1;
    fetchHistoryDetail();
};

const clearFilters = () => {
    searchQuery.value = '';
    startDate.value = null;
    endDate.value = null;
    formSelectedEmployee.value = null;
    selectAssetData.value = null;
    dateRange.value = null;
    currentPage.value = 1;
    fetchHistoryDetail();
    setDefaultMonthRange()
};

const handleDelete = async (itemId) => {
    await deletePurchaseAssetHistory(itemId);
};

const handleListenToPagination = (items) => {
    historyData.value = items || [];
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}




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

//     // Get current branch ID
//     const currentBranchId = branchStore.getBranchId;

//     // For source branch records (outgoing transfers)
//     if (itemBranchId === currentBranchId) {
//         // Find outgoing transfer records for this item and branch
//         const transfers = transferStock.value.filter(stock =>
//             cuttingStockIds.includes(stock._id) &&
//             stock.type === "transfer" &&
//             stock.branchId === currentBranchId &&
//             stock.amount < 0 // Negative amount indicates outgoing transfer
//         );

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


//         const typeCount = {};
//         transferStock.value.forEach(stock => {
//             typeCount[stock.type] = (typeCount[stock.type] || 0) + 1;
//         });

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

    // Get all transfer records for this item
    const transfers = transferStock.value.filter(stock =>
        item.cuttingStockIds.includes(stock._id) &&
        stock.type === "transfer"
    );

    const outgoingTransfers = transfers.filter(t => t.amount < 0 && t.branchId === item.branchId);
    const incomingTransfers = transfers.filter(t => t.amount > 0);

    const totalCheckedOut = checkouts.reduce((sum, stock) => sum + Math.abs(stock.amount || 0), 0);
    const totalTransferredOut = outgoingTransfers.reduce((sum, stock) => sum + Math.abs(stock.amount || 0), 0);
    const totalTransferredIn = incomingTransfers.reduce((sum, stock) => sum + (stock.amount || 0), 0);

    return {
        checkouts: checkouts.length,
        outgoingTransfers: outgoingTransfers.length,
        incomingTransfers: incomingTransfers.length,
        totalCheckedOut,
        totalTransferredOut,
        totalTransferredIn,
        originalQty: item.asset.qty,
        remaining: item.asset.qty - totalCheckedOut - totalTransferredOut + totalTransferredIn
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
                    { field: 'branchId', operator: '==', value: currentBranchId }
                ])
            };
            const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params, headers: API_CONFIGS.headers });
            historyData.value = response.data.data && response.data.data.length > 0 ? [response.data.data[0]] : [];
        } else {
            // Build dynamic conditions for filters
            const dynamicConditions = [
                // { field: 'branchId', operator: '==', value: currentBranchId }
            ];
            if (formSelectedEmployee.value) {
                dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
            }
            if (selectAssetData.value) {
                dynamicConditions.push({ field: 'asset.assetName', operator: '==', value: selectAssetData.value.name });
            }
            // Add date range filters
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
                sortOrder: 'desc',
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
    deleteHistoryId.value = id;
    showConfirmDialog.value = true;
};

const confirmDelete = async () => {
    if (deleteHistoryId.value) {
        await deletePurchaseAssetHistory(deleteHistoryId.value);
        deleteHistoryId.value = null;
        showConfirmDialog.value = false;
    }
};

// Modified delete function to enforce FIFO
const deletePurchaseAssetHistory = async (historyId) => {
    try {
        const itemToDelete = historyData.value.find(item => item._id === historyId);

        if (!itemToDelete) {
            console.error("Item not found");
            return;
        }


        isLoading.value = true;
        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyId}`, { headers: API_CONFIGS.headers });

        if (response.status === 200) {
            historyData.value = historyData.value.filter(item => item._id !== historyId);

            await fetchHistoryDetail();
        }
    } catch (error) {
        console.error("Error deleting history item:", error);
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

function toggleDropdown(id) {
    openDropdownId.value = openDropdownId.value === id ? null : id;
}

function handleClickOutside(event) {
    if (openDropdownId.value) {
        const el = dropdownRefs.value[openDropdownId.value];
        if (el && !el.contains(event.target)) {
            openDropdownId.value = null;
        }
    }
}

// Call it on component mount and whenever needed
onMounted(async () => {
    fetchAsset();
    fetchUser();
    fetchBranch();
    await fetchCheckoutStock(); // Only care about checkouts now
    await fetchAllTransactions(); // Cache all transactions


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

    setDefaultMonthRange()

    document.addEventListener('click', handleClickOutside);
});

// Cleanup on unmount
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const {
    canViewPurchaseHistory,
    canDeletePurchaseHistory
} = useUserPermission();
</script>

<template>
    <div>
        <router-link to="/"
            class="flex items-center space-x-2 text-emerald-600 hover:text-emerald-600 font-medium p-2 w-3/4">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('History') }}</span>
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

            <!-- <div class="flex items-center space-x-3">
                <input v-model="searchQuery" type="text" placeholder="Search by Name..."
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" />


                 <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="displayName"
                    optionValue="_id" placeholder="Employee" class="w-full" :filter="true" />
                <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                    placeholder="Employee" class="w-full" :filter="true" />


                <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name" placeholder="Asset"
                    class="w-full" filter />

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

                <!-- <div class="flex items-center space-x-2">
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button>
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div> -->
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="mt-5 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p class="text-gray-500 mt-2">{{ $t('Loading...') }}</p>
        </div>

        <!-- History Items (permission) -->
        <div v-else-if="canViewPurchaseHistory() && historyData && historyData.length > 0" class="space-y-4 mt-5">
            <div v-for="(item, index) in historyData" :key="item._id || index" v-intersect
                class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex justify-between items-start gap-4">

                <!-- Top-right Status Badge -->
                <span class="absolute top-0 right-0 px-2 py-1 rounded-bl-xl rounded-tr-md" :class="item.status
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white ring-1 ring-red-300'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-300'">
                    <i class="mr-1.5" :class="item.status ? 'fas fa-times-circle' : 'fas fa-check-circle'"></i>
                    {{ item.status ? $t('Out of Stock') : $t('In Stock') }}
                </span>

                <!-- Info -->
                <div class="space-y-2 text-gray-700 w-full text-start text-xs">
                    <p><strong class="text-gray-500">ID:</strong> <span class="ml-1">{{ index + 1 }}</span></p>
                    <p>
                        <strong class="text-gray-500">{{ $t('CreateBy') }}:</strong>
                        <span class="ml-1">{{ item.createdBy?.displayName || '' }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Branch') }}:</strong>
                        <span class="ml-1">{{ getBranchName(item.branchId) }}</span>
                    </p>

                    <p><strong class="text-gray-500">{{ $t('Name') }}:</strong> <span class="ml-1">{{ item.asset &&
                        item.asset.assetName }}</span></p>


                    <p><strong class="text-gray-500">{{ $t('Type') }}:</strong> <span class="ml-1">{{ item.isPurchase ?
                        'ទិញក្នុងសាខា' : item.isTransfer ?
                            'ផ្ទេរពីសាខា' : '' }}</span></p>

                    <p><strong class="text-gray-500">{{ $t('Total Stock') }}:</strong> <span class="ml-1">{{ item.asset &&
                        item.asset.qty }}</span></p>

                    <div class="flex justify-between items-center">
                        <p class="flex items-center text-xs text-gray-700">
                            <i class="fas fa-sign-out-alt text-gray-500 text-[12px] mr-1"></i>
                            <strong class="text-gray-500">{{ $t('CheckOut') }}:</strong>
                            <span class="ml-1">{{ checkoutAmounts[item._id] || 0 }}</span>
                        </p>
                        <!-- 
                        <p class="flex items-center text-xs text-gray-700 mt-1">
                            <i class="fas fa-exchange-alt text-gray-500 text-[12px] mr-1"></i>
                            <strong class="text-gray-500">{{$t('Transfer')}}:</strong>
                            <span class="ml-1">{{ getTransferAmount(item.cuttingStockIds, item.branchId) }}</span>
                        </p> -->

                    </div>

                    <hr class="mt-2 h-2" />

                    <div class="flex justify-between">
                        <p class=" items-center my-auto">
                            <strong class="text-gray-500">{{ $t('CreateAt') }}:</strong>
                            <span class="ml-1">
                                <i class="fas fa-calendar text-gray-500"></i>
                                {{ formatDateKhmer(item.createdAt) }}</span>
                        </p>

                        <div v-if="item.isPurchase && !item.isTransfer"
                            class="rounded-lg shadow-sm bg-white border border-gray-300 hover:border-emerald-400 transition-all">
                            <router-link :to="`/purchase-asset-history-detail-mobile/${item._id}`"
                                class="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-200">
                                <i class="fa-solid fa-eye text-[14px]"></i>
                                <span>{{ $t('View') }}</span>
                            </router-link>
                        </div>
                    </div>
                </div>


                <!-- Dropdown icon container -->
                <!-- <div class="relative min-w-[32px] mt-4" :ref="setDropdownRef(item._id)">
                    <i class="fa-solid fa-ellipsis-vertical text-gray-400 hover:text-emerald-600 p-2 text-lg cursor-pointer"
                        aria-label="Options" tabindex="0" @click.stop="toggleDropdown(item._id)"></i>

                    <div v-if="openDropdownId === item._id"
                        class="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <router-link :to="`/purchase-asset-history-detail-mobile/${item._id}`"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-left text-blue-700 hover:bg-emerald-100 transition-colors">
                            <i class="fa-solid fa-eye"></i> View
                        </router-link>
                        <button v-if="canDeletePurchaseHistory()" @click="openConfirmDialog(item._id)"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-left text-red-600 hover:bg-red-100 w-full transition-colors">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>

                    </div>
                </div> -->
            </div>
        </div>

        <!-- No data message -->
        <div v-else class="mt-5 text-center">
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <i class="fa-solid fa-inbox text-gray-400 text-2xl mb-3"></i>
                <h3 class="text-gray-600 font-semibold mb-2">{{ $t('No Purchase History') }}</h3>
                <!-- <p class="text-gray-500 text-sm">No purchase asset history records found.</p> -->
            </div>
        </div>

        <!-- Pagination -->
        <PaginationTwo v-if="historyData.length > 0" :currentPage="currentPage"
            @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
            @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
            :searchQuery="searchText" />


        <!-- Confirm Delete Dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-6 text-center space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">Confirm Deletion</h2>
                <p class="text-sm text-gray-600">Are you sure you want to delete this item?</p>
                <div class="flex justify-center gap-4 mt-4">
                    <button @click="showConfirmDialog = false"
                        class="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition">
                        No
                    </button>
                    <button @click="confirmDelete"
                        class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition">
                        Yes
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>