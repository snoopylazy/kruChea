<script setup>
import API_CONFIGS from '@/api/config';
import { useUserPermission } from '@/composable/userPermission';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import OverlayPanel from 'primevue/overlaypanel';
import Select from 'primevue/select';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

// Transalte
import khFlag from '@/assets/kh.png';
import usaFlag from '@/assets/usa.png';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n()

// Use store getters directly for better performance
const branchStore = useBranchStore();

// Load user permissions only once
const { loadUserPermissions } = useUserPermission();

// Stable permission cache that only updates when permissions actually change
const permissionsCache = ref({
  canAccessDashboard: false,
  canAccessCategory: false,
  canAccessAsset: false,
  canAccessAssetTransaction: false,
  canAccessAssetTransferStock: false,
  canAccessPurchaseAsset: false,
  canAccessPurchaseAssetHistory: false,
  canAccessReport: false,
  isAdminOrSuperAdmin: false
});

// Function to update permissions cache only when needed
const updatePermissionsCache = () => {
  const perms = branchStore.getUserPermissions;
  const userRole = branchStore.getUserRole;
  
  permissionsCache.value = {
    canAccessDashboard: perms?.hrCompanyAssetDashboard === true,
    canAccessCategory: perms?.hrCategoryAll === true || perms?.hrCategoryView === true,
    canAccessAsset: perms?.hrAssetAll === true || perms?.hrAssetView === true,
    canAccessAssetTransaction: perms?.hrAssetTransactionAll === true || perms?.hrAssetTransactionView === true,
    canAccessAssetTransferStock: perms?.hrAssetTransferStockAll === true || perms?.hrAssetTransferStockView === true,
    canAccessPurchaseAsset: perms?.hrPurchaseAssetAll === true || perms?.hrPurchaseAssetView === true,
    canAccessPurchaseAssetHistory: perms?.hrPurchaseAssetHistoryAll === true || perms?.hrPurchaseAssetHistoryView === true,
    canAccessReport: perms?.hrCompanyAssetReportView === true,
    isAdminOrSuperAdmin: userRole === 'Admin' || userRole === 'Super Admin'
  };
};

const currentLang = computed(() => locale.value)
const flagSrc = computed(() => (locale.value === 'en' ? usaFlag : khFlag))
function switchLang() {
  locale.value = locale.value === 'en' ? 'km' : 'en'
  localStorage.setItem('locale', locale.value)
}

const overlayPanelRef = ref();
const toggleOverlay = (event) => {
  overlayPanelRef.value.toggle(event);
  isProfileOpen.value = !isProfileOpen.value;
};

const isOpen = ref(false);
const selectedItem = ref(branchStore.getBranchId || "Select Branch")
const branchSearchInput = ref();
const userBranchData = ref([]);
const userNameData = ref([]);
const branchData = ref([]);
const profileDropdown = ref(null);

const isLoadingPermissions = ref(true);
const isLoadingUserData = ref(true);
const isLoadingBranchData = ref(true);

// Sounds
const successAudio = new Audio('/sounds/successSounds.mp3');

const router = useRouter();

const openSidebar = ref(true);

const toggleSidebar = () => {
  openSidebar.value = !openSidebar.value;
};

const handleProfileClickOutside = (event) => {
  if (profileDropdown.value && !profileDropdown.value.contains(event.target)) {
    isProfileOpen.value = false;
  }
};

const toggleProfile = () => {
  isProfileOpen.value = !isProfileOpen.value;
};

const isProfileOpen = ref(false);

const getUserName = computed(() => (id) => {
  const user = userNameData.value.find(user => user._id === id);
  return user ? user.username : "Unknown User";
});

const getUserEmail = computed(() => (id) => {
  const user = userNameData.value.find(user => user._id === id);
  return user ? user.email : "Unknown Email";
});

const getBranchName = computed(() => (id) => {
  const findBranch = branchData.value.find((d) => d._id === id);
  return findBranch ? findBranch.abbreviation : "";
});

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
  } finally {
    isLoadingUserData.value = false;
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
  } finally {
    isLoadingBranchData.value = false;
  }
}

const branchOptions = computed(() => {
  return branchData.value.filter(branch =>
    userBranchData.value.includes(branch._id)
  ).map(branch => ({
    _id: branch._id,
    name: branch.abbreviation || branch.name
  }));
});

