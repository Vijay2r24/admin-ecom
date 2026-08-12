import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { 
  PAYMENT_STATUS,
  PAYMENT_TYPES,
  ORDER_STATUS,
  PAYMENT_STATUS_IDS
} from "../contants/constants";

const PaymentStatusBadge = ({ paymentStatusName, paymentStatusId, item }) => {
  const { t } = useTranslation();
  const { data: paymentStatusData } = useSelector((state) => state.allData.resources.paymentStatus || {});

  const paymentStatusArray = useMemo(() => {
    if (!paymentStatusData) return [];
    if (Array.isArray(paymentStatusData)) return paymentStatusData;
    if (paymentStatusData.data && paymentStatusData.data.data && Array.isArray(paymentStatusData.data.data.rows)) {
      return paymentStatusData.data.data.rows;
    }
    if (paymentStatusData.data && Array.isArray(paymentStatusData.data.rows)) return paymentStatusData.data.rows;
    if (paymentStatusData.rows && Array.isArray(paymentStatusData.rows)) return paymentStatusData.rows;
    if (paymentStatusData && typeof paymentStatusData === 'object') return [paymentStatusData];
    return [];
  }, [paymentStatusData]);

  // Normalize field access for both Admin and Customer BE formats
  const getPaymentStatusName = () => {
    if (paymentStatusName) return paymentStatusName;
    if (item) {
      // Admin BE: PaymentStatusName, Customer BE: paymentStatus
      return item.PaymentStatusName || item.paymentStatus;
    }
    return null;
  };

  const getPaymentStatusId = () => {
    if (paymentStatusId) return paymentStatusId;
    if (item) {
      // Admin BE: PaymentStatusID, Customer BE: paymentStatusId
      return item.PaymentStatusID || item.paymentStatusId;
    }
    return null;
  };

  // Business Logic: Handle COD orders
  const getActualPaymentStatus = () => {
    const statusName = getPaymentStatusName();
    const statusId = getPaymentStatusId();
    
    // Check if this is a Cash on Delivery order - improved detection
    const isCOD = item && (
      item.PaymentTypeName?.toLowerCase().includes(PAYMENT_TYPES.COD_KEYWORDS.CASH_ON_DELIVERY) ||
      item.PaymentTypeName?.toLowerCase().includes(PAYMENT_TYPES.COD_KEYWORDS.COD) ||
      item.paymentMethod?.toLowerCase().includes(PAYMENT_TYPES.COD_KEYWORDS.CASH_ON_DELIVERY) ||
      item.paymentMethod?.toLowerCase().includes(PAYMENT_TYPES.COD_KEYWORDS.COD) ||
      item.PaymentTypeName?.toLowerCase() === PAYMENT_TYPES.COD_KEYWORDS.CASH_ON_DELIVERY ||
      item.paymentMethod?.toLowerCase() === PAYMENT_TYPES.COD_KEYWORDS.CASH_ON_DELIVERY
    );
    
    // For COD orders, if item is delivered, payment status should be "Paid"
    if (isCOD && item) {
      const orderStatus = (item.status || item.OrderStatus || '').toLowerCase();
      if (orderStatus === ORDER_STATUS.DELIVERED.toLowerCase()) {
        return {
          name: PAYMENT_STATUS.PAID,
          id: PAYMENT_STATUS_IDS.PAID
        };
      }
    }
    
    // Return original payment status for non-COD or non-delivered items
    return {
      name: statusName,
      id: statusId
    };
  };

  const { name: actualStatusName, id: actualStatusId } = getActualPaymentStatus();

  const { statusClass, statusStyle } = useMemo(() => {
    const normalizedStatusName = (actualStatusName || "").toString().trim().toLowerCase();
    let className = "status-default";

    if ([PAYMENT_STATUS.PENDING.toLowerCase()].includes(normalizedStatusName)) {
      className = "status-pending";
    } else if ([
      PAYMENT_STATUS.PAID.toLowerCase(), 
      PAYMENT_STATUS.COMPLETED.toLowerCase(), 
      PAYMENT_STATUS.SUCCESS.toLowerCase()
    ].includes(normalizedStatusName)) {
      className = "status-delivered";
    } else if ([
      PAYMENT_STATUS.FAILED.toLowerCase(), 
      PAYMENT_STATUS.REJECTED.toLowerCase(), 
      PAYMENT_STATUS.CANCELLED.toLowerCase()
    ].includes(normalizedStatusName)) {
      className = "status-cancelled";
    } else if ([
      PAYMENT_STATUS.PROCESSING.toLowerCase(), 
      PAYMENT_STATUS.IN_PROGRESS.toLowerCase()
    ].includes(normalizedStatusName)) {
      className = "status-processing";
    } else if ([PAYMENT_STATUS.REFUNDED.toLowerCase()].includes(normalizedStatusName)) {
      className = "status-refunded";
    }

    const statusItem = paymentStatusArray.find(
      (item) => item.PaymentStatusName === actualStatusName || item.PaymentStatusID === actualStatusId
    );

    if (statusItem?.Colour?.HexCode) {
      const bgColor = statusItem.Colour.HexCode;
      return {
        statusClass: className,
        statusStyle: {
          backgroundColor: bgColor,
          color: "#ffffff",
          borderColor: `${bgColor}33`,
          boxShadow: `0 4px 10px ${bgColor}20`,
        },
      };
    }

    return { statusClass: className, statusStyle: null };
  }, [paymentStatusArray, actualStatusName, actualStatusId]);

  const displayName = actualStatusName ||
    paymentStatusArray.find((item) => item.PaymentStatusID === actualStatusId)?.PaymentStatusName ||
    t('COMMON.N_A');

  return (
    <span
      className={`status-badge min-w-[84px] whitespace-nowrap ${statusClass}`}
      style={statusStyle || undefined}
    >
      {displayName}
    </span>
  );
};

export default PaymentStatusBadge;