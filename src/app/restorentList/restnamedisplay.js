/* eslint-disable @next/next/no-img-element */
import React, { useEffect } from 'react';
import './restnamedisplay.css';

export default function RestorentDisplay(props) {
  useEffect(() => {
    // Reset window scroll to top when entering a restaurant page
    window.scrollTo(0, 0);
  }, []);
  // Normalize data whether passed as a 'data' object or individual props
  const item = props.data || props;
  const isActive = props.isActive !== false;

  // Handle location/place naming differences
  const locationText = item.location || item.place || '';

  // Helper to safely get location parts
  const getLocationParts = (loc) => {
    if (!loc) return { place1: 'Location', place2: '' };
    const parts = loc.split(',');
    return {
      place1: parts[0]?.trim() || loc,
      place2: parts[1]?.trim() || '' // If only one part, place2 is empty
    };
  };

  const { place1, place2 } = getLocationParts(locationText);

  // Allow overriding the outer column classes via props
  const containerClass = props.className || "col-12 col-md-6 col-lg-4 mb-3";

  return (
    <div className={containerClass}>
      <div className={`restaurant-card ${!isActive ? 'restaurant-closed' : ''}`}>
        <div className="restaurant-content">
          <div className="restaurant-info">
            <h2 className="restaurant-name">{item.name}</h2>

            <div className="restaurant-location">
              <span>{place1}</span>
              <span>{place2}</span>
            </div>

            <div className="restaurant-rating">
              <div className="rating-badge">
                <span className="rating-star">★</span>
                <span className="rating-value">{item.rating}</span>
              </div>

              {/* Display Distance if available */}
              {(props.distance || item.distance) && (
                <div className="distance-badge ms-2">
                  <span className="distance-value">
                    {props.distance || item.distance}
                    {!isNaN(parseFloat(props.distance || item.distance)) ? ' km' : ''}
                  </span>
                </div>
              )}
            </div>


          </div>

          <div className="restaurant-image-wrapper">
            <img
              src={item.image}
              alt={item.name}
              className="restaurant-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
