<script setup>
import API_CONFIGS from '@/api/config';
import ErrorMessage from '@/components/ErrorMessage.vue';
import SuccessMessage from '@/components/SuccessMessage.vue';
import { decodeJwt } from '@/composable/jwt';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import { getDeviceDetails } from "@/utils/getDeviceDetails";
import axios from "axios";
import { toast } from 'primevue/toast';
import { v4 as uuidv4 } from "uuid";
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Vue3Lottie } from 'vue3-lottie';
import SplashScreen from '../components/SplashScreen.vue';

const usernameOrEmail = ref("");
const password = ref("");
const isPending = ref(false);
const isErrorLogin = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const showSuccessMessage = ref(false);
const showErrorMessage = ref(false);
const showPassword = ref(false);
const router = useRouter();
const branchStore = useBranchStore();
const isPermissionLogin = ref(false);
const userBranchData = ref([]);
const selectedBranch = ref("");
const branchData = ref([]);
const showSplash = ref(false);
const fieldErrors = reactive({
  usernameOrEmail: '',
  password: ''
});

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');
const errorAudio = new Audio('/sounds/errorSounds.mp3');

watch(usernameOrEmail, async (newV) => {
  if (newV) {
    const isEmail = newV.includes('@');
    const params = {
      dynamicConditions: JSON.stringify([{
        field: isEmail ? 'email' : 'username',
        operator: '==',
        value: newV,
      }]),
    };

    const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
    const user = response.data.data[0];

    if (user?.branchId?.length > 1 && user.mainRole !== 'Super Admin') {
      userBranchData.value = branchData.value.filter(branch => user.branchId.includes(branch._id));
    }
  } else {
    userBranchData.value = [];
    selectedBranch.value = '';
  }
});

const handleLogin = async () => {
  try {
    showSplash.value = true;
    isPending.value = true;
    isPermissionLogin.value = false;

    const deviceDetails = getDeviceDetails();
    const deviceUUID = uuidv4();
    const isEmail = usernameOrEmail.value.includes('@');
    const params = {
      dynamicConditions: JSON.stringify([{
        field: isEmail ? 'email' : 'username',
        operator: '==',
        value: usernameOrEmail.value,
      }]),
      populate: JSON.stringify(['roleId'])
    };
    const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });
    const userDoc = response.data.data[0];

    if (!userDoc) {
      showSplash.value = false;
      isPending.value = false;
      isErrorLogin.value = true;
      errorMessage.value = "Name or password is incorrect!";
      fieldErrors.usernameOrEmail = "Username or email not found.";
      fieldErrors.password = "Incorrect password.";
      showErrorMessage.value = true;
      errorAudio.play();
      return;
    }

    if (userDoc.status === false && userDoc.mainRole === 'User') {
      showSplash.value = false;
      isPermissionLogin.value = true;
      isPending.value = false;
      errorMessage.value = "Account is not active. Please contact the administrator.";
      showErrorMessage.value = true;
      errorAudio.play();
      return;
    }

    const branchId = userBranchData.value.length > 1 ? selectedBranch.value._id : userDoc.branchId[0];

    const responseLogin = await axios.post(`${API_CONFIGS.BASE_URL}/loan/api/login`, {
      usernameOrEmail: usernameOrEmail.value,
      password: password.value,
      device: { ...deviceDetails, uuid: deviceUUID },
    });

    const token = responseLogin.data.token;
    if (token) {
      const decodedToken = await decodeJwt(token);
      const userId = decodedToken.userId;

      branchStore.setUserId(userId);
      branchStore.setBranchId(branchId);
      branchStore.setUserRole(userDoc.mainRole);
      localStorage.setItem('token', token);
      localStorage.setItem('branchId', branchId);
      localStorage.setItem('userId', userId);
      if (responseLogin.data.data && responseLogin.data.data.device) {
        localStorage.setItem('deviceId', responseLogin.data.data.device.uuid);
      } else {
        console.warn("Device ID is missing from response:", responseLogin.data.data);
      }
      successMessage.value = "Login Successful!";
      showSuccessMessage.value = true;
      successAudio.play();

      const redirectRoute = await getHRRedirectRoute(userDoc.mainRole, userId);

      setTimeout(() => {
        showSplash.value = false;
        router.push(redirectRoute);
      }, 200);
    }
  } catch (err) {
    console.error("Failed to login:", err);
    fieldErrors.usernameOrEmail = "Please check your username or email.";
    fieldErrors.password = "Please check your password.";
    showSplash.value = false;
    isPending.value = false;
    isErrorLogin.value = true;
    errorMessage.value = "Can not login. Please check your username or password.";
    showErrorMessage.value = true;
    errorAudio.play();
    usernameOrEmail.value = "";
    password.value = "";
    setTimeout(() => {
      showErrorMessage.value = false;
    }, 5000);
  }
};

