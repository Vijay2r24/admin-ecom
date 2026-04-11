import { useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Hash } from "lucide-react";
import { useTranslation } from "react-i18next";

/* -------------------------------------------------------
    MAIN COMPONENT
------------------------------------------------------- */
export default function PreviewSortable({
  images = [],
  onRemove,
  onSortChange,
  sensors,
  maxVisible = 5,
}) {
  const { t } = useTranslation();
  const [openModal, setOpenModal] = useState(false);

  if (!images || images.length === 0) return null;

  return (
    <>
      {/* ---- IMAGE STRIP ---- */}
      <div className="mt-1">
        {/* ---- CHANGE ORDER BUTTON ---- */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            <Hash className="w-4 h-4" />
            {t("IMAGE_SORTING.VIEW_DELETE_REORDER")}
          </button>
        )}
      </div>

      {/* ---- MODAL ---- */}
      {openModal && (
        <SortOrderModal
          images={images}
          sensors={sensors}
          onClose={() => setOpenModal(false)}
          onSortChange={onSortChange}
          onRemove={onRemove}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------
    SORTABLE THUMBNAIL (STRIP)
------------------------------------------------------- */
const SortableThumb = ({ id, img, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const src = img.dataUrl || img.preview || img.documentUrl;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="group relative w-12 h-12 rounded overflow-hidden border bg-gray-100"
    >
      <img src={src} className="w-full h-full object-cover" alt="" />
    </div>
  );
};
export { SortableThumb };
/* =======================================================
    SORT ORDER MODAL — INCLUDED IN SAME FILE
======================================================= */
const SortOrderModal = ({ images = [], sensors, onClose, onSortChange, onRemove }) => {
  const { t } = useTranslation();
  const [localImages, setLocalImages] = useState(images);
  const [deletedImages, setDeletedImages] = useState([]); // Track deleted images

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const oldIndex = localImages.findIndex((i) => i.id === active.id);
    const newIndex = localImages.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(localImages, oldIndex, newIndex);
    setLocalImages(reordered);
  };

  const handleDelete = (imgToDelete) => {
    // Add to deleted images list
    setDeletedImages(prev => [...prev, imgToDelete]);
    // Remove from local images
    setLocalImages(prev => prev.filter(i => i.id !== imgToDelete.id));
  };

  const handleSave = () => {
    const result = localImages.map((img, idx) => ({
      ...img,
      sortOrder: idx + 1,
    }));

    // Call onRemove for deleted images
    deletedImages.forEach((deletedImg, index) => {
      const originalIndex = images.findIndex(i => i.id === deletedImg.id);
      if (onRemove && originalIndex !== -1) {
        onRemove(originalIndex);
      }
    });

    onClose();
    onSortChange(result);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl">
        {/* ------------ HEADER ------------ */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("IMAGE_SORTING.REORDER_IMAGES")}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------ DRAG GRID ------------ */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localImages.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-5 gap-4 p-2">
              {localImages.map((img) => (
                <ModalSortableThumb
                  key={img.id}
                  id={img.id}
                  img={img}
                  onDelete={() => handleDelete(img)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* ------------ FOOTER ------------ */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg"
            onClick={onClose}
          >
            {t("COMMON.CANCEL")}
          </button>

          <button
            className="px-4 py-2 bg-custom-bg text-white rounded-lg"
            onClick={handleSave}
          >
            {t("IMAGE_SORTING.SAVE_ORDER")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalSortableThumb = ({ id, img, onDelete }) => {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const src = img.dataUrl || img.preview || img.documentUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group w-20 h-20 rounded border overflow-hidden bg-gray-100 shadow-sm"
    >
      {/* DRAG HANDLE AREA */}
      <div
        {...listeners}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </div>

      {/* DELETE BUTTON */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // prevent drag interference
          if (onDelete) onDelete();
        }}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 shadow-md 
                   opacity-90 group-hover:opacity-100 hover:bg-red-600 transition"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
