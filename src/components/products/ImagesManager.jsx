
import React from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import PreviewSortable, { SortableThumb } from "./PreviewSortable.jsx";

const ImageManagement = ({
  type = "variant",        // "variant" | "global"
  images = [],
  onFilesDrop,
  onRemoveImage,
  onSortChange,
  label,
  sensors,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    onDrop: onFilesDrop,
  });

  return (
    <div className="mt-2">

      {/* Upload box */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-3 cursor-pointer bg-gray-50
          hover:bg-gray-100 transition min-h-[100px] relative
          ${isDragActive ? "border-blue-400 bg-blue-100" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />

        {/* Initial empty state */}
        {images.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Upload className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm text-gray-700">
              {label || "Click to upload images"}
            </p>
            <p className="text-xs text-gray-500">or drag & drop</p>
          </div>
        ) : (
          <>
            {/* Floating + icon */}
            <div className="absolute top-1 right-1 w-7 h-7 bg-blue-100 border border-blue-300 
                rounded flex items-center justify-center pointer-events-none z-10">
              <span className="text-xl text-blue-600">+</span>
            </div>

            {/* Thumbnails row */}
            <div className="flex flex-nowrap gap-1.5 p-1 pointer-events-none overflow-x-auto">
              {images.slice(0, 3).map((img, idx) => (
                <div key={img.id} className="pointer-events-auto">
                  <SortableThumb id={img.id} img={img} onRemove={() => onRemoveImage(idx)} />
                </div>
              ))}

              {images.length > 3 && (
                <div className="w-12 h-12 bg-gray-200 flex items-center justify-center text-xs 
                    rounded border shadow-sm">
                  +{images.length - 3}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sorting grid below */}
      <div className="mt-2">
        <PreviewSortable
          images={images}
          sensors={sensors}
          onRemove={(i) => onRemoveImage(i)}
          onSortChange={onSortChange}
          maxVisible={4}
        />
      </div>
    </div>
  );
};

export default ImageManagement;
