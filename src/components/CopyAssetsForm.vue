<script setup>
import API_CONFIGS from '@/api/config';
import { getNextNumberId } from '@/composable/getNextId';
import { fetchTimestamp } from '@/composable/timestamp';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import MultiSelect from 'primevue/multiselect';
import { defineEmits, onMounted, ref, watch } from 'vue';
import ErrorMessage from '../components/ErrorMessage.vue';
import SuccessMessage from '../components/SuccessMessage.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const emit = defineEmits(['close']);

// Refs
const loading = ref(false);
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

// Branch and Asset Refs
const branchStore = useBranchStore();
const userId = ref(branchStore.getUserId);
const branchData = ref([]);
const Assets = ref([]);
const selectedAssets = ref([]);
const selectedBranchTo = ref([]);



const generateCustomId = async (branchId, assetName) => {
    try {
        const branch = branchData.value.find(b => b.id === branchId);
        const branchName = branch?.name || "Unknown";

        const formattedAssetName = assetName.replace(/\s+/g, '').toLowerCase();

        const params = {
            sortField: 'createdAt',
            sortOrder: 'desc',
            limit: 1,
            dynamicConditions: JSON.stringify([
                { field: 'branchId', operator: '==', value: branchId },
                { field: 'status', operator: '==', value: true },
            ]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        let lastId = response.data?.data?.[0]?.idCustom || null;
        let lastNumber = lastId ? lastId.match(/(\d+)$/)?.[0] : null;
        const nextNumber = getNextNumberId(lastNumber);

        return `${branchName}-${formattedAssetName}-${nextNumber}`;
    } catch (error) {
        console.error("Error generating custom ID:", error);
    }
};



async function fetchAllBranch() {
    try {
        const params = {
            dynamicConditions: JSON.stringify([{ field: 'status', operator: '==', value: true }])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });

        branchData.value = (response.data.data || []).map(branch => ({
            name: branch.abbreviation || 'N/A',
            id: branch._id,

        }));

    } catch (error) {
        console.error("Failed to fetch branches:", error);
        errorMessage.value = t("Failed to load branches. Please try again.");
        showErrorMessage.value = true;
    }
}



async function fetchAssets() {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true },
                { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        Assets.value = response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch assets:", error);
        errorMessage.value = $t("Failed to load assets. Please try again.");
        showErrorMessage.value = true;
    }
}

const getBranchName = (id) => {
    if (!id || !branchData.value) return "N/A";
    const branch = branchData.value.find(b => b.id === id);
    return branch ? branch.name : "Unknown Branch";
}



const getAssetName = (id) => {
    if (!id || !Assets.value) return "N/A";
    const asset = Assets.value.find(a => a._id === id);
    return asset ? asset.name : "Unknown Asset";
}


async function checkAssetExists(assetIds, toBranchId) {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'assetId', operator: 'in', value: assetIds },
                { field: 'toBranchId', operator: '==', value: toBranchId }
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CopyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const existingTransactions = response.data.data || [];

        const existingAssetIds = new Set();
        existingTransactions.forEach(transaction => {
            if (Array.isArray(transaction.assetId)) {
                transaction.assetId.forEach(id => existingAssetIds.add(id));
            }
        });

        const duplicateAssetIds = assetIds.filter(id => existingAssetIds.has(id));

        if (duplicateAssetIds.length > 0) {
            const duplicateAssetNames = duplicateAssetIds.map(id => getAssetName(id)).join(", ");
            return {
                exists: true,
                duplicateAssetNames,
                duplicateAssetIds
            };
        }

        return { exists: false };
    } catch (error) {
        console.error("Error checking asset existence:", error);
    }
}

