/* eslint-disable @next/next/no-img-element */
export default function RestorentDisplay({ name, place, rating, image, distance, isActive = true }) {
    return (
        <div className={`rest-card-main ${!isActive ? 'rest-card-closed' : ''}`}>
            {/* Unique Modern Card Structure */}
            <div className="rest-card-unique position-relative">
                {/* Image Section with Hover Zoom */}
                <div className="unique-image-container position-relative">
                    <img
                        src={image}
                        alt={name}
                        className="rest-image"
                        style={{
                            width: "100%",
                            height: "180px", // Slightly taller for better look
                            objectFit: "cover",
                            display: "block", // Removes bottom gap
                        }}
                    />

                    {/* Floating Rating Pill */}
                    <div className="rating-pill-floating">
                        <i className="fas fa-star text-warning"></i>
                        <span>{rating}</span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="mt-3 px-1 text-start">
                    <h3 className="rest-title-modern h5">{name}</h3>

                    <div className="d-flex align-items-center justify-content-between">
                        <p className="rest-location-modern mb-0">
                            <i className="fas fa-map-marker-alt text-danger opacity-75"></i>
                            {place}
                        </p>

                        <span className="badge bg-light text-dark border shadow-sm">
                            📍 {distance || "..."}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}