<script setup>
import API_CONFIGS from '@/api/config';
import { getNextNumberId } from '@/composable/getNextId';
import { fetchTimestamp } from "@/composable/timestamp";
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import { onMounted, ref, watch } from 'vue';
import ErrorMessage from '../components/ErrorMessage.vue';
import SuccessMessage from '../components/SuccessMessage.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const emit = defineEmits(['close']);
const branchStore = useBranchStore();


// Reactive state for form data
// const formErrors = reactive({
//   submit: null,
//   toBranch: null,
//   assets: null,
//   assetErrors: []
// });

const isLoading = ref(false);
const submitSuccess = ref(false);
const fromBranch = ref(null);
const toBranches = ref([]);
const assets = ref([{
  selectedAsset: null,
  quantity: null
}]);
const availableAssets = ref([]);
const remark = ref('');

const selectedToBranches = ref([]);

const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);

async function fetchBranchData() {
  try {
    const params = {
      dynamicConditions: JSON.stringify([
        { field: 'status', operator: '==', value: true }
      ])
    };

    const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
    const branches = response.data.data || [];

    fromBranch.value = branches.find(b => b._id === branchStore.branchId) || null;

    toBranches.value = branches.filter(b => b._id !== branchStore.branchId);
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    formErrors.submit = "Failed to load branches. Please try again.";
  }
}

// Fetch assets
async function fetchAssets() {
  try {
    const params = {
      dynamicConditions: JSON.stringify([
        { field: 'status', operator: '==', value: true },
        { field: 'branchId', operator: '==', value: branchStore.branchId }
      ])
    };

    const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
    availableAssets.value = response.data.data || [];
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    formErrors.submit = "Failed to load assets. Please try again.";
  }
}





// Add these methods
const addAsset = () => {
  assets.value.push({
    selectedAsset: null,
    quantity: null
  });
};

const removeAsset = (index) => {
  if (assets.value.length > 1) {
    assets.value.splice(index, 1);
  }
};

const getMaxQuantity = (assetId) => {
  const asset = availableAssets.value.find(a => a._id === assetId);
  return asset?.totalStock || 0;
};

