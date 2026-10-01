# EcoFlow AI — Industrial Pollution Response Dashboard

**EcoFlow AI** is a real-time incident assessment and containment dispatch dashboard built for environmental response teams and hackathon judging. It models atmospheric chemical plume dispersion and hydraulic runoff following an industrial pollution incident near **Lake Yamuna** and the **Okhla Reservoir Basin**.

---

## 🌊 Incident Context

- **Epicenter**: Okhla Industrial Area Phase-II drainage discharge.
- **Affected Water Bodies**: Lake Yamuna and the Okhla Reservoir Basin (critical municipal drinking water intake).
- **Primary Hazards**: Atmospheric $SO_2$ / $NO_x$ plume transport and low-pH acidic effluent wave advancing toward Municipal Intake Gate #4.

---

## ✨ Features

1. **Affected Water Bodies (Tab 1)**
   - **Key Metrics**: 2.4 km runoff & fallout distance, 14–18 min critical travel time window, Critical threat level.
   - **Spread Animation**: Real-time simulation of contaminant arrival with live timer counter and 4 milestone checkpoints (Outfall $\to$ Feeder canal $\to$ Marshland buffer $\to$ Intake Gate #4).

2. **Wind & Plume Dispersion (Tab 2)**
   - **Mathematical SVG Plume**: Drawn dynamically from the source at **138° SE** toward Lake Yamuna.
   - **Zoning**:
     - **Zone A (0–1.0 km)**: Industrial corridor with heavy respiratory threat.
     - **Zone B (1.0–2.5 km)**: Agricultural fringe and eastern canal feeder.
     - **Zone C (2.5–4.0 km)**: Primary lake boundary and downwind residential perimeter.
   - **Wind Speed Slider (4–35 km/h)**: Adjusts Gaussian dispersion cone—faster wind stretches and narrows the plume; slower wind produces stagnant local buildup.
   - **Dynamic Guidance**: Alerts whether dispersion reaches distant water bodies or stagnates near neighborhoods.

3. **Health & Environment (Tab 3)**
   - **Key Metrics**: $+145\ \mu\text{g/m}^3$ PM2.5 spike, 38,000 residents in downwind arc, $\Delta\text{pH} \approx -0.8$ acidification risk.
   - **Acid Shock Simulator**: Interactive baseline pH slider (6.5–8.5) with visual dual-pin pH scale and dynamic evaluation of acute risks to freshwater life.

4. **Mitigation Actions (Tab 4)**
   - **Interactive Checklist**: 4 tickable containment protocols with live counter (`X of 4 actions marked done`) and progress bar.
   - **Containment Protocols**:
     1. Neutralize acidic scrubber effluent in lime slurry pits before release.
     2. Divert untreated industrial runoff to secondary lined retention basins (zero liquid discharge).
     3. Ramp alkaline wet scrubbers to maximum before gases exit chimney.
     4. Throttle furnace output by 40% until wind shifts away from sensitive aquatic zones.

5. **Accessibility & Design**
   - **Theme**: Seamless Light and Dark modes.
   - **WAI-ARIA Compliant**: Fully keyboard navigable tabs using arrow keys (<kbd>→</kbd>, <kbd>←</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>).
   - **Self-Contained**: 100% standalone single-file architecture (`index.html`) with zero external JavaScript dependencies or libraries.

---

## 🚀 Quick Start / Local Preview

Just open `index.html` in any modern web browser:

```bash
# On Windows PowerShell
Start-Process index.html
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Repository Settings** $\to$ **Pages**.
3. Under **Branch**, select `main` and root `/`.
4. Click **Save**. Your dashboard will be live on the web at:
   `https://<your-username>.github.io/<repo-name>/`

---

*Data note: Wind baseline 19.4 km/h, 138° SE labeled as from the NASA POWER API. Figures are modelled estimates for demonstration.*
