<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n()


// Reactive state
const selectedTab = ref('checkout'); // Use only this for tab state

const isFilter = ref(false);
const currentDate = ref([null, null]);

const branchStore = useBranchStore();

const openDropdownId = ref(null);
const dropdownRefs = ref({});

const showTransactionType = ref(false);
const showCheckType = ref(false);
const showConfirmDialog = ref(false);
const selectedItem = ref(null); // To track the selected item for modals

const startDate = ref();
const endDate = ref();
const returnDate = ref();
const checkDate = ref();
const isLoading = ref(false);
const tableData = ref([]);
const searchText = ref('');
const selectItem = ref(10); // Items per page
const transactionType = ref(""); // Transaction type filter
const Transaction = ref(); // For modal
const CheckTypes = ref(); // For modal
const isDeleting = ref(false);
const searchQuery = ref('');
const loading = ref(false);
const employeeData = ref([]);
const pendingTransactionId = ref(null);

// Add missing variables
const currentId = ref(null);
const formSelectedOperation = ref('returned');
const remark = ref('');
const quantity = ref();

//Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3')

const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");

const dateRange = ref();



// Define the directive inside setup
const vIntersect = {
    mounted(el) {
        el.classList.add('opacity-0', 'translate-y-6', 'transition-all', 'duration-700');

        const observer = new IntersectionObserver(([entry], observer) => {
            if (entry.isIntersecting) {
                el.classList.remove('opacity-0', 'translate-y-6');
                el.classList.add('opacity-100', 'translate-y-0');
                observer.unobserve(el);
            }
        }, {
            threshold: 0.1,
        });

        observer.observe(el);
    }
};


// TransactionTyoe
const types = ref([
    { name: 'CheckOut', value: 'checkout' },
    { name: 'Return', value: 'returned' },
]);

// Pagenation
const currentPage = ref(1);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(false);

const selectedRow = ref({ name: '10' });
const row = ref([
    { name: '10' },
    { name: '50' },
    { name: '100' },
    { name: '500' },
    { name: '1000' }
]);


const {
    canApproveTransaction,
    canCheckTransaction,
    canConfirmTransaction,
    canUpdateTransaction,
    canCreateTransaction,
    canViewTransaction,
    canDeleteTransaction
} = useUserPermission();


// Pagination

const handleListenToPagination = (items) => {
    tableData.value = items || [];
};

const handleListenIsLoading = (loading) => {
    isLoading.value = loading;
};

const handleListenIsLastRecordOnPage = (status) => {
    currentPageIsLastRecord.value = status;
}




const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    // Don't set default filters - let user choose when to filter
    startDate.value = null;
    endDate.value = null;
    currentDate.value = [null, null];
    isFilter.value = false;
};



const closeEdit = () => {
    showTransactionType.value = false;
    selectedItem.value = null;
};

const clearForm = () => {
    returnDate.value = null;
    Transaction.value = null;
    remark.value = '';
    formSelectedOperation.value = '';
};



const handleSearch = () => {
    if (dateRange.value && dateRange.value.length === 2) {
        currentDate.value = [dateRange.value[0], dateRange.value[1]];
        // Also update startDate and endDate for fetchTransactionType compatibility
        startDate.value = moment(dateRange.value[0]).format('DD/MM/YYYY');
        endDate.value = moment(dateRange.value[1]).format('DD/MM/YYYY');
        isFilter.value = true;
    } else {
        currentDate.value = [null, null];
        startDate.value = null;
        endDate.value = null;
        isFilter.value = false;
    }
    currentPage.value = 1; // Reset to first page
    fetchTransactionType(); // Trigger data fetch with new filters
};

const clearFilters = () => {
    dateRange.value = null;
    currentDate.value = [null, null];
    startDate.value = null;
    endDate.value = null;
    isFilter.value = false;
    currentPage.value = 1; // Reset to first page
    fetchTransactionType(); // Trigger data fetch without filters
};




// Clear Form Transaction
const clearTransactionForm = () => {
    returnDate.value = null;
    Transaction.value = null;
    showTransactionType.value = false;
    selectedItem.value = null;
};

// Clear from Approve
const clearCheckForm = () => {
    checkDate.value = null;
    CheckTypes.value = null;
    showCheckType.value = false;
    selectedItem.value = null;
};

// Open Transaction Modal
function openTransactionModal(id) {
    selectedItem.value = id;
    currentId.value = id;
    showTransactionType.value = true;
    openDropdownId.value = null;

    const transaction = tableData.value.find(item => item._id === id);
    if (transaction) {
        // If the transaction is a checkout, set to today, else use actualReturnDate if available
        if (transaction.transactionType === "checkout") {
            returnDate.value = moment().format('DD-MM-YYYY'); // Use ISO format for DatePicker
        } else {
            returnDate.value = transaction.actualReturnDate
                ? moment(transaction.actualReturnDate).format('DD-MM-YYYY')
                : "";
        }
        // Also set the operation type for the modal
        formSelectedOperation.value = transaction.transactionType;
    } else {
        returnDate.value = "";
        formSelectedOperation.value = "";
    }
}



