<script setup>
import API_CONFIGS from '@/api/config';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()


// Reactive state
const activeTab = ref('checkout');

const branchStore = useBranchStore();

const openDropdownId = ref(null);
const dropdownRefs = ref({});

const showTransactionType = ref(false);
const showConfirmDialog = ref(false);

const StartDate = ref();
const EndDate = ref();
const returnDate = ref();
const isLoading = ref(false);
const tableData = ref([]);
const searchText = ref('');
const transactionType = ref(""); // Transaction type filter
const Transaction = ref(); // For modal
const CheckTypes = ref(); // For modal
const isDeleting = ref(false);
const searchQuery = ref('');
const loading = ref(false);
const employeeData = ref([]);
const pendingTransactionId = ref(null);

const selectedItem = ref(10); // default as number, not string
const limitedPerPage = ref(10);
const pageSize = ref(10);
const totalPages = ref(1);
const totalRecords = ref(0);

// Add missing variables
const currentId = ref(null);
const formSelectedOperation = ref('');
const remark = ref('');

//Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3')

const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");


const route = useRoute();

function setTabFromRoute() {
    if (route.path.includes('return')) {
        activeTab.value = 'returned';
    } else {
        activeTab.value = 'checkout';
    }
}






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



const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    StartDate.value = now.startOf('month').format('DD/MM/YYYY');
    EndDate.value = now.endOf('month').format('DD/MM/YYYY');
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
    fetchTransactionType();
};

const clearFilters = () => {
    StartDate.value = null;
    EndDate.value = null;
    returnDate.value = null;
    dateRange.value = null;
    searchText.value = '';
    transactionType.value = null;
    Transaction.value = null;
    CheckTypes.value = null;
    currentPage.value = 1;
    fetchTransactionType();
    setDefaultMonthRange();

};



