<script setup>
import API_CONFIGS from '@/api/config';
import { useUserPermission } from '@/composable/userPermission';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import Chart from 'primevue/chart';
import Select from 'primevue/select';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import mobileScreen from '../Mobile/dashboard/index.vue';


// Lucide Vue Next Icons
import {
    ArchiveRestore,
    ArrowRight,
    ChevronDown,
    Package,
    Pin,
    Settings,
    TrendingUp,
    Wallet
} from 'lucide-vue-next';

const branchStore = useBranchStore();
const totalAssets = ref(0);
const isLoading = ref(false);
const greeting = ref('Good Morning !');
const totalTransactions = ref(0);
const totalTransferStock = ref(0);
const totalCost = ref([]);
const outOfStockAssets = ref([]);
const chartTransactionData = ref([]);

const { canAccessDashboard } = useUserPermission();

// Chart related refs
const chartData = ref();
const chartOptions = ref();
const isChartLoading = ref(false);





// Generate available years starting from 2025
const currentYear = new Date().getFullYear();
const availableYears = computed(() => {
    const startYear = 2025;
    const endYear = currentYear + 10;
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
        years.push({ label: String(year), value: year });
    }
    return years;
})

// Set selectedYear to just the year number
const selectedYear = ref(currentYear);







const setGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) greeting.value = 'Good Morning !';
    else if (hour < 18) greeting.value = 'Good Afternoon !';
    else greeting.value = 'Good Evening !';
};







const fetchTotalAssets = async () => {
    try {
        isLoading.value = true;
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
            params: {
                dynamicConditions: JSON.stringify([
                    // { field: "branchId", operator: "==", value: branchStore.branchId },
                    { field: "status", operator: "==", value: true }
                ])
            },
            headers: API_CONFIGS.headers
        });

        const allAssets = response.data.data || [];
        totalAssets.value = allAssets.length;

        outOfStockAssets.value = allAssets.filter(asset => asset.totalStock === 0).map(asset => ({
            ...asset,
            status: 'Out of Stock'
        }));
    } catch (error) {
        console.error('Error fetching total assets:', error);
    } finally {
        isLoading.value = false;
    }
};

