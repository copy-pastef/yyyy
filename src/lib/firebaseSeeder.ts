/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, writeBatch, collection } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { SystemSettings, InvestmentPlan } from "../types";

export async function seedInitialData() {
  try {
    // 1. Seed System Settings
    const configDocRef = doc(db, "system_settings", "config");
    const configDocSnap = await getDoc(configDocRef);

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
        contactEmail: "support@smartdeposit.org"
      };

      await setDoc(configDocRef, defaultSettings);
      console.log("Firebase initial settings seeded.");
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
        createdAt: Date.now()
      },
      {
        id: "plan_b",
        name: "Premium Plan B",
        cost: 2000,
        dailyBonus: 100,
        durationDays: 30,
        active: true,
        createdAt: Date.now()
      },
      {
        id: "plan_c",
        name: "Venture Pro Plan",
        cost: 5000,
        dailyBonus: 300,
        durationDays: 45,
        active: true,
        createdAt: Date.now()
      }
    ];

    for (const plan of plansToSeed) {
      const planRef = doc(db, "investment_plans", plan.id);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        await setDoc(planRef, plan);
        console.log(`Seeded Investment Plan: ${plan.name}`);
      }
    }
  } catch (error) {
    console.warn("Failed to seed initial firebase data (App is probably offline, rules are not configured, or Firestore database has not been created in Firebase Console yet):", error);
    // Proceed gracefully without crashing the app startup
  }
}
