'use client';
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter, usePathname } from 'next/navigation';

export default function BackButtonHandler() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let active = true;
        let handlerPromise = null;

        const setupBackButton = async () => {
            try {
                // Ensure we are running under Capacitor in a browser environment
                if (typeof window !== 'undefined' && window.Capacitor) {
                    console.log("📱 BackButtonHandler: Registering backButton listener");
                    handlerPromise = App.addListener('backButton', ({ canGoBack }) => {
                        if (!active) return;

                        console.log(`📱 BackButton pressed. Path: ${pathname}, canGoBack: ${canGoBack}`);
                        
                        const exitPaths = ['/', '/login', '/mainRestorentList'];
                        if (exitPaths.includes(pathname) || !canGoBack) {
                            console.log("📱 Exiting application");
                            App.exitApp();
                        } else {
                            console.log("📱 Navigating back in history");
                            window.history.back();
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to setup back button handler:", error);
            }
        };

        setupBackButton();

        return () => {
            active = false;
            if (handlerPromise) {
                handlerPromise.then(h => {
                    if (h) {
                        h.remove();
                        console.log("📱 BackButtonHandler: Removed backButton listener");
                    }
                }).catch(err => console.error("Error removing backButton listener:", err));
            }
        };
    }, [pathname]);

    return null;
}