const fetchTransactionType = async () => {
    try {
        isLoading.value = true;
        tableData.value = [];

        const isAdmin = branchStore.isAdminOrSuperAdmin ||
            branchStore.getUserRole === 'Admin' ||
            branchStore.getUserRole === 'Super Admin';

        // Build dynamic conditions
        const dynamicConditions = [
            { field: "branchId", operator: "==", value: branchStore.branchId },
            { field: "transactionType", operator: "==", value: selectedTab.value }
        ];

        // Apply date filters if they exist
        if (isFilter.value && currentDate.value && currentDate.value[0] && currentDate.value[1]) {
            const filterStartDate = moment(currentDate.value[0]).startOf('day').tz('UTC').toDate();
            const filterEndDate = moment(currentDate.value[1]).endOf('day').tz('UTC').toDate();

            dynamicConditions.push(
                {
                    field: 'createdAt',
                    operator: '&gte',
                    value: filterStartDate,
                    type: "Date"
                },
                {
                    field: 'createdAt',
                    operator: '&lte',
                    value: filterEndDate,
                    type: "Date"
                }
            );
        }

        // For non-admins, filter by chiefIds or createdBy
        if (!isAdmin) {
            dynamicConditions.push({
                field: 'chiefIds',
                operator: 'arrayContains',
                value: branchStore.userId
            });
        }

        const params = {
            collectionName: 'CompanyAssetTransaction',
            pageSize: pageSize.value,
            page: currentPage.value,
            populate: JSON.stringify(['employeeId', 'assetId']),
            dynamicConditions: JSON.stringify(dynamicConditions),
            sortField: 'createdAt',
            sortOrder: 'desc'
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getPaginationTwo`, { params, headers: API_CONFIGS.headers });

        if (response.status === 200) {
            tableData.value = response.data.data || [];
        }
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        tableData.value = [];
        showErrorMessage.value = true;
        errorMessage.value = "Failed to load transaction data";
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        isLoading.value = false;
    }
};









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
        console.log("cannot fetch employee", error)
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



const checkAssetAvailability = async (assetId, employeeId) => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: "assetId", operator: "==", value: assetId },
                { field: "branchId", operator: "==", value: branchStore.branchId },
                { field: "actualReturnDate", operator: "==", value: null },
            ]),
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
        console.error("Error checking asset stock:", error);
        console.error("Error details:", error.response?.data);
        return {
            available: false,
            message: "Error checking stock availability"
        };
    }
};

const createTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;

    try {
        if (!selectedEmployee.value || !selectedAsset.value) {
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
            const stockResult = await checkAssetStockAvailability(selectedAsset.value, quantity.value);
            if (!stockResult.available) {
                errorMessage.value = stockResult.message;
                showErrorMessage.value = true;
                errorAudio.play();
                setTimeout(() => showErrorMessage.value = false, 5000);
                loading.value = false;
                return;
            }
        }

        const timestamp = await fetchTimestamp();

        const mainBranchId = getMainBranchIdFromEmployee(selectedEmployee.value);

        const requestBody = {
            fields: {
                assetId: selectedAsset.value,
                employeeId: selectedEmployee.value,
                transactionType: createSelectedOperation.value,
                checkOutDate: timestamp,
                qty: quantity.value,
                remark: remark.value || "",
                status: {
                    requested: {
                        value: "requested",
                        requestedDate: timestamp,
                        requestedBy: branchStore.getUserId,
                        requestedName: branchStore.getUserName,
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
            }
        };

        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CompanyAssetTransaction`, requestBody, { headers: API_CONFIGS.headers });

        if (response.status === 200 || response.status === 201) {
            const transactionId = response.data.data._id;
            currentId.value = transactionId;


            successMessage.value = "Successfully created transaction";
            showSuccessMessage.value = true;
            successAudio.play();
            setTimeout(() => showSuccessMessage.value = false, 800);

            currentPage.value = 1;
            await fetchTransactionType();
        }

        clearForm();
        closeForm();

    } catch (error) {
        console.log("Error:", error);
        if (error.response) {
            if (error.response.status === 400) {
                errorMessage.value = "Please fill in all required fields";
            } else if (error.response.status === 409) {
                errorMessage.value = "This asset already exists";
            } else {
                errorMessage.value = "An unknown error occurred";
            }
        } else {
            errorMessage.value = "Network error. Please check your connection.";
        }

        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        loading.value = false;
    }
};

// Function to handle transaction status updates
const handleTransactionStatusUpdate = async (transactionId, newStatus) => {
    try {
        // Fetch the transaction details
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: transactionId }
            ]),
            populate: JSON.stringify(['assetId', 'employeeId'])
        };

        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];

        if (!transactions.length) {
            console.error("Transaction not found");
            return false;
        }

        const transaction = transactions[0];

        // Get mainBranchId from employee's representativeName
        const mainBranchId = getMainBranchIdFromEmployee(transaction.employeeId);

        // If the transaction is a checkout and is now approved, create cutting stock records
        if (transaction.transactionType === "checkout" && newStatus === "approved") {
            await createCuttingStockForCheckout(transaction.assetId, transaction.qty, transactionId);
            await updateAssetStock(transaction.assetId, -transaction.qty, transaction.employeeId);
        }

        return true;
    } catch (error) {
        console.error("Error handling transaction status update:", error);
        return false;
    }
};

