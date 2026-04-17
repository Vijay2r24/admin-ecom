import { Navigate } from "react-router-dom";

const NotFound = () => {
  const token = localStorage.getItem("token");
  return <Navigate to={token ? "/dashboard" : "/"} replace />;
};

export default NotFound;
