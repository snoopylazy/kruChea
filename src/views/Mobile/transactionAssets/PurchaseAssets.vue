<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
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

const showConfirmDialog = ref(false);
const itemToDelete = ref(null);

const openDropdownId = ref(null);
const dropdownRefs = ref({});

const branchStore = useBranchStore();

// Modal
const showPurchaseAssets = ref(false);
const showDetailModal = ref(false);
const purchaseAsset = ref([]);
const isLoading = ref(false);
const searchQuery = ref('');
const limitedPerPage = ref(10);
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const userData = ref([]);
const employeeData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);

// Add missing refs for date filtering
const startDate = ref(null);
const endDate = ref(null);

// Add missing refs for messages
const showSuccessMessage = ref(false);
const showErrorMessage = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// Add this ref to track the newest items
const newestPurchases = ref({});

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


// Row
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

watch(selectedRow, (newValue) => {
    pageSize.value = parseInt(newValue.name, 10);
    limitedPerPage.value = pageSize.value;
    currentPage.value = 1;
    fetchPurchaseAsset(); // Uncomment if you want to fetch data on change
});

// Add missing search and filter functions
const handleSearch = () => {
    currentPage.value = 1;
    fetchPurchaseAsset()
};

const clearFilters = () => {
    searchQuery.value = '';
    searchText.value = '';
    startDate.value = null;
    endDate.value = null;
    dateRange.value = null;
    currentPage.value = 1;
    formSelectedEmployee.value = null;
    selectAssetData.value = null;
    fetchPurchaseAsset();
    setDefaultMonthRange()
};

const handleListenToPagination = (items) => {
    purchaseAsset.value = items || [];
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
};




const fetchAsset = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { headers: API_CONFIGS.headers });
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

        employeeData.value = (response.data.data || []).map(user => ({
            ...user,
            label: user.displayName || user.userName || '',
        }));
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};





const getUserName = (id) => {
    const user = userData.value.find(user => user._id === id);
    return user ? user.displayName : "-";
};

const getUser = async () => {
    try {
        const params = {
            dynamicCondition: JSON.stringify([
                { field: 'status', operator: '==', value: true },
                { field: 'branchId', operator: '==', value: branchStore.getBranchId }
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        userData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching user data:', error);
        showErrorMessage.value = true;
        errorMessage.value = 'Failed to fetch user data';
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 3000);
    }
};

const fetchPurchaseAsset = async () => {
    try {
        isLoading.value = true;
        const dynamicConditions = [];

        if (formSelectedEmployee.value) {
            dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
        }
        if (selectAssetData.value) {
            // Adjust field name based on backend expectations
            dynamicConditions.push({ field: 'assetIds', operator: 'arrayContains', value: selectAssetData.value._id });
        }

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
            populate: JSON.stringify(['createdBy']),
            dynamicConditions: JSON.stringify(dynamicConditions),
            limit: pageSize.value // <-- add this back!
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params, headers: API_CONFIGS.headers });
        purchaseAsset.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching purchase assets:', error);
    } finally {
        isLoading.value = false;
    }
};


// Confirm Delete
const confirmDelete = (item, index) => {
    if (!canDeletePurchase(item, index)) return;
    itemToDelete.value = item;
    showConfirmDialog.value = true;
};

const handleDeleteConfirmation = async () => {
    if (!itemToDelete.value) return;

    try {
        // Check if the assets can be deleted
        const usageResult = await checkAssetUsage(itemToDelete.value);

        if (!usageResult.canDelete) {
            // Cannot delete due to existing transactions or transfers
            errorMessage.value = usageResult.message;
            showErrorMessage.value = true;
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 5000);
            showConfirmDialog.value = false;
            itemToDelete.value = null;
            return;
        }

        // Continue with deletion if it's safe to delete
        await deletePurchaseAsset(itemToDelete.value._id);

        // Show success message
        successMessage.value = t('Successfully deleted');
        showSuccessMessage.value = true;
        setTimeout(() => {
            showSuccessMessage.value = false;
        }, 3000);

    } catch (error) {
        console.error("Error deleting purchase asset:", error);
        errorMessage.value = error.message || t('Failed to delete purchase asset. Please try again.');
        showErrorMessage.value = true;
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
    } finally {
        showConfirmDialog.value = false;
        itemToDelete.value = null;
    }
};