// New function to create cutting stock records for checkout operations
const createCuttingStockForCheckout = async (assetId, checkoutQuantity, transactionId) => {
    try {
        const timestamp = await fetchTimestamp();

        // Get the transaction to get the employeeId for mainBranchId
        const transactionParams = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: transactionId }
            ]),
            populate: JSON.stringify(['employeeId'])
        };

        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params: transactionParams, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];

        if (!transactions.length) {
            console.error("Transaction not found for cutting stock creation");
            return false;
        }

        const transaction = transactions[0];

        // Get mainBranchId from employee's representativeName
        const mainBranchId = getMainBranchIdFromEmployee(transaction.employeeId);

        // Get purchase asset history records for this asset (in stock ones first)
        const historyParams = {
            dynamicConditions: JSON.stringify([
                {
                    field: 'asset.assetId',
                    operator: '==',
                    value: assetId
                },
                { field: 'branchId', operator: '==', value: branchStore.branchId },
                { field: 'status', operator: '==', value: false } // Only in stock items
            ]),
            sortField: 'createdAt',
            sortOrder: 'asc' // Oldest first for FIFO
        };

        const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        const historyRecords = historyResponse.data.data || [];

        if (!historyRecords.length) {
            console.error("No purchase asset history records found for checkout");

            // Important: If no history records found but we have assetId,
            // we might be dealing with a transferred asset that doesn't have proper history records
            // In this case, create a single cutting stock record for the entire quantity
            await createFallbackCuttingStock(assetId, checkoutQuantity, transactionId, timestamp, mainBranchId);
            return true;
        }

        let remainingQuantity = checkoutQuantity;
        let totalProcessed = 0;

        // Create cutting stocks following FIFO
        for (const record of historyRecords) {
            // Defensive: skip if assetId does not match
            if (!record.asset || record.asset.assetId !== assetId) continue;

            if (remainingQuantity <= 0) break;

            // Calculate available quantity in this record
            const recordQuantity = record.asset.qty || 0;

            // Calculate how much is already used from this record
            let usedQuantity = 0;
            if (record.cuttingStockIds && record.cuttingStockIds.length > 0) {
                // Fetch existing cutting stocks for this record
                const cuttingStockParams = {
                    dynamicConditions: JSON.stringify([
                        { field: '_id', operator: 'in', value: record.cuttingStockIds }
                    ])
                };

                const cuttingStockResponse = await axios.get(
                    `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
                    { params: cuttingStockParams, headers: API_CONFIGS.headers }
                );

                const cuttingStocks = cuttingStockResponse.data.data || [];

                // Calculate how much is already used
                cuttingStocks.forEach(stock => {
                    if (stock.type === 'check-out' || stock.type === 'transfer') {
                        usedQuantity += Math.abs(stock.amount || 0);
                    }
                });
            }

            const availableQuantity = recordQuantity - usedQuantity;

            if (availableQuantity <= 0) continue;

            // Calculate amount to take from this record
            const amountFromRecord = Math.min(availableQuantity, remainingQuantity);
            remainingQuantity -= amountFromRecord;
            totalProcessed += amountFromRecord;


            // Create cutting stock record WITH NEGATIVE AMOUNT for checkout
            const cuttingStockData = {
                fields: {
                    branchId: branchStore.branchId,
                    mainBranchId: mainBranchId, // <-- Add mainBranchId from employee
                    ref: transactionId, // Reference to the transaction
                    purchaseAssetHistoryId: record._id, // Link to the history record
                    amount: -amountFromRecord, // NEGATIVE for checkout
                    type: 'check-out',
                    createdBy: branchStore.userId,
                    createdAt: timestamp
                }
            };

            const cuttingStockResponse = await axios.post(
                `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
                cuttingStockData, { headers: API_CONFIGS.headers }
            );

            // Get the new cutting stock ID
            const cuttingStockId = cuttingStockResponse.data.data._id;

            // Update the purchase asset history record to include this cutting stock ID
            const historyUpdateData = {
                fields: {
                    updatedAt: timestamp,
                    updatedBy: branchStore.userId,
                    cuttingStockIds: [...(record.cuttingStockIds || []), cuttingStockId]
                }
            };

            // If this record is now fully used, mark it as out of stock
            if (availableQuantity <= amountFromRecord) {
                historyUpdateData.fields.status = true; // Out of stock
            }

            await axios.patch(
                `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
                historyUpdateData, { headers: API_CONFIGS.headers }
            );
        }

        // If we still have remaining quantity, create a fallback cutting stock
        if (remainingQuantity > 0) {
            await createFallbackCuttingStock(assetId, remainingQuantity, transactionId, timestamp, mainBranchId);
            totalProcessed += remainingQuantity;
        }

        return true;
    } catch (error) {
        console.error("Error creating cutting stock for checkout:", error);
        return false;
    }
};





// Helper function to create a cutting stock without a purchase asset history record
const createFallbackCuttingStock = async (assetId, quantity, transactionId, timestamp, mainBranchId) => {
    try {

        // For transferred assets without proper history records, we create a cutting stock
        // that's directly linked to the transaction without a purchase history record
        const cuttingStockData = {
            fields: {
                branchId: branchStore.branchId,
                mainBranchId: mainBranchId, // <-- Add mainBranchId from employee
                ref: transactionId,
                amount: -quantity, // NEGATIVE for checkout
                type: 'check-out',
                createdBy: branchStore.userId,
                createdAt: timestamp || await fetchTimestamp()
            }
        };

        // We need to find if there's a relevant purchase asset history to link to
        const historyParams = {
            dynamicConditions: JSON.stringify([
                { field: 'asset.assetId', operator: '==', value: assetId },
                { field: 'isTransfer', operator: '==', value: true } // Likely a transferred asset
            ]),
            sortField: 'createdAt',
            sortOrder: 'asc' // Oldest first for FIFO
        };

        const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        const transferHistoryRecords = historyResponse.data.data || [];

        if (transferHistoryRecords.length > 0) {
            // Link to the first transfer record we find
            const record = transferHistoryRecords[0];
            cuttingStockData.fields.purchaseAssetHistoryId = record._id;


            const cuttingStockResponse = await axios.post(
                `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
                cuttingStockData, { headers: API_CONFIGS.headers }
            );

            // Get the new cutting stock ID
            const cuttingStockId = cuttingStockResponse.data.data._id;

            // Update the purchase asset history record to include this cutting stock ID
            const historyUpdateData = {
                fields: {
                    updatedAt: timestamp || await fetchTimestamp(),
                    updatedBy: branchStore.userId,
                    cuttingStockIds: [...(record.cuttingStockIds || []), cuttingStockId]
                }
            };

            await axios.patch(
                `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
                historyUpdateData, { headers: API_CONFIGS.headers }
            );
        } else {
            // No history record found, just create the cutting stock
            await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, cuttingStockData, { headers: API_CONFIGS.headers });
        }

        return true;
    } catch (error) {
        console.error("Error creating fallback cutting stock:", error);
        return false;
    }
};



// Helper function to create a cutting stock without a purchase asset history record
// const createFallbackCuttingStock = async (assetId, quantity, transactionId, timestamp, mainBranchId) => {
//     try {

//         const cuttingStockData = {
//             fields: {
//                 branchId: branchStore.branchId,
//                 mainBranchId: mainBranchId, // <-- Add mainBranchId from employee
//                 ref: transactionId,
//                 amount: -quantity, // NEGATIVE for checkout
//                 type: 'check-out',
//                 createdBy: branchStore.userId,
//                 createdAt: timestamp || await fetchTimestamp()
//             }
//         };

//         // We need to find if there's a relevant purchase asset history to link to
//         const historyParams = {
//             dynamicConditions: JSON.stringify([
//                 { field: 'asset.assetId', operator: '==', value: assetId },
//                 { field: 'branchId', operator: '==', value: branchStore.branchId },
//                 { field: 'isTransfer', operator: '==', value: true } // Likely a transferred asset
//             ]),
//             sortField: 'createdAt',
//             sortOrder: 'asc' // Oldest first for FIFO
//         };

//         const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
//         const transferHistoryRecords = historyResponse.data.data || [];

//         if (transferHistoryRecords.length > 0) {
//             // Link to the first transfer record we find
//             const record = transferHistoryRecords[0];
//             cuttingStockData.fields.purchaseAssetHistoryId = record._id;


//             const cuttingStockResponse = await axios.post(
//                 `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
//                 cuttingStockData, { headers: API_CONFIGS.headers }
//             );

//             // Get the new cutting stock ID
//             const cuttingStockId = cuttingStockResponse.data.data._id;

//             // Update the purchase asset history record to include this cutting stock ID
//             const historyUpdateData = {
//                 fields: {
//                     updatedAt: timestamp || await fetchTimestamp(),
//                     updatedBy: branchStore.userId,
//                     cuttingStockIds: [...(record.cuttingStockIds || []), cuttingStockId]
//                 }
//             };

//             await axios.patch(
//                 `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
//                 historyUpdateData, { headers: API_CONFIGS.headers }
//             );
//         } else {
//             // No history record found, just create the cutting stock
//             await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`, cuttingStockData, { headers: API_CONFIGS.headers });
//         }

//         return true;
//     } catch (error) {
//         console.error("Error creating fallback cutting stock:", error);
//         return false;
//     }
// };



const updateAssetStock = async (assetId, stockChange, employeeId = null) => {
    try {
        const timestamp = await fetchTimestamp();

        // Get mainBranchId from employee's representativeName if employeeId is provided
        // let mainBranchId = null;
        // if (employeeId) {
        //     mainBranchId = getMainBranchIdFromEmployee(employeeId);
        // }

        // First, try to find the asset by its _id (the actual assetId from the transaction)
        let params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: assetId }
            ])
        };

        let assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        let assets = assetResponse.data.data || [];

        // If not found by _id, try finding by mainTransferId (for transferred assets)
        // if (!assets.length) {
        //     const transferParams = {
        //         dynamicConditions: JSON.stringify([
        //             { field: 'mainTransferId', operator: '==', value: assetId },
        //             // { field: 'branchId', operator: '==', value: branchStore.branchId }
        //         ])
        //     };
        //     const transferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params: transferParams, headers: API_CONFIGS.headers });
        //     const transferAssets = transferResponse.data.data || [];

        //     if (transferAssets.length > 0) {
        //         assets = transferAssets;
        //     }
        // }

        // If still not found, throw error
        // if (!assets.length) {
        //     throw new Error(`Asset not found: ${assetId}`);
        // }

        const asset = assets[0];
        const currentStock = asset.totalStock || 0;
        const newStock = Math.max(0, currentStock + stockChange);


        // Update the asset's total stock
        const updateBody = {
            fields: {
                totalStock: newStock,
                updatedAt: timestamp,
                updatedBy: branchStore.userId
            }
        };

        // Add mainBranchId to update if available
        // if (mainBranchId) {
        //     updateBody.fields.mainBranchId = mainBranchId;
        // }

        await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${asset._id}`, updateBody, { headers: API_CONFIGS.headers });

        return true;
    } catch (error) {
        console.error(`Failed to update asset stock: ${error.message}`);
        return false;
    }
};




// const updateAssetStock = async (assetId, stockChange, employeeId = null) => {
//     try {
//         const timestamp = await fetchTimestamp();

//         // Get mainBranchId from employee's representativeName if employeeId is provided
//         let mainBranchId = null;
//         if (employeeId) {
//             mainBranchId = getMainBranchIdFromEmployee(employeeId);
//         }

//         // First, try to find the asset by its _id (the actual assetId from the transaction)
//         let params = {
//             dynamicConditions: JSON.stringify([
//                 { field: '_id', operator: '==', value: assetId },
//                 { field: 'branchId', operator: '==', value: branchStore.branchId }
//             ])
//         };

//         let assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
//         let assets = assetResponse.data.data || [];

//         // If not found by _id, try finding by mainTransferId (for transferred assets)
//         if (!assets.length) {
//             const transferParams = {
//                 dynamicConditions: JSON.stringify([
//                     { field: 'mainTransferId', operator: '==', value: assetId },
//                     { field: 'branchId', operator: '==', value: branchStore.branchId }
//                 ])
//             };
//             const transferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params: transferParams, headers: API_CONFIGS.headers });
//             const transferAssets = transferResponse.data.data || [];

//             if (transferAssets.length > 0) {
//                 assets = transferAssets;
//             }
//         }

//         // If still not found, throw error
//         if (!assets.length) {
//             throw new Error(`Asset not found: ${assetId}`);
//         }

//         const asset = assets[0];
//         const currentStock = asset.totalStock || 0;
//         const newStock = Math.max(0, currentStock + stockChange);


//         // Update the asset's total stock
//         const updateBody = {
//             fields: {
//                 totalStock: newStock,
//                 updatedAt: timestamp,
//                 updatedBy: branchStore.userId
//             }
//         };

//         // Add mainBranchId to update if available
//         if (mainBranchId) {
//             updateBody.fields.mainBranchId = mainBranchId;
//         }

//         await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${asset._id}`, updateBody, { headers: API_CONFIGS.headers });

