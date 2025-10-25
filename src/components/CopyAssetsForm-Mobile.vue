<script setup>
import API_CONFIGS from '@/api/config';
import { getNextNumberId } from '@/composable/getNextId';
import { fetchTimestamp } from '@/composable/timestamp';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import MultiSelect from 'primevue/multiselect';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// Route
const router = useRouter();


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


// custom ID generation
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


// Get Data
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
        errorMessage.value = t('Failed to load branches. Please try again.');
        showErrorMessage.value = true;
    }
}


//  Get Assets
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
        errorMessage.value = t('Failed to load assets. Please try again.');
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
// Create Copy Assets
const HandleCopyAssets = async () => {
    try {
        loading.value = true;
        const timestamp = await fetchTimestamp();


        // Validation
        if (!selectedAssets.value.length) {
            throw new Error(t('Please select at least one asset.'));
        }
        if (!selectedBranchTo.value.length) {
            throw new Error(t('Please select at least one branch to copy assets to.'));
        }
        if (selectedBranchTo.value.includes(branchStore.branchId)) {
            throw new Error(t('Cannot copy assets to the same branch.'));
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
                throw new Error(t('Failed to create transaction record'));
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

        successMessage.value = t('Assets copied successfully to all selected branches.');
        showSuccessMessage.value = true;
        successAudio.play().catch(e => console.error("Success audio error:", e));

        selectedAssets.value = [];
        selectedBranchTo.value = [];

        setTimeout(() => {
            showErrorMessage.value = false;
            router.push('/company-assets');
        }, 500);

    } catch (error) {
        console.error("Error during copy:", error);
        errorMessage.value = error.response?.data?.message || error.message || t('Failed to copy assets.');
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
    <div>
        <!-- Success Message -->
        <transition name="fade">
            <div v-if="showSuccessMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-green-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ successMessage }}
            </div>
        </transition>

        <!-- Error Message -->
        <transition name="fade">
            <div v-if="showErrorMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-red-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ errorMessage }}
            </div>
        </transition>


        <!-- Back Button -->
        <router-link to="/company-assets"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Copy Asset') }}</span>
        </router-link>


        <!-- Form -->
        <form @submit.prevent="HandleCopyAssets"
            class="mt-3 space-y-6 px-4 py-6 bg-white rounded-2xl shadow-lg  sm:max-w-xl mx-auto">

            <!-- Asset Selection -->
            <div class="flex flex-col">
                <label for="assets" class="text-sm font-semibold text-gray-800 mb-1 text-start">
                    {{ $t('Assets') }} <span class="text-red-500">*</span>
                </label>
                <div class="card w-full">
                    <MultiSelect id="assets" v-model="selectedAssets" display="chip" :options="Assets"
                        optionLabel="name" filter placeholder="Select assets" class="w-full" />
                </div>
                <p v-if="showErrorMessage && selectedAssets.length === 0" class="text-red-500 text-xs mt-1 text-start">
                    {{ $t('Asset name is required.') }}
                </p>
            </div>

            <!-- Branch Transfer Section -->
            <div class="flex items-start gap-4 flex-nowrap">

                <!-- From Branch -->
                <div class="flex-1 min-w-0">
                    <label for="fromBranch" class="text-sm font-semibold text-gray-800 mb-2 block">
                        {{ $t('From Branch') }}
                    </label>
                    <div
                        class="w-full px-3 py-3 border border-emerald-300 rounded-md bg-emerald-50 text-emerald-700 select-none cursor-not-allowed text-sm">
                        {{ branchStore?.branchId ? getBranchName(branchStore.branchId) : 'Loading...' }}
                    </div>
                </div>

                <!-- Optional: Center Icon -->
                <div class="flex items-center justify-center my-auto">
                    <i class="fa-solid fa-arrow-right-arrow-left text-emerald-500 text-lg"></i>
                </div>

                <!-- To Branch -->
                <div class="flex-1 min-w-0">
                    <label class="text-sm font-semibold text-gray-800 mb-2 block">
                        {{ $t('To Branch') }} <span class="text-red-500">*</span>
                    </label>
                    <div class="card w-full">
                        <MultiSelect v-model="selectedBranchTo" display="chip"
                            :options="branchData.filter(branch => branch.id !== branchStore.branchId)"
                            optionLabel="name" optionValue="id" :multiple="true" filter placeholder="Choose"
                            :maxSelectedLabels="2" class="w-full" />
                    </div>
                    <p v-if="showErrorMessage && selectedBranchTo.length === 0" class="text-red-500 text-xs mt-1">
                        {{ $t('To Branch is required.') }}
                    </p>
                </div>
            </div>


            <!-- Submit Button -->
            <div class="flex justify-end pt-2">
                <button type="submit"
                    class="px-5 py-2 text-sm font-semibold rounded-md text-white bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    :disabled="loading">
                    {{ $t('Create') }}
                </button>
            </div>
        </form>

    </div>
</template>

<style></style>