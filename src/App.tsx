/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { seedInitialData } from './lib/firebaseSeeder';
import { UserProfile, SystemSettings } from './types';
import AuthScreens from './components/AuthScreens';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { Shield, Sparkles, Sliders, User, RefreshCw, Key, ChevronRight } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Toggle for Admins to view either User Panel or Admin Panel
  const [isAdminView, setIsAdminView] = useState(false);

  // 1. Initial Seeding and Settings subscribe loading
  useEffect(() => {
    let unsubSettings: (() => void) | null = null;
    let active = true;

    const defaultFallbackSettings: SystemSettings = {
      id: "config",
      platformName: "Earn Cash - Smart Deposit",
      defaultCurrency: "BDT",
      referralType: "percentage",
      referralValue: 20,
      notices: "🚨 ATTENTION: Please ensure correct Transaction ID and Screenshot form proof matches before submitting Deposit Requests. Refer colleagues to claim an extraordinary 20% on all successful deposits!",
      bannerUrl: "",
      bannerTitle: "Secure Investment Engine",
      bannerMessage: "Invest in premium Plan A, Plan B, or Custom Plans configured by active management to accrue daily bonuses automatically. Payouts are approved in hours to bKash, Nagad, and Rocket.",
      bkashNumber: "01789123456 (Personal)",
      nagadNumber: "01989123456 (Personal)",
      rocketNumber: "01589123456 (Personal)",
      contactEmail: "support@smartdeposit.org"
    };

    const initializeAppPlatform = async () => {
      try {
        await seedInitialData();
        
        if (!active) return;

        // Listen to settings document
        unsubSettings = onSnapshot(doc(db, 'system_settings', 'config'), (snap) => {
          if (active) {
            if (snap.exists()) {
              setSettings(snap.data() as SystemSettings);
            } else {
              setSettings(defaultFallbackSettings);
            }
          }
        }, (err) => {
          console.error("Settings subscription error, using fallback settings:", err);
          if (active) {
            setSettings(defaultFallbackSettings);
          }
        });

      } catch (err) {
        console.error("Initiation error state, using fallback settings:", err);
        if (active) {
          setSettings(defaultFallbackSettings);
        }
      }
    };

    initializeAppPlatform();

    return () => {
      active = false;
      if (unsubSettings) {
        unsubSettings();
      }
    };
  }, []);

  // 2. Auth State listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        
        // Listen to User Profile real-time
        unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), async (snap) => {
          if (snap.exists()) {
            const pData = snap.data() as UserProfile;
            setProfile(pData);
            
            // Default to Admin Panel view if the logged-in user is admin
            if (pData.role === 'admin') {
              setIsAdminView(true);
            }
            setLoading(false);
          } else {
            // Check if user has been permanently deleted
            try {
              const deletedSnap = await getDoc(doc(db, 'deleted_users', currentUser.uid));
              if (deletedSnap.exists()) {
                setProfile(null);
                setUser(null);
                setIsAdminView(false);
                await signOut(auth);
                alert("Your account has been permanently deleted or deactivated by the administrator.");
              }
            } catch (err) {
              console.error("Error checking deleted user status:", err);
            }
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile listen error:", err);
          setLoading(false);
        });

      } else {
        setUser(null);
        setProfile(null);
        setIsAdminView(false);
        if (unsubProfile) {
          unsubProfile();
        }
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Hydrating Smart Deposit Vault...</p>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={theme}>
      
      {/* 1. UNAUTHENTICATED SCREENS */}
      {!user && (
        <AuthScreens 
          onAuthSuccess={(p) => setProfile(p)}
          primaryColor="emerald"
          theme={theme}
        />
      )}

      {/* 2. AUTHENTICATED PORTALS */}
      {user && profile && (
        <div className={`min-h-screen flex flex-col overflow-x-hidden ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
          
          {/* MULTI-ROLE SWITCHBAR: Shown ONLY if user is verified of having 'admin' role! */}
          {profile.role === 'admin' && (
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-2.5 flex justify-between items-center z-50 text-xs shrink-0 flex-wrap gap-2 text-white">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="font-extrabold tracking-wider text-[11px] uppercase text-zinc-300">ADMIN CONTROL DETECTED:</span>
                <span className="text-slate-400 font-medium">You hold master platform authorization.</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase font-black">View Dashboard Mode</span>
                <button 
                  id="btn-admin-view-toggle"
                  onClick={() => setIsAdminView(!isAdminView)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wide transition-all ${
                    isAdminView 
                      ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-md' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
                  }`}
                >
                  {isAdminView ? 'Switch to user view' : 'Switch to admin view'}
                </button>
              </div>
            </div>
          )}

          {/* CHOOSE WINDOW TO LOAD: ADMIN PANEL OR USER DASHBOARD */}
          {isAdminView && profile.role === 'admin' ? (
            <AdminPanel 
              adminProfile={profile}
              systemSettings={settings}
              theme={theme}
              setTheme={setTheme}
              onLogout={handleLogout}
            />
          ) : (
            <UserDashboard 
              userProfile={profile}
              systemSettings={settings}
              theme={theme}
              setTheme={setTheme}
              onLogout={handleLogout}
            />
          )}

        </div>
      )}

      {/* 3. PROFILE MISSING RECOVERY VIEW (Avoids White Screen) */}
      {user && !profile && (
        <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-950 text-white p-6 text-center">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100 mb-2">প্রোফাইল লোড হচ্ছে / প্রিপেয়ার করা হচ্ছে</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              আপনার অ্যাকাউন্ট প্রোফাইল তৈরি বা কনফিগার হচ্ছে অথবা আগের কোনো রেজিস্ট্রেশন অসম্পূর্ণ ছিল। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, অথবা সাইন আউট করে পুনরায় চেষ্টা করুন।
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-center items-center gap-2 text-xs text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>প্রোফাইল স্ট্যাটাস চেক করা হচ্ছে...</span>
              </div>
              <button
                id="btn-recovery-logout"
                onClick={handleLogout}
                className="mt-4 w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-all border border-zinc-700"
              >
                Log Out / লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
