# D-10 Therapeutics — Mobile Demo (BLE Ready)

High-fidelity iOS demo for the D-10 Therapeutics wearable. The current UI
(Dashboard, Trends, Pain, History, Meds) is unchanged; a BLE integration seam
was added underneath so Dylan's wearable can be plugged in for the live demo.

---

## Architecture at a glance

```
                         App.tsx
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
       LoginScreen              session (src/state/session.ts)
    (role selector)                      │
              │                           ▼
              └──── patient ─────►  Patient Tab Navigator
              │                      (Dashboard, Trends, Pain, History, Meds)
              └── caregiver  ─────►  ClinicianDashboardScreen
              └── hematologist ───►  ClinicianDashboardScreen

Both role views read from the same shared layer:

  useSensorData hooks
        │
        ▼
  src/data/SensorAdapter.ts           ◄── mock ⇆ hardware router + snapshot ring buffer
        │       ▲
        │       │  (incoming snapshots)
        ▼       │
  src/data/hardwareSnapshotAdapter.ts ◄── parses + normalizes + fills missing fields
        ▲
        │
  src/ble/wearableBleService.ts       ◄── scan / connect / subscribe / disconnect
  src/ble/wearableBleConfig.ts        ◄── UUID placeholders (TODO for Dylan)
  src/data/telemetrySink.ts           ◄── Noop cloud hook
```

Patient Dashboard and Trends, plus the Clinician Dashboard (Caregiver /
Hematologist), all consume the same `SensorAdapter`. Pain, History, Meds,
and Emergency remain on their original mocks.

## Demo login / role selector

On launch the app shows a clean `LoginScreen` with a branded header, email
and password fields (values are ignored, this is not real auth), and three
role options:

- **Patient** → current tabbed app (Dashboard, Trends, Pain, History, Meds)
- **Caregiver** → `ClinicianDashboardScreen` with a remote-monitoring label
- **Hematologist** → same screen, labelled "Hematology View" with
  hemoglobin pushed to the top of the trend list

Sign out:

- **Clinician view** – tappable "SIGN OUT" chip in the top-right.
- **Patient view** – long-press the avatar in the Dashboard top-left to
  open the Dev Panel, then tap "Sign out of demo". This keeps the polished
  patient UI free of admin controls.

Session state lives in `src/state/session.ts` (tiny observable store, no
real auth).

---

## Running on a real iPhone

Bluetooth cannot work in Expo Go. This app is set up as an **Expo
development build**.

### First-time setup (Mac with Xcode)

```bash
cd d10-mobile
npm install
npx expo prebuild --platform ios       # generates /ios
npx expo run:ios --device              # pick your iPhone from the list
```

After the dev build is installed on the phone, day-to-day work is:

```bash
npm run start:dev-client
```

and scan the QR code from the installed dev build app on the phone.

### iOS permissions (already configured in `app.json`)

- `NSBluetoothAlwaysUsageDescription`
- `NSBluetoothPeripheralUsageDescription`
- `react-native-ble-plx` Expo config plugin with `neverForLocation: true`

No Location permission is required for BLE on iOS 13+.

---

## BLE wiring

All hardware-specific identifiers live in one file:

```5:16:d10-mobile/src/ble/wearableBleConfig.ts
export const BLE_TARGET_DEVICE_NAME_PREFIX = 'D10-BAND';

/**
 * TODO(dylan-ble): set to wearable primary service UUID.
 */
export const BLE_WEARABLE_SERVICE_UUID = '0000FFF0-0000-1000-8000-00805F9B34FB';

/**
 * TODO(dylan-ble): set to characteristic UUID that streams latest snapshot JSON.
 */
export const BLE_LATEST_SNAPSHOT_CHARACTERISTIC_UUID =
  '0000FFF1-0000-1000-8000-00805F9B34FB';
```

Replace these three values with Dylan's final identifiers when they are known.
Nothing else in the app needs to change.

### What the BLE service does

`src/ble/wearableBleService.ts` exposes a tiny, isolated class with exactly
these methods:

- `scanForPeripheral(timeoutMs)` – scans, matches on name prefix, resolves with a device
- `connect(deviceId)` – connects + discovers services and characteristics
- `subscribeToLatestSnapshot()` – monitors the snapshot characteristic, base64 decodes, JSON-parses, normalizes, and forwards to the adapter
- `scanConnectAndSubscribe()` – convenience used by the Dev Panel
- `disconnect()` / `destroy()` – cleanup

State is reported through an `onStateChange(state, errorMessage)` callback
to the `SensorAdapter`, using the contract in
`src/data/telemetrySink.ts`:

```
disconnected | scanning | connecting | connected | receiving | error
```

---

## Incoming payload contract

Hardware is expected to notify on the snapshot characteristic with a JSON
string (base64 over BLE as usual):

```json
{
  "deviceId": "D10-BAND-001",
  "timestamp": "2026-04-20T14:32:10Z",
  "heartRate": 78,
  "spo2": 97,
  "hbTrendIndex": 100,
  "battery": 88
}
```

Only `timestamp` is treated as required. Any missing or malformed field is
tolerated — the parser returns safe fallbacks rather than crashing.

