import React, { useState } from "react";
import { Package, Globe, Hash, Plus, PlusCircle, Weight, Settings, Scale, Ruler } from "lucide-react";
import TextInputWithIcon from "../TextInputWithIcon";
import SelectWithIcon from "../SelectWithIcon";
import AddPackageModal from "./AddPackageModal";
import EditPackageModal from "./EditPackageModal";
import { FIELD_NAMES, SELECT_VALUES } from "../../contants/constants";

const ShippingSection = ({ 
  shippingData, 
  onShippingChange, 
  packageOptions = [],
  countryOptions = [],
  errors = {},
  onAddPackage,
  className = ""
}) => {
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle "Add New" selection
    if (name === FIELD_NAMES.PACKAGE && value === SELECT_VALUES.ADD_NEW) {
      setShowAddPackageModal(true);
      return;
    }
    
    onShippingChange(name, value);
  };

  const handleAddPackage = (newPackage) => {
    if (onAddPackage) {
      onAddPackage(newPackage);
    }
  };

  const handleEditPackage = (packageOption) => {
    console.log("Edit package clicked:", packageOption);
    console.log("Package option type:", typeof packageOption);
    console.log("Package option keys:", Object.keys(packageOption));
    setEditingPackage(packageOption);
    setShowEditPackageModal(true);
  };

  const handleUpdatePackage = (updatedPackage) => {
    // This would update the package in the parent component
    // For now, just log and close the modal
    
    // If we had an onUpdatePackage prop, we would call it here
    // onEditPackage?.(updatedPackage);
    
    setShowEditPackageModal(false);
    setEditingPackage(null);
  };

  // Enhanced package options with "Add New" option at the top
  const enhancedPackageOptions = [
    { value: "add-new", label: "Add New", isSpecial: true, icon: PlusCircle },
    ...packageOptions
  ];

  // Debug: Log package options
  console.log("Package options received:", packageOptions);
  console.log("Enhanced package options:", enhancedPackageOptions);

  return (
    <div className={`bg-white rounded-3xl shadow-lg border border-gray-100 overflow-visible ${className}`}>
      <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Package className="h-6 w-6 mr-3 text-custom-bg" />
          Shipping
        </h2>
      </div>
      
      <div className="p-8 space-y-8">
            {/* Package and Weight in same row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Package Selection */}
              <div>
                <SelectWithIcon
                  label="Package"
                  id="package"
                  name="package"
                  value={shippingData.package || ""}
                  onChange={handleInputChange}
                  options={enhancedPackageOptions}
                  Icon={Package}
                  error={errors.package}
                  placeholder="Select a package"
                  onEditOption={handleEditPackage}
                />
              </div>

              {/* Product Weight */}
              <div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <TextInputWithIcon
                      label="Product weight"
                      id="weight"
                      name="weight"
                      value={shippingData.weight || ""}
                      onChange={handleInputChange}
                      placeholder="0.0"
                      type="number"
                      step="0.1"
                      Icon={Scale}
                      error={errors.weight}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-32">
                      <SelectWithIcon
                        id="weightUnit"
                        name="weightUnit"
                        value={shippingData.weightUnit || "kg"}
                        onChange={handleInputChange}
                        options={[
                          { value: "kg", label: "kg" },
                          { value: "lb", label: "lb" },
                          { value: "oz", label: "oz" },
                          { value: "g", label: "g" }
                        ]}
                        Icon={Ruler}
                        placeholder="kg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Country of Origin and HS Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <SelectWithIcon
                  label="Country of origin"
                  id="countryOfOrigin"
                  name="countryOfOrigin"
                  value={shippingData.countryOfOrigin || ""}
                  onChange={handleInputChange}
                  options={countryOptions}
                  Icon={Globe}
                  error={errors.countryOfOrigin}
                  placeholder="Select country"
                />
              </div>

              <div>
                <TextInputWithIcon
                  label="HS Code"
                  id="hsCode"
                  name="hsCode"
                  value={shippingData.hsCode || ""}
                  onChange={handleInputChange}
                  placeholder="Enter HS code"
                  Icon={Hash}
                  error={errors.hsCode}
                />
              </div>
            </div>
      </div>

      {/* Add Package Modal */}
      <AddPackageModal
        isOpen={showAddPackageModal}
        onClose={() => setShowAddPackageModal(false)}
        onAddPackage={handleAddPackage}
      />

      {/* Edit Package Modal */}
      <EditPackageModal
        isOpen={showEditPackageModal}
        onClose={() => {
          setShowEditPackageModal(false);
          setEditingPackage(null);
        }}
        onUpdatePackage={handleUpdatePackage}
        packageData={editingPackage}
      />
    </div>
  );
};

export default ShippingSection;
