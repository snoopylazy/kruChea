<script setup>
import API_CONFIGS from '@/api/config';
import { fetchTimestamp } from '@/composable/timestamp';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { computed, onMounted, ref, watch } from "vue";
import ErrorMessage from '../components/ErrorMessage.vue';
import SuccessMessage from '../components/SuccessMessage.vue';

const successMessage = ref('');
const showSuccessMessage = ref(false);
const errorMessage = ref('');
const showErrorMessage = ref(false);

const props = defineProps({
    transactionId: {
        type: String,
        required: true
    }
});


const {
    canApproveTransaction,
    canCheckTransaction,
    canConfirmTransaction,
    canRejectTransaction
} = useUserPermission();

const emit = defineEmits(['close', 'updateSuccess']);

const branchStore = useBranchStore();

const transactionData = ref(null);
const isLoading = ref(true);

const approvedDate = ref(new Date());
const selectType = ref(null);
const types = ref([
    { name: 'Check', value: 'checked' },
    { name: 'Confirm', value: 'confirmed' },
    { name: 'Approve', value: 'approved' },
    { name: 'Reject', value: 'rejected' },
]);
const loading = ref(false);

const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

const clearForm = () => {
    approvedDate.value = new Date();
    selectType.value = null;
    errorMessage.value = '';
};

const fetchTransactionDetails = async () => {
    try {
        isLoading.value = true;

        if (!props.transactionId) {
            throw new Error("No transaction ID provided");
        }

        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: props.transactionId }
            ]),
            populate: JSON.stringify(['employeeId', 'assetId']),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = response.data.data || [];

        if (transactions.length > 0) {
            transactionData.value = transactions[0];
        } else {
            errorMessage.value = "Transaction not found";
            showErrorMessage.value = true;
        }
    } catch (error) {
        console.error("Error fetching transaction:", error);
        errorMessage.value = "Failed to load transaction details";
        showErrorMessage.value = true;
    } finally {
        isLoading.value = false;
    }
};

