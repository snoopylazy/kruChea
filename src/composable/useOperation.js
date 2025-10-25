import { ref, onMounted, onUnmounted } from "vue";

export function useOperationDropdown() {
  const isOperationSearchOpen = ref(false);
  const isFormOperationSearchOpen = ref(false);
  const operationItems = ref(["checkout", "returned"]);
  const searchInputOperation = ref("");
  const selectedOperation = ref("");
  const formSelectedOperation = ref("");
  const operationSearchInputRef = ref(null);

  const filteredOperations = ref([...operationItems.value]);

  const toggleOperationSearch = () => {
    isOperationSearchOpen.value = !isOperationSearchOpen.value;
  };

  const toggleFormOperationSearch = () => {
    isFormOperationSearchOpen.value = !isFormOperationSearchOpen.value;
  };

  const updateFilteredOperations = () => {
    const searchTerm = searchInputOperation.value.trim().toLowerCase();
    if (!searchTerm) {
      filteredOperations.value = [...operationItems.value];
      return;
    }
    filteredOperations.value = operationItems.value.filter((item) =>
      item.toLowerCase().includes(searchTerm)
    );
  };

  const selectOperation = (operation) => {
    selectedOperation.value = operation;
    isOperationSearchOpen.value = false;
  };

  const selectOperationForm = (operation) => {
    formSelectedOperation.value = operation;
    isFormOperationSearchOpen.value = false;
  };

  const handleOperationClickOutside = (event) => {
    if (
      !event.target.closest(".dropdown-operation") &&
      event.target !== operationSearchInputRef.value
    ) {
      isOperationSearchOpen.value = false;
    }
    if (
      !event.target.closest(".dropdown-operationForm") &&
      event.target !== operationSearchInputRef.value
    ) {
      isFormOperationSearchOpen.value = false;
    }
  };

  onMounted(async () => {
    document.addEventListener("click", handleOperationClickOutside);
  });

  onUnmounted(() => {
    document.removeEventListener("click", handleOperationClickOutside);
  });

  return {
    isOperationSearchOpen,
    isFormOperationSearchOpen,
    operationItems,
    filteredOperations,
    searchInputOperation,
    selectedOperation,
    operationSearchInputRef,
    toggleOperationSearch,
    toggleFormOperationSearch,
    updateFilteredOperations,
    selectOperation,
    formSelectedOperation,
    selectOperationForm,
  };
}
