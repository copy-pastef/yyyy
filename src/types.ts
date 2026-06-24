/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'user' | 'admin';
  walletBalance: number; // in BDT
  totalInvested: number; // in BDT
  totalWithdrawn: number; // in BDT
  totalEarned: number; // in BDT
  referralCode: string; // unique code for referrals
  referredBy?: string; // UID of referrer user
  referralCommissionEarned: number; // total commission earned
  status: 'active' | 'suspended';
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt: number;
}

export interface InvestmentPlan {
  id: string; // plan code (e.g. plan_a, plan_b)
  name: string;
  cost: number; // in BDT
  dailyBonus: number; // in BDT
  durationDays: number; // how many days it lives
  active: boolean; // whether users can buy it
  createdAt: number;
  dailyTasks?: number; // count of daily tasks
}

export interface UserInvestment {
  id: string;
  uid: string;
  userEmail: string;
  planId: string;
  planName: string;
  cost: number;
  dailyBonus: number;
  purchasedAt: number;
  expiresAt: number;
  lastBonusClaimedAt: number; // timestamp of last automatic check / tick
  daysClaimed: number; // how many days of bonus have been credited
  status: 'active' | 'expired';
  durationDays?: number;
  dailyTasks?: number; // count of daily tasks
}

export interface DepositRequest {
  id: string;
  uid: string;
  userEmail: string;
  phone: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket';
  amount: number;
  transactionId: string;
  proofScreenshot?: string; // base64 string or mock image url
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  processedAt?: number;
}

export interface WithdrawRequest {
  id: string;
  uid: string;
  userEmail: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket';
  amount: number;
  targetNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: number;
  processedAt?: number;
}

export interface TransactionLog {
  id: string;
  uid: string;
  userEmail: string;
  amount: number;
  type: 'deposit' | 'withdraw' | 'investment' | 'bonus' | 'referral' | 'admin_adjust';
  details: string;
  createdAt: number;
}

export interface ReferralHistoryRecord {
  id: string;
  referrerUid: string;
  refereeUid: string;
  refereeEmail: string;
  amountInvested: number;
  commissionCredited: number;
  createdAt: number;
}

export interface Notification {
  id: string;
  uid: string; // 'all' for global notifications
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  uid: string;
  userEmail: string;
  subject: string;
  message: string; // initial message
  status: 'open' | 'answered' | 'closed';
  createdAt: number;
  lastActivityAt: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderUid: string;
  senderRole: 'user' | 'admin';
  senderEmail: string;
  message: string;
  createdAt: number;
}

export interface AdTask {
  id: string;
  title: string;
  adLink: string;
  duration: number; // seconds
  reward: number; // BDT
}

export interface SystemSettings {
  id: string; // e.g. "config"
  platformName: string;
  defaultCurrency: string;
  referralType: 'percentage' | 'fixed';
  referralValue: number; // e.g. 20 (percent) or 200 (fixed amount)
  notices: string; // scrolling notice marquee
  bannerUrl: string;
  bannerTitle: string;
  bannerMessage: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  contactEmail: string;
  adTasks?: AdTask[];
}
