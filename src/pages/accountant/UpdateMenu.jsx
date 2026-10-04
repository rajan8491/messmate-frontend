/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from "react";
import AccountantContext from "../../context/AccountantContext";
import toast from "react-hot-toast";
import Header from "../../components/common/Header";
import MenuPreviewModal from "../../components/accountant/updateMenu/MenuPreviewModal";
import SearchableCombobox from "../../components/common/SearchableCombobox";
import { DAYS, MEALS } from "../../assets/assets";
import DaySelector from "../../components/common/DaySelector";
import { formatDate, generateEmptyMenu, normalizeMenuData } from "../../utils/helpers";
import { toastWarn } from "../../utils/toast";
import imageCompression from "browser-image-compression";
import { weeklyMenuSchema } from "../../schemas/accountant.schema";
import { validateWithZod } from "../../utils/validateWithZod";

export default function UpdateMenu() { 

  const {
    extractWeeklyMenuFromImage,
    uploadWeeklyMenu,
    lastUpdatedOn,
    fetchWeeklyMenu,
    weeklyMenu,
    fetchActiveCatalog,
  } = useContext(AccountantContext);

  const [activeDay, setActiveDay] = useState("monday");
  const [activeMeal, setActiveMeal] = useState("breakfast");
  const [menu, setMenu] = useState(generateEmptyMenu());
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Master Catalog State
  const [catalog, setCatalog] = useState({ diets: [], extras: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [extracting, setExtracting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  /* ---------- Fetch Master Catalog & Initial Menu ---------- */
  useEffect(() => {
    let ignore = false;

    const initData = async () => {
      try {
        setLoadingCatalog(true);
        // Load master items and existing menu concurrently
        const [catalogRes] = await Promise.all([
          fetchActiveCatalog ? fetchActiveCatalog() : Promise.resolve({ diets: [], extras: [] }),
          fetchWeeklyMenu(),
        ]);

        if (!ignore) {
          if (catalogRes) setCatalog(catalogRes);
          if(weeklyMenu && Object.keys(weeklyMenu).length > 0) setMenu(weeklyMenu);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load menu data");
        }
      } finally {
        if (!ignore) setLoadingCatalog(false);
      }
    };

    initData();
    return () => {
      ignore = true;
    };
  }, []);

  /* ---------- Helpers for Deep State Updates ---------- */
  const getActiveData = () => menu[activeDay][activeMeal];

  const updateTime = (field, value) => {
    setMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay][activeMeal],
          time: { ...prev[activeDay][activeMeal].time, [field]: value },
        },
      },
    }));
  };

  // ------------- Helpers for Diet (Catalog Select) ------------------------
  const handleSelectDiet = (idx, selectedId) => {
    const matched = catalog.diets.find((item) => String(item.id) === String(selectedId));
    if (!matched) return;

    // Prevent selecting duplicate items within the same meal slot
    const alreadySelected = getActiveData().diet.some(
      (d, i) => i !== idx && String(d.id) === String(selectedId)
    );
    if (alreadySelected) {
      return toastWarn("This item is already added to this meal");
    }

    setMenu((prev) => {
      const newDiet = [...prev[activeDay][activeMeal].diet];
      newDiet[idx] = { id: matched.id, name: matched.name };
      return {
        ...prev,
        [activeDay]: {
          ...prev[activeDay],
          [activeMeal]: { ...prev[activeDay][activeMeal], diet: newDiet },
        },
      };
    });
  };

  const addDietSlot = () => {
    setMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay][activeMeal],
          diet: [...prev[activeDay][activeMeal].diet, { id: "", name: "" }],
        },
      },
    }));
  };

  const removeDiet = (idx) => {
    setMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay][activeMeal],
          diet: prev[activeDay][activeMeal].diet.filter((_, i) => i !== idx),
        },
      },
    }));
  };

  // ----------------------- Helpers for Extra (Catalog Select) -----------------
  const handleSelectExtra = (idx, selectedId) => {
    const matched = catalog.extras.find((item) => String(item.id) === String(selectedId));
    if (!matched) return;

    const alreadySelected = getActiveData().extras.some(
      (e, i) => i !== idx && String(e.id) === String(selectedId)
    );
    if (alreadySelected) {
      return toastWarn("This extra item is already added to this meal");
    }

    setMenu((prev) => {
      const newExtras = [...prev[activeDay][activeMeal].extras];
      newExtras[idx] = {
        id: matched.id,
        name: matched.name,
        price: matched.price,
      };
      return {
        ...prev,
        [activeDay]: {
          ...prev[activeDay],
          [activeMeal]: { ...prev[activeDay][activeMeal], extras: newExtras },
        },
      };
    });
  };

  const addExtraSlot = () => {
    setMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay][activeMeal],
          extras: [...prev[activeDay][activeMeal].extras, { id: "", name: "", price: "" }],
        },
      },
    }));
  };

  const removeExtra = (idx) => {
    setMenu((prev) => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [activeMeal]: {
          ...prev[activeDay][activeMeal],
          extras: prev[activeDay][activeMeal].extras.filter((_, i) => i !== idx),
        },
      },
    }));
  };

  /* ---------- Image Preview & Compression ---------- */
  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleExtract = async () => {
    if (!image) return toast.error("Please upload an image first");

    setExtracting(true);
    setCompressing(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(image, options);
      setCompressing(false);

      const rawAiData = await extractWeeklyMenuFromImage(compressedFile);
      const formattedMenu = normalizeMenuData(rawAiData);
      setMenu(formattedMenu);
      toast.success("Menu extracted & filled successfully");
    } catch (e) {
      toast.error(e.message || "Failed to extract menu");
    } finally {
      setExtracting(false);
      setCompressing(false);
    }
  };

  /* ---------- Validation and Save ---------- */
  const handleInitiateUpload = () => {
    const cleanMenu = JSON.parse(JSON.stringify(menu));
    for (const day of DAYS) {
      for (const meal of MEALS) {
        const mData = cleanMenu[day][meal];
        // Retain only valid catalog selections with IDs
        mData.diet = mData.diet.filter((d) => d.id);
        mData.extras = mData.extras.filter((e) => e.id);
      }
    }
    setMenu(cleanMenu);

    const hasItems = Object.values(cleanMenu).some((day) =>
      Object.values(day).some((meal) => meal.diet.length > 0)
    );

    if (!hasItems) {
      return toastWarn("Menu is completely empty");
    }
    setShowModal(true);
  };

  const handleFinalUpload = async () => {
    setUploading(true);
    // const { success, errors, data } = validateWithZod(weeklyMenuSchema, menu);
    // if (!success) {
    //   const firstKey = Object.keys(errors)[0];
    //   toast.error(errors[firstKey] || "One or more days have an incomplete menu");
    //   setUploading(false);
    //   return;
    // }

    try {
      await uploadWeeklyMenu(menu);
      toast.success("Weekly menu updated successfully");
      setShowModal(false);
    } catch (e) {
      toast.error(e.message || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const activeData = getActiveData();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-green-50 via-green-50/40 to-white pt-16 pb-24 px-4 md:px-8">
      <MenuPreviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleFinalUpload}
        menu={menu}
        loading={uploading}
      />

      <Header
        heading="Update Full Menu"
        subheading={
          lastUpdatedOn ? (
            <p>
              Menu last updated on
              <span className="ml-1 text-gray-700">{formatDate(lastUpdatedOn)}</span>
            </p>
          ) : (
            "You are uploading the menu first time"
          )
        }
      />

      {/* ---------- 1. IMAGE UPLOAD CARD ---------- */}
      <div className="max-w-7xl mx-auto mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <h3 className="font-bold text-gray-800">Auto-fill via Image</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:bg-blue-50 hover:border-blue-300 transition w-full md:w-auto">
              <i className="fa-solid fa-cloud-arrow-up text-blue-500"></i>
              <span className="text-sm font-medium text-gray-600 truncate max-w-30 sm:max-w-50">
                {image ? image.name : "Choose Menu Image"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                className="hidden"
              />
            </label>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="preview"
                className="h-12 w-12 rounded-lg object-cover border shadow-sm"
              />
            )}
          </div>
        </div>

        <button
          onClick={handleExtract}
          disabled={extracting}
          className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap"
        >
          {extracting ? (
            compressing ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Compressing IMG...
              </>
            ) : (
              <>
                <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Processing AI...
              </>
            )
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Extract & Autofill
            </>
          )}
        </button>
      </div>

      {/* ---------- 2. DAY SELECTOR ---------- */}
      <DaySelector onClickHandler={setActiveDay} activeDay={activeDay} />

      {/* ---------- 3. MAIN EDITOR CARD ---------- */}
      <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden">
        {/* Meal Tabs */}
        <div className="flex border-b border-b-gray-200 bg-gray-50/50">
          {MEALS.map((meal) => (
            <button
              key={meal}
              onClick={() => setActiveMeal(meal)}
              className={`flex-1 py-4 font-bold text-sm md:text-base capitalize border-b-2 transition-colors ${
                activeMeal === meal
                  ? "border-green-500 text-green-700 bg-white"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              {meal}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8 space-y-8 md:space-y-10">
          {/* SECTION: TIME */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <i className="fa-regular fa-clock text-sm"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Serving Time</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:bg-white focus-within:border-blue-500 transition-colors">
                <label
                  htmlFor={`${activeDay}-${activeMeal}-start`}
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1"
                >
                  Start
                </label>
                <input
                  id={`${activeDay}-${activeMeal}-start`}
                  type="time"
                  value={activeData.time.start}
                  onChange={(e) => updateTime("start", e.target.value)}
                  className="w-full bg-transparent outline-none font-semibold text-gray-700"
                />
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-transparent focus-within:bg-white focus-within:border-blue-500 transition-colors">
                <label
                  htmlFor={`${activeDay}-${activeMeal}-end`}
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1"
                >
                  End
                </label>
                <input
                  id={`${activeDay}-${activeMeal}-end`}
                  type="time"
                  value={activeData.time.end}
                  onChange={(e) => updateTime("end", e.target.value)}
                  className="w-full bg-transparent outline-none font-semibold text-gray-700"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>
          {/* SECTION: DIET (SEARCHABLE FROM CATALOG) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-list-ul text-sm"></i>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Diet Menu Items</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                Type to search approved items
              </span>
            </div>

            <div className="space-y-3">
              {activeData.diet.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <span className="text-gray-300 font-bold text-sm w-4 text-center shrink-0">
                    {i + 1}.
                  </span>

                  {/* Searchable Combobox for Diet */}
                  <SearchableCombobox
                    items={catalog.diets}
                    selectedId={item.id}
                    onSelect={(id) => handleSelectDiet(i, id)}
                    disabled={loadingCatalog}
                    placeholder="Search diet item (e.g. Poha, Rice)..."
                    borderColor="focus-within:border-orange-400"
                  />

                  <button
                    onClick={() => removeDiet(i)}
                    aria-label="Remove item"
                    className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}

              <button
                onClick={addDietSlot}
                disabled={loadingCatalog}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> Add Item Slot
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>

          {/* SECTION: EXTRAS (SEARCHABLE FROM CATALOG) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-plus text-sm"></i>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Extras / Add-ons</h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Type to search extras</span>
            </div>

            <div className="space-y-3">
              {activeData.extras.map((extra, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-3 p-3 sm:p-0 bg-gray-50/50 sm:bg-transparent rounded-2xl border border-gray-100 sm:border-0"
                >
                  {/* Searchable Combobox for Extras */}
                  <SearchableCombobox
                    items={catalog.extras}
                    selectedId={extra.id}
                    onSelect={(id) => handleSelectExtra(i, id)}
                    disabled={loadingCatalog}
                    placeholder="Search extra (e.g. Boiled Egg, Milk)..."
                    formatLabel={(extraOption) => `${extraOption.name} (₹${extraOption.price})`}
                    borderColor="focus-within:border-purple-400"
                  />

                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1 sm:flex-none sm:w-32 bg-gray-100 rounded-xl px-4 py-3 text-gray-600 font-bold flex items-center gap-1 border border-transparent">
                      <span>₹</span>
                      <span>{extra.price ? extra.price : "--"}</span>
                    </div>

                    <button
                      onClick={() => removeExtra(i)}
                      aria-label="Remove item"
                      className="h-11 sm:h-auto w-12 sm:w-10 shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addExtraSlot}
                disabled={loadingCatalog}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> Add Extra Slot
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-6 py-4 border-t border-t-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-gray-400 font-medium text-center md:text-left">
            Items are mapped directly to master catalog records.
          </span>
          <button
            onClick={handleInitiateUpload}
            className="w-full md:w-auto px-10 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 hover:shadow-green-300 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Review & Save Menu <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}