// FIXED: Debounced watch
let watchTimeout;
watch(selectedItem, (newValue) => {
  if (watchTimeout) clearTimeout(watchTimeout);
  watchTimeout = setTimeout(() => {
    if (newValue) {
      branchStore.setBranchId(newValue);
      const selectedBranch = branchData.value.find(b => b._id === newValue);
      if (selectedBranch) {
        branchStore.setBranchName(selectedBranch.abbreviation || selectedBranch.name);
      }
    }
  }, 100);
});

const handleClickOutside = (event) => {
  if (
    !event.target.closest(".dropdown-branch") &&
    event.target !== branchSearchInput.value
  ) {
    isOpen.value = false;
  }
};

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
// Optimized initialization - load permissions once and cache in store
onMounted(async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
    return;
  }

  document.addEventListener('click', handleClickOutside);
  document.addEventListener('click', handleProfileClickOutside);

  try {
    // Load permissions once and store them in Pinia store
    isLoadingPermissions.value = true;
    await loadUserPermissions();
    
    // Update our local cache after permissions are loaded
    updatePermissionsCache();
    isLoadingPermissions.value = false;

    // Load other data in parallel
    await Promise.all([
      fetchAllBranch(),
      fetchUserName(),
      fetchUserbyID()
    ]);
  } catch (error) {
    console.error("Error during initialization:", error);
    isLoadingPermissions.value = false;
  }
});

onUnmounted(() => {
  if (watchTimeout) clearTimeout(watchTimeout);
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("click", handleProfileClickOutside);
});
</script>

