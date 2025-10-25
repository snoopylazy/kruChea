import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';

export const createDefaultAdminPermissions = () => {
  return {
    hrCompanyAssetDashboard: true,

    hrCategoryView: true,
    hrCategoryCreate: true,
    hrCategoryUpdate: true,
    hrCategoryDelete: true,
    hrCategoryAll: true,
    hrCategoryReview: true,

    hrAssetView: true,
    hrAssetCreate: true,
    hrAssetUpdate: true,
    hrAssetDelete: true,
    hrAssetAll: true,
    hrAssetCopy: true,

    hrAssetTransactionView: true,
    hrAssetTransactionCreate: true,
    hrAssetTransactionUpdate: true,
    hrAssetTransactionDelete: true,
    hrAssetTransactionAll: true,
    hrAssetTransactionChecked: true,
    hrAssetTransactionConfirmed: true,
    hrAssetTransactionApproved: true,
    hrAssetTransactionRejected: true,

    hrPurchaseAssetView: true,
    hrPurchaseAssetCreate: true,
    hrPurchaseAssetUpdate: true,
    hrPurchaseAssetDelete: true,
    hrPurchaseAssetAll: true,

    hrAssetTransferStockView: true,
    hrAssetTransferStockCreate: true,
    hrAssetTransferStockUpdate: true,
    hrAssetTransferStockDelete: true,
    hrAssetTransferStockAll: true,

    hrPurchaseAssetHistoryView: true,
    hrPurchaseAssetHistoryCreate: true,
    hrPurchaseAssetHistoryUpdate: true,
    hrPurchaseAssetHistoryDelete: true,
    hrPurchaseAssetHistoryAll: true,

    hrCompanyAssetReportView: true
  };
};