// Check if assets have related transactions or stock transfers
const checkAssetUsage = async (purchaseData) => {
    try {
        if (!purchaseData || !purchaseData.assets || purchaseData.assets.length === 0) {
            return { canDelete: false, message: "No assets found in purchase data" };
        }

        // Extract asset IDs from the purchase
        const assetIds = purchaseData.assets.map(asset => asset.assetId);
        const purchaseCreatedAt = new Date(purchaseData.createdAt);

        // For each asset, check if the stock from this purchase has been used in transfers/transactions
        for (const purchasedAsset of purchaseData.assets) {
            const assetId = purchasedAsset.assetId;
            const purchaseQty = purchasedAsset.qty;

            // 1. Get all purchases of this asset, sorted by createdAt ascending
            const purchaseParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'assets.assetId', operator: '==', value: assetId }
                ]),
                sortField: 'createdAt',
                sortOrder: 'asc'
            };
            const allPurchasesResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params: purchaseParams, headers: API_CONFIGS.headers });
            const allPurchases = (allPurchasesResponse.data.data || []).filter(p => p.assets && p.assets.some(a => a.assetId === assetId));

            // 2. Calculate total stock purchased before this purchase
            let totalStockBefore = 0;
            for (const p of allPurchases) {
                if (new Date(p.createdAt) < purchaseCreatedAt) {
                    const asset = p.assets.find(a => a.assetId === assetId);
                    if (asset) totalStockBefore += asset.qty;
                }
            }

            // 3. Get all transactions for this asset after this purchase
            const transactionParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'assetId', operator: '==', value: assetId }
                ])
            };
            const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params: transactionParams, headers: API_CONFIGS.headers });
            const transactions = (transactionResponse.data.data || []).filter(tran => tran.createdAt && new Date(tran.createdAt) > purchaseCreatedAt);
            const totalTransactionQty = transactions.reduce((sum, t) => sum + (parseInt(t.qty) || 0), 0);

            // 4. Get all stock transfers for this asset after this purchase
            const transferParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'assetsTransferId', operator: 'arrayContains', value: assetId }
                ])
            };
            const transferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params: transferParams, headers: API_CONFIGS.headers });
            const transfers = (transferResponse.data.data || []).filter(tran => tran.createdAt && new Date(tran.createdAt) > purchaseCreatedAt);
            // Sum qty for this asset in each transfer
            let totalTransferQty = 0;
            for (const transfer of transfers) {
                if (transfer.assetsTransfer && Array.isArray(transfer.assetsTransfer)) {
                    const assetTransfer = transfer.assetsTransfer.find(a => a.assetId === assetId);
                    if (assetTransfer) totalTransferQty += parseInt(assetTransfer.qty) || 0;
                }
            }

            // 5. If totalTransactionQty + totalTransferQty > totalStockBefore, this purchase's stock has been used
            if ((totalTransactionQty + totalTransferQty) > totalStockBefore) {
                return {
                    canDelete: false,
                    message: `Cannot delete: The asset '${purchasedAsset.assetName}' has been used in transactions or stock transfers after this purchase.`
                };
            }
        }

        // If we made it here, there are no blocking transactions or transfers after this purchase
        return { canDelete: true, message: "" };

    } catch (error) {
        console.error("Error checking asset usage:", error);
        return {
            canDelete: false,
            message: "Failed to check if assets can be deleted. Please try again."
        };
    }
};