Parsing lives in `src/data/hardwareSnapshotAdapter.ts` →
`parseAndNormalizeWearableSnapshot(payload)`. It accepts `string`,
`Uint8Array`, `ArrayBuffer`, or a plain object, guards all numeric fields
with clamps, and produces a `NormalizedWearableSnapshot`.

### Fallbacks for fields the current hardware cannot send

| UI field          | Source                                                       |
| ----------------- | ------------------------------------------------------------ |
| Heart Rate        | `heartRate` from device → clamp(35..220) → fallback 74 bpm   |
| Blood Oxygen      | `spo2` from device → clamp(70..100) → fallback 97%           |
| Hemoglobin (g/dL) | derived from `hbTrendIndex` around 9.2 g/dL                  |
| Temperature       | stable fallback 98.6 °F                                      |
| Hydration         | derived from SpO₂ + HR (`Optimal` / `Fair` / `Low`)          |
| Battery           | shown only if present in payload, otherwise hidden           |
| Risk banner       | derived from `spo2`, `heartRate`, `hbTrendIndex`             |
| Trend history     | recent snapshots from the local ring buffer                  |

No `NaN`, `undefined`, or broken card states are possible from partial input.

---

## Trends (short-term history)

`SensorAdapter` keeps an in-memory ring buffer of the last ~120 normalized
snapshots. Trends Screen reads from that buffer so live data visibly moves
over time during the demo. No backend / persistence added.

If fewer than 3 snapshots have arrived, trends fall back to a deterministic
curve around the latest snapshot so the cards still render nicely.

---

## Connection state in the UI

A subtle pill sits next to the "Metasebya Health" title on the Dashboard
(`WearableConnectionPill`). Colors:

- Disconnected – muted outline
- Scanning / Connecting – tertiary (amber)
- Connected – green
- Receiving – brand teal
- Error – red

Nothing noisy lives in the primary experience.

---

## Developer / Dev Panel

Hidden behind a **long-press on the avatar circle** in the top-left of
both the Patient Dashboard and the Clinician Dashboard. `WearableDevPanel`
lets you:

- Switch between `mock`, `hardwareSnapshot`, and `ble`
- Scan + connect / disconnect
- Inject a simulated snapshot for dry-runs without hardware
- See connection state, last error, and the raw last payload
- Sign out of the demo

This is intentionally kept out of the main UX.

## Clinician (caregiver / hematologist) view

`ClinicianDashboardScreen` reads the same shared state as the patient app
and presents it for a remote observer:

- Patient header (name, ID, age, condition, last-update timestamp)
- Connection pill (mock / scanning / connecting / connected / receiving / error)
- Clinical alert banner (active vs calm, derived from the shared risk state)
- Current risk pill + description
- Vitals snapshot grid (same `VitalCard`s as the patient dashboard)
- Three mini 7-day trend cards, ordered by role:
  - hematologist: Hemoglobin · SpO₂ · Heart Rate
  - caregiver:    Heart Rate · SpO₂ · Temperature
- Medication adherence summary
- Recent crisis history (top 3)

Because the view pulls from `SensorAdapter`, any change on the hardware
snapshot or via the Dev Panel is reflected on all role views
simultaneously — useful if two phones are connected during the demo.

---

## Optional cloud hook

`src/data/telemetrySink.ts` defines a `TelemetrySink` interface and a
`NoopTelemetrySink` that is wired by default. If/when Firebase or Supabase
is added, replace `NoopTelemetrySink` with a real implementation — nothing
else has to change.

---

## What the hardware team needs to send

When Dylan's firmware is ready:

1. Confirm the BLE advertising name prefix (currently matched on `D10-BAND`).
2. Share the primary service UUID.
3. Share the characteristic UUID that notifies the JSON snapshot.
4. Confirm payload encoding (UTF-8 JSON is assumed).

Paste these into `src/ble/wearableBleConfig.ts` — see `TODO(dylan-ble)`
markers. No rebuild of the TS layer is required; a development build
rebuild is only required if you change `app.json` or native config.

## What still remains before full live integration

- [ ] Receive final UUIDs and advertising name from Dylan and paste into
      `src/ble/wearableBleConfig.ts`.
- [ ] Build and install the iOS dev build on the presentation iPhone
      (`npx expo prebuild --platform ios && npx expo run:ios --device`).
- [ ] One end-to-end smoke test with the real wearable: scan → connect →
      receive snapshot → verify Dashboard + Clinician view update.
- [ ] Optional: replace `NoopTelemetrySink` with a hosted feed if a
      shared dashboard URL is desired.

## Optional cloud / hosting (future)

If a web or hosted clinician view is needed later, the cleanest path is:

1. Implement `TelemetrySink` in `src/data/telemetrySink.ts` with Firebase,
   Supabase, or a simple REST endpoint.
2. Swap `NoopTelemetrySink` for that implementation in
   `src/data/SensorAdapter.ts`.
3. Stand up a tiny web app (or reuse `d10-app/`) reading from that same
   sink. No change to the mobile app required.

Nothing in the Thursday demo depends on this work.

---

## Scripts

```bash
npm run start              # expo start (Metro)
npm run start:dev-client   # expo start --dev-client (for device builds)
npm run ios                # expo start --ios
npm run ios:prebuild       # expo prebuild --platform ios (regenerate /ios)
```
