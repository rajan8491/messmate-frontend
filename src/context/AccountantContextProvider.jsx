import AccountantContext from "./AccountantContext";
import { useState } from "react";

// Import real backend services
import {
  fetchTodayMenuAPI,
  fetchWeeklyMenuAPI,
  updateTodayMenuAPI,
  updateItemPriceAPI,
  uploadWeeklyMenuAPI,
  extractWeeklyMenuFromImageAPI,
  fetchOrGenerateReviewAnalysisAPI,
  fetchActiveCatalogAPI,
  fetchAccountantProfileAPI
} from '../services/backend/accountantServices';
import { getApiError } from "../utils/helpers";

const AccountantContextProvider = ({ children }) => {
  const [accountantProfile, setAccountantProfile] = useState(null); // Holds authenticated accountant metadata
  const [loadingProfile, setLoadingProfile] = useState(false); // Loading state for profile fetch

  const [todayMenu, setTodayMenu] = useState(null);
  const [fetchDate, setFetchDate] = useState(null);

  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [lastUpdatedOn, setLastUpdatedOn] = useState(null);

  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const [reviewAnalysis, setReviewAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // 2. Catalog state
  const [catalog, setCatalog] = useState({ diets: [], extras: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // -------- Fetch Accountant Metadata (if needed) --------
  const fetchAccountantProfile = async (forceRefresh = false) => {
    if(!forceRefresh && accountantProfile) {
      return accountantProfile;
    }
    setLoadingProfile(true);
    try {
      // Placeholder for actual API call to fetch accountant metadata
      const data = await fetchAccountantProfileAPI();
      setAccountantProfile(data);
      return data;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // -------- Fetch Master Catalog --------
  const fetchActiveCatalog = async (forceRefresh = false) => {
    // Return cached catalog if already fetched and not forced
    if (!forceRefresh && (catalog.diets.length > 0 || catalog.extras.length > 0)) {
      return catalog;
    }

    setLoadingCatalog(true);
    try {
      const data = await fetchActiveCatalogAPI();
      
      // Standardize shape to ensure diets and extras always default to arrays
      const formattedCatalog = {
        diets: data?.diets || [],
        extras: data?.extras || [],
      };

      setCatalog(formattedCatalog);
      return formattedCatalog;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // -------- 1. Fetch Today's Menu --------
  const fetchTodayMenu = async (forceRefresh = false) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (!forceRefresh && todayMenu && fetchDate === todayStr) return true;
    
    setLoadingToday(true);
    try {
      const res = await fetchTodayMenuAPI();

      let mouldedMenu;
      for (const meal of res.menu) {
        let mealType = meal.type.toLowerCase();
        mouldedMenu = {
          ...mouldedMenu,
          [mealType]: {
            time: {
              start: meal.start,
              end: meal.end
            },
            diet: meal.diet || [],
            extras: meal.extra || []
          }
        };
      }

      setTodayMenu(mouldedMenu);
      setFetchDate(todayStr);
      return true;
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoadingToday(false);
    }
  };

  // -------- 2. Fetch Weekly Menu --------
  const fetchWeeklyMenu = async (forceRefresh = false) => {
    if (!forceRefresh && weeklyMenu) {
      return true;
    }

    setLoadingWeekly(true);
    try {
      const res = await fetchWeeklyMenuAPI(); 
      let mouldedMenu = {};
      for(const dayMenu of res) {
        const day = dayMenu.weekDay.toLowerCase();
        mouldedMenu[day] = {};
        for(const meal of dayMenu.menu) {
          const mealType = meal.type.toLowerCase();
          mouldedMenu[day][mealType] = {
            time: {
              start: meal.start,
              end: meal.end
            },
            diet: meal.diet || [],
            extras: meal.extra || []
          };
        }
      }
  

      setWeeklyMenu(mouldedMenu);
      setLastUpdatedOn(Date.now());
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
         setWeeklyMenu(null);
         setLastUpdatedOn(null);
         return false;
      }
      throw getApiError(error);
    } finally {
      setLoadingWeekly(false);
    }
  };

  // -------- 3. Update Today's Menu --------
  const updateTodayMenu = async ({ date, meal, time, diet, extras }) => {
    try {
      // convert menu data into the backend expected format
      let updateMenuRequest = {
        weekDay: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
        menu: [
          {
            type: meal.toUpperCase(),
            start: time.start,
            end: time.end,
            diet: diet || [],
            extra: extras || []
          }
        ]
      }
      console.log("Update Menu Request:", updateMenuRequest); // Debugging line
      await updateTodayMenuAPI(updateMenuRequest);

      setTodayMenu(null);
      setFetchDate(null);
      fetchTodayMenu(true);
      return true;
    } catch (error) {
      throw getApiError(error);
    }
  };

  // --------- Update Price of Item -----------------
  const updateItemPrice = async ({ itemId, newPrice }) => {
    try {
      await updateItemPriceAPI({ itemId, newPrice });
      // Invalidate catalog so price updates reflect immediately in future views
      setCatalog({ diets: [], extras: [] });
      return true;
    } catch (error) {
      throw getApiError(error);
    }
  };

  // -------- 4. Extract Menu From Image (Gemini) --------
  const extractWeeklyMenuFromImage = async (image) => {
    if (!image) throw new Error("Image is required");

    try {
      const formData = new FormData();
      formData.append("image", image);
      
      const extractedMenu = await extractWeeklyMenuFromImageAPI(formData);
      return extractedMenu;
    } catch (error) {
      throw getApiError(error);
    } 
  };

  // -------- 5. Upload Weekly Menu --------
  const uploadWeeklyMenu = async (data) => {
    try {
      // first convert the menu data into the backend expected format
      const convertedData = Object.entries(data).map(([weekDay, meals]) => {
        return {
          weekDay: weekDay.toUpperCase(),
          menu: Object.entries(meals).map(([mealType, mealData]) => ({
            type: mealType.toUpperCase(),
            start: mealData.time.start,
            end: mealData.time.end,
            diet: mealData.diet || [],
            extra: mealData.extras || []
          })) 
        };
      });
      console.log("Converted Data for Upload:", convertedData); // Debugging line
      
      await uploadWeeklyMenuAPI(convertedData);

      setWeeklyMenu(null);
      setTodayMenu(null);
      setFetchDate(null);
      setLastUpdatedOn(new Date().toISOString());

      return true;
    } catch (error) {
      throw getApiError(error);
    }
  };

  // -------- 6. Analyse Reviews --------
  const fetchOrGenerateReviewAnalysis = async (forceFresh = false) => {
    setLoadingAnalysis(true);
    try {
      const res = await fetchOrGenerateReviewAnalysisAPI(forceFresh);
      
      if (res.hasData) {
        setReviewAnalysis(res.analysis);
        return { hasData: true, data: res.analysis };
      } else {
        setReviewAnalysis(null);
        return { hasData: false, message: res.message };
      }
    } catch (error) {
      throw getApiError(error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const value = {
    accountantProfile,
    loadingProfile,
    fetchAccountantProfile,

    todayMenu,
    weeklyMenu,
    lastUpdatedOn,
    
    fetchTodayMenu,
    fetchWeeklyMenu,

    loadingToday,
    loadingWeekly,

    updateTodayMenu,
    updateItemPrice,
    uploadWeeklyMenu,
    extractWeeklyMenuFromImage,

    reviewAnalysis,
    loadingAnalysis,
    fetchOrGenerateReviewAnalysis,

    // 3. Exposed catalog state and handlers
    catalog,
    loadingCatalog,
    fetchActiveCatalog
  };

  return (
    <AccountantContext.Provider value={value}>
      {children}
    </AccountantContext.Provider>
  );
};

export default AccountantContextProvider;