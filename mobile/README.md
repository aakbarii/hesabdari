# Android APK + SMS bridge

Web/PWA **cannot** read phone SMS (iOS never allows it; Android Chrome also blocks it).

## What works today

1. Deploy the Next app (e.g. Vercel).
2. Open **صندوق پیامک بانکی** → Generate token.
3. Build the Android shell with Capacitor (below).
4. The Android helper POSTs new bank SMS to:

```http
POST https://YOUR_DOMAIN/api/bank-sms
Content-Type: application/json

{ "text": "<sms body>", "sender": "<from>", "token": "<smsIngestToken>" }
```

Suggestions land in the inbox as **pending** until you confirm.

## Build APK (Capacitor)

Prerequisites: Node 20+, Android Studio, JDK 17.

```bash
# from repo root
npm run build
npx cap add android   # first time only
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Or CLI (after `android/` exists):

```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## SMS permission

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECEIVE_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
```

Wire a small BroadcastReceiver (or Capacitor SMS plugin) that calls the ingest endpoint with the token stored in app preferences.

## Phone-number illusion

There is no API that “attaches” an arbitrary Iranian bank SMS stream to a website by phone number alone. Options:

- This Android APK on the phone that receives bank SMS
- Manual paste in the inbox
- A paid SMS gateway (usually not available for Iranian bank senders)

## Security

- Keep `GEMINI_API_KEY` only in server env
- Rotate the SMS ingest token if leaked
- Rotate Gemini key if it was shared in chat
