import dayjs from "dayjs";

export const formatDate = (
  dateString,
  format = "DD-MM-YYYY hh:mm A"
) => {
  if (!dateString) return "N/A";

  const date = dayjs(dateString);
  return date.isValid() ? date.format(format) : "N/A";
};

export const formatCurrency = (
  amount,
  currency = "INR",
  locale = "en-IN"
) => {
  if (amount === undefined || amount === null) return "₹0.00";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
};

export const formatDateForAPI = (date) => {
  if (!date) return undefined;

  const d = dayjs(date);
  return d.isValid() ? d.toISOString() : undefined;
};
