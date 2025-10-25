<script setup>
import API_CONFIGS from '@/api/config';
import axios from "axios";
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const purchaseId = route.params.id;

const purchaseAsset = ref(null);
const isLoading = ref(false);
const branchData = ref([]);

const fetchPurchaseAsset = async () => {
    try {
        isLoading.value = true;

        const params = {
            dynamicConditions: JSON.stringify([
                { field: '_id', operator: '==', value: purchaseId }
            ])
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/PurchaseAsset`, { params, headers: API_CONFIGS.headers });
        const data = response.data.data || [];

        purchaseAsset.value = data.length > 0 ? data[0] : null;

    } catch (error) {
        console.error('Error fetching purchase asset:', error);
        purchaseAsset.value = null;
    } finally {
        isLoading.value = false;
    }
};


const getBranchName = (branchId) => {
    const branch = branchData.value.find(b => b._id === branchId);
    return branch ? branch.name : '';
};

const fetchBranch = async () => {
    try {
        const params = {
            dynamicCondition: JSON.stringify([
                { field: 'status', operator: '==', value: true },
            ]),
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
        branchData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching branches:', error);
    }
}

const formatDate = (dateString) => {
    if (!dateString) return '-';

    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    return new Date(dateString).toLocaleDateString('en-US', options);
};

onMounted(() => {
    fetchPurchaseAsset();
    fetchBranch();
});
</script>

<template>
    <div class="">
        <router-link to="/purchase-assets"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{$t('Back')}}</span>
        </router-link>


        <div class="bg-white w-full max-w-2xl rounded-md shadow-xl p-8">
            <!-- Loading state -->
            <div v-if="isLoading" class="py-12 text-center">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
                <p class="mt-4 text-gray-600">{{$t('Loading purchase details...')}}</p>
            </div>

            <!-- Error state -->
            <div v-else-if="!purchaseAsset" class="py-12 text-center text-red-600">
                {{$t('Purchase details not found or failed to load.')}}
            </div>

            <!-- Invoice Layout -->
            <div v-else class="text-gray-800">
                <!-- Header -->
                <div class="flex justify-between items-start mb-8">
                    <div class="flex items-center">
                        <div class="bg-emerald-500 rounded-full h-10 w-10 flex items-center justify-center mr-3">
                            <i class="fa-solid fa-shopping-cart text-white"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold">{{$t('Invoice')}}</h1>
                            <p class="text-sm text-gray-500">{{$t('Purchase Asset')}}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500">{{$t('Branch')}}: {{ getBranchName(purchaseAsset.branchId || '-') }}</p>
                        <p class="text-xs text-gray-500">{{$t('Date')}}: {{ formatDate(purchaseAsset.createdAt) }}</p>
                    </div>
                </div>

                <!-- Order Details Section -->
                <div class="mb-6">
                    <h2 class="text-gray-500 text-sm mb-2 pb-1 border-b border-gray-200">{{$t('Details')}}</h2>
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-500">
                                <th class="py-2">{{$t('Item')}}</th>
                                <th class="py-2 text-center">{{$t('Note')}}</th>
                                <th class="py-2 text-center">{{$t('Quantity')}}</th>
                                <th class="py-2 text-right">{{$t('Price')}}</th>
                                <th class="py-2 text-right">{{$t('Amount')}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(asset, index) in purchaseAsset.assets" :key="index"
                                class="border-b border-gray-100">
                                <td class="py-2">
                                    <div class="font-medium text-left">{{ asset.assetName }}</div>
                                </td>
                                <td class="py-2 text-center">{{ asset.note || '-' }}</td>
                                <td class="py-2 text-center">{{ asset.qty }}</td>
                                <td class="py-2 text-right">
                                    {{ new Intl.NumberFormat('en-US').format(asset.price) }} {{
                                        asset.currency?.symbol?.symbol || '' }}
                                </td>
                                <td class="py-2 text-right font-medium">
                                    {{ new Intl.NumberFormat('en-US').format(asset.totalPrice) }} {{
                                        asset.currency?.symbol?.symbol || '' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div class="mb-8">
                    <div class="w-full flex flex-col items-end">
                        <div v-for="(total, currencyId) in purchaseAsset.assets.reduce((acc, asset) => {
                            const currencyId = asset.currency?._id;
                            if (!currencyId) return acc;
                            if (!acc[currencyId]) {
                                acc[currencyId] = {
                                    total: 0,
                                    symbol: asset.currency?.symbol?.symbol || '',
                                    name: asset.currency?.name || '',
                                    typeOfRounding: asset.currency?.typeOfRounding,
                                    numberOfDecimalPlaces: asset.currency?.numberOfDecimalPlaces
                                };
                            }
                            acc[currencyId].total += asset.totalPrice;
                            return acc;
                        }, {})" :key="currencyId" class="w-full sm:w-1/2 flex justify-between py-1">
                            <span class="text-gray-600">{{$t('Total')}} ({{ total.name }}):</span>
                            <span class="font-bold text-emerald-600">
                                {{ new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: total.typeOfRounding === 'decimal' ? (total.numberOfDecimalPlaces
                                        || 2) : 0,
                                    maximumFractionDigits: total.typeOfRounding === 'decimal' ? (total.numberOfDecimalPlaces
                                        || 2) : 0
                                }).format(total.total) }} {{ total.symbol }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
                    <p>{{$t('Total Quantity')}}: {{purchaseAsset.assets.reduce((sum, asset) => sum + asset.qty, 0)}} items</p>
                </div>

                <!-- Back Button -->
                <div class="mt-6 text-center">
                    <RouterLink to="/purchase-assets"
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">
                        {{$t('Back')}}
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>