'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Carousel, Modal, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantStatuses, fetchItemStatuses, selectAllStatuses } from 'lib/features/restaurantSlice';

import './restorentList.css';
import { restList } from './restorentDtata';
import { Data } from '../data/page';
import RestorentDisplay from './restorentDisplay';
import { useRouter } from "next/navigation";
import { isPointInPolygon, getDistance } from "geolib";
import { getExactDistance } from '../actions/delivery';
import Loading from "../loading/page";
import { showToast } from '../../toaster/page';
import CategoryButtons from '../mainRestorentList/CategoryButtons';

// Kurnool polygon boundary
const kurnoolPolygon = [
    { latitude: 15.845928, longitude: 78.012744 },
    { latitude: 15.846311, longitude: 78.019729 },
    { latitude: 15.839716, longitude: 78.027036 },
    { latitude: 15.846872, longitude: 78.031149 },
    { latitude: 15.84623, longitude: 78.034459 },
    { latitude: 15.838115, longitude: 78.049654 },
    { latitude: 15.82565, longitude: 78.056682 },
    { latitude: 15.818905, longitude: 78.060495 },
    { latitude: 15.815102, longitude: 78.065114 },
    { latitude: 15.801613, longitude: 78.072318 },
    { latitude: 15.798335, longitude: 78.078557 },
    { latitude: 15.79411, longitude: 78.078435 },
    { latitude: 15.786917, longitude: 78.078888 },
    { latitude: 15.776939, longitude: 78.073002 },
    { latitude: 15.772624, longitude: 78.057852 },
    { latitude: 15.768974, longitude: 78.054399 },
    { latitude: 15.765935, longitude: 78.049634 },
    { latitude: 15.77651, longitude: 78.02883 },
    { latitude: 15.813778, longitude: 77.996924 },
    { latitude: 15.847026, longitude: 78.005964 }
];

let isAppInitialized = false;

