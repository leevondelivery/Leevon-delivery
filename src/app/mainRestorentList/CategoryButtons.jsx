'use client';

import React from 'react';
import './categoryButtons.css';

const categories = [
    { name: 'Biryani', image: '/cat_biryani.png', searchPrefix: 'biryani' },
    { name: 'Noodles', image: '/cat_noodles.png', searchPrefix: 'noodles' },
    { name: 'Pasta', image: '/cat_pasta.png', searchPrefix: 'pasta' },
    { name: 'Milkshakes', image: '/cat_milkshake.png', searchPrefix: 'shake' }
];

export default function CategoryButtons({ activeCategory, onSelect }) {
    return (
        <div className="category-container">
            <div className="category-scroll">
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => onSelect(activeCategory === cat.searchPrefix ? '' : cat.searchPrefix)}
                        className={`category-card ${activeCategory === cat.searchPrefix ? 'active' : ''}`}
                    >
                        <div className="card-image-wrapper">
                            <img src={cat.image} alt={cat.name} className="cat-img" />
                            {activeCategory === cat.searchPrefix && (
                                <div className="unselect-icon">
                                    <i className="fa-solid fa-xmark"></i>
                                </div>
                            )}
                            <div className="text-overlay">
                                <span className="cat-name-box">{cat.name}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
