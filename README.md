# EcoAI Flow — Industrial Pollution Response PWA

**EcoAI Flow** is an installable Progressive Web App (PWA) built for industrial chemical incident response and environmental risk decision-support. It is completely customizable for any industrial plant, factory, or downstream water basin and geography.

It monitors atmospheric and industrial telemetry, **PREDICTS** where toxic chemical plumes will travel, **EXPLAINS** why the risk level is high in plain language, **RECOMMENDS** high-impact actions, and can execute them autonomously via simulated **Autopilot**.

> **Decision-Support Prototype Disclosure**: This software is a decision-support prototype. Figures use a demo risk model. Plant sensors and water flow are simulated. The system is NOT connected to real factory equipment.

---

## 🏗️ Architecture & Files

The application is written in vanilla HTML5, CSS3, and JavaScript without frameworks or build steps:

| File | Purpose |
| :--- | :--- |
| **`index.html`** | Semantic UI markup with control-room header, left telemetry panel, 7 tabs, settings drawer, and civil advisory modal. |
| **`styles.css`** | Dark control-room responsive styling, light theme support, SVG visualization rules, and layout grid. |
| **`app.js`** | Modular logic: data layer (Open-Meteo & NASA POWER), risk engine, state machine, autopilot, map point-in-ellipse math, demo script, and audio. |
| **`manifest.json`** | PWA Web App Manifest enabling installation to home screen and desktop. |
| **`sw.js`** | Service Worker providing offline app shell caching and API response caching. |
| **`icons/`** | Vector and PNG icons (`icon.svg`, `icon-192.png`, `icon-512.png`). |

---

## 📡 Data Sources & Honest Statuses

Every source is labeled with its authentic status (**Live**, **Simulated**, **Cached**, or **Offline**) and real last-updated timestamp:

1. **Weather (Live)**: Open-Meteo forecast API (no key required). Fetches live wind speed, wind direction, ambient temperature, relative humidity, and 6-hour hourly wind vectors. Refreshed every 60 seconds.
2. **Air Quality (Live)**: Open-Meteo Air Quality API. Fetches baseline $PM_{2.5}$ and $SO_2$ telemetry. Refreshed every 5 minutes.
3. **NASA POWER API**: Hourly point wind telemetry (WS10M, WD10M, T2M, RH2M). Lags real time, so labeled honestly as *"NASA POWER (latest available)"*. If browser policies block the request, gracefully marks as *"Unavailable"* and falls back to Open-Meteo.
4. **Plant Sensors (Simulated)**: High-resolution generator updating every 2 seconds with stack emissions (% of normal), furnace output, and effluent gate position. Includes a *"Trigger leak"* button to simulate a 150% breach.
5. **Water Flow (Simulated)**: Hydraulic arrival model estimating travel time to municipal intake gates.

---

## 🧮 Demo Risk Engine Formulas

The risk engine runs on every data update:

$$\text{alignment} = \max\left(0, 1 - \frac{|\text{windDirection} - \text{lakeBearing}|}{45^\circ}\right)$$

$$E = \left(\frac{\text{emission}}{100}\right) \times (\text{reduceEmissions40} \ ? \ 0.6 : 1.0)$$

$$\text{windFactor} = \min\left(1.15, 0.6 + \frac{\text{windSpeed}}{48.5}\right)$$

$$\text{rawRisk} = \min\left(100, 97 \times \text{alignment} \times E^{1.25} \times \text{windFactor}\right)$$

$$\text{risk} = \text{round}\Big(\text{rawRisk} \times (\text{closeEffluentGate} \ ? \ 0.85 : 1.0)\Big)$$

### Metric Calculations
- **Risk Thresholds**:
  - $\ge 70$: **Critical** (Red)
  - $35 - 69$: **Moderate** (Amber)
  - $< 35$: **Low** (Green)
- **Time to Lake**: $T_{\text{lake}} = 10\text{ min} \times \left(\frac{19.4}{\text{windSpeed}}\right)$
- **Plume Reach**: $\text{Reach} = 4.0\text{ km} \times \text{windFactor} \times \sqrt{E}$
- **Residents in Plume**: $\text{Population} \times \left(\frac{\text{risk}}{97}\right)$ (default 38,000 residents)

*At nominal defaults (wind 19.4 km/h, 138° SE, emission 100%), the model evaluates to **97/100 (Critical)**. Reducing emissions by 40% drops the score to **51/100 (Moderate)**.*

---

## ⚡ Incident Automation & Autopilot

- **State Machine**: `Monitoring` $\to$ `Warning` (risk 35+) $\to$ `Critical` (risk 70+) $\to$ `Responding` (action active) $\to$ `Recovering` (risk $<35$ for 2 min) $\to$ `Resolved`.
- **Autopilot Modes**:
  - **Manual**: Operator manually triggers mitigation actions.
  - **Assisted (Default)**: AI generates proposed containment commands; operator clicks *Approve*.
  - **Auto**: AI announces an emergency 10-second cancellable countdown, then autonomously applies actions in sequence.
- **Recommended Actions**:
  1. *Reduce factory emissions by 40%* (drops risk from 97 to 51).
  2. *Close the effluent gate* (eliminates hydraulic channel runoff, cuts risk by ~15%).
  3. *Alert downstream communities* (generates broadcast advisory text).
- **Incident Audit Log**: Every event (threshold breaches, proposals, approvals, cancellations, dispatches) is logged with timestamps and saved in `localStorage`.

---

## 🧪 Test Checklist & Verification

Run these verification tests on the live local server:

- [x] **Live fetch works**: Open-Meteo returns live wind speed, bearing, and ambient temperature; badge reflects *Live*.
- [x] **Risk matches default formulas**: At 19.4 km/h, 138° SE, 100% emission, evaluates to **97/100 Critical**.
- [x] **Emissions cut 40% gives Moderate**: Applying action 1 drops risk to **51/100 Moderate**.
- [x] **Auto mode countdown**: Switching to *Auto* during a leak initiates a 10-second countdown and applies all 3 actions.
- [x] **Cancel stops Autopilot**: Clicking *Cancel sequence* halts autonomous execution.
- [x] **Offline reload works**: Disconnecting network / loading from Service Worker cache retains full UI functionality.
- [x] **Export report downloads**: Clicking *Export incident report* downloads a clean HTML incident summary.

---

## 🚀 Running Locally

You can serve the PWA locally with any static web server:

```powershell
# Using Node.js HTTP server
npx serve C:\Users\sampa\.gemini\antigravity\scratch\ecoflow-ai -p 8080

# Or with Python
python -m http.server 8080 --directory C:\Users\sampa\.gemini\antigravity\scratch\ecoflow-ai
```

Open `http://localhost:8080` in your browser.

---

## 🌐 Deploying to GitHub Pages

1. Commit and push all files to GitHub:
   ```powershell
   git add .
   git commit -m "Build EcoAI Flow installable PWA"
   git push -u origin main
   ```
2. In your GitHub repository $\to$ **Settings** $\to$ **Pages** $\to$ Select branch `main` and root `/`.
3. Your PWA will be live and installable at `https://sidhijain2811.github.io/ecoflow-ai/`.
