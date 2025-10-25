<script setup>
import { ref, onMounted } from 'vue';
import { useBranchStore } from '@/store/branchStore';
import API_CONFIGS from '@/api/config';
import axios from 'axios';

const branchStore = useBranchStore();
const isLoading = ref(false);
const tableData = ref([]);
const branches = ref({});

const props = defineProps({
    transferId: {
        type: String,
        default: null
    }
});

// Format date helper function
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Get branch name by ID
const getBranchName = (branchId) => {
    return branches.value[branchId]?.abbreviation || branches.value[branchId]?.name || '?';
};

// Get first asset name from a transfer
const getAssetName = (transfer) => {
    if (transfer.assetsTransfer && transfer.assetsTransfer.length > 0) {
        return transfer.assetsTransfer[0].assetName;
    }
    return 'Unknown';
};

// Get total quantity from a transfer
const getTotalQuantity = (transfer) => {
    if (!transfer.assetsTransfer || transfer.assetsTransfer.length === 0) return 0;
    return transfer.assetsTransfer.reduce((sum, asset) => sum + (parseInt(asset.qty) || 0), 0);
};

const fetchBranches = async () => {
    try {

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        const branchList = response.data.data || [];

        // Convert array to object for quick lookup
        branches.value = {};
        branchList.forEach(branch => {
            branches.value[branch._id] = branch;
        });
    } catch (error) {
        console.error("Error fetching branches:", error);
    }
};

const fetchTransferStock = async () => {
    isLoading.value = true;

    try {

        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: props.transferId }
            ])
        }

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params, headers: API_CONFIGS.headers });
        tableData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching transfer stock:', error);
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    fetchBranches();
    fetchTransferStock();
});
</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-2 z-50">
        <div class="bg-white p-6 rounded-md shadow-lg w-1/2">
            <div class="flex justify-between items-center pb-2 mb-4 border-b-2">
                <p>Transfer details</p>
                <i class="fa-solid fa-circle-xmark cursor-pointer hover:text-red-500 text-red-700 text-end text-lg top-3 right-3"
                    @click="$emit('close')"></i>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto mt-3">
                <div v-if="isLoading"
                    class="absolute inset-0 bg-opacity-70 flex items-center justify-center z-10 mt-10">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
                <table class="min-w-full border-collapse border border-gray-400 p-2 text-center"
                    :class="{ 'opacity-50': isLoading }">
                    <thead class="bg-gray-100 text-xs">
                        <tr>
                            <th class="border border-gray-300 p-2">ID</th>
                            <th class="border border-gray-300 p-2">From</th>
                            <th class="border border-gray-300 p-2">Name</th>
                            <th class="border border-gray-300 p-2">Quantity</th>
                            <th class="border border-gray-300 p-2">To</th>
                            <th class="border border-gray-300 p-2">CreateAt</th>
                            <th class="border border-gray-300 p-2">Description</th>
                        </tr>
                    </thead>
                    <tbody v-if="tableData.length > 0" class="text-sm">
                        <tr v-for="(item, index) in tableData" :key="item._id">
                            <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                            <td class="border border-gray-300 p-2">{{ getBranchName(item.fromBranchId) }}</td>
                            <td class="border border-gray-300 p-2">{{ getAssetName(item) }}</td>
                            <td class="border border-gray-300 p-2">{{ getTotalQuantity(item) }}</td>
                            <td class="border border-gray-300 p-2">{{ getBranchName(item.toBranchId) }}</td>
                            <td class="border border-gray-300 p-2">{{ formatDate(item.createdAt) }}</td>
                            <td class="border border-gray-300 p-2">{{ item.description || '-' }}</td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr class="[&>*]:border [&>*]:p-3 text-gray-500">
                            <td colspan="7" class="font-khmer text-center text-lg">
                                Not found!
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div class="mt-6 text-right">
                <button class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
                    @click="$emit('close')">
                    Close
                </button>
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