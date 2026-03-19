<div align="center">

# **Clivra**

### Adaptive Study Planning & Exam Readiness System

**Decide what to study today — intelligently.**

Clivra is a full-stack web application that converts student inputs into an **adaptive, explainable daily study plan**, continuously adjusted based on progress, confidence, and exam proximity.

</div>

---

## 🔍 Why Clivra Exists

Most students don’t fail because they don’t work hard.
They fail because they **don’t know what to work on today**.

Common problems:

* Static timetables that don’t adapt
* Poor revision prioritization
* False confidence before exams
* Burnout from unrealistic schedules

👉 **Clivra solves the decision layer**, not just task tracking.

---

## 🧠 What Makes Clivra Different

| Typical Study Apps   | Clivra                             |
| -------------------- | ---------------------------------- |
| Manual schedules     | Auto-generated, adaptive schedules |
| To-do lists          | Priority-driven execution plan     |
| Streak-only tracking | Progress + confidence feedback     |


Clivra answers one core question clearly:

> **“Why am I studying this topic today?”**

---

## 🧩 Core Features (System-Oriented)

### 🧮 Priority Scoring Engine

Each topic is assigned a **priority score (0–100)** using:

* Subject strength (weak → strong)
* Confidence level (1–5)
* Days remaining until exam
* Last revision timestamp

This ensures:

* Weak topics surface early
* Strong topics are revised, not ignored
* Urgency increases naturally as exams approach

---

### 📅 Adaptive Daily Schedule Generator

* Builds a **realistic day plan** based on available hours
* Uses Pomodoro blocks (configurable)
* Mixes:

  * New learning
  * Active revision
  * Short recall sessions
* Rebalances automatically if a day is missed
  *(no overload, no guilt loops)*


---

### 📊 Progress & Exam Readiness

**Weekly Report**

* Planned vs completed time
* Subject-wise effort distribution
* Confidence trend
* Missed vs recovered sessions

**Exam Readiness Prediction**
Calculated using:

* Topic completion %
* Revision frequency
* Consistency score
* Confidence movement

Status levels:

* Not Ready
* Improving
* Almost Ready
* Exam Ready

---

## ⚙️ Supporting Features (Secondary)

These **support execution**, not replace logic:

* ⏱ Built-in Pomodoro timer
* 🔥 Meaningful study streaks
* 🎯 Confidence-based topic re-prioritization
* 📈 Clean analytics dashboard

---

## 🏗️ Architecture Overview

```text
User Input
   ↓
Priority Scoring Logic
   ↓
Daily Schedule Generator
   ↓
Execution Tracking
   ↓
Progress Analysis
   ↓
Schedule Rebalancing + Readiness Prediction
```

---

## 🛠 Tech Stack

* React
* Tailwind CSS
* Typescript
* Component-driven UI
* Mobile-responsive, distraction-free design
* Node.js + Express
* MongoDB (Atlas)
* Google OAuth
## 🚀 Local Development

### Frontend

1. Create a `.env` from `.env.example`
2. Install dependencies: `npm install`
3. Run: `npm run dev`

### Backend

1. Create `server/.env` from `server/.env.example`
2. Install dependencies: `cd server` then `npm install`
3. Run: `npm run dev`


---


## 🧭 Final Note

Clivra isn’t built to *look productive*.
It’s built to **help students study the right thing at the right time** — consistently.

---


