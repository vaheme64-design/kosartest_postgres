# Security Specification & Threat Model
## Automotive Sheet Metal Production Planning & Inventory Control

### 1. Data Invariants
1. **Ledger Immutability**: Production and warehouse transactions (`transactions`) cannot be deleted once committed. Adjustments must be performed strictly by issuing compensating/reversal vouchers with reference to the original document.
2. **Transaction Integrity**: Every transaction must have valid non-negative quantities, defined primary unit (`KG` or `PCS`), valid voucher type, and reference an authenticated operator or user.
3. **Role-Based Access Control**: Standard users cannot escalate their own `role` in the `users` collection. Only an administrator can update or reassign roles.
4. **Path Variable Hardening**: All document keys must satisfy `isValidId(id)` (`^[a-zA-Z0-9_-]+$` with length <= 128) to prevent injection and denial-of-wallet attacks.
5. **String Size Boundaries**: All string properties must enforce length limits to prevent oversized payload attacks.

### 2. The Dirty Dozen Payloads (Should return PERMISSION_DENIED)
1. **Payload 1 (Self Role Escalation)**: Regular operator attempting to change their own role to `"ADMIN"`.
2. **Payload 2 (Transaction Physical Deletion)**: Any user attempting a `delete` operation on `/transactions/{id}`.
3. **Payload 3 (Spoofed Author UID)**: Creating a transaction with `createdByUid: "attacker_id"` where `request.auth.uid != "attacker_id"`.
4. **Payload 4 (Ghost Field Injection)**: Sending an extra unauthorized key `{"isSuperUser": true}` in a part update.
5. **Payload 5 (Oversized Payload / Denial of Wallet)**: Injecting a 2MB note or part name into the parts collection.
6. **Payload 6 (Invalid Document ID Path Variable)**: Accessing document ID with malicious characters e.g. `../../etc/passwd` or 500 characters.
7. **Payload 7 (Unauthenticated Write)**: Writing to `/parts` or `/transactions` without an active authenticated session.
8. **Payload 8 (Invalid Enum Value)**: Attempting to create a transaction with `voucherType: "FAKE_PURGE"`.
9. **Payload 9 (Negative Quantity Write)**: Injecting negative primary quantity directly without an adjustment voucher type.
10. **Payload 10 (Altering Immutable Timestamp)**: Attempting to modify `createdAt` on an existing transaction document.
11. **Payload 11 (Unverified Email Write)**: Write operation from an account with `email_verified == false` attempting administrative actions.
12. **Payload 12 (Blanket Query Scraping)**: Attempting unauthenticated query listing of user profiles.

### 3. Test Runner Design
The security rules enforce:
- Signed-in user verification
- Strict schema validation (`isValidPart`, `isValidMachine`, `isValidRouting`, `isValidTransaction`, `isValidUserProfile`)
- Prohibiting physical delete on transactions
- Prohibiting user role modification except by administrators
- Size and regex checks on document IDs and string fields.
