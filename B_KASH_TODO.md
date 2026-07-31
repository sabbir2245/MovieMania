# bKash Payment Integration — TO-DO (do later)

This file lists everything required to make the **Premium** payment feature work.
Right now the bKash keys in `.env` are placeholders, so checkout fails with
"Failed to initiate payment" until these steps are done.

## 1. Get real bKash sandbox credentials
- [ ] Go to the bKash developer portal: https://developer.bka.sh
- [ ] Sign up / log in.
- [ ] Create a **sandbox** application.
- [ ] Copy the sandbox **App Key** and **App Secret**.

## 2. Put the keys in `.env`
- [ ] Edit `E:\codes\MovieMania\MovieMania\.env` and set:
  ```
  B_KASH_APP_KEY=your_real_sandbox_app_key
  B_KASH_APP_SECRET=your_real_sandbox_app_secret
  ```
- [ ] Restart the backend server (`npm start` or `start.bat`).
- [ ] Verify the key once more:
  - Checkout should now return `paymentID` + `bkashURL` instead of an error.

## 3. Make the backend publicly reachable (required for the callback)
bKash redirects the payer to `BASE_URL/api/premium/callback`. bKash's servers must
be able to reach your backend, so `localhost` will NOT work.
- [ ] Deploy the backend (Render, Railway, Vercel serverless, etc.).
- [ ] Set `BASE_URL` in `.env` to the public URL, e.g.:
  ```
  BASE_URL=https://your-backend.onrender.com
  ```
- [ ] Confirm the deployed URL is HTTPS and reachable from the internet.

## 4. Test the full payment flow
- [ ] Sign in as a user.
- [ ] Go to the `/premium` page and click **Upgrade to Premium**.
- [ ] Complete payment in the bKash sandbox portal.
- [ ] Confirm you're redirected back to `/premium?status=success&trxID=...`.
- [ ] Check that the user's `premiumtype` becomes `premium` in Supabase:
  ```sql
  SELECT username, premiumtype FROM public."Users";
  ```

## 5. (Optional) Demo without real bKash
- [ ] If bKash keys aren't available yet, ask to add a **mock sandbox payment**
      endpoint that simulates a successful payment so Premium can be demonstrated.
