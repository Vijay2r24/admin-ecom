import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from "react-router-dom";
import { TitleProvider } from "./context/TitleContext";
import { AllDataProvider } from "./context/AllDataContext";
import LocationDataProvider from "./context/LocationDataProvider";
import ProtectedRoute from './components/ProtectedRoute';
import NotAuthorized from './pages/NotAuthorized';
import { getPermissionCode } from './utils/permissionUtils';
import { Provider } from "react-redux";
import { store } from "./store/index";
import { MODULES, PERMISSIONS } from './contants/constants';

// Direct imports instead of lazy loading
import Layout from "./layout/Layout";
import Browse from "./pages/browse/Browse";
import Dashboard from "./pages/dashboard/Dashboard";
import Users from "./pages/Users";
import Orders from "./pages/orders/OrderList";
import AddUser from "./pages/AddUser";
import ProductList from "./pages/products/ProductList";
import Addproduct from "./pages/products/AddProductForm";
import ProfileDetails from "./pages/ProfileDetails";
import Stores from "./pages/Stores";
import AddStore from "./pages/AddStore";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import AddUserRole from "./pages/AddUserRole";
import Banners from "./pages/Banners";
import Bannerscreate from "./pages/BannersCreate";
import UserRoles from "../src/pages/UserRolesList";
import OrderDetailPage from "./pages/orders/OrderView";
import CreateBrand from "./pages/browse/brands/CreateBrand";
import CreateCategory from "./pages/browse/categories/CreateCategory";
import CreateAttributeType from "./pages/browse/attributeTypes/CreateAttributeType";
import CreateColor from "./pages/browse/colors/CreateColor";
import CreateAttribute from "./pages/browse/AttributeTypeValues/CreateAttributeTypeValuesList";
import CreateProductGroup from "./pages/browse/productGroups/CreateProductGroup";
import ActiveBanners from "./pages/ActiveBannersWithSequence";
import ProductDetails from "./pages/products/ProductDetails";
import Payments from './pages/payments/Payments';
import PaymentDetailsWrapper from './pages/payments/PaymentDetails';
import NotFound from "./components/NotFound";
import ScrollToTop from './components/ScrollToTop';

const dashboardPermission = getPermissionCode(MODULES.DASHBOARD, PERMISSIONS.VIEW_DASHBOARD);

const ordersPermission = getPermissionCode(MODULES.ORDER, PERMISSIONS.VIEW_ORDERS);
const orderDetailPermission = getPermissionCode(MODULES.ORDER, PERMISSIONS.VIEW_ORDERS);

const storesPermission = getPermissionCode(MODULES.STORE, PERMISSIONS.VIEW_STORE);
const addStorePermission = getPermissionCode(MODULES.STORE, PERMISSIONS.ADD_STORE);
const editStorePermission = getPermissionCode(MODULES.STORE, PERMISSIONS.UPDATE_STORE);

const usersPermission = getPermissionCode(MODULES.USER, PERMISSIONS.VIEW_USER);
const addUserPermission = getPermissionCode(MODULES.USER, PERMISSIONS.ADD_USER);
const editUserPermission = getPermissionCode(MODULES.USER, PERMISSIONS.UPDATE_USER);

const userRolesPermission = getPermissionCode(MODULES.ROLE, PERMISSIONS.VIEW_ROLE);
const addUserRolePermission = getPermissionCode(MODULES.ROLE, PERMISSIONS.ADD_ROLE);
const editUserRolePermission = getPermissionCode(MODULES.ROLE, PERMISSIONS.UPDATE_ROLE);

const bannersPermission = getPermissionCode(MODULES.CONTENT, PERMISSIONS.VIEW_BANNERS);
const bannersCreatePermission = getPermissionCode(MODULES.CONTENT, PERMISSIONS.CREATE_BANNER);
const bannersEditPermission = getPermissionCode(MODULES.CONTENT, PERMISSIONS.UPDATE_BANNER);
const notificationsPermission = getPermissionCode(MODULES.CONTENT, PERMISSIONS.SEND_NOTIFICATION);

const productsPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_PRODUCTS);
const addProductPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.CREATE_PRODUCT);
const editProductPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_PRODUCT);

const viewBrandPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_BRANDS);
const updateBrandPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_BRAND);

const viewCategoryPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_CATEGORIES);
const updateCategoryPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_CATEGORY);

const viewAttributeTypePermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_ATTRIBUTE_TYPES);
const updateAttributeTypePermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_ATTRIBUTE_TYPE);

const viewColorPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_COLOURS);
const updateColorPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_COLOUR);

const viewAttributePermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_ATTRIBUTES);
const updateAttributePermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_ATTRIBUTE);

const viewProductGroupPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.VIEW_PRODUCT_GROUPS);
const updateProductGroupPermission = getPermissionCode(MODULES.PRODUCT, PERMISSIONS.UPDATE_PRODUCT_GROUP);

const App = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <Provider store={store}>
      <AllDataProvider>
        <TitleProvider>
          <LocationDataProvider>
            {/* Removed Suspense wrapper since we're not using lazy loading anymore */}
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Login />} />

              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute permissionCode={dashboardPermission}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Browse/Product Setup */}
              <Route
                path="/browse"
                element={
                  <ProtectedRoute permissionCode={productsPermission}>
                    <Browse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute permissionCode={notificationsPermission}>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/payment-details/:id" 
                element={
                  <ProtectedRoute permissionCode={notificationsPermission}>
                    <PaymentDetailsWrapper />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/activeBanners"
                element={
                  <ProtectedRoute permissionCode={productsPermission}>
                    <ActiveBanners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editbrand/:id"
                element={
                  <ProtectedRoute permissionCode={updateBrandPermission}>
                    <CreateBrand />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editcatagiry/:id"
                element={
                  <ProtectedRoute permissionCode={updateCategoryPermission}>
                    <CreateCategory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editattributetype/:id"
                element={
                  <ProtectedRoute permissionCode={updateAttributeTypePermission}>
                    <CreateAttributeType />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editcolor/:id"
                element={
                  <ProtectedRoute permissionCode={updateColorPermission}>
                    <CreateColor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editattribute/:id"
                element={
                  <ProtectedRoute permissionCode={updateAttributePermission}>
                    <CreateAttribute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse/editgroup/:id"
                element={
                  <ProtectedRoute permissionCode={updateProductGroupPermission}>
                    <CreateProductGroup />
                  </ProtectedRoute>
                }
              />

              {/* Orders */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute permissionCode={ordersPermission}>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:orderId"
                element={
                  <ProtectedRoute permissionCode={orderDetailPermission}>
                    <OrderDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* User Roles */}
              <Route
                path="/userRoles"
                element={
                  <ProtectedRoute permissionCode={userRolesPermission}>
                    <UserRoles />
                  </ProtectedRoute>
                }
              />

              {/* Products */}
              <Route
                path="/productList"
                element={
                  <ProtectedRoute permissionCode={productsPermission}>
                    <ProductList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Addproduct"
                element={
                  <ProtectedRoute permissionCode={addProductPermission}>
                    <Addproduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-product/:productId?"
                element={
                  <ProtectedRoute permissionCode={editProductPermission}>
                    <Addproduct />
                  </ProtectedRoute>
                }
              />

              {/* Banners */}
              <Route
                path="/banners-create"
                element={
                  <ProtectedRoute permissionCode={bannersCreatePermission}>
                    <Bannerscreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/banners-edit/:bannerId?"
                element={
                  <ProtectedRoute permissionCode={bannersEditPermission}>
                    <Bannerscreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/banners"
                element={
                  <ProtectedRoute permissionCode={bannersPermission}>
                    <Banners />
                  </ProtectedRoute>
                }
              />

              {/* Profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileDetails />
                  </ProtectedRoute>
                }
              />

              {/* User Role Management */}
              <Route
                path="/addUserRole"
                element={
                  <ProtectedRoute permissionCode={addUserRolePermission}>
                    <AddUserRole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-UserRole/:roleId"
                element={
                  <ProtectedRoute permissionCode={editUserRolePermission}>
                    <AddUserRole />
                  </ProtectedRoute>
                }
              />

              {/* Stores */}
              <Route
                path="/stores"
                element={
                  <ProtectedRoute permissionCode={storesPermission}>
                    <Stores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-store"
                element={
                  <ProtectedRoute permissionCode={addStorePermission}>
                    <AddStore />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editStore/:id"
                element={
                  <ProtectedRoute permissionCode={editStorePermission}>
                    <AddStore />
                  </ProtectedRoute>
                }
              />

              {/* Users */}
              <Route
                path="/add-user"
                element={
                  <ProtectedRoute permissionCode={addUserPermission}>
                    <AddUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editUser/:id"
                element={
                  <ProtectedRoute permissionCode={editUserPermission}>
                    <AddUser />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute permissionCode={usersPermission}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              {/* Notifications */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute permissionCode={notificationsPermission}>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/productdetails/:productId?"
                element={
                  <ProtectedRoute>
                    <ProductDetails />
                  </ProtectedRoute>
                }
              />

              {/* Not Authorized */}
              <Route path="/not-authorized" element={<NotAuthorized />} />

              {/* 404 Not Found - Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LocationDataProvider>
        </TitleProvider>
      </AllDataProvider>
    </Provider>
  );
};

export default App;