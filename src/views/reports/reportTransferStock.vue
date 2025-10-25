<script setup>
import API_CONFIGS from '@/api/config';
import formatDateKhmer from '@/composable/formatDateKhmer';
import formatDate from '@/composable/formatDateReport';
import { useAssetDropdown } from '@/composable/useAssetData';
import { useBranchStore } from '@/store/branchStore';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';
import axios from 'axios';
import moment from 'moment-timezone';
import DatePicker from 'primevue/datepicker';
import { onMounted, ref, watch } from 'vue';
import 'vue-datepicker-next/index.css';
import * as XLSX from 'xlsx';
import mobileScreen from '../Mobile/dashboard/index.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const tableRef = ref(null);
const isLoading = ref(false);
const branchStore = useBranchStore();
const startDate = ref('');
const endDate = ref('');
const printableDiv = ref(null);
const tableData = ref([]);
const branchData = ref([]);
const userData = ref([]);


const {
    isAssetSearchOpen,
    filteredAssets,
    fetchAssets,
    handleAssetClickOutside,
    searchInputAsset,
    selectedAsset,
    assetSearchInputRef,
    getAssetName,
    toggleAssetSearch,
    updateFilteredAssets,
    selectAsset,
} = useAssetDropdown(API_CONFIGS.BASE_URL);

const handleSearch =() => {
    getStockTransfer();
};

const clearFilters = () => {
    setDefaultMonthRange();
    selectedAsset.value = null;
    getStockTransfer();
};

const setDefaultMonthRange = () => {
    const now = moment().tz('UTC');
    startDate.value = now.startOf('month').format('YYYY-MM-DD');
    endDate.value = now.endOf('month').format('YYYY-MM-DD');
};


const getBranchName = (branchId) => {
    if (!branchId) return 'N/A';
    // Convert to string if it's not already a string
    const branchIdStr = String(branchId).replace(/^"|"$/g, '');
    const branch = branchData.value.find(branch => String(branch._id) === branchIdStr);
    return branch ? branch.name : 'Unknown Branch';
}


const getBranch = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([{ field: "status", operator: "==", value: true }])
        }

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocs/Branch`, { params });

        branchData.value = response.data.data || [];

    } catch (error) {
        console.log("Error fetching branch:", error);

    }
}

const getUserName = (userId) => {
    const user = userData.value.find(user => user._id === userId);
    return user ? user.displayName || user.username : '-';
}

const getUser = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: "status", operator: "==", value: true },
                { field: "branchId", operator: "==", value: branchStore.branchId }
            ])
        }

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        userData.value = response.data.data || [];

    } catch (error) {
        console.log("Error fetching user:", error);
    }
}



const getStockTransfer = async () => {
    isLoading.value = true;
    try {
        const dynamicConditions = [
            { field: "fromBranchId", operator: "==", value: branchStore.branchId },
        ];

        if (selectedAsset.value) {
            dynamicConditions.push({
                field: "assetsTransfer.assetId",
                operator: "==",
                value: selectedAsset.value
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
            dynamicConditions: JSON.stringify(dynamicConditions)
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, { params, headers: API_CONFIGS.headers });
        tableData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching stock transfers:', error);
        tableData.value = [];
    } finally {
        isLoading.value = false;
    }
};

const exportToExcel = () => {
    const excelData = tableData.value.map((item, index) => {
        const assetInfo = item.assetsTransfer && item.assetsTransfer.length
            ? item.assetsTransfer.map(asset =>
                `${asset.assetName || 'Unknown'} (${asset.qty || 0})`
            ).join(', ')
            : 'No assets';

        return {
            id: index + 1,
            createdBy: getUserName(item.createdBy),
            fromBranch: getBranchName(item.fromBranchId),
            toBranch: getBranchName(item.toBranchId),
            assets: assetInfo,
            createdAt: formatDateKhmer(item.createdAt),
            note: item.note || '-'
        };
    });

    const ws_data = [
        ['ID', 'Created By', 'From Branch', 'To Branch', 'Assets', 'Created At', 'Note'],
        ...excelData.map(item => [
            item.id,
            item.createdBy,
            item.fromBranch,
            item.toBranch,
            item.assets,
            item.createdAt,
            item.note
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!cols'] = [
        { width: 5 },   // ID
        { width: 20 },  // Created By
        { width: 20 },  // From Branch
        { width: 20 },  // To Branch
        { width: 40 },  // Assets
        { width: 20 },  // Created At
        { width: 25 },  // Note
    ];

    // Optional: alternating row color (only works with SheetJS Pro / xlsx-style)
    // You can comment this block out if you are using community version
    for (let rowIndex = 1; rowIndex < ws_data.length; rowIndex++) {
        const row = rowIndex + 1;
        const rowStyle = rowIndex % 2 === 0 ? { fill: { fgColor: { rgb: 'E6F7EF' } } } : {};
        for (let colIndex = 0; colIndex < ws_data[rowIndex].length; colIndex++) {
            const cellAddress = { r: row, c: colIndex };
            const cellRef = XLSX.utils.encode_cell(cellAddress);
            if (!ws[cellRef]) ws[cellRef] = {};
            ws[cellRef] = { ...ws[cellRef], ...rowStyle };
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Transfers');
    XLSX.writeFile(wb, 'Report_TransferStock.xlsx');
};


const exportToPDF = () => {
    // Store the original page title
    const originalTitle = document.title;

    // Set a more descriptive title for the PDF file
    document.title = 'Stock_Transfer_Report_' + new Date().toLocaleDateString().replace(/\//g, '-');

    // Create a style element with print-specific CSS
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
            
            /* PDF-specific styles */
            @page { size: landscape; margin: 1cm; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; }
            
            /* Remove background colors for better PDF output */
            tbody tr, tbody tr:nth-child(even), tbody tr:nth-child(odd) {
                background-color: transparent !important;
                color: #000 !important;
            }
        }
    `;

    document.head.appendChild(style);

    // Trigger the print dialog (user can select "Save as PDF")
    window.print();

    // Clean up: remove the style element and restore original title
    setTimeout(() => {
        document.head.removeChild(style);
        document.title = originalTitle;
    }, 1000);
};

