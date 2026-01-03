import React, { useState, useRef, useEffect } from "react";
import { PaintBucket, UploadCloud,Heart,ShoppingCart } from "lucide-react";
import TextInputWithIcon from "../components/TextInputWithIcon";
import electronics from "../../assets/images/electronics.jpg";
import women from "../../assets/images/women.jpg";
import men from "../../assets/images/men.jpg";
import kids from "../../assets/images/kids.jpg";
import beauty from "../../assets/images/beauty.jpg";
import accessories from "../../assets/images/accessories.jpg";
import banner1 from "../../assets/images/banner1.jpg";
import mobile from "../../assets/images/mobile.jpg";
import { useTitle } from "../context/TitleContext";
import { useTranslation } from "react-i18next";
import { CUSTOM_COLORS, FILE_CONSTANTS } from "../contants/constants";

const ApplicationSettings = () => {
  const { t } = useTranslation()
  const defaultColor = t(CUSTOM_COLORS.primary);
  const [primaryColor, setPrimaryColor] = useState(defaultColor);
  const [logo, setLogo] = useState(null);
  const { setTitle } = useTitle();

  const fileInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    setPrimaryColor(defaultColor);
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const categories = [women, beauty, kids, men, accessories, mobile];
  useEffect(() => {
    setTitle(t("THEMESETTINGS.TITLE"));
  }, [setTitle, t]);

  return (
    <div className="flex gap-10 p-6">
     
           <div className="w-[600px] h-[300px] bg-white p-6 rounded-2xl shadow-lg border">
        <TextInputWithIcon
          label="Primary Color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          Icon={PaintBucket}
          placeholder={defaultColor}
          inputSlot={
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-7 h-7 border rounded-full cursor-pointer"
            />
          }
        />
        <div className="space-y-2">
        

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />


           <div className="mt-6">
              <p className="text-sm text-gray-600 mb-2">{t("THEMESETTINGS.STORE_LOGO")}</p>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border flex items-center justify-center overflow-hidden bg-gray-50">
                  {logo ? (
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">{t("THEMESETTINGS.NO_LOGO")}</span>
                  )}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
                  >
                    <UploadCloud size={18} />
                    {t("THEMESETTINGS.UPLOAD_LOGO")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="w-fit px-4 py-2 mt-2 bg-custom-bg rounded-lg text-sm text-white font-semibold"
        >
         {t("THEMESETTINGS.RESET_AS_DEFAULT")}
        </button>
      </div>
    

      {/* WEB PREVIEW */}
      <div className="w-[70%] flex flex-col items-center mt-1 ml-auto pr-5">
      


        <div className="origin-top-right scale-[0.85] w-[750px] h-[720px] overflow-y-auto bg-white shadow-xl rounded-2xl border border-gray-200 p-0">
       <div
  className="w-full px-6 py-4 flex items-center justify-between shadow-sm"
  style={{ backgroundColor: primaryColor }}
>
  {/* LEFT: Logo + ShopNow */}
  <div className="flex items-center gap-2">
    {logo && (
      <img
        src={logo}
        alt="Logo"
        className="h-10 w-10 object-contain rounded-md bg-white/20 p-1"
      />
    )}
    <h2 className="text-3xl font-bold text-white">
      {t("THEMESETTINGS.WEB_TEXT")}
    </h2>
  </div>

  {/* RIGHT: Icons */}
  <div className="flex items-center gap-4 text-white text-xl">
   <Heart size={18} className="text-red-500 cursor-pointer" />
<ShoppingCart size={18} className="text-gray-700 cursor-pointer" />

  </div>
</div>


          {/* BODY */}
          <div className="p-6">
            <div className="flex justify-between items-center px-2">
              <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
               {(t("THEMESETTINGS.DESCRIPTION"))}
              </h1>

              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                🔔
              </div>
            </div>

            {/* Banner */}
            <div className="mt-6">
              <div className="rounded-2xl overflow-hidden flex items-center justify-center bg-white">
                <img src={banner1} alt="Sale Banner" className="w-full object-contain rounded-2xl" />
              </div>
            </div>

            {/* Categories */}
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-4">{t("THEMESETTINGS.CATEGORIES")}</h3>
              <div className="flex gap-5 flex-wrap">
                {categories.map((cat, i) => (
                  <div key={i} className="flex flex-col items-center w-24">
                    <div className="w-full aspect-square overflow-hidden rounded-xl shadow-md">
                      <img src={cat} alt={`Category ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm mt-2 font-semibold">{t("THEMESETTINGS.CATEGORY")} {i + 1}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-4">{t("THEMESETTINGS.TRENDING_NOW")}</h3>
              <div className="grid grid-cols-3 gap-5">
                {[women, accessories, kids, men, mobile, electronics].map((img, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md border">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                      <img src={img} alt="product" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold">{t("THEMESETTINGS.PRODUCT")} {i + 1}</p>
                      <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                       {t("THEMESETTINGS.COST")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;


