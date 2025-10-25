<script setup>
import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

// Get selectedHistoryId from route params instead of props
const route = useRoute();
const selectedHistoryId = route.params.id;

const emit = defineEmits(['close']);
const branchStore = useBranchStore();
const historyData = ref(null);
const isLoading = ref(true);
const branchData = ref([]);
const userData = ref([]);

const fetchHistoryDetail = async () => {
    try {
        isLoading.value = true;

        if (!selectedHistoryId) {
            console.error("No history ID provided");
            historyData.value = null;
            isLoading.value = false;
            return;
        }

        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: selectedHistoryId }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params, headers: API_CONFIGS.headers });

        if (response.data.data && response.data.data.length > 0) {
            historyData.value = response.data.data[0];
        } else {
            historyData.value = null;
        }

    } catch (error) {
        console.error("Error fetching history data:", error);
        historyData.value = null;
    } finally {
        isLoading.value = false;
    }
};

// Watch for route changes
watch(() => route.params.id, (newId) => {
    if (newId) {
        fetchHistoryDetail();
    }
}, { immediate: true });

const fetchBranches = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching branches:", error);
    }
};

const fetchUsers = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        userData.value = response.data.data || [];
    } catch (error) {
        console.error("Error fetching users:", error);
    }
};

const getBranchName = (branchId) => {
    const branch = branchData.value.find(b => b._id === branchId);
    return branch ? branch.name : branchId || 'N/A';
};

const getUserName = (userId) => {
    const user = userData.value.find(u => u._id === userId);
    return user ? user.fullName || user.username : userId || 'N/A';
};

const formatDate = (dateString) => {
    if (!dateString) return '-';

    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    return new Date(dateString).toLocaleDateString('en-US', options);
};

onMounted(() => {
    fetchBranches();
    fetchUsers();
});
</script>

<template>
    <div>
        <router-link to="/purchase-assets-history"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{$t('Back')}}</span>
        </router-link>

        <div class="bg-white w-full max-w-2xl rounded-md shadow-xl p-6"> <!-- reduced padding from p-8 to p-6 -->
            <!-- Loading state -->
            <div v-if="isLoading" class="py-8 text-center"> <!-- reduced py-12 to py-8 -->
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                <!-- h-10 w-10 to h-8 w-8 -->
                <p class="mt-2 text-gray-600 text-xs">{{$t('Loading history details...')}}</p> <!-- text-xs -->
            </div>

            <!-- Error state -->
            <div v-else-if="!historyData" class="py-8 text-center text-red-600 text-xs"> <!-- py-12 to py-8, text-xs -->
                <p>{{$t('History details not found or failed to load.')}}</p>
            </div>

            <!-- Invoice Layout -->
            <div v-else class="text-gray-800">
                <!-- Header -->
                <div class="flex justify-between items-start mb-6"> <!-- mb-8 to mb-6 -->
                    <div class="flex items-center">
                        <div class="bg-emerald-500 rounded-full h-8 w-8 flex items-center justify-center mr-2">
                            <!-- h-10 w-10 to h-8 w-8, mr-3 to mr-2 -->
                            <i class="fa-solid fa-history text-white text-xs"></i> <!-- text-xs -->
                        </div>
                        <div>
                            <p class="text-xs text-left text-gray-500">{{$t('History')}}</p> <!-- text-xs -->
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-500">{{$t('Branch')}}: {{ getBranchName(historyData.branchId) }}</p>
                        <!-- text-xs to text-2xs (custom, fallback to text-xs) -->
                        <p class="text-sm text-orange-500">{{$t('Date')}}: {{ formatDate(historyData.createdAt) }}</p>
                    </div>
                </div>

                <!-- Order Details Section -->
                <div class="mb-4"> <!-- mb-6 to mb-4 -->
                    <h2 class="text-gray-500 text-xs mb-1 pb-1 border-b border-gray-200">{{$t('Details')}}</h2>
                    <!-- text-sm to text-xs, mb-2 to mb-1 -->
                    <table class="w-full text-xs"> <!-- text-sm to text-xs -->
                        <thead>
                            <tr class="text-left text-gray-500">
                                <th class="py-1">{{$t('CreateBy')}}</th> <!-- py-2 to py-1 -->
                                <th class="py-1">{{$t('Item')}}</th>
                                <th class="py-1 text-center">{{$t('Note')}}</th>
                                <th class="py-1 text-center">{{$t('Quantity')}}</th>
                                <th class="py-1 text-right">{{$t('Price')}}</th>
                                <th class="py-1 text-right">{{$t('Amount')}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b border-gray-100">
                                <td class="py-1">
                                    <div class="font-medium text-left">{{ getUserName(historyData.createdBy) }}</div>
                                </td>
                                <td class="py-1">
                                    <div class="font-medium text-left">{{ historyData.asset.assetName }}</div>
                                </td>
                                <td class="py-1 text-center">{{ historyData.asset.note || '-' }}</td>
                                <td class="py-1 text-center">{{ historyData.asset.qty }}</td>
                                <td class="py-1 text-right">
                                    {{ new Intl.NumberFormat('en-US').format(historyData.asset.price) }}
                                    {{ historyData.asset.currency?.symbol?.symbol || '' }}
                                </td>
                                <td class="py-1 text-right font-medium">
                                    {{ new Intl.NumberFormat('en-US').format(historyData.asset.totalPrice) }}
                                    {{ historyData.asset.currency?.symbol?.symbol || '' }}
                                </td>
                            </tr>

                            <!-- Show cutting stocks as additional items if present -->
                            <tr v-for="(stock, index) in historyData.cuttingStocks" :key="index"
                                class="border-b border-gray-100 text-red-600">
                                <td class="py-1">
                                    <div class="font-medium text-left">{{$t('Cutting Stock')}}</div>
                                </td>
                                <td class="py-1 text-center">{{ stock.ref || '-' }}</td>
                                <td class="py-1 text-center">{{ stock.amount || 0 }}</td>
                                <td class="py-1 text-right">-</td>
                                <td class="py-1 text-right font-medium">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Total section -->
                <div class="mb-6"> <!-- mb-8 to mb-6 -->
                    <div class="w-full flex flex-col items-end">
                        <div class="w-2/3 flex justify-between py-1">
                            <span class="text-gray-600 text-sm">{{$t('Total')}} ({{ historyData.asset.currency?.name || ''
                                }}):</span>
                            <span class="font-bold text-emerald-600 text-sm">
                                {{ new Intl.NumberFormat('en-US').format(historyData.asset.totalPrice) }}
                                {{ historyData.asset.currency?.symbol?.symbol || '' }}
                            </span>
                        </div>

                        <!-- Show remaining quantity after cutting if applicable -->
                        <!-- <div v-if="historyData.cuttingStocks && historyData.cuttingStocks.length > 0"
                            class="w-1/3 flex justify-between py-1">
                            <span class="text-gray-600">Remaining:</span>
                            <span class="font-bold" :class="historyData.status ? 'text-red-600' : 'text-green-600'">
                                {{historyData.asset.qty - historyData.cuttingStocks.reduce((sum, stock) => sum +
                                    (stock.amount || 0), 0)}}
                            </span>
                        </div> -->
                    </div>
                </div>
            </div>

            <!-- Footer button - only show if not in invoice layout -->
            <div v-if="isLoading || !historyData" class="mt-4 text-right"> <!-- mt-6 to mt-4 -->
                <RouterLink to="/purchase-assets-history"
                    class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded hidden md:block text-xs">
                    <!-- px-4 py-2 to px-3 py-1, text-xs -->
                    Close
                </RouterLink>
            </div>
        </div>
    </div>

</template>