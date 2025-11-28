import { useTranslation } from "react-i18next";
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  handlePrevPage,
  handleNextPage,
  handlePageClick,
}) => {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 bg-white z-10">
<div className="px-4 py-2.5 bg-gray-100">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-secondary print:text-xs">
          <span className="mr-1">{t("COMMON.SHOWING")}</span>
          <span className="font-semibold">
            {(currentPage - 1) * itemsPerPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{" "}
          {t("COMMON.OF")} <span className="font-semibold">{totalItems}</span>{" "}
          {t("COMMON.RESULTS")}
        </div>
 
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="pagination-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            {t("COMMON.PREVIOUS")}
          </button>
          {/* Show only a limited set of page numbers */}
          {(() => {
            const pageButtons = [];
            const maxVisible = 5;
            let startPage = Math.max(
              1,
              currentPage - Math.floor(maxVisible / 2)
            );
            let endPage = startPage + maxVisible - 1;
            if (endPage > totalPages) {
              endPage = totalPages;
              startPage = Math.max(1, endPage - maxVisible + 1);
            }
            if (startPage > 1) {
              pageButtons.push(
                <button
                  key={1}
                  className={`pagination-btn${
                    currentPage === 1 ? " pagination-btn-active" : ""
                  }`}
                  onClick={() => handlePageClick(1)}
                >
                  1
                </button>
              );
              if (startPage > 2) {
                pageButtons.push(
                  <span key="start-ellipsis" className="px-1.5 text-xs text-gray-500">
                    ...
                  </span>
                );
              }
            }
            for (let i = startPage; i <= endPage; i++) {
              pageButtons.push(
                <button
                  key={i}
                  className={`pagination-btn${
                    currentPage === i ? " pagination-btn-active" : ""
                  }`}
                  onClick={() => handlePageClick(i)}
                >
                  {i}
                </button>
              );
            }
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) {
                pageButtons.push(
                  <span key="end-ellipsis" className="px-1.5 text-xs text-gray-500">
                    ...
                  </span>
                );
              }
              pageButtons.push(
                <button
                  key={totalPages}
                  className={`pagination-btn${
                    currentPage === totalPages ? " pagination-btn-active" : ""
                  }`}
                  onClick={() => handlePageClick(totalPages)}
                >
                  {totalPages}
                </button>
              );
            }
            return pageButtons;
          })()}
          <button
            className="pagination-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            {t("COMMON.NEXT")}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
 
export default Pagination;