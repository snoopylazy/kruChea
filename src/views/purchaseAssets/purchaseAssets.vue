<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import PurchaseAssets from '@/components/PurchaseAssetsForm.vue';
import PurchaseDetail from '@/components/PurchaseDetail.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from "@/composable/timestamp";
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import Select from 'primevue/select';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ErrorMessage from '../../components/ErrorMessage.vue';
import SuccessMessage from '../../components/SuccessMessage.vue';
import ConfirmationDeleteMessage from '../../components/VerifyDelete.vue';
import PurchaseAssetsMobileScreen from '../Mobile/transactionAssets/PurchaseAssets.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const showConfirmDialog = ref(false);
const pendingDeleteId = ref(null);
const branchStore = useBranchStore();

// Sound effects
const successAudio = new Audio("/sounds/successSounds.mp3");
const errorAudio = new Audio("/sounds/errorSounds.mp3");

// Modal
const showPurchaseAssets = ref(false)
const showDetailModal = ref(false)
const purchaseAsset = ref([])
const isLoading = ref(false);
const searchQuery = ref('');
const limitedPerPage = ref(10);
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);
const searchText = ref('');
const userData = ref([])
const loading = ref(false);
const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);
// Add paginationKey for refresh
const paginationKey = ref(0);
const employeeData = ref([]); // For storing user data
const formSelectedEmployee = ref(null);
const companyAssetData = ref([]); // For storing company asset data
const selectAssetData = ref(null);


// Add this ref to track the newest items
const newestPurchases = ref({});

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


const handleListenToPagination = (items) => {
    purchaseAsset.value = items || [];
};

const handleListenIsLoading = (status) => {

    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}



// Function to refresh pagination
const refreshPagination = () => {
    paginationKey.value++;
};

// create Modal
function showModal() {
    showPurchaseAssets.value = true
}

//show detail
const selectedPurchaseId = ref(null);
const showDetail = (purchaseId) => {
    selectedPurchaseId.value = purchaseId;
    showDetailModal.value = true;
}



const handleSearch = () => {
    fetchPurchaseAsset();
};

const clearFilter = () => {
    formSelectedEmployee.value = '';
    selectAssetData.value = '';
    fetchPurchaseAsset()
};



const fetchAsset = async () => {
    try {
        // const params = {
        //     dynamicConditions: JSON.stringify([
        //         { field: 'branchId', operator: '==', value: branchStore.getBranchId },
        //     ]),
        // };
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
        // Add label property for Select

        userData.value = (response.data.data || []).map(user => ({
            ...user,
            label: user.displayName || user.userName || '',
        }));
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
};




const fetchPurchaseAsset = async () => {
    try {

        const dynamicConditions = [
            { field: 'branchId', operator: '==', value: branchStore.getBranchId }
        ];
        if (formSelectedEmployee.value) {
            dynamicConditions.push({ field: 'createdBy', operator: '==', value: formSelectedEmployee.value });
        }
        if (selectAssetData.value) {
            dynamicConditions.push({ field: 'assetIds', operator: 'arrayContains', value: selectAssetData.value._id });
        }

        const params = {
            populate: JSON.stringify(['createdBy']),
            dynamicConditions: JSON.stringify(dynamicConditions),
            sortOrder: 'desc'
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params, headers: API_CONFIGS.headers });
        purchaseAsset.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching purchase assets:', error);
    }
};


// Confirm Delete
const openConfirmDialog = (id) => {
    pendingDeleteId.value = id;
    showConfirmDialog.value = true;
};


const handleDeleteConfirmation = async () => {
    if (!pendingDeleteId.value) return;
    errorMessage.value = '';
    showErrorMessage.value = false;

    try {
        loading.value = true;
        showConfirmDialog.value = false;

        // Get purchase data to check
        const purchaseToDelete = purchaseAsset.value.find(item => item._id === pendingDeleteId.value);

        if (!purchaseToDelete) {
            throw new Error("Purchase not found");
        }

        // Check if the assets can be deleted
        const usageResult = await checkAssetUsage(purchaseToDelete);

        if (!usageResult.canDelete) {
            // Cannot delete due to existing transactions or transfers
            errorMessage.value = usageResult.message;
            showErrorMessage.value = true;
            try {
                errorAudio.play();
            } catch (audioError) {
                console.warn("Could not play error audio:", audioError);
            }
            // Note: ErrorMessage component handles auto-hiding with duration prop
            return;
        }

        // Continue with deletion if it's safe to delete
        await deletePurchaseAsset(pendingDeleteId.value);

        successMessage.value = "Successfully deleted";
        showSuccessMessage.value = true;
        try {
            successAudio.play();
        } catch (audioError) {
            console.warn("Could not play success audio:", audioError);
        }
        // Emit socket event for real-time delete
        socket.emit('dataUpdate', { collection: 'PurchaseAsset', action: 'delete', data: pendingDeleteId.value });
        // Note: SuccessMessage component handles auto-hiding with duration prop
        refreshPagination();

    } catch (error) {
        console.error("Error deleting purchase asset:", error);
        errorMessage.value = error.message || "Failed to delete purchase asset. Please try again.";
        showErrorMessage.value = true;
        try {
            errorAudio.play();
        } catch (audioError) {
            console.warn("Could not play error audio:", audioError);
        }
        // Note: ErrorMessage component handles auto-hiding with duration prop
    } finally {
        loading.value = false;
        pendingDeleteId.value = null;
    }
};


