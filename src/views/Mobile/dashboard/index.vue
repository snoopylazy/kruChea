<script setup>
import API_CONFIGS from '@/api/config';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const totalAssets = ref(0);
const totalTransactions = ref(0);
const totalTransferStock = ref(0);
const totalCost = ref([]);
const currentCardIndex = ref(0);
const isTransitioning = ref(false);
const isLoading = ref(false);
const branchStore = useBranchStore();

const {
    loadUserPermissions,
    canAccessCategory,
    canAccessAsset,
    canAccessTransaction,
    canAccessTransferStock,
    canAccessPurchase,
    canAccessPurchaseHistory
} = useUserPermission();

const permissions = ref({
    category: false,
    asset: false,
    transaction: false,
    transferStock: false,
    purchase: false,
    purchaseHistory: false
});

const updatePermissions = () => {
    permissions.value = {
        category: canAccessCategory(),
        asset: canAccessAsset(),
        transaction: canAccessTransaction(),
        transferStock: canAccessTransferStock(),
        purchase: canAccessPurchase(),
        purchaseHistory: canAccessPurchaseHistory()
    };
};


const progress = ref(0)
const maxAssets = 1000;

const allNavItems = [
    { to: '/category', icon: 'fa-boxes-stacked', label: 'Category', key: 'category' },
    { to: '/company-assets', icon: 'fa-box-archive', label: 'Assets', key: 'asset' },
    { to: '/operation-assets', icon: 'fa-retweet', label: 'Transaction', key: 'transaction' },
    // { to: '/stock-transfer', icon: 'fa-box-open', label: 'Transfer', key: 'transferStock' },
    { to: '/purchase-assets', icon: 'fa-cart-shopping', label: 'Purchases', key: 'purchase' },
    { to: '/purchase-assets-history', icon: 'fa-clock-rotate-left', label: 'History', key: 'purchaseHistory' }
];

const navItems = computed(() => {
    return allNavItems.filter(item => permissions.value[item.key]);
});

const fetchTotalAssets = async () => {
    try {
        isLoading.value = true;
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, {
            params: {
                dynamicConditions: JSON.stringify([
                    { field: "branchId", operator: "==", value: branchStore.branchId },
                    { field: "status", operator: "==", value: true }
                ])
            }, headers: API_CONFIGS.headers
        });
        totalAssets.value = response.data.data.length || 0;
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
            params: {
                dynamicConditions: JSON.stringify([
                    { field: "branchId", operator: "==", value: branchStore.branchId },
                ])
            },
            headers: API_CONFIGS.headers
        });
        // Group totalPrice by currency
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
        // Convert to array for display
        totalCost.value = Object.values(currencyTotals);
    } catch (error) {
        console.error('Error fetching total asset cost:', error);
    } finally {
        isLoading.value = false;
    }
};

const cards = computed(() => [
    {
        title: 'Total Assets',
        value: totalAssets.value,
        icon: 'fa-boxes-packing',
        progress: Math.round((totalAssets.value / maxAssets) * 100)
    },
    {
        title: 'Transactions',
        value: totalTransactions.value,
        icon: 'fa-retweet',
        progress: Math.round((totalTransactions.value / 100) * 100)
    },
    // {
    //     title: 'Stock Transfers',
    //     value: totalTransferStock.value,
    //     icon: 'fa-truck-fast',
    //     progress: Math.round((totalTransferStock.value / 100) * 100)
    // },
    // {
    //     title: 'Purchase Cost',
    //     value: totalCost.value,
    //     icon: 'fa-money-bill-trend-up',
    //     isCurrency: true,
    //     progress: 100
    // }
]);

const nextCard = () => {
    if (isTransitioning.value) return;
    isTransitioning.value = true;
    currentCardIndex.value = (currentCardIndex.value + 1) % cards.value.length;
    setTimeout(() => isTransitioning.value = false, 300);
};

const prevCard = () => {
    if (isTransitioning.value) return;
    isTransitioning.value = true;
    currentCardIndex.value = currentCardIndex.value === 0
        ? cards.value.length - 1
        : currentCardIndex.value - 1;
    setTimeout(() => isTransitioning.value = false, 300);
};

const touchStartX = ref(0);
const touchEndX = ref(0);

const handleTouchStart = (event) => {
    touchStartX.value = event.touches[0].clientX;
};

const handleTouchEnd = (event) => {
    touchEndX.value = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX.value - touchStartX.value;

    // Minimum distance required for swipe
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) >= minSwipeDistance) {
        if (swipeDistance > 0) {
            // Swipe right
            prevCard();
        } else {
            // Swipe left
            nextCard();
        }
    }
};

onMounted(async () => {
    nextTick();
    await loadUserPermissions(); // <-- Await this!
    updatePermissions();

    await Promise.all([
        fetchTotalAssets(),
        fetchAssetTransaction(),
        // fetchTransferStock(),
        fetchPurchase()
    ]);
});

watch(() => branchStore.branchId, async (newVal, oldVal) => {
    if (newVal !== oldVal) {
        await Promise.all([
            fetchTotalAssets(),
            fetchAssetTransaction(),
            // fetchTransferStock(),
            fetchPurchase()
        ]);
    }
});


</script>

