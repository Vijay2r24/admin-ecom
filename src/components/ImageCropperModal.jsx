
import { useRef, useEffect, useState } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import PropTypes from "prop-types";

const ImageCropperModal = ({
  image,
  queue = [], // [{id, url, context}]
  onCropComplete,
  onQueueUpdate,       // <-- REQUIRED for delete
  onClose,
  aspectRatio,
  minWidth,
  minHeight,
  title,
  cancelText = "Cancel",
  saveText = "Ok",
  context,
}) => {
  const cropperRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Current item (image + metadata)
  const activeItem = queue[activeIndex];
  const activeImage = activeItem?.url || image;
  const activeContext =
    activeItem?.context ||
    context ||
    (Array.isArray(image) ? image[1] : undefined);

  // ⛑ Keep activeIndex inside bounds when queue updates
  useEffect(() => {
    if (activeIndex >= queue.length) {
      setActiveIndex(Math.max(0, queue.length - 1));
    }
  }, [queue, activeIndex]);

  // ---------------------------------------------------------
  // DELETE Image
  // ---------------------------------------------------------
  const handleDelete = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);

    onQueueUpdate(newQueue); // notify parent

    if (newQueue.length === 0) {
      onClose(); // no more images → close modal
      return;
    }

    // Adjust activeIndex
    if (index === activeIndex) {
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (index < activeIndex) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  // ---------------------------------------------------------
  // CROP CURRENT IMAGE
  // ---------------------------------------------------------
  const handleCrop = async () => {
    if (processing) return;

    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setProcessing(true);

    try {
      const canvas = cropper.getCroppedCanvas({
        width: minWidth,
        height: minHeight,
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          // Pass cropped blob to parent
          onCropComplete(blob, activeContext);

          // Remove processed image from queue
          const newQueue = queue.filter((_, i) => i !== activeIndex);
          onQueueUpdate(newQueue);

          // If empty → close
          if (newQueue.length === 0) {
            onClose();
            return;
          }

          setActiveIndex((prev) => Math.min(prev, newQueue.length - 1));
        },
        "image/jpeg",
        0.9
      );
    } finally {
      setProcessing(false);
    }
  };

  // Cleanup cropper on unmount
  useEffect(() => () => {
    if (cropperRef.current?.cropper) {
      cropperRef.current.cropper.destroy();
    }
    cropperRef.current = null;
  }, []);

  if (!activeImage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 w-full max-w-4xl shadow-xl">

        {/* Title */}
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {title || `Crop Image (${activeIndex + 1} / ${queue.length})`}
        </h2>

        {/* ---------- THUMBNAILS ---------- */}
        <div className="flex items-center gap-3 mb-4 overflow-x-auto py-2">
          {queue.map((img, idx) => (
            <div
              key={img.id}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border cursor-pointer transition
                ${
                  idx === activeIndex
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-300"
                }`}
              onClick={() => setActiveIndex(idx)}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />

              {/* DELETE BUTTON */}
              <button
                className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(idx);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* ---------- CROPPER ---------- */}
        <div className="mb-4" style={{ height: "320px" }}>
          <Cropper
            ref={cropperRef}
            src={activeImage}
            style={{ height: "100%", width: "100%" }}
            aspectRatio={aspectRatio}
            viewMode={1}
            minCropBoxWidth={minWidth}
            minCropBoxHeight={minHeight}
            autoCropArea={0.85}
            responsive
            checkOrientation={false}
            guides
          />
        </div>

        {/* ---------- FOOTER ---------- */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onQueueUpdate([]);
              onClose();
            }}
            disabled={processing}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {cancelText}
          </button>

          <button
            onClick={handleCrop}
            disabled={processing}
            className="px-4 py-2 bg-custom-bg text-white rounded-md hover:bg-bg-hover"
          >
            {processing ? "Processing..." : saveText}
          </button>
        </div>
      </div>
    </div>
  );
};

ImageCropperModal.propTypes = {
  image: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  queue: PropTypes.array.isRequired,
  onCropComplete: PropTypes.func.isRequired,
  onQueueUpdate: PropTypes.func.isRequired, // <-- REQUIRED FOR DELETE
  onClose: PropTypes.func.isRequired,
  aspectRatio: PropTypes.number.isRequired,
  minWidth: PropTypes.number.isRequired,
  minHeight: PropTypes.number.isRequired,
  title: PropTypes.string,
  cancelText: PropTypes.string,
  saveText: PropTypes.string,
  context: PropTypes.any,
};

export default ImageCropperModal;
