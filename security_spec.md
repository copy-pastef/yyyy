# Security Specification: Smart Deposit Platform

## Data Invariants
1. `system_settings` configuration can only be revised by authenticated master administrators.
2. `investment_plans` can be read by any visitor, but modifications are restricted to master administrators.
3. User accounts in `users` can be written by users on registration (create) or updated when managing balances, while only administrators can query all users or adjust external records.
4. Financial requests like `deposit_requests` and `withdraw_requests` can only be read/written by their respective authors or an admin.
5. `transaction_logs` and `referral_history` track sensitive system actions and represent immutable accounts only writable by active parties or admins.

## The Dirty Dozen Payloads (Target: PERMISSION_DENIED)
1. **Unauthenticated System Settings Override**: Modify system notices without auth.
2. **Privilege Escalation during Signup**: Creating a user with `role: "admin"`.
3. **Malicious Balance Injection**: Directly updating `walletBalance` by a client.
4. **Foreign Deposit Sabotage**: Intercepting or changing other users' deposit request statuses.
5. **Unauthorized Multi-user Scraping**: Querying the entire list of user accounts as an unauthenticated/regular client.
6. **Plan Cost Manipulation**: Adding/updating plans with negative cost.
7. **Malicious Investment Claims**: Updating someone else's passive investment tracking timers.
8. **Foreign Withdrawal Interception**: Reading another client's pending cashout addresses.
9. **Fake Notice Broadcasts**: Injecting global alert notifications to all accounts.
10. **Other Users Ticket Intrusions**: Reading message lists under support tickets belonging to others.
11. **Impersonated Support Replies**: Placing ticket messages claiming admin sender role.
12. **Orphaned Message Poisoning**: Creating ticket replies under random made-up non-existent tickets.
