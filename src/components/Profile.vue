<script setup>
import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';



const branchStore = useBranchStore();
const selectedItem = ref(branchStore.getBranchId || "Select Branch")
const branchSearchInput = ref();
const userBranchData = ref([]);
const userNameData = ref([]);
const branchData = ref([]);

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');

const router = useRouter();


const getUserName = (id) => {
    const user = userNameData.value.find(user => user._id === id);
    return user ? user.username : "";
};


const getUserEmail = (id) => {
    const user = userNameData.value.find(user => user._id === id);
    return user ? user.email : "";
};

const getBranchName = (id) => {
    const findBranch = branchData.value.find((d) => d._id === id);
    return findBranch ? findBranch.name : "";
}

async function fetchUserbyID() {
    try {

        const params = {
            dynamicConditions: JSON.stringify([{
                field: '_id',
                operator: '==',
                value: branchStore.getUserId
            }]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        userBranchData.value = response.data.data[0].branchId || [];

    } catch (err) {
        console.log("failed to fetch data", err)
    }
}

async function fetchUserName() {
    try {
        const params = {
            populate: JSON.stringify(['employeeId']),
            dynamicConditions: JSON.stringify([{
                field: '_id',
                operator: '==',
                value: branchStore.getUserId
            }])
        }
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
        userNameData.value = response.data.data || [];

    } catch (error) {
        console.log(error.message)
    }

}

async function fetchAllBranch() {
    try {

        const params = {
            dynamicConditions: JSON.stringify([{
                field: 'status',
                operator: '==',
                value: true
            }]),
        };

        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Branch`, { params, headers: API_CONFIGS.headers });
        branchData.value = response.data.data;

    } catch (err) {
        console.log("failed to fetch data", err)
    }
}



watch(selectedItem, (newValue) => {
    if (newValue) {
        branchStore.setBranchId(newValue);
        const selectedBranch = branchData.value.find(b => b._id === newValue);
        if (selectedBranch) {
            branchStore.setBranchName(selectedBranch.abbreviation || selectedBranch.name);
        }
    }
});





// const logout = () => {
//     branchStore.clearBranchId();
//     branchStore.clearUserId();
//     branchStore.clearBranchName();
//     localStorage.removeItem('token');
//     localStorage.removeItem('userId');
//     localStorage.removeItem('branchId');
//     localStorage.removeItem('deviceId');
//     successAudio.play();
//     router.push('/login');
// };

const logout = () => {
  branchStore.clearBranchId();
  branchStore.clearUserId();
  branchStore.clearBranchName();
  branchStore.clearPermissions();
  branchStore.clearUserRole(); // <-- Add this line
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('branchId');
  localStorage.removeItem('deviceId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('branch');
  localStorage.clear();
  successAudio.play();
  router.push('/login');
};



onMounted(async () => {
    await Promise.all([fetchUserbyID(), fetchUserName(), fetchAllBranch()]);
});
</script>


<template>
    <div class="max-w-md mx-auto mt-2">
        <!-- Back Link -->
        <router-link to="/" class="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 transition p-3
         text-lg font-extrabold">
            <i class="fa-solid fa-chevron-left text-xl"></i>
            <span>{{$t('Back')}}</span>
        </router-link>

        <!-- User Info Card -->
        <div class="relative rounded-2xl bg-white/20 border border-white/20 backdrop-blur-xl ring-2 ring-emerald-500
         shadow-[0_8px_30px_rgba(2,132,122,0.3)] transition-shadow duration-300
         hover:shadow-[0_12px_40px_rgba(2,132,122,0.5)]">
            <!-- Background Mirror Layer -->
            <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-emerald-100/20 to-white/10
              backdrop-blur-xl shadow-2xl ring-1 ring-white/40 border border-white/30" style="z-index: -10;">
            </div>

            <!-- User Info Card -->
            <div
                class="relative rounded-2xl bg-white/20 shadow-md p-6 border-2 border-white/20 backdrop-blur-xl ring-2 ring-emerald-500">

                <!-- Profile Info -->
                <div class="flex flex-col md:flex-row md:items-start gap-4">
                    <!-- Avatar -->
                    <div class="flex justify-start mt-16">
                        <img v-if="userNameData[0]?.imageURL" :src="userNameData[0].imageURL" alt="Profile"
                            class="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-md object-cover" />
                        <img v-else src="@/assets/logo-ambel.png" alt="Profile"
                            class="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-md object-cover" />
                        <div class="my-auto ml-4 text-start">
                            <div class="text-gray-800 font-semibold">
                                {{ getUserName(branchStore.userId) }}
                            </div>
                            <div class="text-emerald-600 text-xs">
                                {{ userNameData[0]?.employeeId?.idCustom || 'ID:N/A' }}
                            </div>
                        </div>
                    </div>

                    <!-- User Details -->
                    <div class="text-sm text-start space-y-4 text-gray-700 w-full mt-10">
                        <h2 class="text-lg font-bold text-gray-800 mb-4 border-b-2 border-b-emerald-600 py-3">{{$t('User Information')}}</h2>

                        <!-- Name -->
                        <div class="flex flex-row items-start gap-2">
                            <label class="min-w-[70px] font-semibold text-emerald-700 my-auto">{{$t('Name')}}:</label>
                            <div
                                class="flex-1 bg-white/70 text-gray-800 border-2 border-emerald-500 rounded-md px-4 py-2 shadow-inner backdrop-blur-sm">
                                {{ getUserName(branchStore.userId) }}
                            </div>
                        </div>

                        <!-- Email -->
                        <div class="flex flex-row items-start gap-2">
                            <label class="min-w-[70px] font-semibold text-emerald-700 my-auto">{{$t('Email')}}:</label>
                            <div
                                class="flex-1 bg-white/70 text-gray-800 border-2 border-emerald-500 rounded-md px-4 py-2 shadow-inner backdrop-blur-sm">
                                {{ getUserEmail(branchStore.userId) }}
                            </div>
                        </div>

                        <!-- Branch -->
                        <div class="flex flex-row items-start gap-2">
                            <label class="min-w-[70px] font-semibold text-emerald-700 my-auto">{{$t('Branch')}}:</label>
                            <div
                                class="flex-1 bg-white/70 text-gray-800 border-2 border-emerald-500 rounded-md px-4 py-2 shadow-inner backdrop-blur-sm">
                                {{ getBranchName(branchStore.getBranchId) }}
                            </div>
                        </div>

                        <!-- Position -->
                        <div class="flex flex-row items-start gap-2">
                            <label class="min-w-[70px] font-semibold text-emerald-700 my-auto">{{$t('Position')}}:</label>
                            <div
                                class="flex-1 bg-white/70 text-gray-800 border-2 border-emerald-500 rounded-md px-4 py-2 shadow-inner backdrop-blur-sm">
                                {{ userNameData[0]?.employeeId?.position || 'N/A' }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Login Button -->
                <div class="flex justify-end mt-10">
                    <button @click="logout" class="flex items-center space-x-3 px-4 py-2 text-sm font-semibold text-white 
                        bg-gradient-to-r from-emerald-500 to-emerald-700 
                        hover:from-emerald-600 hover:to-emerald-800 
                        transition-all duration-300 rounded-md shadow-md hover:shadow-lg 
                        border-2 border-white hover:border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <span>{{$t('Log Out')}}</span>
                    </button>
                </div>

            </div>
        </div>

        <footer>
            <div class="container mx-auto py-4">
                <p class="text-center text-gray-600 text-sm">
                    &copy; Powered by Phors_Stephen - version-0.1.2.
                </p>
            </div>
        </footer>
    </div>

</template>

<style scoped></style>