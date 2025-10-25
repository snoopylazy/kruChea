<script setup>
import API_CONFIGS from '@/api/config';
import ApproveModal from '@/components/Approve.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import SuccessMessage from '@/components/SuccessMessage.vue';
import ConfirmationDeleteMessage from '@/components/VerifyDelete.vue';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { fetchTimestamp } from '@/composable/timestamp';
import { useAssetDropdown } from '@/composable/useAssetData';
import { useEmployeeDropdown } from '@/composable/useEmployeeData';
import { useOperationDropdown } from '@/composable/useOperation';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import TransactionMobileScreen from '@/views/Mobile/transactionAssets/Transaction.vue';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import 'vue-datepicker-next/index.css';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const route = useRoute();



const activeTab = ref('checkout');

const ShowDetail = (item) => {
    const transactionId = typeof item === 'string' ? item : item._id;
    selectedTransaction.value = transactionId;
    showDetailModal.value = true;
};


const {
    isFormEmployeeSearchOpen,
    searchInputEmployee,
    formSelectedEmployee,
    employeeSearchInputRef,
    getEmployee,
    toggleFormEmployeeSearch,
    selectedFormEmployee,
    filteredEmployees,
    updateFilteredEmployees
} = useEmployeeDropdown(API_CONFIGS.BASE_URL);

const {
    isAssetSearchOpen,
    filteredAssets,
    handleAssetClickOutside,
    searchInputAsset,
    selectedAsset,
    assetSearchInputRef,
    getAssetName,
    toggleAssetSearch,
    updateFilteredAssets,
    selectAsset,
} = useAssetDropdown(API_CONFIGS.BASE_URL);

// Helper to get available quantity for selected asset
const getMaxQuantity = (assetId) => {
    const asset = filteredAssets.value.find(a => a._id === assetId);
    return asset?.totalStock || 0;
};

const {
    isOperationSearchOpen,
    isFormOperationSearchOpen,
    operationItems,
    filteredOperations,
    searchInputOperation,
    selectedOperation,
    operationSearchInputRef,
    toggleOperationSearch,
    toggleFormOperationSearch,
    updateFilteredOperations,
    selectOperation,
    formSelectedOperation,
    selectOperationForm,
} = useOperationDropdown();


const {
    canApproveTransaction,
    canCheckTransaction,
    canConfirmTransaction,
    canUpdateTransaction,
    canReturnTransaction,
    canCreateTransaction,
    canViewTransaction,
    canDeleteTransaction
} = useUserPermission();

// Modal
const openModal = ref(false);
const openEdit = ref(false);

//delete
const showConfirmDialog = ref(false);
const pendingTransactionId = ref(null);

const branchStore = useBranchStore();
//Pagination
const isOpen = ref(false);
const items = ref([10, 50, 100, 500, 1000]);
const selectedItem = ref(10); // default as number, not string
const limitedPerPage = ref(10);
const pageSize = ref(10);
const isLoading = ref(false);
const currentPage = ref(1);
const searchQuery = ref('');
const searchText = ref('');

// Add direct pagination state
const totalPages = ref(1);
const totalRecords = ref(0);

const selectedDate = ref("");
const isDeleting = ref(false);
const tableData = ref([]);
const showDetailModal = ref(false);
const selectedTransaction = ref(null);
const employeeData = ref([]);
const selectedEmployee = ref("");
const isCO = ref(false);

const isBranchSelectEnabled = ref(false); // Toggle for branch selection
const selectedBranchId = ref(''); // Selected branch for employee filtering
const branchData = ref([]); // List of branches for dropdown

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

//Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3')

// Create Form
const remark = ref("");

// State for success and error messages
const showSuccessMessage = ref(false);
const successMessage = ref("");
const showErrorMessage = ref(false);
const errorMessage = ref("");
const loading = ref(false);
const startDate = ref("");
const endDate = ref("");
const returnDate = ref("");
const quantity = ref();
const createSelectedOperation = ref("checkout")

const currentId = ref(''); // Add this with your other refs






const toggleDropdownRow = () => {
    isOpen.value = !isOpen.value;
};


const selectItem = (item) => {
    selectedItem.value = Number(item);
    limitedPerPage.value = Number(item);
    pageSize.value = Number(item);
    currentPage.value = 1;
    isOpen.value = false;
    fetchTransactionType();
};


watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
}, { immediate: true });

watch([selectedOperation, startDate, endDate], () => {
    currentPage.value = 1;
    fetchTransactionType();
}, { immediate: false });

// Watch for active tab changes to reset pagination
watch(activeTab, () => {
    currentPage.value = 1;
    fetchTransactionType();
}, { immediate: false });

watch(() => branchStore.branchId, async () => {
    currentPage.value = 1;
    await fetchEmployee();
    fetchTransactionType();
}, { immediate: false });

watch(pageSize, () => {
    currentPage.value = 1;  // Reset to first page
    fetchTransactionType();
});

