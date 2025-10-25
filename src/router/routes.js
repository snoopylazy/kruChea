import { isAuthenticated } from "@/composable/checkAuthentication";
import { useUserPermission } from "@/composable/userPermission";
import { useBranchStore } from "@/store/branchStore";
import { createRouter, createWebHistory } from "vue-router";
import ApproveFormMobile from "../components/Approve-Mobile.vue";
import OperationAssetReturnMobile from "../components/CompanyAssetTransactionMobile.vue";
import OperationAssetReturn from "../components/CompanyAssetTransactionReturn.vue";
import CopyAssetFormMobile from "../components/CopyAssetsForm-Mobile.vue";
import CreateAssetFormMobile from "../components/CreateAssetForm-Mobile.vue";
import CreateCategoryFormMobile from "../components/CreateCategoryForm-Mobile.vue";
import CreateTransactionAssetsFormMobile from "../components/CreateTransactionAssetsForm-Moblie.vue";
import Profile from "../components/Profile.vue";
import PurchaseAssetDetailMobile from "../components/Purchase-Assets-Detail-Mobile.vue";
import PurchaseAssetsFormMobile from "../components/Purchase-Assets_Form-Mobile.vue";
import PurchaseAssetHistoryDetailMobile from "../components/PurchaseAssetHistoryDetail-Mobile.vue";
import StockTransferDetailMobile from "../components/StockTransferDetail-Mobile.vue";
import CreateStockTransferFormMobile from "../components/StockTransferForm-Mobile.vue";
import Dashboard from "../views/dashboard/index.vue";
import DashboardMobile from "../views/Mobile/dashboard/index.vue";
import Permission from "../views/permission/Permission.vue";
import Category from "../views/products/Category.vue";
import OperationAssets from "../views/products/OperationProducts.vue";
import CompanyAsset from "../views/products/ProductList.vue";
import PurchaseAssets from "../views/purchaseAssets/purchaseAssets.vue";
import PurchaseAssetsHistory from "../views/purchaseAssetsHistory/purchaseAssetsHistory.vue";
import ReportAsset from "../views/reports/reportAssets.vue";
import HistoryPurchase from "../views/reports/reportPurchaseHistroy.vue";
import ReturnAsset from "../views/reports/reportTransactionAssets.vue";
import TransferHistory from "../views/reports/reportTransferStock.vue";
import StockTransfer from "../views/stockTransfer/stockTransfer.vue";