const fetchAssetTransaction = async () => {
    try {
        isLoading.value = true;
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAssetTransaction`, {
            params: {
                dynamicConditions: JSON.stringify([
                    { field: "branchId", operator: "==", value: branchStore.branchId },
                    { field: "status.approved.value", operator: "==", value: "approved" },
                    { field: "transactionType", operator: "==", value: "checkout" }
                ])
            },
            headers: API_CONFIGS.headers
        });
        totalTransactions.value = response.data.data.length || 0;
    } catch (error) {
        console.error('Error fetching total transactions:', error);
    } finally {
        isLoading.value = false;
    }
};

// const fetchTransferStock = async () => {
//     try {
//         isLoading.value = true;
//         const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/StockTransfer`, {
//             params: {
//                 dynamicConditions: JSON.stringify([
//                     { field: "fromBranchId", operator: "==", value: branchStore.branchId },
//                 ])
//             },
//             headers: API_CONFIGS.headers
//         });
//         totalTransferStock.value = response.data.data.length || 0;
//     } catch (error) {
//         console.error('Error fetching total transfer stock:', error);
//     } finally {
//         isLoading.value = false;
//     }
// };

const fetchPurchase = async () => {
    try {
        isLoading.value = true;
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, {
            // params: {
            //     dynamicConditions: JSON.stringify([
            //         { field: "branchId", operator: "==", value: branchStore.branchId },
            //     ])
            // },
            headers: API_CONFIGS.headers
        });

        const currencyTotals = {};
        response.data.data.forEach((purchase) => {
            if (Array.isArray(purchase.assets)) {
                purchase.assets.forEach((asset) => {
                    const currencyName = asset.currency?.name || '';
                    const symbol = asset.currency?.symbol?.symbol || asset.currency?.name || '';
                    if (!currencyTotals[currencyName]) {
                        currencyTotals[currencyName] = {
                            amount: 0,
                            symbol: symbol
                        };
                    }
                    currencyTotals[currencyName].amount += asset.totalPrice || 0;
                });
            }
        });

        totalCost.value = Object.values(currencyTotals);
    } catch (error) {
        console.error('Error fetching total asset cost:', error);
    } finally {
        isLoading.value = false;
    }
};


// Fetch chart data based on selected year (now for purchases)

const fetchChartData = async (year) => {
    try {
        isChartLoading.value = true;

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, {
            // params: {
            //     dynamicConditions: JSON.stringify([
            //         { field: "branchId", operator: "==", value: branchStore.branchId }
            //     ])
            // },
            headers: API_CONFIGS.headers
        });

        // Initialize monthly data for each currency
        const monthlyDataByCurrency = {};

        response.data.data.forEach((purchase) => {
            if (Array.isArray(purchase.assets) && purchase.createdAt) {
                const purchaseDate = new Date(purchase.createdAt);
                const purchaseYear = purchaseDate.getFullYear();
                const purchaseMonth = purchaseDate.getMonth(); // 0-11

                // Only include purchases from the selected year
                if (purchaseYear === year) {
                    purchase.assets.forEach((asset) => {
                        const currencyName = asset.currency?.name || '';
                        const symbol = asset.currency?.symbol?.symbol || asset.currency?.name || '';

                        // Initialize currency data if not exists
                        if (!monthlyDataByCurrency[currencyName]) {
                            monthlyDataByCurrency[currencyName] = {
                                data: new Array(12).fill(0),
                                symbol: symbol
                            };
                        }

                        // Add to the correct month
                        monthlyDataByCurrency[currencyName].data[purchaseMonth] += asset.totalPrice || 0;
                    });
                }
            }
        });

        chartTransactionData.value = monthlyDataByCurrency;
        updateChartData();

    } catch (error) {
        console.error('Error fetching chart data:', error);
        // Fallback data with sample currencies
        chartTransactionData.value = {
            'USD': { data: new Array(12).fill(0).map(() => Math.floor(Math.random() * 1000)), symbol: '$' },
            'KHR': { data: new Array(12).fill(0).map(() => Math.floor(Math.random() * 4000000)), symbol: '៛' }
        };
        updateChartData();
    } finally {
        isChartLoading.value = false;
    }
};

// Fixed updateChartData function - creates separate datasets for each currency
const updateChartData = () => {
    const datasets = [];
    const colors = [
        { bg: 'rgba(52, 211, 153, 0.2)', border: '#059669', hover: 'rgba(52, 211, 153, 0.8)' },   // Emerald 600
        { bg: 'rgba(33, 150, 243, 0.2)', border: 'rgba(33, 150, 243, 1)', hover: 'rgba(33, 150, 243, 0.8)' }, // Blue
        { bg: 'rgba(255, 235, 59, 0.2)', border: 'rgba(255, 235, 59, 1)', hover: 'rgba(255, 235, 59, 0.8)' }, // Yellow
        { bg: 'rgba(76, 175, 80, 0.2)', border: 'rgba(76, 175, 80, 1)', hover: 'rgba(76, 175, 80, 0.8)' }    // Green
    ];

    let colorIndex = 0;
    Object.entries(chartTransactionData.value).forEach(([currency, currencyData]) => {
        const color = colors[colorIndex % colors.length];

        datasets.push({
            label: `${currency} (${currencyData.symbol})`,
            data: currencyData.data,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1,
            borderRadius: 2,
            borderSkipped: false,
            barPercentage: 0.9,
            categoryPercentage: 1,
            pointBackgroundColor: color.hover,
            pointBorderColor: 'rgba(255, 255, 255, 1)',
            pointBorderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: color.hover,
            pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
            pointHoverBorderWidth: 2,
        });

        colorIndex++;
    });

    chartData.value = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: datasets
    };
};