// Watch for filter changes
watch([startDate, endDate], ([newStart, newEnd]) => {
    if (newStart instanceof Date) {
        startDate.value = moment(newStart).format('YYYY-MM-DD');
    }
    if (newEnd instanceof Date) {
        endDate.value = moment(newEnd).format('YYYY-MM-DD');
    }
}, { immediate: false });


const checkIfCurrentUserIsCO = async () => {
    try {
        const params = {
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
        }
    } else {
        isCO.value = false;
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


const handleSearch = () => {
    currentPage.value = 1;  // Reset to first page
    fetchTransactionType();
};

const clearFilters = () => {
    currentPage.value = 1;  // Reset to first page
    startDate.value = '';
    endDate.value = '';
    selectedOperation.value = null;
    fetchTransactionType();
    setDefaultMonthRange();
};



// Remove old pagination event handlers since we're using direct pagination now

const handleClickOutside = (event) => {
    if (!event.target.closest('.dropdown-row')) {
        isOpen.value = false;
    }
};



const showModal = async () => {
    openModal.value = true;

    if (isCO.value && !selectedEmployee.value) {
        const coCheck = await checkIfCurrentUserIsCO();
        if (coCheck.isCO && coCheck.employeeId) {
            const currentEmployee = employeeData.value.find(emp => emp._id === coCheck.employeeId);
            if (currentEmployee) {
                selectedEmployee.value = currentEmployee._id;
            }
        }
    }
};

// Add a function to refresh pagination
const refreshPagination = () => {
    currentPage.value = 1;
    fetchTransactionType();
};

const closeForm = () => {
    openModal.value = false;
    if (!isCO.value) {
        selectedEmployee.value = '';
    }
    refreshPagination();
};

const clearForm = () => {
    if (!isCO.value) {
        selectedEmployee.value = '';
    }
    formSelectedOperation.value = '';
    selectedAsset.value = '';
    selectedOperation.value = '';
    remark.value = '';
    returnDate.value = '';
    quantity.value = '';

};

const closeEdit = () => {
    openEdit.value = false;
    clearForm();
    refreshPagination();
};

const showEdit = (item) => {
    openEdit.value = true;
};


const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    startDate.value = now.startOf('month').format('YYYY-MM-DD');
    endDate.value = now.endOf('month').format('YYYY-MM-DD');
    returnDate.value = now.format('YYYY-MM-DD');
};



const fetchEmployee = async (branchId = null) => {
    try {
        let dynamicConditions = [];
        if (branchId) {
            // If transfer to branch is selected, show active employees from selected branch
            dynamicConditions.push(
                { field: "branchId", operator: "==", value: branchId },
                { field: "status", operator: "==", value: "active" }
            );
        } else {
            // If not transferring, show active employees from user's own branch only
            dynamicConditions.push(
                { field: "branchId", operator: "==", value: branchStore.branchId },
                { field: "status", operator: "==", value: "active" }
            );
        }
        const params = {
            dynamicConditions: JSON.stringify(dynamicConditions)
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Employee`, { params, headers: API_CONFIGS.headers });
        employeeData.value = response.data.data || [];
    } catch (error) {
        console.log("cannot fetch employee", error)
    }
};

const fetchBranches = async () => {
    try {

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.log("cannot fetch branches", error);
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


const fetchTransactionType = async () => {
    try {
        isLoading.value = true;
        tableData.value = [];

        const isAdmin = branchStore.isAdminOrSuperAdmin || branchStore.getUserRole === 'Admin' || branchStore.getUserRole === 'Super Admin';

        const dynamicConditions = [
            { field: "branchId", operator: "==", value: branchStore.branchId },
            { field: "transactionType", operator: "==", value: activeTab.value }
        ];

        if (!isAdmin) {
            dynamicConditions.push({
                field: 'chiefIds',
                operator: 'arrayContains',
                value: branchStore.userId
            });
        }

        if (startDate.value) {
            const filterStartDate = moment(startDate.value).startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&gte',
                value: filterStartDate,
                type: "Date"
            });
        }

        if (endDate.value) {
            const filterEndDate = moment(endDate.value).endOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'createdAt',
                operator: '&lte',
                value: filterEndDate,
                type: "Date"
            });
        }

        const params = {
            collectionName: 'CompanyAssetTransaction', // Required by getPaginationTwo
            dynamicConditions: JSON.stringify(dynamicConditions),
            populate: JSON.stringify(['employeeId', 'assetId']),
            page: currentPage.value,
            pageSize: pageSize.value, // Use pageSize instead of limit to match getPaginationTwo
            sortOrder: 'desc',
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getPaginationTwo`, { params, headers: API_CONFIGS.headers });

        if (response.status === 200) {
            const { data: transactions, pagination } = response.data;
            tableData.value = transactions || [];
            totalPages.value = pagination.totalPages || 1;
            totalRecords.value = pagination.totalDocuments || 0;
            // Only update currentPage if the API confirms a different page
            if (pagination.currentPage && pagination.currentPage !== currentPage.value && pagination.currentPage <= totalPages.value) {
                currentPage.value = pagination.currentPage;
            }
        } else {
            throw new Error("Invalid response status");
        }
    } catch (error) {
        console.error("Error fetching transactions:", error.message);
        tableData.value = [];
        totalPages.value = 1;
        totalRecords.value = 0;
        showErrorMessage.value = true;
        errorMessage.value = "Failed to load transaction data";
        errorAudio.play();
        setTimeout(() => showErrorMessage.value = false, 5000);
    } finally {
        isLoading.value = false;
    }
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
                { field: 'branchId', operator: '==', value: branchStore.branchId }
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

        // Create transaction with combined chiefs
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
                chiefIds: combinedChiefIds, // Add both current user and their chiefs
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

            // Emit socket event for real-time insert
            // socket.emit('dataUpdate', { collection: 'CompanyAssetTransaction', action: 'insert' , data: response.data.data?._id });

            refreshPagination();

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
                { field: 'branchId', operator: '==', value: branchStore.branchId },
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



const updateAssetStock = async (assetId, stockChange, employeeId = null) => {
    try {
        const timestamp = await fetchTimestamp();

        // Get mainBranchId from employee's representativeName if employeeId is provided
        let mainBranchId = null;
        if (employeeId) {
            mainBranchId = getMainBranchIdFromEmployee(employeeId);
        }

        // First, try to find the asset by its _id (the actual assetId from the transaction)
        let params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: assetId },
                { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };

        let assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        let assets = assetResponse.data.data || [];

        // If not found by _id, try finding by mainTransferId (for transferred assets)
        if (!assets.length) {
            const transferParams = {
                dynamicConditions: JSON.stringify([
                    { field: 'mainTransferId', operator: '==', value: assetId },
                    { field: 'branchId', operator: '==', value: branchStore.branchId }
                ])
            };
            const transferResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params: transferParams, headers: API_CONFIGS.headers });
            const transferAssets = transferResponse.data.data || [];

            if (transferAssets.length > 0) {
                assets = transferAssets;
            }
        }

        // If still not found, throw error
        if (!assets.length) {
            throw new Error(`Asset not found: ${assetId}`);
        }

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
        if (mainBranchId) {
            updateBody.fields.mainBranchId = mainBranchId;
        }

        await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${asset._id}`, updateBody, { headers: API_CONFIGS.headers });

        return true;
    } catch (error) {
        console.error(`Failed to update asset stock: ${error.message}`);
        return false;
    }
};



const updateTransaction = async () => {
    loading.value = true;
    showSuccessMessage.value = false;
    showErrorMessage.value = false;

    try {
        if (!returnDate.value) {
            errorMessage.value = "Please select a return date";
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
                { field: '_id', operator: '==', value: currentId.value },
                { field: 'branchId', operator: '==', value: branchStore.branchId }
            ])
        };

        const transactionResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });
        const transactions = transactionResponse.data.data || [];

        if (!transactions.length) {
            throw new Error("Transaction not found");
        }

        const transaction = transactions[0];

        const timestamp = await fetchTimestamp();

        // Get mainBranchId from employee's representativeName for the transaction
        const mainBranchId = getMainBranchIdFromEmployee(transaction.employeeId);

        const requestBody = {
            fields: {
                transactionType: formSelectedOperation.value,
                actualReturnDate: timestamp,
                remark: remark.value || "",
                updatedBy: branchStore.userId,
                branchId: branchStore.branchId,
                mainBranchId: mainBranchId, // <-- Get from employee's representativeName
                updatedAt: timestamp,
            }
        };


        const response = await axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAssetTransaction/${currentId.value}`, requestBody, { headers: API_CONFIGS.headers });

        if (response.status === 200 || response.status === 204) {

            if (formSelectedOperation.value === 'returned' && transaction.transactionType === 'checkout') {
                // 1) Increase asset stock
                await updateAssetStock(transaction.assetId, +transaction.qty, transaction.employeeId);

                try {
                    // 2) Get all CuttingStock records for this transaction
                    const cuttingStockParams = {
                        dynamicConditions: JSON.stringify([
                            { field: 'ref', operator: '==', value: currentId.value },
                            { field: 'type', operator: '==', value: 'check-out' }
                        ])
                    };

                    const cuttingStockResponse = await axios.get(
                        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
                        { params: cuttingStockParams, headers: API_CONFIGS.headers }
                    );
                    const cuttingStocks = cuttingStockResponse.data.data || [];

                    // 3) Process each CuttingStock record
                    for (const cs of cuttingStocks) {
                        // If this CuttingStock has a purchaseAssetHistoryId, update that history record
                        if (cs.purchaseAssetHistoryId) {
                            // Use the correct API pattern with query parameters
                            const historyParams = {
                                dynamicConditions: JSON.stringify([
                                    { field: '_id', operator: '==', value: cs.purchaseAssetHistoryId }
                                ])
                            };

                            const historyResponse = await axios.get(
                                `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
                                { params: historyParams, headers: API_CONFIGS.headers }
                            );

                            const historyRecords = historyResponse.data.data || [];
                            if (historyRecords.length > 0) {
                                const history = historyRecords[0];

                                // Remove this cutting stock ID from the history's cuttingStockIds array
                                const updatedCuttingStockIds = (history.cuttingStockIds || [])
                                    .filter(id => id !== cs._id);

                                // Update the PurchaseAssetHistory record
                                await axios.patch(
                                    `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${cs.purchaseAssetHistoryId}`,
                                    {
                                        fields: {
                                            cuttingStockIds: updatedCuttingStockIds,
                                            status: false, // Set back to in stock
                                            updatedAt: timestamp,
                                            updatedBy: branchStore.userId
                                        }
                                    },
                                    { headers: API_CONFIGS.headers }
                                );
                            }
                        }

                        // Delete the CuttingStock record
                        await axios.delete(
                            `${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cs._id}`,
                            { headers: API_CONFIGS.headers }
                        );
                    }


                    // 4) Additionally check for any orphaned CuttingStock records by purchaseAssetHistoryId
                    const purchaseHistoryParams = {
                        dynamicConditions: JSON.stringify([
                            { field: 'asset.assetId', operator: '==', value: transaction.assetId },
                            { field: 'branchId', operator: '==', value: branchStore.branchId },
                            { field: 'status', operator: '==', value: true } // Look for out-of-stock records
                        ])
                    };

                    const purchaseHistoryResponse = await axios.get(
                        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAssetHistory`,
                        { params: purchaseHistoryParams, headers: API_CONFIGS.headers }
                    );

                    const purchaseHistories = purchaseHistoryResponse.data.data || [];
                    for (const history of purchaseHistories) {
                        if (history.cuttingStockIds && history.cuttingStockIds.length > 0) {
                            const csParams = {
                                dynamicConditions: JSON.stringify([
                                    { field: '_id', operator: 'in', value: history.cuttingStockIds },
                                    { field: 'ref', operator: '==', value: currentId.value }
                                ])
                            };

                            const relatedCSResponse = await axios.get(
                                `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CuttingStock`,
                                { params: csParams, headers: API_CONFIGS.headers }
                            );

                            const relatedCS = relatedCSResponse.data.data || [];
                            if (relatedCS.length > 0) {
                                // Update the history record
                                const updatedIds = history.cuttingStockIds.filter(
                                    id => !relatedCS.find(cs => cs._id === id)
                                );

                                await axios.patch(
                                    `${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/PurchaseAssetHistory/${history._id}`,
                                    {
                                        fields: {
                                            cuttingStockIds: updatedIds,
                                            status: updatedIds.length === 0 ? false : true,
                                            updatedAt: timestamp,
                                            updatedBy: branchStore.userId
                                        }
                                    },
                                    { headers: API_CONFIGS.headers }
                                );

                                // Delete the related cutting stock records
                                for (const cs of relatedCS) {
                                    await axios.delete(
                                        `${API_CONFIGS.BASE_URL}/loan/api/deleteDocTwo/CuttingStock/${cs._id}`,
                                        { headers: API_CONFIGS.headers }
                                    );
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing return:', error);
                    throw error; // Re-throw to be caught by the outer try-catch
                }
            }

            // Show success message and clean up
            successMessage.value = "Successfully returned asset";
            showSuccessMessage.value = true;
            successAudio.play();
            setTimeout(() => (showSuccessMessage.value = false), 800);

            // Emit socket event for real-time update
            // socket.emit('dataUpdate', { collection: 'CompanyAssetTransaction', action: 'update' , data: response.data.data?._id });
            refreshPagination();

            // Close the edit form
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
};

const handleDeleteConfirmation = async (id) => {
    try {
        loading.value = true;
        showConfirmDialog.value = false;

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
                successMessage.value = "Successfully deleted transaction asset";
                showSuccessMessage.value = true;
                successAudio.play();
                setTimeout(() => (showSuccessMessage.value = false), 800);

                // Emit socket event for real-time delete
                // socket.emit('dataUpdate', { collection: 'CompanyAssetTransaction', action: 'delete' , data: response.data.data?._id });

                refreshPagination();
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




const setupSocketListeners = () => {
    socket.off("dataUpdate");
    socket.on("dataUpdate", async (data) => {
        if (data.collection === "CompanyAssetTransaction") {
            // Optionally check action: data.action === 'insert' | 'update' | 'delete'
            await fetchTransactionType(); // Refresh your data
        }
    });
};





onMounted(() => {
    fetchEmployee();
    fetchBranches();
    setDefaultMonthRange()
    document.addEventListener("click", handleClickOutside);
    setupSocketListeners();

    // Check if current user is CO and auto-select employee if needed
    checkIfCurrentUserIsCO();

    if (route.path === '/operation-assets-return') {
        activeTab.value = 'returned';
    } else {
        activeTab.value = 'checkout';
    }

});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
});


onBeforeUnmount(() => {
    socket.off("dataUpdate");
});

// Add pagination methods
const goToPage = async (page) => {
    currentPage.value = page;
    await fetchTransactionType();
    // If after fetching, there is no data and not on the first page, go back one page
    if (tableData.value.length === 0 && currentPage.value > 1) {
        currentPage.value -= 1;
        await fetchTransactionType();
    }
};



// Computed property for displayed pages
const displayedPages = computed(() => {
    const totalPagesValue = totalPages.value;
    const currentPageValue = currentPage.value;
    const siblingCount = 1; // Number of siblings around the current page
    const maxVisiblePages = 5; // Max number of pages visible including boundaries and ellipses

    // Helper function to create a range of numbers
    const range = (start, end) => {
        const length = end - start + 1;
        return Array.from({ length }, (_, i) => start + i);
    };

    if (totalPagesValue <= maxVisiblePages) {
        // If total pages are less than or equal to max visible, show all pages
        return range(1, totalPagesValue);
    }

    const startPages = 1; // Always include the first page
    const endPages = totalPagesValue; // Always include the last page

    // Calculate siblings around the current page
    const siblingsStart = Math.max(currentPageValue - siblingCount, 2); // Minimum of 2 (to leave space for the first page)
    const siblingsEnd = Math.min(currentPageValue + siblingCount, totalPagesValue - 1); // Maximum of totalPagesValue - 1 (to leave space for the last page)

    const shouldShowLeftEllipsis = siblingsStart > 2; // Ellipsis needed if there's a gap after the first page
    const shouldShowRightEllipsis = siblingsEnd < totalPagesValue - 1; // Ellipsis needed if there's a gap before the last page

    let pages = [startPages];

    if (shouldShowLeftEllipsis) {
        pages.push('...');
    }

    pages = [...pages, ...range(siblingsStart, siblingsEnd)];

    if (shouldShowRightEllipsis) {
        pages.push('...');
    }

    pages.push(endPages);

    return pages;
});

</script>



<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">Transaction assets</p>

        <!-- Add this right after your title and before the filters -->
        <div class="my-6">
            <!-- Tabs -->
            <div class="flex border-b border-gray-200">
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
                <router-link to="/operation-assets-return" custom v-slot="{ navigate, href, isActive }">
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
        </div>

        <div
            class="border-2 border-emerald-500 rounded-md p-4 flex flex-wrap justify-between text-center space-y-4 sm:space-y-0 sm:flex-row sm:gap-4 sm:m-3">

            <!-- Operation Dropdown -->
            <!-- <div class="w-full sm:w-auto my-auto">
                <div class="relative inline-block text-left w-full mb-4 md:mb-0 dropdown-operation">
                    <span class="text-sm">Select transaction</span>
                    <button @click="toggleOperationSearch"
                        class="flex items-center justify-between w-full px-2 py-1 bg-gray-100 rounded-lg mt-1 border focus:ring-2 focus:ring-emerald-400">
                        <h3 class="text-sm py-1 font-xs">{{ selectedOperation || `transaction` }}</h3>
                        <ChevronDownIcon class="w-5 h-5 transition-transform duration-200"
                            :class="{ 'rotate-180': isOperationSearchOpen }" />
                    </button>
                    <div v-show="isOperationSearchOpen"
                        class="absolute left-0 mt-2 w-full bg-white border border-gray-300 shadow-lg rounded-lg p-2 z-50">
                        <div v-if="filteredOperations.length">
                            <div v-for="operation in filteredOperations" :key="operation"
                                @click="selectOperation(operation)" :class="[
                                    'p-2 cursor-pointer rounded-lg',
                                    selectedOperation === operation ? 'bg-emerald-900 text-white' : 'hover:bg-gray-100'
                                ]">
                                {{ operation }}
                            </div>
                        </div>
                        <div v-else class="p-2 text-gray-500">No data!</div>
                    </div>
                </div>
            </div> -->

            <!-- Date -->
            <div class="text-left gap-4 bg-white">
                <!-- From Date -->
                <div class="flex mt-1 items-center space-x-2">
                    <div class="flex flex-col">
                        <span class=" w-auto text-sm text-gray-700">{{ $t('Start Date') }} ៖</span>
                        <DatePicker v-model="startDate" showIcon inputId="fromDate" class="mt-1 w-full"
                            :disabled="isLoading" format="yyyy-MM-dd" placeholder="YYYY-MM-DD" />
                    </div>

                    <!-- Date Separator Icon -->
                    <i
                        class="fa-solid fa-arrows-left-right text-emerald-500 my-auto mx-1 transition-transform duration-200 hover:scale-110 mt-10"></i>

                    <!-- To Date -->
                    <div class="flex flex-col">
                        <span class=" w-auto text-sm text-gray-700">{{ $t('End Date') }} :</span>
                        <DatePicker v-model="endDate" showIcon inputId="toDate" class="mt-1 w-full"
                            :disabled="isLoading" format="yyyy-MM-dd" placeholder="YYYY-MM-DD" />
                    </div>
                </div>

            </div>

            <!-- Button -->
            <div class="flex gap-2">
                <button @click="clearFilters" class="h-1/2 my-auto bg-gradient-to-br from-red-400 to-red-700 text-white px-4 py-2 rounded-md 
                  hover:from-red-500 hover:to-red-600 text-xs transition-all duration-300 shadow-md 
                    hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50">
                    {{ $t('Clear') }}
                </button>

                <button @click="handleSearch" class="h-1/2 my-auto bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md 
                  hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md 
                    hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">
                    {{ $t('Show') }}
                </button>
            </div>
        </div>


        <div class="flex flex-col sm:flex-row justify-between items-center mt-6 space-y-4 sm:space-y-0 sm:gap-4 ">
            <!-- Show ជួរ -->
            <div class="mb-4 md:mb-0 md:w-1/3 lg:w-1/4 xl:w-1/6">
                <div class="relative inline-block text-left dropdown-row w-[90%]">
                    <!-- Button -->
                    <button @click="toggleDropdownRow"
                        class="flex items-center justify-between w-1/2 px-1 py-2 bg-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-400">
                        <h3 class="text-sm font-medium">{{ selectedItem }}</h3>
                        <ChevronDownIcon class="w-5 h-5 transition-transform duration-200"
                            :class="{ 'rotate-180': isOpen }" />
                    </button>

                    <!-- Dropdown -->
                    <div v-show="isOpen"
                        class="absolute left-0 mt-2 w-1/2 bg-white border border-gray-300 shadow-lg rounded-lg p-2 z-50">
                        <!-- Dropdown Items -->
                        <div v-for="item in items" :key="item" @click="selectItem(item)" :class="[
                            'p-2 cursor-pointer rounded-lg',
                            selectedItem === item ? 'bg-emerald-900 text-white' : 'hover:bg-gray-100'
                        ]">
                            {{ item }}
                        </div>
                        <div v-if="items.length === 0" class="p-2 text-gray-500">No data!</div>
                    </div>
                </div>
            </div>

            <!-- Add New Button (permission) -->
            <button v-if="canCreateTransaction()" class="bg-gradient-to-br from-green-400 to-green-700 text-white px-4 py-2 rounded-md 
              hover:from-green-500 hover:to-green-600 text-xs transition-all duration-300 shadow-md 
                hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                @click="showModal">
                {{ $t('Create new') }}
            </button>
        </div>

        <!-- Table (permission) -->
        <div v-if="canViewTransaction()" class="overflow-x-auto mt-3 relative">
            <div v-if="isLoading == true" class="absolute inset-1  bg-opacity-70 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
            <table class="border-collapse border border-gray-400 p-2 w-full"
                :class="{ 'opacity-50': isLoading == true }">
                <thead class="text-xs bg-gray-100">
                    <tr>
                        <th class="border border-gray-300 p-2">{{ $t('No') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Employee') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Asset Name') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('CreateAt') }}</th>
                        <!-- <th class="border border-gray-300 p-2">{{ $t('Total') }}</th> -->
                        <th class="border border-gray-300 p-2">{{ $t('Noted') }}</th>
                        <!-- <th class="border border-gray-300 p-2">{{ $t('Status') }}</th> -->
                        <!-- <th class="border border-gray-300 p-2">{{ $t('Transaction Type') }}</th> -->
                        <th class="border border-gray-300 p-2">{{ $t('Actions') }}</th>
                    </tr>
                </thead>
                <tbody class="text-sm" v-if="tableData.length > 0">
                    <tr v-for="(item, index) in tableData" :key="index"
                        class="hover:bg-emerald-100 transition-colors duration-200">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">{{ item.employeeId ? item.employeeId.khName : null
                        }}
                        </td>
                        <td class="border border-gray-300 p-2">{{ item.assetId ? item.assetId.name : null }}</td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <!-- <td class="border border-gray-300 p-2">{{ item.qty }}</td> -->
                        <td class="border border-gray-300 p-2">{{ item.remark || '-' }}</td>
                        <!-- <td class="border border-gray-300 p-2">
                            <div class="flex items-center justify-center"> -->
                                <!-- Approved status -->
                                <!-- <div v-if="item.status?.approved?.value === 'approved'"
                                    class="flex items-center px-3 py-1 bg-green-100 rounded-full">
                                    <i class="fa-solid fa-circle-check text-green-600 mr-1.5"></i>
                                    <span class="text-xs font-medium text-green-700">Approved</span>
                                </div> -->

                                <!-- Confirmed status -->
                                <!-- <div v-else-if="item.status?.confirmed?.value === 'confirmed'"
                                    class="flex items-center px-3 py-1 bg-blue-100 rounded-full">
                                    <i class="fa-solid fa-circle-check text-blue-600 mr-1.5"></i>
                                    <span class="text-xs font-medium text-blue-700">Confirmed</span>
                                </div> -->

                                <!-- Checked status -->
                                <!-- <div v-else-if="item.status?.checked?.value === 'checked'"
                                    class="flex items-center px-3 py-1 bg-emerald-100 rounded-full">
                                    <i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i>
                                    <span class="text-xs font-medium text-emerald-700">Checked</span>
                                </div> -->

                                <!-- Rejected status -->
                                <!-- <div v-else-if="item.status?.rejected?.value === 'rejected'"
                                    class="flex items-center px-3 py-1 bg-red-100 rounded-full">
                                    <i class="fa-solid fa-circle-xmark text-red-600 mr-1.5"></i>
                                    <span class="text-xs font-medium text-red-700">Rejected</span>
                                </div> -->

                                <!-- Requested status (default) -->
                                <!-- <div v-else class="flex items-center px-3 py-1 bg-amber-100 rounded-full">
                                    <i class="fa-solid fa-clock text-amber-600 mr-1.5"></i>
                                    <span class="text-xs font-medium text-amber-700">Requested</span>
                                </div>
                            </div>
                        </td> -->
                        <!-- <td class="border border-gray-300 p-2">
                            <button
                                class="relative px-3 py-1 font-bold text-[11px] rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
                                :class="{
                                    'bg-[#fdfbfb] border border-emerald-500 text-emerald-500 cursor-not-allowed opacity-75':
                                        item.transactionType === 'returned' ||
                                        !canUpdateTransaction(item) ||
                                        item.status?.rejected?.value === 'rejected' ||
                                        item.status?.approved?.value !== 'approved',
                                    'bg-[#fdfbfb] border border-orange-500 text-orange-500':
                                        item.transactionType === 'checkout' &&
                                        canUpdateTransaction(item) &&
                                        item.status?.rejected?.value !== 'rejected' &&
                                        item.status?.approved?.value === 'approved'
                                }" :disabled="item.transactionType === 'returned'
                                    || !canUpdateTransaction(item)
                                    || item.status?.rejected?.value === 'rejected'
                                    || item.status?.approved?.value !== 'approved'" @click="canUpdateTransaction(item)
                                        && item.status?.rejected?.value !== 'rejected'
                                        && item.status?.approved?.value === 'approved'
                                        && updateBtn(item)">
                                <i v-if="item.transactionType === 'returned'" class="fa-solid fa-check mr-1"></i>
                                <i v-if="item.transactionType === 'checkout'" class="fa-solid fa-arrows-turn-right"></i>
                                <span class="relative z-10">{{ item.transactionType }}</span>
                                <span class="absolute inset-0 rounded-full opacity-20 bg-white"
                                    v-if="item.transactionType === 'returned'"></span>
                            </button>
                        </td> -->


                        <td class="border border-gray-300 p-2">

                            <!-- Only show the Approve icon if the user has at least one permission -->
                            <!-- <i v-if="canApproveTransaction() || canCheckTransaction() || canConfirmTransaction()"
                                class="fa-solid fa-check-to-slot cursor-pointer text-green-600 ml-2 hover:text-green-700 hover:scale-125 transform transition duration-150 ease-in-out"
                                @click="ShowDetail(item._id)"></i> -->

                            <!-- <i v-if="canDeleteTransaction()" @click="deleteTransaction(item._id)"
                                class="fa-solid fa-trash fa-md cursor-pointer text-red-600 ml-2 hover:text-red-700 hover:scale-125 transform transition duration-150 ease-in-out"></i> -->
                        </td>
                    </tr>
                </tbody>

                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500">
                        <td colspan="10" class="font-khmer text-center text-lg">
                            No {{ activeTab }} transactions found!
                        </td>
                    </tr>
                </tbody>
            </table>
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
                    <span v-if="page === '...'"
                        class="px-3 py-2 flex items-center !font-medium text-gray-500">...</span>
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
    </div>

    <!-- Create Operation -->
    <div v-if="openModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
        <div class="font-khmer w-[40%] mt-1 p-6 bg-white shadow-md rounded-lg relative z-50 m-auto">
            <!-- Close Icon -->
            <i class="fa-solid fa-circle-xmark cursor-pointer text-red-700 text-lg absolute top-3 right-3 
                hover:text-red-500 transform hover:scale-105 transition-all duration-300 ease-in-out"
                @click="closeForm"></i>

            <!-- Title -->
            <h2 class="text-lg font-semibold mb-4 text-gray-700 text-center mt-[-15px]">{{ $t('Create Transaction Assets Form') }}
            </h2>

            <!-- Form -->
            <form @submit.prevent="createTransaction" class="grid gap-4">
                <!-- Input Rows with 3 columns -->
                <div class="grid">


                    <!-- Branch Select Toggle & Dropdown (hide if isCOUser) -->
                    <!-- <template v-if="!isCOUser">
                        <div class="mb-4 flex items-center">
                            <label class="font-semibold text-gray-800 cursor-pointer select-none mr-2">{{ $t('Transfer To Branch?') }}</label>
                            <input type="checkbox" v-model="isBranchSelectEnabled" class=" h-4 w-4 cursor-pointer" />
                        </div>

                        <div v-if="isBranchSelectEnabled" class="mb-4">
                            <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Branch') }} <span
                                    class="text-red-500">*</span></label>
                            <Select v-model="selectedBranchId" :options="branchData" optionLabel="name"
                                optionValue="_id" :placeholder="$t('Select branch')" class="w-full mt-1" filter
                                @change="fetchEmployee(selectedBranchId)" />
                        </div>
                    </template> -->

                    <!-- Employee Dropdown -->
                    <div class="relative text-left dropdown-employeeForm z-50 mb-4">
                        <label class="block text-xs text-gray-700 text-left p-1">
                            {{ $t('Employee') }}
                            <span class="text-red-500">*</span>

                        </label>
                        <template v-if="isCOUser">
                            <input type="text" :value="isCOReady ? coEmployeeName : 'Loading...'"
                                class="w-full mt-1 bg-gray-100 border border-gray-300 rounded-lg p-2" disabled />
                        </template>
                        <template v-else>
                            <Select v-model="selectedEmployee" :options="employeeData" optionLabel="khName"
                                optionValue="_id" :placeholder="$t('Select employee')" class="w-full mt-1" filter />
                        </template>
                    </div>


                    <!--CompanyAsset dropdown-->

                    <div class="relative text-left dropdown-asset z-50 mb-4">
                        <label class="block text-xs text-gray-700 text-left p-1">
                            {{ $t('Assets') }} <span class="text-red-500">*</span>
                        </label>
                        <Select v-model="selectedAsset" :options="filteredAssets" optionLabel="name" optionValue="_id"
                            :placeholder="$t('Select assets')" class="w-full mt-1" filter />
                        <span v-if="selectedAsset" class="text-xs text-gray-500 mt-1 block">
                            {{ $t('Available:') }} {{ getMaxQuantity(selectedAsset) }}
                        </span>
                    </div>

                    <!-- Number input -->
                    <div class="w-full ">
                        <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Quantity') }} <span
                                class="text-red-500">*</span></label>
                        <input type="number" class="border mt-1 border-gray-300 p-2 rounded-md w-full 
                            transition-all outline-none duration-300 ease-in-out hover:border-emerald-300 text-left"
                            placeholder="0" min="0" v-model.number="quantity" />
                    </div>

                </div>

                <div>
                    <label class="block text-xs text-gray-700 text-left p-1">{{ $t('Noted') }}</label>
                    <textarea v-model="remark" class="border mt-1 border-gray-300 p-2 rounded-md w-full 
                        transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"
                        :placeholder="t('Description...')"></textarea>
                </div>



                <!-- Buttons -->
                <div class="flex justify-end space-x-2 mt-4">
                    <button type="button" @click="clearForm"
                        class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">{{
                            $t('Clear') }}</button>
                    <button type="submit"
                        class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-emerald-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">{{
                            $t('Create') }}</button>
                </div>
            </form>
        </div>
    </div>



    <!-- Confirmation Delete Dialog -->
    <ConfirmationDeleteMessage :show="showConfirmDialog" @cancel="showConfirmDialog = false"
        @confirm="handleDeleteConfirmation" />

    <!-- Success and Error Messages -->
    <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
    <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />

    <ApproveModal v-if="showDetailModal" :transactionId="selectedTransaction" @close="showDetailModal = false"
        @updateSuccess="fetchTransactionType" />

    <!-- Mobile  Layout -->
    <TransactionMobileScreen class="block md:hidden" />