// Clear Form Transaction
const clearTransactionForm = () => {
    returnDate.value = null;
    Transaction.value = null;
    showTransactionType.value = false;
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



const checkoutPagination = ref({
    currentPage: 1,
    pageSize: 10
});

const returnedPagination = ref({
    currentPage: 1,
    pageSize: 10
});


const dateRange = ref();

watch(dateRange, (val) => {
    if (val && val.length === 2) {
        StartDate.value = val[0];
        EndDate.value = val[1];
    } else {
        StartDate.value = null;
        EndDate.value = null;
    }
});




const fetchTransactionType = async () => {
    try {
        isLoading.value = true;
        tableData.value = [];
        const isAdmin = branchStore.isAdminOrSuperAdmin || branchStore.getUserRole === 'Admin' || branchStore.getUserRole === 'Super Admin';
        const dynamicConditions = [
            { field: "branchId", operator: "==", value: branchStore.branchId },
            { field: "transactionType", operator: "==", value: transactionType.value || activeTab.value }
        ];
        if (!isAdmin) {
            dynamicConditions.push({
                field: 'chiefIds',
                operator: 'arrayContains',
                value: branchStore.userId
            });
        }
        if (StartDate.value) {
            const filterStartDate = moment(StartDate.value, 'DD/MM/YYYY').startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&gte',
                value: filterStartDate,
                type: "Date"
            });
        }
        if (EndDate.value && EndDate.value !== 'Invalid date') {
            const filterEndDate = moment(EndDate.value, 'DD/MM/YYYY').endOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&lte',
                value: filterEndDate,
                type: "Date"
            });
        }
        const pagination = activeTab.value === 'checkout' ? checkoutPagination : returnedPagination;
        const params = {
            collectionName: 'CompanyAssetTransaction',
            dynamicConditions: JSON.stringify(dynamicConditions),
            populate: JSON.stringify(['employeeId', 'assetId']),
            page: pagination.value.currentPage,
            pageSize: pagination.value.pageSize,
            sortOrder: 'desc',
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getPaginationTwo`, { params, headers: API_CONFIGS.headers });
        if (response.status === 200) {
            const { data: transactions, pagination: apiPagination = { totalPages: 1, totalDocuments: 0, currentPage: 1 } } = response.data;
            tableData.value = transactions || [];
            totalPages.value = apiPagination.totalPages || 1;
            totalRecords.value = apiPagination.totalDocuments || 0;
            pagination.value.currentPage = apiPagination.currentPage || 1;
            pagination.value.pageSize = pageSize.value;

        } else {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        tableData.value = [];
        totalPages.value = 1;
        totalRecords.value = 0;
        showErrorMessage.value = true;
        errorMessage.value = error.response?.data?.message || "Failed to load transaction data";
        errorAudio.play();
        setTimeout(() => (showErrorMessage.value = false), 5000);
    } finally {
        isLoading.value = false;
    }
};







const goToPage = async (page) => {
    // Update the correct pagination object
    if (activeTab.value === 'checkout') {
        checkoutPagination.value.currentPage = page;
    } else {
        returnedPagination.value.currentPage = page;
    }
    currentPage.value = page;
    await fetchTransactionType();
    // If after fetching, there is no data and not on the first page, go back one page
    if (tableData.value.length === 0 && currentPage.value > 1) {
        currentPage.value -= 1;
        if (activeTab.value === 'checkout') {
            checkoutPagination.value.currentPage = currentPage.value;
        } else {
            returnedPagination.value.currentPage = currentPage.value;
        }
        await fetchTransactionType();
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
                // { field: "branchId", operator: "==", value: branchStore.branchId },
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

const createTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;

    try {
        if (!selectedEmployee.value || !selectedAsset.value) {
            errorMessage.value = "Please select an employee and asset before proceeding";
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => showErrorMessage.value = false, 5000);
            loading.value = false;
            return;
        }

        if (!quantity.value || quantity.value <= 0) {
            errorMessage.value = "Please input quantity greater than 0";
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
                { field: 'status', operator: '==', value: false } // Only in stock items
            ]),
            sortField: 'createdAt',
            sortOrder: 'asc' // Oldest first for FIFO
        };

        const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        const historyRecords = historyResponse.data.data || [];

        if (!historyRecords.length) {
            await createFallbackCuttingStock(assetId, checkoutQuantity, transactionId, timestamp, mainBranchId);
            return true;
        }

        let remainingQuantity = checkoutQuantity;
        let totalProcessed = 0;

        for (const record of historyRecords) {
            if (!record.asset || record.asset.assetId !== assetId) continue;

            if (remainingQuantity <= 0) break;

            const recordQuantity = record.asset.qty || 0;

            let usedQuantity = 0;
            if (record.cuttingStockIds && record.cuttingStockIds.length > 0) {
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

                cuttingStocks.forEach(stock => {
                    if (stock.type === 'check-out' || stock.type === 'transfer') {
                        usedQuantity += Math.abs(stock.amount || 0);
                    }
                });
            }

            const availableQuantity = recordQuantity - usedQuantity;

            if (availableQuantity <= 0) continue;

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

            // Always update the asset's total stock using assetId
            await updateAssetStock(assetId, -amountFromRecord, transaction.employeeId);
        }

        await updateAssetStock(record.asset.assetId, -amountFromRecord, transaction.employeeId);
        if (remainingQuantity > 0) {
            await createFallbackCuttingStock(assetId, remainingQuantity, transactionId, timestamp, mainBranchId);
            // Also update asset stock for fallback
            await updateAssetStock(assetId, -remainingQuantity, transaction.employeeId);
            totalProcessed += remainingQuantity;
        }

        return true;
    } catch (error) {
        console.error("Error creating cutting stock for checkout:", error);
        return false;
    }
};






// New function to create cutting stock records for checkout operations
// const createCuttingStockForCheckout = async (assetId, checkoutQuantity, transactionId) => {
//     try {
//         const timestamp = await fetchTimestamp();

//         // Get the transaction to get the employeeId for mainBranchId
//         const transactionParams = {
//             dynamicConditions: JSON.stringify([
//                 { field: '_id', operator: '==', value: transactionId }
//             ]),
//             populate: JSON.stringify(['employeeId'])
//         };

//         const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params: transactionParams, headers: API_CONFIGS.headers });
//         const transactions = transactionResponse.data.data || [];

        // if (!transactions.length) {
        //     console.error("Transaction not found for cutting stock creation");
        //     return false;
        // }

        // const transaction = transactions[0];

        // // Get mainBranchId from employee's representativeName
        // const mainBranchId = getMainBranchIdFromEmployee(transaction.employeeId);

        // // Get purchase asset history records for this asset (in stock ones first)
        // const historyParams = {
        //     dynamicConditions: JSON.stringify([
        //         {
        //             field: 'asset.assetId',
        //             operator: '==',
        //             value: assetId
        //         },
        //         { field: 'branchId', operator: '==', value: branchStore.branchId },
        //         { field: 'status', operator: '==', value: false } // Only in stock items
        //     ]),
        //     sortField: 'createdAt',
        //     sortOrder: 'asc' // Oldest first for FIFO
        // };

        // const historyResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`, { params: historyParams, headers: API_CONFIGS.headers });
        // const historyRecords = historyResponse.data.data || [];

        // if (!historyRecords.length) {
        //     console.error("No purchase asset history records found for checkout");

        //     // Important: If no history records found but we have assetId,
        //     // we might be dealing with a transferred asset that doesn't have proper history records
        //     // In this case, create a single cutting stock record for the entire quantity
        //     await createFallbackCuttingStock(assetId, checkoutQuantity, transactionId, timestamp, mainBranchId);
        //     return true;
        // }

        // let remainingQuantity = checkoutQuantity;
        // let totalProcessed = 0;

        // // Create cutting stocks following FIFO
        // for (const record of historyRecords) {
        //     // Defensive: skip if assetId does not match
        //     if (!record.asset || record.asset.assetId !== assetId) continue;

        //     if (remainingQuantity <= 0) break;

        //     // Calculate available quantity in this record
        //     const recordQuantity = record.asset.qty || 0;

        //     // Calculate how much is already used from this record
        //     let usedQuantity = 0;
        //     if (record.cuttingStockIds && record.cuttingStockIds.length > 0) {
        //         // Fetch existing cutting stocks for this record
        //         const cuttingStockParams = {
        //             dynamicConditions: JSON.stringify([
        //                 { field: '_id', operator: 'in', value: record.cuttingStockIds }
        //             ])
        //         };

        //         const cuttingStockResponse = await axios.get(
        //             `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
        //             { params: cuttingStockParams, headers: API_CONFIGS.headers }
        //         );

        //         const cuttingStocks = cuttingStockResponse.data.data || [];

        //         // Calculate how much is already used
        //         cuttingStocks.forEach(stock => {
        //             if (stock.type === 'check-out' || stock.type === 'transfer') {
        //                 usedQuantity += Math.abs(stock.amount || 0);
        //             }
        //         });
        //     }

        //     const availableQuantity = recordQuantity - usedQuantity;

        //     if (availableQuantity <= 0) continue;

        //     // Calculate amount to take from this record
        //     const amountFromRecord = Math.min(availableQuantity, remainingQuantity);
        //     remainingQuantity -= amountFromRecord;
        //     totalProcessed += amountFromRecord;


        //     // Create cutting stock record WITH NEGATIVE AMOUNT for checkout
        //     const cuttingStockData = {
        //         fields: {
        //             branchId: branchStore.branchId,
        //             mainBranchId: mainBranchId, // <-- Add mainBranchId from employee
        //             ref: transactionId, // Reference to the transaction
        //             purchaseAssetHistoryId: record._id, // Link to the history record
        //             amount: -amountFromRecord, // NEGATIVE for checkout
        //             type: 'check-out',
        //             createdBy: branchStore.userId,
        //             createdAt: timestamp
        //         }
        //     };

        //     const cuttingStockResponse = await axios.post(
        //         `${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CuttingStock`,
        //         cuttingStockData, { headers: API_CONFIGS.headers }
        //     );

        //     // Get the new cutting stock ID
        //     const cuttingStockId = cuttingStockResponse.data.data._id;

        //     // Update the purchase asset history record to include this cutting stock ID
        //     const historyUpdateData = {
        //         fields: {
        //             updatedAt: timestamp,
        //             updatedBy: branchStore.userId,
        //             cuttingStockIds: [...(record.cuttingStockIds || []), cuttingStockId]
        //         }
        //     };

        //     // If this record is now fully used, mark it as out of stock
        //     if (availableQuantity <= amountFromRecord) {
        //         historyUpdateData.fields.status = true; // Out of stock
        //     }

        //     await axios.patch(
        //         `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${record._id}`,
        //         historyUpdateData, { headers: API_CONFIGS.headers }
        //     );
        // }

        // // If we still have remaining quantity, create a fallback cutting stock
        // if (remainingQuantity > 0) {
        //     await createFallbackCuttingStock(assetId, remainingQuantity, transactionId, timestamp, mainBranchId);
        //     totalProcessed += remainingQuantity;
        // }

        // return true;
    // } catch (error) {
    //     console.error("Error creating cutting stock for checkout:", error);
    //     return false;
    // }



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
//                 // { field: 'branchId', operator: '==', value: branchStore.branchId }
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



const updateTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;

    try {
        if (!returnDate.value) {
            errorMessage.value = t('Please select a return date');
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }


        if (formSelectedOperation.value !== 'returned') {
            errorMessage.value = "Please select 'returned' as the transaction type";
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
            errorMessage.value = t(`Cannot return more than borrowed. Borrowed: ${totalQty}, Already returned: ${returnedQty}`);
            showErrorMessage.value = true;
            errorAudio.play();
            setTimeout(() => (showErrorMessage.value = false), 5000);
            return;
        }

        // Update returnedQty
        returnedQty += quantity.value;

        // Update asset stock for returned quantity
        await updateAssetStock(transaction.assetId, +quantity.value, transaction.employeeId);

        // Calculate remaining borrowed quantity
        const remainingQty = totalQty - returnedQty;

        // If all assets are returned, mark as returned and set actualReturnDate
        let updateFields = {
            qty: remainingQty > 0 ? remainingQty : 0, // update qty to reflect remaining borrowed
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

        // Show success message and clean up
        successMessage.value = t('Successfully returned asset');
        showSuccessMessage.value = true;
        successAudio.play();
        setTimeout(() => (showSuccessMessage.value = false), 800);

        // Refresh the transaction list
        fetchTransactionType();

        // Close the edit form
        closeEdit();
    } catch (error) {
        console.error('Error processing return:', error);
        errorMessage.value = error.message || t('Error updating transaction');
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
        showConfirmDialog.value

        showSuccessMessage.value = false;
        showErrorMessage.value = false;

        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: pendingTransactionId.value },
                { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };

        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];

        if (transactions.length > 0) {
            const transaction = transactions[0];

            // Check if the transaction is approved or rejected
            const isApproved = transaction.status?.approved?.value === 'approved';
            const isRejected = transaction.status?.rejected?.value === 'rejected';

            if (isApproved || isRejected) {
                errorMessage.value = `Cannot delete a transaction that has been ${isApproved ? 'approved' : 'rejected'}.`;
                showErrorMessage.value = true;
                errorAudio.play();
                setTimeout(() => (showErrorMessage.value = false), 5000);
                return;
            }

            // Proceed with deletion if not approved/rejected
            const response = await axios.delete(`${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CompanyAssetTransaction/${pendingTransactionId.value}`, { headers: API_CONFIGS.headers });

            if (response.status === 200 || response.status === 204) {
                successMessage.value = t('Successfully deleted transaction asset');
                showSuccessMessage.value = true;
                successAudio.play();
                showConfirmDialog.value = false;
                setTimeout(() => (showSuccessMessage.value = false), 800);

                fetchTransactionType();
            }
        } else {
            throw new Error("Transaction not found");
        }

    } catch (error) {
        console.log("Error:", error);

        if (error.response) {
            if (error.response.status === 404) {
                errorMessage.value = "Transaction not found";
            } else {
                errorMessage.value = "Error deleting transaction";
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
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    setDefaultMonthRange();
    setTabFromRoute();
    socket.on('dataUpdate', () => {
        currentPage.value = 1;
    });
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
    socket.off('dataUpdate');
});



watch(selectedRow, (newValue) => {
    const size = parseInt(newValue.name, 10);
    pageSize.value = size;
    // Update the correct pagination object based on the active tab
    if (activeTab.value === 'checkout') {
        checkoutPagination.value.pageSize = size;
        checkoutPagination.value.currentPage = 1;
    } else {
        returnedPagination.value.pageSize = size;
        returnedPagination.value.currentPage = 1;
    }
    fetchTransactionType();
});



watch(activeTab, () => {
    currentPage.value = 1;
    checkoutPagination.value.currentPage = 1;
    returnedPagination.value.currentPage = 1;
    fetchTransactionType();
});


const displayedPages = computed(() => {
    const totalPagesValue = totalPages.value;
    if (totalPagesValue <= 5) {
        return Array.from({ length: totalPagesValue }, (_, i) => i + 1);
    }
    const currentPageValue = activeTab.value === 'checkout' ? checkoutPagination.value.currentPage : returnedPagination.value.currentPage;
    const siblingCount = 1;
    const maxVisiblePages = 5;
    const startPages = 1;
    const endPages = totalPagesValue;
    const siblingsStart = Math.max(currentPageValue - siblingCount, 2);
    const siblingsEnd = Math.min(currentPageValue + siblingCount, totalPagesValue - 1);
    const shouldShowLeftEllipsis = siblingsStart > 2;
    const shouldShowRightEllipsis = siblingsEnd < totalPagesValue - 1;
    let pages = [startPages];
    if (shouldShowLeftEllipsis) pages.push('...');
    pages = [...pages, ...Array.from({ length: siblingsEnd - siblingsStart + 1 }, (_, i) => siblingsStart + i)];
    if (shouldShowRightEllipsis) pages.push('...');
    pages.push(endPages);
    return pages;
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
                <div :key="activeTab">
                    <!-- List -->
                    <TransitionGroup tag="div" name="fade-list" class="relative">
                        <div v-for="(item, index) in tableData" :key="item._id || index"
                            class="relative rounded-2xl shadow-md mt-5 p-4 bg-white border-l-4 border-emerald-600 flex justify-between items-start gap-4">
                            <!-- Status Badge -->
                            <!-- <div class="absolute top-0 right-0 px-3 py-1 rounded-bl-xl rounded-tr-lg"
                                :class="getStatusBadge(item).color">
                                <div class="flex items-center text-xs font-medium">
                                    <i class="mr-1.5" :class="getStatusBadge(item).icon"></i>
                                    <span>{{ getStatusBadge(item).label }}</span>
                                </div>
                            </div> -->

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
                                    <!-- <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Quantity') }}:</strong>
                                        <span class="ml-1">{{ item.qty }}</span>
                                    </p> -->
                                    <p class="w-full sm:w-1/2">
                                        <strong class="text-gray-500">{{ $t('Description') }}:</strong>
                                        <span class="ml-1">{{ item.remark || '-' }}</span>
                                    </p>
                                    <!-- <p class="w-full sm:w-1/2 flex items-center">
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
                                    </p> -->

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
                                        <i class="fa-solid fa-arrows-turn-right"></i>Action
                                    </button>
                                    <!-- <RouterLink :to="`/approve-form-mobile/${item._id}`"
                                        class="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-red-100 w-full">
                                        <i class="fa-solid fa-check"></i> Approval
                                    </RouterLink> -->
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
            class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
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
                            placeholder="Select Transaction Type" class="w-full text-sm" />
                    </div>
                    <div class="pt-4 flex justify-end border-t gap-2">
                        <button type="button" @click="clearTransactionForm"
                            class="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition">
                            {{ $t('Clear') }}
                        </button>
                        <button type="submit"
                            class="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition">
                            {{ $t('Confirm') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Confirm Delete Dialog -->
        <div v-if="showConfirmDialog"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-white w-full max-w-sm mx-auto rounded-lg shadow-lg p-6 text-center space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">{{ $t('Confirm Delete') }}</h2>
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
        <div class="mt-10 flex justify-end ml-auto space-x-2" v-if="searchQuery === '' && tableData.length > 0">
            <!-- First Page Button (Hidden on small screens) -->
            <button @click="goToPage(1)" :disabled="currentPage === 1 || isLoading || tableData.length === 0"
                class="hidden md:inline-block p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
                :class="currentPage === 1 ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
                {{ $t('First') }}
            </button>

            <!-- Previous Page Button -->
            <button @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1 || isLoading || tableData.length === 0"
                class="p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
                :class="currentPage === 1 ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
                {{ $t('Previous') }}
            </button>

            <!-- Pagination Pages (Limit on small screens) -->
            <template v-for="page in displayedPages" :key="page">
                <span v-if="page === '...'" class="px-3 py-2 flex items-center !font-medium text-gray-500">...</span>
                <button v-else @click="goToPage(page)" :disabled="isLoading || tableData.length === 0" :class="[
                    currentPage === page
                        ? 'bg-[#34D399] text-white !px-3 !py-1.5 !cursor-pointer !font-medium rounded-md'
                        : 'p-button-outlined !px-3 !py-1.5 !cursor-pointer !font-medium rounded-md'
                ]">
                    {{ page }}
                </button>
            </template>

            <!-- Next Page Button -->
            <button @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages || isLoading || tableData.length === 0"
                class="p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
                :class="currentPage === totalPages ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
                {{ $t('Next') }}
            </button>

            <!-- Last Page Button (Hidden on small screens) -->
            <button @click="goToPage(totalPages)"
                :disabled="currentPage === totalPages || isLoading || tableData.length === 0"
                class="hidden md:inline-block p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
                :class="currentPage === totalPages ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
                {{ $t('Last') }}
            </button>
        </div>

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

.p-button-outlined {
    border: 1px solid #ccc;
    background-color: white;
    color: black;
}

.p-button-primary {
    border: 1px solid #34D399;
    /* emerald-400 */
    background-color: #34D399;
    color: white;
}

.p-ellipsis {
    font-weight: bold;
    text-shadow: 0 0 5px #34D399;
    /* emerald glow effect */
}

.p-ellipsis:hover {
    text-shadow: 0 0 10px #34D399;
    /* stronger glow on hover */
}
</style>
