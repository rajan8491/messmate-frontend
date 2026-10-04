import { useContext, useState } from "react";
import StudentContext from "./StudentContext"; 
import AuthContext from "./AuthContext";

// Import backend services
import {
    fetchStudentProfileAPI,
    changeHostelAPI,
    fetchTodayMenuAPI,
    fetchMenuByDayAPI,
    fetchExtrasByDateAPI,
    addExtraPurchaseAPI,
    fetchAnalyseExtraAPI,
    addRatingAPI
} from '../services/backend/studentServices';
import { getApiError } from "../utils/helpers";
import { newIdempotencyKey } from "../utils/helpers";

const StudentContextProvider = ({ children }) => {
    const [studentProfile, setStudentProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // cache states
    const [todayMenu, setTodayMenu] = useState(null);
    const [fetchDate, setFetchDate] = useState(null);
    const [loadingToday, setLoadingToday] = useState(false);
    const [weeklyMenu, setWeeklyMenu] = useState({});
    const [loadingWeekly, setLoadingWeekly] = useState(false);

    // menu display state
    const [menu, setMenu] = useState(null);
    
    //cache
    const [extrasByDateCache, setExtrasByDateCache] = useState({});
    const [analyseExtraDataCache, setAnalyseExtraDataCache] = useState({});

    //actual extra and analysis data
    const [extras,setExtras] = useState([]);
    const [analyseExtraData,setAnalyseExtraData] = useState([]);
    const [loadingExtras, setLoadingExtras] = useState(false);
    const [loadingAnalyseExtra, setLoadingAnalyseExtra] = useState(false);

    const { setUser } = useContext(AuthContext);

    const fetchStudentProfile = async () => {
        setLoadingProfile(true);
        try {
            const data = await fetchStudentProfileAPI();
            setStudentProfile(data);
            return data;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoadingProfile(false);
        }
    }

    // --- 1. CHANGE HOSTEL ---
    const changeHostel = async (newHostelId) => {
        const idempotencyKey = newIdempotencyKey();
        try {
            const data = await changeHostelAPI(newHostelId, idempotencyKey);

            // Update local user state with the data returned from backend
            setUser((prev) => ({
                ...prev,
                hostelId: data.hostelId,
                hostelName: data.hostelName,
            }));

            setMenu(null);
            setTodayMenu(null);
            setWeeklyMenu({});
            setExtrasByDateCache({});
            setExtras([]);

            return true;
        } catch (error) {
            throw getApiError(error);
        }
    };

    // --- 2. FETCH MENU BY DAY ---
    const fetchMenuByDay = async (day, forceRefresh = false) => {
        if (!forceRefresh && weeklyMenu[day]) {
            setMenu(weeklyMenu[day]);
            return true;
        }
        
        setLoadingWeekly(true);
        try {
            const res = await fetchMenuByDayAPI(day);
            // mould the response to match the expected structure if needed
            let menuData;
            for(const meal of res.menu) {
                const mealType = meal.type.toLowerCase();
                if(!menuData) menuData = {};
                menuData[mealType] = {
                    time: {
                        start: meal.start,
                        end: meal.end
                    },
                    diet: meal.diet || [],
                    extras: meal.extra || []
                };
            }
            setWeeklyMenu((prev) => ({ ...prev, [day]: menuData }));
            setMenu(menuData);
            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoadingWeekly(false);
        }
    };

    // --- 3. FETCH TODAY MENU ---
    const fetchTodayMenu = async (forceRefresh = false) => {
        const todayStr = new Date().toISOString().split('T')[0];
            
        if (!forceRefresh && todayMenu && fetchDate === todayStr) {
            if(fetchDate === todayStr) {
                setMenu(todayMenu);
                return true;
            }
        }
        
        setLoadingToday(true);
        try {
            const res = await fetchTodayMenuAPI();
            let todayMenuData;
            for(const meal of res.menu) {
                const mealType = meal.type.toLowerCase();
                if(!todayMenuData) todayMenuData = {};
                todayMenuData[mealType] = {
                    time: {
                        start: meal.start,
                        end: meal.end
                    },
                    diet: meal.diet || [],
                    extras: meal.extra || []
                };
            }
    
            setTodayMenu(todayMenuData);
            setMenu(todayMenuData);
            setFetchDate(todayStr);
            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoadingToday(false);
        }
    };

    // --- 4. FETCH EXTRAS BY DATE & MEAL ---
    const fetchExtrasByDate = async ({ date, meal }, forceRefresh = false) => {
        const cacheKey = `${date}_${meal}`;
        
        if (!forceRefresh && extrasByDateCache[cacheKey]) {
            setExtras(extrasByDateCache[cacheKey]);
            return;
        }

        setLoadingExtras(true);
        try {
            if (!date || !meal) throw new Error("Date and meal are required");

            const res = await fetchExtrasByDateAPI(date, meal);

            setExtrasByDateCache((prev) => ({
                ...prev,
                [cacheKey]: res
            }));
            setExtras(res);

            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoadingExtras(false);
        }
    };

    // --- 5. ADD EXTRA PURCHASE ---
    const addExtraPurchase = async ({ date, meal, items }) => {
        const idempotencyKey = newIdempotencyKey();
        try {
            await addExtraPurchaseAPI({ date, meal, items}, idempotencyKey);

            setAnalyseExtraDataCache({});
            setAnalyseExtraData([]);
            return true;
        } catch (error) {
            throw getApiError(error);
        }
    };

    // --- 6. FETCH ANALYSE EXTRA DATA ---
    const fetchAnalyseExtra = async ({ rangeType, from, to, groupBy }, forceRefresh = false) => {
        const cacheKey = `${rangeType}_${from || ""}_${to || ""}_${groupBy || ""}`;
        
        if (!forceRefresh && analyseExtraDataCache[cacheKey]) {
            setAnalyseExtraData(analyseExtraDataCache[cacheKey]);
            return;
        }

        setLoadingAnalyseExtra(true);
        try {
            if (!rangeType) throw new Error("Range type is required");

            // Pass groupBy to the API
            const res = await fetchAnalyseExtraAPI(from, to, groupBy);

            setAnalyseExtraDataCache((prev) => ({
                ...prev,
                [cacheKey]: res
            }));
            setAnalyseExtraData(res);

            return true;
        } catch (error) {
            throw getApiError(error);
        } finally {
            setLoadingAnalyseExtra(false);
        }
    };

    // --- 7. ADD RATING ---
    // (should we add hostelId in data also? so that data not update in wrong hostel)
    const addRating = async ({ itemId, itemType, meal, rating, tags, suggestion }) => {
        const idempotencyKey = newIdempotencyKey();
        try {
            const addRatingData = {
                itemId,
                itemType: itemType.toUpperCase(), // Ensure itemType is in uppercase
                meal: meal.toUpperCase(), // Ensure meal is in uppercase
                rating,
                tags,
                suggestion,
            };
            await addRatingAPI(addRatingData, idempotencyKey);
            return true;
        } catch (error) {
            throw getApiError(error);
        }
    };

    const value = {
        studentProfile, loadingProfile, fetchStudentProfile,
        loadingToday, loadingWeekly,loadingExtras, loadingAnalyseExtra,
        changeHostel,
        fetchMenuByDay,
        fetchTodayMenu,
        menu,
        fetchExtrasByDate,
        addExtraPurchase,
        fetchAnalyseExtra,
        extras,
        analyseExtraData,setAnalyseExtraData,
        addRating
    };

    return (
        <StudentContext.Provider value={value}>
            {children}
        </StudentContext.Provider>
    );
};

export default StudentContextProvider;