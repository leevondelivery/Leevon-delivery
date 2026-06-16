"use client";
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUser } from './features/userSlice';
import { useRouter, usePathname } from 'next/navigation';
import Loading from '@/app/loading/page';

export default function AuthInitializer({ children }) {
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const userName = localStorage.getItem("userName");
        const userPhone = localStorage.getItem("userPhone");
        const userEmail = localStorage.getItem("userEmail");

        // 1. Restore User Session
        if (userId) {
            dispatch(setUser({
                id: userId,
                name: userName,
                phone: userPhone,
                email: userEmail
            }));
        }

        // 2. Global Route Protection
        // Allow access to login, privacy, and root landing pages without auth
        const cleanPath = pathname ? pathname.split('?')[0].replace(/\/$/, '') || '/' : '/';
        const publicPaths = ['/login', '/privacy', '/'];
        
        if (publicPaths.includes(cleanPath)) {
            setIsAuthorized(true);
            setChecked(true);
        } else if (!userId) {
            console.warn("🔒 No User ID found, redirecting to login.");
            setIsAuthorized(false);
            setChecked(false);
            router.replace('/login');
        } else {
            setIsAuthorized(true);
            setChecked(true);
        }
    }, [dispatch, router, pathname]);

    // Show loading spinner while loading or unauthorized (during redirection)
    if (!checked || !isAuthorized) {
        return <Loading />;
    }

    return children;
}
