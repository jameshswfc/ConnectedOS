# Microsoft 365 Sign-In Rollout

## Decision and Current State

Any member of the Connected Hospitality tenant may sign in. A new member receives `Staff` with permission level `user`, no operational permissions and no local password. Settings, their own notifications and a restricted welcome dashboard are available. An administrator assigns an existing business role and permission level in Users. Guests and personal Microsoft accounts are excluded.

The existing single-business-role model is retained. Multiple simultaneous roles, directory group synchronisation and automatic role elevation are not implemented.

The code is opt-in. Production Microsoft sign-in was enabled and verified on 31 October 2026; local sign-in remains available as recovery. See `docs/deployment/production-release-2026-10-31.md` for the verified release and rollback details. Other environments remain opt-in. No tenant credentials are committed. Microsoft sign-in does not require SharePoint or Graph permissions and does not fetch profile photographs.

## Registration Walkthrough

1. Open https://entra.microsoft.com and select `jrharrison.onmicrosoft.com`.
2. Open **App registrations > New registration**. Name: `ConnectedOS`. Supported accounts: **Accounts in this organisational directory only**.
3. Add a **Web** redirect URI: `https://portal.connectedhsp.com/api/auth/callback/azure-ad`.
4. For a separate local test registration, use `http://localhost:3002/api/auth/callback/azure-ad`. Prefer separate test/production credentials. The NextAuth URL must match the environment being tested.
5. Record **Directory (tenant) ID** and **Application (client) ID** from Overview. These are identifiers, not secrets. The tenant ID must be the directory UUID, not its domain name or `common`.
6. Under **Token configuration > Add optional claim**, choose **ID** tokens and add `acct` and `email`. `acct=0` identifies a member; guests or missing member claims fail closed. Configure this before enabling the provider.
   If Entra warns that `email` requires OpenID Connect scopes, the claim may already be saved correctly. Under **API permissions > Add a permission > Microsoft Graph > Delegated permissions**, select only `openid`, `profile` and `email` under OpenId permissions. Confirm before saving. These are basic signed-in identity scopes, not mailbox or SharePoint access. Do not select `offline_access` or grant tenant-wide admin consent as part of this step.
7. Under **Certificates & secrets**, create a client secret with an appropriate expiry. Store the secret **value**, not its secret ID, in the server's protected environment configuration. Do not paste it into chat, GitHub, screenshots or documents. Record its expiry for renewal.
8. Under the corresponding **Enterprise application > Properties**, verify sign-in is enabled and **Assignment required? = No** to permit all tenant members. Tenant consent/Conditional Access policies still apply. Do not grant directory-wide Graph permissions for this sign-in feature.
9. Link James's existing ConnectedOS account before testing Microsoft sign-in. In Entra **Users**, open James and copy the **user Object ID**, not the application Object ID. In ConnectedOS **Users**, expand Microsoft 365 on the existing record and link that ID. Repeat for existing staff accounts. This retains ownership, roles and historical records.
10. Test a new member, an existing linked member, a guest, a deactivated local user and a wrong-tenant user before general rollout. Keep an emergency local administrator login tested throughout.

## Server Configuration

Set these in the running application's protected environment, not a browser form:

```dotenv
NEXTAUTH_URL=https://portal.connectedhsp.com
ENABLE_ENTRA_LOGIN=true
AZURE_AD_TENANT_ID=<directory-uuid>
AZURE_AD_CLIENT_ID=<application-client-id>
AZURE_AD_CLIENT_SECRET=<secret-value>
```

Keep the existing strong `NEXTAUTH_SECRET`; changing it invalidates sessions. A repository push alone is not evidence the server has updated. The Fasthosts VPS runs PM2 process `connectedos` from `/opt/connectedos-releases/20261031-m365`, using `npm run start -- -p 3002`; `/opt/connectedos` is the previous release and shared upload location. Preserve its environment, uploads and existing uncommitted server changes. Back up and verify a candidate release before switching the live process. Do not run seed or migration-reset commands during this release.

## Identity and Access Controls

- NextAuth validates the OIDC exchange. ConnectedOS additionally checks tenant, immutable user object ID and member claim.
- Identity is stored in the existing unique `User.microsoftId` field as `tenantId:objectId`. No schema migration is required.
- Email is not an authorisation key. An existing email collision requires explicit administrator linking; it never inherits an existing administrator account automatically.
- `POST /api/v1/users/:id/microsoft` requires `admin.users`, validates UUIDs, prevents duplicate identity links and writes an audit record. Existing different identity links are not silently replaced.
- First-time provision and subsequent sign-ins are audited. Active administrators receive a new-user access-review notification.
- The session refreshes local roles and inactive/deleted state. Local deactivation denies both providers. Tenant-only suspension is subject to Entra/session lifetime; instant Entra revocation is not claimed. Sessions currently last eight hours.
- Microsoft sessions do not require changing a local password. Existing local accounts retain their password-change gate and fallback credentials.
- API guards return JSON 401 when signed out and JSON 403 when access is denied or a local password change is required. Page guards still redirect to login or password change.

## Verification and Rollback

### Reviewed Directory Import

`npm run import:microsoft-users -- --file /private/path/directory.json --admin-id <administrator-user-id>` previews a verified Entra directory snapshot. Add `--apply` only after reviewing every match. The snapshot format is `{ "tenantId": "<uuid>", "users": [{ "objectId": "<uuid>", "email": "person@example.com", "displayName": "Person", "userType": "Member", "accountEnabled": true }] }`. Obtain these values from the tenant's authenticated directory, not user-supplied sign-in claims. Keep the snapshot outside the repository and remove temporary copies after reconciliation.

The command requires an active administrator with `admin.users`, checks the configured tenant, matches immutable identities first, then administrator-reviewed exact case-insensitive emails. It never matches names, overwrites a different identity, reactivates a local account, changes existing roles/passwords, or modifies business ownership. Ambiguous records stop the entire applied transaction. Guests and disabled accounts are skipped; a blank legacy user type can retain an existing link but cannot be newly provisioned. New members receive passwordless Staff access only. Every creation/link is audited; reruns do not duplicate users or audit events. No migration or directory-wide Graph permission is required.

This is a one-off/repeatable administrator import, not continuous directory synchronisation. New members can also provision themselves at first Microsoft sign-in. Entra offboarding still requires local deactivation for immediate session revocation.

Do not run seed/reset-password scripts to enable Microsoft login: the local configuration may reference an older deactivated administrator. For rollback, set `ENABLE_ENTRA_LOGIN=false`, restart the app, use the tested local administrator account, and investigate without deleting identities or business records.

The automated suite covers provider gating, tenant/member claims, least-privilege provisioning, email collision prevention, identity linking, session revocation and API boundaries. A real Microsoft redirect/consent round-trip remains required after registration.

## References

- [Microsoft: single-tenant and multitenant applications](https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps)
- [Microsoft: optional token claims, including acct](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference)
- [Microsoft: token claim validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)
- [Microsoft: redirect URI configuration](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri)
