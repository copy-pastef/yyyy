/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  UserProfile, 
  InvestmentPlan, 
  DepositRequest, 
  WithdrawRequest, 
  TransactionLog, 
  ReferralHistoryRecord, 
  SupportTicket, 
  TicketMessage, 
  SystemSettings,
  AdTask
} from '../types';
import { 
  BarChart, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings, 
  FileText, 
  ShieldAlert, 
  Layers, 
  Check, 
  X, 
  UserX, 
  UserCheck, 
  Plus, 
  Search, 
  Sliders, 
  MessageSquare, 
  CreditCard, 
  Bell, 
  Edit, 
  Trash2, 
  VolumeX, 
  Volume2, 
  HelpCircle,
  TrendingUp,
  DollarSign,
  Tv,
  LogOut
} from 'lucide-react';

interface AdminPanelProps {
  adminProfile: UserProfile;
  systemSettings: SystemSettings;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onLogout: () => void;
}

export default function AdminPanel({ 
  adminProfile, 
  systemSettings, 
  theme, 
  setTheme,
  onLogout 
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'deposits' | 'withdraws' | 'plans' | 'tickets' | 'transactions' | 'settings'>('analytics');
  
  // Database states
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [txLogs, setTxLogs] = useState<TransactionLog[]>([]);
  
  // Real-time Settings fetch
  const [settings, setSettings] = useState<SystemSettings>(systemSettings);

  // Search, filter & modals states
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Plan creation forms
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCost, setNewPlanCost] = useState('');
  const [newPlanBonus, setNewPlanBonus] = useState('');
  const [newPlanDays, setNewPlanDays] = useState('30');
  const [newPlanActive, setNewPlanActive] = useState(true);
  const [newPlanTasks, setNewPlanTasks] = useState('');

  // Plan tasks creation state (5 customizable tasks)
  const [createPlanTasks, setCreatePlanTasks] = useState<Array<{ title: string; adLink: string; reward: string }>>([
    { title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', reward: '2' },
    { title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', reward: '2' },
    { title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', reward: '2' },
    { title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', reward: '2' },
    { title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', reward: '2' }
  ]);

  // Edit tasks for an existing plan
  const [editPlanTasksSelected, setEditPlanTasksSelected] = useState<any | null>(null);
  const [editPlanTasks, setEditPlanTasks] = useState<Array<{ title: string; adLink: string; reward: string }>>([
    { title: '', adLink: '', reward: '' },
    { title: '', adLink: '', reward: '' },
    { title: '', adLink: '', reward: '' },
    { title: '', adLink: '', reward: '' },
    { title: '', adLink: '', reward: '' }
  ]);

  // Settings editing states
  const [editPlatformName, setEditPlatformName] = useState(settings.platformName);
  const [editBkash, setEditBkash] = useState(settings.bkashNumber);
  const [editNagad, setEditNagad] = useState(settings.nagadNumber);
  const [editRocket, setEditRocket] = useState(settings.rocketNumber);
  const [editNotices, setEditNotices] = useState(settings.notices);
  const [editBannerTitle, setEditBannerTitle] = useState(settings.bannerTitle);
  const [editBannerMsg, setEditBannerMsg] = useState(settings.bannerMessage);
  const [editRefType, setEditRefType] = useState(settings.referralType);
  const [editRefVal, setEditRefVal] = useState(settings.referralValue.toString());

  // Ad task manager form states
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [newAdDuration, setNewAdDuration] = useState('10');
  const [newAdReward, setNewAdReward] = useState('10');

  // REUSABLE STATEFUL SYSTEM CONFIRM DIALOG OVERLAY (Instead of browser blocked window.confirm/prompt)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    requireReason: boolean;
    reasonPlaceholder?: string;
    reasonValue: string;
    confirmText: string;
    cancelText: string;
    onConfirm: (reason?: string) => void | Promise<void>;
  }>({
    show: false,
    title: '',
    message: '',
    requireReason: false,
    reasonPlaceholder: '',
    reasonValue: '',
    confirmText: 'YES, CONFIRM',
    cancelText: 'CANCEL',
    onConfirm: () => {}
  });

  // REUSABLE STATEFUL SYSTEM FEEDBACK NOTIFIER OVERLAY (Instead of browser blocked alert)
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'info' | 'error';
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAdminConfirm = (
    title: string,
    message: string,
    onConfirm: (reason?: string) => void | Promise<void>,
    requireReason = false,
    reasonPlaceholder = "Reason for client standard record..."
  ) => {
    setConfirmModal({
      show: true,
      title,
      message,
      requireReason,
      reasonPlaceholder,
      reasonValue: '',
      confirmText: requireReason ? 'SUBMIT & PROCESS' : 'YES, CONFIRM',
      cancelText: 'CANCEL',
      onConfirm
    });
  };

  const showAdminAlert = (title: string, message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setAlertModal({
      show: true,
      title,
      message,
      type
    });
  };

  // Ticket active state
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Dynamic analytic calculations
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalInvested: 0,
    pendingDeposits: 0,
    pendingWithdraws: 0,
    pendingTickets: 0
  });

  // Load everything in Real-time subscriptions
  useEffect(() => {
    // Current System Settings
    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'config'), (snap) => {
      if (snap.exists()) {
        const val = snap.data() as SystemSettings;
        setSettings(val);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_settings/config');
    });

    // Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const userList: UserProfile[] = [];
      snap.forEach((d) => userList.push({ ...d.data() } as UserProfile));
      setAllUsers(userList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Deposits
    const unsubDep = onSnapshot(collection(db, 'deposit_requests'), (snap) => {
      const depList: DepositRequest[] = [];
      snap.forEach((d) => depList.push({ ...d.data(), id: d.id } as DepositRequest));
      setDeposits(depList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deposit_requests');
    });

    // Withdraws
    const unsubWith = onSnapshot(collection(db, 'withdraw_requests'), (snap) => {
      const withList: WithdrawRequest[] = [];
      snap.forEach((d) => withList.push({ ...d.data(), id: d.id } as WithdrawRequest));
      setWithdraws(withList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdraw_requests');
    });

    // Investment Plans
    const unsubPlans = onSnapshot(collection(db, 'investment_plans'), (snap) => {
      const planList: InvestmentPlan[] = [];
      snap.forEach((d) => planList.push({ ...d.data(), id: d.id } as InvestmentPlan));
      setPlans(planList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'investment_plans');
    });

    // Support Tickets
    const unsubTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      const ticList: SupportTicket[] = [];
      snap.forEach((d) => ticList.push({ ...d.data(), id: d.id } as SupportTicket));
      setTickets(ticList.sort((a,b) => b.lastActivityAt - a.lastActivityAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    });

    // Transaction logs
    const unsubTx = onSnapshot(collection(db, 'transaction_logs'), (snap) => {
      const logs: TransactionLog[] = [];
      snap.forEach((d) => logs.push({ ...d.data(), id: d.id } as TransactionLog));
      setTxLogs(logs.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transaction_logs');
    });

    return () => {
      unsubSettings();
      unsubUsers();
      unsubDep();
      unsubWith();
      unsubPlans();
      unsubTickets();
      unsubTx();
    };
  }, []);

  // Sync child comments for the active ticket
  useEffect(() => {
    if (!activeTicket) return;
    const unsubTicketMessages = onSnapshot(
      query(collection(db, `support_tickets/${activeTicket.id}/messages`)), 
      (snap) => {
        const list: TicketMessage[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as TicketMessage));
        setTicketMessages(list.sort((a,b) => a.createdAt - b.createdAt));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `support_tickets/${activeTicket.id}/messages`);
      }
    );
    return unsubTicketMessages;
  }, [activeTicket]);

  // Aggregate stats dynamically
  useEffect(() => {
    const totalUsers = allUsers.length;
    
    // Sum only approved deposits
    const approvedDeposits = deposits.filter(d => d.status === 'approved');
    const totalDeposited = approvedDeposits.reduce((acc, curr) => acc + curr.amount, 0);

    // Sum approved withdraws
    const approvedWiths = withdraws.filter(w => w.status === 'approved');
    const totalWithdrawn = approvedWiths.reduce((acc, curr) => acc + curr.amount, 0);

    // Dynamic stats
    const totalInvested = allUsers.reduce((acc, curr) => acc + (curr.totalInvested || 0), 0);
    const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
    const pendingWithdraws = withdraws.filter(w => w.status === 'pending').length;
    const pendingTickets = tickets.filter(t => t.status !== 'closed').length;

    setStats({
      totalUsers,
      totalDeposited,
      totalWithdrawn,
      totalInvested,
      pendingDeposits,
      pendingWithdraws,
      pendingTickets
    });
  }, [allUsers, deposits, withdraws, tickets]);

  // 1. APPROVE DEPOSIT ACTION (Includes critical logic for Referral commission attribution!)
  const handleApproveDeposit = (dep: DepositRequest) => {
    showAdminConfirm(
      "CONFIRM DEPOSIT APPROVAL",
      `Are you sure you want to APPROVE deposit of ৳${dep.amount} BDT for ${dep.userEmail}? This will instantly credit their balance and activate first-time referral rewards if eligible.`,
      async () => {
        try {
          // a. Get target user's current record
          const userRef = doc(db, 'users', dep.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            showAdminAlert("Target User Missing", "Target user profile not located in database.", "error");
            return;
          }

          const userData = userSnap.data() as UserProfile;
          const isFirstDeposit = (userData.totalInvested || 0) === 0 && 
                                deposits.filter(d => d.uid === dep.uid && d.status === 'approved').length === 0;

          // b. Update User balance & status
          const updatedBalance = userData.walletBalance + dep.amount;
          await updateDoc(userRef, {
            walletBalance: updatedBalance
          });

          // c. Update Deposit status
          await updateDoc(doc(db, 'deposit_requests', dep.id), {
            status: 'approved',
            processedAt: Date.now()
          });

          // d. Create Deposit transaction log
          await addDoc(collection(db, 'transaction_logs'), {
            uid: dep.uid,
            userEmail: dep.userEmail,
            amount: dep.amount,
            type: 'deposit',
            details: `Deposit Approved: ৳${dep.amount} via ${dep.paymentMethod}. Transaction Reference ID: ${dep.transactionId}`,
            createdAt: Date.now()
          });

          // e. Notify User of successful deposit
          await addDoc(collection(db, 'notifications'), {
            uid: dep.uid,
            title: 'Deposit Approved! 🎉',
            message: `Your deposit request for ৳${dep.amount} BDT has been verified. ৳${dep.amount} credited to wallet!`,
            read: false,
            createdAt: Date.now()
          });

          // f. REFERRAL REWARDS DISTRIBUTION: Triggered ONLY on Referee's very FIRST successful deposit!
          if (isFirstDeposit && userData.referredBy) {
            const referrerUid = userData.referredBy;
            const referrerRef = doc(db, 'users', referrerUid);
            const referrerSnap = await getDoc(referrerRef);

            if (referrerSnap.exists()) {
              const referrerData = referrerSnap.data() as UserProfile;
              
              // Calculate reward value based on admin configs: Percentage or Fixed
              let commissionAmount = 0;
              if (settings.referralType === 'percentage') {
                commissionAmount = Math.floor((dep.amount * settings.referralValue) / 100);
              } else {
                commissionAmount = settings.referralValue;
              }

              if (commissionAmount > 0) {
                // Credit referrer's wallet
                await updateDoc(referrerRef, {
                  walletBalance: referrerData.walletBalance + commissionAmount,
                  referralCommissionEarned: (referrerData.referralCommissionEarned || 0) + commissionAmount,
                  totalEarned: (referrerData.totalEarned || 0) + commissionAmount
                });

                // Write Referral Reward History
                await addDoc(collection(db, 'referral_history'), {
                  referrerUid,
                  refereeUid: dep.uid,
                  refereeEmail: dep.userEmail,
                  amountInvested: dep.amount,
                  commissionCredited: commissionAmount,
                  createdAt: Date.now()
                });

                // Log Referrer transaction
                await addDoc(collection(db, 'transaction_logs'), {
                  uid: referrerUid,
                  userEmail: referrerData.email,
                  amount: commissionAmount,
                  type: 'referral',
                  details: `Referral affiliate reward credited (৳${commissionAmount}) for first deposit of ${dep.userEmail} (৳${dep.amount})`,
                  createdAt: Date.now()
                });

                // Notify Referrer
                await addDoc(collection(db, 'notifications'), {
                  uid: referrerUid,
                  title: 'Referral Reward Credited! 💸',
                  message: `Your referee ${userData.fullName} made their first deposit! You earned ৳${commissionAmount} in commission fees.`,
                  read: false,
                  createdAt: Date.now()
                });
              }
            }
          }

          showAdminAlert("DEPOSIT APPROVED", "Deposit successfully Approved! User balance synced, referral triggers executed.", "success");
        } catch (err: any) {
          showAdminAlert("ERROR", "Error approving deposit: " + err.message, "error");
        }
      }
    );
  };

  // 2. REJECT DEPOSIT ACTION
  const handleRejectDeposit = (dep: DepositRequest) => {
    showAdminConfirm(
      "REJECT DEPOSIT REQUEST",
      `Please provide the rejection reason below for refusion of ৳${dep.amount} BDT for ${dep.userEmail}:`,
      async (reason) => {
        const rejectionReason = reason || "Verification details mismatch.";
        try {
          await updateDoc(doc(db, 'deposit_requests', dep.id), {
            status: 'rejected',
            rejectionReason: rejectionReason,
            processedAt: Date.now()
          });

          await addDoc(collection(db, 'notifications'), {
            uid: dep.uid,
            title: 'Deposit Rejected ❌',
            message: `Your deposit of ৳${dep.amount} was rejected. Reason: ${rejectionReason}`,
            read: false,
            createdAt: Date.now()
          });

          showAdminAlert("REJECT SUCCESSFUL", "Deposit Request successfully Rejected with reason noted.", "success");
        } catch (err: any) {
          showAdminAlert("ERROR", "Error rejecting deposit: " + err.message, "error");
        }
      },
      true,
      "Mention why (e.g. invalid receipt, transaction ID not matching bank log)..."
    );
  };

  // 3. APPROVE WITHDRAW ACTION
  const handleApproveWithdraw = (wReq: WithdrawRequest) => {
    showAdminConfirm(
      "APPROVE PAYOUT",
      `Are you sure you want to approve manual payout of ৳${wReq.amount} BDT via ${wReq.paymentMethod} to target number ${wReq.targetNumber}?`,
      async () => {
        try {
          await updateDoc(doc(db, 'withdraw_requests', wReq.id), {
            status: 'approved',
            processedAt: Date.now()
          });

          // Add payout transaction log
          await addDoc(collection(db, 'transaction_logs'), {
            uid: wReq.uid,
            userEmail: wReq.userEmail,
            amount: wReq.amount,
            type: 'withdraw',
            details: `Cash Withdrawal Approved. Paid Out ৳${wReq.amount} BDT to ${wReq.targetNumber} via manual ${wReq.paymentMethod}`,
            createdAt: Date.now()
          });

          // Send notice
          await addDoc(collection(db, 'notifications'), {
            uid: wReq.uid,
            title: 'Withdrawal Completed! 💰',
            message: `Your withdrawal of ৳${wReq.amount} was successfully verified and paid to ${wReq.targetNumber}!`,
            read: false,
            createdAt: Date.now()
          });

          showAdminAlert("PAYOUT COMPLETED", "Withdrawal approved and marked complete.", "success");
        } catch (err: any) {
          showAdminAlert("ERROR", "Error approving withdraw: " + err.message, "error");
        }
      }
    );
  };

  // 4. REJECT WITHDRAW ACTION (Refunds user's balance instantly!)
  const handleRejectWithdraw = (wReq: WithdrawRequest) => {
    showAdminConfirm(
      "REJECT WITHDRAW REQUEST & REFUND",
      `Are you sure you want to reject withdrawal of ৳${wReq.amount} BDT for ${wReq.userEmail}? Specify the reason below to refund customer balance instantly:`,
      async (reason) => {
        const rejectionReason = reason || "Regulatory block, contact support.";
        try {
          // a. Get user current profile
          const userRef = doc(db, 'users', wReq.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            
            // Refund the balance immediately!
            await updateDoc(userRef, {
              walletBalance: userData.walletBalance + wReq.amount,
              totalWithdrawn: userData.totalWithdrawn - wReq.amount // roll back count
            });

            // b. Update Request status
            await updateDoc(doc(db, 'withdraw_requests', wReq.id), {
              status: 'rejected',
              rejectionReason: rejectionReason,
              processedAt: Date.now()
            });

            // c. Log Refund transaction
            await addDoc(collection(db, 'transaction_logs'), {
              uid: wReq.uid,
              userEmail: wReq.userEmail,
              amount: wReq.amount,
              type: 'deposit', // treat refund as deposit adjustment
              details: `Refunded: Withdrawal ৳${wReq.amount} rejected. Reason: ${rejectionReason}`,
              createdAt: Date.now()
            });

            // d. Notify client
            await addDoc(collection(db, 'notifications'), {
              uid: wReq.uid,
              title: 'Withdrawal Rejected (Refunded) ⚠️',
              message: `Your withdrawal of ৳${wReq.amount} was rejected and balance refunded. Reason: ${rejectionReason}`,
              read: false,
              createdAt: Date.now()
            });

            showAdminAlert("REFUND SUCCESSFUL", "Withdrawal Rejected. Customer funds have been fully restored.", "success");
          } else {
            showAdminAlert("Target User Missing", "Profile not located to execute refund safety.", "error");
          }
        } catch (err: any) {
          showAdminAlert("ERROR", "Error rejecting withdrawal refund: " + err.message, "error");
        }
      },
      true,
      "Describe why (e.g. incorrect account details details, limit reached)..."
    );
  };

  // 5. USER DETAILS MANUAL BALANCE ADD/DEDUCT
  const handleManualBalanceChange = (type: 'add' | 'deduct') => {
    if (!selectedUser) return;
    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) {
      showAdminAlert("INVALID AMOUNT", "Please provide a valid balance adjustment amount.", "error");
      return;
    }

    showAdminConfirm(
      "CONFIRM BALANCE ADJUSTMENT",
      `Are you sure you want to manually ${type.toUpperCase()} ৳${amount} BDT for ${selectedUser.fullName}? Reason: ${adjustReason || 'Not stated.'}`,
      async () => {
        try {
          const userRef = doc(db, 'users', selectedUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const currentData = userSnap.data() as UserProfile;
            let finalBalance = currentData.walletBalance;

            if (type === 'add') {
              finalBalance += amount;
            } else {
              finalBalance = Math.max(0, currentData.walletBalance - amount);
            }

            // Apply
            await updateDoc(userRef, {
              walletBalance: finalBalance
            });

            // Log manual change
            await addDoc(collection(db, 'transaction_logs'), {
              uid: selectedUser.uid,
              userEmail: selectedUser.email,
              amount,
              type: 'admin_adjust',
              details: `Manual Balance ${type === 'add' ? 'Added' : 'Deducted'} by Administrator. Reason: ${adjustReason || 'Service patch.'}`,
              createdAt: Date.now()
            });

            // Notify client
            await addDoc(collection(db, 'notifications'), {
              uid: selectedUser.uid,
              title: `Balance Adjusted by Admin 🛠️`,
              message: `Admin manually ${type === 'add' ? 'added' : 'deducted'} ৳${amount} BDT to your wallet. Reason: ${adjustReason || 'Adjustment audit.'}`,
              read: false,
              createdAt: Date.now()
            });

            // re-fetch or sync state
            setSelectedUser({ ...currentData, walletBalance: finalBalance });
            setAdjustAmount('');
            setAdjustReason('');
            showAdminAlert("ADJUSTMENT SUCCESSFUL", `Balance successfully ${type === 'add' ? 'credited' : 'deducted'}!`, "success");
          }
        } catch (err: any) {
          showAdminAlert("ERROR", "Adjustment failed: " + err.message, "error");
        }
      }
    );
  };

  // Toggle user suspension state
  const handleToggleSuspend = (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    showAdminConfirm(
      "CONFIRM ACCOUNT TOGGLE",
      `Are you sure you want to set account status of ${user.fullName} to: ${nextStatus.toUpperCase()}?`,
      async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            status: nextStatus
          });
          showAdminAlert("STATUS CHANGED", `User status changed to ${nextStatus}.`, "success");
          if (selectedUser?.uid === user.uid) {
            setSelectedUser({ ...selectedUser, status: nextStatus });
          }
        } catch (err: any) {
          showAdminAlert("ERROR", "Suspension toggle error: " + err.message, "error");
        }
      }
    );
  };

  // Toggle user admin role
  const handleToggleAdmin = (user: UserProfile) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    showAdminConfirm(
      "CONFIRM PERMISSION CHANGE",
      `Are you sure you want to change role of ${user.fullName} to: ${nextRole.toUpperCase()}?`,
      async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            role: nextRole
          });
          showAdminAlert("ROLE MODIFIED", `User role permission modified to ${nextRole}.`, "success");
          if (selectedUser?.uid === user.uid) {
            setSelectedUser({ ...selectedUser, role: nextRole });
          }
        } catch (err: any) {
          showAdminAlert("ERROR", "Role changes failed: " + err.message, "error");
        }
      }
    );
  };

  // Delete user permanently and ban them
  const handleDeleteUser = (user: UserProfile) => {
    if (user.uid === adminProfile.uid) {
      showAdminAlert("ERROR", "You cannot delete your own active administrator account.", "error");
      return;
    }
    if (user.role === 'admin' && user.email?.toLowerCase() === 'admin@smartdeposit.com') {
      showAdminAlert("ERROR", "You cannot delete the master platform administrator.", "error");
      return;
    }
    showAdminConfirm(
      "PERMANENTLY DELETE ACCOUNT",
      `⚠️ WARNING: Are you sure you want to permanently delete and ban the account of ${user.fullName} (${user.email})? This user will be immediately logged out, their account will be removed, and they will be blocked from ever logging in or registering again. This action is IRREVERSIBLE!`,
      async () => {
        try {
          // 1. Write user info to deleted_users to permanently ban them
          await setDoc(doc(db, 'deleted_users', user.uid), {
            uid: user.uid,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || '',
            deletedAt: Date.now()
          });

          // 2. Delete user's profile document from the users collection
          await deleteDoc(doc(db, 'users', user.uid));

          showAdminAlert("ACCOUNT DELETED", `The account belonging to ${user.fullName} was permanently deleted and banned.`, "success");
          
          if (selectedUser?.uid === user.uid) {
            setSelectedUser(null);
          }
        } catch (err: any) {
          showAdminAlert("ERROR", "Failed to delete user: " + err.message, "error");
        }
      }
    );
  };

  // Create customized investment plans
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanId.trim() || !newPlanName.trim() || !newPlanCost || !newPlanBonus) {
      showAdminAlert("INCOMPLETE VARIABLES", "Please fill in all plan parameters correctly.", "error");
      return;
    }

    try {
      const planCode = newPlanId.toLowerCase().trim().replace(/\s+/g, '_');
      const planCost = Number(newPlanCost);
      const planBonus = Number(newPlanBonus);
      const planDays = Number(newPlanDays);
      const planTasks = planCost === 0 ? 1 : Math.max(1, Math.round((planCost / 1000) * 5));

      const adLinks = [
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.google.com',
        'https://www.wikipedia.org',
        'https://www.github.com',
        'https://www.amazon.com',
        'https://www.microsoft.com',
        'https://www.apple.com'
      ];
      const titles = [
        'Watch Sponsor Video',
        'Visit Partner Website',
        'Learn Investment Rules',
        'Explore Sponsor Platform',
        'Complete Premium Offer',
        'Review Tech Partnership',
        'Explore Financial Index'
      ];

      // Dynamically generate tasks according to 5 tasks per 1000 taka (10 Taka reward each)
      const parsedTasks = [];
      for (let i = 0; i < planTasks; i++) {
        parsedTasks.push({
          id: `task_${i + 1}`,
          title: `Task ${i + 1}: ${titles[i % titles.length]}`,
          adLink: adLinks[i % adLinks.length],
          duration: 10,
          reward: 10
        });
      }

      await setDoc(doc(db, 'investment_plans', planCode), {
        id: planCode,
        name: newPlanName,
        cost: planCost,
        dailyBonus: planBonus,
        durationDays: planDays,
        active: newPlanActive,
        dailyTasks: planTasks,
        tasks: parsedTasks,
        createdAt: Date.now()
      });

      setNewPlanId('');
      setNewPlanName('');
      setNewPlanCost('');
      setNewPlanBonus('');
      setNewPlanDays('30');
      setNewPlanTasks('');
      setCreatePlanTasks([
        { title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', reward: '2' },
        { title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', reward: '2' },
        { title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', reward: '2' },
        { title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', reward: '2' },
        { title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', reward: '2' }
      ]);
      showAdminAlert("PLAN CREATED", `Investment portfolio plan "${newPlanName}" with ${planTasks} auto-generated tasks (10 BDT each) successfully registered!`, "success");
    } catch (err: any) {
      showAdminAlert("ERROR", "Error saving custom plan: " + err.message, "error");
    }
  };

  const handleDeletePlan = (id: string) => {
    showAdminConfirm(
      "CONFIRM DELETION",
      "Are you sure you want to permanently delete this custom investment plan? Existing portfolio holders will continue, but new registrations will be closed.",
      async () => {
        try {
          await deleteDoc(doc(db, 'investment_plans', id));
          showAdminAlert("DELETED", "Plan deleted from active portfolios list.", "success");
        } catch (err: any) {
          showAdminAlert("ERROR", "Deletion error: " + err.message, "error");
        }
      }
    );
  };

  const handleOpenEditTasks = (plan: any) => {
    setEditPlanTasksSelected(plan);
    const existingTasks = plan.tasks || [];
    const populated = Array.from({ length: 5 }).map((_, idx) => {
      const existing = existingTasks[idx];
      return {
        title: existing?.title || `Task ${idx + 1}: Default Sponsor Ad`,
        adLink: existing?.adLink || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        reward: existing?.reward !== undefined ? String(existing.reward) : '2'
      };
    });
    setEditPlanTasks(populated);
  };

  const handleSaveEditedTasks = async () => {
    if (!editPlanTasksSelected) return;
    try {
      const parsedTasks = editPlanTasks.map((t, idx) => ({
        id: `task_${idx + 1}`,
        title: t.title.trim() || `Task ${idx + 1}`,
        adLink: t.adLink.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        duration: 10,
        reward: Number(t.reward) || 0
      }));

      await updateDoc(doc(db, 'investment_plans', editPlanTasksSelected.id), {
        tasks: parsedTasks
      });

      setEditPlanTasksSelected(null);
      showAdminAlert("TASKS UPDATED", "Plan tasks have been updated successfully! Users with active plans will instantly see these updated tasks.", "success");
    } catch (err: any) {
      showAdminAlert("ERROR", "Error updating plan tasks: " + err.message, "error");
    }
  };

  // Save Website Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'system_settings', 'config'), {
        platformName: editPlatformName,
        bkashNumber: editBkash,
        nagadNumber: editNagad,
        rocketNumber: editRocket,
        notices: editNotices,
        bannerTitle: editBannerTitle,
        bannerMessage: editBannerMsg,
        referralType: editRefType,
        referralValue: Number(editRefVal)
      });
      showAdminAlert("SETTINGS SAVED", "Branding and financial parameters successfully updated in Firestore!", "success");
    } catch (err: any) {
      showAdminAlert("ERROR", "Settings write error: " + err.message, "error");
    }
  };

  const handleAddAdTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdLink.trim()) {
      showAdminAlert("INCOMPLETE VARIABLES", "Please fill in Ad Title and Ad Link correctly.", "error");
      return;
    }
    try {
      const currentTasks = settings.adTasks || [];
      const newTask: AdTask = {
        id: `ad_${Date.now()}`,
        title: newAdTitle.trim(),
        adLink: newAdLink.trim(),
        duration: Number(newAdDuration) || 10,
        reward: Number(newAdReward) || 10
      };
      
      const updatedTasks = [...currentTasks, newTask];
      await updateDoc(doc(db, 'system_settings', 'config'), {
        adTasks: updatedTasks
      });
      
      setNewAdTitle('');
      setNewAdLink('');
      setNewAdDuration('10');
      setNewAdReward('10');
      showAdminAlert("AD TASK ADDED", `Ad task "${newTask.title}" was successfully added to global tasks list!`, "success");
    } catch (err: any) {
      showAdminAlert("ERROR", "Error adding ad task: " + err.message, "error");
    }
  };

  const handleRemoveAdTask = async (adId: string) => {
    showAdminConfirm(
      "CONFIRM REMOVAL",
      "Are you sure you want to permanently delete this daily ad task? Users will no longer be able to watch it.",
      async () => {
        try {
          const currentTasks = settings.adTasks || [];
          const updatedTasks = currentTasks.filter(task => task.id !== adId);
          await updateDoc(doc(db, 'system_settings', 'config'), {
            adTasks: updatedTasks
          });
          showAdminAlert("AD TASK DELETED", "Ad task successfully removed from global list.", "success");
        } catch (err: any) {
          showAdminAlert("ERROR", "Error removing ad task: " + err.message, "error");
        }
      }
    );
  };

  // Support Ticket reply handling on admin thread
  const handleAdminReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReplyText.trim()) return;

    try {
      const now = Date.now();
      await addDoc(collection(db, `support_tickets/${activeTicket.id}/messages`), {
        ticketId: activeTicket.id,
        senderUid: adminProfile.uid,
        senderRole: 'admin',
        senderEmail: adminProfile.email,
        message: adminReplyText,
        createdAt: now
      });

      // Update support ticket status of lastActivity
      const ticketRef = doc(db, 'support_tickets', activeTicket.id);
      await updateDoc(ticketRef, {
        status: 'answered',
        lastActivityAt: now
      });

      // Send User notification
      await addDoc(collection(db, 'notifications'), {
        uid: activeTicket.uid,
        title: 'New Reply in Ticket! ✉️',
        message: `An administrator has replied to your request: "${activeTicket.subject}". Verify tickets.`,
        read: false,
        createdAt: now
      });

      setAdminReplyText('');
    } catch (err: any) {
      showAdminAlert("ERROR", "Error replying to ticket: " + err.message, "error");
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: 'closed' });
      showAdminAlert("TICKET CLOSED", "Ticket closed successfully.", "success");
      if (activeTicket?.id === ticketId) {
        setActiveTicket({ ...activeTicket, status: 'closed' });
      }
    } catch (err: any) {
      showAdminAlert("ERROR", "Error closing ticket: " + err.message, "error");
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen pb-12 font-sans flex flex-col md:flex-row transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SIDEBAR FOR CONTROL PANEL */}
      <aside className={`w-full md:w-64 border-r transition-all duration-300 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-zinc-805/40 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Sliders className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Smart Control</h1>
            <p className="text-[10px] text-amber-500 font-bold tracking-wider uppercase">ADMIN PORTAL</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-1">
          <button 
            id="admin-nav-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <BarChart className="w-4 h-4" /> Dashboard Overview
          </button>

          <button 
            id="admin-nav-users"
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'users' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Users className="w-4 h-4" /> Users Directory
          </button>

          <button 
            id="admin-nav-deposits"
            onClick={() => setActiveTab('deposits')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'deposits' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><ArrowUpRight className="w-4 h-4" /> Deposits Payouts</span>
            {stats.pendingDeposits > 0 && <span className="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full leading-none">{stats.pendingDeposits}</span>}
          </button>

          <button 
            id="admin-nav-withdraws"
            onClick={() => setActiveTab('withdraws')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'withdraws' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><ArrowDownLeft className="w-4 h-4" /> Withdraws Payouts</span>
            {stats.pendingWithdraws > 0 && <span className="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full leading-none">{stats.pendingWithdraws}</span>}
          </button>

          <button 
            id="admin-nav-plans"
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'plans' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Layers className="w-4 h-4" /> Investment Plans
          </button>

          <button 
            id="admin-nav-tickets"
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tickets' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><MessageSquare className="w-4 h-4" /> Support Tickets</span>
            {stats.pendingTickets > 0 && <span className="bg-rose-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full leading-none">{stats.pendingTickets}</span>}
          </button>

          <button 
            id="admin-nav-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'transactions' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="w-4 h-4" /> Global Audit Logs
          </button>

          <button 
            id="admin-nav-settings"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'settings' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Settings className="w-4 h-4" /> Branded App Settings
          </button>
        </div>

        <div className="p-4 border-t border-zinc-800/40 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold truncate leading-tight">Master Admin</h4>
              <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{adminProfile.email}</p>
            </div>
          </div>
          <button 
            id="btn-admin-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-455 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            Sign Out System
          </button>
        </div>
      </aside>

      {/* ADMIN MAIN WORKSPACE GRID */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header of the workspace */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase">PLATFORM GOVERNANCE CONTROL</span>
            <h2 className="text-md font-extrabold text-white mt-0.5">Admin Control Console</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              id="admin-theme-switch"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                isDark ? 'border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Toggle {isDark ? 'Light' : 'Dark'} Mode
            </button>

            {/* Header Sign Out button */}
            <button 
              id="admin-header-logout"
              onClick={onLogout}
              className={`p-2 px-3 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-bold ${
                isDark 
                  ? 'border-zinc-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20' 
                  : 'border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200'
              }`}
              title="Sign Out System"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6 flex-1">
          
          {/* A. PLATFORM STATISTICS MODULE */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Registers</span>
                  <p className="text-2xl font-black mt-1 text-white">{stats.totalUsers} Accounts</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Custom Deposited</span>
                  <p className="text-2xl font-black mt-1 text-emerald-400">৳{stats.totalDeposited.toLocaleString()} BDT</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Subscribed Volume</span>
                  <p className="text-2xl font-black mt-1 text-amber-500">৳{stats.totalInvested.toLocaleString()} BDT</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Paid Payouts</span>
                  <p className="text-2xl font-black mt-1 text-rose-500">৳{stats.totalWithdrawn.toLocaleString()} BDT</p>
                </div>

              </div>

              {/* Real-time system notifications inside console */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Deposit Pending alerts */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4">Pending Deposits Clearance requests ({stats.pendingDeposits})</h3>
                  
                  {deposits.filter(d => d.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No pending deposit approval requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {deposits.filter(d => d.status === 'pending').slice(0, 4).map((dep) => (
                        <div key={dep.id} className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-855 flex justify-between items-center gap-4">
                          <div>
                            <p className="text-xs font-bold text-white">{dep.userEmail}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Amount: <strong className="text-emerald-400">৳{dep.amount}</strong> via {dep.paymentMethod}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">TxID: {dep.transactionId}</p>
                          </div>
                          
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              id={`approve-dep-btn-${dep.id}`}
                              onClick={() => handleApproveDeposit(dep)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                              title="Approve Balance"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              id={`reject-dep-btn-${dep.id}`}
                              onClick={() => handleRejectDeposit(dep)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all"
                              title="Reject Deposit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Withdraw pending cashouts */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4">Pending withdrawals Cashouts ({stats.pendingWithdraws})</h3>
                  
                  {withdraws.filter(w => w.status === 'pending').length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No pending withdrawal cashouts requested.</p>
                  ) : (
                    <div className="space-y-3">
                      {withdraws.filter(w => w.status === 'pending').slice(0, 4).map((wReq) => (
                        <div key={wReq.id} className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-855 flex justify-between items-center gap-4">
                          <div>
                            <p className="text-xs font-bold text-white">{wReq.userEmail}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Target: {wReq.targetNumber} | gateway: {wReq.paymentMethod}</p>
                            <p className="text-[10px] text-rose-455 font-bold mt-0.5">Debit: ৳{wReq.amount} BDT</p>
                          </div>
                          
                          <div className="flex gap-1.5 shrink-0">
                            <button 
                              id={`approve-with-btn-${wReq.id}`}
                              onClick={() => handleApproveWithdraw(wReq)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                              title="Approve Cashout"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              id={`reject-with-btn-${wReq.id}`}
                              onClick={() => handleRejectWithdraw(wReq)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                              title="Reject & Refund"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* B. USERS DIRECTORY MANAGEMENT MODULE */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500"><Search className="w-4 h-4" /></span>
                  <input
                    id="search-user-input"
                    type="text"
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    placeholder="Search accounts directory by registered Name, UID, Phone number, or Email address..."
                    className={`block w-full pl-10 pr-3 py-2.5 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none transition-all ${
                      isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-950'
                    }`}
                  />
                </div>
              </div>

              {/* Users table */}
              <div className={`p-6 rounded-3xl border overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-855 text-[10px] text-slate-455 uppercase tracking-wider font-extrabold pb-2">
                        <th className="p-3">Client Identity</th>
                        <th className="p-3">Phone number</th>
                        <th className="p-3">Wallet vault BDT</th>
                        <th className="p-3">Total Invested</th>
                        <th className="p-3">affiliate Code</th>
                        <th className="p-3">Governance Status</th>
                        <th className="p-3 text-center">Operation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {allUsers
                        .filter(u => {
                          const queryStr = userSearchText.toLowerCase();
                          return u.fullName.toLowerCase().includes(queryStr) ||
                                 u.email.toLowerCase().includes(queryStr) ||
                                 u.phone.includes(queryStr) ||
                                 u.referralCode.toLowerCase().includes(queryStr);
                        })
                        .map((user) => (
                          <tr key={user.uid} className="hover:bg-zinc-800/10">
                            <td className="p-3">
                              <p className="font-extrabold text-white leading-tight">{user.fullName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>
                            </td>
                            <td className="p-3 text-slate-300 font-mono">{user.phone || 'N/A'}</td>
                            <td className="p-3 text-emerald-400 font-extrabold">৳{user.walletBalance.toLocaleString()}</td>
                            <td className="p-3 text-slate-300 font-semibold">৳{(user.totalInvested || 0).toLocaleString()}</td>
                            <td className="p-3 text-white font-mono tracking-wider">{user.referralCode}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                user.status === 'active' ? 'bg-emerald-500/10 text-emerald-433' : 'bg-rose-500/15 text-rose-400'
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                              <button 
                                id={`manage-user-btn-${user.uid}`}
                                onClick={() => setSelectedUser(user)}
                                className="px-2.5 py-1.2 rounded-lg bg-zinc-805 text-[10px] border border-zinc-800 font-bold uppercase tracking-wider text-amber-500 hover:bg-zinc-800 transition-all"
                              >
                                Edit Bal / Role
                              </button>
                              <button 
                                id={`delete-user-btn-${user.uid}`}
                                onClick={() => handleDeleteUser(user)}
                                className="px-2.5 py-1.2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* C. MANAGE CHOSEN USER MODAL */}
          {selectedUser && (
            <div id="user-details-vault-control" className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 space-y-6">
                
                <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Configure Client Parameters</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedUser.fullName} ({selectedUser.email})</p>
                  </div>
                  <button 
                    id="btn-close-user-management"
                    onClick={() => setSelectedUser(null)} 
                    className="p-1 text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
                  <div className="space-y-2">
                    <p>Current balance: <strong className="text-white">৳{selectedUser.walletBalance} BDT</strong></p>
                    <p>Total affiliate Earned: <strong className="text-white">৳{selectedUser.referralCommissionEarned} BDT</strong></p>
                    <p>Designated Status: <strong className="text-white">{selectedUser.status}</strong></p>
                    <p>Account Role: <strong className="text-white">{selectedUser.role}</strong></p>
                  </div>

                  {/* Role and lock buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      id="btn-suspend-user-toggle"
                      onClick={() => handleToggleSuspend(selectedUser)}
                      className={`py-2 px-3 rounded-xl font-bold uppercase text-[10px] tracking-widest text-center transition-all ${
                        selectedUser.status === 'active' 
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950'
                      }`}
                    >
                      {selectedUser.status === 'active' ? 'Suspend Account' : 'Re-Activate Account'}
                    </button>

                    <button
                      id="btn-toggle-user-role"
                      onClick={() => handleToggleAdmin(selectedUser)}
                      className="py-2 px-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-705 font-bold uppercase text-[10px] tracking-widest text-center transition-all text-white"
                    >
                      {selectedUser.role === 'admin' ? 'Remove Admin Role' : 'Make Administrator'}
                    </button>

                    <button
                      id="btn-delete-user"
                      onClick={() => handleDeleteUser(selectedUser)}
                      className="py-2 px-3 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white font-bold uppercase text-[10px] tracking-widest text-center transition-all"
                    >
                      Delete Account Permanently
                    </button>
                  </div>
                </div>

                {/* MANUAL BALANCE MODIFIER */}
                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-500">Manual Financial Balance Adjustment</h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Adjustment Amount BDT</label>
                        <input
                          id="admin-adjust-amount"
                          type="number"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="e.g. 500"
                          className="block w-full px-3 py-2 rounded-xl text-xs bg-zinc-900 border border-zinc-800 text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Audit Reason</label>
                        <input
                          id="admin-adjust-reason"
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="e.g. Compensation, Manual deposit"
                          className="block w-full px-3 py-2 rounded-xl text-xs bg-zinc-900 border border-zinc-800 text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        id="btn-manual-credit"
                        onClick={() => handleManualBalanceChange('add')}
                        className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl font-bold uppercase tracking-wide text-xs"
                      >
                        Credit Add Balance
                      </button>
                      <button
                        id="btn-manual-debit"
                        onClick={() => handleManualBalanceChange('deduct')}
                        className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl font-bold uppercase tracking-wide text-xs"
                      >
                        Debit Deduct Balance
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* EDIT PLAN TASKS MODAL */}
          {editPlanTasksSelected && (
            <div id="edit-plan-tasks-modal" className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                
                <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Setup Tasks Links & Rewards</h3>
                    <p className="text-xs text-amber-500 mt-0.5">Plan: {editPlanTasksSelected.name} (Code: {editPlanTasksSelected.id})</p>
                  </div>
                  <button 
                    id="btn-close-tasks-management"
                    onClick={() => setEditPlanTasksSelected(null)} 
                    className="p-1 text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Set the 5 loadable task links and individual rewards in BDT for this plan. When a user buys this plan, they will see these 5 tasks to claim money.
                  </p>

                  <div className="space-y-3">
                    {editPlanTasks.map((task, idx) => (
                      <div key={idx} className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-850 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-550">Task {idx + 1} Settings</span>
                          <span className="text-[9px] font-mono text-slate-500">Task Ref ID: task_{idx + 1}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Display Title</label>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(e) => {
                                const updated = [...editPlanTasks];
                                updated[idx].title = e.target.value;
                                setEditPlanTasks(updated);
                              }}
                              placeholder="e.g. Watch Sponsor Video"
                              className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Load Link (URL)</label>
                            <input
                              type="text"
                              value={task.adLink}
                              onChange={(e) => {
                                const updated = [...editPlanTasks];
                                updated[idx].adLink = e.target.value;
                                setEditPlanTasks(updated);
                              }}
                              placeholder="e.g. https://www.youtube.com/embed/..."
                              className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Reward Payout (৳ BDT)</label>
                          <input
                            type="number"
                            value={task.reward}
                            onChange={(e) => {
                              const updated = [...editPlanTasks];
                              updated[idx].reward = e.target.value;
                              setEditPlanTasks(updated);
                            }}
                            placeholder="e.g. 5"
                            className="block w-full max-w-[200px] px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/40">
                  <button
                    id="btn-cancel-edit-tasks"
                    onClick={() => setEditPlanTasksSelected(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    id="btn-save-edit-tasks"
                    onClick={handleSaveEditedTasks}
                    className="px-6 py-2 text-xs font-bold text-zinc-900 bg-emerald-400 hover:bg-emerald-350 rounded-xl transition-all shadow-md animate-none"
                  >
                    SAVE TASK SETTINGS
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* D. DEPOSITS LEDGER MANAGEMENT SCREEN */}
          {activeTab === 'deposits' && (
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-bold mb-4">Manual Deposits Requests Clearing Ledger</h3>
              
              {deposits.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No deposit receipts requested on the platform yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                        <th className="p-3">User Email</th>
                        <th className="p-3">Gateway</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Tx Reference ID</th>
                        <th className="p-3">Screenshots Slip</th>
                        <th className="p-3">Clearance status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {deposits.map((dep) => (
                        <tr key={dep.id} className="hover:bg-zinc-808/10">
                          <td className="p-3 font-semibold text-white">{dep.userEmail}</td>
                          <td className="p-3 text-slate-3 tracking-wide">{dep.paymentMethod}</td>
                          <td className="p-3 font-black text-emerald-400">৳{dep.amount}</td>
                          <td className="p-3 font-mono text-slate-400">{dep.transactionId}</td>
                          <td className="p-3">
                            {dep.proofScreenshot ? (
                              <a href={dep.proofScreenshot} target="_blank" rel="noreferrer" className="text-emerald-400 underline lowercase text-[10px]">
                                View slip proof
                              </a>
                            ) : (
                              <span className="text-slate-500 text-[10px]">None</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              dep.status === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : dep.status === 'rejected' 
                                  ? 'bg-rose-500/10 text-rose-455' 
                                  : 'bg-amber-400/10 text-amber-500'
                            }`}>
                              {dep.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {dep.status === 'pending' ? (
                              <div className="flex gap-1.5 justify-center">
                                <button 
                                  id={`ledger-approve-btn-${dep.id}`}
                                  onClick={() => handleApproveDeposit(dep)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase text-[9px] tracking-wide"
                                >
                                  Approve
                                </button>
                                <button 
                                  id={`ledger-reject-btn-${dep.id}`}
                                  onClick={() => handleRejectDeposit(dep)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold uppercase text-[9px] tracking-wide"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* E. WITHDRAWALS CASHOUT LEDGER DIRECTORY */}
          {activeTab === 'withdraws' && (
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-bold mb-4">Cash Withdrawals Cashouts Clearance Directory</h3>
              
              {withdraws.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No withdrawal clearance requested yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                        <th className="p-3">User Email</th>
                        <th className="p-3">Receiving Gateway</th>
                        <th className="p-3">Amount Requested</th>
                        <th className="p-3 flex-wrap">Target Phone / Account No</th>
                        <th className="p-3">Payout status</th>
                        <th className="p-3 text-center">Clearance Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {withdraws.map((wReq) => (
                        <tr key={wReq.id} className="hover:bg-zinc-808/10">
                          <td className="p-3 font-semibold text-white">{wReq.userEmail}</td>
                          <td className="p-3 text-slate-300">{wReq.paymentMethod}</td>
                          <td className="p-3 font-black text-rose-500">৳{wReq.amount} BDT</td>
                          <td className="p-3 font-mono font-bold text-slate-400">{wReq.targetNumber}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              wReq.status === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : wReq.status === 'rejected' 
                                  ? 'bg-rose-500/10 text-rose-455' 
                                  : 'bg-amber-400/10 text-amber-500'
                            }`}>
                              {wReq.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {wReq.status === 'pending' ? (
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  id={`withdraw-approve-btn-${wReq.id}`}
                                  onClick={() => handleApproveWithdraw(wReq)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase text-[9px]"
                                >
                                  Complete Payout
                                </button>
                                <button
                                  id={`withdraw-reject-btn-${wReq.id}`}
                                  onClick={() => handleRejectWithdraw(wReq)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold uppercase text-[9px]"
                                >
                                  Reject Refund
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* F. INVESTMENT PORTFOLIO PLANS MANAGER */}
          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Add custom plan form */}
              <div className={`p-6 rounded-3xl border bg-zinc-900 border-zinc-850 h-fit`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4">Register Custom plan</h3>

                <form onSubmit={handleCreatePlan} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Unambiguous Plan Code (no spacing)</label>
                    <input
                      id="plan-f-id"
                      type="text"
                      value={newPlanId}
                      onChange={(e) => setNewPlanId(e.target.value)}
                      placeholder="e.g. plan_gold_dynamic"
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Customer Facing Name</label>
                    <input
                      id="plan-f-name"
                      type="text"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="e.g. Dynamic Custom Plan"
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Purchase Cost (৳)</label>
                      <input
                        id="plan-f-cost"
                        type="number"
                        value={newPlanCost}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPlanCost(val);
                          const costNum = Number(val);
                          if (!isNaN(costNum) && costNum >= 0) {
                            const calculatedTasks = costNum === 0 ? 1 : Math.max(1, Math.round((costNum / 1000) * 5));
                            const calculatedBonus = costNum === 0 ? 10 : calculatedTasks * 10;
                            setNewPlanBonus(calculatedBonus.toString());
                            setNewPlanTasks(calculatedTasks.toString());
                          }
                        }}
                        placeholder="1000"
                        className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Daily Return Profit (৳)</label>
                      <input
                        id="plan-f-bonus"
                        type="number"
                        value={newPlanBonus}
                        onChange={(e) => setNewPlanBonus(e.target.value)}
                        placeholder="50"
                        className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Portfolio Life Duration Days</label>
                    <input
                      id="plan-f-days"
                      type="number"
                      value={newPlanDays}
                      onChange={(e) => setNewPlanDays(e.target.value)}
                      placeholder="30"
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-405 uppercase tracking-wider mb-1.5">Daily Ad Tasks Count (Leave blank for default)</label>
                    <input
                      id="plan-f-tasks"
                      type="number"
                      value={newPlanTasks}
                      onChange={(e) => setNewPlanTasks(e.target.value)}
                      placeholder="e.g. 5"
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      id="plan-f-active"
                      type="checkbox"
                      checked={newPlanActive}
                      onChange={(e) => setNewPlanActive(e.target.checked)}
                      className="rounded border-zinc-740 text-amber-550 bg-zinc-940"
                    />
                    <label className="text-[10px] text-slate-400 select-none">Set Activation status immediately visible to users.</label>
                  </div>

                  {/* Custom 5 Tasks Section */}
                  <div className="border-t border-zinc-800 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Configure 5 Tasks for this Plan</h4>
                      <span className="bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/20">5 Tasks Limit</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      Specify the loadable video/web links and individual reward payouts for completing each task under this plan.
                    </p>
                    
                    {createPlanTasks.map((task, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Task {idx + 1} Configuration</span>
                        <div>
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => {
                              const updated = [...createPlanTasks];
                              updated[idx].title = e.target.value;
                              setCreatePlanTasks(updated);
                            }}
                            placeholder="Task Title (e.g., Watch YouTube Video)"
                            className="block w-full px-2.5 py-1.5 text-[10px] rounded-lg bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={task.adLink}
                              onChange={(e) => {
                                const updated = [...createPlanTasks];
                                updated[idx].adLink = e.target.value;
                                setCreatePlanTasks(updated);
                              }}
                              placeholder="Task link (URL)"
                              className="block w-full px-2.5 py-1.5 text-[10px] rounded-lg bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                              required
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={task.reward}
                              onChange={(e) => {
                                const updated = [...createPlanTasks];
                                updated[idx].reward = e.target.value;
                                setCreatePlanTasks(updated);
                              }}
                              placeholder="Reward ৳"
                              className="block w-full px-2.5 py-1.5 text-[10px] rounded-lg bg-zinc-800 border border-zinc-700 text-white outline-none focus:border-amber-500"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    id="btn-plan-f-submit"
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-white mt-2 transition-all shadow"
                  >
                    Deploy Portfolio Plan
                  </button>
                </form>
              </div>

              {/* Plans display grid */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-550">Active Investment Plans Catalog ({plans.length})</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((p) => (
                    <div key={p.id} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-white text-xs">{p.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            p.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/15 text-rose-455'
                          }`}>
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono">Code Ref ID: {p.id}</p>

                        <div className="mt-3 space-y-1 text-xs text-slate-400">
                          <p>Investment Cost: <strong className="text-white">৳{p.cost} BDT</strong></p>
                          <p>Daily Bonus Reward: <strong className="text-emerald-400">৳{p.dailyBonus}/day</strong></p>
                          <p>Plan Life duration: <strong className="text-white">{p.durationDays} Days</strong></p>
                          <p>Daily Ad Tasks: <strong className="text-amber-400">{p.dailyTasks || Math.floor(p.cost / 200)} Tasks</strong></p>
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/40 mt-4 pt-3 flex justify-between items-center">
                        <button 
                          id={`edit-tasks-${p.id}`}
                          onClick={() => handleOpenEditTasks(p)}
                          className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold uppercase text-[9px] tracking-widest"
                        >
                          <Settings className="w-3.5 h-3.5" /> Setup Tasks Links
                        </button>

                        <button 
                          id={`delete-plan-${p.id}`}
                          onClick={() => handleDeletePlan(p.id)}
                          className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-bold uppercase text-[9px] tracking-widest"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove portfolio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* G. SUPPORT TICKETS REPLIES SYSTEM */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Ticket threads */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-3`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-4">Support Escalations Threads</h3>
                
                {tickets.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No client tickets filed in platform.</p>
                ) : (
                  tickets.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setActiveTicket(t)}
                      className={`p-3.5 rounded-2xl border cursor-pointer hover:bg-zinc-800/20 transition-all ${
                        activeTicket?.id === t.id 
                          ? 'border-amber-500 bg-amber-500/5' 
                          : 'border-zinc-800 bg-zinc-950/20'
                      }`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-extrabold text-xs text-white leading-tight truncate max-w-[70%]">{t.subject}</span>
                        <span className={`px-2 py-0.2 rounded text-[8px] font-black uppercase ${
                          t.status === 'answered' ? 'bg-emerald-500/10 text-emerald-433' : t.status === 'closed' ? 'bg-zinc-800 text-slate-400' : 'bg-rose-500/10 text-rose-500 animate-pulse'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{t.userEmail} | ID: {t.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Conversations center */}
              <div className="md:col-span-2">
                {activeTicket ? (
                  <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-4`}>
                    
                    <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Interactive communications thread</span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{activeTicket.subject}</h4>
                        <p className="text-[10px] text-zinc-433 font-semibold mt-0.5">Author client: {activeTicket.userEmail}</p>
                      </div>
                      
                      {activeTicket.status !== 'closed' && (
                        <button 
                          id="btn-admin-close-ticket"
                          onClick={() => handleCloseTicket(activeTicket.id)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg uppercase tracking-wider"
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="space-y-3 h-72 overflow-y-auto p-3 bg-zinc-950/50 rounded-2xl border border-zinc-850">
                      {ticketMessages.map((msg) => {
                        const isAdmin = msg.senderRole === 'admin';
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs ${
                              isAdmin 
                                ? 'bg-amber-600 text-white ml-auto rounded-tr-none' 
                                : 'bg-zinc-800 text-slate-100 mr-auto rounded-tl-none'
                            }`}
                          >
                            <span className="text-[8px] font-black tracking-wider uppercase opacity-80 mb-0.5">
                              {isAdmin ? 'ADMIN REPLY' : 'CLIENT MESSAGE'}
                            </span>
                            <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>
                            <span className="text-[8px] opacity-60 mt-1 self-end">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Form reply */}
                    {activeTicket.status !== 'closed' ? (
                      <form onSubmit={handleAdminReplyTicket} className="flex gap-2">
                        <input
                          id="admin-reply-box"
                          type="text"
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder="Type official system response to client issue..."
                          className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-zinc-900 border border-zinc-800 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                          required
                        />
                        <button
                          id="btn-admin-send-reply"
                          type="submit"
                          className="bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider"
                        >
                          Send reply
                        </button>
                      </form>
                    ) : (
                      <div className="text-center py-2.5 bg-zinc-800/10 rounded-xl text-xs text-slate-500 border border-zinc-850">
                        This Support ticket thread has been officially closed.
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500 bg-zinc-900/10 rounded-3xl border border-zinc-850 border-dashed">
                     Select an active escalations thread from the left rail to interact with client.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* H. SYSTEM TRANSACTION AUDIT LOG JOURNAL */}
          {activeTab === 'transactions' && (
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-1">Global Transaction Audit Logs</h3>
                <p className="text-xs text-slate-400">Complete, immutable platform accounting statements logs for oversight and audit.</p>
              </div>

              {txLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No transactions registered inside platform framework.</p>
              ) : (
                <div className="space-y-3">
                  {txLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center bg-zinc-950/20 p-4 rounded-2xl border border-zinc-850 hover:bg-zinc-900/20 transition-all">
                      <div className="flex gap-3">
                        <span className={`p-2 rounded-xl text-xs font-bold leading-none self-center shrink-0 ${
                          ['deposit', 'bonus', 'referral', 'admin_adjust'].includes(log.type) 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {log.type.toUpperCase()}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white leading-normal">{log.details}</p>
                          <p className="text-[10px] text-slate-550 mt-0.5">{log.userEmail} | {new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-400 shrink-0">৳{log.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* I. APP BRANDING, MARQUEE & COMMISSION SETTINGS MODIFICATION SCREEN */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <form onSubmit={handleSaveSettings} className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-6`}>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">Global Website branding & Gateway parameters</h3>
                <p className="text-xs text-slate-400 mt-1">Configure user-facing text banners, marquee notice, deposit addresses, and referral commission percentages.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white">Platform Branding Settings</h4>
                  
                  <div>
                    <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Branded Website Name</label>
                    <input
                      id="set-brand-name"
                      type="text"
                      value={editPlatformName}
                      onChange={(e) => setEditPlatformName(e.target.value)}
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Scrolling Marquee Notice List</label>
                    <textarea
                      id="set-marquee"
                      rows={3}
                      value={editNotices}
                      onChange={(e) => setEditNotices(e.target.value)}
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Affiliate Scheme</label>
                      <select
                        id="set-ref-scheme"
                        value={editRefType}
                        onChange={(e) => setEditRefType(e.target.value as 'percentage' | 'fixed')}
                        className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                      >
                        <option value="percentage">Percentage Reward (%)</option>
                        <option value="fixed">Fixed BDT Amount (৳)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Affiliate Scheme Value</label>
                      <input
                        id="set-ref-val"
                        type="number"
                        value={editRefVal}
                        onChange={(e) => setEditRefVal(e.target.value)}
                        className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Gateway config */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white">Manual Merchant payment Gateways Number (Personal)</h4>
                  
                  <div>
                    <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">bKash wallet phone Number</label>
                    <input
                      id="set-bkash"
                      type="text"
                      value={editBkash}
                      onChange={(e) => setEditBkash(e.target.value)}
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Nagad wallet phone Number</label>
                    <input
                      id="set-nagad"
                      type="text"
                      value={editNagad}
                      onChange={(e) => setEditNagad(e.target.value)}
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-455 font-bold uppercase tracking-wider mb-1.5">Rocket wallet phone Number</label>
                    <input
                      id="set-rocket"
                      type="text"
                      value={editRocket}
                      onChange={(e) => setEditRocket(e.target.value)}
                      className="block w-full px-3 py-2 text-xs rounded-xl bg-zinc-800 border border-zinc-700 text-white outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* Promo banners configuration */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-white">Premium Banners custom titles</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Banner Catchy Title</label>
                    <input
                      id="set-banner-title"
                      type="text"
                      value={editBannerTitle}
                      onChange={(e) => setEditBannerTitle(e.target.value)}
                      className="block w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Banner Catchy Subtitle Message</label>
                    <input
                      id="set-banner-message"
                      type="text"
                      value={editBannerMsg}
                      onChange={(e) => setEditBannerMsg(e.target.value)}
                      className="block w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="text-right">
                <button
                  id="btn-settings-save"
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-widest transition-all shadow"
                >
                  Publish Parameters Update
                </button>
              </div>
            </form>

            {/* Global Daily Ad Tasks Configurator */}
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-6`}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-550 flex items-center gap-2">
                  <Tv className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                  Global Daily Ads Tasks Configurator
                </h3>
                <p className="text-xs text-slate-400 mt-1">Deploy, monitor, or remove active advertising links and click-through cash rewards that are shown on user dashboards.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add ad task form */}
                <form onSubmit={handleAddAdTask} className="p-5 bg-zinc-950/60 border border-zinc-850 rounded-2xl space-y-4 h-fit">
                  <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Register Custom Ad Campaign</h4>
                  
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Ad Campaign Title</label>
                    <input
                      id="new-ad-title-input"
                      type="text"
                      required
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      placeholder="e.g. Premium Sponsored Video"
                      className="block w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase mb-1">Ad URL Link (with http:// or https://)</label>
                    <input
                      id="new-ad-link-input"
                      type="url"
                      required
                      value={newAdLink}
                      onChange={(e) => setNewAdLink(e.target.value)}
                      placeholder="https://www.sponsor-ads.com"
                      className="block w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-450 uppercase mb-1">Timer (Sec)</label>
                      <input
                        id="new-ad-duration-input"
                        type="number"
                        required
                        min={5}
                        max={120}
                        value={newAdDuration}
                        onChange={(e) => setNewAdDuration(e.target.value)}
                        className="block w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-450 uppercase mb-1">Reward (৳ BDT)</label>
                      <input
                        id="new-ad-reward-input"
                        type="number"
                        required
                        min={1}
                        value={newAdReward}
                        onChange={(e) => setNewAdReward(e.target.value)}
                        className="block w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-submit-new-ad"
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow"
                  >
                    Deploy Ad Campaign
                  </button>
                </form>

                {/* Active ad tasks list */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Ad Campaigns list ({settings.adTasks?.length || 0})</h4>
                  
                  {(!settings.adTasks || settings.adTasks.length === 0) ? (
                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20 text-xs text-slate-500">
                      No custom ad campaigns deployed yet. User dashboards will view standard fallback tasks (10 seconds duration, ৳10 reward each).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {settings.adTasks.map((task, index) => (
                        <div key={task.id || index} className="p-4 bg-zinc-950/30 border border-zinc-850 rounded-2xl flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <h5 className="text-xs font-bold text-white truncate max-w-[150px]">{task.title}</h5>
                              <span className="bg-emerald-500/10 text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/15">
                                ৳{task.reward} BDT
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono truncate mb-2">{task.adLink}</p>
                            <p className="text-[10px] text-slate-400">Timer requirement: <strong className="text-white">{task.duration} seconds</strong></p>
                          </div>

                          <div className="border-t border-zinc-800/40 mt-3 pt-2 text-right">
                            <button
                              id={`remove-ad-${task.id}`}
                              type="button"
                              onClick={() => handleRemoveAdTask(task.id)}
                              className="text-rose-400 hover:text-rose-350 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 float-right"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove campaign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        </div>

      </main>

      {/* ========================================== */}
      {/* STATEFUL ADMIN CONFIRMATION OVERLAY MODAL */}
      {/* ========================================== */}
      {confirmModal.show && (
        <div id="admin-confirm-portal" className="fixed inset-0 z-[9991] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
          />
          
          {/* Modal card */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-left">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            {confirmModal.requireReason && (
              <div className="mb-5">
                <label className="block text-[10px] text-zinc-400 uppercase font-black tracking-wide mb-1.5">Action Rejection Reason / Note</label>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-amber-500 transition-colors"
                  rows={3}
                  placeholder={confirmModal.reasonPlaceholder}
                  value={confirmModal.reasonValue}
                  onChange={(e) => setConfirmModal(prev => ({ ...prev, reasonValue: e.target.value }))}
                />
              </div>
            )}

            <div className="flex items-center gap-3 justify-end text-xs font-black">
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-wider"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-all uppercase tracking-wider"
                onClick={async () => {
                  const cb = confirmModal.onConfirm;
                  const val = confirmModal.reasonValue;
                  setConfirmModal(prev => ({ ...prev, show: false }));
                  await cb(val);
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* STATEFUL ADMIN ALERT FEEDBACK NOTIFIER MODAL */}
      {/* ========================================= */}
      {alertModal.show && (
        <div id="admin-alert-portal" className="fixed inset-0 z-[9992] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
          />
          
          {/* Modal card */}
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-center">
            <div className="flex flex-col items-center mb-6">
              <div className={`p-4 rounded-full mb-3 ${
                alertModal.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 animate-bounce' :
                alertModal.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {alertModal.type === 'success' ? <Check className="w-8 h-8" /> :
                 alertModal.type === 'error' ? <X className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{alertModal.title}</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed px-2">{alertModal.message}</p>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => setAlertModal(prev => ({ ...prev, show: false }))}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
