# ₹ Fast Expense Tracker — India
### React Native + Firebase MVP | Production-Ready

---

## 📁 Project Structure

```
FastExpenseTracker/
├── App.js                        ← Root: auth gate, NavigationContainer
├── app.json                      ← Expo config
├── package.json
├── babel.config.js
├── firestore.rules               ← Security rules (deploy to Firebase)
├── firestore.indexes.json        ← Composite index for date queries
│
├── /components
│   ├── UI.js                     ← Shared: Button, Card, Chip, EmptyState…
│   ├── ExpenseItem.js            ← Single expense row (long-press to delete)
│   └── LimitWarningBanner.js     ← Animated red banner when limit exceeded
│
├── /screens
│   ├── AuthScreen.js             ← Login + Register (tab toggle)
│   ├── HomeScreen.js             ← Dashboard: today's total, limit, progress
│   ├── AddExpenseScreen.js       ← Fast-add with WhatsApp-style parsing
│   ├── HistoryScreen.js          ← Expense list with Today/Week/Month filter
│   └── SettingsScreen.js         ← Daily limit, profile, premium placeholder
│
├── /services
│   ├── firebase.js               ← Firebase init (replace config here!)
│   ├── authService.js            ← register, login, logout, getUserProfile
│   └── expenseService.js         ← addExpense, deleteExpense, real-time subs
│
├── /utils
│   ├── expenseParser.js          ← Core: "200 food" → { amount, category }
│   ├── formatters.js             ← Currency, dates, emojis, sum helpers
│   └── theme.js                  ← Design tokens: colors, typography, spacing
│
├── /hooks
│   ├── useAuth.js                ← Auth state + Firestore profile (real-time)
│   └── useExpenses.js            ← Today's expenses (real-time)
│
└── /navigation
    └── AppNavigator.js           ← Bottom tab navigator + custom tab bar
```

---

## 🚀 Step-by-Step Setup

### Step 1: Install Prerequisites

```bash
# Install Node.js 18+ from https://nodejs.org
node --version   # should be 18+

# Install Expo CLI globally
npm install -g expo-cli eas-cli

# Install Android Studio + set ANDROID_HOME
# https://developer.android.com/studio
```

### Step 2: Clone / Create the Project

```bash
# Create a new Expo project (bare workflow not needed — use managed)
npx create-expo-app FastExpenseTracker --template blank
cd FastExpenseTracker

# Delete the starter App.js — you'll replace it with the files above
```

### Step 3: Copy Project Files

Copy **all files from this project** into your `FastExpenseTracker/` folder,
maintaining the exact folder structure shown above.

### Step 4: Install Dependencies

```bash
npm install

# Or yarn
yarn install
```

This installs:
- `firebase` ^10 (Auth + Firestore)
- `@react-navigation/native` + tabs + native-stack
- `react-native-screens`, `react-native-safe-area-context`
- `@react-native-async-storage/async-storage` (auth persistence)
- `@expo/vector-icons`

---

## 🔥 Firebase Setup (Critical)

### Step 1: Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `fast-expense-india`
3. Disable Google Analytics (optional)

### Step 2: Enable Authentication

1. Sidebar → **Authentication** → **Get started**
2. **Sign-in method** tab → **Email/Password** → Enable → Save

### Step 3: Create Firestore Database

