<script setup>
import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import { onMounted, ref, watch } from 'vue';

// Define props to accept history ID from parent component
const props = defineProps({
  selectedHistoryId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close']);
const branchStore = useBranchStore();
const historyData = ref(null);
const isLoading = ref(true);
const branchData = ref([]);
const userData = ref([]);

const fetchHistoryDetail = async () => {
  try {
    isLoading.value = true;

    if (!props.selectedHistoryId) {
      console.error("No history ID provided");
      historyData.value = null;
      isLoading.value = false;
      return;
    }

    const params = {
      dynamicConditions: JSON.stringify([
        { field: '_id', operator: '==', value: props.selectedHistoryId }
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

watch(() => props.selectedHistoryId, (newId) => {
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
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50 overflow-auto">
    <div class="bg-white w-full max-w-2xl rounded-md shadow-xl p-8">
      <!-- Loading state -->
      <div v-if="isLoading" class="py-12 text-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading history details...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="!historyData" class="py-12 text-center text-red-600">
        <p>History details not found or failed to load.</p>
      </div>

      <!-- Invoice Layout -->
      <div v-else class="text-gray-800">
        <!-- Header -->
        <div class="flex justify-between items-start mb-8">
          <div class="flex items-center">
            <div class="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center mr-3">
              <i class="fa-solid fa-history text-white"></i>
            </div>
            <div>
              <p class="text-md text-gray-500">Purchase Asset History</p>
            </div>
          </div>
          <div class="text-center">
            <p class="text-xs text-gray-500">Branch: {{ getBranchName(historyData.branchId) }}</p>
            <p class="text-xs text-gray-500">Date: {{ formatDate(historyData.createdAt) }}</p>
          </div>
          <i class="fa-solid fa-xmark text-gray-500 hover:text-red-600 text-xl cursor-pointer"
            @click="$emit('close')"></i>
        </div>

        <!-- Order Details Section -->
        <div class="mb-6">
          <h2 class="text-gray-500 text-sm mb-2 pb-1 border-b border-gray-200">Details</h2>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="py-2">CreatedBy</th>
                <th class="py-2">Item</th>
                <th class="py-2 text-center">Note</th>
                <th class="py-2 text-center">Quantity</th>
                <th class="py-2 text-right">Unit Price</th>
                <th class="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="py-2">
                  <div class="font-medium text-left">{{ getUserName(historyData.createdBy) }}</div>
                </td>
                <td class="py-2">
                  <div class="font-medium text-left">{{ historyData.asset.assetName }}</div>
                </td>
                <td class="py-2 text-center">{{ historyData.asset.note || '-' }}</td>
                <td class="py-2 text-center">{{ historyData.asset.qty }}</td>
                <td class="py-2 text-right">
                  {{ new Intl.NumberFormat('en-US').format(historyData.asset.price) }}
                  {{ historyData.asset.currency?.symbol?.symbol || '' }}
                </td>
                <td class="py-2 text-right font-medium">
                  {{ new Intl.NumberFormat('en-US').format(historyData.asset.totalPrice) }}
                  {{ historyData.asset.currency?.symbol?.symbol || '' }}
                </td>
              </tr>

              <!-- Show cutting stocks as additional items if present -->
              <!-- <tr v-for="(stock, index) in historyData.cuttingStocks" :key="index" 
                  class="border-b border-gray-100 text-red-600">
                <td class="py-2">
                  <div class="font-medium text-left">Cutting Stock</div>
                </td>
                <td class="py-2 text-center">{{ stock.ref || '-' }}</td>
                <td class="py-2 text-center">{{ stock.amount || 0 }}</td>
                <td class="py-2 text-right">-</td>
                <td class="py-2 text-right font-medium">-</td>
              </tr> -->
            </tbody>
          </table>
        </div>

        <!-- Total section -->
        <div class="mb-8">
          <div class="w-full flex flex-col items-end">
            <div class="w-1/3 flex justify-between py-1">
              <span class="text-gray-600">Total ({{ historyData.asset.currency?.name || '' }}):</span>
              <span class="font-bold text-emerald-600">
                {{ new Intl.NumberFormat('en-US').format(historyData.asset.totalPrice) }}
                {{ historyData.asset.currency?.symbol?.symbol || '' }}
              </span>
            </div>

            <!-- Show remaining quantity after cutting if applicable -->
            <!-- <div v-if="historyData.cuttingStocks && historyData.cuttingStocks.length > 0" class="w-1/3 flex justify-between py-1">
              <span class="text-gray-600">Remaining:</span>
              <span class="font-bold" :class="historyData.status ? 'text-red-600' : 'text-green-600'">
                {{ historyData.asset.qty - historyData.cuttingStocks.reduce((sum, stock) => sum + (stock.amount || 0), 0) }}
              </span>
            </div> -->
          </div>
        </div>
      </div>

      <!-- Footer button - only show if not in invoice layout -->
      <div v-if="isLoading || !historyData" class="mt-6 text-right">
        <button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded" @click="$emit('close')">
          Close
        </button>
      </div>
    </div>
  </div>
</template>