const HandleCopyAssets = async () => {
    try {
        loading.value = true;
        const timestamp = await fetchTimestamp();


        // Validation
        if (!selectedAssets.value.length) {
            throw new Error(t("Please select at least one asset."));
        }
        if (!selectedBranchTo.value.length) {
            throw new Error(t("Please select at least one branch to copy assets to."));
        }
        if (selectedBranchTo.value.includes(branchStore.branchId)) {
            throw new Error(t("Cannot copy assets to the same branch."));
        }



        const assetsWithFullData = selectedAssets.value.map(selectedAsset => {
            const fullAsset = Assets.value.find(a => a._id === selectedAsset._id || a._id === selectedAsset.id);
            if (!fullAsset) {
                throw new Error(`Asset with ID ${selectedAsset._id || selectedAsset.id} not found`);
            }
            return {
                _id: fullAsset._id,
                branchId: fullAsset.branchId,
                name: fullAsset.name,
                description: fullAsset.description || "",
                createdBy: fullAsset.createdBy,
                createdAt: fullAsset.createdAt,
                updatedAt: fullAsset.updatedAt,
                updatedBy: fullAsset.updatedBy,
                status: fullAsset.status,
                category: fullAsset.category || {}
            };
        });



        // Process one branch at a time
        for (const branchId of selectedBranchTo.value) {
            // Check for duplicates
            const assetIds = assetsWithFullData.map(asset => asset._id);
            const assetCheck = await checkAssetExists(assetIds, branchId);

            if (assetCheck.exists) {
                throw new Error(`Duplicate assets found in branch ${getBranchName(branchId)}: ${assetCheck.duplicateAssetNames}`);
            }

            // Create transaction record
            const requestBody = {
                fields: {
                    assets: assetsWithFullData,
                    categoryIds: assetsWithFullData.map(asset =>
                        asset.category && asset.category._id ? asset.category._id : null
                    ).filter(Boolean),
                    assetId: assetsWithFullData.map(asset => asset._id),
                    fromBranchId: branchStore.branchId,
                    toBranchId: branchId,
                    createdBy: userId.value,
                    createdAt: timestamp,
                }
            };

            const copyTransactionRes = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CopyAssetTransaction`, requestBody, { headers: API_CONFIGS.headers });
            const transactionId = copyTransactionRes.data?.data?._id;

            if (!transactionId) {
                throw new Error("Failed to create transaction record");
            }

            // Process assets sequentially to ensure unique IDs
            let localCounter = 1; // Use a local counter for this branch's operation

            for (const asset of assetsWithFullData) {
                // Generate a unique ID that won't conflict with parallel operations
                const branch = branchData.value.find(b => b.id === branchId);
                const branchName = branch?.name || "Unknown";
                const formattedAssetName = asset.name.replace(/\s+/g, '').toLowerCase();

                // Query for the latest ID
                const params = {
                    sortField: 'createdAt',
                    sortOrder: 'desc',
                    limit: 1,
                    dynamicConditions: JSON.stringify([
                        { field: 'branchId', operator: '==', value: branchId },
                        { field: 'status', operator: '==', value: true },
                    ]),
                };

                const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
                let lastId = response.data?.data?.[0]?.idCustom || null;
                let lastNumber = lastId ? lastId.match(/(\d+)$/)?.[0] : null;
                const nextNumber = getNextNumberId(lastNumber, localCounter);
                localCounter++; // Increment local counter for next asset

                const customId = `${branchName}-${formattedAssetName}-${nextNumber}`;

                const newAsset = {
                    fields: {
                        idCustom: customId,
                        mainTransferId: null,
                        stockTransferId: null,
                        copyAssetTransactionId: transactionId,
                        branchId: branchId,
                        category: asset.category || {},
                        name: asset.name,
                        description: asset.description || "",
                        createdBy: userId.value,
                        createdAt: timestamp,
                        status: true
                    }
                };

                // Create the asset and wait for it to complete before processing the next one
                await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAsset`, newAsset, { headers: API_CONFIGS.headers });
            }
        }

        await fetchAssets();

        successMessage.value = "Assets copied successfully to all selected branches.";
        showSuccessMessage.value = true;
        successAudio.play().catch(e => console.error("Success audio error:", e));

        selectedAssets.value = [];
        selectedBranchTo.value = [];

        setTimeout(() => {
            showSuccessMessage.value = false;
            emit('close');
        }, 1000);

    } catch (error) {
        console.error("Error during copy:", error);
        errorMessage.value = error.response?.data?.message || error.message || "Failed to copy assets.";
        showErrorMessage.value = true;
        errorAudio.play().catch(e => console.error("Error audio error:", e));
    } finally {
        loading.value = false;
    }
};



watch(() => branchStore.getUserId, (newUserId) => {
    userId.value = newUserId;
}, { immediate: true });





watch(() => branchStore.branchId, async (newVal) => {
    if (newVal) {
        await fetchAssets();
    } else {
        console.warn("Branch ID is not set");
    }
});




onMounted(async () => {

    await Promise.all([fetchAllBranch(), fetchAssets()]);
});




</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-2 z-50 font-khmer">
        <div class="bg-white p-4 sm:p-6 rounded-md shadow-lg w-[90%] sm:w-[80%] md:w-[60%] lg:w-[40%] xl:w-[35%]">
            <!-- Header -->
            <div class="flex justify-between items-center pb-2 mb-4 border-b-2">
                <p class="text-base sm:text-lg font-semibold">{{$t('Copy Assets Transactions')}}</p>
                <i class="fa-solid fa-circle-xmark cursor-pointer hover:text-red-500 text-red-700 text-end text-xl"
                    @click="$emit('close')"></i>
            </div>

            <!-- Form -->
            <form @submit.prevent="HandleCopyAssets" class="p-1 sm:p-2 space-y-4 sm:space-y-6 max-w-full mx-auto">
                <!-- Assets Dropdown -->
                <div>
                    <label for="assets" class="text-sm text-gray-800 mb-2 block text-start">
                        {{$t('Assets Name')}} <span class="text-red-500">*</span>
                    </label>
                    <div class="card flex justify-start">
                        <MultiSelect id="assets" v-model="selectedAssets" display="chip" :options="Assets"
                            optionLabel="name" filter :placeholder="$t('Select assets')" class="w-full" />
                    </div>
                </div>

                <!-- Branch Transfer Section -->
                <div class="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    <!-- From Branch -->
                    <div class="flex-1 w-full">
                        <label for="fromBranch" class="text-sm text-gray-800 mb-2 block text-start">{{$t('From Branch')}}</label>
                        <div
                            class="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed select-none">
                            {{ branchStore?.branchId ? getBranchName(branchStore.branchId) : $t('Loading...') }}
                        </div>
                    </div>

                    <!-- Icon in the center -->
                    <div class="flex justify-center items-center">
                        <i class="fa-brands fa-golang text-lg md:text-xl"></i>
                    </div>

                    <!-- To Branch -->
                    <div class="flex-1 w-full">
                        <label class="text-sm text-gray-800 mb-2 block text-start">{{$t('To Branch')}} <span
                                class="text-red-500">*</span></label>
                        <div class="card flex justify-center">
                            <MultiSelect v-model="selectedBranchTo" display="chip"
                                :options="branchData.filter(branch => branch.id !== branchStore.branchId)"
                                optionLabel="name" optionValue="id" filter :multiple="true"
                                :placeholder="$t('Select Branch(es)')" :maxSelectedLabels="3" class="w-full" />
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="flex justify-end">
                    <button type="submit"
                        class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-green-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                        {{$t('Confirm')}}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
</template>

<style></style>