import { useState, useEffect, useMemo } from "react";
import { Tab } from "@headlessui/react";
import BrandList from "./brands/BrandList";
import BrandCreate from "./brands/CreateBrand";
import CategoryList from "./categories/CategoryList";
import CategoryCreate from "./categories/CreateCategory";
import AttributeTypeList from "./attributeTypes/AttributeTypeList";
import AttributeTypeCreate from "./attributeTypes/CreateAttributeType";
import ColorList from "./colors/ColorList";
import ColorCreate from "./colors/CreateColor";
import AttributeList from "./AttributeTypeValues/AttributeTypeValuesList";
import AttributeCreate from "./AttributeTypeValues/CreateAttributeTypeValuesList";
import CreateProductGroup from "./productGroups/CreateProductGroup";
import {
  Package,
  Tag,
  Palette,
  Layers,
  Settings,
  Boxes,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, Navigate } from "react-router-dom";
import { useTitle } from "../../context/TitleContext";
import SpecificationTypeList from "./productSpecification/SpecificationTypeList";
import {
  APP_ROUTES,
  BROWSE_NAV_STATE,
  FORM_MODES,
  PRODUCT_SETUP_TAB,
  PRODUCT_SETUP_TAB_I18N,
  VIEW_TYPES,
} from "../../contants/constants";
import PlanGate from "../PlanGate";
import {
  getFirstAccessibleHrefForSession,
  getSubscriptionFeaturesFromStorage,
  isProductSetupTabAllowedByPlan,
  isTenantAdminRole,
} from "../../utils/planAccessUtils";
import { hasProductSetupTabViewPermission } from "../../utils/productSetupPermissionUtils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Tab key → list/create components and icon (non-i18n UI wiring). */
const PRODUCT_SETUP_TAB_COMPONENTS = {
  [PRODUCT_SETUP_TAB.BRANDS]: {
    list: BrandList,
    create: BrandCreate,
    icon: Package,
  },
  [PRODUCT_SETUP_TAB.CATEGORIES]: {
    list: CategoryList,
    create: CategoryCreate,
    icon: Tag,
  },
  [PRODUCT_SETUP_TAB.ATTRIBUTE_TYPES]: {
    list: AttributeTypeList,
    create: AttributeTypeCreate,
    icon: Settings,
  },
  [PRODUCT_SETUP_TAB.COLORS]: {
    list: ColorList,
    create: ColorCreate,
    icon: Palette,
  },
  [PRODUCT_SETUP_TAB.ATTRIBUTES]: {
    list: AttributeList,
    create: AttributeCreate,
    icon: Layers,
  },
  [PRODUCT_SETUP_TAB.SPECIFICATION_TYPES]: {
    list: SpecificationTypeList,
    create: CreateProductGroup,
    icon: Boxes,
  },
};

/** `location.state` flag → Product Setup tab to select after navigation. */
const BROWSE_NAV_STATE_TO_TAB = {
  [BROWSE_NAV_STATE.FROM_CATEGORY_EDIT]: PRODUCT_SETUP_TAB.CATEGORIES,
  [BROWSE_NAV_STATE.FROM_ATTRIBUTE_TYPE_EDIT]: PRODUCT_SETUP_TAB.ATTRIBUTE_TYPES,
  [BROWSE_NAV_STATE.FROM_BRAND_EDIT]: PRODUCT_SETUP_TAB.BRANDS,
  [BROWSE_NAV_STATE.FROM_COLOR_EDIT]: PRODUCT_SETUP_TAB.COLORS,
  [BROWSE_NAV_STATE.FROM_ATTRIBUTE_EDIT]: PRODUCT_SETUP_TAB.ATTRIBUTES,
  [BROWSE_NAV_STATE.FROM_PRODUCT_GROUP_EDIT]: PRODUCT_SETUP_TAB.SPECIFICATION_TYPES,
};

const Browse = () => {
  const [nSelectedTab, setSelectedTab] = useState(0);
  const [sViewMode, setViewMode] = useState(VIEW_TYPES.LIST);

  const { t } = useTranslation();
  const location = useLocation();
  const { setTitle } = useTitle();

  const aTabs = useMemo(
    () =>
      Object.values(PRODUCT_SETUP_TAB).map((tabKey) => {
        const i18n = PRODUCT_SETUP_TAB_I18N[tabKey];
        const components = PRODUCT_SETUP_TAB_COMPONENTS[tabKey];
        return {
          planTabKey: tabKey,
          name: t(i18n.title),
          sectionTitleKey: i18n.planGateSection,
          list: components.list,
          create: components.create,
          icon: components.icon,
        };
      }),
    [t]
  );

  const visibleTabs = useMemo(
    () => aTabs.filter((tab) => hasProductSetupTabViewPermission(tab.planTabKey)),
    [aTabs]
  );

  const planFeatures = useMemo(() => getSubscriptionFeaturesFromStorage(), [
    location.pathname,
  ]);
  const ignorePlanForAdmin = isTenantAdminRole();

  useEffect(() => {
    if (nSelectedTab >= visibleTabs.length) {
      setSelectedTab(0);
    }
  }, [visibleTabs.length, nSelectedTab]);

  useEffect(() => {
    if (!location.state) return;

    const matchedEntry = Object.entries(BROWSE_NAV_STATE_TO_TAB).find(
      ([stateKey]) => location.state[stateKey]
    );
    if (!matchedEntry) return;

    const [, tabKey] = matchedEntry;
    const tabIndex = visibleTabs.findIndex((tab) => tab.planTabKey === tabKey);
    if (tabIndex !== -1) {
      setSelectedTab(tabIndex);
    }
    setViewMode(VIEW_TYPES.LIST);
    window.history.replaceState({}, document.title);
  }, [location.state, visibleTabs]);

  useEffect(() => {
    setTitle(t("PRODUCT_SETUP.PRODUCT_SETUP"));
  }, [setTitle, t]);

  if (visibleTabs.length === 0) {
    const next = getFirstAccessibleHrefForSession();
    return <Navigate to={next || APP_ROUTES.NOT_AUTHORIZED} replace />;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2">
      <div className="overflow-visible">
        <Tab.Group
          selectedIndex={nSelectedTab}
          onChange={(index) => {
            setSelectedTab(index);
            setViewMode(VIEW_TYPES.LIST);
          }}
        >
          <div className="overflow-x-auto">
            <Tab.List className="flex space-x-4 min-w-max border-b border-gray-200 px-4 sm:px-6">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Tab
                    key={tab.planTabKey}
                    className={({ selected }) =>
                      classNames(
                        "flex items-center px-3 sm:px-5 py-2 sm:py-3 text-sm font-medium border-b-2 transition duration-150 ease-in-out whitespace-nowrap",
                        selected
                          ? "border-custom-bg text-custom-bg"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {tab.name}
                  </Tab>
                );
              })}
            </Tab.List>
          </div>

          <Tab.Panels>
            {visibleTabs.map((tab, idx) => (
              <Tab.Panel key={tab.planTabKey} className="p-4 sm:p-6">
                {isProductSetupTabAllowedByPlan(
                  tab.planTabKey,
                  planFeatures,
                  ignorePlanForAdmin
                ) ? (
                  sViewMode === VIEW_TYPES.LIST ? (
                    <tab.list onCreate={() => setViewMode(FORM_MODES.CREATE)} />
                  ) : (
                    <tab.create setViewMode={setViewMode} />
                  )
                ) : (
                  <PlanGate embed sectionTitle={t(tab.sectionTitleKey)} />
                )}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default Browse;