//         return true;
//     } catch (error) {
//         console.error(`Failed to update asset stock: ${error.message}`);
//         return false;
//     }
// };


// const updateCuttingStockForReturn = async (assetId, returnQuantity, transactionId, employeeId) => {
//     try {
//         // Find related cutting stock records for this asset and transaction
//         const timestamp = await fetchTimestamp();
//         const params = {
//             dynamicConditions: JSON.stringify([
//                 { field: 'ref', operator: '==', value: transactionId },
//                 { field: 'type', operator: '==', value: 'check-out' },
//             ])
//         };
//         const cuttingStockRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params, headers: API_CONFIGS.headers });
//         const cuttingStocks = cuttingStockRes.data.data || [];
//         let qtyToReturn = returnQuantity;
//         for (const stock of cuttingStocks) {
//             if (qtyToReturn <= 0) break;
//             // Only update negative amounts (borrowed)
//             if (stock.amount < 0) {
//                 const borrowedAmount = Math.abs(stock.amount);
//                 const updateAmount = Math.min(borrowedAmount, qtyToReturn);
//                 const newAmount = -(borrowedAmount - updateAmount); // e.g. -5 + 2 returned = -3
//                 qtyToReturn -= updateAmount;
//                 await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CuttingStock/${stock._id}`, {
//                     fields: {
//                         amount: newAmount,
//                         updatedAt: timestamp,
//                         updatedBy: branchStore.userId
//                     }
//                 }, { headers: API_CONFIGS.headers });
//             }
//         }
//         // If there is still qtyToReturn left (should not happen unless logic error), log warning
//         if (qtyToReturn > 0) {
//             console.warn(`Returned quantity (${returnQuantity}) exceeds borrowed amount for transaction ${transactionId}`);
//         }
//         return true;
//     } catch (error) {
//         console.error('Error updating cutting stock for return:', error);
//         return false;
//     }
// };



// Helper to update cutting stock for asset return
const updateCuttingStockForReturn = async (assetId, returnQuantity, transactionId, employeeId) => {
    try {
        const timestamp = await fetchTimestamp();
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'ref', operator: '==', value: transactionId },
                { field: 'type', operator: '==', value: 'check-out' },
            ])
        };
        const cuttingStockRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params, headers: API_CONFIGS.headers });
        const cuttingStocks = cuttingStockRes.data.data || [];
        let qtyToReturn = returnQuantity;
        for (const stock of cuttingStocks) {
            if (qtyToReturn <= 0) break;
            if (stock.amount < 0) {
                const borrowedAmount = Math.abs(stock.amount);
                const updateAmount = Math.min(borrowedAmount, qtyToReturn);
                const newAmount = -(borrowedAmount - updateAmount);
                qtyToReturn -= updateAmount;
                await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CuttingStock/${stock._id}`, {
                    fields: {
                        amount: newAmount,
                        updatedAt: timestamp,
                        updatedBy: branchStore.userId
                    }
                }, { headers: API_CONFIGS.headers });
            }
        }
        if (qtyToReturn > 0) {
            console.warn(`Returned quantity (${returnQuantity}) exceeds borrowed amount for transaction ${transactionId}`);
        }

        const historyParams = {
            dynamicConditions: JSON.stringify([
                { field: 'asset.assetId', operator: '==', value: assetId },
            ])
        };
        const historyRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        const historyRecords = historyRes.data.data || [];
        for (const record of historyRecords) {
            let usedQuantity = 0;
            if (record.cuttingStockIds && record.cuttingStockIds.length > 0) {
                const cuttingStockParams = {
                    dynamicConditions: JSON.stringify([
                        { field: '_id', operator: 'arrayContains', value: record.cuttingStockIds }
                    ])
                };
                const cuttingStockResponse = await axios.get(
                    `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
                    { params: cuttingStockParams, headers: API_CONFIGS.headers }
                );
                const cuttingStocks = cuttingStockResponse.data.data || [];
                cuttingStocks.forEach(stock => {
                    if (stock.type === 'check-out' || stock.type === 'transfer') {
                        usedQuantity += Math.abs(stock.amount || 0);
                    }
                });
            }

            if (record.status !== false) {
                await axios.patch(
                    `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
                    {
                        fields: {
                            status: false,
                            updatedAt: timestamp,
                            updatedBy: branchStore.userId
                        }
                    },
                    { headers: API_CONFIGS.headers }
                );
            }
        }
        return true;
    } catch (error) {
        console.error('Error updating cutting stock for return:', error);
        return false;
    }
};


const updateStockWhenDeleteTransaction = async (assetId, stockChange, employeeId = null) => {

    try {
        const timestamp = await fetchTimestamp();
        let params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: assetId },
                // { field: 'status.approved.value', operator: '==', value: 'approved' },
            ])
        };

        let assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        let assets = assetResponse.data.data || [];

        const asset = assets[0];
        const currentStock = asset.totalStock || 0;
        const newStock = Math.max(0, currentStock + stockChange);

        const updateBody = {
            fields: {
                totalStock: newStock,
                updatedAt: timestamp,
                updatedBy: branchStore.userId
            }
        };

        await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${asset._id}`, updateBody, { headers: API_CONFIGS.headers });

        return true;
    } catch (error) {
        console.error(`Failed to update asset stock: ${error.message}`);
        return false;
    }

}



const updateTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;
    try {
        if (!returnDate.value) {
            errorMessage.value = t("Please select a return date");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }
        if (formSelectedOperation.value !== 'returned') {
            errorMessage.value = t("Please select 'Return' as the transaction type");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }
        if (!quantity.value || quantity.value <= 0) {
            errorMessage.value = t("Please input quantity greater than 0");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: currentId.value }
            ])
        };
        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];
        if (!transactions.length) {
            throw new Error(t("Transaction not found"));
        }
        const transaction = transactions[0];
        const timestamp = await fetchTimestamp();
        const mainBranchId = getMainBranchIdFromEmployee(transaction.employeeId);
        // Track returnedQty, default to 0 if not present
        let returnedQty = transaction.returnedQty || 0;
        const totalQty = transaction.qty || 0;
        // Prevent returning more than borrowed
        if (returnedQty + quantity.value > totalQty) {
            errorMessage.value = t(`Cannot return more than borrowed. You Borrowed only: ${totalQty}`);
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }
        // Update returnedQty
        returnedQty += quantity.value;
        // Update asset stock for returned quantity
        await updateAssetStock(transaction.assetId, +quantity.value, transaction.employeeId);

        // Update cutting stock for returned quantity
        await updateCuttingStockForReturn(transaction.assetId, +quantity.value, transaction._id, transaction.employeeId);


        // Calculate remaining borrowed quantity
        const remainingQty = totalQty - returnedQty;
        // Prepare update fields
        let updateFields = {
            qty: remainingQty > 0 ? remainingQty : 0,
            returnedQty: returnedQty, // Track total returned
            remark: remark.value || "",
            updatedBy: branchStore.userId,
            branchId: branchStore.branchId,
            mainBranchId: mainBranchId,
            updatedAt: timestamp,
        };
        if (returnedQty === totalQty) {
            updateFields.transactionType = 'returned';
            updateFields.actualReturnDate = timestamp;
        }
        const response = await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAssetTransaction/${currentId.value}`, { fields: updateFields }, { headers: API_CONFIGS.headers });
        if (response.status === 200 || response.status === 204) {
            successMessage.value = returnedQty === totalQty
                ? t("Successfully returned all assets")
                : t(`Returned ${quantity.value} assets. ${totalQty - returnedQty} left to return.`);
            showSuccessMessage.value = true;
            successAudio.play();
            setTimeout(() => (showSuccessMessage.value = false), 800);
            fetchTransactionType();
            closeEdit();
        }
    } catch (error) {
        console.error('Error processing return:', error);
        errorMessage.value = error.message || "Error updating transaction";
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        loading.value = false;
    }
}


const handleDeleteConfirmation = async (id) => {
    try {
        loading.value = true;
        showConfirmDialog.value = false;
        showSuccessMessage.value = false;
        showErrorMessage.value = false;

        const timestamp = await fetchTimestamp();

        // Fetch transaction
        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: pendingTransactionId.value },
                // { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };
        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];

        if (!transactions.length) {
            errorMessage.value = t("Transaction not found");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        const transaction = transactions[0];

        // Prevent delete if status is approved and user is not Admin/Super Admin
        const userRole = branchStore.getUserRole;
        if (
            transaction.status?.approved?.value === 'approved' &&
            userRole !== 'Admin' &&
            userRole !== 'Super Admin'
        ) {
            errorMessage.value = t("Cannot delete the transaction.");
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        // If transaction has actualReturnDate or qty > 0 (still owes assets), show error and stop
        // if (transaction.actualReturnDate || (transaction.qty && transaction.qty > 0)) {
        //     errorMessage.value = t("Cannot delete transaction: You Still Owe the asset.");
        //     showErrorMessage.value = true;
        //     errorAudio.play();
        //     setTimeout(() => (showErrorMessage.value = false), 5000);
        //     return;
        // }

        // Insert delete log before deleting
        const logBody = {
            fields: {
                branchId: branchStore.branchId,
                deleteDoc: transaction,
                deleteType: 'CompanyAssetTransaction',
                createdAt: timestamp,
                createdBy: branchStore.userId
            }
        };
        await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/DeleteLog`, logBody, { headers: API_CONFIGS.headers });

        // Find related cutting stocks
        const cuttingStockParams = {
            dynamicConditions: JSON.stringify([
                { field: 'ref', operator: '==', value: transaction._id }
            ])
        };
        const cuttingStockRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`, { params: cuttingStockParams, headers: API_CONFIGS.headers });
        const cuttingStocks = cuttingStockRes.data.data || [];

        // For each cutting stock, delete and update purchase history
        for (const stock of cuttingStocks) {
            await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${stock._id}`, { headers: API_CONFIGS.headers });

            if (stock.purchaseAssetHistoryId) {
                const historyRes = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, {
                    params: {
                        dynamicConditions: JSON.stringify([
                            { field: '_id', operator: '==', value: stock.purchaseAssetHistoryId }
                        ])
                    },
                    headers: API_CONFIGS.headers
                });
                const histories = historyRes.data.data || [];
                if (histories.length) {
                    const history = histories[0];
                    const updatedCuttingStockIds = (history.cuttingStockIds || []).filter(id => id !== stock._id);
                    const updateFields = {
                        cuttingStockIds: updatedCuttingStockIds,
                        updatedAt: timestamp,
                        updatedBy: branchStore.userId
                    };
                    if (history.status === true) updateFields.status = false;
                    await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${history._id}`, { fields: updateFields }, { headers: API_CONFIGS.headers });
                }
            }
        }

        // Update asset stock (add back the quantity)
        if (transaction.status?.approved?.value === 'approved') {
            await updateStockWhenDeleteTransaction(transaction.assetId, +transaction.qty, transaction.employeeId);
        }

        // Delete the transaction
        const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CompanyAssetTransaction/${pendingTransactionId.value}`, { headers: API_CONFIGS.headers });

        if (response.status === 200 || response.status === 204) {
            successMessage.value = t("Successfully deleted transaction asset");
            showSuccessMessage.value = true;
            successAudio.play();
            setTimeout(() => (showSuccessMessage.value = false), 800);
        }
    } catch (error) {
        console.log("Error:", error);
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage.value = "Transaction not found";
            } else {
                errorMessage.value = t("Error deleting transaction");
            }
        } else {
            errorMessage.value = error.message || "Unknown error occurred";
        }
        showErrorMessage.value = true;
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        loading.value = false;
        isDeleting.value = false;
    }
};




