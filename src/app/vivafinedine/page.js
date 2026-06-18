"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { Data } from './data';
import { ProductCard } from "../universaldisplay/page";
import { showToast } from "../../toaster/page";
import RestorentDisplay from "../restorentList/restnamedisplay";
import restuarents from "../restorentList/restuarentnamesdata";
import Navbar from "@/navigation/page";
// ✅ Fixed Import: Capitalized 'Loading'
import Loading from '../loading/page';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantStatuses, fetchItemStatuses, selectAllStatuses, selectRestaurantLoading, selectAllItemStatuses, selectItemLoading } from 'lib/features/restaurantSlice';
import { selectUser } from 'lib/features/userSlice';

import './viva.css';

export default function VivaMenuList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'low-to-high', 'high-to-low'
  const [search, setSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [cart, setCart] = useState([]);



  // ✅ REDUX INTEGRATION
  const dispatch = useDispatch();
  const allStatuses = useSelector(selectAllStatuses);
  const isLoadingRedux = useSelector(selectRestaurantLoading);

  // Item (Button) Statuses
  const buttonStatuses = useSelector(selectAllItemStatuses);
  const buttonStatusLoading = useSelector(selectItemLoading);

  // ID "2" corresponds to KNL based on API verification
  const restaurantActive = allStatuses["2"] ?? false;
  // If we have data, we are not "loading status" anymore. If Redux is fetching, use that.
  const statusLoading = Object.keys(allStatuses).length === 0 && isLoadingRedux;

  useEffect(() => {
    // If we landed here directly (refresh), store might be empty. Fetch it.
    if (Object.keys(allStatuses).length === 0) {
      dispatch(fetchRestaurantStatuses());
      dispatch(fetchItemStatuses()); // Ensure items are also fetched
    }
  }, [dispatch, allStatuses]);

  // ✅ REDUX AUTH CHECK
  const user = useSelector(selectUser);
  useEffect(() => {
    if (!user && !localStorage.getItem("userId")) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router, user]);

  // Removed manual Fetch button statuses useEffect

  // ✅ ADD TO CART
  const addToCart = (item) => {
    // ✅ Cached Service Check (No API Call)
    const serviceStatus = localStorage.getItem("isServiceAvailable");
    if (serviceStatus === "false") {
      showToast("Service Unavailable: You are outside the service area.", "danger");
      return;
    }

    // 🔴 BLOCK IF CLOSED
    if (!restaurantActive) {
      showToast("Restaurant is currently not accepting orders", "danger");
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem("cart")) || [];

    const isItemAlreadyInCart = existingCart.some(
      (cartItem) => cartItem.id === item.id
    );

    if (isItemAlreadyInCart) {
      showToast("Item already exists in the cart.", "danger");
      return;
    }

    if (existingCart.length > 0 && existingCart[0].restid !== item.restid) {
      showToast("You Can Select From Only One Restaurant", "danger");
      return;
    }

    item.restaurantName = "Viva Finedine";
    const updatedCart = [...existingCart, item];
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated")); // Notify Navbar
    showToast("Added to cart successfully!");
  };

  // ✅ Distance State
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    // Get distance from local storage
    const storedDistance = localStorage.getItem("currentRestaurantDistance");
    if (storedDistance) {
      setDistance(storedDistance);
    }
  }, []);

  // ✅ Corrected Loading placement
  if (loading) return <Loading />;

  return (
    <div className="restaurant-page-bg container mt-4">
      {/* ✅ RESTAURANT CARD */}
      <div className="mb-4">
        <RestorentDisplay data={restuarents.find(r => r.id === 2)} distance={distance} className="col-12 mb-4" />

        {statusLoading && (
          <div className="alert alert-warning mt-3">
            Checking restaurant status...
          </div>
        )}

        {!statusLoading && !restaurantActive && (
          <div className="reststatus">
            Restaurant is currently CLOSED
          </div>
        )}
      </div>

      <div className="filter-section mb-4">
        <div className="search-input-group">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            className="custom-search-input"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                    setSearch('');
                  };

                  recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    setSearch(transcript);
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




      <div className="sort-text-container">
        <button
          className={`sort-text-btn ${sortOrder === 'default' ? 'active-sort' : ''}`}
          onClick={() => setSortOrder('default')}
        >
          All
        </button>
        <button
          className={`sort-text-btn ${sortOrder === 'low-to-high' ? 'active-sort' : ''}`}
          onClick={() => setSortOrder('low-to-high')}
        >
          Low Price to High Price
        </button>
        <button
          className={`sort-text-btn ${sortOrder === 'high-to-low' ? 'active-sort' : ''}`}
          onClick={() => setSortOrder('high-to-low')}
        >
          High Price to Low Price
        </button>
      </div>
      <div className="row">
        {Data.filter((item) => {
          const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
          const matchesType = typeFilter === "" || item.type === typeFilter;
          const isActive = buttonStatuses[item.id] === true;

          return matchesSearch && matchesType && isActive;
        })
          .sort((a, b) => {
            const priceA = typeof a.price === 'string' ? parseFloat(a.price.replace(/[^0-9.]/g, '')) : a.price;
            const priceB = typeof b.price === 'string' ? parseFloat(b.price.replace(/[^0-9.]/g, '')) : b.price;
            if (sortOrder === 'low-to-high') return priceA - priceB;
            if (sortOrder === 'high-to-low') return priceB - priceA;
            return 0;
          })
          .map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              name={item.name}
              symbol={item.symbol}
              price={item.price}
              button={item.button}
              onAddToCart={addToCart}
              disabled={!restaurantActive}
              image={item.image}

            />
          ))}
        {Data.filter((item) => {
          const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
          const matchesType = typeFilter === "" || item.type === typeFilter;
          const isActive = buttonStatuses[item.id] === true;
          return matchesSearch && matchesType && isActive;
        }).length === 0 && (
            <div className="col-12 text-center text-muted">
              No active items available.
            </div>
          )}
      </div>

      <Navbar />
    </div>
  );
}
