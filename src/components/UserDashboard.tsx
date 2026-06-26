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
  setDoc, 
  addDoc,
  updateDoc, 
  onSnapshot, 
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  UserProfile, 
  InvestmentPlan, 
  UserInvestment, 
  DepositRequest, 
  WithdrawRequest, 
  TransactionLog, 
  ReferralHistoryRecord, 
  Notification, 
  SupportTicket, 
  TicketMessage, 
  SystemSettings,
  AdTask
} from '../types';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Users, 
  MessageSquare, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronRight, 
  Check, 
  X, 
  Copy, 
  AlertCircle, 
  FileText, 
  Send, 
  RefreshCw, 
  HelpCircle, 
  Compass, 
  Plus, 
  Flame,
  Shield,
  Tv,
  Megaphone
} from 'lucide-react';

interface UserDashboardProps {
  userProfile: UserProfile;
  onLogout: () => void;
  systemSettings: SystemSettings;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export default function UserDashboard({ 
  userProfile: initialProfile, 
  onLogout, 
  systemSettings, 
  theme, 
  setTheme 
}: UserDashboardProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'withdraw' | 'history' | 'referrals' | 'tickets' | 'profile' | 'notifications' | 'tasks'>('dashboard');
  
  // Real-time listener for current user profile state
  useEffect(() => {
    if (!profile.uid) return;
    const unsub = onSnapshot(doc(db, 'users', profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    });
    return unsub;
  }, [profile.uid]);

  // Firestore DB contents
  const [allPlans, setAllPlans] = useState<InvestmentPlan[]>([]);
  const [myInvestments, setMyInvestments] = useState<UserInvestment[]>([]);
  const [myDeposits, setMyDeposits] = useState<DepositRequest[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawRequest[]>([]);
  const [myTxLogs, setMyTxLogs] = useState<TransactionLog[]>([]);
  const [myReferrals, setMyReferrals] = useState<UserProfile[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<ReferralHistoryRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<any[]>([]);

  // Daily tasks & ad modal states
  const [activeAd, setActiveAd] = useState<AdTask | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claimingAd, setClaimingAd] = useState(false);
  const [adSuccess, setAdSuccess] = useState('');
  
  // Forms & Modal states
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [depositTxId, setDepositTxId] = useState('');
  const [depositProof, setDepositProof] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositSuccessAlert, setDepositSuccessAlert] = useState('');
  
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [withdrawTarget, setWithdrawTarget] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawErrorAlert, setWithdrawErrorAlert] = useState('');
  const [withdrawSuccessAlert, setWithdrawSuccessAlert] = useState('');

  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMsg, setNewTicketMsg] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [copied, setCopied] = useState(false);

  // Stateful confirmations instead of window.confirm
  const [confirmPurchasePlan, setConfirmPurchasePlan] = useState<InvestmentPlan | null>(null);
  const [purchaseSuccessAlert, setPurchaseSuccessAlert] = useState<{show: boolean, title: string, msg: string}>({show: false, title: '', msg: ''});

  // Verification simulator
  const [verificationModal, setVerificationModal] = useState<'phone' | 'email' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  // Fetch investment plans, active investments, deposits, withdrawals, tickets, notifications
  useEffect(() => {
    if (!profile || !profile.uid) return;

    // 1. Fetch active plans
    const unsubPlans = onSnapshot(collection(db, 'investment_plans'), (snapshot) => {
      const plansList: InvestmentPlan[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InvestmentPlan;
        if (data.active) plansList.push(data);
      });
      setAllPlans(plansList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'investment_plans');
    });

    // 2. Listen to User Investments
    const qInvest = query(collection(db, 'user_investments'), where('uid', '==', profile.uid));
    const unsubInvest = onSnapshot(qInvest, (snapshot) => {
      const investList: UserInvestment[] = [];
      snapshot.forEach((docSnap) => {
        investList.push({ ...docSnap.data(), id: docSnap.id } as UserInvestment);
      });
      setMyInvestments(investList.sort((a,b) => b.purchasedAt - a.purchasedAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_investments');
    });

    // 3. Listen to User Deposits
    const qDep = query(collection(db, 'deposit_requests'), where('uid', '==', profile.uid));
    const unsubDep = onSnapshot(qDep, (snapshot) => {
      const depList: DepositRequest[] = [];
      snapshot.forEach((docSnap) => {
        depList.push({ ...docSnap.data(), id: docSnap.id } as DepositRequest);
      });
      setMyDeposits(depList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deposit_requests');
    });

    // 4. Listen to User Withdraws
    const qWith = query(collection(db, 'withdraw_requests'), where('uid', '==', profile.uid));
    const unsubWith = onSnapshot(qWith, (snapshot) => {
      const withList: WithdrawRequest[] = [];
      snapshot.forEach((docSnap) => {
        withList.push({ ...docSnap.data(), id: docSnap.id } as WithdrawRequest);
      });
      setMyWithdrawals(withList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'withdraw_requests');
    });

    // 5. Transaction Logs
    const qTx = query(collection(db, 'transaction_logs'), where('uid', '==', profile.uid));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const txList: TransactionLog[] = [];
      snapshot.forEach((docSnap) => {
        txList.push({ ...docSnap.data(), id: docSnap.id } as TransactionLog);
      });
      setMyTxLogs(txList.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transaction_logs');
    });

    // 6. Referral Earnings payouts
    const qPayout = query(collection(db, 'referral_history'), where('referrerUid', '==', profile.uid));
    const unsubPayout = onSnapshot(qPayout, (snapshot) => {
      const refRecs: ReferralHistoryRecord[] = [];
      snapshot.forEach((docSnap) => {
        refRecs.push({ ...docSnap.data(), id: docSnap.id } as ReferralHistoryRecord);
      });
      setReferralPayouts(refRecs.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'referral_history');
    });

    // 7. Referral list (users referred by me)
    const qReferred = query(collection(db, 'users'), where('referredBy', '==', profile.uid));
    const unsubReferred = onSnapshot(qReferred, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setMyReferrals(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // 8. Notifications
    const qNotif = query(collection(db, 'notifications'), where('uid', '==', profile.uid));
    const unsubNotif = onSnapshot(qNotif, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Notification);
      });
      setNotifications(list.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // 9. Support tickets
    const qTickets = query(collection(db, 'support_tickets'), where('uid', '==', profile.uid));
    const unsubTickets = onSnapshot(qTickets, (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as SupportTicket);
      });
      setTickets(list.sort((a,b) => b.lastActivityAt - a.lastActivityAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    });

    // 10. Task Completions
    const qCompletions = query(collection(db, 'task_completions'), where('uid', '==', profile.uid));
    const unsubCompletions = onSnapshot(qCompletions, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      setTaskCompletions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'task_completions');
    });

    return () => {
      unsubPlans();
      unsubInvest();
      unsubDep();
      unsubWith();
      unsubTx();
      unsubPayout();
      unsubReferred();
      unsubNotif();
      unsubTickets();
      unsubCompletions();
    };
  }, [profile.uid]);

  // Handle active ticket chat log
  useEffect(() => {
    if (!activeTicket) return;
    const qMsgs = query(collection(db, `support_tickets/${activeTicket.id}/messages`), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
      const list: TicketMessage[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as TicketMessage);
      });
      setTicketMessages(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `support_tickets/${activeTicket.id}/messages`);
    });
    return unsubMsgs;
  }, [activeTicket]);

  // Automatically check & distribute accumulated daily bonuses!
  // Checks if 24 hours have passed since either purchasedAt OR lastBonusClaimedAt.
  // Utilizes secure world network clocks to prevent users from manipulating their device system time.
  useEffect(() => {
    const runAutomaticBonusCheckAndClaim = async () => {
      if (myInvestments.length === 0) return;

      let now = Date.now();
      let secureTimeFetched = false;

      try {
        // Fetch accurate global UTC time to detect and block local clock tampering
        const timeResponse = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { signal: AbortSignal.timeout(3500) });
        if (timeResponse.ok) {
          const timeData = await timeResponse.json();
          if (timeData && typeof timeData.unixtime === 'number') {
            now = timeData.unixtime * 1000;
            secureTimeFetched = true;
          }
        }
      } catch (err) {
        console.warn("Primary world time API failed, trying backup source:", err);
      }

      // Backup global clock source if local device clock safety check is still pending
      if (!secureTimeFetched) {
        try {
          const backupRes = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { signal: AbortSignal.timeout(3550) });
          if (backupRes.ok) {
            const backupData = await backupRes.json();
            if (backupData && backupData.dateTime) {
              const parsedDate = Date.parse(backupData.dateTime);
              if (!isNaN(parsedDate)) {
                now = parsedDate;
                secureTimeFetched = true;
              }
            }
          }
        } catch (backupErr) {
          console.warn("All secure timezone APIs failed; falling back to synchronized device clock:", backupErr);
        }
      }

      for (const invest of myInvestments) {
        if (invest.status === 'expired') continue;
        
        // Calculate days relative to purchase
        // Standard time: 24h = 86400000ms.
        const oneDayMs = 24 * 60 * 60 * 1000;
        const timeElapsed = now - invest.lastBonusClaimedAt;
        const daysToClaim = Math.floor(timeElapsed / oneDayMs);

        if (daysToClaim >= 1) {
          const maxRemainingDays = Math.max(0, (invest.durationDays || 30) - invest.daysClaimed);
          const actualDaysToClaim = Math.min(daysToClaim, maxRemainingDays);

          if (actualDaysToClaim <= 0) {
            // Already hit the maximum limits
            const investDocRef = doc(db, 'user_investments', invest.id);
            await updateDoc(investDocRef, { status: 'expired' });
            continue;
          }

          const dailyCredit = invest.dailyBonus * actualDaysToClaim;
          const totalDaysCompleted = invest.daysClaimed + actualDaysToClaim;
          const reachedExpiry = totalDaysCompleted >= (invest.durationDays || 30);

          // Batch database updates
          const investDocRef = doc(db, 'user_investments', invest.id);
          const userDocRef = doc(db, 'users', profile.uid);

          const updatedClaimedAt = invest.lastBonusClaimedAt + (actualDaysToClaim * oneDayMs);

          // Update active investment days and status
          await updateDoc(investDocRef, {
            daysClaimed: totalDaysCompleted,
            lastBonusClaimedAt: updatedClaimedAt,
            status: reachedExpiry ? 'expired' : 'active'
          });

          // Add bonus details to user wallet
          await updateDoc(userDocRef, {
            walletBalance: profile.walletBalance + dailyCredit,
            totalEarned: profile.totalEarned + dailyCredit
          });

          // Log transaction
          await addDoc(collection(db, 'transaction_logs'), {
            uid: profile.uid,
            userEmail: profile.email,
            amount: dailyCredit,
            type: 'bonus',
            details: `Auto Daily Bonus credited for ${invest.planName} (${actualDaysToClaim} Days × ৳${invest.dailyBonus})`,
            createdAt: Date.now()
          });

          // Add notification
          await addDoc(collection(db, 'notifications'), {
            uid: profile.uid,
            title: 'Daily Bonus Credited!',
            message: `৳${dailyCredit} daily bonus was added automatically from plan: ${invest.planName}.`,
            read: false,
            createdAt: Date.now()
          });
        }
      }
    };

    runAutomaticBonusCheckAndClaim();
  }, [myInvestments, profile.walletBalance]);

  // Ad-watching countdown timer effect
  useEffect(() => {
    let timerId: any;
    if (activeAd && countdown > 0) {
      timerId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            setCanClaim(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeAd, countdown]);

  const handleStartTask = (ad: AdTask) => {
    // 1. Calculate active investments total tasks limit based on the count of active plan tasks
    const activeInvests = myInvestments.filter(i => i.status === 'active');
    
    // Construct all tasks available to the user based on their active plans
    const userActivePlanTasks: any[] = [];
    activeInvests.forEach((invest) => {
      const tasks = invest.tasks || [
        { id: 'task_1', title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: invest.dailyBonus / 5 },
        { id: 'task_2', title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', duration: 10, reward: invest.dailyBonus / 5 },
        { id: 'task_3', title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', duration: 10, reward: invest.dailyBonus / 5 },
        { id: 'task_4', title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', duration: 10, reward: invest.dailyBonus / 5 },
        { id: 'task_5', title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', duration: 10, reward: invest.dailyBonus / 5 }
      ];
      tasks.forEach((t: any) => {
        userActivePlanTasks.push({
          ...t,
          uniqueTaskId: `${invest.id}_${t.id}`
        });
      });
    });

    const totalLimit = userActivePlanTasks.length;

    // 2. Count completed tasks today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    
    // Check completed tasks that are actually part of current active plans
    const completedToday = taskCompletions.filter(tc => 
      userActivePlanTasks.some(ut => ut.uniqueTaskId === tc.adId)
    ).length;

    if (completedToday >= totalLimit) {
      alert(`⚠️ You have reached your daily limit of ${totalLimit} tasks. Upgrade your plan or buy more plans to get more daily tasks!`);
      return;
    }

    setActiveAd(ad);
    setCountdown(ad.duration || 10);
    setCanClaim(false);
    setAdSuccess('');
  };

  const handleClaimAdReward = async () => {
    if (!activeAd || !canClaim || claimingAd) return;
    setClaimingAd(true);
    try {
      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();

      // Double-check limits
      const activeInvests = myInvestments.filter(i => i.status === 'active');
      const userActivePlanTasks: any[] = [];
      activeInvests.forEach((invest) => {
        const tasks = invest.tasks || [
          { id: 'task_1', title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: invest.dailyBonus / 5 },
          { id: 'task_2', title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', duration: 10, reward: invest.dailyBonus / 5 },
          { id: 'task_3', title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', duration: 10, reward: invest.dailyBonus / 5 },
          { id: 'task_4', title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', duration: 10, reward: invest.dailyBonus / 5 },
          { id: 'task_5', title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', duration: 10, reward: invest.dailyBonus / 5 }
        ];
        tasks.forEach((t: any) => {
          userActivePlanTasks.push({
            ...t,
            uniqueTaskId: `${invest.id}_${t.id}`
          });
        });
      });

      const totalLimit = userActivePlanTasks.length;
      const completedToday = taskCompletions.filter(tc => 
        userActivePlanTasks.some(ut => ut.uniqueTaskId === tc.adId)
      ).length;

      if (completedToday >= totalLimit) {
        alert("⚠️ You have already completed your maximum daily tasks!");
        setActiveAd(null);
        setClaimingAd(false);
        return;
      }

      const rewardAmt = activeAd.reward || 10;
      const uniqueAdId = (activeAd as any).uniqueTaskId || activeAd.id;
      const planLabel = (activeAd as any).planName ? `Plan: ${(activeAd as any).planName}` : 'Sponsor Ad';

      // 1. Record task completion
      await addDoc(collection(db, 'task_completions'), {
        uid: profile.uid,
        userEmail: profile.email,
        adId: uniqueAdId,
        adTitle: `${activeAd.title} (${planLabel})`,
        reward: rewardAmt,
        completedAt: now,
        dateStr: new Date(now).toISOString().split('T')[0]
      });

      // 2. Add BDT reward to user's wallet balance
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        walletBalance: profile.walletBalance + rewardAmt,
        totalEarned: profile.totalEarned + rewardAmt
      });

      // 3. Log Transaction
      await addDoc(collection(db, 'transaction_logs'), {
        uid: profile.uid,
        userEmail: profile.email,
        amount: rewardAmt,
        type: 'bonus',
        details: `Completed Daily Task: "${activeAd.title}" (${planLabel}) (৳${rewardAmt} credited)`,
        createdAt: now
      });

      // 4. Create Notification
      await addDoc(collection(db, 'notifications'), {
        uid: profile.uid,
        title: 'Task Reward Credited! 🎉',
        message: `৳${rewardAmt} BDT has been credited to your wallet for completing task: "${activeAd.title}" (${planLabel}).`,
        read: false,
        createdAt: now
      });

      setAdSuccess(`🎉 Successfully completed! ৳${rewardAmt} BDT credited to your wallet.`);
      setTimeout(() => {
        setActiveAd(null);
        setAdSuccess('');
        setClaimingAd(false);
      }, 2500);

    } catch (err: any) {
      alert("Error claiming task reward: " + err.message);
      setClaimingAd(false);
    }
  };

  // FAST FORWARD SIMULATION (Deactivated based on seller rules & security policies)
  const triggerFastForwardSimulator = async (investId: string) => {
    // Completely deactivated to enforce exact 24-hour schedules with zero manual intervention.
    return;
  };

  const copyReferralUrl = () => {
    const shareableUrl = `${window.location.origin}/?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Buy Investment Plan Handler
  const handlePurchasePlan = async (plan: InvestmentPlan) => {
    if (plan.cost === 0 || plan.id === 'plan_free' || plan.name.toLowerCase().includes('free')) {
      const alreadyHasFree = myInvestments.some(i => i.planId === plan.id || i.cost === 0 || i.planName.toLowerCase().includes('free'));
      if (alreadyHasFree) {
        alert("⚠️ You have already subscribed to the Free Mplan! Each account is allowed only 1 Free Mplan subscription. Please upgrade to a paid premium plan to unlock more daily tasks and bigger cash bonuses.");
        return;
      }
    }

    if (profile.walletBalance < plan.cost) {
      alert(`⚠️ Insufficient wallet balance to purchase this plan. Current Balance: ৳${profile.walletBalance}, Plan Cost: ৳${plan.cost}. Please deposit money first.`);
      setActiveTab('deposit');
      return;
    }

    setConfirmPurchasePlan(plan);
  };

  const executePurchasePlan = async (plan: InvestmentPlan) => {
    setConfirmPurchasePlan(null);
    try {
      const now = Date.now();
      const expiresAt = now + (plan.durationDays * 24 * 60 * 60 * 1000);

      if (plan.cost === 0 || plan.id === 'plan_free' || plan.name.toLowerCase().includes('free')) {
        const alreadyHasFree = myInvestments.some(i => i.planId === plan.id || i.cost === 0 || i.planName.toLowerCase().includes('free'));
        if (alreadyHasFree) {
          alert("⚠️ You can only subscribe to the Free Mplan once per account!");
          return;
        }
      }

      // 1. Create User Investment
      const defaultTasks = [
        { id: 'task_1', title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: plan.dailyBonus / 5 },
        { id: 'task_2', title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', duration: 10, reward: plan.dailyBonus / 5 },
        { id: 'task_3', title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', duration: 10, reward: plan.dailyBonus / 5 },
        { id: 'task_4', title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', duration: 10, reward: plan.dailyBonus / 5 },
        { id: 'task_5', title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', duration: 10, reward: plan.dailyBonus / 5 }
      ];
      const tasksToSave = plan.tasks && plan.tasks.length > 0 ? plan.tasks : defaultTasks;

      await addDoc(collection(db, 'user_investments'), {
        uid: profile.uid,
        userEmail: profile.email,
        planId: plan.id,
        planName: plan.name,
        cost: plan.cost,
        dailyBonus: plan.dailyBonus,
        purchasedAt: now,
        expiresAt: expiresAt,
        lastBonusClaimedAt: now,
        daysClaimed: 0,
        status: 'active',
        durationDays: plan.durationDays,
        dailyTasks: plan.dailyTasks || 5,
        tasks: tasksToSave
      });

      // 2. Subtract user wallet balance
      const newBalance = profile.walletBalance - plan.cost;
      const newInvested = profile.totalInvested + plan.cost;
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        walletBalance: newBalance,
        totalInvested: newInvested
      });

      // 3. Log transaction
      await addDoc(collection(db, 'transaction_logs'), {
        uid: profile.uid,
        userEmail: profile.email,
        amount: plan.cost,
        type: 'investment',
        details: `Subscribed to investment plan: ${plan.name}`,
        createdAt: now
      });

      // 4. Send notification
      await addDoc(collection(db, 'notifications'), {
        uid: profile.uid,
        title: 'Investment Activated! 🚀',
        message: `Congratulations! ${plan.name} is now active. Daily payout of ৳${plan.dailyBonus} is pending automated credits.`,
        read: false,
        createdAt: now
      });

      setPurchaseSuccessAlert({
        show: true,
        title: "PORTFOLIO ACTIVATED! 🎉",
        msg: `Your acquisition of the "${plan.name}" plan has been verified. ৳${plan.cost} BDT was deducted from your wallet balance, and you will receive ৳${plan.dailyBonus} daily payout.`
      });
    } catch (err: any) {
      alert("Activation error: " + err.message);
    }
  };

  // Submit Deposit Request
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositSuccessAlert('');
    
    const amount = Number(depositAmount);
    if (!amount || amount < 500 || amount > 20000) {
      alert("Deposit amount must be between ৳500 and ৳20000 BDT.");
      return;
    }

    if (!depositTxId.trim()) {
      alert("Transaction ID is required to authorize requests.");
      return;
    }

    setDepositLoading(true);
    try {
      const slipProof = depositProof || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120"; // standard transaction proof fallback
      
      await addDoc(collection(db, 'deposit_requests'), {
        uid: profile.uid,
        userEmail: profile.email,
        phone: profile.phone,
        paymentMethod: depositMethod,
        amount: amount,
        transactionId: depositTxId,
        proofScreenshot: slipProof,
        status: 'pending',
        createdAt: Date.now()
      });

      setDepositSuccessAlert(`Deposit Request of ৳${amount} via ${depositMethod} has been submitted! It is currently pending Admin verification.`);
      setDepositAmount('');
      setDepositTxId('');
      setDepositProof('');
    } catch (err: any) {
      alert("Error submitting request: " + err.message);
    } finally {
      setDepositLoading(false);
    }
  };

  const uploadDemoSlipMock = () => {
    const demoBase64 = "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=300"; // beautifully simulated receipt icon
    setDepositProof(demoBase64);
    alert("Sample payment slip proof uploaded successfully! You can now click Submit Deposit.");
  };

  // Submit Withdrawal Request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawErrorAlert('');
    setWithdrawSuccessAlert('');

    const amount = Number(withdrawAmount);
    if (!amount || amount < 200 || amount > 20000) {
      setWithdrawErrorAlert("Withdrawal amount must be between ৳200 and ৳20000 BDT.");
      return;
    }

    if (amount > profile.walletBalance) {
      setWithdrawErrorAlert(`Insufficient wallet balance. You can withdraw up to ৳${profile.walletBalance} BDT.`);
      return;
    }

    if (!withdrawTarget.trim()) {
      setWithdrawErrorAlert("Please enter your designated bKash/Nagad/Rocket account mobile number.");
      return;
    }

    setWithdrawLoading(true);
    try {
      // Create request first
      await addDoc(collection(db, 'withdraw_requests'), {
        uid: profile.uid,
        userEmail: profile.email,
        paymentMethod: withdrawMethod,
        amount: amount,
        targetNumber: withdrawTarget,
        status: 'pending',
        createdAt: Date.now()
      });

      // Deduct balance from profile immediately so they can't double-spend while request is pending!
      // If admin rejects the withdrawal, we refund the amount! Excellent state hygiene.
      const newBalance = profile.walletBalance - amount;
      const userDocRef = doc(db, 'users', profile.uid);
      await updateDoc(userDocRef, {
        walletBalance: newBalance,
        totalWithdrawn: profile.totalWithdrawn + amount
      });

      // log transaction
      await addDoc(collection(db, 'transaction_logs'), {
        uid: profile.uid,
        userEmail: profile.email,
        amount: amount,
        type: 'withdraw',
        details: `Pending withdrawal requested: ৳${amount} via ${withdrawMethod} to ${withdrawTarget}`,
        createdAt: Date.now()
      });

      setWithdrawSuccessAlert(`Withdrawal of ৳${amount} submitted! Balance deducted. If rejected, funds recur immediately.`);
      setWithdrawAmount('');
      setWithdrawTarget('');
    } catch (err: any) {
      setWithdrawErrorAlert(err.message || 'Error occurred during withdrawal process.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Support Ticket Handlers
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMsg.trim()) return;

    setTicketLoading(true);
    try {
      const now = Date.now();
      const ticketRef = await addDoc(collection(db, 'support_tickets'), {
        uid: profile.uid,
        userEmail: profile.email,
        subject: newTicketSubject,
        message: newTicketMsg,
        status: 'open',
        createdAt: now,
        lastActivityAt: now
      });

      // Write initial message inside child sub-collection
      await addDoc(collection(db, `support_tickets/${ticketRef.id}/messages`), {
        ticketId: ticketRef.id,
        senderUid: profile.uid,
        senderRole: 'user',
        senderEmail: profile.email,
        message: newTicketMsg,
        createdAt: now
      });

      setNewTicketSubject('');
      setNewTicketMsg('');
      alert("Support Ticket created successfully! Go to Active Tickets tab to response.");
    } catch (err: any) {
      alert("Ticket design error: " + err.message);
    } finally {
      setTicketLoading(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    try {
      const now = Date.now();
      await addDoc(collection(db, `support_tickets/${activeTicket.id}/messages`), {
        ticketId: activeTicket.id,
        senderUid: profile.uid,
        senderRole: 'user',
        senderEmail: profile.email,
        message: replyText,
        createdAt: now
      });

      // update support ticket status of lastActivity
      const ticketRef = doc(db, 'support_tickets', activeTicket.id);
      await updateDoc(ticketRef, {
        status: 'open', // re-opens or triggers open state
        lastActivityAt: now
      });

      setReplyText('');
    } catch (err: any) {
      alert("Message sending error: " + err.message);
    }
  };

  // Simulate OTP Phone & Email Verification
  const startVerificationFlow = (type: 'phone' | 'email') => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedCode(code);
    setVerificationCode('');
    setVerificationModal(type);
    
    setTimeout(() => {
      alert(`[SIMULATION ALERT] Dynamic Verification Pin sent to your registered ${type === 'phone' ? 'Phone SMS' : 'Email Address'}: [ ${code} ]`);
    }, 800);
  };

  const completeSimulationVerification = async () => {
    if (verificationCode !== simulatedCode) {
      alert("Incorrect pin entered. Please retry or click Simulated Verification button again.");
      return;
    }

    setVerificationLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const isPhone = verificationModal === 'phone';

      if (isPhone) {
        await updateDoc(userRef, { isPhoneVerified: true });
        
        // Add congratulations notification
        await addDoc(collection(db, 'notifications'), {
          uid: profile.uid,
          title: 'Phone Number Verified! ✅',
          message: 'Your phone number was verified successfully. Standard premium security clearance upgraded.',
          read: false,
          createdAt: Date.now()
        });
      } else {
        await updateDoc(userRef, { isEmailVerified: true });
        
        // Add email congratulations notification
        await addDoc(collection(db, 'notifications'), {
          uid: profile.uid,
          title: 'Email Address Verified! ✅',
          message: 'Your personal email address was authorized successfully. Secure receipts feature active.',
          read: false,
          createdAt: Date.now()
        });
      }

      setVerificationModal(null);
      alert(`Success! Your account ${isPhone ? 'Phone' : 'Email'} is now verified!`);
    } catch (err: any) {
      alert("Verification update failed: " + err.message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const markAllNotifAsRead = async () => {
    for (const notif of notifications) {
      if (!notif.read) {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      }
    }
  };

  const isDark = theme === 'dark';
  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 font-sans flex flex-col md:flex-row transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* 1. SIDE NAVIGATION BAR (FOR DESKTOP) */}
      <aside className={`hidden md:flex flex-col w-64 border-r transition-all duration-300 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-zinc-800/40 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Wallet className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Smart Deposit</h1>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">User Portal</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1">
          <button 
            id="nav-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><Compass className="w-4 h-4" /> Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tasks' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><Tv className="w-4 h-4 text-amber-400" /> Daily Ads Tasks</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-deposit"
            onClick={() => setActiveTab('deposit')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'deposit' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><ArrowUpRight className="w-4 h-4" /> Request Deposit</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-withdraw"
            onClick={() => setActiveTab('withdraw')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'withdraw' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><ArrowDownLeft className="w-4 h-4" /> Withdraw Earnings</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-history"
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><History className="w-4 h-4" /> Transaction History</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-referrals"
            onClick={() => setActiveTab('referrals')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'referrals' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><Users className="w-4 h-4" /> Referral Network</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-tickets"
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'tickets' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><MessageSquare className="w-4 h-4" /> Support Tickets</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-notifications"
            onClick={() => { setActiveTab('notifications'); markAllNotifAsRead(); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5 relative">
              <Bell className="w-4 h-4" /> 
              Notifications
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 py-0.2 rounded-full scale-90">
                  {unreadNotifs}
                </span>
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button 
            id="nav-profile"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <span className="flex items-center gap-2.5"><UserIcon className="w-4 h-4" /> My Profile</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Dashboard bottom user card */}
        <div className="p-4 border-t border-zinc-800/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold truncate leading-tight">{profile.fullName}</h4>
              <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{profile.email}</p>
            </div>
          </div>
          <button 
            id="btn-logout"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* 2. CHOSEN WORKSPACE WINDOW */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Core Mobile and Top Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="md:hidden p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Wallet className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">
                {activeTab === 'dashboard' ? 'Overview' : activeTab}
              </span>
              <h2 className="text-sm font-extrabold tracking-tight">
                {profile.fullName}'s Dashboard
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile.role === 'admin' && (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                ADMIN ACCESS
              </span>
            )}
            
            {/* Dark & Light toggle buttons */}
            <button 
              id="theme-toggler"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-xl border transition-all ${
                isDark ? 'border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Header logout button */}
            <button 
              id="header-logout"
              onClick={onLogout}
              className={`p-2 px-3 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-bold ${
                isDark 
                  ? 'border-zinc-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20' 
                  : 'border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Running Notice Marquee */}
        {systemSettings.notices && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/15 py-2.5 px-6 overflow-hidden flex items-center gap-3">
            <span className="bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow">NOTICE</span>
            <div className="flex-1 overflow-hidden relative h-5">
              <div className="absolute whitespace-nowrap animate-marquee text-xs font-semibold text-emerald-400/95">
                {systemSettings.notices}
              </div>
            </div>
          </div>
        )}

        {/* Content container view */}
        <div className="p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6 flex-1">
          
          {/* PROFILE VALIDATION NOTICES (CRITICAL FEATURE VERIFICATION ALERTS) */}
          {(!profile.isPhoneVerified || !profile.isEmailVerified) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 md:mt-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-400">Security Actions Needed</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Please verify your registered phone number and email address to remove all withdraw constraints.</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!profile.isPhoneVerified && (
                  <button 
                    id="btn-verify-phone"
                    onClick={() => startVerificationFlow('phone')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    Verify Phone
                  </button>
                )}
                {!profile.isEmailVerified && (
                  <button 
                    id="btn-verify-email"
                    onClick={() => startVerificationFlow('email')}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-500 font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    Verify Email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* DYNAMIC COMPONENT TAB LAYOUTS */}

          {/* A. DASHBOARD VIEW (HOME) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Promo Banner Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900/40 to-emerald-950/20 border border-emerald-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="space-y-2 z-10 text-center md:text-left">
                  <h3 className="text-lg font-black text-white">{systemSettings.bannerTitle || "Premium Smart Investment"}</h3>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{systemSettings.bannerMessage || "Participate in flexible plans today."}</p>
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                    <Flame className="w-3.5 h-3.5" /> High Demand Active Portfolios
                  </p>
                </div>
                <button 
                  id="btn-action-viewplan"
                  onClick={() => {
                    const el = document.getElementById('plans-grid-section');
                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-2xl shadow-lg transition-transform hover:-translate-y-0.5 shrink-0"
                >
                  Acquire Plans
                </button>
              </div>

              {/* Official Notice Board */}
              {systemSettings.notices && (
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-amber-500/5 border-amber-500/15 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'} relative overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-4 shadow-md`}>
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl shrink-0 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">Official Notice Board Announcement</h4>
                    <p className="text-xs leading-relaxed opacity-90">{systemSettings.notices}</p>
                  </div>
                </div>
              )}

              {/* Wallet & Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} relative overflow-hidden transition-all hover:border-emerald-500/30`}>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 inline-block mb-3">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Wallet Balance</span>
                  <p className="text-2xl font-black text-emerald-500 mt-1">৳{profile.walletBalance.toLocaleString()}</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} relative overflow-hidden transition-all hover:border-emerald-500/30`}>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 inline-block mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Investments</span>
                  <p className="text-2xl font-black text-white mt-1">৳{profile.totalInvested.toLocaleString()}</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} relative overflow-hidden transition-all hover:border-emerald-500/30`}>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 inline-block mb-3">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Earned</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">৳{profile.totalEarned.toLocaleString()}</p>
                </div>

                <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} relative overflow-hidden transition-all hover:border-emerald-500/30`}>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 inline-block mb-3">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Withdrawn</span>
                  <p className="text-2xl font-black text-rose-500 mt-1">৳{profile.totalWithdrawn.toLocaleString()}</p>
                </div>

              </div>

              {/* AVAILABLE INVESTMENT PLANS SECTION */}
              <div id="plans-grid-section" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-bold">Recommended Plans</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Choose your investment portfolio to receive daily recurring bonus rewards.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {allPlans.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-xs text-slate-500">No active investment plans available right now.</div>
                  ) : (
                    allPlans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-6 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden hover:border-emerald-500 hover:shadow-lg ${
                          isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-xl">VIP Package</span>
                            <span className="text-xs font-semibold text-slate-400">৳{plan.cost} Cost</span>
                          </div>
                          <h4 className="text-md font-black tracking-tight">{plan.name}</h4>
                          <p className="text-slate-500 text-xs mt-1.5">Accrue guaranteed daily profits credited directly to your digital vault.</p>

                          {/* Stats parameters */}
                          <div className="my-6 space-y-2 border-t border-b border-zinc-800/40 py-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Daily Profit:</span>
                              <span className="font-bold text-emerald-400">৳{plan.dailyBonus}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Duration:</span>
                              <span className="font-bold text-white">{plan.durationDays} Days</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Total Return:</span>
                              <span className="font-black text-emerald-500">৳{plan.dailyBonus * plan.durationDays}</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          id={`btn-buy-${plan.id}`}
                          onClick={() => handlePurchasePlan(plan)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-2xl text-xs uppercase tracking-wider block text-center shadow transition-all"
                        >
                          Unlock Portfolio
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* USER'S ONGOING ACTIVE INVESTMENTS TABLE */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-bold">My Subscribed Plans</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Manage and track your active, ongoing revenue-generating portfolios.</p>
                  </div>
                </div>

                <div className={`border rounded-3xl overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  {myInvestments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">You do not have any subscribed portfolios yet. Choose an investment above!</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-zinc-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                            <th className="p-4">Portfolio Plan</th>
                            <th className="p-4">Purchase Price</th>
                            <th className="p-4">Daily Yield</th>
                            <th className="p-4">Accrued Yield</th>
                            <th className="p-4">Claimed Duration</th>
                            <th className="p-4">Investment State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {myInvestments.map((invest) => {
                            const isExpired = invest.status === 'expired';
                            return (
                              <tr key={invest.id} className="hover:bg-zinc-800/20">
                                <td className="p-4 font-bold text-white">{invest.planName}</td>
                                <td className="p-4 text-emerald-500 font-semibold">৳{invest.cost}</td>
                                <td className="p-4 text-emerald-400 font-semibold">৳{invest.dailyBonus}/day</td>
                                <td className="p-4 text-emerald-555 font-bold">৳{invest.daysClaimed * invest.dailyBonus}</td>
                                <td className="p-4 text-slate-400">{invest.daysClaimed} / {invest.durationDays || 30} Days</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                    isExpired ? 'bg-zinc-850 border border-zinc-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {invest.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* B. DEPOSIT SYSTEMS VIEW */}
          {activeTab === 'deposit' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Deposit submission form */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <h3 className="text-md font-bold mb-1">Make Deposit Request</h3>
                <p className="text-xs text-slate-400 mb-6">Enter details of manual mobile cash transfers to request wallet balance sync.</p>

                {depositSuccessAlert && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-semibold leading-relaxed">
                    {depositSuccessAlert}
                  </div>
                )}

                <form onSubmit={handleDepositSubmit} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Payment Gateway</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          id={`deposit-method-${method}`}
                          onClick={() => setDepositMethod(method)}
                          className={`p-3 rounded-2xl text-xs font-bold border transition-all ${
                            depositMethod === method 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                              : 'border-zinc-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Deposit Amount (৳ BDT)</label>
                    <input
                      id="deposit-amount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500">Min. Deposit: ৳500 | Max: ৳20,000</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Sender Mobile / Tx ID</label>
                    <input
                      id="deposit-txid"
                      type="text"
                      value={depositTxId}
                      onChange={(e) => setDepositTxId(e.target.value)}
                      placeholder="e.g. TRx81739210B"
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Upload Transaction Receipt / Screenshot</label>
                    <div className="border border-dashed border-zinc-850 p-4 rounded-2xl text-center space-y-3">
                      <p className="text-[10px] text-slate-500">Provide an image or copy transaction receipt details here.</p>
                      
                      {depositProof ? (
                        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-500/5 py-1.5 rounded-xl border border-emerald-500/10">
                          <Check className="w-4 h-4" /> Proof uploaded successfully.
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="btn-upload-receipt-mock"
                          onClick={uploadDemoSlipMock}
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-705 text-white font-bold text-[10px] uppercase tracking-wider transition-all"
                        >
                          Generate Sample Screenshot
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    id="btn-deposit-submit"
                    type="submit"
                    disabled={depositLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-white mt-4 transition-all disabled:opacity-50"
                  >
                    {depositLoading ? 'Submitting request...' : 'Validate Deposit'}
                  </button>
                </form>
              </div>

              {/* Gateway instructions & pending lists */}
              <div className="space-y-6">
                
                {/* Gateway addresses */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Official Payment Addresses</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                      <div>
                        <p className="text-xs font-extrabold text-white">bKash (Manual Cash Out)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{systemSettings.bkashNumber || "017XXXXXXXX"}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">Active</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                      <div>
                        <p className="text-xs font-extrabold text-white">Nagad (Manual Cash Out)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{systemSettings.nagadNumber || "019XXXXXXXX"}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">Active</span>
                    </div>

                    <div className="flex justify-between items-center pb-1">
                      <div>
                        <p className="text-xs font-extrabold text-white">Rocket (Manual Cash Out)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{systemSettings.rocketNumber || "015XXXXXXXX"}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">Active</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800 mt-4">
                    <p className="text-[9px] text-slate-500 leading-normal">
                      ⚠️ Instruction: Please send the designated amount to any above manual wallet first, copy your Transaction Reference ID, and fill details accurately. Admin approval takes 1-3 hours.
                    </p>
                  </div>
                </div>

                {/* Micro deposit request log */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-bold mb-4">My Deposit History</h4>
                  
                  {myDeposits.length === 0 ? (
                    <p className="text-xs text-slate-500">No deposit history logs cataloged.</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {myDeposits.slice(0, 5).map((dep) => (
                        <div key={dep.id} className="flex justify-between items-center bg-zinc-950/20 p-3 rounded-xl border border-zinc-850">
                          <div>
                            <p className="text-[11px] font-extrabold text-white">৳{dep.amount} ({dep.paymentMethod})</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">TRX: {dep.transactionId}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            dep.status === 'approved' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : dep.status === 'rejected' 
                                ? 'bg-rose-500/10 text-rose-400' 
                                : 'bg-amber-300/10 text-amber-400'
                          }`}>
                            {dep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* C. WITHDRAWAL SYSTEMS VIEW */}
          {activeTab === 'withdraw' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Withdraw submit form */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <h3 className="text-md font-bold mb-1">Request Withdrawal</h3>
                <p className="text-xs text-slate-400 mb-6">Convert your dynamic wallet balance into direct cash BDT payouts.</p>

                {withdrawErrorAlert && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
                    {withdrawErrorAlert}
                  </div>
                )}

                {withdrawSuccessAlert && (
                  <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
                    {withdrawSuccessAlert}
                  </div>
                )}

                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Receiving Gateway</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          id={`withdraw-method-${method}`}
                          onClick={() => setWithdrawMethod(method)}
                          className={`p-3 rounded-2xl text-xs font-bold border transition-all ${
                            withdrawMethod === method 
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                              : 'border-zinc-805 text-slate-400 hover:text-white'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Amount to Withdraw (৳ BDT)</label>
                    <input
                      id="withdraw-amount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500">Min. Withdraw: ৳200 | Max: ৳20,000</span>
                      <span className="text-[10px] text-slate-400">Available: <strong className="text-emerald-400">৳{profile.walletBalance}</strong></span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Target Wallet Address / Number</label>
                    <input
                      id="withdraw-target"
                      type="tel"
                      value={withdrawTarget}
                      onChange={(e) => setWithdrawTarget(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                  </div>

                  <button
                    id="btn-withdraw-submit"
                    type="submit"
                    disabled={withdrawLoading || profile.walletBalance < 200}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-white mt-4 transition-all disabled:opacity-50"
                  >
                    {withdrawLoading ? 'Authorizing Withdrawal...' : 'Request Cashout'}
                  </button>
                </form>
              </div>

              {/* Rules and logs */}
              <div className="space-y-6">
                
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4 font-black">Security Withdrawal Directives</h4>
                  
                  <ul className="space-y-2 text-xs text-slate-400 leading-relaxed list-disc list-inside">
                    <li>Withdraws take 1-6 hours to complete depending on platform volume.</li>
                    <li>Verify your phone/email to avoid any security freezes.</li>
                    <li>If a withdraw is rejected, your funds will instantly credit back to your balance.</li>
                    <li>Maximum daily withdraw frequency: 3 requests per account.</li>
                  </ul>
                </div>

                {/* Withdrawal requests history log */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-bold mb-4">My Payout History</h4>
                  
                  {myWithdrawals.length === 0 ? (
                    <p className="text-xs text-slate-500">No withdrawal requests filed yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {myWithdrawals.slice(0, 5).map((w) => (
                        <div key={w.id} className="flex justify-between items-center bg-zinc-950/20 p-3 rounded-xl border border-zinc-850">
                          <div>
                            <p className="text-[11px] font-extrabold text-white">৳{w.amount} ({w.paymentMethod})</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Acc No: {w.targetNumber}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            w.status === 'approved' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : w.status === 'rejected' 
                                ? 'bg-rose-500/10 text-rose-400' 
                                : 'bg-amber-300/10 text-amber-400'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* D. TRANSACTION & EARNINGS HISTORY */}
          {activeTab === 'history' && (
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
              <div className="mb-6">
                <h3 className="text-md font-bold mb-1">Account Statements</h3>
                <p className="text-xs text-slate-400">Statement audit logs tracking deposits, payouts, bonuses, and portfolio transactions.</p>
              </div>

              {myTxLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No transactions recorded for this account.</div>
              ) : (
                <div className="space-y-3">
                  {myTxLogs.map((log) => {
                    const isCredit = ['deposit', 'bonus', 'referral'].includes(log.type);
                    return (
                      <div key={log.id} className="flex justify-between items-center bg-zinc-950/20 p-4 rounded-2xl border border-zinc-850/60 hover:bg-zinc-900/30 transition-all">
                        <div className="flex gap-3">
                          <span className={`p-2 rounded-xl text-xs font-bold shrink-0 self-center ${
                            isCredit 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white leading-snug">{log.details}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`text-md font-black shrink-0 ${isCredit ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {isCredit ? '+' : '-'} ৳{log.amount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* E. REFERRALS NETWORK */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Referral stats */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-6`}>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-1">Invite Collaborators</h3>
                    <p className="text-xs text-slate-400">Share your referral address. You will receive an instant ৳{systemSettings.referralValue}{systemSettings.referralType === 'percentage' ? '%' : ' BDT'} commission as soon as your referrals perform a successful plan deposit!</p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Your Private Referral Address</label>
                    <div className="flex gap-2">
                      <input
                        id="user-referral-url"
                        type="text"
                        readOnly
                        value={`${window.location.origin}/?ref=${profile.referralCode}`}
                        className="flex-1 px-3 py-2.5 rounded-xl text-xs bg-zinc-950 border border-zinc-800 text-slate-300 outline-none select-all"
                      />
                      <button 
                        id="copy-referral-btn"
                        onClick={copyReferralUrl}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-4 rounded-xl flex items-center gap-1 transition-all shrink-0"
                      >
                        {copied ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/40 pt-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Registered Referrals</span>
                      <p className="text-xl font-bold text-white mt-1">{myReferrals.length} Members</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Commissions</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">৳{profile.referralCommissionEarned.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Referral system rules rules */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">Referral Rules & Commissions</h4>
                  
                  <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
                    <p>Commission calculations are fully automated. When a user creates an account utilizing your invite code, their profile is securely bound to your referral tree.</p>
                    <p>Upon verification/validation of any of their deposits, our financial gateway instantly issues your <strong className="text-emerald-400">{systemSettings.referralValue}{systemSettings.referralType === 'percentage' ? '%' : ' BDT'}</strong> affiliate reward.</p>
                    <p className="text-[11px] text-slate-500">Note: Abuse, creating multiple mock accounts, or violating platform terms results in instant wallet block and suspended earnings.</p>
                  </div>
                </div>

              </div>

              {/* LIST OF REGISTERED REFERRAL MEMBERS */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <h3 className="text-sm font-bold mb-4">My Referral Network members</h3>
                
                {myReferrals.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No invited referee members cataloged yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-805 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Referee Player Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Join Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {myReferrals.map((refUser) => (
                          <tr key={refUser.uid}>
                            <td className="p-3 font-semibold text-white">{refUser.fullName}</td>
                            <td className="p-3 text-slate-400">{refUser.email}</td>
                            <td className="p-3 text-slate-400">{new Date(refUser.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                refUser.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {refUser.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* COMMISSION REWARDS HISTORY LOG */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <h3 className="text-sm font-bold mb-4">Referral Commission Earned logs</h3>
                
                {referralPayouts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No commission records cataloged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {referralPayouts.map((rec) => (
                      <div key={rec.id} className="flex justify-between items-center bg-zinc-950/20 p-3 rounded-xl border border-zinc-855">
                        <div>
                          <p className="text-[11px] font-semibold text-white">Referred User Deposit Complete</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Referee: {rec.refereeEmail} | Invested: ৳{rec.amountInvested}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-400">+ ৳{rec.commissionCredited} Commission</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* F. SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* File support ticket form */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'} h-fit`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Create Support Ticket</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">Reach our 24/7 dedicated support staff immediately.</p>

                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Ticket Subject</label>
                    <input
                      id="ticket-subject"
                      type="text"
                      value={newTicketSubject}
                      onChange={(e) => setNewTicketSubject(e.target.value)}
                      placeholder="e.g. Help with nagad deposit pending"
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Message Description</label>
                    <textarea
                      id="ticket-message"
                      rows={5}
                      value={newTicketMsg}
                      onChange={(e) => setNewTicketMsg(e.target.value)}
                      placeholder="Describe your issue with proper transactions reference..."
                      className={`block w-full px-4 py-3 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                        isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                      }`}
                      required
                    />
                  </div>

                  <button
                    id="btn-ticket-submit"
                    type="submit"
                    disabled={ticketLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {ticketLoading ? 'Generating ticket...' : 'Open Support Ticket'}
                  </button>
                </form>
              </div>

              {/* Tickets list & interactive chat console */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Tickets list */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-sm font-bold mb-4">My Support Tickets</h4>
                  
                  {tickets.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No active/filed tickets noted.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((t) => (
                        <div 
                          key={t.id} 
                          onClick={() => setActiveTicket(t)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            activeTicket?.id === t.id 
                              ? 'border-emerald-500 bg-emerald-500/5' 
                              : isDark 
                                ? 'border-zinc-800 bg-zinc-950/20 hover:bg-zinc-900/30' 
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-extrabold text-xs text-white leading-snug truncate">{t.subject}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              t.status === 'answered' 
                                ? 'bg-emerald-500/15 text-emerald-400' 
                                : t.status === 'closed' 
                                  ? 'bg-zinc-800 text-slate-400' 
                                  : 'bg-amber-400/15 text-amber-500'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Ticket ID: {t.id.slice(0, 8).toUpperCase()}</span>
                            <span>Activity: {new Date(t.lastActivityAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Message Active chat console */}
                {activeTicket && (
                  <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'} space-y-4`}>
                    <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ticket Thread Conversation</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{activeTicket.subject}</p>
                      </div>
                      <button 
                        id="btn-close-chat-view"
                        onClick={() => setActiveTicket(null)}
                        className="text-xs text-slate-500 hover:text-white"
                      >
                        Minimize
                      </button>
                    </div>

                    {/* Chat messaging logs */}
                    <div className="space-y-3 h-64 overflow-y-auto p-2 bg-zinc-950/45 rounded-2xl border border-zinc-850">
                      {ticketMessages.map((msg) => {
                        const isAdmin = msg.senderRole === 'admin';
                        return (
                          <div 
                            key={msg.id} 
                            className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                              isAdmin 
                                ? 'bg-emerald-600 text-white ml-auto rounded-tr-none' 
                                : isDark
                                  ? 'bg-zinc-800 text-slate-100 mr-auto rounded-tl-none'
                                  : 'bg-slate-100 text-slate-900 mr-auto rounded-tl-none'
                            }`}
                          >
                            <span className="text-[9px] font-black tracking-wider uppercase opacity-80 mb-1">
                              {isAdmin ? 'ADMINISTRATOR' : 'YOU'}
                            </span>
                            <p className="whitespace-pre-line">{msg.message}</p>
                            <span className="text-[8px] opacity-60 mt-1 self-end">
                              {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Send active reply */}
                    {activeTicket.status !== 'closed' ? (
                      <form onSubmit={handleReplyTicket} className="flex gap-2">
                        <input
                          id="ticket-reply-text"
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type response to administration..."
                          className={`flex-1 px-4 py-2.5 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${
                            isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-950'
                          }`}
                          required
                        />
                        <button
                          id="submit-ticket-reply"
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition-all shadow"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="text-center py-2.5 bg-zinc-800/20 rounded-xl text-xs text-slate-500 border border-zinc-850">
                        This Support Ticket was fully closed by the administrators. Feel free to open a new Ticket above if issues recur!
                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

          {/* G. MY PROFILE PAGE & PASSWORD MANAGEMENT */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Profile Details Container */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-6`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex items-center justify-center font-bold text-xl">
                    {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-white">{profile.fullName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">UID: {profile.uid.slice(0, 12).toUpperCase()}...</p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-zinc-800/40 pt-4">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</span>
                    <span className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                      {profile.email} 
                      {profile.isEmailVerified ? (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded">Verified</span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded">Pending</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mobile Number</span>
                    <span className="text-xs text-slate-300 flex items-center gap-2 mt-1">
                      {profile.phone || 'No phone number attached'}
                      {profile.isPhoneVerified ? (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded">Verified</span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded">Pending</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Digital Referral Code</span>
                    <span className="text-xs text-white font-mono font-bold mt-1 select-all tracking-wider block">{profile.referralCode}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Joined Platform</span>
                    <span className="text-xs text-slate-400 mt-1 block">{new Date(profile.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Password update helper */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
                <h3 className="text-sm font-bold mb-1">Reset Password</h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">To edit profile password, click trigger to receive an encrypted reset link.</p>

                <button 
                  id="btn-trigger-pw-reset-mail"
                  onClick={() => {
                    alert(`Password Reset Instruction email was delivered automatically to ${profile.email}! Please inspect inbox.`);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold uppercase tracking-widest text-[11px] py-3 rounded-2xl mt-2 transition-all block text-center text-white"
                >
                  Deliver Reset Email
                </button>
              </div>

            </div>
          )}

          {/* H. DAILY ADS TASKS PAGE */}
          {activeTab === 'tasks' && (() => {
            const activeInvestments = myInvestments.filter(i => i.status === 'active');

            // Construct all tasks available to the user based on their active plans
            const userActivePlanTasks: any[] = [];
            activeInvestments.forEach((invest) => {
              const tasks = invest.tasks || [
                { id: 'task_1', title: 'Task 1: Watch Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: invest.dailyBonus / 5 },
                { id: 'task_2', title: 'Task 2: Visit Partner Website', adLink: 'https://www.google.com', duration: 10, reward: invest.dailyBonus / 5 },
                { id: 'task_3', title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', duration: 10, reward: invest.dailyBonus / 5 },
                { id: 'task_4', title: 'Task 4: Explore Sponsor Platform', adLink: 'https://www.github.com', duration: 10, reward: invest.dailyBonus / 5 },
                { id: 'task_5', title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', duration: 10, reward: invest.dailyBonus / 5 }
              ];
              tasks.forEach((t: any) => {
                userActivePlanTasks.push({
                  ...t,
                  planId: invest.planId,
                  planName: invest.planName,
                  investmentId: invest.id,
                  uniqueTaskId: `${invest.id}_${t.id}`
                });
              });
            });

            const totalTasksLimit = userActivePlanTasks.length;

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOfTodayMs = startOfToday.getTime();

            const completionsToday = taskCompletions.filter(tc => tc.completedAt >= startOfTodayMs);
            
            // Check completed tasks that are actually part of current active plans
            const completedTasksCount = completionsToday.filter(tc => 
              userActivePlanTasks.some(ut => ut.uniqueTaskId === tc.adId)
            ).length;

            const remainingTasksCount = Math.max(0, totalTasksLimit - completedTasksCount);
            
            // Calculate today's earnings purely from active plan task completions
            const earningsToday = completionsToday
              .filter(tc => userActivePlanTasks.some(ut => ut.uniqueTaskId === tc.adId))
              .reduce((acc, curr) => acc + (curr.reward || 0), 0);

            const isAdCompletedToday = (uniqueTaskId: string) => {
              return completionsToday.some(tc => tc.adId === uniqueTaskId);
            };

            const adsToDisplay = userActivePlanTasks;

            return (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                  <div>
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                      <Tv className="w-5 h-5 text-amber-400" />
                      Daily Ads Tasks Portal
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Complete tasks assigned to your active investment plans to instantly earn cash rewards set by admin.
                    </p>
                  </div>
                  {activeInvestments.length > 0 && (
                    <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3.5 py-1.5 rounded-2xl border border-emerald-500/15">
                      {activeInvestments.length} Active Plans Registered
                    </div>
                  )}
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Completed / Limit */}
                  <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Today's Progress</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-white">{completedTasksCount}</span>
                      <span className="text-xs text-slate-500">/ {totalTasksLimit} Tasks</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${totalTasksLimit > 0 ? (completedTasksCount / totalTasksLimit) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Card 2: Today's Earnings */}
                  <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Today's Earnings</span>
                    <span className="text-2xl font-black text-emerald-400">৳{earningsToday} BDT</span>
                    <p className="text-[10px] text-slate-500 mt-1">Claimed securely to main wallet</p>
                  </div>

                  {/* Card 3: Remaining Tasks */}
                  <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Tasks Remaining</span>
                    <span className="text-2xl font-black text-amber-500">{remainingTasksCount} Tasks</span>
                    <p className="text-[10px] text-slate-500 mt-1">Resets at 12:00 AM daily</p>
                  </div>

                  {/* Card 4: Daily Limit */}
                  <div className={`p-5 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-855' : 'bg-white border-slate-200'}`}>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Your Task Limit</span>
                    <span className="text-2xl font-black text-indigo-400">{totalTasksLimit} Tasks/Day</span>
                    <p className="text-[10px] text-slate-500 mt-1">5 tasks per active portfolio</p>
                  </div>
                </div>

                {/* Task List Grid */}
                {totalTasksLimit === 0 ? (
                  <div className={`p-10 text-center rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'} space-y-4`}>
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="font-bold text-white text-sm">No Active Investment Plans Registered</h4>
                      <p className="text-xs text-slate-450 mt-1 leading-relaxed">
                        You do not have any active investment plans to unlock daily ad tasks. Purchase a plan to start earning money!
                      </p>
                    </div>
                    <button
                      id="btn-go-purchase-plan"
                      onClick={() => setActiveTab('dashboard')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white rounded-xl transition-all shadow"
                    >
                      Browse Investment Plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-450 uppercase tracking-widest">Available Tasks List</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adsToDisplay.map((ad: any, index: number) => {
                        const isCompleted = isAdCompletedToday(ad.uniqueTaskId);
                        const isLimitReached = completedTasksCount >= totalTasksLimit;
                        
                        return (
                          <div 
                            key={ad.uniqueTaskId || index} 
                            className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                              isCompleted 
                                ? 'bg-zinc-950/40 border-zinc-900 opacity-60' 
                                : 'bg-zinc-900 border-zinc-850 hover:border-zinc-700'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <div className="p-2 bg-zinc-850 rounded-2xl text-amber-400">
                                  <Tv className="w-5 h-5" />
                                </div>
                                {isCompleted ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/15">
                                    ✓ Completed Today
                                  </span>
                                ) : (
                                  <span className="bg-amber-400/10 text-amber-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-400/15 font-bold">
                                    ৳{ad.reward} BDT
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-xs text-white line-clamp-1">{ad.title}</h5>
                              <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Plan: {ad.planName}</p>
                              <p className="text-[10px] text-slate-500 mt-1">Duration: {ad.duration || 10} Seconds</p>
                            </div>

                            <div className="mt-5 pt-3 border-t border-zinc-850/60">
                              {isCompleted ? (
                                <button
                                  className="w-full py-2 bg-zinc-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                                  disabled
                                >
                                  Task Completed
                                </button>
                              ) : isLimitReached ? (
                                <button
                                  className="w-full py-2 bg-zinc-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed"
                                  disabled
                                  title="Daily tasks limit reached based on your active plans!"
                                >
                                  Daily Limit Reached
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartTask(ad)}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow"
                                >
                                  Start Ad Watching
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* H. NOTIFICATIONS LOG LIST */}
          {activeTab === 'notifications' && (
            <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-slate-200'}`}>
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-md font-bold mb-1">System Alerts Center</h3>
                  <p className="text-xs text-slate-400">View real-time notices, deposits clearance approvals, and payouts updates.</p>
                </div>
                <button 
                  id="btn-mark-all-read"
                  onClick={markAllNotifAsRead}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Clear all unread
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Your notifications tray is currently clean.</div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        n.read 
                          ? isDark ? 'border-zinc-850/60 bg-zinc-950/10 opacity-70' : 'border-slate-150 bg-slate-50' 
                          : 'border-emerald-500/20 bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-white">{n.title}</span>
                        <span className="text-[9px] text-slate-550">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 3. MOBILE RESPONSIVE BOTTOM NAVIGATION BAR */}
        <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t py-2 px-4 flex justify-around z-55 transition-all ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
        }`}>
          <button 
            id="mobile-nav-db"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button 
            id="mobile-nav-tasks"
            onClick={() => setActiveTab('tasks')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'tasks' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>Tasks</span>
          </button>
          
          <button 
            id="mobile-nav-dep"
            onClick={() => setActiveTab('deposit')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'deposit' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Deposit</span>
          </button>

          <button 
            id="mobile-nav-with"
            onClick={() => setActiveTab('withdraw')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'withdraw' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Withdraw</span>
          </button>

          <button 
            id="mobile-nav-refer"
            onClick={() => setActiveTab('referrals')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'referrals' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Ref</span>
          </button>

          <button 
            id="mobile-nav-ticket"
            onClick={() => setActiveTab('tickets')} 
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
              activeTab === 'tickets' ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Support</span>
          </button>
        </nav>

      </main>

      {/* VERIFICATION MODAL SIMULATOR FOR MOBILE/DESKTOP */}
      {verificationModal && (
        <div id="otp-input-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="inline-flex justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-500">
              <Shield className="w-6 h-6" />
            </div>
            
            <h3 className="text-md font-bold text-white">
              Simulate {verificationModal === 'phone' ? 'Phone SMS' : 'Email Otp'} Verification
            </h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              We dispatched an authorized 6-digit PIN code pin to your profile. Enter it below to unlock core cashout access:
            </p>

            <input
              id="otp-simulated-input"
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="e.g. 123456"
              className="block w-full text-center px-4 py-3 rounded-xl tracking-widest text-lg font-bold bg-zinc-950 border border-zinc-800 text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex gap-2">
              <button
                id="btn-cancel-otp"
                type="button"
                onClick={() => setVerificationModal(null)}
                className="w-1/2 py-2 text-xs font-bold bg-zinc-805 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                Dismiss
              </button>
              <button
                id="btn-complete-otp"
                type="button"
                disabled={verificationLoading}
                onClick={completeSimulationVerification}
                className="w-1/2 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
              >
                {verificationLoading ? 'Authenticating...' : 'Verify Pin'}
              </button>
            </div>
            
            <button 
              id="btn-otp-simulator-alert"
              type="button"
              onClick={() => {
                alert(`Pin reminder: [ ${simulatedCode} ]`);
              }}
              className="text-[10px] text-emerald-400 underline hover:text-emerald-300 inline-block mt-2"
            >
              Didn't receive? Show simulated code again
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STATEFUL USER INVESTMENT PLAN PURCHASE CONFIRMATION */}
      {/* ========================================== */}
      {confirmPurchasePlan && (
        <div id="purchase-confirm-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmPurchasePlan(null)}
          />
          
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left shadow-2xl">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl shrink-0">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">ACTIVATE PORTFOLIO PLAN</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you absolutely ready to subscribe to <span className="text-emerald-400 font-bold">{confirmPurchasePlan.name}</span> for <span className="text-white font-black">৳{confirmPurchasePlan.cost} BDT</span>?
                </p>
              </div>
            </div>

            <div className="bg-zinc-950/60 rounded-2xl p-3 border border-zinc-850 space-y-2 mb-5 text-[11px] text-zinc-450">
              <div className="flex justify-between">
                <span>Daily Bonus Pay:</span>
                <span className="text-emerald-400 font-bold">৳{confirmPurchasePlan.dailyBonus} / Day</span>
              </div>
              <div className="flex justify-between">
                <span>Duration Period:</span>
                <span className="text-white font-medium">{confirmPurchasePlan.durationDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span>Your Current Balance:</span>
                <span className="text-zinc-300">৳{profile.walletBalance} BDT</span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end text-xs font-black">
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-wider"
                onClick={() => setConfirmPurchasePlan(null)}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all uppercase tracking-wider"
                onClick={() => executePurchasePlan(confirmPurchasePlan)}
              >
                CONFIRM & SUBSCRIBE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* STATEFUL USER SUCCESSFEEDBACK ALERT PANEL */}
      {/* ========================================= */}
      {purchaseSuccessAlert.show && (
        <div id="purchase-success-portal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPurchaseSuccessAlert(prev => ({ ...prev, show: false }))}
          />
          
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl">
            <div className="flex flex-col items-center mb-5">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-3 animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{purchaseSuccessAlert.title}</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed px-1">{purchaseSuccessAlert.msg}</p>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => setPurchaseSuccessAlert(prev => ({ ...prev, show: false }))}
            >
              OK, GREAT
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ACTIVE DAILY ADS WATCHING AND REWARD MODAL */}
      {/* ========================================= */}
      {activeAd && (
        <div id="ad-watching-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[600px]">
            {/* Header / Mock Browser Bar */}
            <div className="bg-zinc-950 px-5 py-3.5 border-b border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-5 bg-zinc-900 rounded-lg px-3 text-[10px] text-slate-500 flex items-center gap-1.5 max-w-[280px] md:max-w-xs truncate font-mono">
                  <span className="text-emerald-500/80">secure-adstream://</span>{activeAd.adLink}
                </div>
              </div>
              <span className="bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-amber-400/15">
                Reward: ৳{activeAd.reward || 10} BDT
              </span>
            </div>

            {/* Inner Content Area */}
            <div className="flex-1 bg-black flex flex-col justify-center items-center p-4 relative overflow-hidden">
              {/* Fallback & Helper links in case of iframe blocking policies */}
              <div className="absolute top-3 left-3 right-3 z-10 flex flex-col items-center">
                <a 
                  href={activeAd.adLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-zinc-900/90 text-amber-400 hover:text-amber-300 border border-zinc-800 text-[10px] font-bold px-4 py-1.5 rounded-full shadow-md backdrop-blur-xs transition-all text-center flex items-center gap-1.5"
                >
                  🔗 Having trouble loading? Click here to open Ad in new window
                </a>
              </div>

              {/* The Ad Frame or Mocking Screen */}
              <div className="w-full h-full pt-10 pb-4">
                <iframe
                  title={activeAd.title}
                  src={activeAd.adLink}
                  className="w-full h-full rounded-2xl bg-zinc-900"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-zinc-950 p-5 border-t border-zinc-850 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <h4 className="text-xs font-black text-white">{activeAd.title}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Watch completely to qualify for the daily reward.</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Cancel option */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to exit? You won't receive the reward unless you watch the ad for the full duration!")) {
                      setActiveAd(null);
                    }
                  }}
                  className="w-1/2 sm:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                >
                  Abort Task
                </button>

                {/* Claim / Timer button */}
                {countdown > 0 ? (
                  <button
                    disabled
                    className="w-1/2 sm:w-auto px-6 py-2.5 bg-zinc-800 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    Wait {countdown}s
                  </button>
                ) : (
                  <button
                    onClick={handleClaimAdReward}
                    disabled={claimingAd || !!adSuccess}
                    className={`w-1/2 sm:w-auto px-6 py-2.5 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                      adSuccess 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 animate-pulse'
                    }`}
                  >
                    {claimingAd ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Claiming...
                      </>
                    ) : adSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Success!
                      </>
                    ) : (
                      <>
                        Claim ৳{activeAd.reward || 10} Reward 🎉
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Success Alert inside modal overlay */}
            {adSuccess && (
              <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-3 animate-bounce">
                  <Check className="w-10 h-10" />
                </div>
                <h4 className="font-bold text-white text-md">Daily Ad Task Completed!</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-sm">{adSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
