import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { SKELETON_TYPES } from '../contants/constants';

const SkeletonLoader = ({ type = SKELETON_TYPES.DEFAULT, rows = 3, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case SKELETON_TYPES.PRODUCT_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle">
                  <div className="flex items-center p-2">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                    <div className="ml-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                    </div>
                  </div>
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="h-2.5 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="h-2.5 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.PRODUCT_INVENTORY_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                {/* Products column */}
                <td className="table-cell text-left align-middle">
                  <div className="flex items-center p-2">
                    <div className="h-10 w-10 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                    <div className="ml-3">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-36" />
                    </div>
                  </div>
                </td>
                {/* Quantity column */}
                <td className="table-cell text-center align-middle">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-12 mx-auto" />
                </td>
                {/* Status (Switch) column */}
                <td className="table-cell text-center align-middle">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
                {/* Actions column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.VARIANT_INVENTORY_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                {/* Variant column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex flex-col items-center gap-1 px-2 py-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </td>
                {/* Image column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
                {/* Price column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-14" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-8" />
                  </div>
                </td>
                {/* Stock column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </td>
                {/* Status (Switch) column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex justify-center">
                    <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </td>
                {/* Actions column */}
                <td className="table-cell text-center align-middle">
                  <div className="flex justify-center">
                    <div className="h-7 w-7 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.PAYMENT_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell w-1/4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="ml-4 min-w-0">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                      <div className="flex items-center">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-1" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="table-cell w-1/5">
                  <div className="flex items-center mb-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-1" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                  <div className="flex items-center mb-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </td>
                <td className="table-cell w-1/6 text-right pr-8">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto" />
                </td>
                <td className="table-cell w-1/6 text-center">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20 mx-auto" />
                </td>
                <td className="table-cell w-1/6 align-middle">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.BULK_IMPORT_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell w-1/4 text-left align-middle px-4 py-3">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 text-gray-300 mr-2 flex-shrink-0" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                  </div>
                </td>
                <td className="table-cell w-1/5 text-center align-middle px-4 py-3">
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="table-cell w-1/6 text-center align-middle px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                </td>
                <td className="table-cell w-1/6 text-center align-middle px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell w-1/6 text-center align-middle px-4 py-3">
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.ATTRIBUTE_TYPE_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-40 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-8 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.ATTRIBUTE_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.CATEGORY_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.BRAND_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.SPECIFICATION_TYPE_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.COLOR_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </div>
                </td>
                <td className="table-cell text-center align-middle px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.PRODUCT_GRID:
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                {/* Header with status and switch */}
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-gray-200 rounded-full animate-pulse w-16" />
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                </div>
                {/* Product image and name */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                  </div>
                </div>
                {/* Category */}
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                {/* Brand */}
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                {/* Actions */}
                <div className="flex gap-1 pt-2">
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );

      case SKELETON_TYPES.USER_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mb-1" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 sm:hidden" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3 lg:hidden" />
                    </div>
                  </div>
                </td>
                <td className="table-cell hidden sm:table-cell text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex flex-col items-start space-y-1 w-full max-w-[150px]">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-full flex items-center justify-start">
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3 flex items-center justify-start">
                      </div>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-2" />
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
                  </div>
                </td>
                <td className="table-cell text-center">
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse mx-auto" />
                </td>
                <td className="table-cell hidden sm:table-cell text-center">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.USER_GRID:
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
                {/* Header with avatar and name */}
                <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                  <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-1" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
                {/* Contact info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                </div>
                {/* Store info */}
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                {/* Footer with status and actions */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                  <div className="flex gap-1">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case SKELETON_TYPES.STORE_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell w-2/5 text-left">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                    </div>
                    <div className="ml-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-full flex items-center">
                      </div>
                    </div>
                  </div>
                </td>
                <td className="table-cell w-1/5 text-left">
                  <div className="flex flex-col items-start space-y-1 w-full">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full flex items-center">
                    </div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3 flex items-center">
                    </div>
                  </div>
                </td>
                <td className="table-cell w-1/5 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </td>
                <td className="table-cell w-1/5 text-center">
                  <div className="flex gap-1 justify-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.STORE_GRID:
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
                {/* Header with icon and name */}
                <div className="flex items-center gap-4 pb-2 border-b border-gray-100">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                  </div>
                </div>
                {/* Contact info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
                  </div>
                </div>
                {/* Footer with status and switch */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                  <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );

      case SKELETON_TYPES.ORDER_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </td>
                <td className="table-cell table-cell-text">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </td>
                <td className="table-cell table-cell-text">
                  <div className="flex flex-col">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                  </div>
                </td>
                <td className="table-cell table-cell-text">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-1" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                </td>
                <td className="table-cell table-cell-text text-right">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto" />
                </td>
                <td className="table-cell text-center">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16 mx-auto" />
                </td>
                <td className="table-cell table-cell-text text-center">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-8 mx-auto" />
                </td>
                <td className="table-cell">
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.ORDER_GRID:
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 space-y-3">
                {/* Order ID */}
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                {/* Date */}
                <div className="flex flex-col space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                </div>
                {/* Customer */}
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
                {/* Status and items */}
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-8" />
                </div>
                {/* View button */}
                <div className="h-8 bg-gray-200 rounded animate-pulse w-full mt-2" />
              </div>
            ))}
          </div>
        );

      case SKELETON_TYPES.BANNER_GRID:
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className="bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col">
                {/* Banner image */}
                <div className="relative w-full">
                  <div className="w-full aspect-[16/9] bg-gray-200 animate-pulse" />
                  {/* Menu button */}
                  <div className="absolute top-3 right-3">
                    <div className="h-8 w-8 bg-white/80 rounded-full animate-pulse" />
                  </div>
                </div>
                {/* Banner details */}
                <div className="p-5 space-y-2">
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
                {/* Status */}
                <div className="px-5 pb-5">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
                </div>
              </div>
            ))}
          </div>
        );

      case SKELETON_TYPES.USER_ROLES_TABLE:
        return (
          <>
            {[...Array(rows)].map((_, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell text-left align-middle">
                  <div className="flex justify-start items-center">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-2" />
                    <div className="flex items-left space-x-2">
                      <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
                    </div>
                  </div>
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="flex justify-center items-center">
                    <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                </td>
                <td className="table-cell text-center align-middle">
                  <div className="flex justify-center items-center">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse ml-1" />
                  </div>
                </td>
              </tr>
            ))}
          </>
        );

      case SKELETON_TYPES.PAGINATION:
        return (
          <div className="sticky bottom-0 bg-white z-10">
            <div className="px-4 py-2.5 bg-gray-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-secondary">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32 inline-block" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
                  <div className="flex gap-1">
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
                </div>
              </div>
            </div>
          </div>
        );

      case SKELETON_TYPES.PROFILE:
        return (
          <div className={`max-w-4xl mx-auto p-6 ${className}`}>
            {/* Profile Header */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="h-24 w-24 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-3" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
              </div>
              <div className="h-10 bg-gray-200 rounded animate-pulse w-24" />
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t pt-6">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-4" />
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
                <div className="h-10 bg-gray-200 rounded animate-pulse w-full" />
              </div>
              <div className="flex justify-end mt-6">
                <div className="h-10 bg-gray-200 rounded animate-pulse w-24" />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={`animate-pulse bg-gray-200 rounded ${className}`}>
            <div className="h-4 w-full"></div>
          </div>
        );
    }
  };

  return renderSkeleton();
};

export default SkeletonLoader;