const getHRRedirectRoute = async (userRole, userId) => {
  try {
    if (window.innerWidth < 768) {
      return '/dashboard-mobile';
    }

    const {
      loadUserPermissions,
      canAccessDashboard,
      canAccessCategory,
      canAccessAsset,
      canAccessTransaction,
      canAccessPurchase,
      canAccessTransferStock,
      canAccessPurchaseHistory,
      canAccessReport,
      clearPermissionsCache
    } = useUserPermission();

    clearPermissionsCache();
    await loadUserPermissions(userId, true);

    if (canAccessDashboard()) {
      return '/dashboard';
    } else if (canAccessCategory()) {
      return '/products/Category';
    } else if (canAccessAsset()) {
      return '/companyAssets/Assets';
    } else if (canAccessTransaction()) {
      return '/transactionAssets/Transaction';
    } else if (canAccessPurchase()) {
      return '/purchaseAssets/purchaseAssets';
    } else if (canAccessTransferStock()) {
      return '/stockTransfer/stockTransfer';
    } else if (canAccessPurchaseHistory()) {
      return '/purchaseAssetsHistory/purchaseAssetsHistory';
    } else if (canAccessReport()) {
      return '/reports/reportAssets';
    } else if (userRole === 'Admin' || userRole === 'Super Admin') {
      return '/permission';
    } else {
      toast.add({ severity: 'warn', summary: 'Warning', detail: 'You don\'t have permission to access any HR modules', life: 5000 });
      return '/login';
    }
  } catch (error) {
    console.error("Error determining HR redirect route:", error);
    return '/';
  }
};
</script>

<style scoped>
/* Custom animations and transitions handled by Tailwind */
</style>





<template>
  <div
    class="min-h-screen w-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-20 left-10 w-32 h-8 bg-green-400 rounded-full opacity-60 transform rotate-12"></div>
      <div class="absolute top-40 right-20 w-24 h-6 bg-green-300 rounded-full opacity-50 transform -rotate-6"></div>
      <div class="absolute bottom-32 left-16 w-20 h-4 bg-green-400 rounded-full opacity-40 transform rotate-45"></div>
      <div class="absolute bottom-20 right-32 w-16 h-16 bg-green-500 rounded-full opacity-30"></div>
      <div class="absolute top-60 left-1/4 w-12 h-12 bg-green-500 rounded-full opacity-25"></div>

      <div class="absolute top-0 left-0 w-full h-full">
        <div class="absolute top-10 left-20 w-40 h-1 bg-gray-300 transform rotate-45 opacity-30"></div>
        <div class="absolute top-32 right-40 w-32 h-1 bg-gray-300 transform -rotate-45 opacity-25"></div>
        <div class="absolute bottom-40 left-32 w-36 h-1 bg-gray-300 transform rotate-12 opacity-20"></div>
      </div>
    </div>

    <SplashScreen :isSplashVisible="showSplash" />


    <div class="relative z-10 w-full max-w-sm mx-4">

      <div class="bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">

        <img src="@/assets/logo-ambel.png" alt="Ambel Logo" class="mx-auto w-24 h-24 " />


        <!-- 
        <div class="absolute top-4 right-4 w-16 h-4 bg-green-300 rounded-full opacity-50"></div>
        <div class="absolute top-8 right-8 w-8 h-2 bg-green-300 rounded-full opacity-60"></div> -->
        <!-- <div class="absolute top-12 right-12 w-4 h-1 bg-green-300 rounded-full opacity-70"></div> -->

        <!-- <div class="absolute bottom-4 left-4 w-12 h-3 bg-green-400 rounded-full opacity-40"></div>
        <div class="absolute bottom-8 left-8 w-6 h-6 bg-green-300 rounded-full opacity-30"></div> -->




        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-gray-800 font-semibold mb-2 text-left">
              UserName <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input v-model="usernameOrEmail" type="text" placeholder="Enter Username"
                class="w-full p-4 bg-gray-200 border-1 rounded-xl focus:ring-1 focus:ring-green-800 focus:bg-white outline-none transition-all duration-200 text-gray-800 placeholder-gray-600"
                required />
            </div>
            <p v-if="fieldErrors.usernameOrEmail" class="text-sm text-red-700 mt-1 font-medium text-left">
              {{ fieldErrors.usernameOrEmail }}
            </p>
          </div>

          <div>
            <label class="block text-gray-800 font-semibold mb-2 text-left">
              Password<span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Enter Password"
                class="w-full p-4 bg-gray-200 border-1 rounded-xl focus:ring-1 focus:ring-green-800 focus:bg-white outline-none transition-all duration-200 text-gray-800 placeholder-gray-600"
                required />
              <button type="button" @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-800 transition-colors">
                <i v-if="showPassword" class="fa-solid fa-eye text-lg"></i>
                <i v-else class="fa-solid fa-eye-slash text-lg"></i>
              </button>
            </div>
            <p v-if="fieldErrors.password" class="text-sm text-red-700 mt-1 font-medium text-left">
              {{ fieldErrors.password }}
            </p>
          </div>

          <!-- <div v-if="userBranchData.length > 1" class="space-y-2">
            <label class="block text-gray-800 font-semibold mb-2 text-left">
              Select Branch
            </label>
            <select 
              v-model="selectedBranch" 
              class="w-full p-4 bg-yellow-200 bg-opacity-60 border-0 rounded-xl focus:ring-2 focus:ring-orange-300 focus:bg-yellow-100 outline-none transition-all duration-200 text-gray-800"
              required
            >
              <option value="">Choose a branch</option>
              <option v-for="branch in userBranchData" :key="branch._id" :value="branch">
                {{ branch.name }}
              </option>
            </select>
          </div> -->
          <button type="submit"
            class="w-full  py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 focus:ring-offset-green-400"
            :disabled="isPending">
            <span v-if="!isPending" class="text-lg">Log in</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
              Logging in...
            </span>
          </button>
        </form>

        <!-- <div class="mt-6">
          <SuccessMessage v-if="showSuccessMessage" :message="successMessage" :visible="showSuccessMessage" />
          <ErrorMessage v-if="showErrorMessage" :message="errorMessage" :visible="showErrorMessage" />
        </div> -->
      </div>
    </div>
  </div>
</template>
