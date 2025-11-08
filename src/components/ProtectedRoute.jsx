import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import { Box, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useTranslation } from "react-i18next";

const ProtectedRoute = ({ permissionCode, children }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const checkPermission = () => {
      try {
        const permissionIDs =
          JSON.parse(localStorage.getItem("PermissionIDs")) || [];

        if (!permissionCode) {
          // If no permission code is required, allow access
          setHasPermission(true);
        } else {
          // Check if user has the required permission
          setHasPermission(permissionIDs.includes(permissionCode));
        }
      } catch (err) {
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    setTimeout(checkPermission, 0);
  }, [permissionCode]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {hasPermission ? (
        children
      ) : (
        <div className="main-container">
          <Box
            sx={{
              paddingTop: { xs: "50px", sm: "80px", md: "100px" },
              textAlign: "center",
            }}
          >
            {/* Lock Icon inside the circle */}
            <Box
              sx={{
                width: { xs: "60px", sm: "70px", md: "80px" },
                height: { xs: "60px", sm: "70px", md: "80px" },
                backgroundColor: "var(--custom-bg)", // Fixed syntax
                borderRadius: "50%",
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <LockIcon
                sx={{
                  fontSize: { xs: 20, sm: 25, md: 30 },
                  color: "white",
                }}
              />
            </Box>

            <Box mt={3}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
                }}
              >
                {t("COMMON.ACCESS_DENIED_TITLE")}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: "0.7rem", sm: "0.8rem" },
                }}
              >
                {t("COMMON.ACCESS_DENIED_MESSAGE")}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </Layout>
  );
};

export default ProtectedRoute;
