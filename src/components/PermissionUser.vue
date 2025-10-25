<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-2 z-50 font-khmer ">
        <!-- Wrapper -->
        <div class="bg-white p-6 rounded-xl shadow-xl w-full max-w-5xl mx-auto overflow-y-auto max-h-[100vh] 	">
            <!-- Header -->
            <div class="flex justify-between items-center border-b pb-4 mb-6">
                <h2 class="text-2xl font-bold text-gray-700">{{ $t('Set Permission For') }}
                    -<span class=" text-2xl text-gray-600">
                        {{ selectedUser ? selectedUser.displayName || selectedUser.username : 'Loading...' }}
                    </span>
                </h2>
                <i class="fa-solid fa-circle-xmark cursor-pointer text-red-600 hover:text-red-500 text-2xl"
                    @click="$emit('close')"></i>
            </div>


            <!-- Role Selection -->
            <div class="bg-white p-4 rounded-lg shadow-sm ">
                <h3 class="text-gray-800 font-semibold mb-4 text-left">Select Role <span class="text-red-500">*</span>
                </h3>
                <!-- <p class="text-sm text-gray-600 mb-2">Current role ID: {{ selectedRole }}</p> -->
                <Dropdown v-model="selectedRole" :options="roleAssignData" optionLabel="name" optionValue="_id"
                    placeholder="Select a Role" class="w-full" :disabled="true">
                </Dropdown>
            </div>

            <!-- Permission -->
            <div class="grid grid-cols-3 gap-6">
                <!-- Dashboard -->
                <div class="bg-blue-50 p-4 rounded-lg shadow-sm">
                    <h3 class="text-blue-800 font-semibold mb-4">Dashboard</h3>
                    <label class="flex justify-between items-center text-gray-700">
                        Dashboard Access
                        <input type="checkbox" v-model="permissions.hrCompanyAssetDashboard" class="toggle-switch">
                    </label>
                </div>

                <!-- Category -->
                <div class="bg-pink-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-pink-800 font-semibold mb-4">Category</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrCategoryAll" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrCategoryCreate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrCategoryView" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Edit
                            <input type="checkbox" v-model="permissions.hrCategoryUpdate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrCategoryDelete" class="toggle-switch">
                        </label>
                    </div>
                </div>

                <!-- Asset -->
                <div class="bg-yellow-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-yellow-800 font-semibold mb-4">Asset</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrAssetAll" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrAssetCreate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrAssetView" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Edit
                            <input type="checkbox" v-model="permissions.hrAssetUpdate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrAssetDelete" class="toggle-switch">
                        </label>
                        <!-- <label class="flex justify-between items-center text-gray-700">
                            Copy Asset
                            <input type="checkbox" v-model="permissions.hrAssetCopy" class="toggle-switch">
                        </label> -->
                    </div>
                </div>

                <!-- Asset Transaction -->
                <div class="bg-purple-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-purple-800 font-semibold mb-4">Asset Transaction</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrAssetTransactionAll" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrAssetTransactionCreate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrAssetTransactionView" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Checkout Asset
                            <input type="checkbox" v-model="permissions.hrAssetTransactionUpdate" class="toggle-switch">
                        </label>

                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrAssetTransactionDelete" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Check
                            <input type="checkbox" v-model="permissions.hrAssetTransactionChecked"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Confirm
                            <input type="checkbox" v-model="permissions.hrAssetTransactionConfirmed"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Approve
                            <input type="checkbox" v-model="permissions.hrAssetTransactionApproved"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Reject
                            <input type="checkbox" v-model="permissions.hrAssetTransactionRejected"
                                class="toggle-switch">
                        </label>
                    </div>
                </div>

                <!-- Purchase Asset -->
                <div class="bg-green-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-green-800 font-semibold mb-4">Purchase Asset</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetAll" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetCreate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetView" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Edit
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetUpdate" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetDelete" class="toggle-switch">
                        </label>
                    </div>
                </div>

                <!-- Asset Transfer Stock -->
                <div class="bg-orange-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-orange-800 font-semibold mb-4">Asset Transfer Stock</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrAssetTransferStockAll" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrAssetTransferStockCreate"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrAssetTransferStockView" class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Edit
                            <input type="checkbox" v-model="permissions.hrAssetTransferStockUpdate"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrAssetTransferStockDelete"
                                class="toggle-switch">
                        </label>
                    </div>
                </div>

                <!-- Purchase Asset History -->
                <div class="bg-red-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-red-800 font-semibold mb-4">Purchase Asset History</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            All
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetHistoryAll"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Create
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetHistoryCreate"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            View
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetHistoryView"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Edit
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetHistoryUpdate"
                                class="toggle-switch">
                        </label>
                        <label class="flex justify-between items-center text-gray-700">
                            Delete
                            <input type="checkbox" v-model="permissions.hrPurchaseAssetHistoryDelete"
                                class="toggle-switch">
                        </label>
                    </div>
                </div>

                <!-- Report -->
                <div class="bg-indigo-50 p-4 rounded-lg shadow-sm w-full max-w-sm mx-auto">
                    <h3 class="text-indigo-800 font-semibold mb-4">Report</h3>
                    <div class="space-y-3">
                        <label class="flex justify-between items-center text-gray-700">
                            Report Access
                            <input type="checkbox" v-model="permissions.hrCompanyAssetReportView" class="toggle-switch">
                        </label>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex justify-end gap-4 mt-8 pt-4 border-t">
                <button @click="$emit('close')"
                    class="px-6 py-2 text-red-600 bg-red-200 hover:bg-red-300 rounded-lg transition-colors">
                    {{ $t('Cancel') }}
                </button>
                <button @click="savePermissions"
                    class="px-6 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                    {{ $t('Update Permissions') }}
                </button>
            </div>
        </div>

        <!-- Success and Error Messages -->
        <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
        <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
    </div>

