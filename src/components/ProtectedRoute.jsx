import React, { useEffect, useState } from 'react';
import Layout from '../layout/Layout';
import { Box, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

const ProtectedRoute = ({ permissionCode, children }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = () => {
      try {
        const permissionIDs = JSON.parse(localStorage.getItem('PermissionIDs')) || [];
        
        if (!permissionCode) {
          // If no permission code is required, allow access
          setHasPermission(true);
        } else {
          // Check if user has the required permission
          setHasPermission(permissionIDs.includes(permissionCode));
        }
      } catch (err) {
        console.error('Error checking permissions:', err);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure localStorage is available
    setTimeout(checkPermission, 0);
  }, [permissionCode]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Return Layout with appropriate content based on permission
  return (
    <Layout>
      {hasPermission ? children : (
        <div className="main-container">
          <Box
            sx={{
              paddingTop: { xs: "50px", sm: "80px", md: "100px" },
              textAlign: "center",
              marginTop: "1/3",
            }}
          >
            {/* Lock Icon inside the circle */}
            <Box
              sx={{
                width: { xs: "60px", sm: "70px", md: "80px" }, // Decreased circle size
                height: { xs: "60px", sm: "70px", md: "80px" }, // Decreased circle size
                backgroundColor: "#FF5A5F",
                borderRadius: "50%",
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <LockIcon
                sx={{
                  fontSize: { xs: 20, sm: 25, md: 30 }, // Further decreased font size
                  color: "white",
                }}
              />
            </Box>

            <Box mt={3}> {/* Decreased margin top */}
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{ 
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" } // Further decreased font sizes
                }}
              >
                Access to this page is restricted
              </Typography>
              <Typography
                variant="body1"
                sx={{ 
                  fontSize: { xs: "0.7rem", sm: "0.8rem" } // Further decreased font sizes
                }}
              >
                Please check with the site admin if you believe this is a mistake.
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </Layout>
  );
};

export default ProtectedRoute;