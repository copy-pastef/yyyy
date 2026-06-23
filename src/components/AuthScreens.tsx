/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Shield, Sparkles, Phone, Mail, User, Lock, Key, ArrowRight, UserPlus, LogIn, Repeat, Chrome } from 'lucide-react';

interface AuthScreensProps {
  onAuthSuccess: (userProfile: UserProfile) => void;
  primaryColor: string;
  theme: 'dark' | 'light';
}

export default function AuthScreens({ onAuthSuccess, primaryColor, theme }: AuthScreensProps) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Registration States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [refCode, setRefCode] = useState('');

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Read referrer code from URL parameter or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || localStorage.getItem('smart_deposit_ref_code') || '';
    if (ref) {
      setRefCode(ref);
      localStorage.setItem('smart_deposit_ref_code', ref);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify if referrer code actually exists
      let referredByUid = '';
      if (refCode.trim()) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', refCode.trim()));
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          referredByUid = querySnap.docs[0].id;
        } else {
          setError('Invalid Referral Code. You can leave it blank if you do not have one.');
          setLoading(false);
          return;
        }
      }

      // 2. Create in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Generate a unique 6-character referral code
      const generatedRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create profile document
      const newProfile: UserProfile = {
        uid,
        email,
        fullName,
        phone,
        role: email.toLowerCase() === 'admin@smartdeposit.com' ? 'admin' : 'user', // first hardcoded or demo admin list
        walletBalance: 0,
        totalInvested: 0,
        totalWithdrawn: 0,
        totalEarned: 0,
        referralCode: generatedRefCode,
        ...(referredByUid ? { referredBy: referredByUid } : {}),
        referralCommissionEarned: 0,
        status: 'active',
        isPhoneVerified: false,
        isEmailVerified: false,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', uid), newProfile);

      // Create initial Welcome Notification
      await setDoc(doc(db, 'notifications', `${uid}_welcome`), {
        id: `${uid}_welcome`,
        uid,
        title: 'Welcome to Smart Deposit Platform!',
        message: `Hello ${fullName}, your account was successfully created! Verify your phone and email to maximize security and participate in support.`,
        read: false,
        createdAt: Date.now()
      });

      // Clear states
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setSuccessMsg('Registration successful! Logging you in...');
      
      onAuthSuccess(newProfile);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setError('⚠️ Email/Password are disabled in Firebase Console! আপনার Firebase প্রজেক্টে Email/Password সাইন-ইন সচল করুন:\n\n1. Firebase Console-এ যান।\n2. Build -> Authentication -> Sign-in method-এ ক্লিক করুন।\n3. "Add new provider"-এ ক্লিক করে "Email/Password" নির্বাচন করে সচল (Enable) করে Save করুন।');
      } else {
        setError(err.message || 'Error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;

      // Check if profile document already exists
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        if (profile.status === 'suspended') {
          setError('This account has been suspended by the administrator.');
          await auth.signOut();
        } else {
          setSuccessMsg('Logged in successfully!');
          onAuthSuccess(profile);
        }
      } else {
        // Create new user profile document
        const generatedRefCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Check if there was a referrer
        let referredByUid = '';
        if (refCode.trim()) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('referralCode', '==', refCode.trim()));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            referredByUid = querySnap.docs[0].id;
          }
        }

        const newProfile: UserProfile = {
          uid,
          email: user.email || '',
          fullName: user.displayName || user.email?.split('@')[0] || 'Google User',
          phone: '', // Can be completed on the Profile settings later
          role: (user.email && (user.email.toLowerCase() === 'admin@smartdeposit.com' || user.email.toLowerCase() === 'boybeby888@gmail.com')) ? 'admin' : 'user',
          walletBalance: 0,
          totalInvested: 0,
          totalWithdrawn: 0,
          totalEarned: 0,
          referralCode: generatedRefCode,
          ...(referredByUid ? { referredBy: referredByUid } : {}),
          referralCommissionEarned: 0,
          status: 'active',
          isPhoneVerified: false,
          isEmailVerified: !!user.emailVerified,
          createdAt: Date.now()
        };

        await setDoc(doc(db, 'users', uid), newProfile);

        // Create initial Welcome Notification
        await setDoc(doc(db, 'notifications', `${uid}_welcome`), {
          id: `${uid}_welcome`,
          uid,
          title: 'Welcome to Smart Deposit Platform!',
          message: `Hello ${newProfile.fullName}, your account was successfully created via Google login! Go to the profile tab to configure/verify your mobile phone.`,
          read: false,
          createdAt: Date.now()
        });

        setSuccessMsg('Google registration successful!');
        onAuthSuccess(newProfile);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('auth/operation-not-allowed')) {
        setError('Google Sign-In is not fully authorized yet on Firebase. Please follow the instructions to enable Google provider in Firebase console, or use Email/Password.');
      } else {
        setError(err.message || 'Error occurred during Google sign-in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!loginEmail || !loginPassword) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const uid = userCredential.user.uid;

      // Retrieve Profile
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        if (profile.status === 'suspended') {
          setError('This account has been suspended by the administrator.');
          await auth.signOut();
        } else {
          setSuccessMsg('Logged in successfully!');
          onAuthSuccess(profile);
        }
      } else {
        // Fallback or Admin manual patch
        const fallbackProfile: UserProfile = {
          uid,
          email: loginEmail,
          fullName: loginEmail.split('@')[0],
          phone: '',
          role: loginEmail.toLowerCase() === 'admin@smartdeposit.com' ? 'admin' : 'user',
          walletBalance: 0,
          totalInvested: 0,
          totalWithdrawn: 0,
          totalEarned: 0,
          referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          status: 'active',
          isPhoneVerified: false,
          isEmailVerified: false,
          referralCommissionEarned: 0,
          createdAt: Date.now()
        };
        await setDoc(doc(db, 'users', uid), fallbackProfile);
        onAuthSuccess(fallbackProfile);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setError('⚠️ Email/Password are disabled in Firebase Console! আপনার Firebase প্রজেক্টে Email/Password সাইন-ইন সচল করুন:\n\n1. Firebase Console-এ যান।\n2. Build -> Authentication -> Sign-in method-এ ক্লিক করুন।\n3. "Add new provider"-এ ক্লিক করে "Email/Password" নির্বাচন করে সচল (Enable) করে Save করুন।');
      } else {
        setError('Invalid login credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setSuccessMsg('Password reset instructions sent to your email.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error sending password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Platform Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 ring-1 ring-emerald-500/20 shadow-lg">
          <Shield id="logo-icon animate-pulse" className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          Smart Deposit
        </h2>
        <p className="mt-2 text-sm text-emerald-500 font-medium">
          Premium Investment & Referral Ecosystem
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`py-8 px-4 shadow-xl rounded-3xl sm:px-10 border transition-all duration-300 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-700/50 pb-4 mb-6 justify-around">
            <button 
              id="btn-tab-login"
              onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
              className={`flex items-center gap-1.5 pb-2 text-sm font-semibold transition-all border-b-2 ${
                tab === 'login' 
                  ? 'border-emerald-500 text-emerald-500' 
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button 
              id="btn-tab-register"
              onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
              className={`flex items-center gap-1.5 pb-2 text-sm font-semibold transition-all border-b-2 ${
                tab === 'register' 
                  ? 'border-emerald-500 text-emerald-500' 
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Create Account
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div id="error-alert" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div id="success-alert" className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          {/* 1. LOGIN VIEW */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Mail className="w-4 h-4" /></span>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="name@domain.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">Password</label>
                  <button 
                    id="btn-forgot-pw-toggle"
                    type="button" 
                    onClick={() => setTab('forgot')}
                    className="text-xs text-emerald-500 hover:underline hover:text-emerald-400"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Lock className="w-4 h-4" /></span>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tip: Use <strong className="text-emerald-500">admin@smartdeposit.com</strong> to try the Admin experience.
                </p>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* 2. REGISTRATION VIEW */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><User className="w-4 h-4" /></span>
                  <input
                    id="reg-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Mail className="w-4 h-4" /></span>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="johndoe@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Mobile Phone (e.g. bKash/Nagad number)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Phone className="w-4 h-4" /></span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="017XXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Lock className="w-4 h-4" /></span>
                    <input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Confirm</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Lock className="w-4 h-4" /></span>
                    <input
                      id="reg-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Referral Code (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><UserPlus className="w-4 h-4" /></span>
                  <input
                    id="reg-refferal-code"
                    type="text"
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="PROMOCODE"
                  />
                </div>
                {refCode && (
                  <p className="mt-1 text-[11px] text-emerald-400">
                    ✓ Code applied! Referrer will earn commissions after your first deposit.
                  </p>
                )}
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-4 flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD VIEW */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-300">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">Provide your registered email and we'll send a password recovery link shortly.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Registered Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-500"><Mail className="w-4 h-4" /></span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-800 text-white border-zinc-700/80 focus:bg-zinc-800' : 'bg-slate-50 text-slate-950 border-slate-200 focus:bg-white'
                    }`}
                    placeholder="your-email@gmail.com"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="btn-forgot-back"
                  type="button"
                  onClick={() => setTab('login')}
                  className={`w-1/2 flex justify-center py-2 px-4 border rounded-xl text-xs font-semibold hover:border-slate-400 transition-all ${
                    isDark ? 'border-zinc-700 text-slate-300 hover:text-white' : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Back to Sign In
                </button>
                <button
                  id="btn-forgot-submit"
                  type="submit"
                  disabled={loading}
                  className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          )}

          {tab !== 'forgot' && (
            <div className="mt-6 border-t border-zinc-700/50 pt-5">
              <div className="relative flex justify-center text-[10px] uppercase mb-4 tracking-wider">
                <span className={`px-2 font-bold ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-slate-400'}`}>Or continue with</span>
              </div>
              
              <button
                id="btn-google-signin"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 border rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  isDark 
                    ? 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                } disabled:opacity-50`}
              >
                <Chrome className="w-4 h-4 text-emerald-500 animate-pulse" />
                {loading ? 'Processing...' : 'Continue with Google'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