// Modified delete function to enforce LIFO
const deletePurchaseAsset = async (id) => {
    try {
        const purchaseToDelete = purchaseAsset.value.find(item => item._id === id);

        if (!purchaseToDelete) {
            console.error("Purchase not found");
            return;
        }

        isLoading.value = true;
        const timestamp = await fetchTimestamp();

        const purchaseData = purchaseAsset.value.find(item => item._id === id);

        if (!purchaseData || !purchaseData.assets || purchaseData.assets.length === 0) {
            throw new Error("Purchase data not found or invalid");
        }

        // Update assets
        const assetUpdatePromises = purchaseData.assets.map(async (purchasedAsset) => {
            try {
                const params = {
                    dynamicConditions: JSON.stringify([
                        { field: '_id', operator: '==', value: purchasedAsset.assetId }
                    ])
                };

                const assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
                const assets = assetResponse.data.data || [];

                if (!assets.length) {
                    console.warn(`Asset not found: ${purchasedAsset.assetId}`);
                    return null;
                }

                const asset = assets[0];
                const currentStock = asset.totalStock || 0;
                const newStock = Math.max(0, currentStock - purchasedAsset.qty);

                const recentPurchaseParams = {
                    dynamicConditions: JSON.stringify([
                        { field: 'assetIds', operator: 'arrayContains', value: purchasedAsset.assetId },
                        { field: '_id', operator: '!=', value: id }
                    ]),
                    sortField: 'createdAt',
                    sortOrder: 'desc',
                    limit: 1
                };

                const recentPurchaseResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params: recentPurchaseParams, headers: API_CONFIGS.headers });
                const recentPurchases = recentPurchaseResponse.data.data || [];

                let priceUpdate;

                if (recentPurchases.length > 0) {
                    const recentPurchaseAsset = recentPurchases[0].assets.find(a => a.assetId === purchasedAsset.assetId);
                    if (recentPurchaseAsset) {
                        priceUpdate = recentPurchaseAsset.price;
                    } else {
                        priceUpdate = asset.purchasePrice;
                    }
                } else {
                    priceUpdate = 0;
                }

                const updateBody = {
                    fields: {
                        totalStock: newStock,
                        purchasePrice: priceUpdate,
                        updatedAt: timestamp,
                        updatedBy: branchStore.getUserId
                    }
                };

                return axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${purchasedAsset.assetId}`, updateBody, { headers: API_CONFIGS.headers });
            } catch (err) {
                console.error(`Failed to update asset ${purchasedAsset.assetId}:`, err);
                return null;
            }
        });

        // const journalParams = {
        //     dynamicConditions: JSON.stringify([
        //         { field: 'ref', operator: '==', value: id }
        //     ])
        // };

        // const journalResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CashJournalTemp`, { params: journalParams, headers: API_CONFIGS.headers });
        // const relatedJournals = journalResponse.data.data || [];

        // const journalDeletePromises = relatedJournals.map(journal =>
        //     axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDoc/CashJournalTemp/${journal._id}`)
        // );

        const historyParams = {
            dynamicConditions: JSON.stringify([
                { field: 'purchaseAssetId', operator: '==', value: id }
            ])
        };

        const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        const relatedHistory = historyResponse.data.data || [];


        const historyDeletePromises = relatedHistory.map(historyRecord =>
            axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAssetHistory/${historyRecord._id}`, { headers: API_CONFIGS.headers })
        );

        await Promise.all([
            ...assetUpdatePromises.filter(p => p !== null),
            // ...journalDeletePromises,
            ...historyDeletePromises
        ]);

        await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAsset/${id}`, { headers: API_CONFIGS.headers });
        purchaseAsset.value = purchaseAsset.value.filter(item => item._id !== id);


    } catch (error) {
        console.error('Error deleting purchase asset and updating inventory:', error);
    } finally {
        isLoading.value = false;
    }
};

const canDeletePurchase = (item, index) => {
    return index === 0;
};

const {
    canCreatePurchase,
    canViewPurchase,
    canDeletePurchaseAsset
} = useUserPermission();


