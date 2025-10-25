// store/branch.js
import { defineStore } from 'pinia';

export const useBranchStore = defineStore('branch', {
  state: () => ({
    branchId: null,
    userId: null,
    branchName: null,
    serverDate: null,
    userRole: null,
    userBranches: [],
    permissions: {},
    userName: null,
    displayName: null,
    mainBranchId: null,
  }),
  actions: {
    setBranchId(id) {
      this.branchId = id;
    },

    setMainBranchId(id) {
      this.mainBranchId = id;
    },

    setServerDate(date) {
      this.serverDate = date;
    },

    setUserId(id) {
      this.userId = id;
    },

    setUserName(name) {
      this.displayName = name;
    },

    setBranchName(name) {
      this.branchName = name;
    },
  
    setUserRole(role) {
      this.userRole = role;
    },
    
    setUserBranches(branches) {
      this.userBranches = branches;
    },
    
    clearBranchId() {
      this.branchId = null;
    },
    
    clearUserId() {
      this.userId = null;
    },

    clearBranchName() {
      this.branchName = null;
    },

    clearServerDate() {
      this.serverDate = null;
    },
    
    clearUserRole() {
      this.userRole = null;
    },
    
    clearUserName() {
      this.displayName = null;
    },
    
    clearUserBranches() {
      this.userBranches = [];
    },

    setSelectedBranch(branch) {
      if (!branch) return;
      this.branchId = branch._id;
      this.branchName = branch.abbreviation || branch.name;
      this.mainBranchId = branch.mainBranchId || null; //
    },

    setPermissions(perms) {
      this.permissions = { ...perms }; 
    },

    clearPermissions() {
      this.permissions = {};
    }
  },

  getters: {
    getBranchId: (state) => state.branchId,
    getUserId: (state) => state.userId,
    getUserName: (state) => state.displayName,
    getBranchName: (state) => state.branchName,
    getServerDate: (state) => state.serverDate,
    getUserRole: (state) => state.userRole,
    getUserBranches: (state) => state.userBranches,
    getUserPermissions: (state) => state.permissions || {},
    getUserMainRole: (state) => state.userRole,
    getMainBranchId: (state) => state.mainBranchId,
    
    hasPermission: (state) => (permission) => {
      return state.permissions && state.permissions[permission] === true;
    },
    
    isAdminOrSuperAdmin: (state) => {
      return state.userRole === 'Admin' || state.userRole === 'Super Admin';
    },

    // HR Asset Management Dashboard
    canAccessDashboard: (state) => state.permissions?.hrCompanyAssetDashboard === true,

    // Category Permissions
    canAccessCategory: (state) => state.permissions?.hrCategoryAll === true || state.permissions?.hrCategoryView === true,
    canViewCategory: (state) => state.permissions?.hrCategoryView === true || state.permissions?.hrCategoryAll === true,
    canCreateCategory: (state) => state.permissions?.hrCategoryCreate === true || state.permissions?.hrCategoryAll === true,
    canUpdateCategory: (state) => state.permissions?.hrCategoryUpdate === true || state.permissions?.hrCategoryAll === true,
    canDeleteCategory: (state) => state.permissions?.hrCategoryDelete === true || state.permissions?.hrCategoryAll === true,

    // Asset Permissions
    canAccessAsset: (state) => state.permissions?.hrAssetAll === true || state.permissions?.hrAssetView === true,
    canViewAsset: (state) => state.permissions?.hrAssetView === true || state.permissions?.hrAssetAll === true,
    canCreateAsset: (state) => state.permissions?.hrAssetCreate === true || state.permissions?.hrAssetAll === true,
    canUpdateAsset: (state) => state.permissions?.hrAssetUpdate === true || state.permissions?.hrAssetAll === true,
    canDeleteAsset: (state) => state.permissions?.hrAssetDelete === true || state.permissions?.hrAssetAll === true,
    canCopyAsset: (state) => state.permissions?.hrAssetCopy === true || state.permissions?.hrAssetAll === true,

    // Asset Transaction Permissions
    canAccessAssetTransaction: (state) => state.permissions?.hrAssetTransactionAll === true || state.permissions?.hrAssetTransactionView === true,
    canViewAssetTransaction: (state) => state.permissions?.hrAssetTransactionView === true || state.permissions?.hrAssetTransactionAll === true,
    canCreateAssetTransaction: (state) => state.permissions?.hrAssetTransactionCreate === true || state.permissions?.hrAssetTransactionAll === true,
    canUpdateAssetTransaction: (state) => state.permissions?.hrAssetTransactionUpdate === true || state.permissions?.hrAssetTransactionAll === true,
    canDeleteAssetTransaction: (state) => state.permissions?.hrAssetTransactionDelete === true || state.permissions?.hrAssetTransactionAll === true,
    canCheckAssetTransaction: (state) => state.permissions?.hrAssetTransactionChecked === true || state.permissions?.hrAssetTransactionAll === true,
    canConfirmAssetTransaction: (state) => state.permissions?.hrAssetTransactionConfirmed === true || state.permissions?.hrAssetTransactionAll === true,
    canApproveAssetTransaction: (state) => state.permissions?.hrAssetTransactionApproved === true || state.permissions?.hrAssetTransactionAll === true,
    canRejectAssetTransaction: (state) => state.permissions?.hrAssetTransactionRejected === true || state.permissions?.hrAssetTransactionAll === true,

    // Purchase Asset Permissions
    canAccessPurchaseAsset: (state) => state.permissions?.hrPurchaseAssetAll === true || state.permissions?.hrPurchaseAssetView === true,
    canViewPurchaseAsset: (state) => state.permissions?.hrPurchaseAssetView === true || state.permissions?.hrPurchaseAssetAll === true,
    canCreatePurchaseAsset: (state) => state.permissions?.hrPurchaseAssetCreate === true || state.permissions?.hrPurchaseAssetAll === true,
    canUpdatePurchaseAsset: (state) => state.permissions?.hrPurchaseAssetUpdate === true || state.permissions?.hrPurchaseAssetAll === true,
    canDeletePurchaseAsset: (state) => state.permissions?.hrPurchaseAssetDelete === true || state.permissions?.hrPurchaseAssetAll === true,

    // Asset Transfer Stock Permissions
    canAccessAssetTransferStock: (state) => state.permissions?.hrAssetTransferStockAll === true || state.permissions?.hrAssetTransferStockView === true,
    canViewAssetTransferStock: (state) => state.permissions?.hrAssetTransferStockView === true || state.permissions?.hrAssetTransferStockAll === true,
    canCreateAssetTransferStock: (state) => state.permissions?.hrAssetTransferStockCreate === true || state.permissions?.hrAssetTransferStockAll === true,
    canUpdateAssetTransferStock: (state) => state.permissions?.hrAssetTransferStockUpdate === true || state.permissions?.hrAssetTransferStockAll === true,
    canDeleteAssetTransferStock: (state) => state.permissions?.hrAssetTransferStockDelete === true || state.permissions?.hrAssetTransferStockAll === true,

    // Purchase Asset History Permissions
    canAccessPurchaseAssetHistory: (state) => state.permissions?.hrPurchaseAssetHistoryAll === true || state.permissions?.hrPurchaseAssetHistoryView === true,
    canViewPurchaseAssetHistory: (state) => state.permissions?.hrPurchaseAssetHistoryView === true || state.permissions?.hrPurchaseAssetHistoryAll === true,
    canCreatePurchaseAssetHistory: (state) => state.permissions?.hrPurchaseAssetHistoryCreate === true || state.permissions?.hrPurchaseAssetHistoryAll === true,
    canUpdatePurchaseAssetHistory: (state) => state.permissions?.hrPurchaseAssetHistoryUpdate === true || state.permissions?.hrPurchaseAssetHistoryAll === true,
    canDeletePurchaseAssetHistory: (state) => state.permissions?.hrPurchaseAssetHistoryDelete === true || state.permissions?.hrPurchaseAssetHistoryAll === true,

    // Report Permissions
    canAccessReport: (state) => state.permissions?.hrCompanyAssetReportView === true,
  },
  persist: true, 
});
