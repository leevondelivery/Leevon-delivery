"use client";
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUser, logoutUser } from './features/userSlice';
import { useRouter, usePathname } from 'next/navigation';
import Loading from '@/app/loading/page';

export default function AuthInitializer({ children }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const verifyUser = async () => {
            const userId = localStorage.getItem("userId");
            const userName = localStorage.getItem("userName");
            const userPhone = localStorage.getItem("userPhone");
            const userEmail = localStorage.getItem("userEmail");

            const cleanPath = pathname ? pathname.split('?')[0].replace(/\/$/, '') || '/' : '/';
            const publicPaths = ['/login', '/privacy', '/'];
            const isPublic = publicPaths.includes(cleanPath);

            if (!userId) {
                if (isPublic) {
                    setIsAuthorized(true);
                    setChecked(true);
                } else {
                    console.warn("🔒 No User ID found, redirecting to login.");
                    setIsAuthorized(false);
                    setChecked(false);
                    router.replace('/login');
                }
                return;
            }

            // Immediately set local user details in Redux for responsive initial rendering
            dispatch(setUser({
                id: userId,
                name: userName,
                phone: userPhone,
                email: userEmail
            }));

            try {
                // Verify user existence and get latest details from database
                const res = await fetch(`/api/users/${userId}`);
                if (res.ok) {
                    const userData = await res.json();
                    
                    // Sync latest data to local storage
                    localStorage.setItem("userName", userData.name || "");
                    localStorage.setItem("userPhone", userData.phone || "");
                    localStorage.setItem("userEmail", userData.email || "");

                    // Update Redux state
                    dispatch(setUser({
                        id: userId,
                        name: userData.name,
                        phone: userData.phone,
                        email: userData.email
                    }));

                    setIsAuthorized(true);
                    setChecked(true);
                } else if (res.status === 404) {
                    // User was deleted or ID is invalid
                    console.warn("🔒 User ID is invalid or deleted. Clearing session and logging out.");
                    localStorage.clear();
                    sessionStorage.removeItem("isAppLoaded");
                    dispatch(logoutUser());
                    
                    setIsAuthorized(false);
                    setChecked(false);
                    router.replace('/login');
                } else {
                    // Database or Server error: Fallback to local storage session data so app works offline
                    setIsAuthorized(true);
                    setChecked(true);
                }
            } catch (err) {
                console.error("Failed to verify user session with server", err);
                // Network error (offline): Fallback to local storage session data
                setIsAuthorized(true);
                setChecked(true);
            }
        };

        verifyUser();
    }, [dispatch, router, pathname]);

    // Show loading spinner while loading or unauthorized (during redirection)
    if (!checked || !isAuthorized) {
        return <Loading />;
    }

    return children;
}
