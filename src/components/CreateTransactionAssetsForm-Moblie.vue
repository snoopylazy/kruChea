<script setup>
import API_CONFIGS from '@/api/config';
import { fetchTimestamp } from '@/composable/timestamp';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import { Select } from "primevue";
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

import { useRouter } from 'vue-router';

const router = useRouter();

// State for success and error messages
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");
const loading = ref(false);

//Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3')



const branchStore = useBranchStore();
const selectEmployee = ref();
const selectAssets = ref();


const userData = ref([]);
const Assets = ref([]);
const userId = ref(branchStore.getUserId);
const branchId = ref(branchStore.getBranchId);

const quantity = ref();
const remark = ref("");
const createSelectedOperation = ref("checkout")

const selectedEmployee = ref("");
const employeeData = ref([])





const getMaxQuantity = (assetId) => {
    // If assetId is an object (the full asset object), use its _id
    const id = typeof assetId === 'object' ? assetId._id : assetId;
    const asset = Assets.value.find(a => a._id === id);
    return asset?.totalStock || 0;
};


const isCO = ref(false);

// This will hold the current user info (already fetched in your CO check)
const currentUser = ref(null);

const isCOUser = computed(() => {
    return currentUser.value?.roleId?.representativeName === 'CO';
});

const coEmployeeName = computed(() => {
    if (!isCOUser.value) return '';
    // Safely extract employeeId
    let employeeId = '';
    if (currentUser.value && currentUser.value.employeeId) {
        employeeId = typeof currentUser.value.employeeId === 'object' && currentUser.value.employeeId !== null
            ? currentUser.value.employeeId._id
            : currentUser.value.employeeId;
    }
    if (!employeeId) return '';
    const emp = employeeData.value.find(emp => emp._id === employeeId);
    return emp ? emp.khName || emp.enName : '';
});

const isCOReady = computed(() =>
    !isCOUser.value ||
    (employeeData.value.length > 0 && !!coEmployeeName.value)
);

const checkIfCurrentUserIsCO = async () => {
    try {
        const params = {
            populate: JSON.stringify([
                'employeeId', 'roleId'
            ]),
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: branchStore.getUserId }
            ]),
            populate: JSON.stringify([
                'employeeId', 'roleId'
            ]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        const users = response.data.data || [];

        if (users.length > 0) {
            currentUser.value = users[0];
            if (currentUser.value.roleId && currentUser.value.roleId.representativeName === 'CO') {
                return {
                    isCO: true,
                    employeeId: currentUser.value.employeeId
                };
            }
        }

        return {
            isCO: false,
            employeeId: null
        };

    } catch (error) {
        console.error("Error checking if user is CO:", error);
        return {
            isCO: false,
            employeeId: null
        };
    }
};

watch([employeeData, () => branchStore.userId], async () => {
    const coCheck = await checkIfCurrentUserIsCO();

    if (coCheck.isCO && coCheck.employeeId) {
        // Find the employee in employeeData
        const currentEmployee = employeeData.value.find(emp => emp._id === coCheck.employeeId);
        if (currentEmployee) {
            selectedEmployee.value = currentEmployee._id;
            isCO.value = true;
            // Auto-selected CO employee
        } else {
            // CO employee not found in employeeData
        }
    } else {
        isCO.value = false;
        // User is not CO representative
    }
});

watch(
    [employeeData, currentUser],
    ([employees, user]) => {
        let employeeId = '';
        if (user && user.employeeId) {
            employeeId = typeof user.employeeId === 'object' && user.employeeId !== null
                ? user.employeeId._id
                : user.employeeId;
        }
        if (
            user?.roleId?.representativeName === 'CO' &&
            employeeId &&
            employees.length > 0
        ) {
            const emp = employees.find(emp => emp._id === employeeId);
            if (selectedEmployee.value !== employeeId) {
                selectedEmployee.value = employeeId;
            }
        }
    },
    { immediate: true }
);


const fetchEmployee = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                {
                    field: 'branchId',
                    operator: '==',
                    value: branchStore.branchId
                },

            ])
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Employee`, { params, headers: API_CONFIGS.headers });
        employeeData.value = response.data.data || [];

    } catch (error) {
        console.error("Cannot fetch employee", error)
    }
};



// New function to get mainBranchId from employee's representativeName
const getMainBranchIdFromEmployee = (employeeId) => {
    if (!employeeId) return null;
    // If employeeId is an object, extract the _id
    const id = typeof employeeId === 'object' && employeeId !== null
        ? employeeId._id
        : employeeId;
    const emp = employeeData.value.find(emp => emp._id === id);
    return emp ? emp.branchId : null;
};

// Fetch All Employee
const getUser = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: "status", operator: "==", value: 'active' },
                { field: "branchId", operator: "==", value: branchStore.getBranchId }
            ])
        }

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Employee`, { params, headers: API_CONFIGS.headers });
        userData.value = response.data.data || [];

    } catch (error) {
        console.error("Error fetching user:", error);
    }
}