1. Sidebar → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (we'll add rules later)
3. Select a region close to India (e.g., `asia-south1` = Mumbai)

### Step 4: Register Your Android App

1. Project Overview → **Add app** → Android icon
2. **Package name:** `com.fastexpense.india`
3. Download `google-services.json`
4. Place it in the **root** of your project: `FastExpenseTracker/google-services.json`

### Step 5: Get Web Config (for Firebase JS SDK)

1. Project Overview → **Add app** → Web icon `</>`
2. Register app → Copy the `firebaseConfig` object
3. Open `services/firebase.js` and **replace the placeholder config**:

```js
// services/firebase.js — replace this:
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',            // ← paste your value
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

### Step 6: Deploy Security Rules

In Firebase Console → **Firestore** → **Rules** tab, paste the contents of
`firestore.rules` and click **Publish**.

### Step 7: Create Firestore Index

In Firebase Console → **Firestore** → **Indexes** tab → **Add index**:

| Collection | Field 1 | Field 2 | Query scope |
|---|---|---|---|
| expenses | userId ASC | date DESC | Collection |

Or deploy automatically:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:indexes
```

---

## ▶️ Running the App

### Android Emulator

```bash
# Start the Metro bundler
npx expo start

# Press 'a' to open on Android emulator
# OR scan the QR code with Expo Go app on your phone
```

### Physical Android Device

```bash
# Install Expo Go from Play Store on your phone
npx expo start
# Scan the QR code shown in terminal
```

### Build APK for production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build Android APK
eas build -p android --profile preview
```

---

## 📱 How to Use the App

### Adding an Expense (< 3 seconds)

1. Tap the **＋** button in the tab bar
2. Type in the format: `[amount] [category]`
   - `200 food` → ₹200 in food
   - `50 auto` → ₹50 transport
   - `1500 rent` → ₹1500 rent
   - `120 grocery dal` → ₹120 groceries with note "dal"
3. Tap **"Add Expense"** or press Enter

### Category Shortcuts
Tap the quick-chips (Food, Auto, Grocery, etc.) to auto-fill the category
after you've typed the amount.

### Setting Your Daily Limit
1. Go to **Settings** tab
2. Tap a preset (₹200, ₹500, ₹1000…) or type a custom amount
3. Tap **Set**

### Limit Exceeded Warning
When today's spending exceeds your daily limit:
- The Home screen turns **red**
- An animated 🚨 banner shows the overage amount
- The spending card shows the amount in red

### Deleting an Expense
In **History** tab → Long-press any expense → Confirm delete.

---

## 🧠 Core Logic Explained

### Expense Parser (`utils/expenseParser.js`)

```
Input:  "200 food"
Tokens: ["200", "food"]
Output: { amount: 200, category: "food", note: "" }

Input:  "120 grocery dal chawal"
Output: { amount: 120, category: "groceries", note: "dal chawal" }

Input:  "abc xyz"  → returns null (invalid)
Input:  "200"      → { amount: 200, category: "other", note: "" }
```

Category aliases auto-correct:
- `auto` → `transport`
- `chai` → `food`
- `petrol` → `fuel`
- `medicine` → `health`
- (30+ aliases built-in)

### Real-time Updates

All expense data uses Firestore `onSnapshot` listeners, so:
- When you add an expense on one device, Home + History update instantly on all devices
- No manual refresh needed

### Firestore Schema

```
/users/{uid}
  userId: string
  name: string
  email: string
  dailyLimit: number  (default 500)
  createdAt: Timestamp

/expenses/{expenseId}
  userId: string      (FK → users)
  amount: number
  category: string
  note: string
  date: Timestamp     (server timestamp)
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---|---|
| `Firebase: Error (auth/invalid-api-key)` | Check `services/firebase.js` config values |
| Firestore queries fail | Create the composite index (Step 7 above) |
| App crashes on launch | Run `npx expo install` to fix version mismatches |
| Emulator not detected | Enable USB debugging, run `adb devices` |
| Hot reload breaks Firebase | Cold restart Metro: press `r` in terminal |

---

## 🔐 Security Notes

- Firestore rules ensure users can only access **their own data**
- Passwords are handled entirely by Firebase Auth (never stored in Firestore)
- Auth tokens auto-refresh via Firebase SDK

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `expo ~51` | Managed React Native runtime |
| `firebase ^10` | Auth + Firestore |
| `@react-navigation/native` | Navigation container |
| `@react-navigation/bottom-tabs` | Tab bar |
| `@react-navigation/native-stack` | Stack screens |
| `react-native-screens` | Native screen optimization |
| `react-native-safe-area-context` | Safe area insets |
| `@react-native-async-storage/async-storage` | Auth persistence |
| `@expo/vector-icons` | Icon support |
