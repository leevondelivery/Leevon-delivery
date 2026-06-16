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

export default function RestorentList({ externalSearch, onSearchChange }) {
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

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

    // Location modal states
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showFetchingModal, setShowFetchingModal] = useState(false);
    const [outOfZone, setOutOfZone] = useState(false);
    const [showSettingsButton, setShowSettingsButton] = useState(false);

    // Location distance states
    const [roadDistances, setRoadDistances] = useState({});
    const distRef = useRef({});

    const router = useRouter();

    // IMMEDIATE: Load cached distances on mount to prevent "..." flash
    useEffect(() => {
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
    }, []);

    // Location request tracking
    const hasRequestedThisMount = useRef(false);

    // Fetch distances function
    const fetchAllDistances = useCallback(async (uLat, uLng) => {
        console.log("🌐 New Application Instance: Hitting Route API...");
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
                    console.warn(`⚠️ Falling back to air distance for ${item.name}`);
                    const distMeters = getDistance(
                        { latitude: parseFloat(uLat), longitude: parseFloat(uLng) },
                        { latitude: item.lat, longitude: item.lng }
                    );
                    results[item.name] = (distMeters / 1000).toFixed(1);
                }
            } catch (err) {
                console.error(err);
                // Fallback on error
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
            alert("📍 Location Obtained Successfully!\nLatitude: " + latitude + "\nLongitude: " + longitude);
            localStorage.setItem("customerLat", latitude);
            localStorage.setItem("customerLng", longitude);
            sessionStorage.removeItem("locationSkipped"); // Clear skipped flag on success

            // Only show blocking modal if this is the first load of the session
            const isAppLoaded = sessionStorage.getItem("isAppLoaded");
            if (!isAppLoaded) {
                setShowFetchingModal(true);
            }

            // Check if user is inside the polygon
            const isInside = isPointInPolygon({ latitude, longitude }, kurnoolPolygon);

            if (isInside) {
                localStorage.setItem("isServiceAvailable", "true");
                // Fetch distances first so they are ready
                await fetchAllDistances(latitude, longitude);
                
                // Now close everything since distances are ready
                setShowLocationModal(false);
            } else {
                console.warn("🚫 User is outside the service area.");
                localStorage.setItem("isServiceAvailable", "false");
                setOutOfZone(true);
                setError("❌ Outside Service Area");
                setShowLocationModal(false);
            }

            // Always hide fetching spinner after completion
            setShowFetchingModal(false);
        };

        const handleError = (err) => {
            let errorMsg = "⚠️ GPS access required.";
            const code = err.code !== undefined ? err.code : (err.message && err.message.includes("denied") ? 1 : 2);

            alert("❌ Location Error Details:\n" +
                  "- Code: " + code + " (" + 
                  (code === 1 ? "Permission Denied" : code === 2 ? "Position Unavailable" : code === 3 ? "Timeout" : "Unknown") + ")\n" +
                  "- Message: " + (err.message || "No error message") + "\n" +
                  "- HTTPS Secure Context: " + (typeof window !== 'undefined' && window.isSecureContext) + "\n" +
                  "- Geolocation API available: " + (typeof navigator !== 'undefined' && !!navigator.geolocation) + "\n" +
                  "- isNative: " + isNative);

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
                    // Try to enable GPS natively first using our custom plugin
                    try {
                        const { registerPlugin } = await import('@capacitor/core');
                        const NativeSettings = registerPlugin('NativeSettings');
                        console.log("📱 Attempting native GPS activation...");
                        await NativeSettings.requestGpsEnable();
                        console.log("✅ Native GPS activation successful or already enabled.");
                    } catch (gpsEnableErr) {
                        alert("⚠️ Native GPS activation error:\n" + gpsEnableErr.message);
                        console.warn("⚠️ Native GPS activation failed/cancelled:", gpsEnableErr);
                    }

                    // Use a short 3s timeout - if GPS is off it will fail fast
                    try {
                        const pos = await Geolocation.getCurrentPosition({
                            enableHighAccuracy: true,
                            timeout: 3000,
                            maximumAge: 0
                        });
                        await handleSuccess(pos);
                    } catch (gpsErr) {
                        // GPS is off or unavailable - show error with settings button
                        console.warn("🚫 GPS is off or unavailable:", gpsErr);
                        setShowSettingsButton(true);
                        handleError({ code: 2, message: "⚠️ Device Location is OFF. Please enable GPS in Settings and retry." });
                    }
                } else {
                    handleError({ code: 1, message: "Location permission denied." });
                }
            } catch (err) {
                console.error("📱 Capacitor Geolocation failed, using browser fallback:", err);
                navigator.geolocation
                    ? navigator.geolocation.getCurrentPosition(handleSuccess, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
                    : handleError({ code: 2, message: "Geolocation not supported" });
            }
        } else {
            console.log("🌐 Web Platform. Using navigator.geolocation.");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                });
            } else {
                handleError({ code: 2, message: "Geolocation not supported" });
            }
        }
    }, [fetchAllDistances]);

    // Open native Android location settings
    const handleOpenSettings = async () => {
        try {
            // Try the custom native plugin first
            const { registerPlugin } = await import('@capacitor/core');
            const NativeSettings = registerPlugin('NativeSettings');
            await NativeSettings.openLocationSettings();
        } catch (e) {
            console.warn("Native settings plugin failed, trying app-settings deep link:", e);
            // Fallback: open Android location settings via deep link
            try {
                window.open('app-settings:', '_system');
            } catch (e2) {
                console.error("All settings open methods failed:", e2);
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
        setMounted(true);

        // Redux Auth Check
        const userId = localStorage.getItem("userId");
        const loginTime = localStorage.getItem("loginTimestamp");
        const currentTime = new Date().getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (!userId || !loginTime || (currentTime - Number(loginTime) > thirtyDaysInMs)) {
            localStorage.clear(); // Clear session data if expired or missing
            router.replace("/login");
            return;
        }

        // Fetch restaurant statuses via Redux
        dispatch(fetchRestaurantStatuses());
        dispatch(fetchItemStatuses());

        // Auto-refresh status
        const intervalId = setInterval(() => {
            console.log("🔄 Auto-refreshing restaurant data...");
            dispatch(fetchRestaurantStatuses());
            dispatch(fetchItemStatuses());
        }, 20000);

        // Location Logic: Aggressively prefer cached data
        const savedDistances = localStorage.getItem("allRestaurantDistances");
        // const isAppLoaded = sessionStorage.getItem("isAppLoaded"); // Removed to force check on reload

        const checkActiveAndProceed = async () => {
            // 1. Load cached distances FIRST so user sees data immediately while we refresh location
            if (savedDistances) {
                try {
                    const parsed = JSON.parse(savedDistances);
                    console.log("💾 Loading distances from cache for immediate display:", parsed);
                    setRoadDistances(parsed);
                    distRef.current = parsed;
                } catch (e) {
                    console.error("Cache parse error", e);
                }
            }

            // 2. Request Location Logic
            // If app is already loaded in this session, DO NOT request location again.
            // This prevents asking for permission or recalculating distances on simple route changes.
            const isAppLoaded = sessionStorage.getItem("isAppLoaded");
            if (isAppLoaded) {
                console.log("⚡ App cached in session: Skipping location request.");
                return;
            }

            // 3. Check for Active Orders BEFORE Requesting Location (API Cost Optimization)
            if (userId) {
                try {
                    const res = await fetch(`/api/check-user-active-order?userId=${userId}`);
                    const data = await res.json();
                    if (data.hasActiveOrder) {
                        console.log("📦 Active Order Found: Skipping Google Route API & Location check.");
                        sessionStorage.setItem("isAppLoaded", "true"); // Mark as loaded so we don't check again
                        return; // EXIT COMPLETELY - Save Money!
                    }
                } catch (err) {
                    console.error("Failed to check active order", err);
                    // Fall through to request location if check fails
                }
            }

            // 4. First time in session & No Active Order: Request Location
            requestLocation();
        };

        checkActiveAndProceed();
        setLoading(false);

        return () => clearInterval(intervalId);
    }, [dispatch, router]);

    // Auto-retry location check when window/app gains focus (e.g. returning from Settings)
    useEffect(() => {
        const handleFocus = () => {
            const isAppLoaded = sessionStorage.getItem("isAppLoaded");
            const locationSkipped = sessionStorage.getItem("locationSkipped");
            if (!isAppLoaded && !locationSkipped) {
                console.log("🔄 App refocused/visible: Retrying location request.");
                requestLocation();
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
        // Find the restaurant to get its ID
        const restaurant = restList.find(r => r.name === name);
        if (restaurant && restaurant.id) {
            const isActive = restaurantStatuses[restaurant.id];
            if (isActive !== undefined) {
                localStorage.setItem("currentRestaurantStatus", isActive);
            }
        }

        const dist = roadDistances[name] || "0";
        localStorage.setItem("currentRestaurantDistance", dist);
        localStorage.setItem("currentRestaurantName", name);

        if (name === "Viva Finedine") {
            router.push('/vivafinedine');
        
        } else if (name === "Amigoo Noshery") {
            router.push('/AmigoNoshery');
        }else if (name === "Mr.Hangout Café") {
            router.push('/mrhangout');
        }else if (name === "Reddy Family Restuarent") {
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

    if (loading && !mounted) return <Loading />;

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
                                <button className="location-modal-btn primary-btn" onClick={handleEnableLocation}>
                                    📱 Retry GPS
                                </button>
                                <button className="btn btn-secondary border w-100" style={{ padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }} onClick={handleOpenSettings}>
                                    ⚙️ Open Location Settings
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="location-modal-icon-container">
                                <i className="fas fa-map-marker-alt location-modal-icon"></i>
                            </div>
                            <h5 className="location-modal-title">Location Permission Disclosure</h5>
                            <p className="location-modal-text" style={{ fontSize: '0.85rem', textAlign: 'left', lineHeight: '1.5', margin: '15px 0', padding: '0 5px' }}>
                                This application requires access to your device's precise location (GPS coordinates) to:
                                <br />• <strong>Verify Service Area:</strong> Confirm if you are located within our active Kurnool City delivery boundary.
                                <br />• <strong>Calculate Delivery Fees:</strong> Compute accurate road distance and delivery fees from the restaurant to your doorstep.
                                <br /><br />
                                This location data is accessed only in the foreground while you are using the app. We do not store your coordinates permanently, use them for marketing, or share them with third-party advertisers.
                            </p>
                            <button
                                className="location-modal-btn primary-btn"
                                onClick={handleEnableLocation}
                            >
                                🔐 Agree & Enable Location
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

            <Modal show={isRouting} centered backdrop="static" size="sm" contentClassName="location-modal-content">
                <Modal.Body className="text-center py-4">
                    <div className="location-loader">
                        <Spinner animation="grow" variant="success" />
                    </div>
                    <div className="location-modal-title mt-2">Entering Restaurant...</div>
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
                            const restaurantMatchesSearch = !search || restaurant.name.toLowerCase().includes(lowerSearch);
                            const restaurantMatchesCategory = !categoryFilter || restaurant.name.toLowerCase().includes(lowerCategory);

                            // 3. Check if any ITEMS in the restaurant match criteria
                            const hasMatchingItem = Data.some(item => {
                                if (item.restid !== Number(restaurant.id)) return false;

                                const itemMatchesSearch = !search || item.name.toLowerCase().includes(lowerSearch);
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
                                return hasMatchingItem || (restaurantMatchesSearch && restaurantMatchesCategory && restaurantMatchesType);
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