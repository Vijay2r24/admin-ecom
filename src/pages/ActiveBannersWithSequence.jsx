import { useState, useEffect, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Save,
  Image,
  ArrowUpDown,
  CheckCircle,
  GripVertical,
  Hash,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
  ChevronLeft, 
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTitle } from "../context/TitleContext";
import BackButton from "../components/BackButton";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
import { GET_ALL_BANNERS, UPDATE_BANNER_SORTORDER } from "../contants/apiRoutes";
import { apiGet, apiPatch } from "../utils/ApiUtils";
import { toast } from "react-toastify";
import { STATUS, MODULES, PERMISSIONS, TOOLTIP_MESSAGES, STATUS_VALUE_NAMES, DIRECTIONS } from "../contants/constants";
import { ToastContainer } from "react-toastify";
import { getPermissionCode, hasPermissionId } from "../utils/permissionUtils";
import Tooltip from "../components/Tooltip";

const BannerCardPreview = ({ banner, index, t }) => (
  <div className="relative bg-white rounded-2xl shadow-2xl border border-custom-bg/50 rotate-1 scale-[1.02] cursor-grabbing w-[min(100vw-2rem,360px)]">
    <div className="absolute top-2 left-2 z-20 pointer-events-none">
      <div className="p-2 bg-white/80 rounded-lg shadow-md">
        <GripVertical className="h-5 w-5 text-custom-bg" />
      </div>
    </div>
    <div className="relative z-20 flex flex-col">
      <div className="relative h-48">
        {banner.BannerImages?.length > 0 ? (
          <img
            src={banner.BannerImages[0].BannerImage}
            alt={banner.BannerName}
            className="w-full h-full object-contain rounded-t-2xl"
          />
        ) : (
          <div className="h-full bg-gray-100 flex items-center justify-center rounded-t-2xl">
            <Image className="h-12 w-12 opacity-50 text-gray-500" />
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/95 rounded-lg px-3 py-1 shadow-sm">
          <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{banner.BannerName}</h3>
      </div>
    </div>
  </div>
);

const SortableBannerCard = ({
  banner,
  index,
  totalBanners,
  inputValues,
  inputErrors,
  setInputValues,
  setInputErrors,
  onSequenceChange,
  t,
}) => {
  const sortableId = String(banner.BannerID);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    touchAction: "none",
    opacity: isDragging ? 0.35 : 1,
  };

  const bannerId = sortableId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative bg-white rounded-2xl shadow-sm border ${
        isDragging
          ? "border-custom-bg/50 z-30"
          : "border-gray-200 hover:shadow-md transition-shadow duration-200"
      } ${inputErrors[bannerId] ? "border-red-300" : ""}`}
    >
      <div
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing rounded-2xl"
        aria-label={t("BANNERS.DRAG_TO_REORDER")}
      />

      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        <div className="p-2 bg-white/80 rounded-lg shadow-md">
          <GripVertical className="h-5 w-5 text-custom-bg" />
        </div>
      </div>

      <div className="relative z-20 flex flex-col pointer-events-none">
        <div className="relative h-48">
          {banner.BannerImages?.length > 0 ? (
            <img
              src={banner.BannerImages[0].BannerImage}
              alt={banner.BannerName}
              className="w-full h-full object-contain rounded-t-2xl"
            />
          ) : (
            <div className="h-full bg-gray-100 flex items-center justify-center rounded-t-2xl">
              <div className="text-center text-gray-500">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("BANNERS.NO_IMAGE")}</p>
              </div>
            </div>
          )}

          <div className="absolute top-4 left-14">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {banner.Status}
            </span>
          </div>

          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
            <span className="text-sm font-semibold text-gray-700">#{index + 1}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0 pr-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {banner.BannerName}
                </h3>
              </div>

              <div
                className={`rounded-xl p-3 border transition-all flex-shrink-0 pointer-events-auto ${
                  inputErrors[bannerId]
                    ? "bg-red-50 border-red-200"
                    : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={totalBanners}
                      value={inputValues[bannerId] ?? index + 1}
                      onChange={(e) => {
                        setInputValues((prev) => ({
                          ...prev,
                          [bannerId]: e.target.value,
                        }));
                        setInputErrors((prev) => ({ ...prev, [bannerId]: false }));
                      }}
                      onBlur={() => {
                        onSequenceChange(bannerId, inputValues[bannerId]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.target.blur();
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`w-16 px-3 py-2 border rounded-lg text-center font-medium focus:ring-2 focus:outline-none transition-all duration-200 bg-white ${
                        inputErrors[bannerId]
                          ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                          : "border-gray-300 focus:ring-custom-bg/20 focus:border-custom-bg/50"
                      }`}
                    />
                    {inputErrors[bannerId] && (
                      <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-red-500">
                        {t("BANNERS.INVALID_POSITION")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActiveBannersWithSequence = () => {
  const { t } = useTranslation();
  const [activeBanners, setActiveBanners] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [inputErrors, setInputErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);
  const { setTitle, setBackButton } = useTitle();
  const navigate = useNavigate();

  // Permission checks
  const permissionIdForUpdateBanner = getPermissionCode(
    MODULES.BANNER,
    PERMISSIONS.UPDATE_BANNER_SEQUENCE
  );
  const hasUpdateBannerPermission = hasPermissionId(permissionIdForUpdateBanner);



  useEffect(() => {
    setTitle(t("BANNERS.TITLE"));
    setBackButton(<BackButton onClick={() => navigate("/banners")} />);

    fetchBanners();

    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, navigate]);

  // Auto-play functionality for preview carousel
  useEffect(() => {
    if (showPreview && isAutoPlaying && activeBanners.length > 1) {
      autoPlayRef.current = setInterval(() => {
        handleNextPreview();
      }, 3000); // Change slide every 3 seconds
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [showPreview, isAutoPlaying, activeBanners.length]);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("COMMON.AUTH_ERROR"));

      // Call API with isActive=true parameter
      const response = await apiGet(
        `${GET_ALL_BANNERS}?isActive=true`,
        {},
        token
      );
      // Check different possible response structures
      const success = response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase() || response?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase();

      if (success) {
        // Extract data from response - handle both response structures
        const bannersData = response.data?.data || response.data || [];

        const activeBannersData = bannersData
          .filter(banner => banner.IsActive === true)
          .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0)) // Sort by SortOrder
          .map((banner, index) => ({
            BannerID: banner.BannerId || banner.BannerID,
            BannerName: banner.BannerName,
            Status: banner.IsActive ? STATUS_VALUE_NAMES.ACTIVE : STATUS_VALUE_NAMES.INACTIVE,
            SequenceNumber: index + 1, // Always use index-based sequence to avoid duplicates
            SortOrder: banner.SortOrder || index + 1,
            BannerImages: banner.BannerImage
              ? banner.BannerImage.map((img) => ({
                BannerImageID: img.documentId,
                BannerImage: img.documentUrl,
              }))
              : [],
          }));

        setActiveBanners(activeBannersData);
      } else {
        throw new Error(response?.data?.message || t("COMMON.API_ERROR"));
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("COMMON.API_ERROR");
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const [inputValues, setInputValues] = useState({});

  // Sync inputValues when activeBanners changes (after drag/reorder)
  useEffect(() => {
    const vals = {};
    activeBanners.forEach((b) => { vals[String(b.BannerID)] = String(b.SequenceNumber); });
    setInputValues(vals);
  }, [activeBanners]);

  const reorderSequences = (banners) => {
    return banners.map((banner, index) => ({
      ...banner,
      SequenceNumber: index + 1,
    }));
  };

  const onDragEnd = (result) => {
    setIsDragging(false);
    setDraggedItemId(null);

    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const oldIndex = result.source.index;
    const newIndex = result.destination.index;

    const items = arrayMove([...activeBanners], oldIndex, newIndex);
    const reorderedItems = reorderSequences(items);

    // Sync inputValues immediately so inputs show correct numbers right after drop
    const newInputVals = {};
    reorderedItems.forEach((b) => { newInputVals[String(b.BannerID)] = String(b.SequenceNumber); });
    setInputValues(newInputVals);
    setActiveBanners(reorderedItems);
    setInputErrors({});
  };

  const onDragUpdate = (update) => {
    // no-op — swap preview removed to avoid stale transform conflicts
  };

  const onDragStart = (start) => {
    setIsDragging(true);
    setDraggedItemId(start.draggableId);
    setSwapPreview(null);
  };

  const onDragCancel = () => {
    setIsDragging(false);
    setDraggedItemId(null);
  };

  const activeDragBanner = draggedItemId
    ? activeBanners.find((b) => String(b.BannerID) === String(draggedItemId))
    : null;
  const activeDragIndex = activeDragBanner
    ? activeBanners.findIndex((b) => String(b.BannerID) === String(draggedItemId))
    : -1;

  const validateSequence = (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 1 && num <= activeBanners.length;
  };

  const handleSequenceChange = (bannerId, newSequence) => {
    const sequenceNum = parseInt(newSequence, 10);

    if (!validateSequence(newSequence)) {
      setInputErrors((prev) => ({ ...prev, [bannerId]: true }));
      // Reset input to current position
      const current = activeBanners.find((b) => String(b.BannerID) === String(bannerId));
      if (current) {
        setInputValues((prev) => ({ ...prev, [bannerId]: String(current.SequenceNumber) }));
      }
      return;
    }

    setInputErrors((prev) => ({ ...prev, [bannerId]: false }));

    const bannerIndex = activeBanners.findIndex((b) => String(b.BannerID) === String(bannerId));
    if (bannerIndex === -1) return;

    // No movement needed
    if (bannerIndex === sequenceNum - 1) {
      setInputValues((prev) => ({ ...prev, [bannerId]: String(sequenceNum) }));
      return;
    }

    const items = [...activeBanners];
    const [movedBanner] = items.splice(bannerIndex, 1);
    items.splice(sequenceNum - 1, 0, movedBanner);

    const reorderedItems = reorderSequences(items);

    // Sync inputValues immediately
    const newInputVals = {};
    reorderedItems.forEach((b) => { newInputVals[String(b.BannerID)] = String(b.SequenceNumber); });
    setInputValues(newInputVals);

    setActiveBanners(reorderedItems);
  };

  const adjustSequence = (bannerId, direction) => {
    const banner = activeBanners.find((b) => String(b.BannerID) === String(bannerId));
    if (!banner) return;

    const newSequence =
      direction === DIRECTIONS.UP
        ? banner.SequenceNumber - 1
        : banner.SequenceNumber + 1;

    if (newSequence < 1 || newSequence > activeBanners.length) return;

    handleSequenceChange(bannerId, newSequence);
  };

  const handleSubmit = async () => {
    // Check permission before updating banner sequence
    if (!hasUpdateBannerPermission) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("COMMON.AUTH_ERROR"));


      // Prepare payload for API
      const payload = {
        BannerDetails: activeBanners.map((banner, index) => ({
          BannerId: banner.BannerID,
          SortOrder: index + 1, // Use array index + 1 for correct sequence
        })),
      };


      const response = await apiPatch(UPDATE_BANNER_SORTORDER, payload, token);

      // Check response success
      const success = response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase() || response?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase();

      if (success) {
        toast.success(response?.data?.message || t("BANNERS.SAVE_SUCCESS"));
        setTimeout(() => navigate("/banners"), 2000);
      } else {
        throw new Error(response?.data?.message || t("COMMON.API_ERROR"));
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("COMMON.API_ERROR");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
    setCurrentPreviewIndex(0);
    setIsAutoPlaying(true);
  };

  const handleNextPreview = () => {
    setCurrentPreviewIndex((prev) =>
      prev < activeBanners.length - 1 ? prev + 1 : 0
    );
  };

  const handlePrevPreview = () => {
    setCurrentPreviewIndex((prev) =>
      prev > 0 ? prev - 1 : activeBanners.length - 1
    );
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleIndicatorClick = (index) => {
    setCurrentPreviewIndex(index);
    // Reset auto-play timer when manually navigating
    if (isAutoPlaying) {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
      autoPlayRef.current = setInterval(() => {
        handleNextPreview();
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-500">{t("COMMON.LOADING")}</div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${isDragging ? "cursor-grabbing" : ""
        }`}
    >
      <ToastContainer />
      {isSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {activeBanners.length}
                </div>
                <div className="text-sm text-gray-500">
                  {t("BANNERS.ACTIVE_BANNERS")}
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-custom-bg">
                  {activeBanners.length}
                </div>
                <div className="text-sm text-gray-500">
                  {t("BANNERS.SEQUENCED")}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-lg transition-all ${isDragging
                  ? "bg-custom-bg/10 text-custom-bg/80"
                  : "text-gray-500 bg-gray-50"
                  }`}
              >
                <GripVertical className="h-4 w-4" />
                <span>
                  {isDragging
                    ? t("BANNERS.DROP_TO_REORDER")
                    : t("BANNERS.DRAG_TO_REORDER")}
                </span>
              </div>
              <button
                onClick={handlePreview}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500 transition-all duration-200 gap-2 shadow-sm"
              >
                <Eye className="h-4 w-4" />
                <span>{t("BANNERS.PREVIEW")}</span>
              </button>
              {hasUpdateBannerPermission ? (
                <Tooltip 
                  text={TOOLTIP_MESSAGES.SAVE_ORDER_CHANGES} 
                  position="top" 
                  align="left"
                >
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>
                      {t("BANNERS.SAVE_SEQUENCES")}
                    </span>
                  </button>
                </Tooltip>
              ) : (
                <Tooltip 
                  text={TOOLTIP_MESSAGES.NO_SAVE_PERMISSION} 
                  position="top" 
                  align="left"
                >
                  <button
                    disabled={true}
                    className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <Save className="h-5 w-5" />
                    <span>
                      {t("BANNERS.SAVE_SEQUENCES")}
                    </span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {activeBanners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Image className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("BANNERS.NO_ACTIVE_BANNERS")}
            </h3>
            <p className="text-gray-500">
              {t("BANNERS.NO_ACTIVE_BANNERS_DESC")}
            </p>
          </div>
        ) : (
          <DragDropContext
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <Droppable droppableId="banners">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {activeBanners.map((banner, index) => (
                    <Draggable
                      key={String(banner.BannerID)}
                      draggableId={String(banner.BannerID)}
                      index={index}
                    >
                      {(provided, snapshot) => {
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative bg-white rounded-2xl shadow-sm border transition-shadow duration-200 ${snapshot.isDragging
                              ? "shadow-2xl border-custom-bg/50 z-50 scale-105"
                              : "border-gray-200 hover:shadow-md"
                              } ${inputErrors[String(banner.BannerID)]
                                ? "border-red-300"
                                : ""
                              }`}
                            style={{
                              ...provided.draggableProps.style,
                              ...(snapshot.isDragging && { transform: `${provided.draggableProps.style?.transform} rotate(2deg)` }),
                            }}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className={`absolute inset-0 cursor-grab active:cursor-grabbing ${snapshot.isDragging
                                ? "opacity-100"
                                : "opacity-0 hover:opacity-20"
                                } bg-custom-bg/10 transition-opacity rounded-2xl z-10`}
                            />

                            <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-20">
                              <div className="p-2 bg-white/80 rounded-lg shadow-md hover:bg-white transition-colors">
                                <GripVertical className="h-5 w-5 text-custom-bg" />
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <div className="relative h-48">
                                {banner.BannerImages?.length > 0 ? (
                                  <img
                                    src={banner.BannerImages[0].BannerImage}
                                    alt={banner.BannerName}
                                    className="w-full h-full object-contain rounded-t-2xl"
                                  />
                                ) : (
                                  <div className="h-full bg-gray-100 flex items-center justify-center rounded-t-2xl">
                                    <div className="text-center text-gray-500">
                                      <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">
                                        {t("BANNERS.NO_IMAGE")}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="absolute top-4 left-4">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {banner.Status}
                                  </span>
                                </div>

                                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
                                  <span className="text-sm font-semibold text-gray-700">
                                    #{index + 1}
                                  </span>
                                </div>
                              </div>

                              <div className="p-6">
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1">
                                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {banner.BannerName}
                                      </h3>
                                    </div>

                                    <div
                                      className={`rounded-xl p-3 border transition-all ${inputErrors[String(banner.BannerID)]
                                        ? "bg-red-50 border-red-200"
                                        : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
                                        }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="relative">
                                          <input
                                            type="number"
                                            min="1"
                                            max={activeBanners.length}
                                            value={inputValues[String(banner.BannerID)] ?? (index + 1)}
                                            onChange={(e) => {
                                              setInputValues((prev) => ({
                                                ...prev,
                                                [String(banner.BannerID)]: e.target.value,
                                              }));
                                              setInputErrors((prev) => ({ ...prev, [String(banner.BannerID)]: false }));
                                            }}
                                            onBlur={() => {
                                              const val = inputValues[String(banner.BannerID)];
                                              handleSequenceChange(String(banner.BannerID), val);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.target.blur();
                                              }
                                            }}
                                            className={`w-16 px-3 py-2 border rounded-lg text-center font-medium focus:ring-2 focus:outline-none transition-all duration-200 bg-white ${inputErrors[String(banner.BannerID)]
                                              ? "border-red-400 focus:ring-red-200 focus:border-red-500"
                                              : "border-gray-300 focus:ring-custom-bg/20 focus:border-custom-bg/50"
                                              }`}
                                          />
                                          {inputErrors[String(banner.BannerID)] && (
                                            <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-red-500">
                                              {t(
                                                "BANNERS.INVALID_POSITION"
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DndContext>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            {t("BANNERS.HOW_TO_REORDER")}
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                <GripVertical className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <strong>{t("BANNERS.CLICK_DRAG")}:</strong>{" "}
                {t("BANNERS.CLICK_DRAG_DESC")}
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                <Hash className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <strong>{t("BANNERS.SET_POSITION")}:</strong>{" "}
                {t("BANNERS.SET_POSITION_DESC")}
              </div>
            </div>
          </div>
        </div>  
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">
                {t("BANNERS.PREVIEW_TITLE")}
              </h3>
              <div className="flex items-center space-x-3">
                {activeBanners.length > 1 && (
                  <button
                    onClick={toggleAutoPlay}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                    title={isAutoPlaying ? t("BANNERS.PAUSE") : t("BANNERS.PLAY")}
                  >
                    {isAutoPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="relative">
              {activeBanners[currentPreviewIndex]?.BannerImages?.length > 0 ? (
                <img
                  src={activeBanners[currentPreviewIndex].BannerImages[0].BannerImage}
                  alt={activeBanners[currentPreviewIndex].BannerName}
                  className="w-full h-96 object-contain transition-opacity duration-500"
                />
              ) : (
                <div className="h-96 bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Image className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p className="text-lg">{t("BANNERS.NO_IMAGE")}</p>
                  </div>
                </div>
              )}

              {activeBanners.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPreview}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <button
                    onClick={handleNextPreview}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">
                  {activeBanners[currentPreviewIndex]?.BannerName}
                </h4>
                <span className="bg-custom-bg/10 text-custom-bg px-3 py-1 rounded-full text-sm font-medium">
                  {t("BANNERS.POSITION")}: {currentPreviewIndex + 1}
                </span>
              </div>

              {activeBanners.length > 1 && (
                <div className="flex justify-center space-x-2 mt-4">
                  {activeBanners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleIndicatorClick(index)}
                      className={`h-3 w-3 rounded-full transition-all ${index === currentPreviewIndex ? 'bg-custom-bg scale-125' : 'bg-gray-300'}`}
                      aria-label={`Go to banner ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveBannersWithSequence;