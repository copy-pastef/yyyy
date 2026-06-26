/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc, writeBatch, collection, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { SystemSettings, InvestmentPlan, AdTask } from "../types";

export async function seedInitialData() {
  try {
    // 1. Seed System Settings
    const configDocRef = doc(db, "system_settings", "config");
    const configDocSnap = await getDoc(configDocRef);

    const initialAdTasks: AdTask[] = [
      { id: "ad_1", title: "Premium Sponsor Ad 1", adLink: "https://www.youtube.com/embed/dQw4w9WgXcQ", duration: 10, reward: 10 },
      { id: "ad_2", title: "Smart Crypto Investment Ad 2", adLink: "https://www.google.com", duration: 10, reward: 10 },
      { id: "ad_3", title: "Real Estate Growth Ad 3", adLink: "https://www.wikipedia.org", duration: 10, reward: 10 },
      { id: "ad_4", title: "Future Stocks Trading Ad 4", adLink: "https://www.github.com", duration: 10, reward: 10 },
      { id: "ad_5", title: "E-Commerce Success Ad 5", adLink: "https://www.amazon.com", duration: 10, reward: 10 },
      { id: "ad_6", title: "Venture Capital Partner Ad 6", adLink: "https://www.microsoft.com", duration: 10, reward: 10 },
      { id: "ad_7", title: "Global FX Broker Ad 7", adLink: "https://www.apple.com", duration: 10, reward: 10 },
      { id: "ad_8", title: "Eco-Energy Portfolio Ad 8", adLink: "https://www.tesla.com", duration: 10, reward: 10 },
      { id: "ad_9", title: "Cloud AI Infrastructure Ad 9", adLink: "https://cloud.google.com", duration: 10, reward: 10 },
      { id: "ad_10", title: "Digital Gold Reserves Ad 10", adLink: "https://www.gold.org", duration: 10, reward: 10 },
      { id: "ad_11", title: "Fintech Innovation Partner Ad 11", adLink: "https://www.stripe.com", duration: 10, reward: 10 },
      { id: "ad_12", title: "Smart Agriculture Ad 12", adLink: "https://www.fao.org", duration: 10, reward: 10 },
      { id: "ad_13", title: "Renewable Venture Fund Ad 13", adLink: "https://www.iea.org", duration: 10, reward: 10 },
      { id: "ad_14", title: "High Yield Index Tracker Ad 14", adLink: "https://www.bloomberg.com", duration: 10, reward: 10 },
      { id: "ad_15", title: "Global Logistics Leader Ad 15", adLink: "https://www.fedex.com", duration: 10, reward: 10 }
    ];

    if (!configDocSnap.exists()) {
      const defaultSettings: SystemSettings = {
        id: "config",
        platformName: "Earn Cash - Smart Deposit",
        defaultCurrency: "BDT",
        referralType: "percentage",
        referralValue: 20, // 20%
        notices: "🚨 ATTENTION: Please ensure correct Transaction ID and Screenshot form proof matches before submitting Deposit Requests. Refer colleagues to claim an extraordinary 20% on all successful deposits!",
        bannerUrl: "",
        bannerTitle: "Secure Investment Engine",
        bannerMessage: "Invest in premium Plan A, Plan B, or Custom Plans configured by active management to accrue daily bonuses automatically. Payouts are approved in hours to bKash, Nagad, and Rocket.",
        bkashNumber: "01789123456 (Personal)",
        nagadNumber: "01989123456 (Personal)",
        rocketNumber: "01589123456 (Personal)",
        contactEmail: "support@smartdeposit.org",
        adTasks: initialAdTasks
      };

      await setDoc(configDocRef, defaultSettings);
      console.log("Firebase initial settings seeded.");
    } else {
      const currentSettings = configDocSnap.data() as SystemSettings;
      // Force update default platform name to Earn Cash
      if (currentSettings.platformName === "Smart Deposit Platform") {
        await updateDoc(configDocRef, {
          platformName: "Earn Cash - Smart Deposit"
        });
      }
      // Ensure adTasks is seeded on existing settings
      if (!currentSettings.adTasks || currentSettings.adTasks.length === 0) {
        await updateDoc(configDocRef, {
          adTasks: initialAdTasks
        });
        console.log("Firebase system settings updated with adTasks.");
      }
    }

    // 2. Delete old/obsolete default plans if they exist to keep system pristine
    const obsoletePlanIds = ["plan_a", "plan_b", "plan_c", "plan_3000"];
    for (const obId of obsoletePlanIds) {
      try {
        await deleteDoc(doc(db, "investment_plans", obId));
      } catch (e) {}
    }

    // 3. Seed exact 7 requested plans (Free + 6 paid: 500, 1000, 2000, 3000, 5000, 10000)
    const plansToSeed: InvestmentPlan[] = [
      {
        id: "plan_free",
        name: "Free Mplan",
        cost: 0,
        dailyBonus: 10,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 1,
        tasks: [
          { id: 'task_free_1', title: 'Task 1: Watch Free Sponsor Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 10 }
        ]
      },
      {
        id: "plan_500",
        name: "Premium Plan 500",
        cost: 500,
        dailyBonus: 25,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: Visit Partner Sponsor', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 5 },
          { id: 'task_2', title: 'Task 2: Watch Ad Clip', adLink: 'https://www.google.com', duration: 10, reward: 5 },
          { id: 'task_3', title: 'Task 3: Learn Investment Rules', adLink: 'https://www.wikipedia.org', duration: 10, reward: 5 },
          { id: 'task_4', title: 'Task 4: Explore Platform', adLink: 'https://www.github.com', duration: 10, reward: 5 },
          { id: 'task_5', title: 'Task 5: Complete Premium Offer', adLink: 'https://www.amazon.com', duration: 10, reward: 5 }
        ]
      },
      {
        id: "plan_1000",
        name: "Premium Plan 1000",
        cost: 1000,
        dailyBonus: 50,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: Watch Premium Sponsor', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 10 },
          { id: 'task_2', title: 'Task 2: Watch Finance Clip', adLink: 'https://www.google.com', duration: 10, reward: 10 },
          { id: 'task_3', title: 'Task 3: Learn Market Strategy', adLink: 'https://www.wikipedia.org', duration: 10, reward: 10 },
          { id: 'task_4', title: 'Task 4: Visit Trading Platform', adLink: 'https://www.github.com', duration: 10, reward: 10 },
          { id: 'task_5', title: 'Task 5: Verify Wallet Node', adLink: 'https://www.amazon.com', duration: 10, reward: 10 }
        ]
      },
      {
        id: "plan_2000",
        name: "Premium Plan 2000",
        cost: 2000,
        dailyBonus: 100,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: Watch Golden Partner', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 20 },
          { id: 'task_2', title: 'Task 2: Visit Partner Brand', adLink: 'https://www.google.com', duration: 10, reward: 20 },
          { id: 'task_3', title: 'Task 3: Explore Investment Nodes', adLink: 'https://www.wikipedia.org', duration: 10, reward: 20 },
          { id: 'task_4', title: 'Task 4: View Real Estate Ad', adLink: 'https://www.github.com', duration: 10, reward: 20 },
          { id: 'task_5', title: 'Task 5: Finish Premium Survey', adLink: 'https://www.amazon.com', duration: 10, reward: 20 }
        ]
      },
      {
        id: "plan_3000",
        name: "Premium Plan 3000",
        cost: 3000,
        dailyBonus: 150,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: Watch Platinum Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 30 },
          { id: 'task_2', title: 'Task 2: Visit Tech Sponsor', adLink: 'https://www.google.com', duration: 10, reward: 30 },
          { id: 'task_3', title: 'Task 3: Explore Global Markets', adLink: 'https://www.wikipedia.org', duration: 10, reward: 30 },
          { id: 'task_4', title: 'Task 4: Learn Crypto Staking', adLink: 'https://www.github.com', duration: 10, reward: 30 },
          { id: 'task_5', title: 'Task 5: Submit Partner Feedback', adLink: 'https://www.amazon.com', duration: 10, reward: 30 }
        ]
      },
      {
        id: "plan_5000",
        name: "Premium Plan 5000",
        cost: 5000,
        dailyBonus: 300,
        durationDays: 45,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: Premium Elite Video', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 60 },
          { id: 'task_2', title: 'Task 2: Visit Diamond Sponsor', adLink: 'https://www.google.com', duration: 10, reward: 60 },
          { id: 'task_3', title: 'Task 3: Research High-Yield Assets', adLink: 'https://www.wikipedia.org', duration: 10, reward: 60 },
          { id: 'task_4', title: 'Task 4: Join Global FX Review', adLink: 'https://www.github.com', duration: 10, reward: 60 },
          { id: 'task_5', title: 'Task 5: Complete Wealth Survey', adLink: 'https://www.amazon.com', duration: 10, reward: 60 }
        ]
      },
      {
        id: "plan_10000",
        name: "Premium Plan 10000",
        cost: 10000,
        dailyBonus: 600,
        durationDays: 45,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5,
        tasks: [
          { id: 'task_1', title: 'Task 1: VIP Investor Ad Clip', adLink: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: 10, reward: 120 },
          { id: 'task_2', title: 'Task 2: Explore Real Estate Ads', adLink: 'https://www.google.com', duration: 10, reward: 120 },
          { id: 'task_3', title: 'Task 3: Invest in Index Trackers', adLink: 'https://www.wikipedia.org', duration: 10, reward: 120 },
          { id: 'task_4', title: 'Task 4: View Private Asset Video', adLink: 'https://www.github.com', duration: 10, reward: 120 },
          { id: 'task_5', title: 'Task 5: Finish VIP Survey Promo', adLink: 'https://www.amazon.com', duration: 10, reward: 120 }
        ]
      }
    ];

    for (const plan of plansToSeed) {
      const planRef = doc(db, "investment_plans", plan.id);
      await setDoc(planRef, plan);
      console.log(`Seeded Investment Plan: ${plan.name}`);
    }
  } catch (error) {
    console.warn("Failed to seed initial firebase data:", error);
  }
}