const printTable = () => {
    // Store the original page title
    const originalTitle = document.title;

    // Set a more descriptive title for the printed document
    document.title = 'Stock Transfer Report - ' + new Date().toLocaleDateString();

    // Create a style element with print-specific CSS
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
            
            /* Ensure table borders print properly */
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 8px; }
            
            /* Remove background colors for better printing */
            tbody tr, tbody tr:nth-child(even), tbody tr:nth-child(odd) {
                background-color: transparent !important;
                color: #000 !important;
            }
        }
    `;

    document.head.appendChild(style);

    // Trigger the print dialog
    window.print();

    // Clean up: remove the style element and restore original title
    setTimeout(() => {
        document.head.removeChild(style);
        document.title = originalTitle;
    }, 1000);
};

// Add a watch for branch changes
watch(() => branchStore.branchId, async (newBranchId, oldBranchId) => {
    if (newBranchId !== oldBranchId) {
        await Promise.all([
            getBranch(),
            getUser(),
            getStockTransfer()
        ]);
    }
}, { immediate: false });

onMounted(() => {
    setDefaultMonthRange();
    getBranch();
    getUser();
});
</script>

<template>
    <div class="p-5 w-full bg-white shadow-md rounded-md font-khmer hidden md:block">
        <p class="text-left font-semibold text-lg">{{$t('Report transfer stock')}}</p>

        <div class="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0 sm:gap-4">
            <div class="relative w-[15%] text-left dropdown-asset">
                <span class="text-sm">{{$t('Asstes')}}</span>
                <button @click="toggleAssetSearch" type="button"
                    class="flex items-center justify-between w-full px-2 py-1 bg-gray-100 rounded-lg mt-1 border focus:ring-2 focus:ring-emerald-400">
                    <h3 class="text-sm py-1 font-xs">{{ getAssetName(selectedAsset) || t('Select asset') }}</h3>
                    <ChevronDownIcon class="w-5 h-5 transition-transform duration-200"
                        :class="{ 'rotate-180': isAssetSearchOpen }" />
                </button>
                <div v-show="isAssetSearchOpen"
                    class="absolute left-0 mt-2 w-full bg-white border border-gray-300 shadow-lg rounded-lg p-2 max-h-60 overflow-y-auto z-50">
                    <input ref="assetSearchInputRef" v-model="searchInputAsset" @input="updateFilteredAssets"
                        type="text" placeholder="by name..."
                        class="w-full px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <div v-if="filteredAssets.length" class="mt-1">
                        <div v-for="asset in filteredAssets" :key="asset._id" @click="selectAsset(asset._id)" :class="{
                            'bg-green-500 text-white font-bold': selectedAsset === asset._id,
                            'hover:bg-gray-100': selectedAsset !== asset._id
                        }"
                            class="p-2 cursor-pointer rounded-md transition-all duration-300 ease-in-out flex items-center justify-between">

                            <!-- Asset Name -->
                            <span>{{ asset.name }}</span>

                            <!-- Check Icon (Shown Only If Selected) -->
                            <svg v-if="selectedAsset === asset._id" xmlns="http://www.w3.org/2000/svg" fill="none"
                                viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-white">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <div v-else class="p-2 text-gray-500">{{$t('Not Found!')}}</div>
                </div>
            </div>

            <div class="text-left gap-4 bg-white">
                <div class="flex mt-1 items-center space-x-3 justify-end">
                    <div class="flex flex-col w-3/12">
                        <span class="w-auto text-sm text-gray-700">{{$t('Start Date')}} ៖</span>
                        <DatePicker v-model="startDate" showIcon fluid iconDisplay="input" inputId="startDate" class=""
                            dateFormat="dd/mm/yy" />
                    </div>
                    <i class="fa-solid fa-arrows-left-right text-emerald-500 my-auto mx-1 mt-10"></i>
                    <div class="flex flex-col w-3/12">
                        <span class="w-auto text-sm text-gray-700">{{$t('End Date')}} ៖</span>
                        <DatePicker v-model="endDate" showIcon fluid iconDisplay="input" inputId="endDate" class=""
                            dateFormat="dd/mm/yy" />
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap gap-2">
                <button @click="clearFilters"
                    class="h-1/2 my-auto bg-gradient-to-br from-red-400 to-red-700 text-white px-4 py-2 rounded-md hover:from-red-500 hover:to-red-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50">{{$t('Clear')}}</button>
                <button @click="handleSearch"
                    class="h-1/2 my-auto bg-gradient-to-br from-emerald-400 to-emerald-700 text-white px-4 py-2 rounded-md hover:from-emerald-500 hover:to-emerald-600 text-xs transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50">{{$t('Show')}}</button>
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
        <div ref="printableDiv" class="print-area overflow-x-auto mt-3 relative">
            <div class="text-sm font-semibold mb-4">
                <h2 class="text-center text-green-700">Ambel Cash</h2>
                <h2 class="text-center">បញ្ជីរបាយការណ៍ការគ្រប់គ្រងការផ្ទេរសម្ភារៈរបស់ក្រុមហ៊ុន</h2>
                <h2 class="text-center">----------------------</h2>
            </div>
            <div v-if="isLoading == true"
                class="absolute inset-0 bg-opacity-70 flex items-center justify-center z-10 mt-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>

            <table ref="tableRef" class="w-full mt-3 border-collapse" :class="{ 'opacity-50': isLoading == true }">
                <thead class="bg-gray-100 text-xs">
                    <tr class="border border-gray-400">
                        <th class="border border-gray-300 p-2">{{$t('ID')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Created By')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('From Branch')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('To Branch')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Assets')}}</th>
                        <!-- <th class="border border-gray-300 p-2">Quantity</th> -->
                        <th class="border border-gray-300 p-2">{{$t('Created At')}}</th>
                        <th class="border border-gray-300 p-2">{{$t('Note')}}</th>
                    </tr>
                </thead>
                <tbody class="text-sm" v-if="tableData.length > 0">
                    <tr v-for="(item, index) in tableData" :key="index">
                        <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                        <td class="border border-gray-300 p-2">{{ getUserName(item.createdBy || '-') }}</td>
                        <td class="border border-gray-300 p-2">{{ getBranchName(item.fromBranchId || 'N/A') }}</td>
                        <td class="border border-gray-300 p-2">{{ getBranchName(item.toBranchId || 'N/A') }}</td>
                        <td class="border border-gray-300 p-2">
                            <div v-if="item.assetsTransfer && item.assetsTransfer.length">
                                <div v-for="(asset, i) in item.assetsTransfer" :key="i" class="mb-1">
                                    {{ asset.assetName || '-' }}
                                </div>
                            </div>
                            <div v-else>-</div>
                        </td>

                        <!-- <td class="border border-gray-300 p-2">{{ item.assetsTransfer }}</td> -->
                        <td class="border border-gray-300 p-2">{{ formatDateKhmer(item.createdAt) }}</td>
                        <td class="border border-gray-300 p-2">{{ item.note || '-' }}</td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr class="[&>*]:border [&>*]:p-3 text-gray-500">
                        <td colspan="7" class="font-khmer text-center text-lg">{{$t('No Data!')}}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>


    <!-- Mobile  Layout -->
    <mobileScreen class="block md:hidden" />
</template>

<style scoped>
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
        color: #000000 !important;
    }

    td {
        color: #000000 !important;
    }
}
</style>