</template>

<style scoped>
tbody tr:nth-child(even) {
    background-color: #34D399;
    /* emerald-400 */
    color: white;
}

.max-h-45 {
    max-height: 13rem;
}

.overflow-y-auto::-webkit-scrollbar {
    width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #34D399;
    /* emerald-400 */
    border-radius: 20px;
    transition: background-color 0.3s ease;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #10B981;
    /* emerald-500 for hover */
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #dcfce7;
    /* lime-100 */
}

/* Firefox */
.overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: #34D399 #dcfce7;
    /* thumb / track */
}

.tab-active {
    border-bottom-width: 2px;
    border-bottom-style: solid;
    border-bottom-color: #10B981; /* Tailwind emerald-500 */
    color: #10B981; /* Tailwind emerald-500 */
}

.tab-inactive {
    border-bottom-width: 2px;
    border-bottom-color: transparent;
    color: #6B7280; /* Tailwind text-gray-500 */
    transition: color 0.2s, border-color 0.2s;
}
.tab-inactive:hover {
    color: #10B981; /* Tailwind text-emerald-500 */
    border-bottom-color: #6EE7B7; /* Tailwind border-emerald-300 */
}

/* Pagination button styles */
.pagination-button {
    transition: all 0.2s ease-in-out;
}

.pagination-button:hover:not(:disabled) {
    transform: scale(1.05);
}

.pagination-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

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