</template>


<script setup>
import API_CONFIGS from '@/api/config';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import Dropdown from 'primevue/dropdown';
import { computed, defineEmits, defineProps, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ErrorMessage from '../components/ErrorMessage.vue';
import SuccessMessage from '../components/SuccessMessage.vue';
const { t } = useI18n()


// const toast = useToast();
const router = useRouter();

const props = defineProps({
    selectedUser: Object
});

const emit = defineEmits(['close']);

const branchStore = useBranchStore()
const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);

const userData = ref({});
const selectedUserId = ref('');
const selectedUserName = ref('');
const selectedMainRole = ref('');
const userId = ref('');
const roleAssignData = ref([]);
const selectedRole = ref('');
const currentRoleData = ref(null);
const currentUserMainRole = ref('');

const isAdminUser = computed(() => {
    const userRole = branchStore.getUserMainRole || currentUserMainRole.value;
    return userRole === 'Admin' || userRole === 'Super Admin';
});

const createDefaultAdminPermissions = () => {
    return {
        hrCompanyAssetDashboard: true,

        hrCategoryView: true,
        hrCategoryCreate: true,
        hrCategoryUpdate: true,
        hrCategoryDelete: true,
        hrCategoryAll: true,

        hrAssetView: true,
        hrAssetCreate: true,
        hrAssetUpdate: true,
        hrAssetDelete: true,
        hrAssetAll: true,
        hrAssetCopy: true,

        hrAssetTransactionView: true,
        hrAssetTransactionCreate: true,
        hrAssetTransactionUpdate: true,
        hrAssetTransactionDelete: true,
        hrAssetTransactionAll: true,
        hrAssetTransactionChecked: true,
        hrAssetTransactionConfirmed: true,
        hrAssetTransactionApproved: true,
        hrAssetTransactionRejected: true,


        hrPurchaseAssetView: true,
        hrPurchaseAssetCreate: true,
        hrPurchaseAssetUpdate: true,
        hrPurchaseAssetDelete: true,
        hrPurchaseAssetAll: true,

        hrAssetTransferStockView: true,
        hrAssetTransferStockCreate: true,
        hrAssetTransferStockUpdate: true,
        hrAssetTransferStockDelete: true,
        hrAssetTransferStockAll: true,

        hrPurchaseAssetHistoryView: true,
        hrPurchaseAssetHistoryCreate: true,
        hrPurchaseAssetHistoryUpdate: true,
        hrPurchaseAssetHistoryDelete: true,
        hrPurchaseAssetHistoryAll: true,

        hrCompanyAssetReportView: true
    };
};

