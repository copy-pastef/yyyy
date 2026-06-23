# Smart Deposit Platform

Smart Deposit is a high-performance, responsive Deposit & Investment Management Web Application built with React.js, Tailwind CSS, and Firebase (Firestore and Auth) to manage user portfolios, dynamic plans, real-time manual mobile banking transfers (bKash, Nagad, Rocket), support ticketing, and automated multi-tier affiliate referral rewards.

---

## 🚀 Key Features

### 👤 User Panel
1. **User Authentication**: Secure Sign-Up and Core Login with automatic email validation checks.
2. **Referral Link Generator**: Unique referral link system (`?ref=CODE`) to invite affiliate members.
3. **Wallet Balance Viewer**: Visually tracks current wallet balance, active investment volume, total earned, and total withdrawn.
4. **Dynamic Portfolios**: Buy active plans configured by the administrator.
5. **Simulated Verification Engine**: One-click verification simulator for mobile phone SMS and email OTP, fully updating structural records.
6. **Manual Deposit System**: Submit bKash, Nagad, or Rocket cashout proofs (Transaction ID and file screenshot uploads).
7. **Secure withdrawals**: Submit checkout requests. Wallet balances are locked immediately upon filing to avoid double-spend exploits.
8. **Real-Time Notification Logs**: Personal inbox alerts for deposit approvals, checkout completions, or ticket responses.
9. **Interactive Support Chat**: File ticketing queries and have multi-turn conversations with system administrators.

### ⚙️ Admin Control Panel
1. **Master Statistical Dashboard**: Dynamic analytics tracking gross registered accounts, aggregate deposit volumes, active portfolios, paid checkout sums, and pending cues.
2. **Users Directory**: Global catalog showing statuses. Search and filter accounts instantly by Name, Email, or Ref.
3. **Manual Balance Adjuster**: Manual financial credit/debit adjuster with auditing reference logs.
4. **Governance Rules**: Instantly toggle permissions (make other administrators or suspend fraudulent accounts from login).
5. **Deposit Gateway Clearing**: Review and approve manual payments, auto-crediting customer profiles and distributing automatic referral rewards.
6. **Withdraw Payout Gateway**: Approve withdrawals or reject them (refunding patient client balances immediately in real-time).
7. **Notice & Banner Customizer**: Update marquee text, promotion highlights, and merchant bKash/Nagad/Rocket phone numbers dynamically.
8. **Portfolio Plans Builder**: Add, toggle active status, or remove plans from the marketplace.

---

## 🗄️ Database Schema Representation (Firestore Collections)

### 1. `users`
Tracks individual client parameters, affiliate tracking code, and balance totals.
```json
{
  "uid": "string (Primary Key)",
  "email": "string",
  "fullName": "string",
  "phone": "string",
  "role": "user | admin",
  "walletBalance": "number",
  "totalInvested": "number",
  "totalWithdrawn": "number",
  "totalEarned": "number",
  "referralCode": "string (unique 6-chars)",
  "referredBy": "string (uid ref, optional)",
  "status": "active | suspended",
  "isPhoneVerified": "boolean",
  "isEmailVerified": "boolean",
  "createdAt": "number (timestamp)"
}
```

### 2. `investment_plans`
Defines active portfolios available for purchase.
```json
{
  "id": "string (Primary Key, e.g. plan_a)",
  "name": "string",
  "cost": "number (BDT)",
  "dailyBonus": "number (BDT)",
  "durationDays": "number",
  "active": "boolean",
  "createdAt": "number"
}
```

### 3. `user_investments`
Tracks subscribed ongoing investments.
```json
{
  "id": "string (Primary Key)",
  "uid": "string",
  "userEmail": "string",
  "planId": "string",
  "planName": "string",
  "cost": "number",
  "dailyBonus": "number",
  "purchasedAt": "number",
  "expiresAt": "number",
  "lastBonusClaimedAt": "number",
  "daysClaimed": "number",
  "status": "active | expired"
}
```

### 4. `deposit_requests`
Lists pending manual money clearances.
```json
{
  "id": "string (Primary Key)",
  "uid": "string",
  "userEmail": "string",
  "phone": "string",
  "paymentMethod": "bKash | Nagad | Rocket",
  "amount": "number",
  "transactionId": "string",
  "proofScreenshot": "string (Base64 or image URL)",
  "status": "pending | approved | rejected",
  "rejectionReason": "string (optional)",
  "createdAt": "number"
}
```

### 5. `withdraw_requests`
Lists pending withdraw cashouts.
```json
{
  "id": "string (Primary Key)",
  "uid": "string",
  "userEmail": "string",
  "paymentMethod": "bKash | Nagad | Rocket",
  "amount": "number",
  "targetNumber": "string",
  "status": "pending | approved | rejected",
  "rejectionReason": "string (optional)",
  "createdAt": "number"
}
```

---

## 🔧 Installation & Setup

1. **Clone the project & install dependencies**:
   ```bash
   npm install
   ```

2. **Database configuration**:
   Ensure your Firebase Web App credentials are specified inside `src/lib/firebase.ts` matching your Firestore database configuration.

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Compile the App for Production**:
   ```bash
   npm run build
   ```
