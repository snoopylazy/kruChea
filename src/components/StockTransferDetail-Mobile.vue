<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';

const route = useRoute();
const transferId = ref(route.params.id); // ✅ get from route
const isLoading = ref(false);
const tableData = ref([]);
const branches = ref({});

const branchStore = useBranchStore();

// 🟢 Format date
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// 🟢 Branch name
const getBranchName = (branchId) => {
    return branches.value[branchId]?.abbreviation || branches.value[branchId]?.name || '?';
};

// 🟢 Get asset name
const getAssetName = (transfer) => {
    if (transfer.assetsTransfer && transfer.assetsTransfer.length > 0) {
        return transfer.assetsTransfer[0].assetName;
    }
    return 'Unknown';
};

// 🟢 Get quantity
const getTotalQuantity = (transfer) => {
    if (!transfer.assetsTransfer || transfer.assetsTransfer.length === 0) return 0;
    return transfer.assetsTransfer.reduce((sum, asset) => sum + (parseInt(asset.qty) || 0), 0);
};

// 🟢 Load branches
const fetchBranches = async () => {
    try {
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        const branchList = response.data.data || [];
        branches.value = {};
        branchList.forEach(branch => {
            branches.value[branch._id] = branch;
        });
    } catch (error) {
        console.error("❌ Error fetching branches:", error);
    }
};

// 🟢 Load transfer by ID
const fetchTransferStock = async () => {
    isLoading.value = true;
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: transferId.value }
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params, headers: API_CONFIGS.headers });
        tableData.value = response.data.data || [];
    } catch (error) {
        console.error('❌ Error fetching transfer stock:', error);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    console.log("✅ Route transferId:", transferId.value);
    fetchBranches();
    fetchTransferStock();
});
</script>

<template>
    <div>
        <!-- Back Button -->
        <router-link to="/stock-transfer"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Transfer Detail</span>
        </router-link>

        <!-- Main Card -->
        <div class="bg-white w-full max-w-2xl rounded-md shadow-xl p-8 mx-auto">
            <!-- Loading -->
            <div v-if="isLoading" class="py-12 text-center">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">Loading transfer details...</p>
            </div>

            <!-- Empty -->
            <div v-else-if="tableData.length === 0" class="py-12 text-center text-red-600">
                Transfer details not found or failed to load.
            </div>

            <!-- Success layout -->
            <div v-else class="text-gray-800">
                <!-- Header -->
                <div class="flex justify-between items-start mb-8">
                    <div class="flex items-center">
                        <div class="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                            <i class="fa-solid fa-arrow-right-arrow-left text-white"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold">Stock Transfer</h1>
                            <p class="text-sm text-gray-500">Internal Asset Movement</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500">Created At: {{ formatDate(tableData[0]?.createdAt) }}</p>
                    </div>
                </div>

                <!-- Table -->
                <div class="mb-6">
                    <h2 class="text-gray-500 text-sm mb-2 pb-1 border-b border-gray-200">Transfer Details</h2>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-500">
                                <th class="py-2">#</th>
                                <th class="py-2 text-center">From</th>
                                <th class="py-2 text-center">To</th>
                                <th class="py-2">Asset</th>
                                <th class="py-2 text-center">Qty</th>
                                <th class="py-2 text-center">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in tableData" :key="item._id" class="border-b border-gray-100">
                                <td class="py-2">{{ index + 1 }}</td>
                                <td class="py-2 text-center">{{ getBranchName(item.fromBranchId) }}</td>
                                <td class="py-2 text-center">{{ getBranchName(item.toBranchId) }}</td>
                                <td class="py-2">{{ getAssetName(item) }}</td>
                                <td class="py-2 text-center">{{ getTotalQuantity(item) }}</td>
                                <td class="py-2 text-center">{{ item.description || '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Footer -->
                <div class="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
                    <p>
                        Total Items Transferred:
                        {{tableData.reduce((sum, item) => sum + getTotalQuantity(item), 0)}}
                    </p>
                </div>

                <!-- Back -->
                <div class="mt-6 text-center">
                    <RouterLink to="/stock-transfer"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
                        Back
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
tbody tr:nth-child(even) {
    background-color: #34D399;
    color: white;
}

.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #34D399;
    border-radius: 20px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #10B981;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #dcfce7;
}

.overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: #34D399 #dcfce7;
}
</style>