// Fixed setChartOptions function - improved responsiveness and tooltip
const setChartOptions = () => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        layout: {
            padding: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'rectRounded',
                    boxWidth: 10,
                    boxHeight: 10,
                    padding: 16,
                    color: '#6B7280',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255,255,255,0.95)',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#E5E7EB',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 12,
                displayColors: true,
                titleFont: {
                    size: 14,
                    weight: '600'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    title: function (context) {
                        return context[0].label + ' ' + selectedYear.value;
                    },
                    label: function (context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        const symbol = label.match(/\((.+)\)$/)?.[1] || '';
                        const cleanLabel = label.replace(/\s?\(.+\)$/, '');
                        return `${cleanLabel}: ${new Intl.NumberFormat('en-US').format(value)}${symbol}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                border: {
                    display: false
                },
                ticks: {
                    color: '#9CA3AF',
                    font: {
                        size: 12,
                        weight: '400'
                    },
                    padding: 10
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(229,231,235,0.6)',
                    drawBorder: false,
                    lineWidth: 1
                },
                border: {
                    display: false
                },
                ticks: {
                    color: '#9CA3AF',
                    font: {
                        size: 11,
                        weight: '400'
                    },
                    padding: 8,
                    // callback: function (value) {
                    //     return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
                    // }

                    display: false,
                }
            }
        },
        elements: {
            bar: {
                borderRadius: 6,
                borderSkipped: false
            },
            line: {
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            }
        }
    };
};




watch(selectedYear, async (newYear) => {
    await fetchChartData(newYear);
    chartOptions.value = setChartOptions();
});


watch(() => branchStore.branchId, async (newVal, oldVal) => {
    if (newVal !== oldVal) {
        await Promise.all([
            fetchTotalAssets(),
            fetchAssetTransaction(),
            // fetchTransferStock(),
            fetchPurchase(),
            fetchChartData(selectedYear.value) // Changed from selectedYear.value.value
        ]);
    }
});
const handleSocketUpdate = () => {

    fetchTotalAssets(),
        fetchAssetTransaction(),
        // fetchTransferStock(),
        fetchPurchase(),
        fetchChartData(selectedYear.value) // Changed from selectedYear.value.value

};

const setupSocketListeners = () => {
    socket.off('dataUpdate');
    socket.on('dataUpdate', async (data) => {
        if (['CompanyAsset', 'CompanyAssetTransaction', 'StockTransfer', 'PurchaseAsset'].includes(data.collection)) {
            await handleSocketUpdate();
        }
    });
};

onMounted(() => {
    setGreeting();
    fetchTotalAssets();
    fetchAssetTransaction();
    // fetchTransferStock();
    fetchPurchase();
    fetchChartData(selectedYear.value)

    chartOptions.value = setChartOptions();
    setupSocketListeners();
});

onBeforeUnmount(() => {
    socket.off('dataUpdate');
});
</script>

<template>
    <!-- Desktop Layout -->
    <div class="mx-auto p-4 hidden md:block min-h-screen bg-gradient-to-br from-gray-100 to-white">
        <!-- Header Section -->
        <div class="text-start mb-2">
            <h1 class="text-3xl font-semibold text-gray-900 tracking-tight w-full">{{ $t(greeting) }}</h1>
        </div>

        <!-- Cards Section -->
        <div class="flex flex-wrap gap-6 mb-6 justify-start">
            <!-- Total Assets Card -->
            <div
                class="min-w-[250px] flex-1 max-w-xs bg-white/70 backdrop-blur-md shadow-lg rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-sm font-medium text-gray-600 mb-1">{{ $t('Total Assets') }}</div>
                        <p class="text-4xl font-bold text-gray-900 tracking-tight px-1 text-left">{{ totalAssets }}</p>
                    </div>
                    <div class="bg-emerald-100 p-3 rounded-full">
                        <Package class="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
                <div class="h-1 w-16 mt-4 rounded-full bg-emerald-400"></div>
            </div>

            <!-- Asset Transaction Card -->
            <div
                class="min-w-[250px] flex-1 max-w-xs bg-white/70 backdrop-blur-md shadow-lg rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-sm font-medium text-gray-600 mb-1">{{ $t('Asset Transaction') }}</div>
                        <p class="text-4xl font-bold text-gray-900 tracking-tight px-1 text-left">{{ totalTransactions
                        }}</p>
                    </div>
                    <div class="bg-indigo-100 p-3 rounded-full">
                        <Settings class="w-6 h-6 text-indigo-500" />
                    </div>
                </div>
                <div class="h-1 w-16 mt-4 rounded-full bg-indigo-400"></div>
            </div>

            <!-- Stock Transfer Card -->
            <!-- <div
                class="min-w-[250px] flex-1 max-w-xs bg-white/70 backdrop-blur-md shadow-lg rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-sm font-medium text-gray-600 mb-1">{{ $t('Stock Transfer') }}</div>
                        <p class="text-4xl font-bold text-gray-900 tracking-tight px-1 text-left">{{ totalTransferStock
                        }}</p>
                    </div>
                    <div class="bg-orange-100 p-3 rounded-full">
                        <ArchiveRestore class="w-6 h-6 text-orange-500" />
                    </div>
                </div>
                <div class="h-1 w-16 mt-4 rounded-full bg-orange-400"></div>
            </div> -->

            <!-- Total Asset Cost Card -->
            <div
                class="min-w-[250px] flex-1 max-w-xs bg-white/70 backdrop-blur-md shadow-lg rounded-3xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-sm font-medium text-gray-600 mb-1">{{ $t('Total Asset Cost') }}</div>
                        <span v-if="totalCost.length === 0" class="text-4xl font-bold text-gray-900">0</span>
                        <template v-else>
                            <span v-for="(cost, idx) in totalCost" :key="idx"
                                class="block text-xl font-extrabold text-gray-900 leading-tight">
                                {{ new Intl.NumberFormat('en-US').format(cost.amount) || 0 }}{{ cost.symbol }}
                            </span>
                        </template>
                    </div>
                    <div class="bg-rose-100 p-3 rounded-full">
                        <Wallet class="w-6 h-6 text-rose-500" />
                    </div>
                </div>
                <div class="h-1 w-16 mt-4 rounded-full bg-rose-400"></div>
            </div>
        </div>

        <!-- Enhanced Chart Section -->
        <div class="bg-white/80 backdrop-blur-md shadow-lg rounded-lg p-3 my-6 w-[98%] ">
            <!-- Chart Header -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div class="flex items-center gap-3 mb-4 sm:mb-0">
                    <div class="bg-indigo-100 p-2.5 rounded-xl">
                        <TrendingUp class="w-5 h-5 text-blue-600" />
                    </div>
                    <div class="text-start">
                        <h3 class="text-md text-gray-900">{{ $t('Purchase Asset Overview') }}</h3>
                        <p class="text-sm text-gray-500 mt-1">{{ $t('Overall asset purchase cost in') }} {{ selectedYear
                            }}
                        </p>

                    </div>
                </div>

                <!-- Year Selector -->
                <div class="relative">
                    <Select v-model="selectedYear" :options="availableYears" optionLabel="label" optionValue="value"
                        size="small" placeholder="$t('Choose Year')" class="" :showClear="false"
                        panelClass="year-dropdown-panel">
                        <template #value="slotProps">
                            <div class="flex items-center gap-3 ">
                                <div><i class="fa-solid fa-calendar"></i></div>
                                <span class="text-base font-semibold text-gray-800">
                                    {{ slotProps.value || selectedYear }}
                                </span>
                            </div>
                        </template>

                        <template #option="slotProps">
                            <div
                                class="flex items-center gap-3 py-1 px-1 hover:bg-green-50 rounded-lg transition-colors duration-200">
                                <span class="text-base font-medium text-gray-700">
                                    {{ slotProps.option.label }}
                                </span>
                            </div>
                        </template>

                        <template #dropdownicon>
                            <ChevronDown class="w-5 h-5 text-gray-600 transition-transform duration-200" />
                        </template>
                    </Select>
                </div>
            </div>

            <!-- Chart Container -->
            <div class="relative w-full">
                <!-- Loading Overlay -->
                <!-- <div v-if="isChartLoading"
                    class="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <div class="flex items-center gap-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent">
                        </div>
                        <span class="text-sm text-gray-600">Loading chart...</span>
                    </div>
                </div> -->

                <div class="w-full h-80 sm:h-96 lg:h-80 xl:h-96">
                    <Chart type="bar" :data="chartData" :options="chartOptions" class="w-full h-full"
                        :style="{ minHeight: '300px', fontFamily: 'Arial, sans-serif' }" />
                </div>
            </div>


        </div>

        <!-- Asset Section -->
        <div class="bg-white/80 backdrop-blur-md shadow-md p-6 rounded-lg border border-gray-200">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <Pin class="w-5 h-5 text-rose-500" />
                    <h2 class="text-lg font-semibold text-gray-800">{{ $t('Out of Stock Assets') }}</h2>
                </div>
                <router-link to="/company-assets"
                    class="px-4 py-2 rounded-xl bg-white/70 hover:bg-white/90 text-sm font-medium text-gray-700 shadow border border-gray-300 transition flex items-center">
                    {{ $t('View All Assets') }}
                    <ArrowRight class="w-4 h-4 ml-2" />
                </router-link>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm rounded-xl overflow-hidden">
                    <thead class="bg-gray-100/70 text-gray-600 uppercase text-xs tracking-widest">
                        <tr class="text-center">
                            <th class="px-6 py-3">{{ $t('ID') }}</th>
                            <th class="px-6 py-3">{{ $t('Asset Name') }}</th>
                            <th class="px-6 py-3">{{ $t('Category') }}</th>
                            <th class="px-6 py-3">{{ $t('Quantity') }}</th>
                            <th class="px-6 py-3">{{ $t('Status') }}</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <template v-if="isLoading">
                            <tr v-for="i in 3" :key="i">
                                <td colspan="5" class="px-6 py-4">
                                    <div class="animate-pulse h-3 bg-gray-300/40 rounded-full w-full"></div>
                                </td>
                            </tr>
                        </template>
                        <template v-else-if="outOfStockAssets.length">
                            <tr v-for="(asset, index) in outOfStockAssets" :key="asset.id"
                                class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ index + 1 }}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{{ asset.name }}
                                </td>
                                <td class="px-6 py-4 text-center text-gray-500">{{ asset.category?.categoryName ||
                                    'N/A' }}</td>
                                <td class="px-6 py-4 text-center text-gray-500">{{ asset.totalStock }}</td>
                                <td class="px-6 py-4 text-center">
                                    <span
                                        class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        {{$t('Out of Stock')}}
                                    </span>
                                </td>
                            </tr>
                        </template>
                        <template v-else>
                            <tr>
                                <td colspan="5" class="px-6 py-6 text-center text-sm text-gray-500">
                                    <div class="flex flex-col items-center justify-center space-y-2">
                                        <i class="fas fa-box-open text-2xl text-gray-400"></i>
                                        <span>{{$t('No out of stock assets found')}}</span>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Mobile Layout -->
    <mobileScreen class="block md:hidden" />
</template>

<style scoped></style>
