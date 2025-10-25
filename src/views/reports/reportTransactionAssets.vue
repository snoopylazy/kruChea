<script setup>
import API_CONFIGS from '@/api/config';
import formatDateKhmer from '@/composable/formatDateKhmer';
import { useAssetDropdown } from '@/composable/useAssetData';
import { useEmployeeDropdown } from '@/composable/useEmployeeData';
import { useOperationDropdown } from '@/composable/useOperation';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import { computed, onMounted, ref, watch } from 'vue';
import * as XLSX from 'xlsx';
import mobileScreen from '../Mobile/dashboard/index.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()


const {
    isFormEmployeeSearchOpen,
    filteredEmployees,
    searchInputEmployee,
    formSelectedEmployee,
    employeeSearchInputRef,
    getEmployee,
    toggleFormEmployeeSearch,
    selectedFormEmployee,
    updateFilteredEmployees,
    fetchEmployees,
} = useEmployeeDropdown(API_CONFIGS.BASE_URL);

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
    selectOperationForm

} = useOperationDropdown();

const { getAssetName, getAssetType } = useAssetDropdown(API_CONFIGS.BASE_URL);

const tableRef = ref(null);
const dateRange = ref(null);
const returnDate = ref("");
const branchStore = useBranchStore()
const isLoading = ref(false)


const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    dateRange.value = [
        now.startOf('month').toDate(),
        now.clone().endOf('month').startOf('day').toDate()
    ];
};

const handleSearch = () => {
    getAllAssetTransaction();
}

const clearFilters = () => {
    setDefaultMonthRange()
    formSelectedEmployee.value = null;
    formSelectedOperation.value = null;
    getAllAssetTransaction()

};



