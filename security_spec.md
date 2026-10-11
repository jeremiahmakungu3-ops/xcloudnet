# Firestore Security Specification

## 1. Data Invariants
- Admin privilege is restricted strictly to verified administrator `mussamatembo3@gmail.com` or explicit admin entries in `/admins/{adminId}`.
- Every user document under `/users/{userId}` belongs to `request.auth.uid`. No user can spoof another user's profile.
- Non-admin users cannot elevate their role to `SUPER_ADMIN`.
- Read access to user records is isolated to the document owner or system administrator.
- String boundaries and regex patterns must prevent denial-of-wallet resource attacks.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. Unauthenticated write to `/users/user1` -> PERMISSION_DENIED
2. Regular user creating document at `/users/victim_id` -> PERMISSION_DENIED
3. Regular user attempting to set `role: "SUPER_ADMIN"` -> PERMISSION_DENIED
4. Unverified email spoofing `mussamatembo3@gmail.com` -> PERMISSION_DENIED
5. Payload with oversized strings (> 256 chars) -> PERMISSION_DENIED
6. Payload injecting arbitrary unauthorized ghost fields -> PERMISSION_DENIED
7. Direct client modification of `/admins/{adminId}` by regular user -> PERMISSION_DENIED
8. Unauthenticated read from `/users/{userId}` -> PERMISSION_DENIED
9. Regular user attempting blanket list queries on `/users` -> PERMISSION_DENIED
10. Malformed ID with special symbols injection -> PERMISSION_DENIED
11. Modifying another user's profile without ownership or admin role -> PERMISSION_DENIED
12. Attempting to delete admin registry entry without Super Admin authorization -> PERMISSION_DENIED
