<script setup>
import API_CONFIGS from '@/api/config';
import PaginationTwo from '@/components/PaginationTwo.vue';
import PermissionUser from '@/components/PermissionUser.vue';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import { Select } from 'primevue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter()

const show = ref(false)
const branchStore = useBranchStore();
const userData = ref([]);
const isLoading = ref(false);
const currentPage = ref(1);
const searchText = ref('');
const searchQuery = ref('');
const limitedPerPage = ref(10);
const pageSize = ref(10);
const currentPageIsLastRecord = ref(null);


//Row
const selectedRow = ref({ name: '50' });
const Row = ref([
    { name: '50' },
    { name: '100' },
    { name: '200' },
    { name: '500' },
    { name: '1000' },
]);

const selectedUser = ref(null);

watch(searchQuery, (newValue) => {
    searchText.value = newValue;
    currentPage.value = 1;
}, { immediate: true });

watch(searchText, () => {
    currentPage.value = 1;
});

function openPermissionsFor(user) {
    selectedUser.value = user;
    show.value = true;
}


const handleListenToPagination = async (items) => {
    userData.value = items || [];
};

const handleListenIsLoading = (status) => {
    isLoading.value = status;
};

const handleListenIsLastRecordOnPage = (page) => {
    currentPageIsLastRecord.value = page;
    if (currentPage.value > 1) {
        currentPage.value -= 1;
    }
};

const getBranchName = (branchIds) => {
    if (!branchIds) return 'N/A';

    if (Array.isArray(branchIds)) {
        const branchNames = branchIds.map(id => {
            const branch = branchData.value.find(b => b._id === id);
            return branch ? branch.abbreviation : 'N/A';
        });

        return branchIds.length > 10 ?
            branchNames.slice(0, 10).join(', ') + ', ...' :
            branchNames.join(', ');
    }

    const branch = branchData.value.find(b => b._id === branchIds);
    return branch ? branch.abbreviation : 'N/A';
};


const branchData = ref([]);
async function fetchAllBranch() {
    try {

        const params = {
            dynamicConditions: JSON.stringify([{
                field: 'status',
                operator: '==',
                value: true
            },
            ]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
        branchData.value = response.data.data;

    } catch (err) {
        console.log("failed to fetch data", err)
    }
}


const fetchData = async () => {
    try {
        isLoading.value = true;
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { headers: API_CONFIGS.headers });

        userData.value = response.data.data || [];
    } catch (error) {
        console.error("Cannot fetch users:", error);
    } finally {
        isLoading.value = false;
    }
};



watch(selectedRow, (newValue) => {
    if (newValue && newValue.name) {
        const rowValue = parseInt(newValue.name);
        pageSize.value = rowValue;
        limitedPerPage.value = rowValue;
        currentPage.value = 1;
    }
}, { immediate: true });

// Define the resize handler
const handleResize = () => {
    if (window.innerWidth < 768) {
        router.replace('/')
    }
}


onMounted( () => {
    fetchAllBranch();
    handleResize()


    window.addEventListener('resize', handleResize)

});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

</script>

<template>
    <div class="bg-white shadow-md rounded-lg p-4 mb-4">
        <h2 class="text-lg font-semibold mb-4  text-left">{{$t('Permission User')}}</h2>
        <!-- Search Input -->
        <div class="w-full md:w-auto lg:w-[35%] flex items-center mr-3 ">
            <div class="relative w-full">
                <input v-model="searchQuery" type="text" placeholder="ស្វែងរកតាមឈ្មោះ..."
                    class="p-1 w-full border border-emerald-900 bg-white text-black rounded-md focus:ring-2 focus:ring-emerald-900 outline-none pl-3 pr-10 ">
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </span>
            </div>
        </div>

        <!-- Size and Add -->
        <div class="flex items-center justify-between mt-4">
            <div class="card flex justify-center">
                <Select v-model="selectedRow" variant="filled" :options="Row" optionLabel="name" placeholder="Row"
                    class="w-full" size="small" />
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto relative min-h-[300px] mt-4">
            <!-- Loading more indicator -->
            <div v-if="isLoading" class="flex justify-center my-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-900"></div>
            </div>
            <table class="w-full text-sm border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                <thead class="bg-emerald-900 text-white text-center text-xs font-medium">
                    <tr>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Username')}}</th>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Branch')}}</th>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Email')}}</th>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Role')}}</th>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Status')}}</th>
                        <th class="px-3 py-2 border border-emerald-800">{{$t('Action')}}</th>
                    </tr>
                </thead>
                <tbody v-if="userData.length > 0" class="text-center">
                    <tr v-for="(data, index) in userData" :key="data._id"
                        class="odd:bg-white even:bg-emerald-50 hover:bg-emerald-100 transition-all duration-200">
                        <td class="border px-3 py-2">
                            {{ data.displayName || data.username }}
                        </td>
                        <td class="border px-3 py-2 ">
                            {{ getBranchName(data.branchId) }}
                        </td>
                        <td class="border px-3 py-2">
                            {{ data.email }}
                        </td>
                        <td class="border px-3 py-2">
                            {{ data.mainRole }}
                        </td>
                        <!-- <td class="border px-3 py-2">
                            <i v-if="data.status" class="fa-regular fa-circle-check text-green-600"></i>
                            <i v-else class="fa-regular fa-circle-xmark text-red-600"></i>
                        </td> -->
                        <td class="border px-3 py-2 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <i v-if="data.status" class="fa-regular fa-circle-check text-green-600"
                                    title="Active"></i>
                                <i v-else class="fa-regular fa-circle-xmark text-red-600" title="Inactive"></i>

                                <!-- <button @click="updateUserStatus(data)"
                                    class="px-2 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                    :title="data.status ? 'Deactivate User' : 'Activate User'">
                                    {{ data.status ? 'Deactivate' : 'Activate' }}
                                </button> -->
                            </div>
                        </td>
                        <td class="border px-3 py-2">
                            <i class="fa-solid fa-key text-orange-500 cursor-pointer animate-bounce"
                                @click="openPermissionsFor(data)"></i>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr>
                        <td colspan="5" class="border px-3 py-2 text-center">{{$t('No users found.')}}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <!-- Pagination Component -->
        <PaginationTwo :currentPage="currentPage" @onEmitDataFromPagination="handleListenToPagination"
            @onEmitIsLoading="handleListenIsLoading" @onEmitCurrentPageIsLastRecord="handleListenIsLastRecordOnPage"
            :limitedPerPage="pageSize" :searchQuery="searchText" />
    </div>
    <PermissionUser v-if="show" @close="show = false" :selectedUser="selectedUser" />
</template>