// Add this function to handle transaction deletion
const deleteTransaction = (id) => {
    pendingTransactionId.value = id;
    showConfirmDialog.value = true;
};

// Add this function to update the current transaction for editing
const updateBtn = (transaction) => {
    openEdit.value = true;
    currentId.value = transaction._id;
    formSelectedOperation.value = transaction.transactionType;

    // Set return date to current date when transaction type is checkout
    if (transaction.transactionType === "checkout") {
        returnDate.value = moment().format('DD/MM/YYYY');
    } else {
        returnDate.value = transaction.actualReturnDate ? moment(transaction.actualReturnDate).format('DD/MM/YYYY') : "";
    }
};


const getStatusBadge = (item) => {
    if (!item || !item.status) {
        return {
            label: 'Unknown',
            color: 'bg-gray-200 text-gray-600',
            icon: 'fa-solid fa-question',
        };
    }

    if (item.status.approved?.value === 'approved') {
        return {
            label: 'Approved',
            color: 'bg-green-100 text-green-600',
            icon: 'fa-solid fa-check-circle',
        };
    } else if (item.status.rejected?.value === 'rejected') {
        return {
            label: 'Rejected',
            color: 'bg-red-100 text-red-600',
            icon: 'fa-solid fa-times-circle',
        };
    } else if (item.status.requested?.value === 'requested') {
        return {
            label: 'Requested',
            color: 'bg-yellow-100 text-yellow-600',
            icon: 'fa-solid fa-hourglass-half',
        };
    } else {
        return {
            label: 'Pending',
            color: 'bg-blue-100 text-blue-600',
            icon: 'fa-solid fa-clock',
        };
    }
};

watch([isFilter, currentDate, currentPage, selectedTab],
    () => {
        fetchTransactionType();
    },
    { deep: true }
);


// Dropdown reference handler
function setDropdownRef(id) {
    return (el) => {
        if (el) {
            dropdownRefs.value[id] = el;
        } else {
            delete dropdownRefs.value[id];
        }
    };
}

// Handle clicks outside dropdown
function handleClickOutside(event) {
    if (openDropdownId.value) {
        const el = dropdownRefs.value[openDropdownId.value];
        if (el && !el.contains(event.target)) {
            openDropdownId.value = null;
        }
    }
}
onMounted(async () => {
    document.addEventListener('click', handleClickOutside);
    setDefaultMonthRange();
    await fetchEmployee(); // Make sure employee data is loaded first
    await fetchTransactionType(); // Then fetch transaction data

    socket.on('dataUpdate', () => {
        currentPage.value = 1;
        fetchTransactionType(); // Refresh data when socket update received
    });
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    socket.off('dataUpdate');
});



watch(selectedRow, (newValue) => {
    pageSize.value = parseInt(newValue.name, 10);
    currentPage.value = 1;
});
</script>