//  Get Assets
async function fetchAssets() {
    try {
        console.log('Fetching assets for branch:', branchStore.branchId);

        const params = {
            dynamicConditions: JSON.stringify([
                { field: "status", operator: "==", value: true },
            ]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`,
            { params, headers: API_CONFIGS.headers }
        );

        Assets.value = response.data.data || [];

    } catch (error) {
        console.error("Failed to fetch assets:", error);
    }
}


const checkAssetAvailability = async (assetId, employeeId) => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: "assetId", operator: "==", value: assetId },
                { field: "branchId", operator: "==", value: branchStore.branchId },
                { field: "actualReturnDate", operator: "==", value: null },
            ]),
            sort: JSON.stringify({ field: "createdAt", order: "desc" }),
            limit: 1
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = response.data.data || [];

        if (transactions.length > 0) {
            const latestTransaction = transactions[0];
            return latestTransaction.transactionType === "checkout" && !latestTransaction.actualReturnDate;
        }
        return false;
    } catch (error) {
        console.error("Error checking asset availability:", error.message);
        return true;
    }
};


const checkAssetStockAvailability = async (assetId, requestedQuantity) => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: assetId },
                // { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };

        const assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        const assets = assetResponse.data.data || [];

        if (!assets.length) {
            return {
                available: false,
                message: "Asset not found"
            };
        }

        const asset = assets[0];
        const currentStock = asset.totalStock || 0;

        if (currentStock < requestedQuantity) {
            return {
                available: false,
                message: `Not enough stock available. Requested: ${requestedQuantity}, Available: ${currentStock}`
            };
        }

        return {
            available: true,
            currentStock: currentStock
        };
    } catch (error) {
        console.error("Error checking asset stock:", error.message);
        return {
            available: false,
            message: "Error checking stock availability"
        };
    }
};


// Handle Create
const HandleTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;

    try {
        const employeeValue = isCOUser.value ? selectedEmployee.value : selectEmployee.value;

        if (!employeeValue || !selectAssets.value) {
            errorMessage.value = t('Please select an employee and asset before proceeding');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
            loading.value = false;
            return;
        }

        if (!quantity.value || quantity.value <= 0) {
            errorMessage.value = t('Please input quantity greater than 0');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
            loading.value = false;
            return;
        }

        if (createSelectedOperation.value === "checkout") {
            const stockResult = await checkAssetStockAvailability(selectAssets.value, quantity.value);
            if (!stockResult.available) {
                errorMessage.value = stockResult.message;
                showErrorMessage.value = true;
                errorAudio.play();
                setTimeout(() => showErrorMessage.value = false, 5000);
                loading.value = false;
                return;
            }
        }

        const mainBranchId = getMainBranchIdFromEmployee(employeeValue);

        // Fetch the current user's record to get their chiefIds
        const userParams = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: branchStore.userId }
            ]),
        };

        const userResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params: userParams, headers: API_CONFIGS.headers });
        const users = userResponse.data.data || [];

        // Get the chiefs of the current user
        let userChiefIds = [];
        if (users.length > 0) {
            userChiefIds = users[0].chiefIds || [];
        }

        // Combine current user ID with their chiefs
        const combinedChiefIds = [branchStore.userId, ...userChiefIds];

        const timestamp = await fetchTimestamp();
        const requestBody = {
            fields: {
                assetId: selectAssets.value,
                employeeId: employeeValue,
                transactionType: createSelectedOperation.value,
                checkOutDate: timestamp,
                qty: quantity.value,
                remark: remark.value || "",
                status: {
                    requested: {
                        value: "requested",
                        requestedDate: timestamp,
                        requestedBy: branchStore.userId,
           
                    },
                    checked: {
                        value: "",
                        checkedDate: null,
                        checkedBy: null,
                    },
                    confirmed: {
                        value: "",
                        confirmedDate: null,
                        confirmedBy: null,
                    },
                    approved: {
                        value: "",
                        approvedDate: null,
                        approvedBy: null,
                    },
                    rejected: {
                        value: "",
                        rejectedDate: null,
                        rejectedBy: null,
                    },
                },

                createdBy: branchStore.userId,
                branchId: branchStore.branchId,
                mainBranchId: mainBranchId,
                createdAt: timestamp,
                chiefIds: combinedChiefIds, // Add both current user and their chiefs
            }
        };

        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAssetTransaction`, requestBody, { headers: API_CONFIGS.headers });

        if (response.status === 200 || response.status === 201) {
            successMessage.value = t('Successfully created transaction');
            showSuccessMessage.value = true;
            successAudio.play();
            setTimeout(() => {
                showSuccessMessage.value = false;
                router.push('/operation-assets');
            }, 500);
        }

        clearForm();
    } catch (error) {
        console.error("Transaction creation error:", error);
        if (error.response) {
            if (error.response.status === 400) {
                errorMessage.value = t('Please fill in all required fields');
            } else if (error.response.status === 409) {
                errorMessage.value = t('This asset already exists');
            } else {
                errorMessage.value = t('An unknown error occurred');
            }
        } else {
            errorMessage.value = t('Network error. Please check your connection.');
        }

        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
    }
};

const clearForm = () => {
    if (!isCO.value) {
        selectedEmployee.value = '';
    }
    selectEmployee.value = null;
    selectAssets.value = null;
    quantity.value = null;
    remark.value = "";
};


watch(
    () => [branchStore.getUserId, branchStore.getBranchId],
    ([newUserId, newBranchId]) => {
        userId.value = newUserId;
        branchId.value = newBranchId;
    },
    { immediate: true }
);


watch(() => branchStore.getBranchId, async (newBranchId, oldBranchId) => {
    if (newBranchId !== oldBranchId) {
        await Promise.all([

            getUser(),
            fetchAssets(),

        ]);
    }
}, { immediate: false });



onMounted(async () => {
    await getUser();
    await checkIfCurrentUserIsCO();
    await fetchEmployee()
    await fetchAssets();
});

// Add computed property to get max quantity for selected asset

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


        <router-link to="/operation-assets"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>
                {{ $t('Create Transaction asset') }}
            </span>
        </router-link>

        <form class="mt-6 space-y-6 px-6 py-8 bg-white rounded-2xl shadow-lg border border-gray-200 max-w-2xl mx-auto"
            @submit.prevent="HandleTransaction">


            <!-- Employee Selection -->
            <div class="space-y-1 text-start">
                <label class="text-sm font-medium text-gray-700">{{ $t('Employee') }} <span
                        class="text-red-500">*</span></label>
                <template v-if="isCOUser">
                    <input type="text" :value="isCOReady ? coEmployeeName : 'Loading...'"
                        class="w-full mt-1 bg-gray-100 border border-gray-300 rounded-lg p-2" disabled />
                </template>
                <template v-else>
                    <Select v-model="selectEmployee" :options="employeeData" filter optionLabel="khName"
                        optionValue="_id" :placeholder="$t('Select employee')" class="w-full" />
                </template>
                <p v-if="showErrorMessage && !selectEmployee && !isCOUser" class="text-red-500 text-xs mt-1">
                    {{ $t('Please select an employee.') }}
                </p>
            </div>

            <!-- Asset Selection -->
            <div class="space-y-1 text-start">
                <label class="text-sm font-medium text-gray-700">{{ $t('Asset') }} <span
                        class="text-red-500">*</span></label>
                <Select v-model="selectAssets" :options="Assets" filter optionLabel="name" placeholder="Select asset"
                    class="w-full">
                    <template #value="slotProps">
                        <div v-if="slotProps.value" class="flex items-center">
                            <div>{{ slotProps.value.name }}</div>
                        </div>
                        <span v-else>{{ slotProps.placeholder }}</span>
                    </template>
                    <template #option="slotProps">
                        <div class="flex items-center">
                            <div>{{ slotProps.option.name }}</div>
                        </div>
                    </template>
                </Select>
                <span v-if="selectAssets" class="text-xs text-gray-500 mt-1 block">
                    {{ $t('Available') }}: {{ getMaxQuantity(selectAssets._id) }}
                </span>
                <p v-if="showErrorMessage && !selectAssets" class="text-red-500 text-xs mt-1">
                    {{ $t('Please select an asset.') }}
                </p>
            </div>

            <!-- Quantity -->
            <div class="space-y-1 text-start">
                <label class="text-sm font-medium text-gray-700">{{ $t('Quantity') }} <span
                        class="text-red-500">*</span></label>
                <input type="number" v-model="quantity" min="0" placeholder="0"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-left text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                <p v-if="showErrorMessage && (!quantity || quantity <= 0)" class="text-red-500 text-xs mt-1">
                    {{ $t('Quantity must be greater than 0.') }}
                </p>
            </div>

            <!-- Description -->
            <div class="space-y-1 text-start">
                <label for="description" class="text-sm font-medium text-gray-700">{{ $t('Description') }}</label>
                <textarea id="description" rows="4" :placeholder="$t('Enter description...')" v-model="remark"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"></textarea>
            </div>

            <!-- Buttons -->
            <div class="flex justify-end gap-3 pt-4">
                <button type="button" @click="clearForm"
                    class="bg-gradient-to-br from-red-500 to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition transform">
                    {{ $t('Clear') }}
                </button>
                <button type="submit"
                    class="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition transform">
                    {{ $t('Create') }}
                </button>
            </div>
        </form>

    </div>
</template>