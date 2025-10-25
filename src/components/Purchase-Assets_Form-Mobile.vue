<script setup>
import API_CONFIGS from '@/api/config';
import { fetchTimestamp } from "@/composable/timestamp";
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import Select from 'primevue/select';
import { computed, onMounted, ref } from "vue";
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const router = useRouter();
const branchStore = useBranchStore();
const selectedAsset = ref(null);
const selectedCurrency = ref(null);
const purchaseCurrency = ref(null);
const assetData = ref([]);
const accountData = ref([]);
const currencyData = ref([]);
const quantity = ref('');
const price = ref('');
const note = ref("");
const cartItems = ref([]);
const successMessage = ref('');
const showSuccessMessage = ref(false);

const errorMessage = ref('');
const showErrorMessage = ref(false);



const totalAmount = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.totalPrice, 0);
});



const fetchAsset = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true },
            ])
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
        assetData.value = response.data.data || [];
    } catch (error) {
        console.log("Can not get asset data", error);
    }
}

const fetchCurrency = async () => {
    try {
        const params = {
            dynamicConditions: JSON.stringify([
                { field: 'status', operator: '==', value: true },
                { field: 'name', operator: '!=', value: "THB" }
            ])
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Currency`, { params, headers: API_CONFIGS.headers });
        currencyData.value = response.data.data || [];
    } catch (error) {
        console.log("Can not get currency data", error);
    }
};

// const fetchAccount = async () => {
//     try {
//         const params = {
//             dynamicConditions: JSON.stringify([
//                 { field: 'status', operator: '==', value: true },
//                 { field: 'name', operator: '==', value: "ចំណាយផ្សេងៗ" },
//                 { field: 'code', operator: '==', value: "505" },

//             ])
//         }
//         const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Account`, { params, headers: API_CONFIGS.headers });
//         accountData.value = response.data.data || [];

//     } catch (error) {
//         console.log("Can not get account data", error);
//     }
// }

const showMessage = (type, message, duration = 3000) => {
    if (type === 'success') {
        successMessage.value = message;
        showSuccessMessage.value = true;
        setTimeout(() => showSuccessMessage.value = false, duration);
    } else if (type === 'error') {
        errorMessage.value = message;
        showErrorMessage.value = true;
        setTimeout(() => showErrorMessage.value = false, duration);
    }
};


const addToCart = () => {
    if (!selectedAsset.value || !selectedCurrency.value || quantity.value <= 0 || price.value <= 0) {
        showMessage('error', 'Please fill in all required fields correctly.');
        return;
    }

    const totalPrice = quantity.value * price.value;

    // Check if asset already exists in cart WITH THE SAME CURRENCY
    const existingItemIndex = cartItems.value.findIndex(item =>
        item.assetId === selectedAsset.value._id &&
        item.currency._id === selectedCurrency.value._id
    );

    if (existingItemIndex !== -1) {
        // Asset with same currency already exists in cart, update quantity and total price
        const existingItem = cartItems.value[existingItemIndex];
        const newQty = parseInt(existingItem.qty) + parseInt(quantity.value);
        const newTotalPrice = newQty * price.value;

        // Update the existing item
        cartItems.value[existingItemIndex] = {
            ...existingItem,
            qty: newQty,
            price: price.value, // Update to the latest price
            totalPrice: newTotalPrice,
            note: note.value || existingItem.note // Use new note if provided, otherwise keep existing
        };
    } else {
        // Asset doesn't exist in cart with this currency, add as new item
        const cartItem = {
            id: Date.now().toString(),
            assetId: selectedAsset.value._id,
            assetName: selectedAsset.value.name,
            price: price.value,
            qty: parseInt(quantity.value),
            note: note.value,
            currency: selectedCurrency.value,
            totalPrice: totalPrice
        };

        cartItems.value.push(cartItem);
    }

    // Reset form fields
    selectedAsset.value = null;
    quantity.value = '';
    price.value = '';
    note.value = "";
    selectedCurrency.value = null;
};

const removeFromCart = (itemId) => {
    cartItems.value = cartItems.value.filter(item => item.id !== itemId);

    if (cartItems.value.length === 0) {
        purchaseCurrency.value = null;
    }
};

const submitPurchase = async () => {
    try {
        if (cartItems.value.length === 0) {
            showMessage('error', t('Please add at least one item to the cart.'));
            return;
        }

        const timestamp = await fetchTimestamp();

        const assetsArray = cartItems.value.map(item => ({
            assetId: item.assetId,
            assetName: item.assetName,
            price: item.price,
            qty: item.qty,
            note: item.note,
            currency: item.currency,
            totalPrice: item.totalPrice
        }));

        const assetIds = cartItems.value.map(item => item.assetId);

        const currencySummary = cartItems.value.reduce((acc, item) => {
            const currencyId = item.currency._id;
            if (!acc[currencyId]) {
                acc[currencyId] = {
                    currency: item.currency,
                    totalAmount: 0
                };
            }
            acc[currencyId].totalAmount += item.totalPrice;
            return acc;
        }, {});

        const purchaseBody = {
            fields: {
                assets: assetsArray,
                assetIds: assetIds,
                currency: Object.values(currencySummary).length === 1 ?
                    Object.values(currencySummary)[0].currency : null,
                branchId: branchStore.getBranchId,
                createdAt: timestamp,
                createdBy: branchStore.getUserId
            }
        };

        const purchaseResponse = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/PurchaseAsset`, purchaseBody, { headers: API_CONFIGS.headers });
        const purchaseId = purchaseResponse.data.data._id;

        // Create history records for each purchased asset
        const historyPromises = cartItems.value.map(async (item) => {
            // Get asset details for history record
            const params = {
                dynamicConditions: JSON.stringify([
                    { field: '_id', operator: '==', value: item.assetId }
                ])
            };

            const assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
            const assets = assetResponse.data.data || [];

            if (!assets.length) {
                throw new Error(`Asset not found: ${item.assetId}`);
            }

            const asset = assets[0];

            // Create history record - following the schema design from the diagram
            const historyBody = {
                fields: {
                    asset: {
                        assetId: asset._id,
                        assetName: asset.name,
                        price: item.price,
                        qty: item.qty,
                        note: item.note || '',
                        currency: item.currency,
                        totalPrice: item.totalPrice
                    },
                    purchaseAssetId: purchaseId,
                    branchId: branchStore.getBranchId,
                    stockTransferId: null,
                    cuttingStocks: [], // Empty array initially
                    createdBy: branchStore.getUserId,
                    createdAt: timestamp,
                    status: false, // Default false, true = out of stock
                    isPurchase: true,
                    isTransfer: false
                }
            };

            return axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/PurchaseAssetHistory`, historyBody, { headers: API_CONFIGS.headers });
        });

        const assetUpdatePromises = cartItems.value.map(async (item) => {
            try {
                const params = {
                    dynamicConditions: JSON.stringify([
                        { field: '_id', operator: '==', value: item.assetId }
                    ])
                };

                const assetResponse = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`, { params, headers: API_CONFIGS.headers });
                const assets = assetResponse.data.data || [];

                if (!assets.length) {
                    throw new Error(`Asset not found: ${item.assetId}`);
                }

                const asset = assets[0];

                const currentStock = asset.totalStock || 0;
                const newStock = currentStock + parseInt(item.qty);

                const updateBody = {
                    fields: {
                        totalStock: newStock,
                        purchasePrice: item.price,
                        updatedAt: timestamp,
                        updatedBy: branchStore.getUserId
                    }
                };

                return axios.patch(`${API_CONFIGS.BASE_URL}/loan/api/updateDocTwo/CompanyAsset/${item.assetId}`, updateBody, { headers: API_CONFIGS.headers });
            } catch (err) {
                console.error(`Failed to update asset ${item.assetId}:`, err);
                throw err;
            }
        });

        // const cashJournalPromises = Object.values(currencySummary).map(async (currencyData) => {
        //     if (accountData.value.length === 0) {
        //         throw new Error("Expense account not found");
        //     }

        //     const expenseAccount = accountData.value[0];

        //     const journalBody = {
        //         fields: {
        //             branchId: branchStore.getBranchId,
        //             accountId: expenseAccount._id,
        //             currency: currencyData.currency,
        //             amount: -currencyData.totalAmount,
        //             ref: purchaseId,
        //             description: `Purchase assets - ${assetsArray.map(a => a.assetName).join(', ')}`,
        //             transactionDate: timestamp,
        //             createdBy: branchStore.getUserId,
        //             createdAt: timestamp
        //         }
        //     };

        //     return axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/CashJournalTemp`, journalBody, { headers: API_CONFIGS.headers });
        // });

        // Wait for all promises to resolve
        // await Promise.all([...assetUpdatePromises, ...cashJournalPromises, ...historyPromises]);

        await Promise.all([...assetUpdatePromises, ...historyPromises]);
        showMessage('success', t('Purchase completed successfully!'));

        cartItems.value = [];
        clearForm();
        setTimeout(() => {
            router.push('/purchase-assets');
        }, 800);

    } catch (error) {
        console.error("Error creating purchase asset or updating inventory:", error);
        showMessage('error', t('Failed to complete purchase. Please try again.'));
    }
};



const clearForm = () => {
    selectedAsset.value = null;
    quantity.value = 1;
    price.value = 0;
    note.value = "";
    if (cartItems.value.length === 0) {
        selectedCurrency.value = null;
    }
};


onMounted(() => {
    fetchAsset();
    fetchCurrency();
    // fetchAccount();
});

</script>

<template>
    <div>
        <transition name="fade">
            <div v-if="showSuccessMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-green-600 rounded shadow-lg"
                role="alert">
                {{ successMessage }}
            </div>
        </transition>

        <transition name="fade">
            <div v-if="showErrorMessage"
                class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 py-3 text-sm text-white bg-red-600 rounded shadow-lg"
                role="alert">
                {{ errorMessage }}
            </div>
        </transition>


        <!-- Back Button -->
        <router-link to="/purchase-assets"
            class="flex items-center space-x-2 text-emerald-500 hover:text-emerald-600 font-medium p-2">
            <i class="fa-solid fa-arrow-left"></i>
            <span>{{ $t('Purchase Asset') }}</span>
        </router-link>

        <div
            class="mt-3 space-y-6 px-4 py-6 text-start bg-white rounded-2xl shadow-lg border border-gray-200 sm:max-w-xl mx-auto">
            <!-- Form Section -->
            <form @submit.prevent="addToCart" class="w-full lg:w-1/2 space-y-4">
                <!-- Row 1: Asset & Currency -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('Asset Name') }} <span
                                class="text-red-500">*</span></label>
                        <Select v-model="selectedAsset" :options="assetData" optionLabel="name"
                            placeholder="Select asset" class="w-full" filter />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('Currency') }} <span
                                class="text-red-500">*</span></label>
                        <Select v-model="selectedCurrency" :options="currencyData" optionLabel="name"
                            placeholder="Select currency" class="w-full" />
                    </div>
                </div>

                <!-- Row 2: Quantity & Price -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('Quantity') }} <span
                                class="text-red-500">*</span></label>
                        <input v-model="quantity" type="number" min="1" placeholder="0"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 outline-none transition hover:border-emerald-300" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('Price') }} <span
                                class="text-red-500">*</span></label>
                        <input v-model="price" type="number" min="0" step="0.01" placeholder="0"
                            class="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 outline-none transition hover:border-emerald-300" />
                    </div>
                </div>

                <!-- Row 3: Note (Full width) -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('Note') }}</label>
                    <textarea v-model="note" :placeholder="$t('Description...')"
                        class="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 outline-none transition hover:border-emerald-300"></textarea>
                </div>


                <!-- Buttons -->
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" @click="clearForm"
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition">
                        {{ $t('Clear') }}
                    </button>
                    <button type="submit"
                        class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm transition">
                        {{ $t('Add to Cart') }}
                    </button>
                </div>
            </form>


            <!-- Cart Table Section -->
            <div class="w-full space-y-4">
                <div v-for="(item, index) in cartItems" :key="item.id"
                    class="bg-white rounded-2xl shadow p-4 border-l-4 border-emerald-600">
                    <!-- Top Header -->
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-500">No.{{ index + 1 }}</span>
                        <i @click="removeFromCart(item.id)"
                            class="fa-solid fa-trash text-red-500 hover:text-red-700 cursor-pointer text-md"></i>
                    </div>

                    <!-- One-line Data Format -->
                    <div class="text-sm text-gray-800 space-y-1">
                        <div>
                            <span class="text-gray-500 mr-2">{{ $t('Name') }}:</span>
                            <span class="font-medium text-gray-800">
                                {{ item.assetName }}</span>
                        </div>

                        <div>
                            <span class="text-gray-500 mr-2">{{ $t('Quantity') }}:</span>
                            <span class="font-semibold">
                                {{ item.qty }}</span>
                        </div>

                        <div>
                            <span class="text-gray-500 mr-2">{{ $t('Price') }}:</span>
                            <span>
                                {{ new Intl.NumberFormat('en-US').format(item.price) }} {{ item.currency.symbol.symbol
                                }}
                            </span>
                        </div>

                        <div>
                            <span class="text-gray-500 mr-2">{{ $t('Total') }}:</span>
                            <span class="text-emerald-600 font-semibold">
                                {{ new Intl.NumberFormat('en-US').format(item.totalPrice) }} {{
                                    item.currency.symbol.symbol }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Empty cart state -->
                <div v-if="cartItems.length === 0" class="text-center text-gray-500 mt-6">
                    {{ $t('No data!') }}
                </div>
            </div>


            <!-- Purchase Button -->
            <div class="flex justify-end mt-3">
                <button @click="submitPurchase"
                    class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm">
                    {{ $t('Purchase') }}
                    <i class="fa-solid fa-cart-shopping ml-2"></i>
                </button>
            </div>
        </div>

    </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
    opacity: 1;
}
</style>