// Define the reactive table data
const tableData = ref([]);
const getAllAssetTransaction = async () => {

    try {
        isLoading.value = true;

        const dynamicConditions = [
            {
                field: "branchId",
                operator: "==",
                value: branchStore.branchId,
            },

        ];
        if (formSelectedEmployee.value) {
            dynamicConditions.push({
                field: "employeeId",
                operator: "==",
                value: formSelectedEmployee.value
            });
        }

        if (formSelectedOperation.value) {
            dynamicConditions.push({
                field: "transactionType",
                operator: "==",
                value: formSelectedOperation.value
            });
        }

        if (dateRange.value && dateRange.value[0]) {
            const filterStartDate = moment(dateRange.value[0]).startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'checkOutDate',
                operator: '&gte',
                value: filterStartDate,
                type: "Date"
            });
        }
        if (dateRange.value && dateRange.value[1]) {
            const filterEndDate = moment(dateRange.value[1]).endOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'checkOutDate',
                operator: '&lte',
                value: filterEndDate,
                type: "Date"
            });
        }

        if (returnDate.value) {
            const filterReturnDate = moment(returnDate.value).startOf('day').tz('UTC').toDate();
            dynamicConditions.push({
                field: 'actualReturnDate',
                operator: '&gte',
                value: filterReturnDate,
                type: "Date"
            });
        }

        const params = {
            dynamicConditions: JSON.stringify(dynamicConditions),
            populate: JSON.stringify([
                'employeeId',
                {
                    path: 'assetId',
                    populate: {
                        path: 'category',
                    },
                },
            ]),
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, { params, headers: API_CONFIGS.headers });

        tableData.value = response.data.data || []
            ;
    } catch (error) {
        console.error('Error fetching asset transactions:', error);
        tableData.value = [];
    } finally {
        isLoading.value = false;
    }
};
// Export function
const exportToExcel = () => {
    const ws_data = [
        ['ID', 'Employee', 'Asset', 'Category', 'CheckOut Date', 'Status', 'Return Date', 'Note'],
        ...tableData.value.map((item, index) => [
            index + 1,
            item.employeeId?.khName || '',
            item.assetId?.name || '',
            item.assetId?.category?.categoryName || 'N/A',
            formatDateKhmer(item.checkOutDate) || '',
            item.transactionType || '',
            formatDateKhmer(item.actualReturnDate) || '-',
            item.remark || '-',
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [
        { width: 6 },   // ID
        { width: 20 },  // Employee
        { width: 20 },  // Asset
        { width: 15 },  // Category
        { width: 18 },  // CheckOut Date
        { width: 12 },  // Status
        { width: 18 },  // Return Date
        { width: 25 },  // Note
    ];

    // Apply alternating row colors
    // for (let rowIndex = 1; rowIndex < ws_data.length; rowIndex++) {
    //     const row = rowIndex + 1;
    //     const rowStyle = rowIndex % 2 === 0
    //         ? { fill: { fgColor: { rgb: '007A32' } } } // Green background for even rows
    //         : {};

    //     for (let colIndex = 0; colIndex < ws_data[rowIndex].length; colIndex++) {
    //         const cellAddress = { r: row, c: colIndex };
    //         const cellRef = XLSX.utils.encode_cell(cellAddress);
    //         if (!ws[cellRef]) ws[cellRef] = {};
    //         ws[cellRef] = { ...ws[cellRef], ...rowStyle };
    //     }
    // }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
    XLSX.writeFile(wb, 'Report_CompanyAssetTransaction".xlsx');
};

// Print function
const printableDiv = ref(null);
const printTable = () => {
    const printCSS = `
        <style>
        @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
        </style>`;

    document.body.insertAdjacentHTML("beforeend", printCSS);
    window.print();
};

// Add a watch for branch changes
watch(() => branchStore.branchId, async (newBranchId, oldBranchId) => {
    if (newBranchId !== oldBranchId) {

        formSelectedEmployee.value = null;
        formSelectedOperation.value = null;
        // setDefaultMonthRange();

        await getAllAssetTransaction();
        await fetchEmployees()
    }
}, { immediate: false });

const formattedOperations = computed(() => {
    return filteredOperations.value;
});

onMounted(() => {
    fetchEmployees();
})

</script>

<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">{{ $t('Report Transaction Assets') }}</p>
        <div class="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0 sm:gap-4">
            <!-- Dropdown -->
            <div
                class="justify-between flex flex-col sm:flex-row gap-10 items-start relative text-left max-h-45 w-[30%]">
                <div class="relative w-full text-left">
                    <!-- Employee -->
                    <span class="text-sm">{{ $t('Employees') }}</span>
                    <Select v-model="formSelectedEmployee" :options="filteredEmployees" optionLabel="khName"
                        optionValue="_id" :placeholder="$t('Select Employee')" class="w-full " :filter="true"
                        :showClear="true" />
                </div>

                <div class="relative w-full text-left">
                    <!-- TransactionType -->
                    <span class="text-sm">{{ $t('Transaction Types') }}</span>
                    <Select v-model="formSelectedOperation" :options="formattedOperations"
                        :placeholder="$t('Select transaction')" class="w-full" :showClear="true" />
                </div>
            </div>

            <!-- Date -->
            <div class="text-left gap-4 bg-white">
                <div class="flex flex-col w-full">
                    <span class="w-auto text-sm text-gray-700">{{ $t('Date Range') }} ៖</span>
                    <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon
                        iconDisplay="input" inputId="dateRange" class="w-full" dateFormat="dd/mm/yy"
                        :placeholder="$t('Select date range')" :defaultViewDate="defaultViewDate" />
                </div>
            </div>

            <!-- Buttons -->
            <div class="flex flex-wrap gap-2">
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

        <div class="text-end mt-4 sm:mt-0">
            <i class="fa-solid fa-print cursor-pointer text-orange-600 text-xl sm:mt-2 sm:mr-5 hover:text-orange-700 animate-bounce"
                @click="printTable"></i>
            <i class="fa-solid fa-download cursor-pointer text-xl sm:mt-2 hover:text-gray-400 animate-bounce"
                @click="exportToExcel"></i>
        </div>
    </div>

    <div class="font-khmer p-5 w-full shadow-md rounded-md bg-white mt-5 hidden md:block">
        <div ref="printableDiv" class="print-area overflow-x-auto relative">
            <!-- Header Table -->
            <div class="text-sm font-semibold mb-4">
                <h2 class="text-center text-green-700">Ambel Cash</h2>
                <h2 class="text-center">បញ្ជីរបាយការណ៍ការប្រតិបត្តិការសម្ភារៈរបស់ក្រុមហ៊ុន</h2>
                <h2 class="text-center">----------------------</h2>
            </div>

            <div v-if="isLoading == true"
                class="absolute inset-0  bg-opacity-70 flex items-center justify-center z-10 mt-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>

            <!-- Table Content -->
            <table class="w-full mt-3 p-2 border-collapse" ref="tableRef" :class="{ 'opacity-50': isLoading == true }">
                <thead class="bg-gray-100 text-xs">
                    <tr class="border-collapse border border-gray-400">
                        <th class="border border-gray-300 p-2">{{ $t('ID') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Employee') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Assets') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Category') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('CheckOutDate') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('Status') }}</th>
                        <th class="border border-gray-300 p-2">{{ $t('ReturnDate') }}</th>

                        <th class="border border-gray-300 p-2">{{ $t('Noted') }}</th>
                    </tr>
                </thead>
                <tbody class="text-sm" v-if="tableData.length > 0">
                    <tr v-for="(item, index) in tableData" :key="index">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">{{ item.employeeId ? item.employeeId.khName : '' }}</td>
                        <td class="border border-gray-300 p-2">{{ item.assetId ? item.assetId.name : '' }}</td>
                        <td class="border border-gray-300 p-2">{{ item.assetId?.category?.categoryName || 'N/A' }}</td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.checkOutDate) }}</td>
                        <td class="border border-gray-300 p-2">{{ item.transactionType }}</td>
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.actualReturnDate) || '-' }}</td>

                        <td class="border border-gray-300 p-2">{{ item.remark || '-' }}</td>

                    </tr>
                </tbody>

                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500 ">
                        <td colspan="10" class="font-khmer text-center  text-lg">
                            {{ $t('No data found!') }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>


    <!-- Mobile  Layout -->
    <mobileScreen class="block md:hidden" />
</template>

<style scoped>
/* Hide other elements during printing */


.max-h-70 {
    max-height: 30rem;
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


@media print {
    body * {
        visibility: hidden;
    }

    .print-area,
    .print-area * {
        visibility: visible;
    }

    .print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
    }

    tbody tr,
    tbody tr:nth-child(even),
    tbody tr:nth-child(odd) {
        background-color: transparent !important;
        /* Remove background */
        color: #000000 !important;
        /* Force black text */
    }

    /* Ensure table cells inherit the black text color */
    td {
        color: #000000 !important;
    }

}

/* Make DatePicker smaller */
:deep(.compact-datepicker .p-inputtext) {
    padding: 0.3rem 0.5rem;
    font-size: 0.875rem;
    height: 2rem;
}

:deep(.compact-datepicker .p-datepicker-trigger) {
    padding: 0.3rem;
    height: 2rem;
    width: 2rem;
}

:deep(.compact-datepicker .p-button-icon) {
    font-size: 0.875rem;
}

:deep(.p-datepicker) {
    font-size: 0.875rem;
}

:deep(.p-datepicker table td) {
    padding: 0.2rem;
}

:deep(.p-datepicker table th) {
    padding: 0.2rem;
}

/* Make Select component smaller */
:deep(.compact-select .p-component) {
    font-size: 0.875rem;
}

:deep(.compact-select .p-inputtext) {
    padding: 0.3rem 0.5rem;
    font-size: 0.875rem;
    height: 2rem;
}

:deep(.compact-select .p-dropdown-trigger) {
    width: 2rem;
}

:deep(.compact-select .p-dropdown-label) {
    padding: 0.3rem 0.5rem;
}

:deep(.compact-select .p-dropdown-item) {
    padding: 0.3rem 0.5rem;
    font-size: 0.875rem;
}

:deep(.compact-select .p-dropdown-filter-container .p-inputtext) {
    padding: 0.3rem 0.5rem;
    font-size: 0.875rem;
}
</style>