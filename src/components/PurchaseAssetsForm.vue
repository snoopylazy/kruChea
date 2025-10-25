<script setup>
import API_CONFIGS from '@/api/config';
import { fetchTimestamp } from "@/composable/timestamp";
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from "axios";
import Select from 'primevue/select';
import { computed, onMounted, ref } from "vue";
import ErrorMessage from '../components/ErrorMessage.vue';
import SuccessMessage from '../components/SuccessMessage.vue';
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const emit = defineEmits(['close']);

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

const addToCart = () => {
    if (!selectedAsset.value || !selectedCurrency.value || quantity.value <= 0 || price.value <= 0) {
        errorMessage.value = t("Please fill in all required fields correctly.");
        showErrorMessage.value = true;
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 3000);
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
            errorMessage.value = t("Please add at least one item to the cart.");
            showErrorMessage.value = true;
            setTimeout(() => {
                showErrorMessage.value = false;
            }, 3000);
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

        const response = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/insertDocTwo/PurchaseAsset`, purchaseBody, { headers: API_CONFIGS.headers });
        const purchaseId = response.data.data._id;

        // Emit socket event for real-time insert
        // socket.emit('dataUpdate', { collection: 'PurchaseAsset', action: 'insert', data: response.data.data?._id });

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

        cartItems.value = [];

        successMessage.value = t("Purchase completed successfully!");
        showSuccessMessage.value = true;

        setTimeout(() => {
            showSuccessMessage.value = false;
            clearForm();
            emit('close');
        }, 500); // Auto-hide after 3s

    } catch (error) {
        console.error("Error creating purchase asset or updating inventory:", error);
        errorMessage.value = t("Failed to complete purchase. Please try again.");
        showErrorMessage.value = true;
        setTimeout(() => {
            showErrorMessage.value = false;
        }, 5000);
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
    <div
        class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-2 z-50 font-khmer overflow-y-auto">
        <div class="bg-white p-6 rounded-md shadow-lg w-[90%] max-w-5xl">
            <div class="flex justify-between items-center pb-2 mb-4 border-b-2">
                <p class="text-lg font-semibold">{{$t('Create Purchase Asset Form')}}</p>
                <i class="fa-solid fa-circle-xmark cursor-pointer hover:text-red-500 text-red-700 text-end text-lg top-3 right-3"
                    @click="emit('close')"></i>
            </div>

            <div class="flex flex-col lg:flex-row gap-4">
                <!-- Form -->
                <form @submit.prevent="addToCart" class="lg:border-r-2 pr-0 lg:pr-4 w-full lg:w-1/2 space-y-4">
                    <!-- Asset Selection -->
                    <div class="flex gap-4">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 mb-1 text-start">
                                {{$t('Asset Name')}} <span class="text-red-500">*</span>
                            </label>
                            <Select v-model="selectedAsset" :options="assetData" optionLabel="name"
                                :placeholder="$t('Select asset')" class="w-full" filter />
                        </div>

                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 mb-1 text-start">
                                {{$t('Currency')}} <span class="text-red-500">*</span>
                            </label>
                            <Select v-model="selectedCurrency" :options="currencyData" optionLabel="name"
                                :placeholder="$t('Select currency')" class="w-full" />
                        </div>
                    </div>

                    <!-- Quantity & Price -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 text-start">{{$t('Quantity')}} <span
                                    class="text-red-500">*</span></label>
                            <input v-model="quantity" type="number"
                                class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                                 transition-all outline-none duration-300 ease-in-out hover:border-emerald-300 text-left" placeholder="0" min="1" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 text-start">{{$t('Price')}} <span
                                    class="text-red-500">*</span></label>
                            <input v-model="price" type="number"
                                class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                                 transition-all outline-none duration-300 ease-in-out hover:border-emerald-300 text-left" placeholder="0" min="0"
                                step="0.01" />
                        </div>
                    </div>


                    <!-- note -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1 text-start">{{$t('Item Note')}}</label>
                        <textarea v-model="note" class="border mt-1 border-gray-300 p-2 rounded-md w-full focus:ring focus:ring-emerald-500 focus:border-emerald-500 
                                transition-all outline-none duration-300 ease-in-out hover:border-emerald-300"
                            :placeholder="$t('Item note...')"></textarea>
                    </div>

                    <!-- Buttons -->
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" @click="clearForm"
                            class="bg-gradient-to-br from-red-400 to-red-600 text-white px-4 py-2 rounded-md hover:from-red-400 hover:to-red-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                            {{$t('Clear')}}
                        </button>
                        <button type="submit"
                            class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-emerald-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                            {{$t('Add to Cart')}}
                        </button>
                    </div>
                </form>

                <!-- Table -->
                <div class="w-full lg:w-1/2 overflow-x-auto">
                    <table class="min-w-full table-auto border border-gray-300 text-sm bg-white rounded-md">
                        <thead class="bg-gray-100 text-gray-700 text-xs">
                            <tr>
                                <th class="border border-gray-300 p-2">{{$t('ID')}}</th>
                                <th class="border border-gray-300 p-2">{{$t('Name')}}</th>
                                <th class="border border-gray-300 p-2">{{$t('Quantity')}}</th>
                                <th class="border border-gray-300 p-2">{{$t('Price')}}</th>
                                <th class="border border-gray-300 p-2">{{$t('Total')}}</th>
                                <th class="border border-gray-300 p-2 text-center">{{$t('Actions')}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in cartItems" :key="item.id" class="hover:bg-gray-50 transition">
                                <td class="border border-gray-300 p-2">{{ index + 1 }}</td>
                                <td class="border border-gray-300 p-2">{{ item.assetName }}</td>
                                <td class="border border-gray-300 p-2 text-center">{{ item.qty }}</td>
                                <td class="border border-gray-300 p-2 text-right">
                                    {{ new Intl.NumberFormat('en-US').format(item.price) }} {{
                                        item.currency.symbol.symbol }}
                                </td>
                                <td class="border border-gray-300 p-2 text-right">
                                    {{ new Intl.NumberFormat('en-US').format(item.totalPrice) }} {{
                                        item.currency.symbol.symbol }}
                                </td>
                                <td class="border border-gray-300 p-2 text-center">
                                    <i @click="removeFromCart(item.id)"
                                        class="fa-solid fa-trash text-red-600 hover:text-red-700 cursor-pointer"></i>
                                </td>
                            </tr>
                            <tr v-if="cartItems.length === 0">
                                <td colspan="6" class="border border-gray-300 p-3 text-center text-gray-500">
                                    {{$t('No items in cart')}}
                                </td>
                            </tr>

                        </tbody>
                    </table>


                    <!-- Button at the bottom right -->
                    <div class="flex justify-end mt-3 mr-1">
                        <button @click="submitPurchase"
                            class="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-md hover:from-emerald-400 hover:to-emerald-500 text-sm transition-all duration-300 ease-in-out transform hover:scale-105">
                            {{$t('Purchase')}}
                            <i class="fa-solid fa-cart-shopping ml-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Success and Error Messages -->
        <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
        <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
    </div>
</template>