# Implementation Plan

Scope: remove biometric login (Expo Go incompatible), fix PIN input UX across all PIN screens, change login submission UX (button + loading state, no inline "fetching" feedback), remove the fake settings icon on profile, add a "change PIN" flow that requires the previous PIN, and add a display name field from signup through to a new Personal Information screen.

No new architectural decisions are needed — this plan reuses existing patterns (`apiClient`, `updateUserProfile`, `changePin`, Zustand `authStore`).

---

## 1. Remove biometric login entirely

Expo Go cannot run `expo-local-authentication` native prompts, so rip out everything added for it.

**Delete these files:**
- `src/services/api/biometrics.ts`
- `src/hooks/useBiometrics.ts`
- `app/security.tsx` (the whole screen was biometrics-only; see step 6 for its replacement)

**Edit `app/(auth)/pin-entry.tsx`:**
- Remove `import { useBiometrics } from "../../src/hooks/useBiometrics";`
- Remove `const { isSupported, isEnabled, authenticate } = useBiometrics();` and `biometricAttempted` ref
- Remove the auto-prompt `useEffect` that calls `handleBiometricUnlock`
- Remove `handleBiometricUnlock` function
- Remove the `{isSupported && isEnabled && (...)}` "Use biometric unlock" `Pressable` block in the JSX
- (Keep the account-identity display added earlier — that stays)

**Edit `app/(tabs)/profile.tsx`:**
- The "Security" menu item currently does `router.push("/security")`. Repoint it to the new PIN-change screen from step 6 (`/security` can be reused/renamed — see step 6, we keep the route but change its contents).

**Edit `app/_layout.tsx`:**
- No change needed to the `Stack.Screen name="security"` entry — it will be repointed to the new PIN-change content in step 6, not removed.

**package.json / uninstall:**
- Leave `expo-local-authentication` and `expo-secure-store` installed only if something else in the repo uses them; grep first (`grep -rn "expo-local-authentication\|expo-secure-store" src app`). If nothing else references them after the above deletions, run `npx expo uninstall expo-local-authentication` (keep `expo-secure-store` only if still used elsewhere — currently it is not used anywhere else, so uninstall both). Do not touch `package-lock.json` by hand; let the uninstall command manage it.

---

## 2. Fix PIN entry UX (auto-advance + real backspace) across all PIN inputs

There are 3 independent sets of 6-box PIN inputs, each with its own `handle*Change` / `handle*KeyPress` pair, because each screen manages its own local state:
- `app/(auth)/pin-entry.tsx` — `pin` / `pinRefs` (unlock flow)
- `app/(auth)/login.tsx` — `pin`/`pinRefs` (login PIN step) and `newPin`/`newPinRefs` (forgot-PIN reset step), both rendered via the shared `PinRow` sub-component
- `app/(auth)/signup.tsx` — `pin` / `pinRefs` (PIN setup step)

### What's actually broken

Re-reading the existing code: `handlePinChange` already calls `pinRefs[index + 1].current?.focus()` when a digit is typed, and `handlePinKeyPress` already moves focus back on backspace. So the auto-advance logic is *present*. The reported bug ("requires clicking every single input") is almost certainly caused by `secureTextEntry` + `maxLength={6}` on iOS/Android sometimes double-firing `onChangeText` with stale multi-char values from autofill/predictive text, and — more importantly — by each box having `maxLength={6}` instead of `maxLength={1}`. With `maxLength={6}`, a box can hold more than one character momentarily, which changes `text.length > 1` handling in ways that don't reliably advance on physical devices, and some Android keyboards send the full current+new string rather than a single char.

Fix: change every PIN-box `<TextInput>` from `maxLength={6}` to `maxLength={1}`, and simplify `handle*Change` to not special-case `text.length > 1` for the common case, while keeping the paste-handling branch since real 6-digit paste events do still send multi-char strings.

### Precise change per file