const permissions = ref({
    hrCompanyAssetDashboard: false,

    hrCategoryView: false,
    hrCategoryCreate: false,
    hrCategoryUpdate: false,
    hrCategoryDelete: false,
    hrCategoryAll: false,

    hrAssetView: false,
    hrAssetCreate: false,
    hrAssetUpdate: false,
    hrAssetDelete: false,
    hrAssetAll: false,
    hrAssetCopy: false,

    hrAssetTransactionView: false,
    hrAssetTransactionCreate: false,
    hrAssetTransactionUpdate: false,
    hrAssetTransactionDelete: false,
    hrAssetTransactionAll: false,
    hrAssetTransactionChecked: false,
    hrAssetTransactionConfirmed: false,
    hrAssetTransactionApproved: false,
    hrAssetTransactionRejected: false,

    hrPurchaseAssetView: false,
    hrPurchaseAssetCreate: false,
    hrPurchaseAssetUpdate: false,
    hrPurchaseAssetDelete: false,
    hrPurchaseAssetAll: false,

    hrAssetTransferStockView: false,
    hrAssetTransferStockCreate: false,
    hrAssetTransferStockUpdate: false,
    hrAssetTransferStockDelete: false,
    hrAssetTransferStockAll: false,

    hrPurchaseAssetHistoryView: false,
    hrPurchaseAssetHistoryCreate: false,
    hrPurchaseAssetHistoryUpdate: false,
    hrPurchaseAssetHistoryDelete: false,
    hrPurchaseAssetHistoryAll: false,

    hrCompanyAssetReportView: false
});