<template>
    <div class="">
        <!-- Card Carousel -->
        <div class="relative">
            <!-- Card -->
            <div class="relative overflow-hidden" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
                <!-- <div v-if="isLoading"
                    class="text-white text-start px-8 py-3 rounded-2xl mb-5 border-4 border-white/50
                    bg-emerald-500/80 backdrop-blur-md bg-gradient-to-br from-emerald-300/60 via-emerald-500/70 to-emerald-600/90">
                    <p class="text-center text-gray-100/70">Loading...</p>
                </div> -->
                <div class="text-white text-start px-8 py-3 rounded-2xl mb-5 border-4 border-white/50
                    bg-emerald-500/80 backdrop-blur-md bg-gradient-to-br from-emerald-300/60 via-emerald-500/70 to-emerald-600/90
                    transition-transform duration-300 ease-in-out"
                    :style="{ transform: isTransitioning ? 'scale(0.98)' : 'scale(1)' }">
                    <div class="flex justify-between items-center">
                        <div class="relative" :class="cards[currentCardIndex].isCurrency ? '' : 'w-24 h-24'">
                            <!-- Only show SVG for non-currency cards -->
                            <svg v-if="!cards[currentCardIndex].isCurrency" class="w-full h-full" viewBox="0 0 36 36">
                                <path class="text-emerald-300" fill="none" stroke="currentColor" stroke-width="3.8"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="text-white transition-all duration-1000 ease-out" fill="none"
                                    stroke="currentColor" stroke-width="3.8" stroke-linecap="round"
                                    :stroke-dasharray="`${cards[currentCardIndex].progress}, 100`"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <!-- Amount for currency card, aligned to top left -->
                            <template v-if="cards[currentCardIndex].isCurrency">
                                <span v-if="totalCost.length === 0"
                                    class="text-2xl font-extrabold text-white drop-shadow-md block mt-2 ml-1">0</span>
                                <template v-else>
                                    <span v-for="(cost, idx) in totalCost" :key="idx"
                                        class="block text-2xl font-extrabold text-white drop-shadow-md mt-2 ml-1">
                                        {{ new Intl.NumberFormat('en-US').format(cost.amount) || 0 }}{{ cost.symbol }}
                                    </span>
                                </template>
                            </template>
                            <!-- Value for non-currency cards, centered -->
                            <div v-else class="absolute inset-0 flex items-center justify-center">
                                <p class="text-xl font-semibold text-white drop-shadow-md">
                                    {{ cards[currentCardIndex].value }}
                                </p>
                            </div>
                        </div>
                        <i :class="`fa-solid ${cards[currentCardIndex].icon} text-4xl drop-shadow-lg`"></i>
                    </div>
                    <h2 class="text-sm mt-2 tracking-wide text-white/90 ml-2">
                        {{ $t(cards[currentCardIndex].title) }}
                    </h2>
                    <hr class="mt-5" />

                    <!-- Dots indicator -->
                    <div class="flex justify-center gap-1 mt-2">
                        <div v-for="(_, index) in cards" :key="index"
                            class="w-1.5 h-1.5 rounded-full transition-all duration-300"
                            :class="index === currentCardIndex ? 'bg-white scale-125' : 'bg-white/50'">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation buttons -->
            <button @click="prevCard"
                class="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 opacity-75 hover:opacity-100 w-4">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button @click="nextCard"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 opacity-75 hover:opacity-100 w-4">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>

        <!-- Items -->
        <div v-if="navItems.length > 0" class="mt-3 grid grid-cols-2 gap-5 px-3 p-3 rounded-xl ">
            <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="flex flex-col items-center justify-center gap-3 rounded-2xl px-8 py-4 shadow-neum
                text-emerald-500 bg-white/30 backdrop-blur-md shadow-md border-2 border-emerald-500
                hover:shadow-xl hover:scale-[1.04] transition-all duration-300 ease-in-out">
                <i :class="`fa-solid ${item.icon} text-2xl`"></i>
                <h1 class="text-xs font-bold text-center text-emerald-600">
                    {{ $t(item.label) }}
                </h1>
            </router-link>
        </div>

    </div>

</template>

<style>
@keyframes borderGlow {
    0% {
        border-color: transparent;
        box-shadow: 0 0 0px rgba(52, 211, 153, 0);
    }

    50% {
        border-color: rgba(52, 211, 153, 0.7);
        box-shadow: 0 0 10px rgba(52, 211, 153, 0.6), 0 0 20px rgba(52, 211, 153, 0.4);
    }

    100% {
        border-color: transparent;
        box-shadow: 0 0 0px rgba(52, 211, 153, 0);
    }
}

.animated-border {
    animation: borderGlow 3s infinite;
    border-radius: 0.75rem;
    /* same as Tailwind's rounded-xl */
}

/* Neumorphism Shadow */
.shadow-neum {
    box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.8);
}
</style>

<style scoped>
/* Add to your existing styles */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.3s ease-in-out;
}

.slide-left-enter-from {
    transform: translateX(100%);
}

.slide-left-leave-to {
    transform: translateX(-100%);
}

.slide-right-enter-from {
    transform: translateX(-100%);
}

.slide-right-leave-to {
    transform: translateX(100%);
}

.relative.overflow-hidden {
    touch-action: pan-y pinch-zoom;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
}
</style>