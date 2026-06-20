'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

/**
 * Privacy Policy Component
 * 
 * This component displays the official Privacy Policy for the application.
 * Updated: 31st May 2026
 * Compliant with modern data protection standards and Google Play Store requirements.
 */
export default function PrivacyPolicy() {
    const router = useRouter();

    // Premium Design Tokens
    const config = {
        colors: {
            primary: '#e63946', // Modern red for branding
            secondary: '#1d3557', // Deep blue for text
            accent: '#457b9d', // Muted blue for highlights
            background: '#F9FAFB', // Soft gray-white background
            cardBg: '#FFFFFF', // Pure white for cards/sections
            textHead: '#111827', // Strong gray for titles
            textMain: '#4B5563', // Soft gray for body text
            success: '#10B981', // Green for positive badges
            warning: '#F59E0B', // Amber for important notes
            border: '#E5E7EB', // Light gray for borders
        },
        fonts: {
            main: '"Inter", "Poppins", -apple-system, sans-serif'
        }
    };

    const handleBack = () => {
        // Fallback for direct links (e.g., from Google Play Store)
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    const styles = {
        container: {
            padding: '24px',
            backgroundColor: config.colors.background,
            minHeight: '100vh',
            fontFamily: config.fonts.main,
            color: config.colors.textMain,
            lineHeight: '1.7',
            paddingBottom: '60px',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
            gap: '16px',
            position: 'sticky',
            top: 'env(safe-area-inset-top, 0px)',
            backgroundColor: 'rgba(249, 250, 251, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '12px 0',
            zIndex: 100,
        },
        backButton: {
            border: 'none',
            background: config.colors.cardBg,
            borderRadius: '12px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        titleContainer: {
            display: 'flex',
            flexDirection: 'column',
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: '700',
            color: config.colors.textHead,
            margin: 0,
            letterSpacing: '-0.025em',
        },
        subtitle: {
            fontSize: '0.875rem',
            color: config.colors.accent,
            fontWeight: '500',
        },
        card: {
            backgroundColor: config.colors.cardBg,
            padding: '32px',
            borderRadius: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: `1px solid ${config.colors.border}`,
        },
        sectionHeading: {
            fontSize: '1.375rem',
            fontWeight: '600',
            marginBottom: '16px',
            color: config.colors.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        },
        text: {
            fontSize: '1rem',
            color: config.colors.textMain,
            marginBottom: '16px',
        },
        tableWrapper: {
            overflowX: 'auto',
            marginBottom: '24px',
            borderRadius: '16px',
            border: `1px solid ${config.colors.border}`,
        },
        table: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0',
            fontSize: '0.9rem',
        },
        th: {
            backgroundColor: '#F3F4F6',
            padding: '16px',
            textAlign: 'left',
            fontWeight: '600',
            color: config.colors.textHead,
            borderBottom: `2px solid ${config.colors.border}`,
        },
        td: {
            padding: '16px',
            borderBottom: `1px solid ${config.colors.border}`,
            verticalAlign: 'top',
        },
        highlightBox: {
            backgroundColor: '#FEF2F2',
            padding: '20px',
            borderRadius: '16px',
            borderLeft: `5px solid ${config.colors.primary}`,
            marginTop: '12px',
            fontSize: '0.9375rem',
            color: config.colors.secondary,
        },
        list: {
            paddingLeft: '24px',
            fontSize: '1rem',
            color: config.colors.textMain,
        },
        listItem: {
            marginBottom: '12px',
        },
        footer: {
            textAlign: 'center',
            marginTop: '60px',
            padding: '32px',
            borderTop: `1px solid ${config.colors.border}`,
        },
        commitment: {
            fontSize: '1.125rem',
            fontWeight: '600',
            color: config.colors.textHead,
            fontStyle: 'italic',
            display: 'block',
            maxWidth: '600px',
            margin: '0 auto 24px auto',
        }
    };

    return (
        <div style={styles.container}>
            {/* Navigation Header */}
            <header style={styles.header}>
                <button 
                    style={styles.backButton} 
                    onClick={handleBack}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <div style={styles.titleContainer}>
                    <h1 style={styles.title}>Privacy Policy</h1>
                    <span style={styles.subtitle}>Last Updated: 31st May 2026</span>
                </div>
            </header>

            {/* Introduction Card */}
            <section style={styles.card}>
                <p style={styles.text}>
                    Your privacy is our core priority. This Policy outlines how our food delivery application collects, processes, and safeguards your personal data. We are committed to transparency and ensuring that your experience is secure and compliant with modern data protection regulations.
                </p>
                <div style={{ ...styles.highlightBox, backgroundColor: '#F0FDF4', borderLeftColor: config.colors.success }}>
                    <strong>Our Quality Pledge:</strong> We do not sell, rent, or trade your personal information with third-party marketers or advertisers under any circumstances.
                </div>
            </section>

            {/* 1. Data Collection */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    1. Information We Collect
                </h2>
                <p style={styles.text}>To facilitate seamless food discovery and delivery, we collect the following categories of data:</p>
                
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Data Category</th>
                                <th style={styles.th}>Specific Data Points</th>
                                <th style={styles.th}>Business Need</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={styles.td}><strong>Identity Profile</strong></td>
                                <td style={styles.td}>Full Name, Email Address, Contact Number, Date of Birth.</td>
                                <td style={styles.td}>Account verification, profile personalization, and security validation.</td>
                            </tr>
                            <tr>
                                <td style={styles.td}><strong>Precise Location</strong></td>
                                <td style={styles.td}>GPS Latitude/Longitude, Delivery Address (Flat No, Street, Landmark).</td>
                                <td style={styles.td}>Verification of service area (Kurnool-only) and delivery distance computation.</td>
                            </tr>
                            <tr>
                                <td style={styles.td}><strong>Device Access</strong></td>
                                <td style={styles.td}>Microphone Permission.</td>
                                <td style={styles.td}>Enabling voice-assisted search features. Audio data is processed entirely locally on-device for speech-to-text conversion. Voice inputs are never recorded, stored, or transmitted to our servers or third parties.</td>
                            </tr>
                            <tr>
                                <td style={styles.td}><strong>Transaction Logs</strong></td>
                                <td style={styles.td}>Payment Status, Transaction IDs (via Payment Gateway).</td>
                                <td style={styles.td}>Processing orders and resolving payment disputes.</td>
                            </tr>
                            <tr>
                                <td style={styles.td}><strong>User Interaction</strong></td>
                                <td style={styles.td}>Reviews, Feedback, Coins Balance, App Preferences.</td>
                                <td style={styles.td}>Enhancing application quality and managing loyalty rewards.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style={styles.highlightBox}>
                    <strong>Child Safety and Family Protection Policy</strong><br/>
                    This application does not intentionally collect or target services at children under the age of 13. Your Date of Birth is used exclusively for account security validation, personalization, and birthday loyalty benefits, and is never shared with third parties.
                </div>
            </section>

            {/* 2. Usage Policy */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    2. How We Utilize Your Information
                </h2>
                <p style={styles.text}>Your data is processed based on the necessity to perform our service contract with you:</p>
                <ul style={styles.list}>
                    <li style={styles.listItem}><strong>Authentication:</strong> Using secure SMS-based OTP verification for account security and password recovery.</li>
                    <li style={styles.listItem}><strong>Operational Logic:</strong> Validating your real-time location against our Kurnool service boundary to ensure order feasibility.</li>
                    <li style={styles.listItem}><strong>Dynamic Pricing:</strong> Calculating precise delivery fees based on road-distance between your location and the selected restaurant.</li>
                    <li style={styles.listItem}><strong>Payment Integrity:</strong> Using specialized verification secrets to authenticate secure digital payments.</li>
                    <li style={styles.listItem}><strong>Persistence:</strong> Storing temporary session data securely in device local storage to maintain your login state for up to 30 days.</li>
                    <li style={styles.listItem}><strong>Voice Search:</strong> Processing voice search inputs entirely locally on-device. Audio signals are converted to text locally, are never recorded or stored, and are never transmitted to our servers or third parties.</li>
                </ul>
            </section>

            {/* 3. Security Framework */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    3. Security & Cloud Management
                </h2>
                <ul style={styles.list}>
                    <li style={styles.listItem}><strong>Encrypted Storage:</strong> All user profiles and order histories are stored in dedicated cloud databases with disk-level encryption.</li>
                    <li style={styles.listItem}><strong>Transport Security:</strong> All data transmitted between your mobile device and our servers is secured using TLS (HTTPS) via SSL certificates.</li>
                    <li style={styles.listItem}><strong>Credential Hashing:</strong> Passwords and sensitive identifiers are hashed using strong cryptographic protocols (SHA-256) to prevent unauthorized access.</li>
                    <li style={styles.listItem}><strong>Isolated Payments:</strong> Financial data (card numbers, CVV) are handled entirely by our secure Payment Gateway provider and never cross our servers.</li>
                </ul>
                <div style={{ ...styles.highlightBox, borderLeftColor: '#2b9348', backgroundColor: '#f0fff4' }}>
                    <strong>Data Protection Note:</strong> In compliance with Play Store requirements, we ensure that all personal and sensitive user data is handled with the highest level of encryption-at-rest and in-transit.
                </div>
            </section>

            {/* 4. Third-Party Integrations */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    4. Trusted Service Providers
                </h2>
                <p style={styles.text}>We collaborate with industry-standard third-party infrastructure providers to ensure app safety, security, and operational reliability:</p>
                <ul style={styles.list}>
                    <li style={styles.listItem}><strong>Authentication & Security Services:</strong> To facilitate secure SMS delivery, account registration, and OTP verification.</li>
                    <li style={styles.listItem}><strong>Payment Processing Gateways:</strong> To process digital payments securely without storing sensitive financial data on our servers.</li>
                    <li style={styles.listItem}><strong>Geospatial & Mapping Services:</strong> To verify service availability boundaries and calculate delivery routes.</li>
                    <li style={styles.listItem}><strong>Cloud Infrastructure & Database Providers:</strong> To host the application database and user profile data securely with standard data encryption.</li>
                </ul>
            </section>

            {/* 5. Data Retention & User Rights */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    5. Data Retention & User Rights
                </h2>
                <p style={styles.text}><strong>Data Retention Policy:</strong> We retain your personal data (Name, Email, Phone, Date of Birth) only for as long as your account remains active. Upon requesting account deletion, this data is permanently erased from our production databases immediately. Transaction logs and order history are retained securely for a maximum period of 90 days after delivery for accounting, audit compliance, and dispute resolution purposes, after which they are automatically anonymized.</p>
                <p style={styles.text}><strong>Policy Updates:</strong> We may update this Privacy Policy periodically to reflect changes in our practices or regulatory standards. We will notify you of any material changes by updating the policy on this page, and sending an in-app alert or email notification.</p>
                <p style={styles.text}>You maintain full control over your personal data at all times:</p>
                <ul style={styles.list}>
                    <li style={styles.listItem}><strong>Right to Correction:</strong> Edit your phone, name, and addresses directly via your Profile.</li>
                    <li style={styles.listItem}><strong>Microphone Control:</strong> You can enable or disable voice search permissions any time via device settings.</li>
                    <li style={styles.listItem}><strong>Data Portability:</strong> You may request a summary of the data we maintain regarding your account.</li>
                    <li style={styles.listItem}><strong>Right to Deletion:</strong> You can request immediate account termination and data erasure via the &quot;Profile&quot; or &quot;Contact Us&quot; sections.</li>
                </ul>
            </section>

            {/* 6. Legal Contact Section */}
            <section style={styles.card}>
                <h2 style={styles.sectionHeading}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    6. Privacy Contact Information
                </h2>
                <p style={styles.text}>
                    For any privacy-related inquiries, data access requests, or to exercise your legal rights, please contact our dedicated privacy team:
                </p>
                <p style={{ ...styles.text, backgroundColor: '#F9FAFB', padding: '15px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                    <strong>Email:</strong> <a href="mailto:support@leevondelivery.in" style={{ color: config.colors.primary, textDecoration: 'none' }}>support@leevondelivery.in</a>
                    <br />
                    <strong>Address:</strong> Kurnool City, Andhra Pradesh, India.
                </p>
            </section>

            {/* Footer Section */}
            <footer style={styles.footer}>
                <p style={styles.commitment}>&quot;Our core commitment: Your data is never a product. We utilize the minimum information necessary to provide the maximum service quality.&quot;</p>
                <div style={{ fontSize: '0.9rem', color: '#9CA3AF', marginTop: '24px' }}>
                    <p>&copy; {new Date().getFullYear()} Food Delivery Application. Kurnool, Andhra Pradesh.</p>
                    <p style={{ marginTop: '8px', fontSize: '0.8rem' }}>Operation Area: Kurnool Municipal Corporation</p>
                </div>
            </footer>
        </div>
    );
}