const routes = [
  {
    name: "Default",
    path: "/",
    component: () => import("../views/Default.vue"),
    children: [
      {
        name: "dashboard",
        path: "/dashboard",
        component: Dashboard,
        meta: {
          requiresPermission: "hrCompanyAssetDashboard",
        },
      },
      {
        name: "dashboard-mobile",
        path: "/dashboard-mobile",
        component: DashboardMobile,
      },
      {
        name: "profile",
        path: "/profile",
        component: Profile,
      },
      {
        name: "category",
        path: "/category",
        component: Category,
        meta: { requiresPermission: ["hrCategoryAll", "hrCategoryView"] },
      },
      {
        name: "company-assets",
        path: "/company-assets",
        component: CompanyAsset,
        meta: { requiresPermission: ["hrAssetAll", "hrAssetView"] },
      },
      {
        name: "operation-assets",
        path: "/operation-assets",
        component: OperationAssets,
        meta: {
          requiresPermission: [
            "hrAssetTransactionAll",
            "hrAssetTransactionView",
          ],
        },
      },
      {
        name: "operation-assets-return",
        path: "/operation-assets-return",
        component: OperationAssetReturn,
        meta: {
          requiresPermission: [
            "hrAssetTransactionAll",
            "hrAssetTransactionView",
          ],
        },
      },
      {
        name: "operation-assets-return-mobile",
        path: "/operation-assets-return-mobile",
        component: OperationAssetReturnMobile,
        meta: {
          requiresPermission: [
            "hrAssetTransactionAll",
            "hrAssetTransactionView",
          ],
        },
      },
      {
        name: "stock-transfer",
        path: "/stock-transfer",
        component: StockTransfer,
        meta: {
          requiresPermission: [
            "hrAssetTransferStockAll",
            "hrAssetTransferStockView",
          ],
        },
      },
      {
        name: "purchase-assets",
        path: "/purchase-assets",
        component: PurchaseAssets,
        meta: {
          requiresPermission: ["hrPurchaseAssetAll", "hrPurchaseAssetView"],
        },
      },
      {
        name: "purchase-assets-history",
        path: "/purchase-assets-history",
        component: PurchaseAssetsHistory,
        meta: {
          requiresPermission: [
            "hrPurchaseAssetHistoryAll",
            "hrPurchaseAssetHistoryView",
          ],
        },
      },
      {
        name: "report-assets",
        path: "/report-assets",
        component: ReportAsset,
        meta: { requiresPermission: ["hrCompanyAssetReportView"] },
      },
      {
        name: "return-assets",
        path: "/return-assets",
        component: ReturnAsset,
        meta: { requiresPermission: ["hrCompanyAssetReportView"] },
      },
      {
        name: "transfer-history",
        path: "/transfer-history",
        component: TransferHistory,
        meta: { requiresPermission: ["hrCompanyAssetReportView"] },
      },
      {
        name: "history-purchase",
        path: "/history-purchase",
        component: HistoryPurchase,
        meta: { requiresPermission: ["hrCompanyAssetReportView"] },
      },
      {
        name: "permission",
        path: "/permission",
        component: Permission,
        meta: { requiresAdmin: true },
      },
      // Mobile and utility routes below are left unprotected, add meta if needed
      {
        name: "purchase-asset-history-detail-mobile",
        path: "/purchase-asset-history-detail-mobile/:id?",
        component: PurchaseAssetHistoryDetailMobile
      },
      {
        name: "create-category-form-mobile",
        path: "/create-category-form-mobile/:id?",
        component: CreateCategoryFormMobile,
        props: true,
      },
      {
        name: "create-asset-from-mobile",
        path: "/create-asset-form-mobile/:id?",
        component: CreateAssetFormMobile,
      },
      {
        name: "copy-asset-form-mobile",
        path: "/copy-asset-form-mobile",
        component: CopyAssetFormMobile,
      },
      {
        name: "create-transaction-asset-form-mobile",
        path: "/create-transaction-asset-form-mobile",
        component: CreateTransactionAssetsFormMobile,
      },
      {
        name: "create-stock-transfer-from-mobile",
        path: "/create-stock-transfer-from-mobile",
        component: CreateStockTransferFormMobile,
      },
      {
        name: "stock-transfer-detail-mobile",
        path: "/stock-transfer-detail-mobile/:id?",
        component: StockTransferDetailMobile,
      },
      {
        name: "create-purchase-assets-mobile",
        path: "/create-purchase-assets-mobile",
        component: PurchaseAssetsFormMobile,
      },
      {
        name: "purchase-asset-detail-mobile",
        path: "/purchase-asset-detail-mobile/:id?",
        component: PurchaseAssetDetailMobile,
      },
      {
        name: "approve-form-mobile",
        path: "/approve-form-mobile/:id?",
        component: ApproveFormMobile,
        props: true,
      },
    ],
  },
  {
    path: "/login",
    component: () => import("../views/Login.vue"),
    name: "Login",
  },
  {
    path: "/notFound",
    component: () => import("../views/Not-Found.vue"),
    name: "notFound",
  },
  // Catch-all route for undefined pages
  {
    path: "/:pathMatch(.*)*",
    name: "CatchAll",
    beforeEnter: async (to, from, next) => {
      // Try to redirect to accessible route instead of notFound
      const defaultRoute = await getDefaultAccessibleRoute();
      if (defaultRoute) {
        next(defaultRoute);
      } else {
        next("/notFound");
      }
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Helper function to find the first accessible route based on permissions
async function getDefaultAccessibleRoute() {
  try {
    const { hasPermission, isAdminOrSuperAdmin, loadUserPermissions } =
      useUserPermission();

    const branchStore = useBranchStore();
    const userId = branchStore.getUserId;

    // Load user permissions if not already loaded - avoid reloading if already cached
    if (userId && !branchStore.getUserPermissions) {
      await loadUserPermissions(userId, false);
    }

    // Define route priority order with their required permissions
    const routePriority = [
      { path: "/dashboard", permissions: ["hrCompanyAssetDashboard"] },
      { path: "/category", permissions: ["hrCategoryAll", "hrCategoryView"] },
      { path: "/company-assets", permissions: ["hrAssetAll", "hrAssetView"] },
      {
        path: "/operation-assets",
        permissions: ["hrAssetTransactionAll", "hrAssetTransactionView"],
      },
      {
        path: "/stock-transfer",
        permissions: ["hrAssetTransferStockAll", "hrAssetTransferStockView"],
      },
      {
        path: "/purchase-assets",
        permissions: ["hrPurchaseAssetAll", "hrPurchaseAssetView"],
      },
      {
        path: "/purchase-assets-history",
        permissions: [
          "hrPurchaseAssetHistoryAll",
          "hrPurchaseAssetHistoryView",
        ],
      },
      { path: "/report-assets", permissions: ["hrCompanyAssetReportView"] },
      { path: "/return-assets", permissions: ["hrCompanyAssetReportView"] },
      { path: "/transfer-history", permissions: ["hrCompanyAssetReportView"] },
      { path: "/history-purchase", permissions: ["hrCompanyAssetReportView"] },
      { path: "/permission", permissions: [] }, // Admin routes handled separately
    ];

    // Check each route in priority order
    for (const route of routePriority) {
      if (route.path === "/permission" && isAdminOrSuperAdmin()) {
        return route.path;
      }

      if (route.permissions.length > 0) {
        const hasAccess =
          route.permissions.some((permission) => hasPermission(permission)) ||
          isAdminOrSuperAdmin();
        if (hasAccess) {
          return route.path;
        }
      }
    }

    // If no specific permissions found but user is admin, allow permission page
    if (isAdminOrSuperAdmin()) {
      return "/permission";
    }

    // If no accessible routes found, return null (will redirect to notFound)
    return null;
  } catch (error) {
    console.error("Error in getDefaultAccessibleRoute:", error);
    return null;
  }
}

router.beforeEach(async (to, from, next) => {
  // Skip processing for notFound and CatchAll routes to avoid infinite loops
  if (to.name === "notFound" || to.name === "CatchAll") {
    next();
    return;
  }

  const isAuth = await isAuthenticated();

  // Handle login redirect
  if (to.path === "/login") {
    if (isAuth) {
      const { hasPermission, isAdminOrSuperAdmin, loadUserPermissions } =
        useUserPermission();

      const branchStore = useBranchStore();
      // Only load permissions if not already cached
      if (branchStore.getUserId && !branchStore.getUserPermissions) {
        await loadUserPermissions(branchStore.getUserId, false);
      }

      const defaultRoute = await getDefaultAccessibleRoute();
      if (defaultRoute && defaultRoute !== "/login") {
        next(defaultRoute);
      } else {
        next();
      }
    } else {
      next();
    }
    return;
  }

  // Require authentication for non-login pages
  if (!isAuth) {
    next("/login");
    return;
  }

  const { hasPermission, isAdminOrSuperAdmin, loadUserPermissions } =
    useUserPermission();

  const branchStore = useBranchStore();

  // Load permissions for authenticated users - ONLY if not already loaded
  if (branchStore.getUserId && !branchStore.getUserPermissions) {
    await loadUserPermissions(branchStore.getUserId, false);
  }

  // Redirect /dashboard-mobile to desktop route if on desktop
  if (to.path === "/dashboard-mobile" && window.innerWidth >= 768) {
    const defaultRoute = await getDefaultAccessibleRoute();
    if (defaultRoute && defaultRoute !== "/dashboard-mobile") {
      next(defaultRoute);
    } else {
      next("/notFound");
    }
    return;
  }

  // Handle root redirect - redirect to first accessible route
  if (to.path === "/") {
    // Mobile: always go to dashboard-mobile
    if (window.innerWidth < 768) {
      next("/dashboard-mobile");
      return;
    }
    // Desktop: go to first accessible route
    const defaultRoute = await getDefaultAccessibleRoute();
    if (defaultRoute && defaultRoute !== "/") {
      next(defaultRoute);
    } else {
      next("/notFound");
    }
    return;
  }

  // Handle admin-only routes
  if (to.matched.some((record) => record.meta.requiresAdmin)) {
    if (isAdminOrSuperAdmin()) {
      next();
    } else {
      // Redirect to accessible route instead of notFound
      const defaultRoute = await getDefaultAccessibleRoute();
      if (defaultRoute && defaultRoute !== to.path) {
        next(defaultRoute);
      } else {
        next("/notFound");
      }
    }
    return;
  }

  // Handle permission-based routes
  if (to.matched.some((record) => record.meta.requiresPermission)) {
    const requiredPermissions = to.matched.find(
      (record) => record.meta.requiresPermission
    ).meta.requiresPermission;

    const checkPermissions = Array.isArray(requiredPermissions)
      ? requiredPermissions.some((permission) => hasPermission(permission))
      : hasPermission(requiredPermissions);

    if (checkPermissions || isAdminOrSuperAdmin()) {
      next();
    } else {
      // Redirect to accessible route instead of notFound
      const defaultRoute = await getDefaultAccessibleRoute();
      if (defaultRoute && defaultRoute !== to.path) {
        next(defaultRoute);
      } else {
        next("/notFound");
      }
    }
    return;
  }

  // Allow access to routes without permission requirements (like profile, mobile routes, etc.)
  next();
});

export default router;
