import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import { debounce } from 'lodash';
import { onMounted, onUnmounted, ref } from 'vue';

export function useEmployeeDropdown() {
  const branchStore = useBranchStore();
  const isEmployeeSearchOpen = ref(false);
  const isFormEmployeeSearchOpen = ref(false);
  const employeeData = ref([]);
  const filteredEmployees = ref([]);
  const searchInputEmployee = ref('');
  const selectedEmployee = ref(null);
  const formSelectedEmployee = ref(null);
  const isLoadingEmployees = ref(false);
  const employeeSearchInputRef = ref(null);


  const fetchEmployees = async (searchTerm = '') => {
    isLoadingEmployees.value = true;
    try {
      const params = {
        dynamicConditions: JSON.stringify([
          { field: "branchId", operator: "==", value: branchStore.branchId },
          { field: "status", operator: "==", value: 'active' }
        ])
      }
      const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/Employee`, { params, headers: API_CONFIGS.headers });
      employeeData.value = response.data.data || [];
      filteredEmployees.value = employeeData.value;
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      isLoadingEmployees.value = false;
    }
  };

  const updateFilteredEmployees = debounce(() => {
    if (!searchInputEmployee.value) {
      filteredEmployees.value = employeeData.value;
    } else {
      const searchTerm = searchInputEmployee.value.toLowerCase().trim();
      filteredEmployees.value = employeeData.value.filter(employee =>
        employee.khName.toLowerCase().includes(searchTerm)
      );
    }
  }, 300);

  const getEmployee = (id) => {
    if (!id) return '';
    const employee = employeeData.value.find(emp => emp._id === id);
    return employee ? employee.khName : 'Unknown Employee';
  };

  const toggleEmployeeSearch = () => {
    isEmployeeSearchOpen.value = !isEmployeeSearchOpen.value;
  };

  const toggleFormEmployeeSearch = () => {
    isFormEmployeeSearchOpen.value = !isFormEmployeeSearchOpen.value;
  };

  const selectEmployee = (employeeId) => {
    selectedEmployee.value = employeeId;
    isEmployeeSearchOpen.value = false;
  };

  const selectedFormEmployee = (employeeId) => {
    formSelectedEmployee.value = employeeId; // Store selected employee ID
    isFormEmployeeSearchOpen.value = false;
  };

  const handleEmployeeClickOutside = (event) => {
    if (
      !event.target.closest('.dropdown-employeeForm') &&
      event.target !== employeeSearchInputRef.value
    ) {
      isFormEmployeeSearchOpen.value = false;
    }
  };

  onMounted(async () => {
    await fetchEmployees(); // Initial fetch
    document.addEventListener('click', handleEmployeeClickOutside);
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleEmployeeClickOutside);
  });

  return {
    isEmployeeSearchOpen,
    isFormEmployeeSearchOpen,
    employeeData,
    filteredEmployees,
    searchInputEmployee,
    selectedEmployee,
    formSelectedEmployee,
    isLoadingEmployees,
    employeeSearchInputRef,
    getEmployee,
    toggleEmployeeSearch,
    toggleFormEmployeeSearch,
    selectEmployee,
    selectedFormEmployee,
    fetchEmployees,
    updateFilteredEmployees,
  };
}