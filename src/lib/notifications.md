# Telegram + Push Notification Setup

This project now supports:

1. **Telegram group updates** via `broadcast-site-update` edge function.
2. **Phone push notifications** for installed app users who enable notifications.

## Required Supabase secrets

Set these in Supabase Edge Functions secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `VAPID_SUBJECT` (ex: `mailto:admin@yoursite.com`)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Also set frontend env var:

- `VITE_VAPID_PUBLIC_KEY`

## Usage

- Creating a new announcement in Admin will broadcast to Telegram + push.
- Creating a new drop in Admin will broadcast to Telegram + push.
- Users can open `/install` and click **Enable Notifications** to register their phone/app for push.