<template>
    <div>
        <!-- Success Message -->
        <transition name="fade">
            <div v-if="showSuccessMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] w-full max-w-sm px-4 py-3 text-sm text-white bg-green-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ successMessage }}
            </div>
        </transition>

        <!-- Error Message -->
        <transition name="fade">
            <div v-if="showErrorMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] w-full max-w-sm px-4 py-3 text-sm text-white bg-red-600 rounded shadow-lg sm:hidden"
                role="alert">
                {{ errorMessage }}
            </div>
        </transition>


        <router-link to="/" class="flex items-center space-x-2 text-emerald-600 font-medium p-2 w-3/4">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Transaction') }}</span>
        </router-link>

        <div class="w-full bg-white rounded-2xl shadow-md mt-1 px-2 py-6 space-y-4">
            <div class="flex items-end space-x-4 text-start">
                <!-- <div class="flex flex-col flex-auto">
                    <label for="startDate" class="text-xs mb-1 text-gray-600">Start Date</label>
                    <DatePicker v-model="StartDate" showIcon fluid iconDisplay="input" inputId="startDate" class="" />
                </div>
                <div class="flex items-center justify-center text-gray-500 mb-4">
                    <i class="fa-solid fa-arrows-left-right text-sm"></i>
                </div>
                <div class="flex flex-col flex-auto">
                    <label for="endDate" class="text-xs mb-1 text-gray-600">End Date</label>
                    <DatePicker v-model="EndDate" showIcon fluid iconDisplay="input" inputId="endDate" class="" />
                </div>

                 <div class="flex items-center space-x-2">
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-search"></i>
                    </button>
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div> -->
                <div class="flex items-center space-x-2 w-full">
                    <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon
                        iconDisplay="input" inputId="dateRange" class="w-full" dateFormat="dd/mm/yy"
                        :placeholder="$t('Select Date Range')" :defaultViewDate="defaultViewDate" />
                    <button @click="handleSearch" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-filter"></i>
                    </button>
                    <button @click="clearFilters" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center space-x-3">

                <!-- <input v-model="searchText" type="text" placeholder="Search by Name..."
                    class="flex-1 p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-500 transition-colors duration-300" /> -->

            </div>

            <div class="flex items-center justify-between mt-4 gap-1">
                <Select v-model="selectedRow" :options="row" optionLabel="name" placeholder="Row" class="" />

                <!-- <Select v-model="transactionType" :options="types" optionLabel="name" optionValue="value"
                    placeholder="CheckOut" /> -->

                <div class="flex items-center justify-end gap-2">
                    <router-link v-if="canCreateTransaction()" to="/create-transaction-asset-form-mobile"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Add New">
                        <i class="fa-solid fa-square-plus text-xl mr-1"></i><span>{{ $t('Create') }}</span>
                    </router-link>
                </div>
            </div>
        </div>

        <!-- <div v-for="(item, index) in tableData.slice(0, pageSize)" :key="item._id || index" v-intersect
            class="relative rounded-lg shadow-lg mt-5 py-6 px-5 text-sm bg-white border-2 border-r-emerald-600 border-l-emerald-200a border-b-emerald-200 flex justify-between items-start gap-4">
            <div class="absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-lg"
                :class="getStatusBadge(item).color">
                <div class="flex items-center text-xs font-medium">
                    <i class="mr-1.5" :class="getStatusBadge(item).icon"></i>
                    <span>{{ getStatusBadge(item).label }}</span>
                </div>
            </div>


            <div class="w-full space-y-4 text-gray-700 text-start">
                <div class="flex flex-wrap gap-y-2">
                    <p class="w-full sm:w-1/2">
                        <strong class="text-gray-500">Employee:</strong>
                        <span class="font-medium text-gray-900 ml-1">
                            {{ item.employeeId?.khName || item.employeeId }}
                        </span>
                    </p>
                    <p class="w-full sm:w-1/2">
                        <strong class="text-gray-500">Asset:</strong>
                        <span class="ml-1">
                            {{ item.assetId?.name || item.assetId }}
                        </span>
                    </p>
                    <p class="w-full sm:w-1/2">
                        <strong class="text-gray-500">Quantity:</strong>
                        <span class="ml-1">{{ item.qty }}</span>
                    </p>
                    <p class="w-full sm:w-1/2">
                        <strong class="text-gray-500">Description:</strong>
                        <span class="ml-1">{{ item.remark || '-' }}</span>
                    </p>
                    <p class="w-full sm:w-1/2 flex items-center">
                        <strong class="text-gray-500">Transaction Type:</strong>
                        <span
                            class="ml-2 relative px-3 py-1 font-bold text-[11px] rounded-xl shadow-md transition-all duration-300 text-center"
                            :class="{
                                'text-emerald-600': item.transactionType === 'returned',
                                'text-orange-600': item.transactionType === 'checkout'
                            }">
                            <i v-if="item.transactionType === 'returned'" class="fa-solid fa-check mr-1"></i>
                            <i v-else-if="item.transactionType === 'checkout'"
                                class="fa-solid fa-arrows-turn-right mr-1"></i>
                            <span class="relative z-10">{{ item.transactionType }}</span>
                        </span>

                    </p>
                    <p class="w-full sm:w-1/2">
                        <strong class="text-gray-500">Created At:</strong>
                        <span class="ml-1">{{ formatDateKhmer(item.createdAt) }}</span>
                    </p>
                </div>
                <hr class="border-t-2 border-gray-200" />
            </div>

            <div class="absolute top-7 right-3 sm:static sm:top-auto sm:right-auto" :ref="setDropdownRef(item._id)">
                <i class="fa-solid fa-ellipsis-vertical text-gray-400 hover:text-emerald-600 p-2 text-lg cursor-pointer"
                    aria-label="Options" @click.stop="openDropdownId = openDropdownId === item._id ? null : item._id"
                    tabindex="0"></i>

                <div v-if="openDropdownId === item._id"
                    class="absolute right-0 mt-4 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button @click.stop="canUpdateTransaction(item)
                        && item.status?.rejected?.value !== 'rejected'
                        && item.status?.approved?.value === 'approved'
                        && openTransactionModal(item._id)" :disabled="!canUpdateTransaction(item)
                            || item.status?.rejected?.value === 'rejected'
                            || item.status?.approved?.value !== 'approved'
                            || item.transactionType === 'returned'" class="flex items-center gap-2 px-4 py-2 text-sm w-full
                            transition
                            rounded
                            border
                            " :class="{
                                'text-blue-600 hover:bg-red-100 cursor-pointer': canUpdateTransaction(item)
                                    && item.status?.rejected?.value !== 'rejected'
                                    && item.status?.approved?.value === 'approved'
                                    && item.transactionType !== 'returned',
                                'text-gray-400 bg-gray-100 cursor-not-allowed': !canUpdateTransaction(item)
                                    || item.status?.rejected?.value === 'rejected'
                                    || item.status?.approved?.value !== 'approved'
                                    || item.transactionType === 'returned'
                            }">
                        <i class="fa-solid fa-arrows-turn-right"></i>Action
                    </button>
                    <RouterLink :to="`/approve-form-mobile/${item._id}`"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-red-100 w-full">
                        <i class="fa-solid fa-check"></i> Approval
                    </RouterLink>
                    <button @click.stop="deleteTransaction(item._id)"
                        class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-100 w-full">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div> -->

        <div v-if="canViewTransaction()" class="mt-4">
            <!-- Tabs -->
            <div class="flex space-x-4 border-b border-gray-300 mb-4">
                <router-link to="/operation-assets" custom v-slot="{ navigate, href, isActive }">
                    <button :class="[
                        'py-2 px-4 text-sm font-medium rounded-t-lg transition-all duration-200',
                        isActive
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'text-gray-500 hover:text-emerald-500 hover:border-emerald-300'
                    ]" @click="navigate">
                        {{ $t('Checkout Assets') }}
                        <!-- <span class="ml-2 bg-white text-emerald-500 px-2 py-0.5 rounded-full text-xs">
                            {{ checkoutCount }}
                        </span> -->
                    </button>
                </router-link>
                <router-link to="/operation-assets-return-mobile" custom v-slot="{ navigate, href, isActive }">
                    <button :class="[
                        'py-2 px-4 text-sm font-medium rounded-t-lg transition-all duration-200 ml-2',
                        isActive
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'text-gray-500 hover:text-emerald-500 hover:border-emerald-300'
                    ]" @click="navigate">
                        {{ $t('Returned Assets') }}
                        <!-- <span class="ml-2 bg-white text-emerald-500 px-2 py-0.5 rounded-full text-xs">
                            {{ returnedCount }}
                        </span> -->
                    </button>
                </router-link>
            </div>

            <!-- List -->
            <Transition name="fade" mode="out-in" appear>
                <div :key="selectedTab">
                    <!-- List -->
                    <TransitionGroup tag="div" name="fade-list" class="relative">
                        <div v-for="(item, index) in tableData" :key="item._id || index"
                            class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex justify-between items-start gap-4">
                            <!-- Status Badge -->
                            <div class="absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-lg"
                                :class="getStatusBadge(item).color">
                                <div class="flex items-center text-xs font-medium">
                                    <i class="mr-1.5" :class="getStatusBadge(item).icon"></i>
                                    <span>{{ getStatusBadge(item).label }}</span>
                                </div>
                            </div>

                            <!-- Details -->
                            <div class="w-full space-y-2 text-gray-700 text-start text-xs">
                                <div class="flex flex-wrap gap-y-2">
                                    <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Employee') }}:</strong>
                                        <span class="font-medium text-gray-900 ml-1">{{ item.employeeId?.khName ||
                                            item.employeeId }}</span>
                                    </p>
                                    <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Asset') }}:</strong>
                                        <span class="ml-1">{{ item.assetId?.name || item.assetId }}</span>
                                    </p>
                                    <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Quantity') }}:</strong>
                                        <span class="ml-1">{{ item.qty }}</span>
                                    </p>
                                    <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Description') }}:</strong>
                                        <span class="ml-1">{{ item.remark || '-' }}</span>
                                    </p>
                                    <p class="w-full sm:w-1/2 flex items-center">
                                        <strong class="text-gray-500">{{ $t('Transaction Type') }}:</strong>
                                        <span
                                            class="ml-2 relative px-3 py-1 font-bold text-[11px] rounded-xl shadow-md transition-all duration-300 text-center"
                                            :class="{
                                                'text-emerald-600': item.transactionType === 'returned',
                                                'text-orange-600': item.transactionType === 'checkout',
                                            }">
                                            <i v-if="item.transactionType === 'returned'"
                                                class="fa-solid fa-check mr-1"></i>
                                            <i v-else-if="item.transactionType === 'checkout'"
                                                class="fa-solid fa-arrows-turn-right mr-1"></i>
                                            <span class="relative z-10">{{ item.transactionType }}</span>
                                        </span>
                                    </p>

                                    <hr class="my-2 h-2" />

                                    <div class="gap-1 text-[10px] flex">
                                        <p class=" items-center">
                                            <strong class="text-gray-500">{{ $t('CreateAt') }}:</strong>
                                            <span class="ml-1">
                                                <i class="fas fa-calendar text-gray-500"></i>
                                                {{ formatDateKhmer(item.createdAt) }}</span>
                                        </p>
                                        <hr class="h-auto border-l border-gray-300 mx-2" />
                                        <p class="items-center">
                                            <strong class="text-gray-500">{{ $t('UpdateAt') }}:</strong>
                                            <span class="ml-1">
                                                <i class="fas fa-calendar text-gray-500"></i>
                                                {{ formatDateKhmer(item.updatedAt) }}</span>
                                        </p>
                                    </div>

                                    <!-- <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">Created At:</strong>
                                        <span class="ml-1">{{ formatDateKhmer(item.createdAt) }}</span>
                                    </p> -->
                                </div>
                            </div>

                            <!-- Dropdown -->
                            <div class="absolute top-7 right-3 sm:static sm:top-auto sm:right-auto"
                                :ref="setDropdownRef(item._id)">
                                <i class="fa-solid fa-ellipsis-vertical text-gray-400 hover:text-emerald-600 p-2 text-lg cursor-pointer"
                                    aria-label="Options"
                                    @click.stop="openDropdownId = openDropdownId === item._id ? null : item._id"
                                    tabindex="0"></i>

                                <div v-if="openDropdownId === item._id"
                                    class="absolute right-0 mt-4 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    <button v-if="canUpdateTransaction(item)" @click.stop="canUpdateTransaction(item)
                                        && item.status?.rejected?.value !== 'rejected'
                                        && item.status?.approved?.value === 'approved'
                                        && openTransactionModal(item._id)" :disabled="!canUpdateTransaction(item)
                                            || item.status?.rejected?.value === 'rejected'
                                            || item.status?.approved?.value !== 'approved'
                                            || item.transactionType === 'returned'"
                                        class="flex items-center gap-2 px-4 py-2 text-sm w-full transition rounded border"
                                        :class="{
                                            'text-blue-600 hover:bg-red-100 cursor-pointer':
                                                canUpdateTransaction(item) &&
                                                item.status?.rejected?.value !== 'rejected' &&
                                                item.status?.approved?.value === 'approved' &&
                                                item.transactionType !== 'returned',
                                            'text-gray-400 bg-gray-100 cursor-not-allowed':
                                                !canUpdateTransaction(item) ||
                                                item.status?.rejected?.value === 'rejected' ||
                                                item.status?.approved?.value !== 'approved' ||
                                                item.transactionType === 'returned',
                                        }">
                                        <i class="fa-solid fa-arrows-turn-right"></i>Checkout
                                    </button>
                                    <RouterLink :to="`/approve-form-mobile/${item._id}`"
                                        class="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-red-100 w-full">
                                        <i class="fa-solid fa-check"></i> Status
                                    </RouterLink>
                                    <button v-if="canDeleteTransaction()" @click.stop="deleteTransaction(item._id)"
                                        class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-100 w-full">
                                        <i class="fa-solid fa-trash"></i> {{ $t('Delete') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </TransitionGroup>

                    <div v-if="tableData.length === 0"
                        class="flex flex-col items-center justify-center py-10 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mb-3 text-gray-300" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9.75 9.75h.008v.008H9.75V9.75zM14.25 9.75h.008v.008h-.008V9.75zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-lg font-medium">{{ $t('No data!') }}</p>
                        <p class="text-sm text-gray-500">{{ $t('Please check back later or add new data.') }}</p>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Return Asset Modal -->
        <div v-if="showTransactionType"
            class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[100] px-4">
            <div class="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 space-y-6">
                <div class="flex justify-between items-center border-b pb-3">
                    <h2 class="text-lg font-semibold text-gray-800">{{ $t('Return Asset Form') }}</h2>
                    <button @click="clearTransactionForm" class="text-gray-500 hover:text-red-500">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <form @submit.prevent="updateTransaction" class="space-y-4">
                    <div>
                        <label for="returnDate" class="block text-sm font-medium text-gray-700 mb-1 text-start">
                            {{ $t('Return Date') }} <span class="text-red-500">*</span>
                        </label>
                        <DatePicker v-model="returnDate" showIcon fluid iconDisplay="input" inputId="returnDate"
                            class="w-full text-sm" />
                    </div>
                    <div>
                        <label for="Transaction" class="block text-sm font-medium text-gray-700 mb-1 text-start">
                            {{ $t('Transaction Type') }} <span class="text-red-500">*</span>
                        </label>
                        <Select v-model="formSelectedOperation" :options="types" optionLabel="name" optionValue="value"
                            :placeholder="$t('Select Transaction Type')" class="w-full text-sm text-left" />
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
                        <label for="description" class="text-sm font-medium text-gray-700">{{ $t('Description')
                        }}</label>
                        <textarea id="description" rows="4" :placeholder="$t('Enter description...')" v-model="remark"
                            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"></textarea>
                    </div>

                    <div class="pt-4 flex justify-end border-t gap-2">
                        <button type="button" @click="clearTransactionForm"
                            class="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition">
                            {{ $t('Clear') }}
                        </button>
                        <button type="submit"
                            class="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition">
                            {{ $t('Return') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Confirm Delete Dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-6 text-center space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">{{ $t('Confirmation Delete') }}</h2>
                <p class="text-sm text-gray-600">{{ $t('Are you sure you want to delete this item?') }}</p>
                <div class="flex justify-center gap-4 mt-4">
                    <button @click="showConfirmDialog = false;"
                        class="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition">
                        {{ $t('no') }}
                    </button>
                    <button @click="handleDeleteConfirmation"
                        class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition">
                        {{ $t('Yes') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <PaginationTwo v-if="tableData.length > 0" :currentPage="currentPage"
            @onEmitDataFromPagination="handleListenToPagination" @onEmitIsLoading="handleListenIsLoading"
            @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage" :limitedPerPage="pageSize"
            :searchQuery="searchText" :isFilter="isFilter" :currentDate="currentDate" />
    </div>
</template>

<style scoped>
/* Fade for whole list on tab switch */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Fade + move for list items */
.fade-list-enter-active,
.fade-list-leave-active {
    transition: all 0.3s ease;
}

.fade-list-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-list-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Optional tab focus style */
/* button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.6);
} */
</style>
