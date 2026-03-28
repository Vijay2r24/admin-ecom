import { useState, useEffect } from "react";
import { Plus, MoreVertical, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiGet,apiPut, apiPatch, apiDelete } from "../utils/ApiUtils";
import {
  GET_ALL_BANNERS,
  UPDATE_BANNER_STATUS,
  DELETE_BANNER,
} from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { useTitle } from "../context/TitleContext";
import {
  ITEMS_PER_PAGE,
  STATUS,
  STATUS_VALUE_NAMES,
} from "../contants/constants";
import FullscreenErrorPopup from "../components/FullscreenErrorPopup";
import { ToastContainer, toast } from "react-toastify";
import noImage from "../../assets/images/missing-pictur.jpg";
import Switch from "../components/Switch";
import Pagination from "../components/Pagination"; // Import the Pagination component
import Loader from "../components/Loader";
import SkeletonLoader from "../components/SkeletonLoader";


const Banners = () => {
  const [aBanners, setBanners] = useState([]);
  const [nPage, setPage] = useState(1);
  const rowsPerPage = ITEMS_PER_PAGE;
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [nActiveMenu, setActiveMenu] = useState(null);
  const [sError, setError] = useState(null);
  const [backendMessage, setBackendMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setTitle } = useTitle();
  const [statusPopup, setStatusPopup] = useState({
    open: false,
    id: null,
    currentStatus: null,
  });

  useEffect(() => {
    setTitle(t("BANNER_FORM.TITLE"));
    return () => setTitle("");
  }, [setTitle, t]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const oResponse = await apiGet(
        GET_ALL_BANNERS,
        { page: nPage, limit: rowsPerPage },
        token
      );
      if (
        oResponse.data &&
        oResponse.data.status === STATUS.SUCCESS.toUpperCase()
      ) {
        // Check if the response message indicates no banners found
        if (oResponse.data.message === "No banners found") {
          setBanners([]);
          setTotalPages(1);
          setTotalRecords(0);
          setBackendMessage(oResponse.data.message); // Store backend message
          setError(null); // Clear error since this is a valid response
        } else if (oResponse.data.data && oResponse.data.data.length > 0) {
          // Map API response to expected structure
          const bannerData = oResponse.data.data.map((banner) => ({
            BannerID: banner.BannerId,
            BannerName: banner.BannerName,
            Status: banner.IsActive
              ? STATUS_VALUE_NAMES.ACTIVE
              : STATUS_VALUE_NAMES.INACTIVE,
            BannerImages:
              banner.BannerImage?.map((img) => ({
                BannerImage: img.documentUrl,
                sortOrder: img.sortOrder,
                documentId: img.documentId,
              })) || [],
            CategoryIDs: banner.CategoryIDs,
            Discount: banner.Discount,
            Price: banner.Price,
            SortOrder: banner.SortOrder,
          }));

          setBanners(bannerData);
          setTotalPages(oResponse.data.pagination?.totalPages || 1);
          setTotalRecords(oResponse.data.pagination?.totalRecords || 0);
          setBackendMessage(null); // Clear backend message when banners are found
          setError(null);
        } else {
          // Empty data array
          setBanners([]);
          setTotalPages(1);
          setTotalRecords(0);
          setBackendMessage(null); // Clear backend message for empty data
          setError(null);
        }
      } else {
        setBanners([]);
        setTotalPages(1);
        setTotalRecords(0);
        setError(oResponse.data?.message || t("COMMON.ERROR_MESSAGE"));
      }
    } catch (err) {
      setBanners([]);
      setTotalPages(1);
      setTotalRecords(0);
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || t("COMMON.ERROR_MESSAGE"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [nPage, t]);

  const paginatedBanners = aBanners;

  const toggleMenu = (id) => setActiveMenu(nActiveMenu === id ? null : id);
  const handleEditBanner = (id) => navigate(`/banners-edit/${id}`);

  const handleToggleStatus = (id, currentStatus) => {
    setStatusPopup({ open: true, id, currentStatus });
  };

  const handleStatusConfirm = async () => {
    const { id, currentStatus } = statusPopup;
    setStatusPopup({ open: false, id: null, currentStatus: null });
    try {
      const token = localStorage.getItem("token");
      const newStatus = currentStatus === "Active" ? false : true; // Convert to boolean for API
      const oResponse = await apiPatch(
        `${UPDATE_BANNER_STATUS}/${id}`,
        { IsActive: newStatus }, // Use IsActive to match API expectation
        token
      );
      if (
        oResponse.data &&
        oResponse.data.status === STATUS.SUCCESS.toUpperCase()
      ) {
        showEmsg(
          oResponse.data.message || t("BANNER_FORM.STATUS_UPDATED"),
          STATUS.SUCCESS
        );
        fetchBanners();
      } else {
        showEmsg(
          oResponse.data?.message || t("COMMON.API_ERROR"),
          STATUS.ERROR
        );
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        t("COMMON.API_ERROR");
      showEmsg(errorMessage, STATUS.ERROR);
    }
  };

  const handleStatusPopupClose = () => {
    setStatusPopup({ open: false, id: null, currentStatus: null });
  };

  const handleViewActiveBanners = () => {
    navigate("/activeBanners");
  };

  // Pagination handlers
  const handlePrevPage = () => {
    if (nPage > 1) {
      setPage(nPage - 1);
    }
  };

  const handleNextPage = () => {
    if (nPage < totalPages) {
      setPage(nPage + 1);
    }
  };

  const handlePageClick = (page) => {
    setPage(page);
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen">
      <ToastContainer />
      <div className="flex items-center gap-4 mb-8 sticky top-14 bg-white z-0 py-3 shadow">
        <div className="flex-1" />
        <button
          type="button"
          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 transition-all duration-200 gap-2 shadow-sm"
          onClick={handleViewActiveBanners}
        >
          <ImageIcon className="h-4 w-4" />
          {t("BANNER_FORM.VIEW_ACTIVE_BANNERS")}
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center mr-4 px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-custom-bg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-bg transition gap-1.5"
          onClick={() => navigate("/banners-create")}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("BANNER_FORM.CREATE_BANNER")}
        </button>
      </div>
      <div>
        {sError && (
          <div className="mb-4 text-red-500 text-center">{sError}</div>
        )}
        {loading ? (
          <SkeletonLoader type="banner-grid" rows={6} className="mt-4" />
        ) : paginatedBanners.length === 0 && !sError ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-indigo-400" />
              </div>
            </div>
            
            <div className="text-center max-w-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {backendMessage || t("BANNER_FORM.NO_BANNERS_FOUND")}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t("BANNER_FORM.NO_BANNERS_DESCRIPTION")}
              </p>
            </div>
          </div>
        ) : (
         <div className="grid grid-cols-1 mt-4 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide">
            {paginatedBanners.map((project) => (
              <div
                key={project.BannerID}
                className="bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col transition-transform transform hover:scale-[1.01] border border-gray-100"
              >
                <div className="relative w-full">
                  {project.BannerImages && project.BannerImages.length > 0 ? (
                    <div className="w-full">
                      <img
                        src={project.BannerImages[0].BannerImage || noImage}
                        alt={`Banner ${project.BannerName}`}
                        className="w-full aspect-[16/9] object-contain"
                      />
                    </div>
                  ) : (
                    <img
                      src={noImage}
                      alt="No image"
                      className="w-full aspect-[16/9] object-contain"
                    />
                  )}
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      className="bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-sm hover:bg-white transition"
                      onClick={() => toggleMenu(project.BannerID)}
                    >
                      <MoreVertical className="h-5 w-5 text-gray-800" />
                    </button>
                    {nActiveMenu === project.BannerID && (
                      <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-xl z-[2000] min-w-[120px] border border-gray-100">
                        <ul className="text-sm text-gray-700">
                          <li
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer rounded-t-xl"
                            onClick={() => handleEditBanner(project.BannerID)}
                          >
                            {t("COMMON.EDIT")}
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-base font-semibold text-gray-900 truncate mb-2">
                    {project.BannerName || t("BANNER_FORM.UNNAMED_BANNER")}
                  </h3>
                  {project.Discount && (
                    <p className="text-sm text-gray-600 truncate">
                      {t("BANNER_FORM.DISCOUNT_PERCENTAGE")}: {project.Discount}
                    </p>
                  )}
                  {project.Price && (
                    <p className="text-sm text-gray-600 truncate">
                      {t("COMMON.PRICE")}: ₹{project.Price.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Switch
                      checked={project.Status === STATUS_VALUE_NAMES.ACTIVE}
                      onChange={() =>
                        handleToggleStatus(project.BannerID, project.Status)
                      }
                    />
                    <span
                      className={`text-sm font-medium ml-3 px-2 py-1 rounded-full text-xs font-semibold shadow ${
                        project.Status === STATUS_VALUE_NAMES.ACTIVE
                          ? "status-active bg-green-100 text-green-800"
                          : "status-inactive bg-red-100 text-red-800"
                      }`}
                    >
                      {project.Status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Replace the existing pagination with the Pagination component */}
        {paginatedBanners.length > 0 && (
          <div className="sticky bottom-0 bg-white py-3 shadow z-40">
            <Pagination
              currentPage={nPage}
              totalPages={totalPages}
              totalItems={totalRecords}
              itemsPerPage={rowsPerPage}
              handlePrevPage={handlePrevPage}
              handleNextPage={handleNextPage}
              handlePageClick={handlePageClick}
            />
          </div>
        )}
      </div>
      {statusPopup.open && (
        <FullscreenErrorPopup
          title={t("FULLSCREEN_ERROR_POPUP.TITLE")}
          message={t("BANNERS.STATUS_CONFIRM_MESSAGE", {
            status:
              statusPopup.currentStatus === STATUS_VALUE_NAMES.ACTIVE
                ? t("COMMON.INACTIVE")
                : t("COMMON.ACTIVE"),
          })}
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default Banners;
