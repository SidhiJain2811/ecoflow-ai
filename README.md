# EcoAI Flow — Incident Prediction, Explanation & Mitigation Dashboard

**EcoAI Flow** is an agentic environmental response dashboard designed for hackathon judges and operational incident response teams following an industrial chemical pollution incident near **Lake Yamuna** and the **Okhla Reservoir Basin**.

Unlike standard passive pollution monitors, EcoAI Flow:
1. **PREDICTS** where toxic runoff and atmospheric plumes will travel in real time.
2. **EXPLAINS** why the risk level is high using plain English and contribution breakdowns.
3. **RECOMMENDS** high-impact mitigation actions and quantitatively proves how much risk those actions eliminate.

---

## 🌊 Incident Context

- **Source / Epicenter**: Apex Petrochemical Corp (Okhla Industrial Area Phase-II).
- **Target Water Body**: Lake Yamuna and Okhla Reservoir Basin (primary municipal drinking water supply).
- **Atmospheric Vector**: Default 19.4 km/h wind blowing at 138° SE (NASA POWER API) directly along the lake corridor.

---

## 🎛️ Seven Interactive Tabs

1. **Dashboard (Default)**:
   - Dynamic hero alert sentence updating in real time.
   - Quick dispatch buttons: *"Apply recommended actions"* and *"Open the map"*.
   - Four key metric cards: Time to lake, residents at risk, plume reach, and confidence score.
   - Visual **Risk Ladder** comparing *"Without action"* vs *"After action"*.
   - Three guided question cards with jump links: *What is happening?*, *Where will it go?*, *What should we do?*.
   - *How EcoAI Flow works* 3-step executive summary.

2. **Map & Replay**:
   - High-fidelity SVG map showing Apex Petrochemical Corp, Lake Yamuna, the outflow river, and downstream wetlands.
   - 3-zone nested plume (Red 0–1 km, Orange 1–2.5 km, Yellow 2.5–4 km) dynamically rotated by wind bearing.
   - **Mathematical point-in-ellipse testing** computing real exposure for **Communities A, B, C, and D** (Red, Yellow, or Safe Green).
   - Dynamic water body contamination rules (Lake turns red with pulsing breach rings from +10m if risk $\ge 15$, river from +30m if risk $\ge 35$, wetland from +2h if risk $\ge 55$).
   - 7-step replay slider (`NOW`, `+10m`, `+30m`, `+1h`, `+2h`, `+3h`, `+6h`) with animated Play/Pause and step time card.

3. **Why this risk?**:
   - Dynamic equation row breakdown: `Wind SE (138°) + SO2 Emission + Closeness = Lake Risk`.
   - Plain-English reasoning sentence rewritten on every parameter change.
   - Vector alignment and emission strength contribution bars.
   - Quantitative *"What would lower the risk?"* computed scores (wind shift, emissions cut, gate closure, wind speed halved).

4. **AI Action**:
   - 3 actionable mitigation switches with real-time risk drop readouts:
     1. *Reduce factory emissions by 40%* (plume contracts, score drops from 97 to 51).
     2. *Close the effluent gate* (eliminates hydraulic runoff, cuts risk by ~15%).
     3. *Alert downstream communities* (sirens & SMS evacuation alerts).
   - Time-phased action playbook (0–30 min, 30–90 min, 2 hr+) with completion ticks.

5. **What-If Simulator**:
   - Fast scenario stress-test presets: **Calm day**, **Strong wind**, **Worst case**, and **Reset**.
   - Dual-view mini-map and 3 interactive sliders: Wind speed (4–35 km/h), Wind direction (60–220°), and Emission level (20–150%).
   - Real-time result line displaying plume reach, lake risk score, arrival time, and exposed population.

6. **Pollution Journey**:
   - Dynamic action window deadline: `Action window: X minutes until pollution reaches Lake Yamuna`.
   - Six sequential corridor stops scaling arrival times with wind speed:
     1. Factory (Now)
     2. Lake Yamuna (+10 min)
     3. Intake Gates (+20 min)
     4. Outflow River (+30 min)
     5. Downstream Villages (+1 hr)
     6. Downstream Wetland Reserve (+2 hr)
   - Status indicators dynamically turn red (at risk) or green (safe) based on risk thresholds.

7. **Before vs After**:
   - Side-by-side comparison cards: *"Without action"* vs *"After action"*.
   - Net risk reduction summary sentence: *"Acting now cuts predicted risk by X points, from Critical to Moderate."*
   - Dual-bar timeline trajectory chart showing risk decay over all 7 time horizons.

---

## 🚀 Quick Start / Local Preview

Open `index.html` in your web browser:

```powershell
Start-Process index.html
```

---

## 📤 Push Changes to GitHub

All files are structured for direct upload to GitHub. To commit and push:

```powershell
git add .
git commit -m "Upgrade to EcoAI Flow: 7 interactive tabs, real-time risk model, and spatial replay"
git push -u origin main
```

### Free GitHub Pages Deployment
1. Go to your repository on GitHub $\to$ **Settings** $\to$ **Pages**.
2. Select **Deploy from a branch** $\to$ Branch: `main` / `/ (root)`.
3. Click **Save**. Your app will be live at:
   `https://SidhiJain2811.github.io/ecoflow-ai/`
