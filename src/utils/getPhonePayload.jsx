import { parsePhoneNumberFromString } from "libphonenumber-js";
import { COUNTRY_CODES } from "../contants/constants";

export const getPhonePayload = (fullNumber = "", defaultCountryCode = COUNTRY_CODES.INDIA) => {
  // If empty value
  if (!fullNumber) {
    return {
      countryCode: defaultCountryCode,
      phoneNumber: "",
      formatted: "",
    };
  }

  // Remove spaces from input
  const clean = fullNumber.replace(/\s/g, "");

  // Try to parse number
  const parsed = parsePhoneNumberFromString(clean);

  // If parsing fails → manually split
  if (!parsed) {
    const match = clean.match(/^(\+\d+)/); // extract +91
    const countryCode = match ? match[1] : defaultCountryCode;
    const phoneNumber = match ? clean.replace(match[1], "") : clean;

    return {
      countryCode,
      phoneNumber,
      formatted: `${countryCode} ${phoneNumber}`,
    };
  }

  // Parsing success
  return {
    countryCode: `+${parsed.countryCallingCode}`,
    phoneNumber: parsed.nationalNumber,
    formatted: parsed.number, // E.164 format e.g. +919494602714
  };
};