export const useUserPermission = () => {
  const branchStore = useBranchStore();

  // Dashboard permissions
  const canAccessDashboard = () => {
    return hasPermission('hrCompanyAssetDashboard');
  };

  // Category permissions
  const canAccessCategory = () => {
    return hasPermission('hrCategoryAll') || hasPermission('hrCategoryView');
  };

  const canViewCategory = () => {
    return hasPermission('hrCategoryView') || hasPermission('hrCategoryAll');
  };

  const canCreateCategory = () => {
    return hasPermission('hrCategoryCreate') || hasPermission('hrCategoryAll');
  };

  const canUpdateCategory = () => {
    return hasPermission('hrCategoryUpdate') || hasPermission('hrCategoryAll');
  };

  const canDeleteCategory = () => {
    return hasPermission('hrCategoryDelete') || hasPermission('hrCategoryAll');
  };

  const canReviewCategory = () => {
    return hasPermission('hrCategoryReview') || hasPermission('hrCategoryAll');
  };

  // Asset permissions
  const canAccessAsset = () => {
    return hasPermission('hrAssetAll') || hasPermission('hrAssetView');
  };

  const canViewAsset = () => {
    return hasPermission('hrAssetView') || hasPermission('hrAssetAll');
  };

  const canCreateAsset = () => {
    return hasPermission('hrAssetCreate') || hasPermission('hrAssetAll');
  };

  const canUpdateAsset = () => {
    return hasPermission('hrAssetUpdate') || hasPermission('hrAssetAll');
  };

  const canDeleteAsset = () => {
    return hasPermission('hrAssetDelete') || hasPermission('hrAssetAll');
  };

  const canCopyAsset = () => {
    return hasPermission('hrAssetCopy') || hasPermission('hrAssetAll');
  };

  // Asset Transaction permissions
  const canAccessTransaction = () => {
    return hasPermission('hrAssetTransactionAll') || hasPermission('hrAssetTransactionView');
  };

  const canViewTransaction = () => {
    return hasPermission('hrAssetTransactionView') || hasPermission('hrAssetTransactionAll');
  };

  const canCreateTransaction = () => {
    return hasPermission('hrAssetTransactionCreate') || hasPermission('hrAssetTransactionAll');
  };

  const canUpdateTransaction = () => {
    return hasPermission('hrAssetTransactionUpdate') || hasPermission('hrAssetTransactionAll');
  };

  const canDeleteTransaction = () => {
    return hasPermission('hrAssetTransactionDelete') || hasPermission('hrAssetTransactionAll');
  };

  const canCheckTransaction = () => {
    return hasPermission('hrAssetTransactionChecked') || hasPermission('hrAssetTransactionAll');
  };

  const canConfirmTransaction = () => {
    return hasPermission('hrAssetTransactionConfirmed') || hasPermission('hrAssetTransactionAll');
  };

  const canApproveTransaction = () => {
    return hasPermission('hrAssetTransactionApproved') || hasPermission('hrAssetTransactionAll');
  };

  const canRejectTransaction = () => {
    return hasPermission('hrAssetTransactionRejected') || hasPermission('hrAssetTransactionAll');
  };

  // Purchase Asset permissions
  const canAccessPurchase = () => {
    return hasPermission('hrPurchaseAssetAll') || hasPermission('hrPurchaseAssetView');
  };

  const canViewPurchase = () => {
    return hasPermission('hrPurchaseAssetView') || hasPermission('hrPurchaseAssetAll');
  };

  const canCreatePurchase = () => {
    return hasPermission('hrPurchaseAssetCreate') || hasPermission('hrPurchaseAssetAll');
  };

  const canUpdatePurchase = () => {
    return hasPermission('hrPurchaseAssetUpdate') || hasPermission('hrPurchaseAssetAll');
  };

  const canDeletePurchaseAsset = () => {
    return hasPermission('hrPurchaseAssetDelete') || hasPermission('hrPurchaseAssetAll');
  };

  // Transfer Stock permissions
  const canAccessTransferStock = () => {
    return hasPermission('hrAssetTransferStockAll') || hasPermission('hrAssetTransferStockView');
  };

  const canViewTransferStock = () => {
    return hasPermission('hrAssetTransferStockView') || hasPermission('hrAssetTransferStockAll');
  };

  const canCreateTransferStock = () => {
    return hasPermission('hrAssetTransferStockCreate') || hasPermission('hrAssetTransferStockAll');
  };

  const canUpdateTransferStock = () => {
    return hasPermission('hrAssetTransferStockUpdate') || hasPermission('hrAssetTransferStockAll');
  };

  const canDeleteTransferStock = () => {
    return hasPermission('hrAssetTransferStockDelete') || hasPermission('hrAssetTransferStockAll');
  };

  // Purchase History permissions
  const canAccessPurchaseHistory = () => {
    return hasPermission('hrPurchaseAssetHistoryAll') || hasPermission('hrPurchaseAssetHistoryView');
  };

  const canViewPurchaseHistory = () => {
    return hasPermission('hrPurchaseAssetHistoryView') || hasPermission('hrPurchaseAssetHistoryAll');
  };

  const canCreatePurchaseHistory = () => {
    return hasPermission('hrPurchaseAssetHistoryCreate') || hasPermission('hrPurchaseAssetHistoryAll');
  };

  const canUpdatePurchaseHistory = () => {
    return hasPermission('hrPurchaseAssetHistoryUpdate') || hasPermission('hrPurchaseAssetHistoryAll');
  };

  const canDeletePurchaseHistory = () => {
    return hasPermission('hrPurchaseAssetHistoryDelete') || hasPermission('hrPurchaseAssetHistoryAll');
  };

  // Report permissions
  const canAccessReport = () => {
    return hasPermission('hrCompanyAssetReportView');
  };

  // Utility functions
  const clearPermissionsCache = () => {
    branchStore.clearPermissions();
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('permissionsTimestamp');
  };

  const isAdminOrSuperAdmin = () => {
    const result = branchStore.isAdminOrSuperAdmin;
    return result;
  };

  const hasPermission = (permissionName) => {
    const result = branchStore.hasPermission(permissionName);
    return result;
  };

  const loadUserPermissions = async (userId, forceRefresh = false) => {
    try {
      if (!userId) {
        userId = branchStore.getUserId;
      }

      if (forceRefresh) {
        clearPermissionsCache();
      }

      const params = {
        dynamicConditions: JSON.stringify([
          { field: '_id', operator: '==', value: userId }
        ]),
        populate: JSON.stringify(['roleId'])
      };

      const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocsThree/User`, { params, headers: API_CONFIGS.headers });

      if (response.data && response.data.data && response.data.data.length > 0) {
        const userData = response.data.data[0];
        const userMainRole = userData.mainRole;

        branchStore.setUserRole(userMainRole);

        if (userMainRole === 'Admin' || userMainRole === 'Super Admin') {
          const adminPermissions = createDefaultAdminPermissions();
          branchStore.setPermissions(adminPermissions);
        } else if (userData.roleId && userData.roleId.permission) {
          branchStore.setPermissions(userData.roleId.permission);
        } else {
          console.warn("No permissions found for user");
        }
      }
    } catch (error) {
      console.error("Error loading user permissions:", error);
    }
  };

  return {
    // Dashboard
    canAccessDashboard,

    // Category
    canAccessCategory,
    canViewCategory,
    canCreateCategory,
    canUpdateCategory,
    canDeleteCategory,
    canReviewCategory,

    // Asset
    canAccessAsset,
    canViewAsset,
    canCreateAsset,
    canUpdateAsset,
    canDeleteAsset,
    canCopyAsset,

    // Transaction
    canAccessTransaction,
    canViewTransaction,
    canCreateTransaction,
    canUpdateTransaction,
    canDeleteTransaction,
    canCheckTransaction,
    canConfirmTransaction,
    canApproveTransaction,
    canRejectTransaction,

    // Purchase
    canAccessPurchase,
    canViewPurchase,
    canCreatePurchase,
    canUpdatePurchase,
    canDeletePurchaseAsset,

    // Transfer Stock
    canAccessTransferStock,
    canViewTransferStock,
    canCreateTransferStock,
    canUpdateTransferStock,
    canDeleteTransferStock,

    // Purchase History
    canAccessPurchaseHistory,
    canViewPurchaseHistory,
    canCreatePurchaseHistory,
    canUpdatePurchaseHistory,
    canDeletePurchaseHistory,

    // Report
    canAccessReport,

    // Utility functions
    clearPermissionsCache,
    isAdminOrSuperAdmin,
    hasPermission,
    loadUserPermissions,
    createDefaultAdminPermissions
  };
};