onMounted(() => {
    fetchAsset();
    fetchUser();
    getUser();
    setDefaultMonthRange()
    fetchPurchaseAsset();
    document.addEventListener('click', handleClickOutside);


});

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

        <router-link to="/"
            class="flex items-center space-x-2 text-emerald-600 hover:text-emerald-600 font-medium p-2 w-1/2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Purchase asset') }}</span>
        </router-link>

        <div class="w-full bg-white rounded-2xl shadow-md mt-1 px-5 py-6 space-y-4">
            <!-- Row 1: Date Range -->
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

            <!-- Search Input
            <div class="flex items-center space-x-3 justify-between">
                <input v-model="searchQuery" type="text" placeholder="Search by Name..."
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" /> 

                <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="displayName"
                    optionValue="_id" placeholder="Employee" class="" :filter="true" /> 
                <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="label" optionValue="_id"
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
                <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="label" optionValue="_id"
                    :placeholder="$t('Select Employee')" class="w-full" :filter="true" />
            </div>

            <div class="text-start">
                <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name"
                    :placeholder="$t('Select Asset')" class="w-full" filter />
            </div>

            <!-- Row 2: Action Buttons -->
            <div class="flex items-center justify-between mt-4">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <div class="flex items-center space-x-2">
                    <!-- <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button> -->
                    <!-- Add Button -->
                    <router-link v-if="canCreatePurchase()" to="/create-purchase-assets-mobile"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Add New">
                        <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>{{ $t('Create') }}</span>
                    </router-link>
                </div>


                <!-- <div class="flex items-center justify-end gap-2">
                    <router-link to="/create-purchase-assets-mobile"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Add New">
                        <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>Create</span>
                    </router-link>
                </div> -->
            </div>
        </div>

        <!-- Loading Indicator -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>

        <!-- Items -->
        <div v-if="canViewPurchase() && purchaseAsset.length > 0" class="space-y-4 mt-5">
            <div v-for="(item, index) in purchaseAsset" :key="item._id" v-intersect
                class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex justify-between items-start gap-4">

                <div class="space-y-2 text-gray-700 w-full text-start text-xs">
                    <p>
                        <strong class="text-gray-500">ID:</strong>
                        <span class="font-medium text-gray-900 ml-1">{{ index + 1 }}</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Name') }}:</strong>
                        <span v-if="item.assets && item.assets.length > 0" class="ml-1">
                            {{item.assets.map(asset => asset.assetName).slice(0, 4).join(', ')}}
                            {{ item.assets.length > 4 ? '...' : '' }}
                        </span>
                        <span v-else class="ml-1">-</span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Purchase By') }}:</strong>
                        <span class="ml-1">
                            {{ item.createdBy?.displayName || '' }}
                        </span>
                    </p>

                    <p>
                        <strong class="text-gray-500">{{ $t('Total Stock') }}:</strong>
                        <span class="ml-1">
                            <!-- <template v-if="item.assets && item.assets.length > 0">
                                <span v-for="(asset, i) in item.assets" :key="i"
                                    class="bg-emerald-100 px-2 py-0.5 rounded-md text-xs text-emerald-800 font-medium inline-block mr-1">
                                    {{ asset.qty }}
                                </span>
                            </template> -->
                            <template v-if="item.assets && item.assets.length > 0">
                                <span class="ml-1 text-xs text-emerald-800 font-medium">
                                    {{
                                        item.assets
                                            .slice(0, 4)
                                            .map(asset => `${asset.assetName}(${asset.qty})`)
                                            .join(', ')
                                    }}
                                    {{ item.assets.length > 4 ? ', ...' : '' }}
                                </span>
                            </template>

                            <template v-else>-</template>
                        </span>
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
                        @click.stop="openDropdownId = openDropdownId === item._id ? null : item._id" tabindex="0">
                    </i>

                    <div v-if="openDropdownId === item._id"
                        class="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-xl z-50 transition-all duration-200">

                        <router-link :to="`/purchase-asset-detail-mobile/${item._id}`"
                            class="flex items-center gap-2 px-4 py-2 text-sm text-left text-blue-700 hover:bg-emerald-100 transition-colors">
                            <i class="fa-solid fa-eye"></i> {{ $t('View') }}
                        </router-link>

                        <button v-if="canDeletePurchaseAsset()" @click="confirmDelete(item, index)" :class="[
                            'flex items-center gap-2 px-4 py-2 text-sm text-left w-full transition-colors',
                            canDeletePurchaseAsset(item, index)
                                ? 'text-red-600 hover:bg-red-100'
                                : 'text-gray-400 cursor-not-allowed'
                        ]" :title="canDeletePurchaseAsset(item, index)
                            ? 'Delete'
                            : 'Cannot delete - Follow LIFO order'">
                            <i class="fa-solid fa-trash"></i> {{ $t('Delete') }}
                        </button>

                    </div>
                </div>

            </div>
        </div>

        <!-- No Data Message -->
        <div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
            <i class="fa-solid fa-inbox text-4xl mb-4"></i>
            <p>{{ $t('No Data!') }}</p>
        </div>

        <!-- Pagination -->
        <PaginationTwo v-if="purchaseAsset.length > 0" :currentPage="currentPage"
            @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
            @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
            :searchQuery="searchText" />


        <!-- Confirm Delete Dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-6 text-center space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">{{ $t('Confirmation Delete') }}</h2>
                <p class="text-sm text-gray-600">{{ $t('Are you sure you want to delete this item?') }}</p>
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}
</style>