export default function RestorentList({ externalSearch, onSearchChange }) {
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [filtersRestored, setFiltersRestored] = useState(false);

    // Synchronize external search from category buttons
    useEffect(() => {
        if (externalSearch !== undefined && externalSearch !== categoryFilter) {
            setCategoryFilter(externalSearch);
        }
    }, [externalSearch]);

    const handleSearchChange = (value) => {
        setSearch(value);
    };

    const handleCategorySelect = (value) => {
        setCategoryFilter(value);
        if (onSearchChange) {
            onSearchChange(value);
        }
    };
    const [isListening, setIsListening] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState(null);
    const [isRouting, setIsRouting] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // Restore search, category, type filters from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSearch = sessionStorage.getItem("restaurantListSearch") || '';
            const savedCategory = sessionStorage.getItem("restaurantListCategory") || '';
            const savedType = sessionStorage.getItem("restaurantListType") || '';

            if (savedSearch) setSearch(savedSearch);
            if (savedCategory) setCategoryFilter(savedCategory);
            if (savedType) setTypeFilter(savedType);
        }
        setFiltersRestored(true);
    }, []);

    // Save search filter to sessionStorage when it changes
    useEffect(() => {
        if (filtersRestored) {
            sessionStorage.setItem("restaurantListSearch", search);
        }
    }, [search, filtersRestored]);

    // Save category filter to sessionStorage when it changes
    useEffect(() => {
        if (filtersRestored) {
            sessionStorage.setItem("restaurantListCategory", categoryFilter);
        }
    }, [categoryFilter, filtersRestored]);

    // Save type filter to sessionStorage when it changes
    useEffect(() => {
        if (filtersRestored) {
            sessionStorage.setItem("restaurantListType", typeFilter);
        }
    }, [typeFilter, filtersRestored]);



    // Restore scroll position once rendering is complete
    useEffect(() => {
        if (mounted && !loading && filtersRestored) {
            const savedScrollY = sessionStorage.getItem("restaurantListScrollY");
            if (savedScrollY) {
                const targetScrollY = parseInt(savedScrollY, 10);
                if (targetScrollY > 0) {
                    console.log("📜 Restoring scroll position to:", targetScrollY);

                    // Attempt scrolling multiple times to handle dynamic layout and images loading
                    window.scrollTo(0, targetScrollY);

                    const timer1 = setTimeout(() => {
                        window.scrollTo(0, targetScrollY);
                    }, 50);

                    const timer2 = setTimeout(() => {
                        window.scrollTo(0, targetScrollY);
                    }, 150);

                    const timer3 = setTimeout(() => {
                        window.scrollTo(0, targetScrollY);
                    }, 300);

                    return () => {
                        clearTimeout(timer1);
                        clearTimeout(timer2);
                        clearTimeout(timer3);
                    };
                }
            }
        }
    }, [mounted, loading, filtersRestored]);

    // Location modal states
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showFetchingModal, setShowFetchingModal] = useState(false);
    const [outOfZone, setOutOfZone] = useState(false);
    const [showSettingsButton, setShowSettingsButton] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState([]);

    const handleSelectSavedAddress = async (addr) => {
        if (addr && addr.lat && addr.lng) {
            localStorage.setItem("customerLat", addr.lat);
            localStorage.setItem("customerLng", addr.lng);
            sessionStorage.removeItem("locationSkipped"); // Clear skipped flag

            const isInside = isPointInPolygon({ latitude: addr.lat, longitude: addr.lng }, kurnoolPolygon);
            if (isInside) {
                localStorage.setItem("isServiceAvailable", "true");
                setShowFetchingModal(true);
                await fetchAllDistances(addr.lat, addr.lng);
                setShowLocationModal(false);
                setShowFetchingModal(false);
            } else {
                localStorage.setItem("isServiceAvailable", "false");
                setOutOfZone(true);
                setError("❌ Outside Service Area");
            }
        }
    };

    const handleSkipLocation = () => {
        sessionStorage.setItem("locationSkipped", "true");
        sessionStorage.setItem("isAppLoaded", "true");
        setShowLocationModal(false);
    };

    // Location distance states
    const [roadDistances, setRoadDistances] = useState({});
    const distRef = useRef({});

    const router = useRouter();

    // IMMEDIATE: Load cached distances on mount only if already loaded in this session
    useEffect(() => {
        const isAppLoaded = sessionStorage.getItem("isAppLoaded");
        if (isAppLoaded) {
            const saved = localStorage.getItem("allRestaurantDistances");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setRoadDistances(parsed);
                    distRef.current = parsed;
                } catch (e) {
                    console.error("Failed to load initial cache", e);
                }
            }
        }
    }, []);

    // Location request tracking
    const hasRequestedThisMount = useRef(false);

    // Fetch distances function
    const fetchAllDistances = useCallback(async (uLat, uLng) => {
        console.log("🌐 Background: Fetching exact road distances...");
        const results = {};
        await Promise.all(restList.map(async (item) => {
            try {
                const data = await getExactDistance(
                    { lat: parseFloat(uLat), lng: parseFloat(uLng) },
                    { lat: item.lat, lng: item.lng }
                );
                if (data && data.km) {
                    results[item.name] = data.km;
                } else {
                    // Fallback to air distance if API fails
                    const distMeters = getDistance(
                        { latitude: parseFloat(uLat), longitude: parseFloat(uLng) },
                        { latitude: item.lat, longitude: item.lng }
                    );
                    results[item.name] = (distMeters / 1000).toFixed(1);
                }
            } catch (err) {
                console.error(`Error calculating distance for ${item.name}:`, err);
                const distMeters = getDistance(
                    { latitude: parseFloat(uLat), longitude: parseFloat(uLng) },
                    { latitude: item.lat, longitude: item.lng }
                );
                results[item.name] = (distMeters / 1000).toFixed(1);
            }
        }));

        setRoadDistances(results);
        distRef.current = results;
        localStorage.setItem("allRestaurantDistances", JSON.stringify(results));
        sessionStorage.setItem("isAppLoaded", "true");
    }, []);

    // Request location function
    const requestLocation = useCallback(async (force = false) => {
        // Cache check removed to allow re-verification of location on startup
        // This ensures the browser permission prompt handles the allow/block logic

        if (!force && hasRequestedThisMount.current) return;
        hasRequestedThisMount.current = true;

        // Determine if we are running under Capacitor
        let isNative = false;
        try {
            const { Capacitor } = await import('@capacitor/core');
            isNative = Capacitor.isNativePlatform();
        } catch (e) {
            console.log("Capacitor core not loaded:", e);
        }

        const handleSuccess = async (pos) => {
            const { latitude, longitude } = pos.coords;
            console.log("✅ Location obtained:", { latitude, longitude });

            const prevLat = localStorage.getItem("customerLat");
            const prevLng = localStorage.getItem("customerLng");
            const savedDistances = localStorage.getItem("allRestaurantDistances");

            localStorage.setItem("customerLat", latitude);
            localStorage.setItem("customerLng", longitude);
            sessionStorage.removeItem("locationSkipped"); // Clear skipped flag on success

            // Check if user is inside the polygon
            const isInside = isPointInPolygon({ latitude, longitude }, kurnoolPolygon);

            if (isInside) {
                localStorage.setItem("isServiceAvailable", "true");

                let mustRecalculate = true;
                if (prevLat && prevLng && savedDistances) {
                    try {
                        const distanceMoved = getDistance(
                            { latitude, longitude },
                            { latitude: parseFloat(prevLat), longitude: parseFloat(prevLng) }
                        );
                        // If user has moved less than 100 meters, bypass the Directions API calling to make loading instant
                        if (distanceMoved < 100) {
                            mustRecalculate = false;
                            console.log(`📍 Location moved by only ${distanceMoved}m (under 100m). Using cached distances for instant startup.`);
                            const parsed = JSON.parse(savedDistances);
                            setRoadDistances(parsed);
                            distRef.current = parsed;
                            sessionStorage.setItem("isAppLoaded", "true");
                        }
                    } catch (e) {
                        console.error("Cache parsing error:", e);
                    }
                }

                if (mustRecalculate) {
                    setShowLocationModal(true);
                    setShowFetchingModal(true);
                    // Fetch distances and wait for completion
                    await fetchAllDistances(latitude, longitude);
                    setShowLocationModal(false);
                    setShowFetchingModal(false);
                } else {
                    // Close the modals immediately if we are using cached distances
                    setShowLocationModal(false);
                    setShowFetchingModal(false);
                }
            } else {
                console.warn("🚫 User is outside the service area.");
                localStorage.setItem("isServiceAvailable", "false");
                setOutOfZone(true);
                setError("❌ Outside Service Area");
                setShowLocationModal(false);
                setShowFetchingModal(false);
            }
        };

        const handleError = (err) => {
            let errorMsg = "⚠️ GPS access required.";
            const code = err.code !== undefined ? err.code : (err.message && err.message.includes("denied") ? 1 : 2);

            console.error("❌ Location Error Details:", {
                code,
                message: err.message,
                isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
                geolocationAvailable: typeof navigator !== 'undefined' && !!navigator.geolocation,
                isNative
            });

            switch (code) {
                case 1: // PERMISSION_DENIED
                    errorMsg = "❌ Location permission denied. Please allow site access in browser settings.";
                    break;
                case 2: // POSITION_UNAVAILABLE
                    errorMsg = "⚠️ Location unavailable. Please turn on your Device Location/GPS.";
                    if (isNative) {
                        setShowSettingsButton(true);
                    }
                    break;
                case 3: // TIMEOUT
                    errorMsg = "⚠️ Location request timed out. Please retry.";
                    if (isNative) {
                        setShowSettingsButton(true);
                    }
                    break;
                default:
                    errorMsg = "⚠️ GPS access failed: " + (err.message || "Unknown error");
            }

            const clearOldLocation = () => {
                localStorage.removeItem("allRestaurantDistances");
                localStorage.removeItem("customerLat");
                localStorage.removeItem("customerLng");
                localStorage.removeItem("currentRestaurantDistance");
                localStorage.removeItem("currentRestaurantName");
                setRoadDistances({});
                distRef.current = {};
            };

            const triggerErrorState = () => {
                setError(errorMsg);
                setShowLocationModal(true);
                setShowFetchingModal(false);
                clearOldLocation();
            };

            const userId = localStorage.getItem("userId");
            if (userId) {
                // Check if user has active orders before forcing location
                fetch(`/api/check-user-active-order?userId=${userId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.hasActiveOrder) {
                            console.log("📦 Active Order Found: Skipping location requirement.");
                            setShowFetchingModal(false);
                            setShowLocationModal(false);
                            setError(null);
                        } else {
                            triggerErrorState();
                        }
                    })
                    .catch(() => {
                        triggerErrorState();
                    });
            } else {
                triggerErrorState();
            }
        };

        if (isNative) {
            try {
                console.log("📱 Native Capacitor Platform. Requesting Geolocation via plugin.");
                const { Geolocation } = await import('@capacitor/geolocation');

                // Request permissions first
                let permissions = await Geolocation.checkPermissions();
                if (permissions.location !== 'granted') {
                    permissions = await Geolocation.requestPermissions();
                }

                if (permissions.location === 'granted') {
                    // Try to get high-accuracy location first with quick timeout and cached location support
                    try {
                        const pos = await Geolocation.getCurrentPosition({
                            enableHighAccuracy: true,
                            timeout: 2500,
                            maximumAge: 300000
                        });
                        await handleSuccess(pos);
                    } catch (gpsErr) {
                        console.warn("🚫 High accuracy GPS failed, checking reason:", gpsErr);

                        const isTimeout = gpsErr.code === 3 ||
                            (gpsErr.message && gpsErr.message.toLowerCase().includes("timeout"));

                        // If not a timeout, location is disabled or permission denied -> handle/resolve immediately!
                        if (!isTimeout) {
                            if (gpsErr.code === 1) {
                                handleError(gpsErr);
                                return;
                            }
                            // Attempt to request GPS natively right away to make it fast
                            try {
                                console.log("Directly attempting native GPS activation...");
                                const { registerPlugin } = await import('@capacitor/core');
                                const NativeSettings = registerPlugin('NativeSettings');
                                await NativeSettings.requestGpsEnable();
                                // Retry one last time
                                const retryPos = await Geolocation.getCurrentPosition({
                                    enableHighAccuracy: false,
                                    timeout: 4000,
                                    maximumAge: 0
                                });
                                await handleSuccess(retryPos);
                            } catch (retryErr) {
                                console.warn("🚫 Native GPS activation failed, trying cached position fallback...");
                                try {
                                    const lastPos = await Geolocation.getLastKnownPosition();
                                    if (lastPos) {
                                        await handleSuccess(lastPos);
                                        return;
                                    }
                                } catch (cachedErr) {
                                    console.error("🚫 Cached fallback failed:", cachedErr);
                                }
                                handleError({ code: 2, message: "⚠️ Device Location is OFF or unavailable. Please enable GPS in Settings and retry." });
                            }
                            return;
                        }

                        // If it timed out, try low accuracy fallback
                        try {
                            // Fallback to low-accuracy (faster, network positioning)
                            const pos = await Geolocation.getCurrentPosition({
                                enableHighAccuracy: false,
                                timeout: 6000,
                                maximumAge: 300000
                            });
                            await handleSuccess(pos);
                        } catch (fallbackErr) {
                            console.warn("🚫 Low accuracy fallback failed. Checking last known cached position...");
                            try {
                                const lastPos = await Geolocation.getLastKnownPosition();
                                if (lastPos) {
                                    console.log("📍 Using last known location fallback:", lastPos);
                                    await handleSuccess(lastPos);
                                    return;
                                }
                            } catch (lastPosErr) {
                                console.warn("🚫 Last known location unavailable:", lastPosErr);
                            }

                            console.warn("🚫 Low accuracy and cached position failed. Attempting GPS activation...");
                            // Try to enable GPS natively since both failed (meaning Location is likely OFF)
                            try {
                                const { registerPlugin } = await import('@capacitor/core');
                                const NativeSettings = registerPlugin('NativeSettings');
                                await NativeSettings.requestGpsEnable();
                                // Retry one last time after activation request
                                const retryPos = await Geolocation.getCurrentPosition({
                                    enableHighAccuracy: false,
                                    timeout: 4000,
                                    maximumAge: 0
                                });
                                await handleSuccess(retryPos);
                            } catch (retryErr) {
                                console.warn("🚫 GPS activation or retry failed, checking final cached fallback...");
                                try {
                                    const lastPos = await Geolocation.getLastKnownPosition();
                                    if (lastPos) {
                                        await handleSuccess(lastPos);
                                        return;
                                    }
                                } catch (e) { }
                                console.error("🚫 GPS activation failed completely:", retryErr);
                                setShowSettingsButton(true);
                                handleError({ code: 2, message: "⚠️ Device Location is OFF or unavailable. Please enable GPS in Settings and retry." });
                            }
                        }
                    }
                } else {
                    handleError({ code: 1, message: "Location permission denied." });
                }
            } catch (err) {
                console.error("📱 Capacitor Geolocation failed, using browser fallback:", err);
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        (fallbackErr) => {
                            console.warn("⚠️ Capacitor browser fallback high accuracy failed, checking reason...");
                            const isWebTimeout = fallbackErr.code === 3 ||
                                (fallbackErr.message && fallbackErr.message.toLowerCase().includes("timeout"));

                            if (!isWebTimeout) {
                                handleError(fallbackErr);
                                return;
                            }

                            navigator.geolocation.getCurrentPosition(
                                handleSuccess,
                                (webFallbackErr) => {
                                    console.warn("⚠️ Network location failed, trying cached web fallback...");
                                    navigator.geolocation.getCurrentPosition(
                                        handleSuccess,
                                        handleError,
                                        { enableHighAccuracy: false, timeout: 2000, maximumAge: Infinity }
                                    );
                                },
                                {
                                    enableHighAccuracy: false,
                                    timeout: 6000,
                                    maximumAge: 300000
                                }
                            );
                        },
                        { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
                    );
                } else {
                    handleError({ code: 2, message: "Geolocation not supported" });
                }
            }
        } else {
            console.log("🌐 Web Platform. Using navigator.geolocation.");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (webErr) => {
                        console.warn("⚠️ Web high accuracy failed, checking reason...");
                        const isWebTimeout = webErr.code === 3 ||
                            (webErr.message && webErr.message.toLowerCase().includes("timeout"));

                        if (!isWebTimeout) {
                            handleError(webErr);
                            return;
                        }

                        navigator.geolocation.getCurrentPosition(
                            handleSuccess,
                            (webFallbackErr) => {
                                console.warn("⚠️ Web platform fallback failed, trying cached web fallback...");
                                navigator.geolocation.getCurrentPosition(
                                    handleSuccess,
                                    handleError,
                                    { enableHighAccuracy: false, timeout: 2000, maximumAge: Infinity }
                                );
                            },
                            {
                                enableHighAccuracy: false,
                                timeout: 6000,
                                maximumAge: 300000
                            }
                        );
                    },
                    { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
                );
            } else {
                handleError({ code: 2, message: "Geolocation not supported" });
            }
        }
    }, [fetchAllDistances]);

    // Open native Android location settings
    const handleOpenSettings = async () => {
        // Set UI to fetching state immediately so spinner is visible when returning
        setShowSettingsButton(false);
        setOutOfZone(false);
        setError(null);
        setShowLocationModal(true);
        setShowFetchingModal(true);

        try {
            // Try the custom native plugin first
            const { registerPlugin } = await import('@capacitor/core');
            const NativeSettings = registerPlugin('NativeSettings');
            console.log("Calling NativeSettings.openLocationSettings()...");
            await NativeSettings.openLocationSettings();
        } catch (e) {
            console.warn("Native settings plugin failed: " + e.message + "\nTrying fallback...");
            // Fallback: open Android location settings via deep link
            try {
                window.open('app-settings:', '_system');
            } catch (e2) {
                console.error("Fallback settings failed: " + e2.message);
            }
        }
    };

    // Enable location handler - DIRECT CALL to bypass any state/ref logic
    const handleEnableLocation = () => {
        // Reset all error states so we can try again cleanly
        setShowSettingsButton(false);
        setOutOfZone(false);
        setError(null);
        setShowLocationModal(true);
        setShowFetchingModal(true);

        // Directly call requestLocation with force=true
        requestLocation(true);
    };

    const dispatch = useDispatch();
    // Get statuses from Redux store
    const restaurantStatuses = useSelector(selectAllStatuses);

    useEffect(() => {
        if (!isAppInitialized) {
            console.log("🆕 Cold start detected. Resetting session loader.");
            sessionStorage.removeItem("isAppLoaded");
            isAppInitialized = true;
        }

        setMounted(true);

        // Redux Auth Check
        const userId = localStorage.getItem("userId");
        const loginTime = localStorage.getItem("loginTimestamp");
        const currentTime = new Date().getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (!userId || !loginTime || (currentTime - Number(loginTime) > thirtyDaysInMs)) {
            localStorage.clear(); // Clear session data if expired or missing
            sessionStorage.removeItem("restaurantListSearch");
            sessionStorage.removeItem("restaurantListCategory");
            sessionStorage.removeItem("restaurantListType");
            sessionStorage.removeItem("restaurantListScrollY");
            router.replace("/login");
            return;
        }

        // Fetch restaurant statuses via Redux
        dispatch(fetchRestaurantStatuses());
        dispatch(fetchItemStatuses());

        // Fetch saved addresses from API on mount
        const fetchSavedAddresses = async () => {
            if (!userId) return;
            try {
                const res = await fetch(`/api/users/address?userId=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.addresses) {
                        setSavedAddresses(data.addresses);
                    }
                }
            } catch (error) {
                console.error("Error fetching saved addresses on startup:", error);
            }
        };
        fetchSavedAddresses();

        // Auto-refresh status
        const intervalId = setInterval(() => {
            console.log("🔄 Auto-refreshing restaurant data...");
            dispatch(fetchRestaurantStatuses());
            dispatch(fetchItemStatuses());
        }, 20000);

        const checkActiveAndProceed = async () => {
            const cachedActiveOrder = localStorage.getItem("hasActiveOrder") === "true";

            // If cached as active, optimistically skip location prompts immediately
            if (cachedActiveOrder) {
                console.log("📦 Optimistically skipping location check based on cached active order.");
                setShowLocationModal(false);
                setShowFetchingModal(false);
                setError(null);

                const savedDistances = localStorage.getItem("allRestaurantDistances");
                if (savedDistances) {
                    try {
                        const parsed = JSON.parse(savedDistances);
                        setRoadDistances(parsed);
                        distRef.current = parsed;
                    } catch (e) {
                        console.error("Cache parse error", e);
                    }
                }
            } else {
                // If not cached as active, check session cache
                const isAppLoaded = sessionStorage.getItem("isAppLoaded");
                if (isAppLoaded) {
                    console.log("⚡ App cached in session: Skipping location request.");
                    const savedDistances = localStorage.getItem("allRestaurantDistances");
                    if (savedDistances) {
                        try {
                            const parsed = JSON.parse(savedDistances);
                            setRoadDistances(parsed);
                            distRef.current = parsed;
                        } catch (e) {
                            console.error("Cache parse error", e);
                        }
                    }
                } else {
                    // Cold start and no cached active order: trigger location fetch immediately!
                    console.log("🧹 Cold start / fresh session & no cached active order. Triggering location fetch immediately.");
                    localStorage.removeItem("allRestaurantDistances");
                    localStorage.removeItem("customerLat");
                    localStorage.removeItem("customerLng");
                    localStorage.removeItem("currentRestaurantDistance");
                    localStorage.removeItem("currentRestaurantName");
                    localStorage.removeItem("isServiceAvailable");
                    setRoadDistances({});
                    distRef.current = {};

                    setShowLocationModal(true);
                }
            }

            // In parallel, check the server for latest active order status
            if (userId) {
                try {
                    const res = await fetch(`/api/check-user-active-order?userId=${userId}`);
                    const data = await res.json();
                    const serverActiveOrder = !!(data && data.hasActiveOrder);

                    const oldCached = localStorage.getItem("hasActiveOrder") === "true";
                    localStorage.setItem("hasActiveOrder", serverActiveOrder ? "true" : "false");

                    if (serverActiveOrder !== oldCached) {
                        console.log("🔄 Active order status changed on server:", serverActiveOrder);
                        if (serverActiveOrder) {
                            // If they have an active order now, dismiss any location modals
                            sessionStorage.setItem("isAppLoaded", "true");
                            setShowLocationModal(false);
                            setShowFetchingModal(false);
                            setError(null);

                            // Restore distances if any
                            const savedDistances = localStorage.getItem("allRestaurantDistances");
                            if (savedDistances) {
                                try {
                                    const parsed = JSON.parse(savedDistances);
                                    setRoadDistances(parsed);
                                    distRef.current = parsed;
                                } catch (e) { }
                            }
                        } else {
                            // If they no longer have an active order, request location if not loaded
                            const isAppLoaded = sessionStorage.getItem("isAppLoaded");
                            if (!isAppLoaded) {
                                setShowLocationModal(true);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to check active order:", err);
                }
            }
        };

        checkActiveAndProceed();
        setLoading(false);

        return () => clearInterval(intervalId);
    }, [dispatch, router, requestLocation]);

    // Auto-retry location check when window/app gains focus (e.g. returning from Settings)
    useEffect(() => {
        const handleFocus = () => {
            const isAppLoaded = sessionStorage.getItem("isAppLoaded");
            const locationSkipped = sessionStorage.getItem("locationSkipped");
            if (!isAppLoaded && !locationSkipped) {
                console.log("🔄 App refocused/visible: Retrying location request.");
                requestLocation(true); // Force location check on focus gain
            }
        };

        window.addEventListener("focus", handleFocus);
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                handleFocus();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [requestLocation]);


    const proceedToRoute = (name, distance) => {
        setIsRouting(true);
        setTimeout(() => setIsRouting(false), 2000);
    };
    const handleClicke = (name) => {
        setIsRouting(true);
        // Save scroll position immediately before navigating away
        if (typeof window !== 'undefined') {
            sessionStorage.setItem("restaurantListScrollY", window.scrollY);
        }

        // Find the restaurant to get its ID
        const restaurant = restList.find(r => r.name === name);
        if (restaurant && restaurant.id) {
            const isActive = restaurantStatuses[restaurant.id];
            if (isActive !== undefined) {
                localStorage.setItem("currentRestaurantStatus", isActive);
            }
        }

        let dist = roadDistances[name];

        // If distance is not ready yet because it is still fetching in background, compute air distance instantly
        if (!dist || dist === "0" || dist === "0.0") {
            if (restaurant) {
                const lat = localStorage.getItem("customerLat");
                const lng = localStorage.getItem("customerLng");
                if (lat && lng) {
                    try {
                        const distMeters = getDistance(
                            { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                            { latitude: restaurant.lat, longitude: restaurant.lng }
                        );
                        dist = (distMeters / 1000).toFixed(1);
                    } catch (err) {
                        console.error("Geodesic fallback error:", err);
                    }
                }
            }
        }

        dist = dist || "0";
        localStorage.setItem("currentRestaurantDistance", dist);
        localStorage.setItem("currentRestaurantName", name);

        if (name === "Viva Finedine") {
            router.push('/vivafinedine');

        } else if (name === "Amigoo Noshery") {
            router.push('/AmigoNoshery');
        } else if (name === "Mr.Hangout Café") {
            router.push('/mrhangout');
        } else if (name === "Reddy Family Restuarent") {
            router.push('/reddyfamilyrest');
        }
        else if (name === "Aaha Kitchens") {
            router.push('/ahakitchens');
        }
        else if (name === "The Bro Story") {
            router.push('/brostory');
        }
        else if (name === "Fun and Food") {
            router.push('/funandfood');
        }
        else if (name === "PR Grand") {
            router.push('/prgrand');
        }
        else if (name === "Food Land") {
            router.push('/foodland');
        }
        else if (name === "Talimpu Family Restaurant") {
            router.push('/talimpu');
        }
        else if (name === "Hotel Taj Darbar") {
            router.push('/tajdarbar');
        }
        else if (name === "Ruchivedhika") {
            router.push('/ruchivedhika');
        }
        else if (name === "Hindustan Hotel") {
            router.push('/hindustan');
        }
        else if (name === "LASSI CORNER") {
            router.push('/lassycorner');
        }
        else if (name === "Mandi@9R") {
            router.push('/mandi9r');
        }

    };

    if ((loading && !mounted) || isRouting) return <Loading />;

    return (
        <div className="restaurant-list-page" style={{ paddingBottom: '100px' }}>

            {/* Unified Location Modal */}
            <Modal show={showLocationModal || showFetchingModal || error || outOfZone} centered backdrop="static" keyboard={false} size="sm" contentClassName="location-modal-content">
                <Modal.Body className="text-center py-4">
                    {showFetchingModal ? (
                        <>
                            <div className="location-loader">
                                <Spinner animation="border" />
                            </div>
                            <h5 className="location-modal-title mt-3">Fetching Location</h5>
                            <p className="location-modal-text" style={{ fontSize: '0.85rem', margin: '15px 0' }}>
                                Fetching location and calculating distances to restaurants...
                            </p>
                        </>
                    ) : outOfZone ? (
                        <>
                            <div className="location-modal-icon-container danger">
                                <i className="fas fa-map-marked-alt location-modal-icon"></i>
                            </div>
                            <h5 className="location-modal-title">Service Unavailable</h5>
                            <p className="location-modal-text">
                                Sorry, we are currently only operational in <b>Kurnool</b>.<br />
                                You are outside our service area.
                            </p>
                            <button
                                className="location-modal-btn danger-btn"
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                🔄 Check Location Again
                            </button>
                        </>
                    ) : error ? (
                        <>
                            <div className="location-modal-icon-container warning">
                                <i className="fas fa-exclamation-triangle location-modal-icon"></i>
                            </div>
                            <h6 className="location-modal-title">Location Access Required</h6>
                            <p className="location-modal-text">{error || "You must enable location and be in Kurnool to use this app."}</p>

                            <div className="d-flex flex-column gap-2 w-100 px-3">
                                <button className="location-modal-btn primary-btn" onClick={handleOpenSettings}>
                                    ⚙️ Open Location Settings
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="location-modal-icon-container" style={{ margin: '0 auto 15px auto', width: '50px', height: '50px', background: '#f5cb5c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-map-marker-alt location-modal-icon" style={{ color: '#1a1a1a', fontSize: '1.5rem' }}></i>
                            </div>
                            <h5 className="location-modal-title" style={{ fontWeight: 'bold', color: '#1a1a1a', marginBottom: '15px' }}>Where to parcel?</h5>

                            <button
                                className="location-modal-btn primary-btn w-100"
                                onClick={handleEnableLocation}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1a1a1a', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}
                            >
                                <i className="fas fa-crosshairs"></i> Use Current Location
                            </button>

                            {savedAddresses && savedAddresses.length > 0 && (
                                <div className="text-start mt-3 w-100">
                                    <label className="location-modal-subtitle" style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#666', marginBottom: '8px', display: 'block' }}>Saved Addresses</label>
                                    <div className="d-flex flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                                        {savedAddresses.map((addr, idx) => (
                                            <div
                                                key={addr._id || idx}
                                                onClick={() => handleSelectSavedAddress(addr)}
                                                className="saved-address-item-modal"
                                                style={{
                                                    cursor: 'pointer',
                                                    border: '1px solid #ddd',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    background: '#fff',
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '2px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f7f7f7';
                                                    e.currentTarget.style.borderColor = '#1a1a1a';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#fff';
                                                    e.currentTarget.style.borderColor = '#ddd';
                                                }}
                                            >
                                                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color: '#1a1a1a' }}>
                                                    <i className={`fas ${addr.label === 'Home' ? 'fa-home' : addr.label === 'Office' ? 'fa-building' : addr.label === 'Apartment' ? 'fa-city' : 'fa-map-marker-alt'}`} style={{ color: '#1a1a1a' }}></i>
                                                    {addr.label}
                                                </div>
                                                <div style={{ color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {addr.flatNo}, {addr.street}{addr.landmark ? `, ${addr.landmark}` : ""}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                className="btn btn-link w-100 mt-3"
                                onClick={handleSkipLocation}
                                style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', fontWeight: 'bold' }}
                            >
                                Skip & browse items
                            </button>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            <Modal show={isCalculating} centered backdrop="static" size="sm" contentClassName="location-modal-content">
                <Modal.Body className="text-center py-4">
                    <div className="location-loader">
                        <Spinner animation="border" />
                    </div>
                    <div className="location-modal-title mt-3">Calculating Distance...</div>
                </Modal.Body>
            </Modal>


            <Carousel interval={3000} className='coroselmain'>
                <Carousel.Item className='coroselmain2'>
                    <img className="d-block w-100" src="CA2.jpg" alt="Slide" />
                </Carousel.Item>
                <Carousel.Item className='coroselmain2'>
                    <img className="d-block w-100" src="CA1.jpg" alt="Slide" />
                </Carousel.Item>
                <Carousel.Item className='coroselmain2'>
                    <img className="d-block w-100" src="CA3.jpg" alt="Slide" />
                </Carousel.Item>
            </Carousel>

            <div style={{ padding: '20px' }}>
                {/* Search and Filter Section */}
                <div className="filter-section mb-4">
                    <div className="search-input-group">
                        <i className="fa-solid fa-magnifying-glass search-icon"></i>
                        <input
                            type="text"
                            className="custom-search-input"
                            placeholder="Search for restaurants and items"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        <i
                            className={`fa-solid fa-microphone search-icon ${isListening ? 'text-danger' : ''}`}
                            onClick={() => {
                                const runSpeechRecog = () => {
                                    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                                        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                                        const recognition = new SpeechRecognition();
                                        recognition.lang = 'en-US';
                                        recognition.interimResults = false;
                                        recognition.maxAlternatives = 1;

                                        recognition.onstart = () => {
                                            setIsListening(true);
                                            handleSearchChange('');
                                        };

                                        recognition.onresult = (event) => {
                                            const transcript = event.results[0][0].transcript;
                                            handleSearchChange(transcript);
                                            setIsListening(false);
                                        };

                                        recognition.onerror = (event) => {
                                            console.error("Speech recognition error", event.error);
                                            setIsListening(false);
                                            if (event.error === 'not-allowed') {
                                                alert("Microphone access denied. Please check your browser settings.");
                                            }
                                        };

                                        recognition.onend = () => {
                                            setIsListening(false);
                                        };

                                        recognition.start();
                                    } else {
                                        alert("Voice search is not supported in this browser.");
                                    }
                                };

                                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                                    navigator.mediaDevices.getUserMedia({ audio: true })
                                        .then(function (stream) {
                                            stream.getTracks().forEach(track => track.stop());
                                            runSpeechRecog();
                                        })
                                        .catch(function (err) {
                                            console.error("Error accessing microphone:", err);
                                            runSpeechRecog();
                                        });
                                } else {
                                    runSpeechRecog();
                                }
                            }}
                            style={{ cursor: 'pointer', marginLeft: '10px', color: isListening ? 'red' : 'inherit' }}
                        ></i>
                    </div>

                    <div className="toggle-group d-flex align-items-center">
                        {/* All Button */}
                        <button
                            className={`toggle-btn ${typeFilter === '' ? 'active-all' : ''}`}
                            onClick={() => setTypeFilter('')}
                            title="All"
                        >
                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>All</span>
                        </button>

                        {/* Veg Button */}
                        <button
                            className={`toggle-btn veg-btn ${typeFilter === 'veg' ? 'active-veg' : ''}`}
                            onClick={() => setTypeFilter('veg')}
                            title="Veg"
                        >
                            <i className="fa-solid fa-leaf"></i>
                        </button>

                        {/* Non-Veg Button */}
                        <button
                            className={`toggle-btn nonveg-btn ${typeFilter === 'non-veg' ? 'active-nonveg' : ''}`}
                            onClick={() => setTypeFilter('non-veg')}
                            title="Non-Veg"
                        >
                            <i className="fa-solid fa-drumstick-bite"></i>
                        </button>
                    </div>
                </div>

                {/* Category Filter Buttons - Positioned under search input */}
                <CategoryButtons activeCategory={categoryFilter} onSelect={handleCategorySelect} />

                <div className="mt-4">
                    {restList
                        .filter(restaurant => {
                            const lowerSearch = search.toLowerCase();
                            const lowerCategory = categoryFilter.toLowerCase();
                            const activeType = typeFilter; // 'veg' or 'non-veg'

                            // 1. Initial Match (No filters)
                            if (!search && !categoryFilter && !activeType) return true;

                            // 2. Check if the Restaurant itself matches criteria
                            const restaurantMatchesType = !activeType || restaurant.type === activeType;
                            const restaurantMatchesSearch = !search || restaurant.name.toLowerCase().startsWith(lowerSearch);
                            const restaurantMatchesCategory = !categoryFilter || restaurant.name.toLowerCase().includes(lowerCategory);

                            // 3. Check if any ITEMS in the restaurant match criteria
                            const hasMatchingItem = Data.some(item => {
                                if (item.restid !== Number(restaurant.id)) return false;

                                const itemMatchesSearch = !search || item.name.toLowerCase().startsWith(lowerSearch);
                                const itemMatchesCategory = !categoryFilter || item.name.toLowerCase().includes(lowerCategory);
                                const itemMatchesType = !activeType || item.type === activeType;

                                // Item must match all active item-level filters
                                return itemMatchesSearch && itemMatchesCategory && itemMatchesType;
                            });

                            // FINAL LOGIC: 
                            // A restaurant should be shown if:
                            // (The restaurant itself matches the Type AND Search AND Category)
                            // OR (There is at least one ITEM that satisfies all active filters)

                            // Note: If Type Filter is "Veg", we generally want to see restaurants that have Veg items,
                            // even if the restaurant is labeled as "Non-Veg" overall. 

                            const fullRestaurantMatch = restaurantMatchesType && restaurantMatchesSearch && restaurantMatchesCategory;

                            // If user is searching specifically for a Category OR Search text, 
                            // we prioritize the Item match.
                            if (search || categoryFilter) {
                                const useItemMatch = !search || search.trim().length > 1;
                                return (useItemMatch && hasMatchingItem) || (restaurantMatchesSearch && restaurantMatchesCategory && restaurantMatchesType);
                            }

                            // If no text search, fallback to standard type filter
                            return restaurantMatchesType;
                        })
                        .map(item => (
                            <div key={item.name} className="mb-3">
                                <button onClick={() => handleClicke(item.name)} className="w-100 border-0 bg-transparent p-0">
                                    <RestorentDisplay
                                        name={item.name}
                                        place={item.place}
                                        image={item.image}
                                        rating={item.rating || "4.2"}
                                        distance={roadDistances[item.name] ? `${roadDistances[item.name]} km` : "..."}
                                        isActive={restaurantStatuses[item.id] !== false} // Default to true if undefined to avoid flashing closed on load, or handle loading state
                                    />
                                </button>
                            </div>
                        ))
                    }
                </div>
            </div>
            {/* Navbar Removed: Already handled in global layout */}
        </div >
    );
}