const createStockTransfer = async (transferData) => {
  try {
    const timestamp = await fetchTimestamp();

    // 1. Create Stock Transfer record
    const stockTransferData = {
      fields: {
        fromBranchId: transferData.fromBranchId,
        toBranchId: transferData.toBranchId,
        assetsTransfer: transferData.assets.map(asset => ({
          assetId: asset.id,
          assetName: asset.name,
          qty: asset.quantity,
          price: asset.price || 0,
          category: asset.category,
          note: asset.note || ""
        })),
        assetsTransferId: transferData.assets.map(a => a.id),
        description: transferData.description || "",
        createdBy: transferData.userId,
        createdAt: timestamp
      }
    };

    const transferResponse = await axios.post(
      `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/StockTransfer`,
      stockTransferData,
      { headers: API_CONFIGS.headers }
    );
    const transferId = transferResponse.data.data._id;

    for (const asset of transferData.assets) {
      const sourceAsset = await axios.get(
        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`,
        {
          params: {
            dynamicConditions: JSON.stringify([
              { field: "_id", operator: "==", value: asset.id },
              { field: "branchId", operator: "==", value: transferData.fromBranchId }
            ])
          }, headers: API_CONFIGS.headers
        }
      );

      if (!sourceAsset.data.data?.[0]) continue;

      const currentAsset = sourceAsset.data.data[0];

      const historyParams = {
        dynamicConditions: JSON.stringify([
          { field: "asset.assetId", operator: "==", value: asset.id },
          { field: "branchId", operator: "==", value: transferData.fromBranchId },
          { field: "status", operator: "==", value: false }
        ]),
        sortField: "createdAt",
        sortOrder: "asc"
      };

      const historyResponse = await axios.get(
        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
        { params: historyParams, headers: API_CONFIGS.headers }
      );

      let remainingQuantityToProcess = asset.quantity;
      const historyRecords = historyResponse.data.data || [];
      const cuttingStockIdsForThisAsset = [];

      for (const historyRecord of historyRecords) {
        if (remainingQuantityToProcess <= 0) break;


        let totalAlreadyCut = 0;
        if ((historyRecord.cuttingStockIds || []).length) {
          const cutRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, {
            params: {
              dynamicConditions: JSON.stringify([
                { field: "purchaseAssetHistoryId", operator: "==", value: historyRecord._id }
              ])
            }, headers: API_CONFIGS.headers
          });
          totalAlreadyCut = (cutRes.data.data || []).reduce((sum, cs) => sum + Math.abs(cs.amount), 0);
        }

        const recordRemainingQty = historyRecord.asset.qty - totalAlreadyCut;

        if (recordRemainingQty <= 0) continue;

        const quantityToTakeFromThisRecord = Math.min(remainingQuantityToProcess, recordRemainingQty);
        const willEmptyRecord = quantityToTakeFromThisRecord >= recordRemainingQty;

        const cuttingStockData = {
          fields: {
            branchId: transferData.fromBranchId,
            ref: null,
            purchaseAssetHistoryId: historyRecord._id,
            amount: -quantityToTakeFromThisRecord, // Negative for transfer out
            type: "transfer",
            createdBy: transferData.userId,
            createdAt: timestamp
          }
        };

        const cuttingStockResponse = await axios.post(
          `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
          cuttingStockData,
          { headers: API_CONFIGS.headers }
        );

        // Collect cutting stock IDs for later use in destination purchase history
        cuttingStockIdsForThisAsset.push(cuttingStockResponse.data.data._id);

        const newCuttingStockIds = [
          ...(historyRecord.cuttingStockIds || []),
          cuttingStockResponse.data.data._id,
        ];

        const newRemainingQty = recordRemainingQty - quantityToTakeFromThisRecord;
        const newStatus = newRemainingQty <= 0;

        const requestBody = {
          fields: {
            cuttingStockIds: newCuttingStockIds,
            status: newStatus,
            updatedBy: transferData.userId,
            updatedAt: timestamp
          }
        }

        await axios.patch(
          `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
          requestBody,
          { headers: API_CONFIGS.headers }
        );

        remainingQuantityToProcess -= quantityToTakeFromThisRecord;
      }

      // Update source asset
      await axios.patch(
        `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${currentAsset._id}`,
        {
          fields: {
            totalStock: currentAsset.totalStock - asset.quantity,
            stockTransferId: [...(currentAsset.stockTransferId || []), transferId],
            updatedBy: transferData.userId,
            updatedAt: timestamp
          }
        },
        { headers: API_CONFIGS.headers }
      );

      // Check if the asset is now completely out of stock
      if (currentAsset.totalStock - asset.quantity <= 0) {
        // Mark all remaining history records for this asset as out of stock
        const remainingHistoryParams = {
          dynamicConditions: JSON.stringify([
            { field: "asset.assetId", operator: "==", value: asset.id },
            { field: "branchId", operator: "==", value: transferData.fromBranchId },
            { field: "status", operator: "==", value: false }
          ])
        };

        const remainingHistoryResponse = await axios.get(
          `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
          { params: remainingHistoryParams, headers: API_CONFIGS.headers }
        );

        const remainingRecords = remainingHistoryResponse.data.data || [];
        for (const record of remainingRecords) {
          await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDoc/PurchaseAssetHistory/${record._id}`,
            {
              fields: {
                status: true, // Mark as out of stock
                updatedBy: transferData.userId,
                updatedAt: timestamp
              }
            },
            { headers: API_CONFIGS.headers }
          );
        }
      }

      // 3. Create or update destination asset
      let destinationAssetId;

      let destAsset = null;

      // New logic: Find asset by name in destination branch
      const nameLookup = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
        params: {
          dynamicConditions: JSON.stringify([
            { field: "branchId", operator: "==", value: transferData.toBranchId },
            { field: "name", operator: "==", value: currentAsset.name }
          ])
        }, headers: API_CONFIGS.headers
      });

      if (nameLookup.data.data?.length) {
        destAsset = nameLookup.data.data[0];
      }

      // No more returning to main branch concept
      // Simple flag to check if we're updating an existing asset
      const isExistingAsset = !!destAsset;

      if (destAsset) {
        // UPDATE the existing destination asset (by name match)
        destinationAssetId = destAsset._id;

        await axios.patch(
          `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${destAsset._id}`,
          {
            fields: {
              totalStock: destAsset.totalStock + asset.quantity,
              stockTransferId: [...(destAsset.stockTransferId || []), transferId],
              updatedBy: transferData.userId,
              updatedAt: timestamp
            }
          },
          { headers: API_CONFIGS.headers }
        );

        // We no longer need to reactivate history records
        // Instead, we'll always create a new purchase history for each transfer
        // The old records remain untouched, preserving the correct historical record
      }

      if (!destAsset) {
        // Get the latest asset ID in destination branch
        const params = {
          sortField: 'createdAt',
          sortOrder: 'desc',
          limit: 1,
          dynamicConditions: JSON.stringify([
            { field: 'branchId', operator: '==', value: transferData.toBranchId },
            { field: 'status', operator: '==', value: true },
          ]),
        };

        const existingAssetsResponse = await axios.get(
          `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`,
          { params, headers: API_CONFIGS.headers }
        );

        const lastAsset = existingAssetsResponse.data?.data?.[0];
        const lastId = lastAsset?.idCustom || null;
        const lastNumber = lastId ? lastId.match(/(\d+)$/)?.[0] : null;
        const nextNumber = getNextNumberId(lastNumber);

        const assetName = currentAsset.name.replace(/\s+/g, '').toLowerCase();
        const newIdCustom = `${transferData.toBranchPrefix}-${assetName}-${nextNumber}`;

        // Create new asset in destination branch
        const newAssetData = {
          fields: {
            name: currentAsset.name,
            idCustom: newIdCustom,
            branchId: transferData.toBranchId,
            // No longer track mainTransferId
            stockTransferId: [transferId],
            copyAssetTransactionId: transferId,
            totalStock: asset.quantity,
            purchasePrice: currentAsset.purchasePrice || 0,
            category: currentAsset.category,
            description: currentAsset.description || "",
            status: true,
            createdBy: branchStore.getUserId,
            createdAt: timestamp
          }
        };

        const newAssetResponse = await axios.post(
          `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAsset`,
          newAssetData,
          { headers: API_CONFIGS.headers }
        );
        destinationAssetId = newAssetResponse.data.data._id;
      }

      // Always create a purchase-history row for the transferred asset
      // This ensures we track the transfer history regardless of destination
      const purchaseHistoryData = {
        fields: {
          asset: {
            assetId: destinationAssetId,
            assetName: currentAsset.name,
            price: currentAsset.purchasePrice || 0,
            qty: asset.quantity,
            note: ""
          },
          purchaseAssetId: null,
          branchId: transferData.toBranchId,
          stockTransferId: transferId,
          cuttingStockIds: cuttingStockIdsForThisAsset,
          status: false,
          isPurchase: false,
          isTransfer: true,
          createdBy: branchStore.getUserId,
          createdAt: timestamp
        }
      };

      await axios.post(
        `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/PurchaseAssetHistory`,
        purchaseHistoryData,
        { headers: API_CONFIGS.headers }
      );
    }

    // Final verification to ensure all records have correct status
    await verifyAllAssetStatuses(transferData.assets, transferData.fromBranchId, transferData.userId);

    return transferResponse.data.data;
  } catch (error) {
    console.error("Error in stock transfer:", error);
    throw error;
  }
};

// Add a function to verify all asset statuses after transfer
const verifyAllAssetStatuses = async (assets, fromBranchId, userId) => {
  try {
    const timestamp = await fetchTimestamp();

    for (const asset of assets) {
      // Get the company asset to check total stock
      const assetParams = {
        dynamicConditions: JSON.stringify([
          { field: "_id", operator: "==", value: asset.id },
          { field: "branchId", operator: "==", value: fromBranchId }
        ])
      };

      const assetResponse = await axios.get(
        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`,
        { params: assetParams, headers: API_CONFIGS.headers }
      );

      const companyAsset = assetResponse.data.data?.[0];
      if (!companyAsset) continue;

      // If total stock is zero, mark all history records as out of stock
      if (companyAsset.totalStock <= 0) {
        const historyParams = {
          dynamicConditions: JSON.stringify([
            { field: "asset.assetId", operator: "==", value: asset.id },
            { field: "branchId", operator: "==", value: fromBranchId },
            { field: "status", operator: "==", value: false }
          ])
        };

        const historyResponse = await axios.get(
          `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
          { params: historyParams, headers: API_CONFIGS.headers }
        );

        const historyRecords = historyResponse.data.data || [];

        for (const record of historyRecords) {
          await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
            {
              fields: {
                status: true, // Mark as out of stock
                updatedBy: userId,
                updatedAt: timestamp
              }
            },
            { headers: API_CONFIGS.headers }
          );
        }
      } else {
        // For the source branch only, we verify that records are properly marked as in/out of stock
        // Only checking current branch records to avoid interference with returned assets
        const historyParams = {
          dynamicConditions: JSON.stringify([
            { field: "asset.assetId", operator: "==", value: asset.id },
            { field: "branchId", operator: "==", value: fromBranchId }
          ]),
          sortField: "createdAt",
          sortOrder: "asc"
        };

        const historyResponse = await axios.get(
          `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
          { params: historyParams, headers: API_CONFIGS.headers }
        );

        const historyRecords = historyResponse.data.data || [];

        for (const record of historyRecords) {
          // Get all cutting stock records for this history record
          const cutParams = {
            dynamicConditions: JSON.stringify([
              { field: "purchaseAssetHistoryId", operator: "==", value: record._id },
            ])
          };

          const cutResponse = await axios.get(
            `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
            { params: cutParams, headers: API_CONFIGS.headers }
          );

          const cuttingStocks = cutResponse.data.data || [];

          // Calculate total amount transferred out or checked out from THIS branch only
          let totalUsed = 0;
          for (const cut of cuttingStocks) {
            if ((cut.type === "transfer" || cut.type === "check-out") && cut.amount < 0) {
              totalUsed += Math.abs(cut.amount);
            }
          }

          // Update status if needed - only mark as out of stock if all quantity is gone
          const shouldBeOutOfStock = totalUsed >= record.asset.qty;
          if (shouldBeOutOfStock !== record.status) {
            await axios.patch(
              `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
              {
                fields: {
                  status: shouldBeOutOfStock,
                  updatedBy: userId,
                  updatedAt: timestamp
                }
              },
              { headers: API_CONFIGS.headers }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error verifying asset statuses:", error);
  }
};

const safeQuantity = (q) => {
  const n = Number(q);
  return isNaN(n) ? 0 : n;
};

// Add this submit handler function
const handleSubmit = async () => {
  try {
    isLoading.value = true;
    successMessage.value = '';
    showSuccessMessage.value = false;
    errorMessage.value = '';
    showErrorMessage.value = false;

    if (!selectedToBranches.value?.length) {
      errorMessage.value = t("Please select at least one destination branch");
      showErrorMessage.value = true;
      return;
    }

    // Check if any selected branch is the same as current branch
    if (selectedToBranches.value.includes(branchStore.branchId)) {
      errorMessage.value = t("Cannot transfer to the same branch");
      showErrorMessage.value = true;
      return;
    }

    if (
      !assets.value.some(
        (a) => a.selectedAsset && safeQuantity(a.quantity) > 0
      )
    ) {
      errorMessage.value = "  ";
      showErrorMessage.value = true;
      return;
    }

    // Loop through all selected branches
    for (const branchId of selectedToBranches.value) {
      const branch = toBranches.value.find(b => b._id === branchId);
      if (!branch) continue;

      const transferData = {
        fromBranchId: branchStore.branchId,
        toBranchId: branchId,
        toBranchPrefix: branch.abbreviation,
        userId: branchStore.getUserId,
        assets: assets.value
          .filter(a => a.selectedAsset && a.quantity > 0)
          .map(a => ({
            id: a.selectedAsset._id,
            name: a.selectedAsset.name,
            quantity: Number(a.quantity),
            price: a.selectedAsset.purchasePrice || 0,
            category: a.selectedAsset.category || {},
            note: ""
          })),
        description: remark.value
      };

            // Create transfer and get result
            const result = await createStockTransfer(transferData);
            // Emit socket event for real-time insert
            if (result && result._id) {
                socket.emit('dataUpdate', { collection: 'StockTransfer', action: 'insert', data: result._id });
            }
    }

    successMessage.value = t("Stock transfer created successfully!");
    showSuccessMessage.value = true;

    setTimeout(() => {
      showSuccessMessage.value = false;
      emit('created');
      emit('close');
    }, 500);

  } catch (error) {
    console.error('Submit error:', error);
    errorMessage.value = error.message || t("Failed to create stock transfer");
    showErrorMessage.value = true;

    setTimeout(() => {
      showErrorMessage.value = false;
    }, 5000);

  } finally {
    isLoading.value = false;
  }
};
// Add clearForm function
const clearForm = () => {
  selectedToBranches.value = [];
  assets.value = [{
    selectedAsset: null,
    quantity: null
  }];
  remark.value = '';
  submitSuccess.value = false;
};

// Watch for branch changes
watch(() => branchStore.branchId, async (newBranchId) => {
  if (newBranchId) {
    await Promise.all([fetchBranchData(), fetchAssets()]);
  }
});

// Initialize on mount
onMounted(async () => {
  await Promise.all([fetchBranchData(), fetchAssets()]);
});

</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-4 z-50 font-khmer overflow-y-auto">
    <div class="bg-white p-6 rounded-xl shadow-lg w-[90%] md:w-[60%] lg:w-[45%] space-y-6">
      <!-- Modal Header with Close Button -->
      <div class="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-800">{{$t('Create Stock Transfer')}}</h3>
        <button @click="emit('close')" class="text-gray-500 hover:text-gray-700 focus:outline-none">
          <i class="fa-solid fa-times text-lg"></i>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Success message -->
          <div v-if="submitSuccess" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            <div class="flex items-center">
              <i class="fas fa-check-circle mr-2"></i>
              <span>{{$t('Transfer created successfully!')}}</span>
            </div>
          </div>

          <!-- General error message -->
          <!-- <div v-if="formErrors.submit" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <div class="flex items-center">
              <i class="fas fa-exclamation-circle mr-2"></i>
              <span>{{ formErrors.submit }}</span>
            </div>
          </div> -->

          <!-- Loading overlay -->
          <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div class="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
              <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500 mb-3"></div>
              <p>{{$t('Processing...')}}</p>
            </div>
          </div>

          <!-- Branch Selection -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- From Branch -->
            <div>
              <label class="block text-xs text-gray-700 text-left mb-1">{{$t('From')}} <span class="text-red-500">*</span></label>
              <div class="border border-gray-300 p-2 rounded-md bg-gray-50">
                {{ fromBranch?.abbreviation || "Current Branch" }}
              </div>
            </div>

            <!-- To Branch -->
            <div>
              <label class="block text-xs text-gray-700 text-left mb-1">{{$t('To')}} <span class="text-red-500">*</span></label>
              <MultiSelect v-model="selectedToBranches" :options="toBranches" optionLabel="abbreviation"
                optionValue="_id" display="chip" :placeholder="t('Select Branch')" class="w-full" filter />
              <!-- <span v-if="formErrors.toBranch" class="text-red-500 text-xs mt-1 block">
                {{ formErrors.toBranch }}
              </span> -->
              <!-- <div v-if="selectedToBranches.length > 1" class="mt-1 text-xs text-blue-600 bg-blue-50 p-1 rounded">
                <i class="fas fa-info-circle mr-1"></i>
                <span>The same assets will be sent to each selected branch</span>
              </div> -->
            </div>
          </div>

          <!-- Assets Section -->
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-sm font-medium">
                {{$t('Assets')}} <span class="text-red-500">*</span>
              </h3>
              <button type="button" @click="addAsset"
                class="flex items-center bg-gradient-to-br from-orange-400 to-orange-700 text-white p-2 rounded-md text-xs hover:from-orange-500 hover:to-orange-600 transition-all duration-300 shadow-md">
                <i class="fa-solid fa-square-plus mr-1"></i> {{$t('Add Asset')}}
                
              </button>
            </div>

            <!-- <div v-if="formErrors.assets" class="text-red-500 text-xs">
              {{ formErrors.assets }}
            </div> -->

            <div class="space-y-4">
              <div v-for="(assetItem, index) in assets" :key="index"
                class="relative border border-gray-200 p-4 rounded-md shadow-sm space-y-4">
                <!-- Remove Button -->
                <button type="button" @click="removeAsset(index)" title="Delete" :disabled="assets.length === 1"
                  class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                  <i class="fas fa-times-circle text-lg"></i>
                </button>

                <!-- Asset + Quantity in One Row -->
                <div class="flex flex-col md:flex-row gap-4">
                  <!-- Asset -->
                  <div class="w-full">
                    <label class="block text-xs text-gray-700 mb-1 text-start">
                      {{$t('Asset')}} <span class="text-red-500">*</span>
                    </label>
                    <Select v-model="assetItem.selectedAsset" :options="availableAssets" optionLabel="name" filter
                      :placeholder="t('Select asset')" class="w-full" />
                    <!-- <span v-if="
                      formErrors.assetErrors &&
                      formErrors.assetErrors[index]?.asset
                    " class="text-red-500 text-xs mt-1 block">
                      {{ formErrors.assetErrors[index]?.asset }}
                    </span> -->
                    <span v-if="assetItem.selectedAsset" class="text-xs text-gray-500 mt-1 block">
                      {{$t('Available')}}:
                      {{ getMaxQuantity(assetItem.selectedAsset._id) }}
                    </span>
                    <span v-if="assetItem.selectedAsset && selectedToBranches.length > 1"
                      class="text-xs text-emerald-600 block">
                      {{$t('Each branch will receive')}}: {{ assetItem.quantity }}
                    </span>
                  </div>

                  <!-- Quantity -->
                  <div class="w-full">
                    <label class="block text-xs text-gray-700 mb-1 text-start">
                      {{$t('Quantity')}} <span class="text-red-500">*</span>
                    </label>
                    <input type="number" v-model="assetItem.quantity"
                      class="border border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 hover:border-emerald-300 text-left outline-none"
                      placeholder="0" min="1" :max="assetItem.selectedAsset
                        ? getMaxQuantity(assetItem.selectedAsset._id) / (selectedToBranches.length || 1)
                        : 0
                        " />
                    <!-- <span v-if="
                      formErrors.assetErrors &&
                      formErrors.assetErrors[index]?.quantity
                    " class="text-red-500 text-xs mt-1 block">
                      {{ formErrors.assetErrors[index]?.quantity }}
                    </span> -->
                    <div v-if="selectedToBranches.length > 1 && assetItem.selectedAsset"
                      class="text-xs text-gray-500 mt-1">
                      <div>Total needed: {{ assetItem.quantity * selectedToBranches.length }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs text-gray-700 text-left mb-1">{{$t('Description')}}</label>
            <textarea v-model="remark"
              class="border border-gray-300 p-3 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none duration-300 hover:border-emerald-300"
              :placeholder="$t('Description...')" rows="3"></textarea>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-2 border-t border-gray-200 mt-6">
            <button type="button" @click="clearForm"
              class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md text-sm hover:from-red-500 hover:to-red-500 transition">
              {{$t('Clear')}}
            </button>
            <button type="submit" :disabled="isLoading"
              class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md text-sm hover:from-emerald-500 hover:to-emerald-500 transition disabled:opacity-50">
              {{$t('Create')}}
            </button>
          </div>
        </form>
      </div>
    </div>


    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
  </div>
</template>
