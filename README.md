# FUDS Mobile App

This is the Expo-based mobile client for FUDS, a food delivery experience built with React Native, Expo Router, and a FastAPI backend.

## What the app includes

- Splash and authentication flow with registration, login, OTP verification, and profile setup
- Home browsing with categories, vendor discovery, search, and meal discovery
- Vendor and product screens for browsing offers and item details
- Cart, checkout, and order tracking flows
- Payment setup with Paystack integration and account settings
- Privacy, permissions, and support/settings screens

## Tech stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript
- Expo Secure Store, Location, Haptics, and Web Browser

## Prerequisites

Make sure you have:

- Node.js 20+ and npm
- An Expo-compatible device or emulator
- The FUDS backend running and reachable

## Setup

From the project root:

```bash
cd /home/codenamemomi/Documents/FUDS/dev/fuds_mobile_app_fresh
npm install
```

## Run the app

Start the development server:

```bash
npm start
```

Then open one of the following:

- Android emulator: `npm run android`
- iOS simulator: `npm run ios`
- Web preview: `npm run web`

## Backend connection

The mobile app calls the FastAPI backend under `/api/v1`. The backend URL is resolved in [src/config/backend.ts](src/config/backend.ts).

For local development, update the configured backend origin if needed:

```ts
// src/config/backend.ts
export const EXPLICIT_BACKEND_URL = 'http://192.168.1.102:8000';
```

Useful defaults:

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator / web: `http://localhost:8000`
- Physical device on the same network: your computer LAN IP, for example `http://192.168.1.42:8000`

## Project structure

- [src/app](src/app) — Expo Router screens and routes
- [src/components](src/components) — reusable UI elements
- [src/context](src/context) — authentication and theme state
- [src/lib](src/lib) — API client, token helpers, and app logic
- [src/config](src/config) — backend and environment configuration

## Useful scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
npm run reset-project
```

## Troubleshooting

- If you see a network error, confirm the backend is running and that the backend URL in [src/config/backend.ts](src/config/backend.ts) matches your environment.
- If authentication fails, verify the backend auth endpoints and that the app can reach them.
- If location or permissions are not working, ensure the emulator/device has the required permissions enabled.