const getCurrentUserRole = async () => {
    try {
        const userId = branchStore.getUserId;
        if (!userId) return;

        const params = {
            dynamicConditions: JSON.stringify([
                {
                    field: '_id',
                    operator: '==',
                    value: userId
                }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        if (response.data && response.data.data && response.data.data.length > 0) {
            currentUserMainRole.value = response.data.data[0].mainRole || '';
        }
    } catch (error) {
        console.error("Error getting current user role:", error);
    }
};

const getUser = async () => {
    try {
        if (!selectedUserId.value) {
            return;
        }

        const params = {
            populate: JSON.stringify(['roleId']),
            dynamicConditions: JSON.stringify([
                {
                    field: '_id',
                    operator: '==',
                    value: selectedUserId.value
                }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });

        if (response.data.data && response.data.data.length > 0) {
            userData.value = response.data.data[0];

            selectedMainRole.value = userData.value.mainRole || '';
            userId.value = userData.value._id;

            if (selectedMainRole.value === 'Admin' || selectedMainRole.value === 'Super Admin') {
                permissions.value = createDefaultAdminPermissions();
            }

            if (userData.value.roleId && userData.value.roleId._id) {
                selectedRole.value = userData.value.roleId._id;
                await getPermissionsFromRole(userData.value.roleId._id);
            }
        }
    } catch (error) {
        console.error("Error fetching user:", error);
    }
};

const getAssignRole = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                {
                    field: 'status', operator: '==', value: true
                }
            ])
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Role`, { params, headers: API_CONFIGS.headers })
        roleAssignData.value = response.data.data;
    } catch (error) {
        console.log("can not get roles", error)
    }
};


const refreshUserPermissions = async () => {
    try {
        const currentUserId = branchStore.getUserId;
        const params = {
            dynamicConditions: JSON.stringify([{ field: '_id', operator: '==', value: currentUserId }]),
            populate: JSON.stringify(['roleId'])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });

        if (response.data.data && response.data.data.length > 0) {
            const userData = response.data.data[0];
            const userMainRole = userData.mainRole;

            let permissions = {};

            if (userMainRole === 'Admin' || userMainRole === 'Super Admin') {
                permissions = createDefaultAdminPermissions();
            } else {
                permissions = userData.roleId?.permission || {};
            }

            branchStore.setPermissions(permissions);
        }
    } catch (error) {
        console.error('Error refreshing permissions:', error);
    }
};

const checkPageAccess = () => {
    const currentRoute = router.currentRoute.value;

    if (currentRoute.meta.requiresPermission) {
        const requiredPermission = currentRoute.meta.requiresPermission;
        if (!branchStore.hasPermission(requiredPermission) && !branchStore.isAdminOrSuperAdmin) {
            router.push('/');
            return;
        }
    }

    if (currentRoute.meta.requiresAnyPermission) {
        const requiredPermissions = currentRoute.meta.requiresAnyPermission;
        const hasAnyPermission = requiredPermissions.some(permission =>
            branchStore.hasPermission(permission)
        );

        if (!hasAnyPermission && !branchStore.isAdminOrSuperAdmin) {
            router.push('/');
            return;
        }
    }

    if (currentRoute.meta.requiresAdmin) {
        if (!branchStore.isAdminOrSuperAdmin) {
            router.push('/');
            return;
        }
    }
};

const getPermissionsFromRole = async (roleId) => {
    try {
        if (!roleId) return;

        const role = roleAssignData.value.find(r => r._id === roleId);

        if (selectedMainRole.value === 'Admin' || selectedMainRole.value === 'Super Admin') {
            permissions.value = createDefaultAdminPermissions();
            return;
        }

        if (role && role.permission) {
            const assetPermissions = {
                hrCompanyAssetDashboard: role.permission.hrCompanyAssetDashboard || false,

                hrCategoryView: role.permission.hrCategoryView || false,
                hrCategoryCreate: role.permission.hrCategoryCreate || false,
                hrCategoryUpdate: role.permission.hrCategoryUpdate || false,
                hrCategoryDelete: role.permission.hrCategoryDelete || false,
                hrCategoryAll: role.permission.hrCategoryAll || false,

                hrAssetView: role.permission.hrAssetView || false,
                hrAssetCreate: role.permission.hrAssetCreate || false,
                hrAssetUpdate: role.permission.hrAssetUpdate || false,
                hrAssetDelete: role.permission.hrAssetDelete || false,
                hrAssetAll: role.permission.hrAssetAll || false,
                hrAssetCopy: role.permission.hrAssetCopy || false,

                hrAssetTransactionView: role.permission.hrAssetTransactionView || false,
                hrAssetTransactionCreate: role.permission.hrAssetTransactionCreate || false,
                hrAssetTransactionUpdate: role.permission.hrAssetTransactionUpdate || false,
                hrAssetTransactionDelete: role.permission.hrAssetTransactionDelete || false,
                hrAssetTransactionAll: role.permission.hrAssetTransactionAll || false,
                hrAssetTransactionChecked: role.permission.hrAssetTransactionChecked || false,
                hrAssetTransactionConfirmed: role.permission.hrAssetTransactionConfirmed || false,
                hrAssetTransactionApproved: role.permission.hrAssetTransactionApproved || false,
                hrAssetTransactionRejected: role.permission.hrAssetTransactionRejected || false,

                hrPurchaseAssetView: role.permission.hrPurchaseAssetView || false,
                hrPurchaseAssetCreate: role.permission.hrPurchaseAssetCreate || false,
                hrPurchaseAssetUpdate: role.permission.hrPurchaseAssetUpdate || false,
                hrPurchaseAssetDelete: role.permission.hrPurchaseAssetDelete || false,
                hrPurchaseAssetAll: role.permission.hrPurchaseAssetAll || false,

                hrAssetTransferStockView: role.permission.hrAssetTransferStockView || false,
                hrAssetTransferStockCreate: role.permission.hrAssetTransferStockCreate || false,
                hrAssetTransferStockUpdate: role.permission.hrAssetTransferStockUpdate || false,
                hrAssetTransferStockDelete: role.permission.hrAssetTransferStockDelete || false,
                hrAssetTransferStockAll: role.permission.hrAssetTransferStockAll || false,

                hrPurchaseAssetHistoryView: role.permission.hrPurchaseAssetHistoryView || false,
                hrPurchaseAssetHistoryCreate: role.permission.hrPurchaseAssetHistoryCreate || false,
                hrPurchaseAssetHistoryUpdate: role.permission.hrPurchaseAssetHistoryUpdate || false,
                hrPurchaseAssetHistoryDelete: role.permission.hrPurchaseAssetHistoryDelete || false,
                hrPurchaseAssetHistoryAll: role.permission.hrPurchaseAssetHistoryAll || false,

                hrCompanyAssetReportView: role.permission.hrCompanyAssetReportView || false
            };

            permissions.value = assetPermissions;
            return;
        }

        const params = {
            dynamicConditions: JSON.stringify([
                {
                    field: '_id',
                    operator: '==',
                    value: roleId
                }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Role`, { params, headers: API_CONFIGS.headers });

        if (response.data && response.data.data && response.data.data.length > 0) {
            currentRoleData.value = response.data.data[0];

            if (currentRoleData.value.permission) {
                const assetPermissions = {
                    hrCompanyAssetDashboard: currentRoleData.value.permission.hrCompanyAssetDashboard || false,

                    hrCategoryView: currentRoleData.value.permission.hrCategoryView || false,
                    hrCategoryCreate: currentRoleData.value.permission.hrCategoryCreate || false,
                    hrCategoryUpdate: currentRoleData.value.permission.hrCategoryUpdate || false,
                    hrCategoryDelete: currentRoleData.value.permission.hrCategoryDelete || false,
                    hrCategoryAll: currentRoleData.value.permission.hrCategoryAll || false,

                    hrAssetView: currentRoleData.value.permission.hrAssetView || false,
                    hrAssetCreate: currentRoleData.value.permission.hrAssetCreate || false,
                    hrAssetUpdate: currentRoleData.value.permission.hrAssetUpdate || false,
                    hrAssetDelete: currentRoleData.value.permission.hrAssetDelete || false,
                    hrAssetAll: currentRoleData.value.permission.hrAssetAll || false,
                    hrAssetCopy: currentRoleData.value.permission.hrAssetCopy || false,

                    hrAssetTransactionView: currentRoleData.value.permission.hrAssetTransactionView || false,
                    hrAssetTransactionCreate: currentRoleData.value.permission.hrAssetTransactionCreate || false,
                    hrAssetTransactionUpdate: currentRoleData.value.permission.hrAssetTransactionUpdate || false,
                    hrAssetTransactionDelete: currentRoleData.value.permission.hrAssetTransactionDelete || false,
                    hrAssetTransactionAll: currentRoleData.value.permission.hrAssetTransactionAll || false,
                    hrAssetTransactionChecked: currentRoleData.value.permission.hrAssetTransactionChecked || false,
                    hrAssetTransactionConfirmed: currentRoleData.value.permission.hrAssetTransactionConfirmed || false,
                    hrAssetTransactionApproved: currentRoleData.value.permission.hrAssetTransactionApproved || false,
                    hrAssetTransactionRejected: currentRoleData.value.permission.hrAssetTransactionRejected || false,

                    hrPurchaseAssetView: currentRoleData.value.permission.hrPurchaseAssetView || false,
                    hrPurchaseAssetCreate: currentRoleData.value.permission.hrPurchaseAssetCreate || false,
                    hrPurchaseAssetUpdate: currentRoleData.value.permission.hrPurchaseAssetUpdate || false,
                    hrPurchaseAssetDelete: currentRoleData.value.permission.hrPurchaseAssetDelete || false,
                    hrPurchaseAssetAll: currentRoleData.value.permission.hrPurchaseAssetAll || false,

                    hrAssetTransferStockView: currentRoleData.value.permission.hrAssetTransferStockView || false,
                    hrAssetTransferStockCreate: currentRoleData.value.permission.hrAssetTransferStockCreate || false,
                    hrAssetTransferStockUpdate: currentRoleData.value.permission.hrAssetTransferStockUpdate || false,
                    hrAssetTransferStockDelete: currentRoleData.value.permission.hrAssetTransferStockDelete || false,
                    hrAssetTransferStockAll: currentRoleData.value.permission.hrAssetTransferStockAll || false,

                    hrPurchaseAssetHistoryView: currentRoleData.value.permission.hrPurchaseAssetHistoryView || false,
                    hrPurchaseAssetHistoryCreate: currentRoleData.value.permission.hrPurchaseAssetHistoryCreate || false,
                    hrPurchaseAssetHistoryUpdate: currentRoleData.value.permission.hrPurchaseAssetHistoryUpdate || false,
                    hrPurchaseAssetHistoryDelete: currentRoleData.value.permission.hrPurchaseAssetHistoryDelete || false,
                    hrPurchaseAssetHistoryAll: currentRoleData.value.permission.hrPurchaseAssetHistoryAll || false,

                    hrCompanyAssetReportView: currentRoleData.value.permission.hrCompanyAssetReportView || false
                };

                permissions.value = assetPermissions;
            }
        }
    } catch (error) {
        console.error("Error fetching role permissions:", error);
    }
};