<template>
  <div class="flex h-screen overflow-hidden font-khmer bg-white md:bg-gray-200">
    <!-- Sidebar -->
    <aside
      class="hidden md:block m-3 rounded-lg transition-all duration-300 ease-in-out overflow-y-auto bg-gradient-to-b from-white/10 via-emerald-100/10 to-emerald-300/10 backdrop-blur-xl border border-white/30 shadow-2xl"
      :class="openSidebar ? 'w-64' : 'w-0 min-w-0'" style="transition-property: width;">

      <transition name="sidebar-fade">
        <!-- FIXED: Only show sidebar when permissions are loaded -->
        <nav v-if="openSidebar && !isLoadingPermissions" class="p-4">
          <div class="items-center mb-3 border-b-2 border-b-emerald-400">
            <img src="../assets/logo-ambel.png" alt="" class="h-24 w-24 mx-auto" />
          </div>
          <!-- Dashboard - Use stable permissions cache -->
          <div v-if="permissionsCache.canAccessDashboard" class="space-y-2">
            <h2 class="text-sm font-semibold mb-2 mt-2 text-left text-emerald-600">{{ $t('Dashboard') }}</h2>
            <router-link to="/dashboard" exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
              class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
               focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white"
              v-slot="{ isExactActive }">
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-house-chimney w-[14px]"></i>
                <span class="text-xs">{{ $t('Home') }}</span>
              </div>
              <transition name="fade-slide">
                <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
              </transition>
            </router-link>
          </div>

          <!-- Company Asset - Use stable permissions cache -->
          <div v-if="permissionsCache.canAccessAsset || permissionsCache.canAccessCategory">
            <h2 class="text-sm font-semibold mb-2 mt-2 text-left text-emerald-600">{{ $t('Company Asset') }}</h2>
            <div class="flex flex-col space-y-2">
              <router-link v-if="permissionsCache.canAccessCategory" to="/category"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-boxes-stacked w-[14px]"></i>
                  <span class="text-xs">{{ $t('Category') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>

              <router-link v-if="permissionsCache.canAccessAsset" to="/company-assets"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-box-archive w-[14px]"></i>
                  <span class="text-xs">{{ $t('Assets') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>
            </div>
          </div>

          <!-- Operation Assets - Use stable permissions cache -->
          <div
            v-if="permissionsCache.canAccessAssetTransaction || permissionsCache.canAccessPurchaseAsset || permissionsCache.canAccessPurchaseAssetHistory">
            <h2 class="text-sm font-semibold mb-2 mt-2 text-left text-emerald-600">{{ $t('Operation Assets') }}</h2>
            <div class="flex flex-col space-y-2">
              <router-link v-if="permissionsCache.canAccessAssetTransaction" to="/operation-assets"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-retweet w-[14px]"></i>
                  <span class="text-xs">{{ $t('Transaction') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>
<!-- 
              <router-link v-if="permissionsCache.canAccessAssetTransferStock" to="/stock-transfer"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-box-open w-[14px]"></i>
                  <span class="text-xs">{{ $t('Transfer Stock') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link> -->

              <router-link v-if="permissionsCache.canAccessPurchaseAsset" to="/purchase-assets"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-cart-shopping w-[14px]"></i>
                  <span class="text-xs">{{ $t('Purchase') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>

              <router-link v-if="permissionsCache.canAccessPurchaseAssetHistory" to="/purchase-assets-history"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-clock-rotate-left w-[14px]"></i>
                  <span class="text-xs">{{ $t('Purchase History') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>
            </div>
          </div>

          <!-- Reports - Use stable permissions cache -->
          <div v-if="permissionsCache.canAccessReport">
            <h2 class="text-sm font-semibold mb-2 mt-2 text-left text-emerald-600">{{ $t('Report Assets') }}</h2>
            <div class="flex flex-col space-y-2">
              <router-link to="/report-assets" exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white"
                v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-file-lines w-[14px]"></i>
                  <span class="text-xs">{{ $t('Assets') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>

              <router-link to="/return-assets" exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white"
                v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-file-code w-[14px]"></i>
                  <span class="text-xs">{{ $t('Transaction') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>

              <!-- <router-link to="/transfer-history"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-shuffle w-[14px]"></i>
                  <span class="text-xs">{{ $t('Transfer') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link> -->

              <router-link to="/history-purchase"
                exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
                class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
                 focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white" v-slot="{ isExactActive }">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-file-invoice-dollar w-[14px]"></i>
                  <span class="text-xs">{{ $t('Purchase') }}</span>
                </div>
                <transition name="fade-slide">
                  <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
                </transition>
              </router-link>
            </div>
          </div>

          <!-- Permission - Use stable permissions cache -->
          <div v-if="permissionsCache.isAdminOrSuperAdmin">
            <h2 class="text-sm font-semibold mb-2 mt-2 text-left text-emerald-600">{{ $t('Permission User') }}</h2>
            <router-link to="/permission" exact-active-class="bg-gradient-to-br from-primary to-primary text-white"
              class="group flex items-center justify-between p-2 rounded-md transition-all duration-300 ease-in-out
               focus:ring-2 focus:ring-primary hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:text-white"
              v-slot="{ isExactActive }">
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-user-shield w-[14px]"></i>
                <span class="text-xs">{{ $t('Permission') }}</span>
              </div>
              <transition name="fade-slide">
                <i v-if="isExactActive" class="fa-solid fa-chevron-right text-xs text-white"></i>
              </transition>
            </router-link>
          </div>
        </nav>

        <!-- Loading state for sidebar -->
        <div v-else-if="openSidebar && isLoadingPermissions" class="p-4 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p class="text-xs text-emerald-600 mt-2">{{ $t('Loading permissions...') }}</p>
        </div>
      </transition>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Navbar -->
      <header v-if="$route.path !== '/profile'"
        class="h-16 flex items-center justify-between px-3 md:px-6 p-3 m-3 bg-gradient-to-b from-white/10 via-emerald-100/10 to-emerald-300/10 backdrop-blur-md shadow-md border border-white/30 rounded-lg">
        <!-- Sidebar Toggle Button -->
        <div class="items-center hidden md:flex w-full">
          <button @click="toggleSidebar"
            class="text-primary border-primary border-2 focus:outline-none mr-4 rounded-lg p-2 hover:bg-primary hover:border-white hover:text-white transition-colors ">
            <svg v-if="!openSidebar" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <h1 class="hidden lg:block text-xl font-semibold">{{ $t('Company Assets') }}</h1>
        </div>

        <!-- Right Side (Branch and Profile Dropdown) -->
        <div class="w-full flex justify-between md:justify-end items-center space-x-2 md:space-x-6">
          <!-- Mobile Profile -->
          <router-link to="/profile" class="flex items-center space-x-3 md:hidden">
            <div class="flex items-center space-x-3 cursor-pointer">
              <div v-if="userNameData[0]?.imageURL && !isLoadingUserData"
                class="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all duration-300">
                <img :src="userNameData[0]?.imageURL" alt="Profile" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 
              flex items-center justify-center text-white font-semibold 
              border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all duration-300">
                AC
              </div>
              <div class="text-left">
                <div class="text-sm font-medium text-black">{{ getUserName(branchStore.userId) }}</div>
                <div class="text-xs text-emerald-600 flex items-center gap-1">
                  {{ $t('Profile') }} <i class="fa-solid fa-chevron-right text-[10px] mt-[1px]"></i> <i
                    class="fa-solid fa-chevron-right text-[10px] mt-[1px]"></i>
                </div>
              </div>
            </div>
          </router-link>

          <!-- Branch Selector -->
          <div class="flex items-center space-x-2">
            <!-- Translate -->
            <div class="relative">
              <button @click="switchLang"
                class="flex items-center gap-2 p-2 rounded-lg  shadow-sm  transition-all duration-200">
                <img :src="flagSrc" :alt="currentLang + ' flag'"
                  class="w-6 h-6 rounded-full object-cover border border-gray-300" />
              </button>
            </div>


            <Select v-if="!isLoadingBranchData" v-model="selectedItem" :options="branchOptions" optionLabel="name"
              optionValue="_id" class="py-1.5" :panelStyle="{ width: '10rem' }" size="small" filter
              :filterPlaceholder="$t('Search...')">
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex items-center">
                  <i class="fa-solid fa-building text-emerald-600 text-xs mr-1"></i>
                  <span class="text-xs truncate">{{ getBranchName(slotProps.value) }}</span>
                </div>
                <span v-else class="text-xs">{{ $t('Select Branch') }}</span>
              </template>
              <template #option="slotProps">
                <div class="flex items-center">
                  <i class="fa-solid fa-building text-emerald-600 text-xs mr-1"></i>
                  <span class="text-xs truncate">{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Select>
          </div>

          <!-- Desktop Profile Dropdown -->
          <div class="relative hidden md:block">
            <button @click="toggleOverlay($event)"
              class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
              <div v-if="userNameData[0]?.imageURL && !isLoadingUserData"
                class="w-10 h-10 rounded-full shadow-md hover:shadow-lg overflow-hidden border-2 border-emerald-500">
                <img :src="userNameData[0].imageURL" alt="Profile" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 
                        flex items-center justify-center text-white font-semibold 
                        shadow-md hover:shadow-lg border-2 border-emerald-500">
                AC
              </div>
              <div class="text-left hidden md:block" v-if="!isLoadingUserData">
                <div class="text-sm font-medium text-black">{{ getUserName(branchStore.userId) }}</div>
                <div class="text-xs text-black">{{ getUserEmail(branchStore.userId) }}</div>
              </div>
              <i class="pi pi-chevron-down text-gray-600"></i>
            </button>

            <OverlayPanel ref="overlayPanelRef" appendTo="body" class="w-56 rounded-lg shadow-md p-3">
              <div v-if="!isLoadingUserData">
                <div class="text-sm font-medium text-black mb-1">{{ getUserName(branchStore.userId) }}</div>
                <div class="text-xs text-gray-700 mb-3">{{ getUserEmail(branchStore.userId) }}</div>
              </div>
              <button @click="logout"
                class="flex items-center w-full px-4 py-2 text-sm text-white bg-gradient-to-r from-red-500 to-red-700 rounded-md hover:from-red-600 hover:to-red-800 transition-all duration-300 shadow-md hover:shadow-lg">
                <i class="pi pi-sign-out mr-2"></i> {{ $t('Logout') }}
              </button>
            </OverlayPanel>
          </div>
        </div>
      </header>

      <!-- Content Area -->
      <main class="flex-1 transition-all duration-900 ease-out overflow-y-auto max-h-full">
        <transition name="fade-slide" mode="out-in">
          <div class="p-6 rounded-lg mx-auto" :class="{ 'w-[84%]': !openSidebar, 'w-full': openSidebar }"
            :key="$route.fullPath">
            <router-view />
          </div>
        </transition>
      </main>
      <!-- Footer -->
      <div class="mx-auto text-start p-3 w-full hidden md:block">
        <p class="text-sm text-gray-400">Powered© by Phors_Stephen - version-0.1.2</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.4s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-from,
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}



.max-h-100 {
  max-height: 100vh;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #34D399;
  /* emerald-400 */
  border-radius: 10px;
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
</style>
