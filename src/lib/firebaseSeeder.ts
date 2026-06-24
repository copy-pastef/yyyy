/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, updateDoc, writeBatch, collection } from "firebase/firestore";
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
        platformName: "Smart Deposit Platform",
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
      // Ensure adTasks is seeded on existing settings
      const currentSettings = configDocSnap.data() as SystemSettings;
      if (!currentSettings.adTasks || currentSettings.adTasks.length === 0) {
        await updateDoc(configDocRef, {
          adTasks: initialAdTasks
        });
        console.log("Firebase system settings updated with adTasks.");
      }
    }

    // 2. Seed Default Plans
    const plansToSeed: InvestmentPlan[] = [
      {
        id: "plan_a",
        name: "Premium Plan A",
        cost: 1000,
        dailyBonus: 50,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 5
      },
      {
        id: "plan_b",
        name: "Premium Plan B",
        cost: 2000,
        dailyBonus: 100,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 10
      },
      {
        id: "plan_3000",
        name: "Super Premium Plan",
        cost: 3000,
        dailyBonus: 150,
        durationDays: 30,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 15
      },
      {
        id: "plan_c",
        name: "Venture Pro Plan",
        cost: 5000,
        dailyBonus: 300,
        durationDays: 45,
        active: true,
        createdAt: Date.now(),
        dailyTasks: 25
      }
    ];

    for (const plan of plansToSeed) {
      const planRef = doc(db, "investment_plans", plan.id);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        await setDoc(planRef, plan);
        console.log(`Seeded Investment Plan: ${plan.name}`);
      } else {
        // Update existing plan to make sure dailyTasks is set
        const existingData = planSnap.data();
        if (existingData.dailyTasks === undefined) {
          await updateDoc(planRef, { dailyTasks: plan.dailyTasks });
        }
      }
    }
  } catch (error) {
    console.warn("Failed to seed initial firebase data (App is probably offline, rules are not configured, or Firestore database has not been created in Firebase Console yet):", error);
    // Proceed gracefully without crashing the app startup
  }
}
