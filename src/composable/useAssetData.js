import { ref, onMounted, watch, onUnmounted } from "vue";
import API_CONFIGS from '@/api/config';
import { useBranchStore } from "@/store/branchStore";
import axios from "axios";

export function useAssetDropdown(BASE_URL) { // Renamed to reflect assets
  const selectedAsset = ref(""); // Stores the selected asset ID
  const filteredAssets = ref([]); // Assets shown in dropdown
  const searchInputAsset = ref("");
  const assetSearchInputRef = ref(null);
  const isAssetSearchOpen = ref(false);
  const branchStore = useBranchStore();
  const assets = ref([]); // All fetched assets

  // Toggle dropdown visibility
  const toggleAssetSearch = () => {
    isAssetSearchOpen.value = !isAssetSearchOpen.value;
  };

  // Update filtered assets based on search term and asset status
  const updateFilteredAssets = () => {
    const searchTerm = searchInputAsset.value.trim().toLowerCase();
    filteredAssets.value = searchTerm
      ? assets.value.filter(
        a => a.status === true && a.name.toLowerCase().includes(searchTerm)
      )
      : assets.value.filter(a => a.status === true);
  };

  // Select an asset only if its status is true
  const selectAsset = (id) => {
    const asset = assets.value.find(a => a._id === id);
    if (asset && asset.status === true) {
      selectedAsset.value = asset._id;  // Store the selected asset ID
      isAssetSearchOpen.value = false;
    } else {
      console.warn(`Asset with ID ${id} is not available (status: false)`);
    }
  };

  // Fetch assets from CompanyAsset
  const fetchAssets = async () => {
    try {
      const response = await axios.get(
        `${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/CompanyAsset`,
        {
        headers: API_CONFIGS.headers
        }
      );
      assets.value = response.data.data || [];
      // Filter initially by asset status
      filteredAssets.value = assets.value.filter(a => a.status === true);
    } catch (error) {
      console.error("Error fetching assets:", error.message);
      assets.value = [];
      filteredAssets.value = [];
    }
  };


  const getAssetName = (id) => {
    if (!id) return "";
    const asset = assets.value.find(a => a._id === id);
    return asset ? asset.name : "";
  };

  const getAssetType = (id) => {
    if (!id) return "";
    const asset = assets.value.find(a => a._id === id);
    return asset && asset.category ? asset.category.name : "N/A";
  };

  // Watch branchId changes
  watch(
    () => branchStore.branchId,
    async (newBranchId) => {
      if (newBranchId) {
        await fetchAssets();
      }
    }
  );

  // Handle clicks outside the dropdown
  const handleAssetClickOutside = (event) => {
    if (
      !event.target.closest(".dropdown-asset") && // Updated class name
      event.target !== assetSearchInputRef.value
    ) {
      isAssetSearchOpen.value = false;
    }
  };

  onMounted(async () => {
    await fetchAssets();
    document.addEventListener("click", handleAssetClickOutside);
  });

  onUnmounted(() => {
    document.removeEventListener("click", handleAssetClickOutside);
  });

  return {
    isAssetSearchOpen,
    filteredAssets,
    handleAssetClickOutside,
    searchInputAsset,
    selectedAsset,
    assetSearchInputRef,
    getAssetName,
    toggleAssetSearch,
    updateFilteredAssets,
    selectAsset,
    getAssetType,
    fetchAssets
  };
}