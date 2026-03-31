# Naily 💅

מערכת ניהול תורים וצבעים לסלון מניקור — בנויה עם React, Node.js ו-Supabase.

---

## דרישות מוקדמות

- Node.js 18+
- חשבון Supabase (חינמי בכתובת https://supabase.com)
- חשבון Twilio (לשליחת SMS — אופציונלי)

---

## הגדרה ראשונית

### 1. Supabase

1. צרי פרויקט חדש ב-Supabase
2. גשי ל-**SQL Editor** והריצי את הקובץ:
   ```
   supabase/migrations/001_init.sql
   ```
3. העתיקי את הפרטים הבאים מהגדרות הפרויקט:
   - `Project URL`
   - `anon public` key
   - `service_role` key

### 2. Server

```bash
cd server
cp .env.example .env
# מלאי את הפרטים ב-.env
npm install
npm run dev
```

קובץ `.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TWILIO_ACCOUNT_SID=AC...           # אופציונלי
TWILIO_AUTH_TOKEN=...              # אופציונלי
TWILIO_FROM_NUMBER=+1234567890     # אופציונלי
PORT=3001
```

### 3. Client

```bash
cd client
cp .env.example .env
# מלאי את הפרטים ב-.env
npm install
npm run dev
```

קובץ `.env`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3001
```

---

## הרצה

```bash
# Terminal 1 — Server
cd server && npm run dev

# Terminal 2 — Client
cd client && npm run dev
```

הממשק יהיה זמין בכתובת: http://localhost:5173

---

## מבנה הפרויקט

```
naily/
├── shared/
│   └── seedColors.js          # 5 צבעי ברירת מחדל
├── supabase/
│   └── migrations/
│       └── 001_init.sql       # DDL, RLS, triggers
├── server/
│   ├── src/
│   │   ├── index.js           # Express app
│   │   ├── lib/supabase.js
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── colors.js
│   │   │   ├── appointments.js
│   │   │   └── clients.js
│   │   └── services/sms.js    # Twilio
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx
    │   ├── context/AuthContext.jsx
    │   ├── lib/{api,supabase}.js
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── ColorsPage.jsx
    │   │   ├── BookingPage.jsx         # /book/:techId — ציבורי
    │   │   └── BookForClientPage.jsx
    │   └── components/
    │       ├── AppointmentCard.jsx
    │       ├── ColorSwatch.jsx
    │       └── ColorScanner.jsx        # זיהוי צבע מתמונה
    └── package.json
```

---

## פיצ'רים עיקריים

- **הרשמה/התחברות** למניקוריסטית
- **דשבורד** עם תורים היום וסטטיסטיקות
- **ניהול צבעים** — הוספה, מחיקה, סימון אזל
- **סורק צבעים** — העלאת תמונה וזיהוי צבע דומיננטי עם שם בעברית
- **קישור הזמנה ציבורי** — לקוחות קובעות תור בלי התחברות
- **קביעת תור על ידי המניקוריסטית** עם Autocomplete לשמות לקוחות
- **SMS אוטומטי** עם Twilio לאישור תורים