For **each** of the three PIN-handling locations (`pin-entry.tsx`'s `handlePinChange`, `login.tsx`'s `handlePinChange` and `handleNewPinChange`, `signup.tsx`'s `handlePinChange`), and the equivalent OTP handler in `signup.tsx` (`handleOtpChange`) and `verify-phone.tsx` (`handleOtpChange`) — apply the same shape of fix, since they all share this bug:

1. On the `<TextInput>` for each digit box, change `maxLength={6}` → `maxLength={1}`.
2. Rewrite the `onChangeText` handler so that:
   - If the incoming text is empty (user cleared the box via select-all+delete or similar), just set that slot to `""` — no focus change (keyPress handles backspace-focus-move, see below).
   - If the incoming text is exactly 1 new character, set it and auto-advance focus to `index + 1` (existing behavior, keep as-is).
   - If the incoming text is >1 characters (paste), keep the existing paste-splitting logic unchanged.
3. Rewrite the backspace behavior so it matches normal mobile PIN UX ("backspace should immediately delete the previous key, not go back then require a second backspace"):
   - Currently `onKeyPress` only moves focus back when the *current* box is already empty, requiring: press backspace on empty box → focus moves back → press backspace again → deletes. That's the exact double-press bug described.
   - New behavior for `onKeyPress` when `key === "Backspace"`:
     - If the current box has a digit, let `onChangeText("")` handle clearing it (default RN behavior) — no focus move.
     - If the current box is already empty AND `index > 0`: clear the *previous* box's value immediately (`newArr[index - 1] = ""`, call the state setter) AND move focus to `index - 1`, in the same handler call. This makes a single backspace press on an empty box both move back and delete in one physical key press, matching e.g. iOS Messages / banking-app PIN UX.

Concretely, the shared shape (apply per-screen, adapting variable names `pin`/`setPin`/`pinRefs`, `newPin`/`setNewPin`/`newPinRefs`, `otp`/`setOtp`/`otpRefs`):

```tsx
const handlePinKeyPress = (e: any, index: number) => {
  if (e.nativeEvent.key === "Backspace") {
    if (!pin[index] && index > 0) {
      const arr = [...pin];
      arr[index - 1] = "";
      setPin(arr);
      pinRefs[index - 1].current?.focus();
    }
  }
};
```

And the `onChangeText` for the single-char case stays as today (set slot, advance focus if non-empty) — no logic change needed there beyond the `maxLength={1}` prop change, since `maxLength={1}` guarantees `text.length` is 0 or 1 outside of paste, eliminating the ambiguous multi-char-in-one-box state that was causing the unreliable auto-advance.

### Files/lines to touch
- `app/(auth)/pin-entry.tsx`: `handlePinChange` (~line 80), `handlePinKeyPress` (~line 112), PIN `<TextInput>` `maxLength` (~line 304)
- `app/(auth)/login.tsx`: `handlePinChange` (~line 68), `handlePinKeyPress` (~line 83), `handleNewPinChange` (~line 160), `handleNewPinKeyPress` (~line 175), shared `PinRow`'s `<TextInput>` `maxLength` (~line 218)
- `app/(auth)/signup.tsx`: `handleOtpChange`/`handleOtpKeyPress` (OTP step), `handlePinChange`/`handlePinKeyPress` (PIN step), both sets of `<TextInput>` `maxLength`
- `app/(auth)/verify-phone.tsx`: `handleOtpChange`/`handleOtpKeyPress`, OTP `<TextInput>` `maxLength`

Apply identically to OTP boxes too, since they have the exact same bug pattern and the prompt says "apply to all pin inputs" (OTP entry is functionally a PIN input).

---

## 3. Login: remove "fetching" feedback text, add explicit submit button with loading state, keep auto-submit on keyboard "done"

Current behavior in `app/(auth)/login.tsx`:
- Step "pin": as soon as all 6 digits are filled, `verifyPinCode` fires automatically (via `handlePinChange`'s `if (arr.join("").length === 6) await verifyPinCode(...)`), and while loading, the shared `PinRow` shows a `Text` "Verifying…" (~line 234-236). This is the "user feedback when fetching" to remove.

**Change:**
1. In `PinRow` (used for both the login-PIN step and the forgot-PIN-newpin step), delete the `{isLoading && <Text>...Verifying…</Text>}` block entirely (~lines 234-236).
2. Keep the auto-submit-on-6-digits behavvior via `handlePinChange`/`handleNewPinChange` (already calls `verifyPinCode`/`handleSetNewPin` when all boxes fill) — this satisfies "keyboard still enter/auto submit".
3. Add an explicit submit button below the PIN row for the "pin" step (and, for consistency, the "forgot_newpin" step), so a user can also tap to submit rather than relying purely on autofill/paste:
   - New `Pressable` styled like the other primary buttons in this file (`height: 58, borderRadius: 18, backgroundColor: "#000"`), label "Unlock" (or "Set PIN" for forgot_newpin), disabled when `pin.join("").length < 6 || isLoading`.
   - `onPress` calls the same `verifyPinCode(pin.join(""))` / `handleSetNewPin(newPin.join(""))`.
   - While `isLoading`, replace the label with an `ActivityIndicator` (small, white) instead of text — this is the "loading state" requested, distinct from the removed inline "Verifying…" text. Import `ActivityIndicator` from `react-native`.
4. Since `PinRow` is shared between two steps with different submit handlers, either:
   - (Recommended) Pass an `onSubmit: () => void` and `submitLabel: string` prop into `PinRow` and render the button inside it, or
   - Keep `PinRow` display-only and render the button in each step's block outside `PinRow` (simpler diff, slightly more duplication).
   - Pick whichever keeps the diff smallest given `PinRow`'s current prop shape; either is acceptable, no user-facing difference.

**Apply the same "no inline fetching text, explicit button with spinner" pattern to:**
- `app/(auth)/pin-entry.tsx` (the app-unlock PIN screen) — it doesn't currently show inline "Verifying" text, but it also has no manual submit button; add one below the PIN boxes for consistency (disabled until 6 digits, spinner while `isLoading`), keeping auto-submit-on-6-digits as-is.
- `app/(auth)/signup.tsx`'s PIN-setup step (step 3) — same idea: keep auto-submit-like flow (currently `handleSignUp` is only called by the button today, not auto-fired — check: signup's PIN step's `Pressable` already says "Finish & Create Account" / "Creating Account..." as text, not a spinner). Replace that loading text with an `ActivityIndicator` inside the button per the same pattern, since the prompt's intent ("no user feedback when fetching, use button loading state instead") generalizes to all these auth submit buttons, not just login.
- `app/(auth)/signup.tsx`'s OTP step and info step buttons, and `app/(auth)/verify-phone.tsx`'s buttons: same swap of loading-text → in-button `ActivityIndicator`, for visual consistency across the auth flow (optional but recommended since the prompt is about establishing a consistent, non-janky loading pattern; keep to a small time-box, this is a polish pass, not the core requirement).

Core requirement is only the **login PIN step** (remove "Verifying…" text, add tappable submit button with spinner, keep auto-submit). Treat the rest as a nice-to-have consistency pass if time allows — do not let it block finishing the required items below.

---

## 4. Profile tab: remove fake settings icon

`app/(tabs)/profile.tsx` (~lines 31-35):
```tsx
<View style={{ width: "100%", alignItems: "flex-end", marginBottom: Spacing.md }}>
  <Pressable>
    <Feather name="settings" size={24} color={Colors.white} />
  </Pressable>
</View>
```
This `Pressable` has no `onPress` — it's decorative and non-functional. Delete this whole `View` block. Adjust the avatar's `marginBottom`/header spacing if removing it leaves the header looking unbalanced (likely fine as-is since the avatar block already has its own `marginBottom: Spacing.md`).

---

## 5. Change PIN (with previous-PIN confirmation)

Backend already supports this — `POST /api/pin/change` (`backend/src/controllers/pinController.ts` → `changePin`, requires `{ oldPin, newPin }`, verifies old PIN via bcrypt before updating) and the frontend wrapper already exists: `changePin(oldPin, newPin)` in `src/services/api/pin.ts`. No backend/service changes needed — this is purely a new UI screen.

**Repurpose `app/security.tsx`** (currently biometrics-only, being gutted per step 1) into a "Change PIN" screen:

- Route stays registered in `app/_layout.tsx` as `Stack.Screen name="security"`.
- `app/(tabs)/profile.tsx`'s "Security" menu item keeps `onPress: () => router.push("/security")`.
- New screen content, 3-stage local flow (all client-side state, no navigation between screens needed):
  1. **Enter current PIN** — 6-box PIN input (reuse the same box styling/behavior fixed in step 2), label "Enter your current PIN".
  2. **Enter new PIN** — 6-box PIN input, label "Choose a new PIN". Add a lightweight guard: if new PIN === old PIN, show inline error "New PIN must be different" without calling the API.
  3. **Confirm new PIN** — 6-box PIN input, label "Confirm your new PIN". If mismatch vs stage 2, show inline error "PINs don't match" and reset stage 3's input (keep stage 2's value), matching the mismatch-handling pattern already used for forgot-PIN elsewhere.
  - On successful confirm match, call `changePin(oldPin, newPin)` from `src/services/api/pin.ts`. On success: haptic success, brief success state, `router.back()`. On failure (e.g. backend returns "Incorrect current PIN" for a 401), show the error and route back to stage 1 with cleared inputs.
- Follow the auto-advance/backspace fix from step 2 for all three PIN boxes here (build this screen with the *fixed* pattern from day one, don't copy the old buggy handlers).
- Use a submit button with spinner per step 3's pattern (no auto-submit-and-forget silently — since this is a security-sensitive change, an explicit "Confirm" tap per stage, matching how `login.tsx`'s new explicit button works, is fine; auto-submit-on-6-digits is also acceptable for consistency — pick whichever matches what gets built in step 3, keep it consistent across the app).
- Header/back button pattern: reuse the header layout already used in `app/notifications.tsx` (back arrow + centered title), same as the current `security.tsx` does.

---

## 6. Display name: signup → Personal Information settings

### Current state
- Firestore's `UserProfile.displayName` (`src/services/firebase/firestore.ts`) already exists as a field.
- At signup, `displayName` is currently always set equal to `username` (see `createPhoneUserProfile` in `src/services/firebase/auth.ts` line ~102, and `createGoogleUserProfile`/`signUp` similarly). There is no separate display-name input anywhere today.
- `updateUserProfile(uid, data: Partial<UserProfile>)` in `src/services/firebase/firestore.ts` already supports patch-updating just `{ displayName }` — no backend/service change needed for the update path either.
- Profile screen and home tab already read `profile?.displayName` for rendering (`app/(tabs)/profile.tsx` lines 49/93, `app/(tabs)/index.tsx` line 146) — so once it's set correctly at signup and editable later, display already works everywhere without further changes.

### 6a. Add a Display Name field to signup step 1

`app/(auth)/signup.tsx`:
- Add `const [displayName, setDisplayName] = useState("");` alongside `username`/`email`/`phone`.
- Add a new labeled `TextInput` in step 1's form, above or below the Username field (recommend directly above Username, since display name is the "friendly" identity and username is the "handle"). Same styling as the other step-1 inputs. Placeholder: `"Your name"`. No `autoCapitalize="none"` (unlike username/email) since it's a real name — use default `autoCapitalize="words"`.
- Do **not** add it to `checkAvailability`/uniqueness validation — display name is explicitly "only used as a display," i.e., non-unique, cosmetic only. Do not send it to `checkAvailability`.
- Validation: if empty, default to the username value at submission time (fallback), OR require it non-empty alongside the existing `if (!username || !email || !phone)` guard in `handleSendOtp` — simplest is to add `displayName` to that same required-fields check for a consistent "fill in all fields" error, since the prompt implies it's a real onboarding field, not optional chrome.
- Thread `displayName` through to the final creation call: `createPhoneUserProfile(user, username, email)` in `handleSignUp` (~line 235) needs an extra argument.

### 6b. Update `createPhoneUserProfile` to accept a separate display name

`src/services/firebase/auth.ts` (~lines 93-109):
```ts
export const createPhoneUserProfile = async (
  user: User,
  username: string,
  email: string
) => {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    username: username.toLowerCase(),
    displayName: username,   // <-- currently hardcoded to username
    phone: user.phoneNumber,
    stellarPublicKey: null,
    authProviders: user.providerData.map((p) => p.providerId),
    hasPin: false,
    createdAt: serverTimestamp(),
  });
};
```
Change signature to `createPhoneUserProfile(user: User, username: string, email: string, displayName: string)` and use the new `displayName` param (falling back to `username` if empty, as a defensive default) instead of hardcoding `displayName: username`.

Update the call site in `signup.tsx`: `createPhoneUserProfile(user, username, email, displayName.trim() || username)`.

(Leave `signUp` and `createGoogleUserProfile` in `src/services/firebase/auth.ts` alone unless those signup paths are actually reachable/used in the app's current navigation — grep confirms only the phone/email OTP signup flow in `signup.tsx` is wired to a real screen today; the plain-password `signUp` and Google flows aren't reachable from any current screen, so don't scope-creep into them.)

### 6c. Personal Information settings screen

`app/(tabs)/profile.tsx`'s menu currently has a "Personal Information" item with a no-op `onPress: () => {}` (~line 108). Build the real screen:

- New file `app/personal-information.tsx`, following the same header/back-button pattern as `app/notifications.tsx` / `app/security.tsx`.
- Register it in `app/_layout.tsx`: `<Stack.Screen name="personal-information" options={{ animation: "slide_from_right" }} />`.
- Repoint the profile menu item: `{ icon: "user", title: "Personal Information", onPress: () => router.push("/personal-information") }`.
- Screen content:
  - Single editable field: **Display Name**, pre-filled from `useAuth().profile?.displayName`.
  - Read-only display (not editable here, per scope — the prompt only asks for display name to be editable) of username/email/phone for context, styled as disabled/muted rows — reuse the profile-detail-row visual pattern already in `app/(tabs)/profile.tsx`'s Stellar Account card (label + value, no input).
  - A "Save" button: on press, validate non-empty, call `updateUserProfile(auth.currentUser.uid, { displayName: trimmedValue })`, then update the local `authStore` profile so the change reflects immediately without a re-fetch:
    - `useAuthStore.getState().setProfile({ ...profile, displayName: trimmedValue })` (or expose a small helper) — check `src/store/authStore.ts` for the exact setter name (`setProfile`) and use it directly via the `useAuthStore` hook already used by `useAuth`.
  - Loading state on Save button while the Firestore write is in flight (spinner swap, same pattern as step 3).
  - Success: haptic success + `router.back()`.
  - Failure: inline error text, no navigation.

---

## Summary of files touched

**Deleted:**
- `src/services/api/biometrics.ts`
- `src/hooks/useBiometrics.ts`

**Modified:**
- `app/(auth)/pin-entry.tsx` — remove biometrics, fix PIN box UX, add submit button
- `app/(auth)/login.tsx` — remove biometrics references (none present, skip if absent), remove "Verifying…" text, add submit button+spinner, fix PIN/OTP box UX (login has no OTP boxes, just PIN)
- `app/(auth)/signup.tsx` — fix OTP/PIN box UX, add displayName field + threading, loading-spinner polish pass
- `app/(auth)/verify-phone.tsx` — fix OTP box UX
- `app/(tabs)/profile.tsx` — remove fake settings icon, repoint Security + Personal Information menu items
- `app/_layout.tsx` — repoint/confirm `security` route content owner, register new `personal-information` route
- `src/services/firebase/auth.ts` — `createPhoneUserProfile` gains `displayName` param
- `package.json` (via `npx expo uninstall`) — drop `expo-local-authentication`, `expo-secure-store` if confirmed unused elsewhere

**Rewritten (content replaced, not deleted):**
- `app/security.tsx` — was biometrics settings, becomes Change PIN screen

**New:**
- `app/personal-information.tsx` — display name editor

**Explicitly unchanged (already correct, verified during planning):**
- `backend/src/controllers/pinController.ts` — `changePin` already implemented correctly
- `src/services/api/pin.ts` — `changePin` wrapper already exists
- `src/services/firebase/firestore.ts` — `updateUserProfile`/`UserProfile.displayName` already support this
- `backend/src/controllers/authController.ts` / `authRoutes.ts` / `src/services/api/auth.ts` (`checkAvailability`) — no change, display name is intentionally excluded from uniqueness checks

---

## Verification checklist for the executing agent

1. `npx tsc --noEmit` (root) — must pass clean.
2. `cd backend && npx tsc --noEmit` — must pass clean (only touched if biometrics touched backend, which it doesn't — this is a sanity check, not expected to change).
3. Grep for `expo-local-authentication`, `expo-secure-store`, `useBiometrics`, `biometric` (case-insensitive) across `app/` and `src/` — must return zero matches after step 1.
4. Manually trace: signup step 1 → `displayName` state → `handleSignUp` → `createPhoneUserProfile(user, username, email, displayName)` → Firestore doc has the typed display name, not the username, when they differ.
5. Confirm `app/(tabs)/profile.tsx` has no bare `<Pressable>` with no `onPress` remaining in the header.
6. Confirm every PIN/OTP `<TextInput>` in the four touched auth screens has `maxLength={1}`, and every `onKeyPress` backspace handler clears+moves in one step when the box is already empty.
