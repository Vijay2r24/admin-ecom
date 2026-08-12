import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS } from "../../contants/constants";

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const { data: orderStatusData } = useSelector((state) => state.allData.resources.orderStatuses || {});

  const orderStatusArray = useMemo(() => {
    if (!orderStatusData) return [];
    if (Array.isArray(orderStatusData)) return orderStatusData;
    if (orderStatusData.data && orderStatusData.data.data && Array.isArray(orderStatusData.data.data.rows)) {
      return orderStatusData.data.data.rows;
    }
    if (orderStatusData.data && Array.isArray(orderStatusData.data.rows)) return orderStatusData.data.rows;
    if (orderStatusData.rows && Array.isArray(orderStatusData.rows)) return orderStatusData.rows;
    if (orderStatusData && typeof orderStatusData === 'object') return [orderStatusData];
    return [];
  }, [orderStatusData]);

  const statusColor = orderStatusArray.find(
    (statusItem) => statusItem.OrderStatus === status
  )?.Colour?.HexCode || "#6b7280";

  // Get translated status name
  const getTranslatedStatus = (status) => {
    const statusKey = Object.keys(ORDER_STATUS).find(
      key => ORDER_STATUS[key].toLowerCase() === status?.toLowerCase()
    );
    return statusKey ? t(`ORDER_STATUS.${statusKey}`) : status;
  };

  return (
    <span
      className="px-3 py-1.5 rounded-full text-white text-xs font-medium flex items-center justify-center min-w-[80px]"
      style={{
        backgroundColor: statusColor,
        boxShadow: `0 2px 4px ${statusColor}40`,
      }}
    >
      {getTranslatedStatus(status)}
    </span>
  );
};

export default StatusBadge;