'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function TreeBanner() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner in this session
    const isDismissed = sessionStorage.getItem('treeBannerDismissed');
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  // Define which pages to hide the banner on (same as Navbar)
  const cleanPath = pathname ? pathname.replace(/\/$/, '') : '';
  const hiddenPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/create-account',
    '/privacy',
    '/mainRestorentList',
    '/restorentList'
  ];
  
  if (hiddenPaths.includes(pathname) || pathname?.startsWith('/invoice') || cleanPath === '/privacy') {
    return null;
  }

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('treeBannerDismissed', 'true');
  };

  return (
    <div className="tree-banner-container">
      <div className="tree-banner-content">
        <span className="tree-banner-badge">
          <span className="tree-pulse-dot"></span>
          🌱 Eco-Initiative
        </span>
        <span className="tree-banner-text">
          Every order you place plants a tree! Help us grow a greener world. 🌲
        </span>
      </div>
      <button className="tree-banner-close" onClick={handleDismiss} aria-label="Close banner">
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}
