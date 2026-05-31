


'use client';
import { useState, useEffect } from "react";
import axios from "axios";
import './login.css';
import { useDispatch } from "react-redux";
import { setUser } from "lib/features/userSlice";
import Loading from '../loading/page';
import ErrorPopup from './ErrorPopup';

export default function LoginForm({ handleFPClick, handleSignUp }) {
    const dispatch = useDispatch();
    const [inputName, setInputName] = useState('');
    const [inputEmail, setInputEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [popup, setPopup] = useState({ show: false, message: '', isSuccess: false });

    // 1. Check for existing session on load
    useEffect(() => {
        // Aggressive Cleanup of potential Recaptcha leftovers from other pages
        try {
            const badges = document.querySelectorAll('.grecaptcha-badge');
            badges.forEach(badge => badge.remove());

            const iframes = document.querySelectorAll('iframe[src*="google.com/recaptcha"]');
            iframes.forEach(iframe => {
                let current = iframe;
                while (current && current.parentElement !== document.body) {
                    current = current.parentElement;
                }
                if (current) current.remove();
            });

            // Clear global verifier if it exists
            if (window.recaptchaVerifier) {
                try { window.recaptchaVerifier.clear(); } catch (e) { }
                window.recaptchaVerifier = null;
            }
        } catch (err) {
            console.error("Login page cleanup failed:", err);
        }

        const loggedInUser = localStorage.getItem("userId");
        const loginTime = localStorage.getItem("loginTimestamp");

        if (loggedInUser && loginTime) {
            const currentTime = new Date().getTime();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

            if (currentTime - Number(loginTime) < thirtyDaysInMs) {
                // If ID is there but details are missing, try to fetch them quietly
                if (!localStorage.getItem("userPhone") || !localStorage.getItem("userName")) {
                    axios.get('/api/users')
                        .then(res => {
                            const found = res.data.find(u => u._id === loggedInUser);
                            if (found) {
                                localStorage.setItem("userPhone", found.phone || "");
                                localStorage.setItem("userName", found.name || "");
                                localStorage.setItem("userEmail", found.email || "");
                            }
                        })
                        .catch(err => console.error("Background fetch failed", err));
                }

                window.location.href = "/mainRestorentList";
                return;
            }
        }

        // Ready to show login form
        setLoading(false);
    }, []);

    // Check user credentials
    const handleCheck = async () => {
        if (!inputName || !inputEmail) {
            setPopup({ show: true, message: "Please enter both Mobile Number and Password.", isSuccess: false });
            return;
        }

        setLoading(true);
        try {
            // inputName = Phone, inputEmail = Password
            const res = await axios.post('/api/login', {
                phone: inputName,
                password: inputEmail
            });

            const matchedUser = res.data;

            if (matchedUser) {
                // 1. Save to LocalStorage (Persistence)
                localStorage.setItem("userId", matchedUser._id);
                localStorage.setItem("userPhone", matchedUser.phone || "");
                localStorage.setItem("userName", matchedUser.name || "");
                localStorage.setItem("userEmail", matchedUser.email || "");
                localStorage.setItem("loginTimestamp", new Date().getTime().toString());

                // 2. Save to Redux (Instant State)
                dispatch(setUser({
                    id: matchedUser._id,
                    name: matchedUser.name,
                    phone: matchedUser.phone,
                    email: matchedUser.email
                }));

                // Reset location prompt so it asks again on fresh login
                sessionStorage.removeItem("isAppLoaded");

                // Show popup if they got the signup bonus
                if (matchedUser.showWalletPopup) {
                    setPopup({
                        show: true,
                        message: "Congratulations! 50 coins have been added to your wallet for using a valid coupon code.",
                        isSuccess: true,
                        redirectAfter: true
                    });
                } else {
                    // Directly go to restaurant list
                    window.location.href = "/mainRestorentList";
                }
            }
        } catch (err) {
            // Only log unexpected errors, not standard login failures (401)
            if (err.response && err.response.status === 401) {
                const errorMsg = err.response.data.error;
                if (errorMsg === "Account not found") {
                    setPopup({
                        show: true,
                        message: "No account found. Please create a new account.",
                        isSuccess: false,
                        redirectToSignup: true
                    });
                } else {
                    setPopup({ show: true, message: "Invalid Mobile Number or Password. Please try again.", isSuccess: false });
                }
            } else if (err.response && err.response.status === 403) {
                setPopup({ show: true, message: "Your Id was Blocked", isSuccess: false });
            } else {
                console.error("Login verification failed:", err);
                setPopup({ show: true, message: "Something went wrong. Please try again later.", isSuccess: false });
            }
        } finally {
            setLoading(false);
        }
    };

    // Use your custom Loading component with the spinning pizza
    if (loading) {
        return <Loading />;
    }

    return (
        <div className="login-container">
            {/* Custom Popup */}
            {popup.show && (
                <ErrorPopup
                    message={popup.message}
                    isSuccess={popup.isSuccess}
                    buttonText={popup.redirectToSignup ? "Create New Account" : (popup.redirectAfter ? "Continue" : null)}
                    onClose={() => {
                        setPopup({ ...popup, show: false });
                        if (popup.redirectToSignup) {
                            handleSignUp();
                        }
                        if (popup.redirectAfter) {
                            window.location.href = "/mainRestorentList";
                        }
                    }}
                />
            )}

            {/* Bootstrap CDN for mobile compatibility/grid if needed elsewhere, though custom CSS handles mostly everything here */}


            <div className="hello-box">
                <h1 className="hello-text">LEEVON</h1>
            </div>

            <div className="form-wrapper">
                {/* Mobile Number Input (mapped to inputName as per logic) */}
                <div className="input-group-custom">
                    <div className="input-icon">
                        {/* Person Icon */}
                        <svg viewBox="0 0 24 24" className="icon-grey">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Mobile number"
                        value={inputName}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Only allow numbers and max 10 digits
                            if (/^\d*$/.test(val) && val.length <= 10) {
                                setInputName(val);
                            }
                        }}
                        className="custom-input"
                    />
                </div>

                {/* Password Input (mapped to inputEmail as per logic) */}
                <div className="input-group-custom">
                    <div className="input-icon">
                        {/* Lock Icon - Red */}
                        <svg viewBox="0 0 24 24" className="icon-red">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3 3.1-3 1.71 0 3.1 1.29 3.1 3v2z" />
                        </svg>
                    </div>
                    <input
                        type="password"
                        placeholder="Password"
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        className="custom-input"
                    />
                </div>

                <div
                    className="forgot-text"
                    onClick={handleFPClick}
                >
                    Forgot password ?
                </div>

                <button
                    className="login-btn-custom"
                    onClick={handleCheck}
                >
                    Login
                </button>
            </div>

            <div className="create-account-text">
                Create New Account
                <span
                    className="create-link"
                    onClick={handleSignUp}
                >
                    SignUp
                </span>
            </div>
        </div>
    );
}
