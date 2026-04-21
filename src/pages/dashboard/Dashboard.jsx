import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Star,
  Clock,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTitle } from "../../context/TitleContext";
import DateTimeRangePickerComponent from "../../components/CustomDatePicker"; // Updated import
import {
  GET_TOTAL_REVENUE,
  GET_TOTAL_ORDERS,
  GET_TOTAL_CUSTOMERS,
  GET_RECENT_ORDERS,
  GET_TOP_PRODUCTS,
} from "../../contants/apiRoutes";
import { apiGet } from "../../utils/ApiUtils";
import Loader from "../../components/Loader";
import SkeletonLoader from "../../components/SkeletonLoader";
import {
  LOCALE,
  ORDER_STATUS,
  DASHBOARD_DEFAULT_LIMIT,
  CURRENCY,
  STATUS,
} from "../../contants/constants";
import dayjs from "dayjs";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setTitle } = useTitle();

  // State for API data
  const [metrics, setMetrics] = useState([
    {
      title: t("DASHBOARD.TOTALREVENUE"),
      value: "₹0",
      change: "+0%",
      trend: "up",
      icon: IndianRupee,
      color: "bg-green-100 text-green-600",
      comparisonText: t("DASHBOARD.COMPARISONTEXT"),
    },
    {
      title: t("DASHBOARD.TOTALORDERS"),
      value: "0",
      change: "+0%",
      trend: "up",
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
      comparisonText: t("DASHBOARD.COMPARISONTEXT"),
    },
    {
      title: t("DASHBOARD.TOTALCUSTOMERS"),
      value: "0",
      change: "+0%",
      trend: "up",
      icon: Users,
      color: "bg-purple-100 text-purple-600",
      comparisonText: t("DASHBOARD.COMPARISONTEXT"),
    },
    {
      title: t("DASHBOARD.AVERAGEORDERS"),
      value: "₹0",
      change: "+0%",
      trend: "up",
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
      comparisonText: t("DASHBOARD.COMPARISONTEXT"),
    },
  ]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range state with DateTimeRangePickerComponent format
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(6, 'day').startOf('day'), // Last 7 days by default
    end: dayjs().endOf('day')
  });

  const [displayText, setDisplayText] = useState("");
  const [nTopProductsPage, setTopProductsPage] = useState(1);
  const [nSelectedProduct, setSelectedProduct] = useState(null);
  const [bShowProductModal, setShowProductModal] = useState(false);

  const paginatedTopProducts = topProducts;

  // Format date to ISO string for API
  const formatDateToAPI = (date) => {
    if (!date) return null;
    
    if (date?.$isDayjsObject) {
      return date.toISOString();
    }
    
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    
    return null;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat(LOCALE).format(num);
  };

  // Generate display text for date range
  const generateDisplayText = (start, end) => {
    if (!start || !end) return t("DASHBOARD.SELECT_DATE_RANGE");
    
    const isSameDay = start.isSame(end, 'day');
    
    if (isSameDay) {
      return `${start.format("MMM D, YYYY")} ${start.format("HH:mm")} - ${end.format("HH:mm")}`;
    } else {
      return `${start.format("MMM D, YYYY HH:mm")} - ${end.format("MMM D, YYYY HH:mm")}`;
    }
  };

  // Update display text when date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      setDisplayText(generateDisplayText(dateRange.start, dateRange.end));
    }
  }, [dateRange]);

  // Handle date range change from DateTimeRangePickerComponent
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  // Handle clear dates
  const handleClearDates = () => {
    setDateRange({
      start: dayjs().subtract(6, 'day').startOf('day'),
      end: dayjs().endOf('day')
    });
  };

  // Calculate percentage change and trend
  const calculateMetrics = (current, previous, title, comparisonText) => {
    if (
      current === undefined ||
      current === null ||
      previous === undefined ||
      previous === null
    ) {
      return {
        value:
          title.includes("Revenue") || title.includes("Average")
            ? formatCurrency(0)
            : formatNumber(0),
        change: "0%",
        trend: "neutral",
        comparisonText,
      };
    }

    const currentNum =
      typeof current === "string"
        ? parseFloat(current.replace(/[^0-9.-]+/g, "")) || 0
        : Number(current) || 0;

    const previousNum =
      typeof previous === "string"
        ? parseFloat(previous.replace(/[^0-9.-]+/g, "")) || 0
        : Number(previous) || 0;

    if (previousNum === 0) {
      return {
        value:
          title.includes("Revenue") || title.includes("Average")
            ? formatCurrency(currentNum)
            : formatNumber(currentNum),
        change: "N/A",
        trend: "neutral",
        comparisonText,
      };
    }

    const percentageChange = ((currentNum - previousNum) / previousNum) * 100;
    const trend =
      percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral";

    return {
      value:
        title.includes("Revenue") || title.includes("Average")
          ? formatCurrency(currentNum)
          : formatNumber(currentNum),
      change: `${percentageChange > 0 ? "+" : ""}${percentageChange.toFixed(
        2
      )}%`,
      trend,
      comparisonText,
    };
  };

  // Fetch all dashboard data using promises
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { start, end } = dateRange;

      // Prepare query parameters for date range with formatted dates
      const dateParams = {
        startDate: formatDateToAPI(start),
        endDate: formatDateToAPI(end),
      };

      // Get token from localStorage
      const token = localStorage.getItem("token");

      // Create all API promises
      const promises = [
        // Total Revenue - uses query params
        apiGet(GET_TOTAL_REVENUE, dateParams, token)
          .then((response) => ({
            data: response?.data?.data || {},
            type: "revenue",
          }))
          .catch((error) => {
            return {
              type: "revenue",
              data: {
                totalCurrentRevenue: 0,
                previousRevenue: 0,
                totalRevenuePercentageChange: "0%",
              },
            };
          }),

        // Total Orders - uses query params
        apiGet(GET_TOTAL_ORDERS, dateParams, token)
          .then((response) => ({
            data: response?.data?.data || {},
            type: "orders",
          }))
          .catch((error) => {
            return {
              type: "orders",
              data: {
                currentTotalOrders: 0,
                previousTotalOrders: 0,
                totalOrderPercentageChange: "0%",
              },
            };
          }),

        // Total Customers - uses query params
        apiGet(GET_TOTAL_CUSTOMERS, dateParams, token)
          .then((response) => ({
            data: response?.data?.data || {},
            type: "customers",
          }))
          .catch((error) => {
            return {
              type: "customers",
              data: {
                currentRegisteredTotalCutomers: 0,
                previousRegisteredTotalCustomers: 0,
                totalCustomerPercentageChange: "0%",
              },
            };
          }),

        // Recent Orders - uses request body for limit
        apiGet(GET_RECENT_ORDERS, { limit: DASHBOARD_DEFAULT_LIMIT }, token)
          .then((response) => ({
            data: response?.data?.data || {},
            type: "recentOrders",
          }))
          .catch((error) => {
            return { type: "recentOrders", data: [] };
          }),

        // Top Products - uses query params for dates and request body for limit
        apiGet(GET_TOP_PRODUCTS, { ...dateParams, limit: 5 }, token)
          .then((response) => ({
            data: response?.data?.data || {},
            type: "topProducts",
          }))
          .catch((error) => {
            return { type: "topProducts", data: [] };
          }),
      ];

      // Execute all API calls in parallel
      const results = await Promise.all(promises);

      // Process results
      let revenueData = {
        totalCurrentRevenue: 0,
        previousRevenue: 0,
        totalRevenuePercentageChange: "0%",
      };
      let ordersData = {
        currentTotalOrders: 0,
        previousTotalOrders: 0,
        totalOrderPercentageChange: "0%",
      };
      let customersData = {
        currentRegisteredTotalCutomers: 0,
        previousRegisteredTotalCustomers: 0,
        totalCustomerPercentageChange: "0%",
      };
      let recentOrdersData = [];
      let topProductsData = [];

      results.forEach((result) => {
        switch (result.type) {
          case "revenue":
            revenueData = result.data;
            break;
          case "orders":
            ordersData = result.data;
            break;
          case "customers":
            customersData = result.data;
            break;
          case "recentOrders":
            recentOrdersData = Array.isArray(result.data)
              ? result.data
              : result.data.recentOrders || [];
            break;
          case "topProducts":
            topProductsData = Array.isArray(result.data)
              ? result.data
              : result.data.topProducts || [];
            break;
        }
      });

      // Generate comparison text based on date range
      const comparisonText = generateComparisonText(start, end);

      // Calculate metrics using actual API data
      const revenueMetrics = calculateMetrics(
        revenueData.totalCurrentRevenue,
        revenueData.previousRevenue,
        "Total Revenue",
        comparisonText
      );
      const ordersMetrics = calculateMetrics(
        ordersData.currentTotalOrders,
        ordersData.previousTotalOrders,
        "Total Orders",
        comparisonText
      );

      const customersMetrics = calculateMetrics(
        customersData.currentRegisteredTotalCutomers,
        customersData.previousRegisteredTotalCustomers,
        "Total Customers",
        comparisonText
      );

      // Calculate average order value
      const averageOrderValue =
        ordersData.currentTotalOrders > 0
          ? revenueData.totalCurrentRevenue / ordersData.currentTotalOrders
          : 0;

      const previousAverageOrderValue =
        ordersData.previousTotalOrders > 0
          ? revenueData.previousRevenue / ordersData.previousTotalOrders
          : 0;

      const averageOrderMetrics = calculateMetrics(
        averageOrderValue,
        previousAverageOrderValue,
        "Average Order",
        comparisonText
      );

      // Update metrics state with actual API data
      setMetrics([
        {
          title: t("DASHBOARD.TOTALREVENUE"),
          value: revenueMetrics.value,
          change: revenueMetrics.change,
          trend: revenueMetrics.trend,
          icon: IndianRupee,
          color: "bg-green-100 text-green-600",
          comparisonText: revenueMetrics.comparisonText,
        },
        {
          title: t("DASHBOARD.TOTALORDERS"),
          value: ordersMetrics.value,
          change: ordersMetrics.change,
          trend: ordersMetrics.trend,
          icon: ShoppingCart,
          color: "bg-blue-100 text-blue-600",
          comparisonText: ordersMetrics.comparisonText,
        },
        {
          title: t("DASHBOARD.TOTALCUSTOMERS"),
          value: customersMetrics.value,
          change: customersMetrics.change,
          trend: customersMetrics.trend,
          icon: Users,
          color: "bg-purple-100 text-purple-600",
          comparisonText: customersMetrics.comparisonText,
        },
        {
          title: t("DASHBOARD.AVERAGEORDERS"),
          value: averageOrderMetrics.value,
          change: averageOrderMetrics.change,
          trend: averageOrderMetrics.trend,
          icon: TrendingUp,
          color: "bg-orange-100 text-orange-600",
          comparisonText: averageOrderMetrics.comparisonText,
        },
      ]);

      // Update recent orders
      setRecentOrders(
        recentOrdersData.map((order) => ({
          id: order.OrderRefID || `ORD-${Math.random().toString(36).substr(2, 9)}`,
          customer: order.Customer
            ? `${order.Customer.FirstName} ${order.Customer.LastName}`
            : "Unknown Customer",
          date: order.OrderDate
            ? new Date(order.OrderDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          amount: formatCurrency(order.TotalAmount || 0),
          status:
            order.OrderItem?.[0]?.OrderItemStatus?.OrderStatus ||
            STATUS.PENDING,
          items: order.OrderItem?.length || 1,
        }))
      );

      // Update top products with actual API response structure
      setTopProducts(
        topProductsData.map((item) => {
          const product = item.ProductVariant?.Product || {};
          const variantImages = item.variantImages || [];

          return {
            name:
              product.ProductName ||
              t("DASHBOARD.TOP_PRODUCTS.UNKNOWN_PRODUCT"),
            sales: parseInt(item.totalOrderItemQuantity) || 0,
            revenue: formatCurrency(parseInt(item.totalPrice) || 0),
            rating: item.averageRating || 0,
            stock: item.totalStock || 0,
            image: variantImages[0]?.documentUrl,
            category:
              product.Category || t("DASHBOARD.PRODUCT_MODAL.CATEGORY_DEFAULT"),
            // Store the original item for modal details
            originalData: item,
          };
        })
      );

      // Generate low stock items from top products with low stock
      const lowStock = topProductsData
        .filter((item) => (item.totalStock || 0) < 10)
        .map((item) => {
          const product = item.ProductVariant?.Product || {};
          return {
            name:
              product.ProductName ||
              t("DASHBOARD.TOP_PRODUCTS.UNKNOWN_PRODUCT"),
            stock: item.totalStock || 0,
            threshold: 10,
          };
        });

      setLowStockItems(lowStock);
    } catch (err) {
      setError(t("DASHBOARD.FAILED_TO_LOAD"));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate comparison text based on date range - FIXED VERSION
const generateComparisonText = (startDate, endDate) => {
  if (!startDate || !endDate) return t("DASHBOARD.COMPARISONTEXT");

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const diffMinutes = end.diff(start, 'minute');
  const diffHours = end.diff(start, 'hour', true); // float value
  const diffDays = end.diff(start, 'day', true); // float value

  // Less than 1 day -> use hours/minutes comparison
  if (diffDays < 1) {
    if (diffMinutes < 60) {
      return t("DASHBOARD.VSLASTMINUTES", { count: diffMinutes });
    } else if (diffHours <= 1) {
      return t("DASHBOARD.VSLASTHOUR");
    } else if (diffHours <= 2) {
      return t("DASHBOARD.VSLAST2HOURS");
    } else if (diffHours <= 3) {
      return t("DASHBOARD.VSLAST3HOURS");
    } else if (diffHours <= 6) {
      return t("DASHBOARD.VSLAST6HOURS");
    } else if (diffHours <= 12) {
      return t("DASHBOARD.VSLAST12HOURS");
    } else if (diffHours <= 24) {
      return t("DASHBOARD.VSLAST24HOURS");
    } else {
      return t("DASHBOARD.VSLASTHOURS", { count: Math.round(diffHours) });
    }
  }

  // 1+ day ranges -> date-based comparisons
  if (Math.round(diffDays) === 1) return t("DASHBOARD.VSPREVIOUSDAY");
  if (Math.round(diffDays) === 7) return t("DASHBOARD.VSLASTWEEK");
  if (Math.round(diffDays) === 30) return t("DASHBOARD.VSLASTMONTH");
  if (Math.round(diffDays) === 90) return t("DASHBOARD.VSLAST3MONTHS");
  if (Math.round(diffDays) === 365) return t("DASHBOARD.VSLASTYEAR");

  return t("DASHBOARD.VSLASTXDAYS", { count: Math.round(diffDays) });
};


  // Set title and fetch data on component mount
  useEffect(() => {
    setTitle(t("DASHBOARD.TITLE"));
    fetchDashboardData();

    return () => setTitle("");
  }, [setTitle, t]);

  // Fetch data when date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchDashboardData();
    }
  }, [dateRange]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
          <div className="h-10 bg-gray-200 rounded animate-pulse w-72" />
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="mt-4 flex items-center">
                <div className="h-3 w-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-12 ml-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16 ml-2" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Products Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
            </div>
            <div className="flex flex-col gap-2 p-3 flex-1">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center bg-white rounded-lg shadow-sm px-3 py-2 min-h-[70px]">
                  <div className="h-10 w-10 bg-gray-200 rounded animate-pulse mr-4" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                    </div>
                  </div>
                  <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
            </div>
            <div className="flex-1 w-full overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                    </th>
                    <th className="px-4 py-3 text-right">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16 ml-auto" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2">
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={fetchDashboardData}
            className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
          >
            {t("COMMON.RETRY")}
          </button>
        </div>
      )}

      {/* Product Modal */}
      {bShowProductModal && nSelectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-0 relative animate-fade-in-up overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-gray-50">
              <h2 className="text-sm font-bold text-gray-900">
                {t("PRODUCTS.PRODUCTS_DETAILS")}
              </h2>
              <button
                className="text-gray-400 hover:text-indigo-600 text-xl font-bold transition-colors"
                onClick={() => setShowProductModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col items-center px-4 py-4">
              <img
                src={
                  nSelectedProduct.image ||
                  "https://via.placeholder.com/96x96?text=Img"
                }
                alt={nSelectedProduct.name}
                className="h-28 w-28 rounded-lg object-cover border-2 border-indigo-100 shadow mb-2"
              />
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5 text-center">
                {nSelectedProduct.name}
              </h3>
              <span className="inline-block mb-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {nSelectedProduct.category ||
                  t("DASHBOARD.PRODUCT_MODAL.CATEGORY_DEFAULT")}
              </span>
              <div className="flex items-center gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      nSelectedProduct.rating >= star
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                    fill={nSelectedProduct.rating >= star ? "#facc15" : "none"}
                  />
                ))}
                <span className="ml-1 text-xs text-gray-500">
                  {nSelectedProduct.rating}
                </span>
              </div>
              <hr className="w-full border-t border-gray-200 my-2" />
              <div className="grid grid-cols-2 gap-2 w-full mt-1 mb-1">
                <div className="flex flex-col items-center">
                  <IndianRupee className="h-4 w-4 text-green-500 mb-0.5" />
                  <span className="text-[11px] text-gray-500">
                    {t("DASHBOARD.PRODUCT_MODAL.REVENUE")}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {nSelectedProduct.revenue}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp className="h-4 w-4 text-blue-500 mb-0.5" />
                  <span className="text-[11px] text-gray-500">
                    {t("DASHBOARD.PRODUCT_MODAL.SALES")}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {formatNumber(nSelectedProduct.sales)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Package className="h-4 w-4 text-gray-500 mb-0.5" />
                  <span className="text-[11px] text-gray-500">
                    {t("DASHBOARD.PRODUCT_MODAL.STOCK")}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      nSelectedProduct.stock < 10
                        ? "text-red-600"
                        : "text-gray-800"
                    }`}
                  >
                    {nSelectedProduct.stock}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Clock className="h-4 w-4 text-indigo-400 mb-0.5" />
                  <span className="text-[11px] text-gray-500">
                    {t("COMMON.STATUS")}
                  </span>
                  <span className="font-semibold text-sm text-gray-800">
                    {nSelectedProduct.stock < 10
                      ? t("DASHBOARD.PRODUCT_MODAL.LOW_STOCK")
                      : t("DASHBOARD.PRODUCT_MODAL.IN_STOCK")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with DateTimeRangePickerComponent */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">{t("DASHBOARD.DESCRIPTION")}</p>
          </div>

          {/* Using the new DateTimeRangePickerComponent */}
          <div className="relative w-[18rem] max-w-full">
            <DateTimeRangePickerComponent
              dateRange={dateRange}
              setDateRange={handleDateRangeChange}
              displayText={displayText}
              handleClearDates={handleClearDates}
              t={t}
              maxDate={dayjs()} // Don't allow future dates
              allowFutureDates={false}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <button
              onClick={() => {
                if (metric.title === "Total Orders") {
                  navigate("/orders");
                }
              }}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {metric.title}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">
                    {metric.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${metric.color}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </button>
            <div className="mt-4 flex items-center">
              {metric.trend === "up" ? (
                <ArrowUp className="h-3 w-3 text-green-500" />
              ) : metric.trend === "down" ? (
                <ArrowDown className="h-3 w-3 text-red-500" />
              ) : (
                <span className="h-3 w-3 text-gray-500">-</span>
              )}
              <span
                className={`ml-2 text-xs font-medium ${
                  metric.trend === "up"
                    ? "text-green-500"
                    : metric.trend === "down"
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {metric.change}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {metric.comparisonText}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px] mt-6 md:mt-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t("DASHBOARD.TOP_PRODUCTS.TOP_PRODUCTS")}
              </h2>
            </div>
            <div className="flex flex-col gap-2 p-3 flex-1">
              {paginatedTopProducts.length > 0 ? (
                paginatedTopProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex flex-col md:flex-row items-center bg-white rounded-lg shadow-sm px-3 py-2 transition min-h-[70px]"
                  >
                    <div className="flex-shrink-0 mb-2 md:mb-0 md:mr-4">
                      <img
                        src={
                          product.image ||
                          "https://via.placeholder.com/48x48?text=Img"
                        }
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover border"
                      />
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900 truncate max-w-[10rem]">
                          {product.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                          {product.category ||
                            t("DASHBOARD.PRODUCT_MODAL.CATEGORY_DEFAULT")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              product.rating >= star
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                            fill={product.rating >= star ? "#facc15" : "none"}
                          />
                        ))}
                        <span className="ml-1 text-sm text-gray-500">
                          {product.rating}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center">
                          <IndianRupee className="inline h-4 w-4 mr-1 text-green-400" />
                          {product.revenue}
                        </span>
                        <span className="flex items-center">
                          <TrendingUp className="inline h-4 w-4 mr-1 text-blue-400" />
                          {t("DASHBOARD.TOP_PRODUCTS.SALES", {
                            count: product.sales,
                          })}
                        </span>
                        <span className="flex items-center">
                          <Package className="inline h-4 w-4 mr-1 text-gray-400" />
                          {t("DASHBOARD.TOP_PRODUCTS.IN_STOCK", {
                            count: product.stock,
                          })}
                        </span>
                        {product.stock < 10 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {t("DASHBOARD.TOP_PRODUCTS.LOW_STOCK")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-auto mt-2 md:mt-0 md:ml-4 flex flex-col items-end gap-2">
                      <button
                        className="w-full md:w-auto px-2.5 py-1 rounded bg-custom-bg text-white text-[10px] font-medium hover:bg-bg-hover transition"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductModal(true);
                        }}
                      >
                        {t("DASHBOARD.TOP_PRODUCTS.VIEW")}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col justify-center items-center h-40">
                  <div className="mb-3 relative">
                    <div className="relative w-16 h-16">
                      {/* Shopping cart with animated items */}
                      <svg 
                        className="absolute inset-0 w-16 h-16 text-gray-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                        />
                      </svg>
                      
                      {/* Animated product items floating above cart */}
                      <div className="absolute -top-2 -right-2">
                        <svg 
                          className="w-6 h-6 text-gray-400 animate-bounce" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '0ms' }}
                        >
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                        </svg>
                      </div>
                      
                      <div className="absolute -top-4 -left-2">
                        <svg 
                          className="w-5 h-5 text-gray-400 animate-bounce" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '200ms' }}
                        >
                          <rect x="5" y="5" width="14" height="14" rx="2" />
                        </svg>
                      </div>
                      
                      <div className="absolute top-0 left-0">
                        <svg 
                          className="w-4 h-4 text-gray-400 animate-bounce" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '400ms' }}
                        >
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Subtle rotating ring around the cart */}
                    <div className="absolute inset-0 w-20 h-20 -m-2">
                      <svg 
                        className="w-full h-full text-gray-200 animate-spin" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ animationDuration: '3s' }}
                      >
                        <circle 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          strokeWidth="1" 
                          strokeDasharray="2 4"
                          opacity="0.5"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {t("DASHBOARD.NO_TOP_PRODUCTS")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-6 md:mb-0 -z-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {t("DASHBOARD.RECENT_ORDERS.RECENT_ORDERS")}
              </h2>
            </div>
            <div className="flex-1 w-full overflow-x-auto">
              {recentOrders.length > 0 ? (
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50  top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider align-middle">
                        {t("DASHBOARD.RECENT_ORDERS.CUSTOMER")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider align-middle">
                        {t("DASHBOARD.RECENT_ORDERS.ORDER_ID")}
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider align-middle">
                        {t("DASHBOARD.RECENT_ORDERS.AMOUNT")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider align-middle">
                        {t("COMMON.STATUS")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition h-10"
                      >
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span
                            className="inline-block align-middle h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs text-center leading-7 mr-2"
                            style={{ minWidth: "1.75rem" }}
                          >
                            {order.customer
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span className="inline-block align-middle text-xs text-gray-900 max-w-[8rem] truncate">
                            {order.customer}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 align-middle whitespace-nowrap max-w-[8rem] truncate">
                          {order.id}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-900 text-right align-middle whitespace-nowrap">
                          {order.amount}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-sm font-semibold
                      ${
                        order.status === ORDER_STATUS.DELIVERED
                          ? STATUS.DELIVERED
                          : ""
                      } 
                      ${
                        order.status === ORDER_STATUS.PROCESSING
                          ? STATUS.PROCESSING
                          : ""
                      }
                      ${
                        order.status === ORDER_STATUS.SHIPPED
                          ? STATUS.SHIPPED
                          : ""
                      }
                      ${
                        order.status === ORDER_STATUS.CANCELLED
                          ? STATUS.CANCELLED
                          : ""
                      }
                       ${
                         order.status === ORDER_STATUS.PENDING
                           ? STATUS.PENDING
                           : ""
                       }
                    `}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col justify-center items-center h-40">
                  <div className="mb-3 relative">
                    <div className="relative w-16 h-16">
                      {/* Document/Order icon with animated elements */}
                      <svg 
                        className="absolute inset-0 w-16 h-16 text-gray-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                      
                      {/* Animated order items */}
                      <div className="absolute -top-2 -right-2">
                        <svg 
                          className="w-5 h-5 text-gray-400 animate-pulse" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '0ms' }}
                        >
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      
                      <div className="absolute -top-4 -left-2">
                        <svg 
                          className="w-4 h-4 text-gray-400 animate-pulse" 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '300ms' }}
                        >
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                      </div>
                      
                      {/* Animated checkmark for completed orders */}
                      <div className="absolute bottom-0 right-0">
                        <svg 
                          className="w-6 h-6 text-green-400 animate-bounce" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ animationDelay: '600ms' }}
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 13l4 4L19 7" 
                          />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Subtle rotating ring around document */}
                    <div className="absolute inset-0 w-20 h-20 -m-2">
                      <svg 
                        className="w-full h-full text-gray-200 animate-spin" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ animationDuration: '4s' }}
                      >
                        <circle 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          strokeWidth="1" 
                          strokeDasharray="3 3"
                          opacity="0.4"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {t("DASHBOARD.NO_RECENT_ORDERS")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;