// Check if assets have related transactions or stock transfers
const checkAssetUsage = async (purchaseData) => {
    try {
        if (!purchaseData || !purchaseData.assets || purchaseData.assets.length === 0) {
            return { canDelete: false, message: "No assets found in purchase data" };
        }

        const purchaseCreatedAt = new Date(purchaseData.createdAt);
        let errorMessages = [];

        for (const purchasedAsset of purchaseData.assets) {
            const assetId = purchasedAsset.assetId;

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

            const transferParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'assetsTransferId', operator: 'arrayContains', value: assetId }
                ])
            };
            const transferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params: transferParams, headers: API_CONFIGS.headers });
            const transfers = (transferResponse.data.data || []).filter(tran => tran.createdAt && new Date(tran.createdAt) > purchaseCreatedAt);
            let totalTransferQty = 0;
            for (const transfer of transfers) {
                if (transfer.assetsTransfer && Array.isArray(transfer.assetsTransfer)) {
                    const assetTransfer = transfer.assetsTransfer.find(a => a.assetId === assetId);
                    if (assetTransfer) totalTransferQty += parseInt(assetTransfer.qty) || 0;
                }
            }

            // Collect error for this asset if cannot delete
            if ((totalTransactionQty + totalTransferQty) > totalStockBefore) {
                errorMessages.push(
                    `Cannot delete: The asset '${purchasedAsset.assetName}' has been used in transactions or stock transfers after this purchase.`
                );
            }
        }

        // If there are any errors, return them all
        if (errorMessages.length > 0) {
            return {
                canDelete: false,
                message: errorMessages.join('\n')
            };
        }

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
        //     axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CashJournalTemp/${journal._id}`, { headers: API_CONFIGS.headers })
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

        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/PurchaseAsset/${id}`, { headers: API_CONFIGS.headers });
        purchaseAsset.value = purchaseAsset.value.filter(item => item._id !== id);


        // Emit socket event for real-time delete
        // socket.emit('dataUpdate', { collection: 'PurchaseAsset', action: 'delete', data: response.data.data?._id });


    } catch (error) {
        console.error('Error deleting purchase asset and updating inventory:', error);
    } finally {
        isLoading.value = false;
    }
};

const canDeletePurchase = (item, index) => {
    return index === 0;
};

const setupSocketListeners = () => {
    socket.off('dataUpdate');
    socket.on('dataUpdate', async (data) => {
        if (data.collection === 'PurchaseAsset') {
            await fetchPurchaseAsset();
        }
    });
};

watch(showPurchaseAssets, (val, oldVal) => {
    // When modal closes (from true to false), refresh data
    if (oldVal === true && val === false) {
        fetchPurchaseAsset();
        refreshPagination();
    }
});


onMounted(() => {
    fetchUser();
    fetchAsset();
    setupSocketListeners();
});


onBeforeUnmount(() => {
    socket.off("dataUpdate");
});

const {
    canCreatePurchase,
    canViewPurchase,
    canDeletePurchaseAsset
} = useUserPermission();


</script>

<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">{{$t('Purchase Asset')}}</p>

        <div class="flex flex-col md:flex-row justify-between items-center mt-4 gap-4 text-left">
            <!-- Dropdown ជួរ -->
            <div class="card flex justify-start gap-4 items-center">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <div class="text-left w-full md:w-60 flex gap-4">
                    <!-- <Select v-model="formSelectedEmployee" :options="employeeData" optionLabel="displayName"
                        optionValue="_id" placeholder="Select Employee" class="w-full" :filter="true" /> -->

                    <Select v-model="formSelectedEmployee" :options="userData" optionLabel="label" optionValue="_id"
                        :placeholder="$t('Employee')" class="w-full" :filter="true" />

                    <Select v-model="selectAssetData" :options="companyAssetData" optionLabel="name"
                        :placeholder="$t('Select transaction')" class="w-full" filter />


                    <div class="flex  gap-4">
                        <button @click="clearFilter"
                            class=" my-auto bg-gradient-to-br from-blue-400 to-blue-600 text-black px-4 py-2 rounded-md hover:from-blue-400 hover:to-blue-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50">{{$t('Clear')}}</button>
                        <button @click="handleSearch"
                            class="my-auto bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">{{$t('Show')}}</button>
                    </div>

                </div>
            </div>
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

            <!--  Transfer Button (permission) -->
            <button v-if="canCreatePurchase()" class="bg-gradient-to-br from-green-400 to-green-700 text-white px-4 py-2 rounded-md 
              hover:from-green-500 hover:to-green-600 text-xs transition-all duration-300 shadow-md 
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                @click="showModal">
                + {{$t('Create New')}}
            </button>
        </div>

        <!-- Table (permission) -->
        <div v-if="canViewPurchase()" class="overflow-x-auto mt-3 relative">
            <div v-if="isLoading == true"
                class="absolute inset-0  bg-opacity-70 flex items-center justify-center z-10 mt-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
            <table class="min-w-full border-collapse border border-gray-400 p-2"
                :class="{ 'opacity-50': isLoading == true }">
                <thead class="bg-gray-100 text-xs">
                    <tr>
                        <th class="border border-gray-300 p-2">{{$t('No')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Purchase By')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Asset Name')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Quantity')}}</th>
                        <!-- <th class="border border-gray-300 p-2">Price</th> -->
                        <!-- <th class="border border-gray-300 p-2">Branch</th> -->
                        <th class="border border-gray-300 p-2">{{$t('CreateAt')}}</th>
                        <!-- <th class="border border-gray-300 p-2">Description</th> -->
                        <th class="border border-gray-300 p-2">{{$t('Actions')}}</th>
                    </tr>
                </thead>
                <tbody v-if="purchaseAsset.length > 0" class="text-sm">
                    <tr v-for="(item, index) in purchaseAsset" :key="index"
                        class="hover:bg-emerald-100 transition-colors duration-200">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">{{ item.createdBy?.displayName || '' }}</td>
                        <td class="border border-gray-300 p-2">
                            <span v-if="item.assets && item.assets.length > 0">
                                {{item.assets.map(asset => asset.assetName).slice(0, 4).join(', ')}}
                                {{ item.assets.length > 4 ? '...' : '' }}
                            </span>
                        </td>
                        <td class="border border-gray-300 p-2">
                            <!-- <div v-if="item.assets && item.assets.length > 0"
                                class="flex flex-wrap gap-1 justify-center">
                                <div v-for="(asset, i) in item.assets" :key="i"
                                    class="flex items-center justify-center bg-emerald-100 px-2 py-0.5 rounded-md text-xs min-w-[30px]">
                                    <span class="text-emerald-800 font-medium">{{ asset.qty }}</span>
                                </div>
                            </div> -->
                            <div v-if="item.assets && item.assets.length > 0"
                                class="flex flex-wrap gap-2 justify-start text-left">

                                <!-- Show up to 4 assets -->
                                <div v-for="(asset, i) in item.assets.slice(0, 4)" :key="i"
                                    class="flex items-center bg-gray-100 text-emerald-800 px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                                    {{ asset.assetName }} ({{ asset.qty }})
                                </div>

                                <!-- Show ellipsis if more than 4 assets -->
                                <div v-if="item.assets.length > 4"
                                    class="flex items-center bg-gray-200 text-gray-600 px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                                    +{{ item.assets.length - 4 }} more
                                </div>
                            </div>


                            <div v-else class="text-center">-</div>
                        </td>
                        <!-- <td class="border border-gray-300 p-2">
                         
                            <div v-for="(asset, i) in item.assets" :key="i" class="text-left">
                                {{ asset.totalPrice }} {{ asset.currency?.symbol?.symbol || '' }}

                            </div>
                        </td> -->
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <!-- <td class="border border-gray-300 p-2">{{ }}</td> -->
                        <!-- <td class="border border-gray-300 p-2">{{  }}</td> -->
                        <td class="flex text-center justify-center p-2 mt-1">
                            <i class="fa-solid fa-eye cursor-pointer text-orange-500 mr-2 hover:text-orange-600 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="showDetail(item._id)"></i>
                            <!-- Add LIFO deletion rules with visual indicator -->
                            <i v-if="canDeletePurchaseAsset()"
                                @click="canDeletePurchase(item, index) ? openConfirmDialog(item._id) : null" :class="[
                                    'fa-solid fa-trash cursor-pointer ml-2',
                                    canDeletePurchase(item, index)
                                        ? 'text-red-600 hover:text-red-700 hover:scale-125 transform transition duration-150 ease-in-out'
                                        : 'text-gray-400 cursor-not-allowed hover:scale-125 transform transition duration-150 ease-in-out'
                                ]"
                                :title="canDeletePurchase(item, index) ? 'Delete' : 'Cannot delete - Follow LIFO order'"></i>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500 ">
                        <td colspan="10" class="font-khmer text-center  text-lg">
                            {{$t('No Data!')}}
                        </td>
                    </tr>
                </tbody>
            </table>
            <!-- Pagination Component -->
            <PaginationTwo :key="paginationKey" :currentPage="currentPage"
                @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
                @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
                :searchQuery="searchText" />

        </div>
    </div>
    <!-- Copy assets Form -->
    <PurchaseAssets v-if="showPurchaseAssets" @close="showPurchaseAssets = false" />
    <PurchaseDetail v-if="showDetailModal" :purchaseId="selectedPurchaseId" @close="showDetailModal = false" />

    <!-- Confrm Message -->
    <ConfirmationDeleteMessage :show="showConfirmDialog" @cancel="showConfirmDialog = false"
        @confirm="handleDeleteConfirmation" />

    <!-- Success Message -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" :duration="800" />

    <!-- Error Message -->
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" :duration="5000" />

    <!-- Mobile  Layout -->
    <PurchaseAssetsMobileScreen class="block md:hidden" />
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