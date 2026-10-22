# 🏆 KBC College Fest Quiz Platform

A synchronized, live multi-player quiz platform inspired by **Kaun Banega Crorepati (Who Wants to Be a Millionaire)**, designed for college fests, inter-college tournaments, and auditorium trivia events.

Hosted on **GitHub Pages** with a **Firebase Firestore** real-time backend.

---

## ✨ Key Features

1. **Host / Admin Control Center**:
   - Live broadcast coordinator: **Launch Question**, **Lock Answers**, **Reveal Correct Answer**, **Show Poll Graph**, and **Show Leaderboard**.
   - Live contestant submissions stream: See in real time who answered, their speed in milliseconds (*fastest finger*), and vote percentages.
   - 15-Level Question Bank Editor with custom prize money, time limits, categories, and explanations.
   - Backup **Flip Question** support for each level.
   - Quick **JSON Import & Export** for preparing questions in advance.
   - Contestant account manager with **Bulk Account Generator** (e.g. `team1` to `team20`).

2. **Contestant Client Dashboard**:
   - Simple login using assigned **Username & Password**.
   - Classic KBC hot seat interface with diamond buttons, ticking sound effects, and tension animations.
   - **3 Lifelines**:
     - **50:50**: Drops two incorrect options locally.
     - **Audience Poll**: Aggregates real-time participant votes or intelligent audience distribution.
     - **Flip Question**: Swaps the question for an alternative backup question.
   - Safe Haven milestones (₹10,000 at Q5, ₹3,20,000 at Q10, ₹1 Crore jackpot).
   - Instant feedback with celebration confetti and sound effects.

3. **Auditorium / Big Screen Projector View**:
   - High-contrast, large-font layout optimized for projection in an auditorium or stage HDMI display.
   - Synchronized big clock, questions, options, live poll charts, and winner podium.

4. **Zero-Dependency Audio**:
   - Web Audio API synthesizer for clock ticks, lock chime, victory fanfare, and buzzer. Works 100% reliably on GitHub Pages with no broken MP3 URLs or CORS issues.

5. **Instant Local Multi-Tab Sync (Offline Test Mode)**:
   - Built-in `BroadcastChannel` synchronization lets you test the multi-player quiz across multiple browser windows immediately, even before adding Firebase keys!

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Navigate to the project directory
cd kbc-quiz-fest

# 2. Install dependencies (already installed)
npm install

# 3. Start the dev server
npm run dev
```

## 🌐 Pages & URLs

1. **Contestant Hot Seat** (Default website root: `/` or `/#/`):
   - Only for participants.
   - No admin options or switches are visible.
   - Teams log in with their assigned username and password.

2. **Stage Projector / Auditorium** (`/project` or `/#/project`):
   - **Unlocked** (no login needed).
   - Designed for the auditorium projector screen.
   - Displays the questions, big timer, audience poll, and **the real-time locked answers of every team**!

3. **Host Admin Console** (`/console` or `/#/console`):
   - **Behind credentials**: Enter password `98384` to access.
   - Master quiz broadcast coordinator, questions editor, and team account manager.

---

### How to test multiplayer locally:
1. Open **Tab 1**: Navigate to `http://localhost:5173/console` -> Enter password `98384`.
2. Open **Tab 2**: Navigate to `http://localhost:5173/project` -> Stage projector screen.
3. Open **Tab 3**: Navigate to `http://localhost:5173/` -> Log in with a team account.
4. From Tab 1 (Host), click **1. Launch Question**. Watch Tab 2 and Tab 3 instantly update!

## 🔑 Credentials & Security

- **Admin Master Password**: `98384` *(can also be edited directly inside the Admin Panel -> Security tab)*
- **Team Accounts**: Contestants can only log in with accounts created by the Admin in the **Team Accounts** panel. No open public self-registration.
- **Firebase Project Connected**: `quiz-jose-92227` (pre-configured and ready for live sync).

---

## ☁️ Connecting Firebase Firestore

To allow participants across campus to play from their phones or laptops:

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a free project.
2. In the left sidebar, click **Build > Firestore Database** -> Click **Create Database**.
3. Choose **Start in test mode** (allows read/write during your fest).
4. Go to **Project Settings** (gear icon) > **General** > Scroll down to **Your apps** > Select **Web (`</>`)** > Register app.
5. Copy the `firebaseConfig` object values (`apiKey`, `authDomain`, `projectId`, `appId`).
6. In the app:
   - Open **Admin Host** > Go to **Firebase & Setup** tab.
   - Paste the keys and click **Save Configuration & Reload**.
   *(Alternatively, paste them directly into `src/services/firebaseConfig.js`)*

### Recommended Firestore Security Rules:
In Firebase Console > Firestore Database > **Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Open for event participants during fest
    }
  }
}
```

---

## 🌐 Deploying to GitHub Pages

### Method 1: One-Command Deploy (via `gh-pages`)

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for KBC Fest Quiz"
   ```
2. Create a repository on GitHub (e.g. `kbc-quiz-fest`).
3. Add the remote and push:
   ```bash
   git remote add origin https://github.com/<your-username>/kbc-quiz-fest.git
   git branch -M main
   git push -u origin main
   ```
4. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```
5. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment**, ensure Source is set to **Deploy from a branch** and branch is `gh-pages` / `/ (root)`.
   - Your site is live at: `https://<your-username>.github.io/kbc-quiz-fest/`

### Method 2: Automatic GitHub Actions

The repository includes `.github/workflows/deploy.yml`. When you push to `main`, GitHub will automatically build and deploy the site! Just enable **GitHub Actions** under repository Settings > Pages.

---

## 📁 Project Structure

```
kbc-quiz-fest/
├── src/
│   ├── components/
│   │   ├── AdminPanel.jsx         # Host broadcast controller, question CRUD, bulk accounts
│   │   ├── AuditoriumView.jsx     # Stage / Projector big-screen display
│   │   ├── Header.jsx             # Role switcher, audio toggles, live connection badge
│   │   ├── LeaderboardModal.jsx   # Live team rankings and scores
│   │   ├── LoginModal.jsx         # Contestant & admin login modal
│   │   └── ParticipantView.jsx    # KBC hot seat game screen with lifelines & timer
│   ├── data/
│   │   └── defaultQuestions.js    # 15-question KBC ladder with flip alternatives
│   ├── services/
│   │   ├── firebaseConfig.js      # Firebase SDK & dynamic credentials loader
│   │   └── quizService.js         # Realtime synchronization (Firestore + multi-tab)
│   ├── utils/
│   │   └── soundEffects.js        # Web Audio API sound synthesizer
│   ├── App.jsx                    # Core role coordinator & state container
│   ├── index.css                  # KBC golden theme & diamond button styles
│   └── main.jsx
├── .github/workflows/deploy.yml   # Automatic GitHub Pages CI/CD workflow
├── vite.config.js                 # Vite + Tailwind v4 + base path config
└── package.json
```