const updateAssetStock = async (assetId, stockChange) => {
    try {
        if (!assetId) {
            console.error("No asset ID provided for stock update");
            return false;
        }

        const timestamp = await fetchTimestamp();
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: assetId },
                // { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        const assets = response.data.data || [];

        if (assets.length === 0) {
            console.error("Asset not found");
            return false;
        }

        const asset = assets[0];
        const currentStock = asset.totalStock || 0;
        const newStock = Math.max(0, currentStock + stockChange);

        const updateResponse = await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${assetId}`,
            {
                fields: {
                    totalStock: newStock,
                    updatedAt: timestamp,
                    updatedBy: branchStore.userId
                }
            },
            { headers: API_CONFIGS.headers }
        );

        if (updateResponse.status === 200 || updateResponse.status === 204) {
            return true;
        } else {
            console.error("Stock update returned unexpected status:", updateResponse.status);
            return false;
        }
    } catch (error) {
        console.error(`Failed to update asset stock: ${error.message}`);
        return false;
    }
};


const createCuttingStockForCheckout = async (assetId, checkoutQuantity, transactionId) => {
    try {
        const timestamp = await fetchTimestamp();


        const returnedAssetsParams = {
            dynamicConditions: JSON.stringify([
                {
                    operator: 'or',
                    conditions: [
                        { field: 'asset.assetId', operator: '==', value: assetId },
                        { field: 'asset._id', operator: '==', value: assetId }
                    ]
                },
                // { field: 'branchId', operator: '==', value: branchStore.branchId }
            ]),
            sortField: 'createdAt',
            sortOrder: 'asc'
        };


        const allHistoryResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: returnedAssetsParams, headers: API_CONFIGS.headers });
        const allHistoryRecords = allHistoryResponse.data.data || [];


        // Debug: Log the first few records to see what we're getting
        if (allHistoryRecords.length > 0) {
        } else {
            console.warn("No purchase history records found for this asset!");

            try {
                const assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
                    params: {
                        dynamicConditions: JSON.stringify([
                            { field: '_id', operator: '==', value: assetId }
                        ])
                    }, headers: API_CONFIGS.headers
                });

                const assets = assetResponse.data.data || [];

            } catch (error) {
                console.error("Error checking asset:", error);
            }
        }

        // Calculate available quantity for each history record
        const historyWithAvailability = await Promise.all(allHistoryRecords.map(async (record) => {
            // Only process records that aren't already marked as out of stock (status = true)
            // unless we absolutely have to
            const cutRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, {
                params: {
                    dynamicConditions: JSON.stringify([
                        { field: 'purchaseAssetHistoryId', operator: '==', value: record._id }
                    ])
                }, headers: API_CONFIGS.headers
            });

            const cuttingStocks = cutRes.data.data || [];

            let checkoutQuantity = 0;
            let returnQuantity = 0;

            cuttingStocks.forEach(cs => {
                if (cs.type === 'check-out') {
                    checkoutQuantity += Math.abs(cs.amount || 0);
                } else if (cs.type === 'return') {
                    returnQuantity += Math.abs(cs.amount || 0);
                }
            });

            const recordQuantity = record.asset.qty || 0;
            const netTransferred = checkoutQuantity - returnQuantity;
            const availableQuantity = recordQuantity - netTransferred;

            return {
                ...record,
                availableQuantity,
                netTransferred,
                // Adding priority: records with status=false (in stock) get higher priority
                priority: record.status === false ? 1 : 0
            };
        }));

        // Filter to get records with available quantity AND sort by priority
        // This ensures we use records marked as "in stock" (status=false) before using ones marked as "out of stock" (status=true)
        const availableRecords = historyWithAvailability
            .filter(record => record.availableQuantity > 0)
            .sort((a, b) => b.priority - a.priority); // Higher priority (in-stock) records first


        // If we don't have any records with available quantity
        if (!availableRecords.length) {
            // Check if we have any records that are not marked as fully used (status = false)
            const inStockRecords = allHistoryRecords.filter(record => record.status === false);

            if (inStockRecords.length > 0) {
                // Use the first available record that's not marked as out of stock
                const historyRecord = inStockRecords[0];

                const cuttingStockData = {
                    fields: {
                        branchId: branchStore.branchId,
                        ref: transactionData.value._id,
                        purchaseAssetHistoryId: historyRecord._id,
                        amount: -checkoutQuantity,
                        type: 'check-out',
                        createdBy: branchStore.userId,
                        createdAt: timestamp
                    }
                };

                const cuttingStockResponse = await axios.post(
                    `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
                    cuttingStockData,
                    { headers: API_CONFIGS.headers }
                );

                const cuttingStockId = cuttingStockResponse.data.data._id;

                const historyUpdateData = {
                    fields: {
                        updatedAt: timestamp,
                        updatedBy: branchStore.userId,
                        cuttingStockIds: [...(historyRecord.cuttingStockIds || []), cuttingStockId],
                        status: true // Mark as out of stock
                    }
                };

                await axios.patch(
                    `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
                    historyUpdateData,
                    { headers: API_CONFIGS.headers }
                );

                return true;
            }

            // If no in-stock records but we have some history records that are marked as out of stock
            else if (allHistoryRecords.length > 0) {
                // We'll use the first record even if marked as out of stock as a fallback
                const historyRecord = allHistoryRecords[0];

                const cuttingStockData = {
                    fields: {
                        branchId: branchStore.branchId,
                        ref: transactionData.value._id,
                        purchaseAssetHistoryId: historyRecord._id,
                        amount: -checkoutQuantity,
                        type: 'check-out',
                        createdBy: branchStore.userId,
                        createdAt: timestamp
                    }
                };

                const cuttingStockResponse = await axios.post(
                    `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
                    cuttingStockData,
                    { headers: API_CONFIGS.headers }
                );

                const cuttingStockId = cuttingStockResponse.data.data._id;

                const historyUpdateData = {
                    fields: {
                        updatedAt: timestamp,
                        updatedBy: branchStore.userId,
                        cuttingStockIds: [...(historyRecord.cuttingStockIds || []), cuttingStockId],
                        status: true // Ensure it's marked as out of stock
                    }
                };

                await axios.patch(
                    `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${historyRecord._id}`,
                    historyUpdateData,
                    { headers: API_CONFIGS.headers }
                );

                return true;
            }


            const cuttingStockData = {
                fields: {
                    branchId: branchStore.branchId,
                    ref: transactionData.value._id,
                    purchaseAssetHistoryId: null,
                    amount: -checkoutQuantity,
                    type: 'check-out',
                    createdBy: branchStore.userId,
                    createdAt: timestamp
                }
            };

            await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, cuttingStockData, { headers: API_CONFIGS.headers });
            return true;
        }

        let remainingQuantity = checkoutQuantity;

        // Log available records for debugging
        availableRecords.forEach((record, index) => {
        });

        for (const record of availableRecords) {
            // Skip records that don't match our asset or have no available quantity
            if (!record.asset || record.asset.assetId !== assetId || record.availableQuantity <= 0) continue;

            if (remainingQuantity <= 0) break;

            // Calculate how much we can take from this record
            const amountFromRecord = Math.min(record.availableQuantity, remainingQuantity);
            remainingQuantity -= amountFromRecord;

            const cuttingStockData = {
                fields: {
                    branchId: branchStore.branchId,
                    ref: transactionData.value._id,
                    purchaseAssetHistoryId: record._id,
                    amount: -amountFromRecord,
                    type: 'check-out',
                    createdBy: branchStore.userId,
                    createdAt: timestamp
                }
            };

            const cuttingStockResponse = await axios.post(
                `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
                cuttingStockData, { headers: API_CONFIGS.headers }
            );

            const cuttingStockId = cuttingStockResponse.data.data._id;

            const historyUpdateData = {
                fields: {
                    updatedAt: timestamp,
                    updatedBy: branchStore.userId,
                    cuttingStockIds: [...(record.cuttingStockIds || []), cuttingStockId]
                }
            };

            const newAvailableQuantity = record.availableQuantity - amountFromRecord;
            if (newAvailableQuantity <= 0) {
                historyUpdateData.fields.status = true; // Mark as out of stock
            }

            await axios.patch(
                `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
                historyUpdateData, { headers: API_CONFIGS.headers }
            );
        }

        if (remainingQuantity > 0) {
            console.warn(`Not enough available stock found. Remaining quantity: ${remainingQuantity}`);
            successMessage.value = `Partial checkout complete. ${remainingQuantity} could not be fulfilled.`;
        } else {
            successMessage.value = 'Asset checkout successfully recorded!';
        }

        showSuccessMessage.value = true;
        showErrorMessage.value = false;

        return true;
    } catch (error) {
        console.error("Error creating cutting stock for checkout:", error);

        errorMessage.value = 'Failed to create cutting stock. Please try again.';
        showErrorMessage.value = true;
        showSuccessMessage.value = false;

        return false;
    }
};

const handleAssetReturn = async (assetId, returnQuantity, transactionId) => {
    try {
        const timestamp = await fetchTimestamp();

        const originalCheckoutParams = {
            dynamicConditions: JSON.stringify([
                { field: 'assetId', operator: '==', value: assetId },
                { field: 'employeeId', operator: '==', value: transactionData.value.employeeId },
                { field: 'transactionType', operator: '==', value: 'checkout' },
                { field: 'status.approved.value', operator: '==', value: 'approved' }
            ]),
            sortField: 'createdAt',
            sortOrder: 'desc'
        };

        const checkoutResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params: originalCheckoutParams, headers: API_CONFIGS.headers });
        const checkoutTransactions = checkoutResponse.data.data || [];


        if (checkoutTransactions.length === 0) {
            console.warn("No original checkout transaction found for this return");
        }

        let cuttingStockRecords = [];

        if (checkoutTransactions.length > 0) {
            const originalTransaction = checkoutTransactions[0];

            const cuttingStockParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'ref', operator: '==', value: originalTransaction._id },
                    { field: 'type', operator: '==', value: 'check-out' }
                ])
            };

            const cuttingStockResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: cuttingStockParams, headers: API_CONFIGS.headers });
            cuttingStockRecords = cuttingStockResponse.data.data || [];
        }


        if (cuttingStockRecords.length > 0) {
            let remainingReturn = returnQuantity;

            for (const checkoutRecord of cuttingStockRecords) {
                if (remainingReturn <= 0) break;

                const returnAmount = Math.min(Math.abs(checkoutRecord.amount), remainingReturn);
                remainingReturn -= returnAmount;

                const returnCuttingStockData = {
                    fields: {
                        branchId: branchStore.branchId,
                        ref: transactionData.value._id,
                        purchaseAssetHistoryId: checkoutRecord.purchaseAssetHistoryId,
                        amount: returnAmount,
                        type: 'return',
                        createdBy: branchStore.userId,
                        createdAt: timestamp
                    }
                };

                const returnResponse = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, returnCuttingStockData, { headers: API_CONFIGS.headers });
                const returnCuttingStockId = returnResponse.data.data._id;

                if (checkoutRecord.purchaseAssetHistoryId) {
                    const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, {
                        params: {
                            dynamicConditions: JSON.stringify([
                                { field: '_id', operator: '==', value: checkoutRecord.purchaseAssetHistoryId }
                            ])
                        }, headers: API_CONFIGS.headers
                    });

                    if (historyResponse.data.data && historyResponse.data.data.length > 0) {
                        const historyRecord = historyResponse.data.data[0];

                        const historyUpdateData = {
                            fields: {
                                updatedAt: timestamp,
                                updatedBy: branchStore.userId,
                                cuttingStockIds: [...(historyRecord.cuttingStockIds || []), returnCuttingStockId],
                                status: false
                            }
                        };

                        await axios.patch(
                            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${checkoutRecord.purchaseAssetHistoryId}`,
                            historyUpdateData,
                            { headers: API_CONFIGS.headers }
                        );
                    }
                }
            }

            if (remainingReturn > 0) {
                // Create a generic return record
                const genericReturnData = {
                    fields: {
                        branchId: branchStore.branchId,
                        ref: transactionData.value._id,
                        purchaseAssetHistoryId: null,
                        amount: remainingReturn,
                        type: 'return',
                        createdBy: branchStore.userId,
                        createdAt: timestamp
                    }
                };

                await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, genericReturnData, { headers: API_CONFIGS.headers });
            }
        } else {
            // No cutting stock records found, create a generic return record
            const genericReturnData = {
                fields: {
                    branchId: branchStore.branchId,
                    ref: transactionData.value._id,
                    purchaseAssetHistoryId: null,
                    amount: returnQuantity,
                    type: 'return',
                    createdBy: branchStore.userId,
                    createdAt: timestamp
                }
            };

            await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, genericReturnData, { headers: API_CONFIGS.headers });
        }

        return true;
    } catch (error) {
        console.error("Error handling asset return:", error);
        return false;
    }
};

const handleSubmit = async () => {
    try {
        if (!approvedDate.value) {
            errorMessage.value = "Please select an approval date";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 3000);
            return;
        }

        if (!selectType.value) {
            errorMessage.value = "Please select approve or reject";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 3000);
            return;
        }

        if (!transactionData.value) {
            errorMessage.value = "Transaction data is missing";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 3000);
            return;
        }

        if (
            (selectType.value.value === 'approved' && !canApproveTransaction()) ||
            (selectType.value.value === 'checked' && !canCheckTransaction()) ||
            (selectType.value.value === 'confirmed' && !canConfirmTransaction())
        ) {
            errorMessage.value = "You do not have permission to perform this action.";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 3000);
            return;
        }

        loading.value = true;
        const timestamp = await fetchTimestamp();

        // Check existing status
        const isAlreadyApproved = transactionData.value.status?.approved?.value === 'approved';
        const isAlreadyRejected = transactionData.value.status?.rejected?.value === 'rejected';
        const isAlreadyChecked = transactionData.value.status?.checked?.value === 'checked';
        const isAlreadyConfirmed = transactionData.value.status?.confirmed?.value === 'confirmed';

        // Check if transaction is already in desired state
        if ((selectType.value.value === 'approved' && isAlreadyApproved) ||
            (selectType.value.value === 'rejected' && isAlreadyRejected) ||
            (selectType.value.value === 'checked' && isAlreadyChecked) ||
            (selectType.value.value === 'confirmed' && isAlreadyConfirmed)) {
            errorMessage.value = `This transaction is already ${selectType.value.value}. No changes needed.`;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 3000);
            loading.value = false;
            return;
        }

        const updatedFields = {
            fields: {
                updatedAt: timestamp,
                updatedBy: branchStore.userId
            }
        };

        if (transactionData.value && transactionData.value.status) {
            updatedFields.fields.status = {
                requested: { ...transactionData.value.status.requested },
                checked: { ...transactionData.value.status.checked },
                confirmed: { ...transactionData.value.status.confirmed },
                approved: { ...transactionData.value.status.approved },
                rejected: { ...transactionData.value.status.rejected }
            };

            // Set appropriate status based on selection
            if (selectType.value.value === 'approved') {
                updatedFields.fields.status.approved = {
                    value: "approved",
                    approvedDate: approvedDate.value.toISOString(),
                    approvedBy: branchStore.userId,
                };
                updatedFields.fields.status.rejected = {
                    value: "",
                    rejectedDate: null,
                    rejectedBy: null,
                };
            } else if (selectType.value.value === 'checked') {
                updatedFields.fields.status.checked = {
                    value: "checked",
                    checkedDate: approvedDate.value.toISOString(),
                    checkedBy: branchStore.userId,
                };
            } else if (selectType.value.value === 'confirmed') {
                updatedFields.fields.status.confirmed = {
                    value: "confirmed",
                    confirmedDate: approvedDate.value.toISOString(),
                    confirmedBy: branchStore.userId,
                };
            } else if (selectType.value.value === 'rejected') {
                updatedFields.fields.status.rejected = {
                    value: "rejected",
                    rejectedDate: approvedDate.value.toISOString(),
                    rejectedBy: branchStore.userId,
                };
                updatedFields.fields.status.approved = {
                    value: "",
                    approvedDate: null,
                    approvedBy: null,
                };
            }
        }

        const response = await axios.patch(
            `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAssetTransaction/${transactionData.value._id}`,
            updatedFields, { headers: API_CONFIGS.headers }
        );

        if (selectType.value.value === 'approved' && !isAlreadyApproved) {
            const assetId = transactionData.value.assetId._id;

            if (transactionData.value.transactionType === 'checkout') {

                const cuttingStockSuccess = await createCuttingStockForCheckout(
                    assetId,
                    transactionData.value.qty,
                    transactionData.value._id
                );

                if (!cuttingStockSuccess) {
                    console.warn("Failed to create cutting stock records, but transaction was approved");
                }

                const stockUpdateSuccess = await updateAssetStock(
                    assetId,
                    -transactionData.value.qty
                );

                if (!stockUpdateSuccess) {
                    console.warn("Failed to update asset stock, but transaction was approved");
                }
            }
            else if (transactionData.value.transactionType === 'returned') {

                const returnSuccess = await handleAssetReturn(
                    assetId,
                    transactionData.value.qty,
                    transactionData.value._id
                );

                if (!returnSuccess) {
                    console.warn("Failed to create return cutting stock records, but transaction was approved");
                }

                const stockUpdateSuccess = await updateAssetStock(
                    assetId,
                    transactionData.value.qty // Positive for returns
                );

                if (!stockUpdateSuccess) {
                    console.warn("Failed to update asset stock for return, but transaction was approved");
                }

                updatedFields.fields.actualReturnDate = timestamp;
            }
        }

        // Emit socket event for real-time update
        socket.emit('dataUpdate', {
            collection: 'CompanyAssetTransaction',
            action: 'update',
            documentId: props.transactionId
        });

        successMessage.value = 'Status updated successfully!';
        showSuccessMessage.value = true;
        showErrorMessage.value = false;
        successAudio.play();
        setTimeout(() => {
            showSuccessMessage.value = false;
            emit('updateSuccess');
            emit('close');
        }, 1000);
    } catch (error) {
        console.error("Error updating transaction:", error);
        errorMessage.value = "Failed to process your request. Please try again.";
        showErrorMessage.value = true;
        showSuccessMessage.value = false;

        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 3000);
    } finally {
        loading.value = false;
    }
};



const filteredTypes = computed(() => {
    const isApproved = transactionData.value?.status?.approved?.value === 'approved';
    return types.value.filter(type => {
        if (type.value === 'approved') return canApproveTransaction();
        if (type.value === 'checked') return canCheckTransaction();
        if (type.value === 'confirmed') return canConfirmTransaction();
        if (type.value === 'rejected') {
            return canRejectTransaction() && !isApproved;
        }
        return false;
    });
});

watch(() => props.transactionId, (newId) => {
    if (newId) {
        fetchTransactionDetails();
    }
}, { immediate: true });

onMounted(() => {
    if (props.transactionId) {
        fetchTransactionDetails();
    }
});

</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-2 z-50 font-khmer">
        <div class="bg-white p-4 sm:p-6 rounded-md shadow-lg w-[90%] sm:w-[80%] md:w-[60%] lg:w-[40%] xl:w-[35%]">
            <!-- Header -->
            <div class="flex justify-between items-center pb-2 mb-4 border-b-2">
                <p class="text-base sm:text-lg font-semibold">Approve Form</p>
                <i class="fa-solid fa-circle-xmark cursor-pointer hover:text-red-500 text-red-700 text-end text-xl"
                    @click="$emit('close')"></i>
            </div>

            <!-- Loading indicator -->
            <div v-if="isLoading" class="py-8 flex flex-col items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                <p class="text-sm text-gray-600">Loading transaction details...</p>
            </div>

            <div v-else>
                <!-- Transaction Info -->
                <!-- <div v-if="transactionData" class="bg-gray-50 p-3 rounded-md mb-4">
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="text-start">
                            <span class="font-medium">Employee:</span>
                            <span class="ml-1">{{ transactionData.employeeId?.khName || transactionData.employeeId ||
                                'N/A' }}</span>
                        </div>
                        <div class="text-start">
                            <span class="font-medium">Asset:</span>
                            <span class="ml-1">{{ transactionData.assetId?.name || transactionData.assetId || 'N/A'
                                }}</span>
                        </div>
                        <div class="text-start">
                            <span class="font-medium">Quantity:</span>
                            <span class="ml-1 font-bold">{{ transactionData.qty || 0 }}</span>
                        </div>
                        <div class="text-start">
                            <span class="font-medium">Type:</span>
                            <span class="ml-1">{{ transactionData.transactionType || 'N/A' }}</span>
                        </div>
                        <div class="text-start col-span-2">
                            <span class="font-medium">Requested By:</span>
                            <span class="ml-1">{{ transactionData.status?.requested?.requestedName || 'N/A' }}</span>
                        </div>
                        <div class="text-start col-span-2">
                            <span class="font-medium">Status:</span>
                            <span class="ml-1 px-2 py-0.5 rounded-full text-xs" :class="{
                                'bg-yellow-100 text-yellow-800': transactionData.status?.requested?.value === 'requested',
                                'bg-green-100 text-green-800': transactionData.status?.approved?.value === 'approved',
                                'bg-red-100 text-red-800': transactionData.status?.rejected?.value === 'rejected'
                            }">
                                {{ transactionData.status?.requested?.value || 'pending' }}
                            </span>
                        </div>
                    </div>
                </div> -->

                <!-- Form -->
                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <!-- Error message -->
                    <div v-if="errorMessage && errorMessage.length"
                        class="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                        {{ errorMessage }}
                    </div>


                    <!-- Approved Date -->
                    <div class="text-start">
                        <label for="approvedDate" class="text-sm font-medium text-gray-700 block mb-1">
                            Approved Date <span class="text-red-500">*</span>
                        </label>
                        <DatePicker v-model="approvedDate" showIcon fluid iconDisplay="input" inputId="approvedDate"
                            class="w-full" :disabled="loading" />
                    </div>

                    <!-- Check Type -->
                    <div class="text-start">
                        <label for="selectType" class="text-sm font-medium text-gray-700 block mb-1">
                            Action <span class="text-red-500">*</span>
                        </label>
                        <Select v-model="selectType" :options="filteredTypes" optionLabel="name"
                            placeholder="Select Type" class="w-full" :disabled="loading" />
                    </div>

                    <div class="flex justify-end space-x-2 mt-4">
                        <button type="button" @click="clearForm"
                            class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105"
                            :disabled="loading">Clear</button>
                        <button type="submit"
                            class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-emerald-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105"
                            :disabled="loading">
                            <span v-if="!loading">Confirm</span>
                            <span v-else class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                                Processing...
                            </span>
                        </button>
                    </div>
                </form>
            </div>

            <!-- Success message -->
            <!-- <div v-if="showSuccess" class="fixed inset-0 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
                    <div class="flex items-center justify-center text-green-500 mb-4">
                        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7">
                            </path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-center text-gray-900">
                        {{ selectType?.value === 'approved' ? 'Approved successfully!' : 'Rejected successfully!' }}
                    </h3>
                </div>
            </div> -->
        </div>


        <!-- Success and Error Messages -->
        <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
        <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />

    </div>
</template>