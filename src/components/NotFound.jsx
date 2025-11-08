import React from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-white">
      <h1 className="text-5xl font-bold text-red-500 mb-4">
        {t("NOT_FOUND.TITLE")}
      </h1>
      <p className="text-xl text-gray-700 mb-2">
        {t("NOT_FOUND.HEADING").toUpperCase()}
      </p>
      <p className="text-sm text-gray-500">
        {t("NOT_FOUND.MESSAGE").toUpperCase()}
      </p>
    </div>
  );
};

export default NotFound;
