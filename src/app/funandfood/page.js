'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Data } from './data';
import { ProductCard } from '../universaldisplay/page';
import { showToast } from '../../toaster/page';

import RestorentDisplay from "../restorentList/restnamedisplay";
import restuarents from "../restorentList/restuarentnamesdata";
import Navbar from '@/navigation/page';
import Loading from '../loading/page';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRestaurantStatuses, fetchItemStatuses, selectAllStatuses, selectRestaurantLoading, selectAllItemStatuses, selectItemLoading } from 'lib/features/restaurantSlice';
import { selectUser } from 'lib/features/userSlice';

import './funandfood.css';

export default function FunAndFoodMenuList() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [cart, setCart] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'low-to-high', 'high-to-low'

  const categories = ['All', ...new Set(Data.map(item => item.category).filter(Boolean))];

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isSidebarOpen]);

  // ✅ Restaurant status states
  const dispatch = useDispatch();
  const allStatuses = useSelector(selectAllStatuses);
  const isLoadingRedux = useSelector(selectRestaurantLoading);

  // ID "1" corresponds to Kushas
  const restaurantActive = allStatuses["7"] ?? false;
  const statusLoading = Object.keys(allStatuses).length === 0 && isLoadingRedux;

  // Button statuses state (REDUX)
  const buttonStatuses = useSelector(selectAllItemStatuses);
  const buttonStatusLoading = useSelector(selectItemLoading);

  useEffect(() => {
    if (Object.keys(allStatuses).length === 0) {
      dispatch(fetchRestaurantStatuses());
      dispatch(fetchItemStatuses());
    }
  }, [dispatch, allStatuses]);

  // ✅ Authentication check
  const user = useSelector(selectUser);
  useEffect(() => {
    if (!user && !localStorage.getItem("userId")) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router, user]);

  // Removed manual fetch button statuses logic

  // ✅ Add item to cart
  const addToCart = (item) => {
    // ✅ Cached Service Check (No API Call)
    const serviceStatus = localStorage.getItem("isServiceAvailable");
    if (serviceStatus === "false") {
      showToast("Service Unavailable: You are outside the service area.", "danger");
      return;
    }

    if (!restaurantActive) {
      showToast("Restaurant is currently not accepting orders", "danger");
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem('cart')) || [];

    if (existingCart.some(cartItem => cartItem.id === item.id)) {
      showToast("Item already exists in the cart.", "danger");
      return;
    }

    // ✅ One restaurant restriction
    if (existingCart.length > 0 && existingCart[0].restid !== item.restid) {
      showToast("You Can Select From Only One Restaurant", "danger");
      return;
    }

    item.restaurantName = "Fun and Food";

    const updatedCart = [...existingCart, item];
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
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

  if (loading) return <Loading />;

  return (
    <div className="restaurant-page-bg container mt-4">

      {/* Sidebar Toggle Button */}
      <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><i className={`fa-solid ${isSidebarOpen ? 'fa-angle-left' : 'fa-angle-right'}`}></i>
        <div className="sidebar-label">CATEGORIES</div>
      </button>

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`category-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        <h3>FIND OUT</h3>
        <ul>
          {categories.map(cat => (
            <li
              key={cat}
              className={categoryFilter === cat ? 'active' : ''}
              onClick={() => { setCategoryFilter(cat); setIsSidebarOpen(false); }}
            >
              {cat}
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ RESTAURANT CARD */}
      <RestorentDisplay data={restuarents.find(r => r.id === 7)} distance={distance} className="col-12 mb-4" />

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

      <div className="filter-section mb-4 mt-4">
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
        {Data.filter(item => {
          const matchesSearch = item.name.toLowerCase().startsWith(search.toLowerCase());
          const matchesType = typeFilter === '' || item.type === typeFilter;
          const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
          const isActive = buttonStatuses[item.id] === true;

          return matchesSearch && matchesType && isActive && matchesCategory;
        })
          .sort((a, b) => {
            if (sortOrder === 'low-to-high') return a.price - b.price;
            if (sortOrder === 'high-to-low') return b.price - a.price;
            return 0;
          })
          .map(item => (
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
        {Data.filter(item => {
          const matchesSearch = item.name.toLowerCase().startsWith(search.toLowerCase());
          const matchesType = typeFilter === '' || item.type === typeFilter;
          const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
          const isActive = buttonStatuses[item.id] === true;
          return matchesSearch && matchesType && isActive && matchesCategory;
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