const savePermissions = async () => {
    try {
        if (!selectedUserId.value) {
            console.error("No user selected");
            errorMessage.value = t('No user selected to assign role');
            showErrorMessage.value = true;
            setTimeout(() => (showErrorMessage.value = false), 4000);
            return;
        }

        if (!isAdminUser.value) {
            errorMessage.value = t('Only Admin and Super Admin users can modify permissions');
            showErrorMessage.value = true;
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        const currentUserId = branchStore.getUserId;
        const isModifyingCurrentUser = selectedUserId.value === currentUserId;

        const userRequestBody = {
            fields: {
                roleId: selectedRole.value
            }
        };

        await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/User/${selectedUserId.value}`, userRequestBody, { headers: API_CONFIGS.headers });

        const params = {
            dynamicConditions: JSON.stringify([
                {
                    field: '_id',
                    operator: '==',
                    value: selectedRole.value
                }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Role`, { params, headers: API_CONFIGS.headers });

        if (response.data && response.data.data && response.data.data.length > 0) {
            const currentRole = response.data.data[0];
            const currentPermissions = currentRole.permission || {};

            const roleName = currentRole.name || '';
            let updatedPermissions;

            if (roleName === 'Admin' || roleName === 'Super Admin') {
                updatedPermissions = {
                    ...currentPermissions,
                    ...createDefaultAdminPermissions()
                };
            } else {
                updatedPermissions = {
                    ...currentPermissions,
                    hrCompanyAssetDashboard: permissions.value.hrCompanyAssetDashboard,

                    hrCategoryView: permissions.value.hrCategoryView,
                    hrCategoryCreate: permissions.value.hrCategoryCreate,
                    hrCategoryUpdate: permissions.value.hrCategoryUpdate,
                    hrCategoryDelete: permissions.value.hrCategoryDelete,
                    hrCategoryAll: permissions.value.hrCategoryAll,

                    hrAssetView: permissions.value.hrAssetView,
                    hrAssetCreate: permissions.value.hrAssetCreate,
                    hrAssetUpdate: permissions.value.hrAssetUpdate,
                    hrAssetDelete: permissions.value.hrAssetDelete,
                    hrAssetAll: permissions.value.hrAssetAll,
                    hrAssetCopy: permissions.value.hrAssetCopy,

                    hrAssetTransactionView: permissions.value.hrAssetTransactionView,
                    hrAssetTransactionCreate: permissions.value.hrAssetTransactionCreate,
                    hrAssetTransactionUpdate: permissions.value.hrAssetTransactionUpdate,
                    hrAssetTransactionDelete: permissions.value.hrAssetTransactionDelete,
                    hrAssetTransactionAll: permissions.value.hrAssetTransactionAll,
                    hrAssetTransactionChecked: permissions.value.hrAssetTransactionChecked,
                    hrAssetTransactionConfirmed: permissions.value.hrAssetTransactionConfirmed,
                    hrAssetTransactionApproved: permissions.value.hrAssetTransactionApproved,
                    hrAssetTransactionRejected: permissions.value.hrAssetTransactionRejected,

                    hrPurchaseAssetView: permissions.value.hrPurchaseAssetView,
                    hrPurchaseAssetCreate: permissions.value.hrPurchaseAssetCreate,
                    hrPurchaseAssetUpdate: permissions.value.hrPurchaseAssetUpdate,
                    hrPurchaseAssetDelete: permissions.value.hrPurchaseAssetDelete,
                    hrPurchaseAssetAll: permissions.value.hrPurchaseAssetAll,

                    hrAssetTransferStockView: permissions.value.hrAssetTransferStockView,
                    hrAssetTransferStockCreate: permissions.value.hrAssetTransferStockCreate,
                    hrAssetTransferStockUpdate: permissions.value.hrAssetTransferStockUpdate,
                    hrAssetTransferStockDelete: permissions.value.hrAssetTransferStockDelete,
                    hrAssetTransferStockAll: permissions.value.hrAssetTransferStockAll,

                    hrPurchaseAssetHistoryView: permissions.value.hrPurchaseAssetHistoryView,
                    hrPurchaseAssetHistoryCreate: permissions.value.hrPurchaseAssetHistoryCreate,
                    hrPurchaseAssetHistoryUpdate: permissions.value.hrPurchaseAssetHistoryUpdate,
                    hrPurchaseAssetHistoryDelete: permissions.value.hrPurchaseAssetHistoryDelete,
                    hrPurchaseAssetHistoryAll: permissions.value.hrPurchaseAssetHistoryAll,

                    hrCompanyAssetReportView: permissions.value.hrCompanyAssetReportView
                };
            }

            const roleRequestBody = {
                fields: {
                    permission: updatedPermissions,
                    updatedBy: branchStore.getUserId
                }
            };

            await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/Role/${selectedRole.value}`, roleRequestBody, { headers: API_CONFIGS.headers });

            socket.emit('dataUpdate', {
                collection: 'Role',
                action: 'update',
                targetUserId: selectedUserId.value,
                targetUserName: selectedUserName.value,
                newRoleId: selectedRole.value,
                newRoleName: roleName,
                newPermissions: updatedPermissions,
                updatedBy: branchStore.getUserId,
                branchId: branchStore.getBranchId,
                isCurrentUser: isModifyingCurrentUser
            });

            if (isModifyingCurrentUser) {

                setTimeout(async () => {
                    await refreshUserPermissions();

                    setTimeout(() => {
                        checkPageAccess();
                    }, 500);
                }, 1000);

                successMessage.value = t('Your permissions have been updated. You may be redirected.');
                showSuccessMessage.value = true;
                setTimeout(() => (showSuccessMessage.value = false), 6000);
            }

            successMessage.value = t('Permission updated successfully!');
            showSuccessMessage.value = true;
            showErrorMessage.value = false;
            setTimeout(() => {
                showSuccessMessage.value = false;
                emit('close');
            }, 1000);

        }
    } catch (error) {
        console.error("Error saving role assignment:", error);
        errorMessage.value = t('Failed to update role and permissions');
        showErrorMessage.value = true;
        setTimeout(() => (showErrorMessage.value = false), 6000);
    }
};


const setupSocketListeners = () => {
    socket.off("dataUpdate");
    socket.on("dataUpdate", async (data) => {
        if (data.collection === "Role") {

            const currentUserId = branchStore.getUserId;

            if (data.targetUserId === currentUserId) {

                // toast.add({
                //     severity: 'info',
                //     summary: 'Permissions Updated',
                //     detail: `Your permissions have been updated by Admin`,
                //     life: 6000,
                // });

                setTimeout(async () => {
                    await refreshUserPermissions();

                    setTimeout(() => {
                        checkPageAccess();
                    }, 500);
                }, 1000);
            }
        }
    });
};



watch(() => props.selectedUser, async (newUser) => {
    if (newUser) {
        selectedUserId.value = newUser._id || newUser.id;
        selectedUserName.value = newUser.displayName || newUser.username;

        if (roleAssignData.value.length === 0) {
            await getAssignRole();
        }

        await getUser();
    }
}, { immediate: true });

watch(() => selectedRole.value, async (newRoleId) => {
    if (newRoleId) {
        await getPermissionsFromRole(newRoleId);
    }
});

// Watch for Category permissions
watch([
    () => permissions.value.hrCategoryView,
    () => permissions.value.hrCategoryCreate,
    () => permissions.value.hrCategoryUpdate,
    () => permissions.value.hrCategoryDelete
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrCategoryAll = allTrue;
});

// Watch for Asset permissions
watch([
    () => permissions.value.hrAssetView,
    () => permissions.value.hrAssetCreate,
    () => permissions.value.hrAssetUpdate,
    () => permissions.value.hrAssetDelete,
    // () => permissions.value.hrAssetCopy
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrAssetAll = allTrue;
});

// Watch for Asset Transaction permissions
watch([
    () => permissions.value.hrAssetTransactionView,
    () => permissions.value.hrAssetTransactionCreate,
    () => permissions.value.hrAssetTransactionUpdate,
    () => permissions.value.hrAssetTransactionDelete,
    () => permissions.value.hrAssetTransactionChecked,
    () => permissions.value.hrAssetTransactionConfirmed,
    () => permissions.value.hrAssetTransactionApproved,
    () => permissions.value.hrAssetTransactionRejected
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrAssetTransactionAll = allTrue;
});

// Watch for Purchase Asset permissions
watch([
    () => permissions.value.hrPurchaseAssetView,
    () => permissions.value.hrPurchaseAssetCreate,
    () => permissions.value.hrPurchaseAssetUpdate,
    () => permissions.value.hrPurchaseAssetDelete
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrPurchaseAssetAll = allTrue;
});

// Watch for Asset Transfer Stock permissions
watch([
    () => permissions.value.hrAssetTransferStockView,
    () => permissions.value.hrAssetTransferStockCreate,
    () => permissions.value.hrAssetTransferStockUpdate,
    () => permissions.value.hrAssetTransferStockDelete
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrAssetTransferStockAll = allTrue;
});

// Watch for Purchase Asset History permissions
watch([
    () => permissions.value.hrPurchaseAssetHistoryView,
    () => permissions.value.hrPurchaseAssetHistoryCreate,
    () => permissions.value.hrPurchaseAssetHistoryUpdate,
    () => permissions.value.hrPurchaseAssetHistoryDelete
], (newValues) => {
    const allTrue = newValues.every(val => val === true);
    const allFalse = newValues.every(val => val === false);
    permissions.value.hrPurchaseAssetHistoryAll = allTrue;
});

// Watch for "All" toggles to update individual permissions
watch(() => permissions.value.hrCategoryAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrCategoryView = newVal;
        permissions.value.hrCategoryCreate = newVal;
        permissions.value.hrCategoryUpdate = newVal;
        permissions.value.hrCategoryDelete = newVal;
    }
});

watch(() => permissions.value.hrAssetAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrAssetView = newVal;
        permissions.value.hrAssetCreate = newVal;
        permissions.value.hrAssetUpdate = newVal;
        permissions.value.hrAssetDelete = newVal;
        permissions.value.hrAssetCopy = newVal;
    }
});

watch(() => permissions.value.hrAssetTransactionAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrAssetTransactionView = newVal;
        permissions.value.hrAssetTransactionCreate = newVal;
        permissions.value.hrAssetTransactionUpdate = newVal;
        permissions.value.hrAssetTransactionDelete = newVal;
        permissions.value.hrAssetTransactionChecked = newVal;
        permissions.value.hrAssetTransactionConfirmed = newVal;
        permissions.value.hrAssetTransactionApproved = newVal;
        permissions.value.hrAssetTransactionRejected = newVal;
    }
});

watch(() => permissions.value.hrPurchaseAssetAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrPurchaseAssetView = newVal;
        permissions.value.hrPurchaseAssetCreate = newVal;
        permissions.value.hrPurchaseAssetUpdate = newVal;
        permissions.value.hrPurchaseAssetDelete = newVal;
    }
});

watch(() => permissions.value.hrAssetTransferStockAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrAssetTransferStockView = newVal;
        permissions.value.hrAssetTransferStockCreate = newVal;
        permissions.value.hrAssetTransferStockUpdate = newVal;
        permissions.value.hrAssetTransferStockDelete = newVal;
    }
});

watch(() => permissions.value.hrPurchaseAssetHistoryAll, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrPurchaseAssetHistoryView = newVal;
        permissions.value.hrPurchaseAssetHistoryCreate = newVal;
        permissions.value.hrPurchaseAssetHistoryUpdate = newVal;
        permissions.value.hrPurchaseAssetHistoryDelete = newVal;
    }
});

watch(() => permissions.value.hrCompanyAssetReportView, (newVal) => {
    if (newVal !== undefined) {
        permissions.value.hrCompanyAssetReportView = newVal;
    }
});

onMounted(async () => {

    setupSocketListeners();

    // Get current user's role first
    await getCurrentUserRole();

    // Then fetch the roles
    await getAssignRole();

    if (props.selectedUser) {
        // If user is provided, fetch their data
        await getUser();
    }
});



onBeforeUnmount(() => {
    socket.off("dataUpdate");
});
</script>



<style>
.toggle-switch {
    appearance: none;
    width: 3rem;
    height: 1.5rem;
    background-color: #ccc;
    border-radius: 9999px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.toggle-switch::before {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background-color: white;
    border-radius: 9999px;
    transition: transform 0.2s ease-in-out;
}

.toggle-switch:checked {
    background-color: #34D399;
    /* emerald-400 */
}

.toggle-switch:checked::before {
    transform: translateX(1.5rem);
}

.toggle-switch:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
    width: 15px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #34D399;
    /* emerald-400 thumb */
    border-radius: 20px;
}

/* Optional hover effect for scrollbar thumb */
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #10B981;
    /* emerald-500 */
}

/* .overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
} */
</style>
