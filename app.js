/**
 * EcoFlow — Industrial Dispersion & Receptor Risk Monitoring System
 * Clean, Professional White Theme Architecture:
 * 
 * 1. Facility Operator Portal (Persistent Left Sidebar + 7 Dedicated Sub-Tabs):
 *    - Persistent Sidebar: Facility Profile, Full Street Address, GPS Coords, Emission Selector,
 *                          Thermal Burner Output Slider (20%-150%), Sluice Gate Control, Real-Time Telemetry.
 *    - Tab 1: Overview & Compliance (Executive Status, 4 Telemetry Meters, Receptor Compliance, 6h Forecast)
 *    - Tab 2: Dispersion Map & Replay (CartoDB Positron light map, 7-step replay slider 0-6h, distance rings)
 *    - Tab 3: Risk Drivers & Analysis (Vector alignment, advection velocity, Gaussian chemical decay, sensitivity lab)
 *    - Tab 4: Containment Protocols (SOP action windows, scrubber controls, sluice lockdown, exportable audit log)
 *    - Tab 5: Atmospheric Scenario Lab (Interactive sliders for wind bearing 0°-360°, speed 4-35 km/h, steering map)
 *    - Tab 6: Corridor Propagation (6 sequential corridor milestones from stack to wetland reserve)
 *    - Tab 7: Mitigation Trajectory (Dual trajectory comparison chart against CPCB 35 pt benchmark)
 * 
 * 2. Resident Portal (Persistent Left Sidebar + 5 Dedicated Sub-Tabs):
 *    - Persistent Sidebar: Full Residential Address, GPS Coords, Sector Selector, Shelter Status Toggle,
 *                          Live Directives (Arrival countdown, AQI delta, tap water notice, actionable guidance).
 *    - Tab 1: Community Safety Dashboard (Emergency advisory banner, 4 civilian meters, health directives)
 *    - Tab 2: Threat Radar Map (Multi-Factory cluster context, clean focused plume, glowing residence pinpoint)
 *    - Tab 3: Drinking Water & Health Advisory (Aquifer isolation confidence, tap water notice, symptom guidance)
 *    - Tab 4: Neighborhood Scenario Simulator (Wind shift slider -90° to +90°, resident radar steering view)
 *    - Tab 5: Emergency Broadcast Feed & Checklist (Civil defense push alerts, family readiness checklist)
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. APPLICATION STATE
     ========================================================================== */
  const appState = {
    persona: 'factory', // 'factory' | 'citizen'
    activeFactoryTab: 'fact-tab-1',
    activeCitizenTab: 'cit-tab-1',
    isLeakTriggered: false,

    // Active Factory & Surrounding Multi-Factory Cluster
    activeFactoryKey: 'Apex Petrochem',
    factories: {
      'Apex Petrochem': {
        name: 'Apex Petrochem (Chemical Plant Alpha)',
        shortName: 'Plant Alpha',
        type: 'Chemical & Polymer Refining',
        street: 'Plot 42, Phase-II Industrial Corridor, Okhla Industrial Area, New Delhi - 110020',
        lat: 28.6139,
        lng: 77.2295,
        coordsStr: '28.6139° N, 77.2295° E',
        emissionType: 'SO₂ & Acid Vapors',
        boilerOutput: 85,
        defX: 240,
        defY: 160
      },
      'Refinery Beta': {
        name: 'Refinery Beta (Thermal Power & Cracking)',
        shortName: 'Plant Beta',
        type: 'Thermal Power & Catalytic Cracking',
        street: 'Gate 7, Northern Energy Complex, Badarpur Industrial Link, New Delhi - 110044',
        lat: 28.6310,
        lng: 77.2140,
        coordsStr: '28.6310° N, 77.2140° E',
        emissionType: 'Hydrocarbon & Mercaptans',
        boilerOutput: 90,
        defX: 180,
        defY: 120
      },
      'Smelter Gamma': {
        name: 'Smelter Gamma (Metal Smelting Works)',
        shortName: 'Plant Gamma',
        type: 'Heavy Pyrometallurgy & Smelting',
        street: 'Unit 9, Heavy Engineering Belt, Mohan Cooperative, New Delhi - 110044',
        lat: 28.5920,
        lng: 77.2510,
        coordsStr: '28.5920° N, 77.2510° E',
        emissionType: 'Heavy Metal Particulates',
        boilerOutput: 75,
        defX: 300,
        defY: 210
      }
    },

    // Factory Configuration Inputs (Active)
    factory: {
      preset: 'Apex Petrochem',
      name: 'Apex Petrochem (Chemical Plant Alpha)',
      street: 'Plot 42, Phase-II Industrial Corridor, Okhla Industrial Area, New Delhi - 110020',
      lat: 28.6139,
      lng: 77.2295,
      coordsStr: '28.6139° N, 77.2295° E',
      emissionType: 'SO₂ & Acid Vapors',
      boilerOutput: 85, // % (20 to 150)
      sluiceGate: 'OPEN', // 'OPEN' | 'CLOSED'
      stackHeightM: 85
    },

    // Downstream Target Basin
    waterBody: {
      name: 'Lake Yamuna Municipal Basin',
      lat: 28.5400,
      lng: 77.3000,
      coordsStr: '28.5400° N, 77.3000° E',
      distanceKm: 2.4,
      bearingDeg: 138 // SE corridor
    },

    // Live Atmospheric Telemetry (NASA POWER / Open-Meteo)
    weather: {
      status: 'Connected',
      windSpeed: 19.4, // km/h
      windDirection: 138, // deg (SE)
      temperature: 28.5,
      humidity: 58,
      baselineAqi: 42
    },

    // Replay State (0 to 6 Hours)
    replay: {
      step: 0,
      isPlaying: false,
      intervalId: null
    },

    // AI Mitigation Playbook State
    playbook: {
      action1Done: false, // 40% de-rate + scrubbers
      action2Done: false, // ZLD Sluice lockdown
      action3Done: false, // Municipal early warning API
      isExecuted: false
    },

    // What-If Scenario Simulator
    simulation: {
      windDirection: 138,
      windSpeed: 22.0,
      emission: 90,
      isActive: false
    },

    // Citizen Neighborhood Details
    citizen: {
      selectedCommunityKey: 'Community B',
      communities: {
        'Community A': {
          name: 'Community A (Riverbank North · 1.2 km)',
          title: 'Yamuna Bank Enclave',
          street: 'Tower 3, Yamuna Bank Enclave, Ring Road Sector 8, New Delhi - 110006',
          sector: 'Sector 8 / Riverbank',
          lat: 28.6015,
          lng: 77.2430,
          distKm: 1.2,
          bearingDeg: 115,
          coordsStr: '28.6015° N, 77.2430° E (1.2 km downwind)',
          defX: 380,
          defY: 220
        },
        'Community B': {
          name: 'Community B (Okhla East / Sector 14 · 1.8 km)',
          title: 'Riverview Greens Apartments',
          street: 'Flat 402, Block C, Riverview Greens Apartments, Sector 14, Downwind Fringe, New Delhi - 110025',
          sector: 'Okhla East / Sector 14',
          lat: 28.5821,
          lng: 77.2642,
          distKm: 1.8,
          bearingDeg: 138,
          coordsStr: '28.5821° N, 77.2642° E (1.8 km downwind)',
          defX: 520,
          defY: 290
        },
        'Community C': {
          name: 'Community C (Downstream Agri-Belt · 2.9 km)',
          title: 'Kisan Vihar Homesteads',
          street: 'Plot 18, Kisan Vihar, Canal Headworks Agri-Belt, Faridabad Border, New Delhi - 110044',
          sector: 'Canal Headworks Agri-Belt',
          lat: 28.5530,
          lng: 77.2910,
          distKm: 2.9,
          bearingDeg: 145,
          coordsStr: '28.5530° N, 77.2910° E (2.9 km downwind)',
          defX: 740,
          defY: 390
        },
        'Community D': {
          name: 'Community D (Hillside Buffer · 2.2 km)',
          title: 'Ridge View Colony',
          street: 'Bungalow 7, Hillside Sanctuary Enclave, Ridge Wildlife Buffer, New Delhi - 110037',
          sector: 'Ridge Wildlife Sanctuary',
          lat: 28.6300,
          lng: 77.2010,
          distKm: 2.2,
          bearingDeg: 300,
          coordsStr: '28.6300° N, 77.2010° E (2.2 km upwind buffer)',
          defX: 190,
          defY: 300
        }
      },
      shelterStatus: 'INDOORS', // 'INDOORS' | 'OUTDOORS'
      windShiftSim: 0, // deg offset from current wind
      notifications: [
        { time: '10:52 AM', text: '[CEMS TELEMETRY]: Burner flux monitored at 85%. Plume dispersion cone active toward SE corridor.', type: 'info' },
        { time: '10:48 AM', text: '[MUNICIPAL WATER BOARD]: Automated intake sluice gate #4 armed for zero-liquid diversion.', type: 'safe' },
        { time: '10:45 AM', text: '[CIVIL DEFENSE]: Community B (Sector 14) marked inside downwind buffer. Atmospheric monitors active.', type: 'caution' },
        { time: '10:40 AM', text: '[NASA POWER API]: Telemetry stream synchronized: WS10M=19.4 km/h, WD10M=138° SE.', type: 'info' }
      ]
    },

    // Factory Operational Audit Log
    auditLog: [
      { time: '10:52:14', level: 'INFO', msg: 'NASA POWER API: Stream refreshed with 19.4 km/h wind velocity.' },
      { time: '10:50:02', level: 'WARN', msg: 'Plume dispersion cone intersected 1.0 km residential perimeter.' },
      { time: '10:46:18', level: 'INFO', msg: 'Basin intake weir telemetry polling nominal (pH 7.4).' }
    ]
  };

  /* ==========================================================================
     2. AUDIO & NOTIFICATION HELPERS
     ========================================================================== */
  let audioCtx = null;

  function playAlertBeep(freq = 660, duration = 0.25, type = 'sine') {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Autoplay policy fallback
    }
  }

  function showToast(message, type = 'info', duration = 3800) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button style="background:none; border:none; color:inherit; font-size:1.15rem; cursor:pointer; margin-left:auto;" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function angleDifference(a, b) {
    let diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  function getCompassSector(deg) {
    const d = (deg % 360 + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  }

  function addAuditEntry(level, msg) {
    const now = new Date().toTimeString().split(' ')[0];
    appState.auditLog.unshift({ time: now, level, msg });
    renderAuditLog();
  }

  /* ==========================================================================
     3. MATHEMATICAL DISPERSION & IMPACT ENGINE
     ========================================================================== */
  function computeDispersionMetrics() {
    const isSim = appState.simulation.isActive;
    const isReplay = appState.replay.step > 0;

    let windSpeed = isSim ? appState.simulation.windSpeed : appState.weather.windSpeed;
    let windDir = isSim ? appState.simulation.windDirection : appState.weather.windDirection;
    let boiler = appState.isLeakTriggered ? 150 : (isSim ? appState.simulation.emission : appState.factory.boilerOutput);

    // If Replay is active, advance forecast slightly per step
    if (isReplay && !isSim) {
      const step = appState.replay.step;
      const stepWindOffsets = [0, 1.6, 3.1, -1.4, -4.2, -7.4, -9.0];
      const stepSpeedOffsets = [0, 1.6, 3.1, -1.4, -4.2, -7.4, -9.0];
      windDir = (windDir + (stepWindOffsets[step] || 0) + 360) % 360;
      windSpeed = Math.max(5, windSpeed + (stepSpeedOffsets[step] || 0));
    }

    // Playbook effect: if action 1 done or full playbook executed, reduces effective boiler by 40%
    const isDerated = appState.playbook.action1Done || appState.playbook.isExecuted;
    const effectiveBoiler = isDerated ? Math.round(boiler * 0.6) : boiler;

    // Plume reach calculation
    const boilerScale = Math.sqrt(effectiveBoiler / 85);
    const speedScale = Math.pow(windSpeed / 19.4, 0.45);
    let plumeReachKm = parseFloat((2.8 * boilerScale * speedScale).toFixed(1));
    if (appState.isLeakTriggered) {
      plumeReachKm = Math.max(plumeReachKm, 4.2);
    }
    if (isDerated && !appState.isLeakTriggered) {
      plumeReachKm = Math.min(plumeReachKm, 1.8);
    }

    // Downstream water basin distance and arrival window (Distance / WindSpeed * 60)
    const distBasin = appState.waterBody.distanceKm; // 2.4 km
    const timeContamMin = Math.max(1, Math.round((distBasin / Math.max(1, windSpeed)) * 60));

    // Vector alignment with lake corridor (bearing 138°)
    const angleDiff = angleDifference(windDir, appState.waterBody.bearingDeg);
    const isAligned = angleDiff <= 25;
    const isLakeBreached = (plumeReachKm >= distBasin) && isAligned;

    // Lake pH threat
    const isSluiceClosed = appState.factory.sluiceGate === 'CLOSED' || appState.playbook.action2Done || appState.playbook.isExecuted;
    let lakePhStart = 7.4;
    let lakePhEnd = isLakeBreached 
      ? (appState.isLeakTriggered ? 5.2 : 5.6) 
      : (isAligned ? 6.4 : 7.2);

    if (isSluiceClosed) {
      lakePhEnd = 6.8;
    }

    // Risk Score & Level
    let riskScore = 88;
    if (appState.isLeakTriggered) {
      riskScore = 96;
    } else if (appState.playbook.isExecuted) {
      riskScore = 32;
    } else {
      const alignFactor = Math.max(0, 1 - (angleDiff / 90));
      const boilerFactor = effectiveBoiler / 100;
      const reachFactor = Math.min(1.5, plumeReachKm / distBasin);
      riskScore = Math.min(99, Math.round(50 * alignFactor * reachFactor + 35 * boilerFactor));
      if (isSluiceClosed) riskScore = Math.max(28, riskScore - 25);
      if (isDerated) riskScore = Math.max(30, riskScore - 30);
    }

    let riskLevel = 'CRITICAL';
    let riskClass = 'danger';
    if (riskScore <= 35) {
      riskLevel = 'LOW';
      riskClass = 'safe';
    } else if (riskScore <= 68) {
      riskLevel = 'MODERATE';
      riskClass = 'amber';
    }

    // Citizen calculations for selected community
    const curComm = appState.citizen.communities[appState.citizen.selectedCommunityKey] || appState.citizen.communities['Community B'];
    const commAngleDiff = angleDifference(windDir, curComm.bearingDeg);
    const isCitizenInPlume = (commAngleDiff <= 24) && (plumeReachKm >= curComm.distKm * 0.85);
    const citizenArrivalMin = Math.max(1, Math.round((curComm.distKm / Math.max(1, windSpeed)) * 60));

    // Peak AQI calculation
    const peakAqi = isCitizenInPlume
      ? (appState.isLeakTriggered ? 380 : Math.round(appState.weather.baselineAqi + (effectiveBoiler / 85) * 243))
      : appState.weather.baselineAqi;

    const peakSo2 = isCitizenInPlume
      ? (appState.isLeakTriggered ? 210 : Math.round(18 + (effectiveBoiler / 85) * 127))
      : 18;

    return {
      windSpeed,
      windDir,
      angleDiff,
      effectiveBoiler,
      plumeReachKm,
      distBasin,
      timeContamMin,
      isAligned,
      isLakeBreached,
      lakePhStart,
      lakePhEnd,
      isSluiceClosed,
      isDerated,
      riskScore,
      riskLevel,
      riskClass,
      curComm,
      isCitizenInPlume,
      citizenArrivalMin,
      peakAqi,
      peakSo2
    };
  }

  /* ==========================================================================
     4. MAP ENGINE (CartoDB Positron Light Map API + Dynamic SVG Overlays)
     ========================================================================== */
  // Free, legal, clean light tiles from CARTO Positron
  const cartoTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const cartoSubdomains = ['a', 'b', 'c', 'd'];
  const cartoAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  let factoryMapInstance = null;
  let simLabMapInstance = null;
  let citizenMapInstance = null;
  let citLabMapInstance = null;

  function initLeafletMaps() {
    const centerCoords = [28.58, 77.26];
    const zoomLevel = 13;

    function createLightMap(containerId) {
      const container = document.getElementById(containerId);
      if (!container || typeof L === 'undefined') return null;
      try {
        const map = L.map(containerId, {
          center: centerCoords,
          zoom: zoomLevel,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer(cartoTileUrl, {
          subdomains: cartoSubdomains,
          attribution: cartoAttribution,
          maxZoom: 19
        }).addTo(map);

        map.on('move', renderSvgOverlays);
        map.on('zoom', renderSvgOverlays);
        return map;
      } catch (e) {
        console.warn(`Leaflet initialization warning on #${containerId}:`, e);
        return null;
      }
    }

    // 1. Factory Operator Map (Tab 2)
    factoryMapInstance = createLightMap('factoryLeafletMap');

    // 2. Factory What-If Simulator Map (Tab 5)
    simLabMapInstance = createLightMap('simLabLeafletMap');

    // 3. Citizen Threat Radar Map (Tab 2)
    citizenMapInstance = createLightMap('citizenLeafletMap');

    // 4. Citizen Simulator Steering Map (Tab 4)
    citLabMapInstance = createLightMap('citLabLeafletMap');

    renderSvgOverlays();
  }

  function getProjectedPoint(mapInstance, lat, lng, defX, defY) {
    if (mapInstance && typeof mapInstance.latLngToContainerPoint === 'function') {
      try {
        const container = mapInstance.getContainer();
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          const pt = mapInstance.latLngToContainerPoint([lat, lng]);
          const scaleX = 1000 / container.clientWidth;
          const scaleY = 500 / container.clientHeight;
          const px = pt.x * scaleX;
          const py = pt.y * scaleY;
          if (!isNaN(px) && !isNaN(py)) {
            return { x: Math.round(px), y: Math.round(py) };
          }
        }
      } catch (e) {}
    }
    return { x: defX, y: defY };
  }

  function getProjectedRadius1Km(mapInstance, lat, lng, defR) {
    if (mapInstance && typeof mapInstance.latLngToContainerPoint === 'function') {
      try {
        const container = mapInstance.getContainer();
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          const pt1 = mapInstance.latLngToContainerPoint([lat, lng]);
          const pt2 = mapInstance.latLngToContainerPoint([lat + 0.009, lng]);
          const scaleY = 500 / container.clientHeight;
          const r = Math.abs(pt2.y - pt1.y) * scaleY;
          if (r > 30 && r < 350) return Math.round(r);
        }
      } catch (e) {}
    }
    return defR;
  }

  function renderSvgOverlays() {
    const metrics = computeDispersionMetrics();

    // 1. Factory Spatial Map Overlay (Tab 2)
    const fLayer = document.getElementById('factorySvgDynamicLayer');
    if (fLayer) {
      const srcPt = getProjectedPoint(factoryMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePt = getProjectedPoint(factoryMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1km = getProjectedRadius1Km(factoryMapInstance, appState.factory.lat, appState.factory.lng, 110);
      fLayer.innerHTML = generateFactorySvgContent(metrics, srcPt.x, srcPt.y, lakePt.x, lakePt.y, r1km, factoryMapInstance);
    }

    // 2. Factory What-If Simulator Map Overlay (Tab 5)
    const simLayer = document.getElementById('simLabSvgDynamicLayer');
    if (simLayer) {
      const srcPtS = getProjectedPoint(simLabMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePtS = getProjectedPoint(simLabMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1kmS = getProjectedRadius1Km(simLabMapInstance, appState.factory.lat, appState.factory.lng, 110);
      simLayer.innerHTML = generateFactorySvgContent(metrics, srcPtS.x, srcPtS.y, lakePtS.x, lakePtS.y, r1kmS, simLabMapInstance);
    }

    // 3. Citizen Threat Radar Map Overlay (Tab 2) — Multi-Factory Context
    const cLayer = document.getElementById('citizenSvgDynamicLayer');
    if (cLayer) {
      cLayer.innerHTML = generateCitizenThreatRadarSvg(metrics, citizenMapInstance);
    }

    // 4. Citizen Simulator Steering Map Overlay (Tab 4)
    const citLabLayer = document.getElementById('citLabSvgDynamicLayer');
    if (citLabLayer) {
      citLabLayer.innerHTML = generateCitizenThreatRadarSvg(metrics, citLabMapInstance);
    }
  }

  /**
   * Generates SVG for Factory Operator Maps (Tabs 2 & 5)
   * Styled specifically for a crisp, legible white theme.
   */
  function generateFactorySvgContent(metrics, srcX, srcY, lakeX, lakeY, r1km = 110, mapInst = null) {
    const rad = (metrics.windDir - 90) * (Math.PI / 180);
    const pixelReach = Math.min(650, (metrics.plumeReachKm / 2.4) * 440);
    const coneSpread = Math.min(130, 42 + pixelReach * 0.16);

    const tipX = srcX + Math.cos(rad) * pixelReach;
    const tipY = srcY + Math.sin(rad) * pixelReach;
    const normRad = rad + Math.PI / 2;
    const flank1X = tipX + Math.cos(normRad) * coneSpread;
    const flank1Y = tipY + Math.sin(normRad) * coneSpread;
    const flank2X = tipX - Math.cos(normRad) * coneSpread;
    const flank2Y = tipY - Math.sin(normRad) * coneSpread;

    const plumePath = `M ${srcX} ${srcY} L ${flank1X} ${flank1Y} Q ${tipX} ${tipY} ${flank2X} ${flank2Y} Z`;

    const arrowLen = 95;
    const arrowEndX = srcX + Math.cos(rad) * arrowLen;
    const arrowEndY = srcY + Math.sin(rad) * arrowLen;

    const isBreach = metrics.isLakeBreached || appState.isLeakTriggered;

    let svgHtml = `
      <defs>
        <!-- Atmospheric Dispersion Plume Gradient for Light Basemap -->
        <linearGradient id="plumeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.52"/>
          <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.12"/>
        </linearGradient>
        <filter id="svgSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Hydrological Corridor (Photorealistic River Channel & Lake Basin on White Map) -->
      <path d="M 0 100 Q 180 130 310 190 T 500 270 T ${lakeX} ${lakeY} Q 820 420 1000 440" fill="none" stroke="rgba(2, 132, 199, 0.2)" stroke-width="48" stroke-linecap="round"/>
      <path d="M 0 100 Q 180 130 310 190 T 500 270 T ${lakeX} ${lakeY} Q 820 420 1000 440" fill="none" stroke="rgba(2, 132, 199, 0.45)" stroke-width="24" stroke-linecap="round"/>
      <ellipse cx="${lakeX}" cy="${lakeY}" rx="95" ry="46" fill="rgba(224, 242, 254, 0.78)" stroke="#0284c7" stroke-width="2"/>

      <!-- Concentric Distance Hazard Rings (1km, 2km, 3km) -->
      <g stroke="rgba(100, 116, 139, 0.45)" stroke-width="1.2" stroke-dasharray="6,6" fill="none">
        <circle cx="${srcX}" cy="${srcY}" r="${r1km}"/>
        <text x="${srcX + r1km + 4}" y="${srcY - 4}" fill="#475569" font-size="10" font-weight="700">1.0 km</text>

        <circle cx="${srcX}" cy="${srcY}" r="${r1km * 2}"/>
        <text x="${srcX + r1km * 2 + 4}" y="${srcY - 4}" fill="#475569" font-size="10" font-weight="700">2.0 km</text>

        <circle cx="${srcX}" cy="${srcY}" r="${r1km * 3}"/>
        <text x="${srcX + r1km * 3 + 4}" y="${srcY - 4}" fill="#475569" font-size="10" font-weight="700">3.0 km</text>
      </g>

      <!-- 1.0 km Hazard Zone High-Alert Dashed Ring -->
      <circle cx="${srcX}" cy="${srcY}" r="${r1km}" stroke="rgba(220, 38, 38, 0.65)" stroke-width="2" stroke-dasharray="5,4" fill="rgba(254, 226, 226, 0.25)"/>

      <!-- Trajectory vector connecting stack to water basin (2.4 km) -->
      <line x1="${srcX}" y1="${srcY}" x2="${lakeX}" y2="${lakeY}" stroke="rgba(71, 85, 105, 0.55)" stroke-width="1.8" stroke-dasharray="6,4"/>
      <rect x="${(srcX + lakeX)/2 - 32}" y="${(srcY + lakeY)/2 - 12}" width="64" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" filter="url(#svgSoftShadow)"/>
      <text x="${(srcX + lakeX)/2}" y="${(srcY + lakeY)/2 + 2}" fill="#0f172a" font-size="10" font-weight="700" text-anchor="middle">2.4 km</text>

      <!-- Predicted Plume Dispersion Cone -->
      <path d="${plumePath}" fill="url(#plumeGrad)" stroke="#dc2626" stroke-width="1.5" class="${isBreach ? 'breach-pulsing' : ''}"/>

      <!-- Plume Corridor Label Badge -->
      <g transform="translate(${(srcX + tipX)/2}, ${(srcY + tipY)/2 - 15})">
        <rect x="-70" y="-12" width="140" height="22" rx="4" fill="#ffffff" stroke="#dc2626" stroke-width="1.2" filter="url(#svgSoftShadow)"/>
        <text x="0" y="2" fill="#b91c1c" font-size="10" font-weight="700" text-anchor="middle">Active Plume Corridor</text>
      </g>

      <!-- Downwind Vector Indicator Arrow -->
      <g stroke="#0f172a" stroke-width="2.2" fill="none">
        <line x1="${srcX}" y1="${srcY}" x2="${arrowEndX}" y2="${arrowEndY}" stroke-linecap="round"/>
        <polygon points="${arrowEndX},${arrowEndY} ${arrowEndX - 9 * Math.cos(rad - 0.4)},${arrowEndY - 9 * Math.sin(rad - 0.4)} ${arrowEndX - 9 * Math.cos(rad + 0.4)},${arrowEndY - 9 * Math.sin(rad + 0.4)}" fill="#0f172a" stroke="none"/>
      </g>
      <text x="${arrowEndX + 14 * Math.cos(rad)}" y="${arrowEndY + 14 * Math.sin(rad)}" fill="#0f172a" font-size="11" font-weight="700">
        Wind ${metrics.windDir}° ${getCompassSector(metrics.windDir)}
      </text>

      <!-- Factory Source Marker -->
      <g transform="translate(${srcX}, ${srcY})">
        <circle cx="0" cy="0" r="20" fill="#ea580c" stroke="#ffffff" stroke-width="2.5" filter="url(#svgSoftShadow)"/>
        <text x="0" y="5" fill="#ffffff" font-size="13" font-weight="800" text-anchor="middle">🏭</text>
        <rect x="-65" y="-36" width="130" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" filter="url(#svgSoftShadow)"/>
        <text x="0" y="-22" fill="#0f172a" font-size="10" font-weight="700" text-anchor="middle">${appState.factory.preset}</text>
        <text x="26" y="16" fill="#b91c1c" font-size="9.5" font-weight="600">1.0 km Buffer</text>
      </g>

      <!-- Downstream Water Body Target -->
      <g transform="translate(${lakeX}, ${lakeY})">
        <circle cx="0" cy="0" r="${isBreach ? '24' : '20'}" fill="${isBreach ? '#dc2626' : '#0284c7'}" stroke="#ffffff" stroke-width="2.5" class="${isBreach ? 'breach-pulsing' : ''}" filter="url(#svgSoftShadow)"/>
        <text x="0" y="6" fill="#ffffff" font-size="14" text-anchor="middle">💧</text>
        <g transform="translate(18, -14)">
          <rect x="0" y="-12" width="180" height="26" rx="4" fill="#ffffff" stroke="${isBreach ? '#dc2626' : '#0284c7'}" stroke-width="1.5" filter="url(#svgSoftShadow)"/>
          <text x="10" y="4" fill="${isBreach ? '#b91c1c' : '#0284c7'}" font-size="9.5" font-weight="700">
            ${isBreach ? '⚠️ WATER BASIN INTRUSION' : '✔ WATER BASIN BUFFER'}
          </text>
          <text x="10" y="24" fill="#0f172a" font-size="10.5" font-weight="700">${appState.waterBody.name}</text>
        </g>
      </g>
    `;

    // Community Reference Dots
    Object.keys(appState.citizen.communities).forEach(key => {
      const c = appState.citizen.communities[key];
      const pt = getProjectedPoint(mapInst, c.lat, c.lng, c.defX, c.defY);
      const isBreachedComm = (key === 'Community B' && metrics.isAligned) || (key === 'Community A' && metrics.plumeReachKm >= 1.2);

      svgHtml += `
        <g transform="translate(${pt.x}, ${pt.y})">
          <circle cx="0" cy="0" r="7" fill="${isBreachedComm ? '#dc2626' : '#16a34a'}" stroke="#ffffff" stroke-width="1.8"/>
          <rect x="10" y="-9" width="95" height="18" rx="3" fill="#ffffff" stroke="#cbd5e1" filter="url(#svgSoftShadow)"/>
          <text x="14" y="3" fill="#0f172a" font-size="9" font-weight="600">${c.sector}</text>
        </g>
      `;
    });

    return svgHtml;
  }

  /**
   * Generates SVG for Clean Residential Threat Radar Map (Citizen Tab 2 & 4)
   * Displays Multi-Factory cluster context, focused single plume, glowing residence pin & halo.
   */
  function generateCitizenThreatRadarSvg(metrics, mapInst) {
    const activeFac = appState.factories[appState.activeFactoryKey] || appState.factories['Apex Petrochem'];
    const activePt = getProjectedPoint(mapInst, activeFac.lat, activeFac.lng, activeFac.defX, activeFac.defY);
    const lakePt = getProjectedPoint(mapInst, appState.waterBody.lat, appState.waterBody.lng, 680, 360);

    const rad = (metrics.windDir - 90) * (Math.PI / 180);
    const pixelReach = Math.min(650, (metrics.plumeReachKm / 2.4) * 440);
    const coneSpread = Math.min(130, 42 + pixelReach * 0.16);

    const tipX = activePt.x + Math.cos(rad) * pixelReach;
    const tipY = activePt.y + Math.sin(rad) * pixelReach;
    const normRad = rad + Math.PI / 2;
    const flank1X = tipX + Math.cos(normRad) * coneSpread;
    const flank1Y = tipY + Math.sin(normRad) * coneSpread;
    const flank2X = tipX - Math.cos(normRad) * coneSpread;
    const flank2Y = tipY - Math.sin(normRad) * coneSpread;

    const plumePath = `M ${activePt.x} ${activePt.y} L ${flank1X} ${flank1Y} Q ${tipX} ${tipY} ${flank2X} ${flank2Y} Z`;
    const isBreach = metrics.isCitizenInPlume || appState.isLeakTriggered;

    let svgHtml = `
      <defs>
        <linearGradient id="plumeGradCit" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.52"/>
          <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.12"/>
        </linearGradient>
        <filter id="svgSoftShadowCit" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Hydrological Waterway -->
      <path d="M 0 100 Q 180 130 310 190 T 500 270 T ${lakePt.x} ${lakePt.y} Q 820 420 1000 440" fill="none" stroke="rgba(2, 132, 199, 0.2)" stroke-width="48" stroke-linecap="round"/>
      <ellipse cx="${lakePt.x}" cy="${lakePt.y}" rx="95" ry="46" fill="rgba(224, 242, 254, 0.78)" stroke="#0284c7" stroke-width="2"/>

      <!-- Clean Focused Single Plume Corridor from Active Plant Only -->
      <path d="${plumePath}" fill="url(#plumeGradCit)" stroke="#dc2626" stroke-width="1.5" class="${isBreach ? 'breach-pulsing' : ''}"/>

      <!-- Plume Direction Badge -->
      <g transform="translate(${(activePt.x + tipX)/2}, ${(activePt.y + tipY)/2 - 12})">
        <rect x="-65" y="-11" width="130" height="20" rx="4" fill="#ffffff" stroke="#dc2626" stroke-width="1.2" filter="url(#svgSoftShadowCit)"/>
        <text x="0" y="3" fill="#b91c1c" font-size="9.5" font-weight="700" text-anchor="middle">Active Hazard Corridor</text>
      </g>
    `;

    // 1. MULTI-FACTORY CLUSTER RENDERING (All 3 surrounding plants)
    Object.keys(appState.factories).forEach(facKey => {
      const fac = appState.factories[facKey];
      const pt = getProjectedPoint(mapInst, fac.lat, fac.lng, fac.defX, fac.defY);
      const isActive = (facKey === appState.activeFactoryKey);

      if (isActive) {
        // Active Incident Plant Marker
        svgHtml += `
          <g transform="translate(${pt.x}, ${pt.y})">
            <circle cx="0" cy="0" r="24" fill="rgba(234, 88, 12, 0.18)" stroke="#ea580c" stroke-width="2" class="breach-pulsing"/>
            <circle cx="0" cy="0" r="16" fill="#ea580c" stroke="#ffffff" stroke-width="2"/>
            <text x="0" y="5" fill="#ffffff" font-size="12" text-anchor="middle">🏭</text>
            <rect x="-70" y="-34" width="140" height="20" rx="4" fill="#ffffff" stroke="#ea580c" stroke-width="1.5" filter="url(#svgSoftShadowCit)"/>
            <text x="0" y="-20" fill="#0f172a" font-size="9.5" font-weight="700" text-anchor="middle">${fac.shortName} (Active Source)</text>
          </g>
        `;
      } else {
        // Neighboring Non-Incident Industrial Plants (Subtle & Uncluttered)
        svgHtml += `
          <g transform="translate(${pt.x}, ${pt.y})">
            <circle cx="0" cy="0" r="12" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
            <text x="0" y="4" fill="#64748b" font-size="10" text-anchor="middle">⚙️</text>
            <rect x="-55" y="-27" width="110" height="17" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
            <text x="0" y="-15" fill="#334155" font-size="8.5" font-weight="600" text-anchor="middle">${fac.shortName}</text>
          </g>
        `;
      }
    });

    // 2. WATER INTAKE WEIR (Status Badge)
    const isSluiceLocked = metrics.isSluiceClosed;
    svgHtml += `
      <g transform="translate(${lakePt.x}, ${lakePt.y})">
        <circle cx="0" cy="0" r="16" fill="${isSluiceLocked ? '#0284c7' : '#dc2626'}" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="5" fill="#ffffff" font-size="11" text-anchor="middle">💧</text>
        <g transform="translate(18, -12)">
          <rect x="0" y="-10" width="190" height="24" rx="4" fill="#ffffff" stroke="${isSluiceLocked ? '#16a34a' : '#dc2626'}" stroke-width="1.5" filter="url(#svgSoftShadowCit)"/>
          <text x="8" y="5" fill="${isSluiceLocked ? '#15803d' : '#b91c1c'}" font-size="9" font-weight="700">
            ${isSluiceLocked ? '✔ INTAKE PROTECTED / SLUICE ISOLATED' : '⚠️ SLUICE OPEN (ATTENTION)'}
          </text>
        </g>
      </g>
    `;

    // 3. CITIZEN RESIDENTIAL COMMUNITIES (A, B, C, D)
    Object.keys(appState.citizen.communities).forEach(key => {
      const c = appState.citizen.communities[key];
      const pt = getProjectedPoint(mapInst, c.lat, c.lng, c.defX, c.defY);
      const isSelectedCitizen = (appState.citizen.selectedCommunityKey === key);

      if (isSelectedCitizen) {
        // Glowing Pin and Boundary Radar Halo
        svgHtml += `
          <g transform="translate(${pt.x}, ${pt.y})">
            <!-- Pulsing Boundary Radar Halo -->
            <circle cx="0" cy="0" r="38" fill="rgba(2, 132, 199, 0.1)" stroke="#0284c7" stroke-width="1.8" stroke-dasharray="4,3" class="breach-pulsing"/>
            <circle cx="0" cy="0" r="22" fill="rgba(2, 132, 199, 0.2)" stroke="#0284c7" stroke-width="1.8"/>
            <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
            <text x="0" y="5" fill="#ffffff" font-size="11" text-anchor="middle">🏠</text>
            
            <!-- Address Callout Box -->
            <g transform="translate(18, -20)">
              <rect x="0" y="-12" width="180" height="34" rx="4" fill="#ffffff" stroke="#0284c7" stroke-width="1.8" filter="url(#svgSoftShadowCit)"/>
              <text x="8" y="2" fill="#0284c7" font-size="9" font-weight="700">YOUR RESIDENCE (PINPOINT)</text>
              <text x="8" y="16" fill="#0f172a" font-size="9" font-weight="600">${c.title}</text>
            </g>
          </g>
        `;
      } else {
        // Other Neighborhoods (Clean, simple marker)
        svgHtml += `
          <g transform="translate(${pt.x}, ${pt.y})">
            <circle cx="0" cy="0" r="6" fill="#16a34a" stroke="#ffffff" stroke-width="1.5"/>
            <rect x="8" y="-7" width="85" height="15" rx="2" fill="#ffffff" stroke="#cbd5e1" filter="url(#svgSoftShadowCit)"/>
            <text x="12" y="4" fill="#475569" font-size="8.5" font-weight="600">${c.sector}</text>
          </g>
        `;
      }
    });

    return svgHtml;
  }

  /* ==========================================================================
     5. PERSONA SWITCHER & SUB-TAB NAVIGATION
     ========================================================================= */
  function switchPersona(targetPersona) {
    appState.persona = targetPersona;

    const btnFactory = document.getElementById('btnPersonaFactory');
    const btnCitizen = document.getElementById('btnPersonaCitizen');
    const windowFactory = document.getElementById('factoryWindow');
    const windowCitizen = document.getElementById('citizenWindow');

    if (targetPersona === 'factory') {
      btnFactory?.classList.add('active');
      btnFactory?.setAttribute('aria-selected', 'true');
      btnCitizen?.classList.remove('active');
      btnCitizen?.setAttribute('aria-selected', 'false');

      if (windowFactory) windowFactory.style.display = 'block';
      if (windowCitizen) windowCitizen.style.display = 'none';

      // Refresh factory map frame if active
      setTimeout(() => {
        if (appState.activeFactoryTab === 'fact-tab-2' && factoryMapInstance) factoryMapInstance.invalidateSize();
        if (appState.activeFactoryTab === 'fact-tab-5' && simLabMapInstance) simLabMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 80);
    } else {
      btnCitizen?.classList.add('active');
      btnCitizen?.setAttribute('aria-selected', 'true');
      btnFactory?.classList.remove('active');
      btnFactory?.setAttribute('aria-selected', 'false');

      if (windowCitizen) windowCitizen.style.display = 'block';
      if (windowFactory) windowFactory.style.display = 'none';

      // Refresh active citizen map frame
      setTimeout(() => {
        if (appState.activeCitizenTab === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
        if (appState.activeCitizenTab === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 80);
    }

    updateAllUI();
  }

  function switchSubTab(windowId, tabTarget) {
    const parentWindow = document.getElementById(windowId);
    if (!parentWindow) return;

    if (windowId === 'factoryWindow') {
      appState.activeFactoryTab = tabTarget;
    } else if (windowId === 'citizenWindow') {
      appState.activeCitizenTab = tabTarget;
    }

    // Update tab buttons
    const btns = parentWindow.querySelectorAll('.sub-tab-btn');
    btns.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === tabTarget;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update panels
    const panels = parentWindow.querySelectorAll('.sub-tab-panel');
    panels.forEach(panel => {
      const isTarget = panel.id === tabTarget;
      panel.classList.toggle('active', isTarget);
    });

    // Invalidate map dimensions on tab display
    setTimeout(() => {
      if (tabTarget === 'fact-tab-2' && factoryMapInstance) factoryMapInstance.invalidateSize();
      if (tabTarget === 'fact-tab-5' && simLabMapInstance) simLabMapInstance.invalidateSize();
      if (tabTarget === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
      if (tabTarget === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
      renderSvgOverlays();
    }, 80);

    updateAllUI();
  }

  window.switchPersona = switchPersona;
  window.switchSubTab = switchSubTab;

  /* ==========================================================================
     6. UI CONTROLLER & DATA BINDINGS ACROSS ALL TABS
     ========================================================================== */
  function updateAllUI() {
    const metrics = computeDispersionMetrics();

    // 1. GLOBAL TOP NAVIGATION BAR
    const topWind = document.getElementById('topWindTelemetry');
    if (topWind) {
      topWind.textContent = `(${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)})`;
    }

    const gRiskPill = document.getElementById('globalRiskPill');
    const gRiskLevel = document.getElementById('globalRiskLevel');
    const gRiskScore = document.getElementById('globalRiskScore');
    if (gRiskLevel) gRiskLevel.textContent = metrics.riskLevel;
    if (gRiskScore) gRiskScore.textContent = `${metrics.riskScore}/100`;
    if (gRiskPill) {
      gRiskPill.className = `header-risk-pill ${metrics.riskClass === 'danger' ? 'critical' : metrics.riskClass}`;
    }

    const btnLeak = document.getElementById('btnTriggerLeak');
    const btnLeakText = document.getElementById('btnTriggerLeakText');
    if (btnLeak && btnLeakText) {
      if (appState.isLeakTriggered) {
        btnLeak.classList.add('active-breach');
        btnLeakText.textContent = '↺ Reset Baseline';
      } else {
        btnLeak.classList.remove('active-breach');
        btnLeakText.textContent = 'Simulate Incident Release';
      }
    }

    // ========================================================================
    // 2. FACTORY OPERATOR PORTAL (PERSISTENT SIDEBAR + 7 TABS)
    // ========================================================================
    // A. Persistent Sidebar Controls & Telemetry
    const factName = document.getElementById('factAddressName');
    const factStreet = document.getElementById('factAddressStreet');
    const factGps = document.getElementById('factAddressGps');
    const emSelect = document.getElementById('emissionTypeSelect');
    const valBoiler = document.getElementById('valBoiler');
    const sBoiler = document.getElementById('sliderBoiler');
    const btnOpen = document.getElementById('btnGateOpen');
    const btnClosed = document.getElementById('btnGateClosed');

    if (factName) factName.textContent = appState.factory.name;
    if (factStreet) factStreet.textContent = appState.factory.street;
    if (factGps) factGps.innerHTML = `<span class="pin-icon">📍</span> ${appState.factory.coordsStr}`;
    if (emSelect) emSelect.value = appState.factory.emissionType;
    if (valBoiler) valBoiler.textContent = `${metrics.effectiveBoiler}%`;
    if (sBoiler) sBoiler.value = appState.factory.boilerOutput;

    const isGateOpen = appState.factory.sluiceGate === 'OPEN' && !metrics.isSluiceClosed;
    if (btnOpen && btnClosed) {
      btnOpen.classList.toggle('active', isGateOpen);
      btnClosed.classList.toggle('active', !isGateOpen);
    }

    // Live Telemetry rows in persistent sidebar
    const mReach = document.getElementById('metricReach');
    const mBasinDist = document.getElementById('metricBasinDist');
    const mTimeContam = document.getElementById('metricTimeContam');
    const mPhThreat = document.getElementById('metricPhThreat');

    if (mReach) mReach.textContent = `${metrics.plumeReachKm} km Downwind`;
    if (mBasinDist) mBasinDist.textContent = `${metrics.distBasin} km`;
    if (mTimeContam) mTimeContam.textContent = `${metrics.timeContamMin} mins`;
    if (mPhThreat) mPhThreat.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;

    // B. Factory Tab 1: Dashboard
    const factHeroBadge = document.getElementById('factHeroBadge');
    const factHeroSentence = document.getElementById('factHeroSentence');
    if (factHeroBadge) {
      factHeroBadge.textContent = metrics.riskLevel === 'CRITICAL' ? 'CRITICAL RECEPTOR RISK' : (metrics.riskLevel === 'MODERATE' ? 'CAUTION BUFFER' : 'SAFE BUFFER');
      factHeroBadge.className = `hero-badge ${metrics.riskClass === 'danger' ? 'critical' : metrics.riskClass}`;
    }
    if (factHeroSentence) {
      factHeroSentence.textContent = metrics.isLakeBreached
        ? `Active plume centerline is aligned with the municipal water intake. Estimated arrival window: ${metrics.timeContamMin} minutes.`
        : `Plume dispersion vector is deflected from intake gates. Buffer safety margin: ${(metrics.distBasin - metrics.plumeReachKm).toFixed(1)} km.`;
    }

    const ovReach = document.getElementById('ovDispersionReach');
    const ovBasin = document.getElementById('ovWaterBasinDist');
    const ovTime = document.getElementById('ovTimeRemaining');
    const ovPh = document.getElementById('ovPhChange');

    if (ovReach) ovReach.textContent = `${metrics.plumeReachKm} km`;
    if (ovBasin) ovBasin.textContent = `${metrics.distBasin} km`;
    if (ovTime) {
      ovTime.textContent = `${metrics.timeContamMin} min`;
      ovTime.className = `circle-val ${metrics.timeContamMin < 20 ? 'danger' : 'safe'}`;
    }
    if (ovPh) {
      ovPh.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;
      ovPh.className = `circle-val ${metrics.lakePhEnd < 6.0 ? 'danger' : 'safe'}`;
    }

    const dashBufferStatus = document.getElementById('dashBufferStatus');
    const dashLakeThreat = document.getElementById('dashLakeIntakeThreat');
    if (dashBufferStatus) {
      dashBufferStatus.textContent = metrics.isLakeBreached ? 'INTAKE THREATENED' : 'BUFFER NOMINAL';
      dashBufferStatus.className = `badge-status-pill ${metrics.isLakeBreached ? 'critical' : 'safe'}`;
    }
    if (dashLakeThreat) {
      dashLakeThreat.textContent = metrics.isLakeBreached
        ? '⚠️ Plume centerline alignment detected. Raw water sluice closure recommended.'
        : '✔ Hydraulic separation maintained. Downwind corridor clear of municipal weir.';
      dashLakeThreat.className = `comp-status ${metrics.isLakeBreached ? 'danger' : 'safe'}`;
    }

    renderForecastTimeline(metrics);

    // C. Factory Tab 2: Map & Spatial Replay
    const mapWindText = document.getElementById('mapWindText');
    if (mapWindText) {
      mapWindText.textContent = `${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }
    const replayStepDisp = document.getElementById('replayStepDisplay');
    if (replayStepDisp) {
      replayStepDisp.textContent = appState.replay.step === 0 ? 'NOW' : `+${appState.replay.step}h`;
    }

    // D. Factory Tab 3: Risk Drivers & Analysis
    updateWhyThisRiskTab(metrics);

    // E. Factory Tab 4: Containment Protocols
    updateAiActionTab(metrics);

    // F. Factory Tab 5: Atmospheric Scenario Lab
    updateWhatIfSimulatorTab(metrics);

    // G. Factory Tab 6: Corridor Propagation
    updatePollutionJourneyTab(metrics);

    // H. Factory Tab 7: Mitigation Trajectory
    updateBeforeVsAfterTab(metrics);

    // ========================================================================
    // 3. RESIDENTIAL CITIZEN PORTAL (PERSISTENT SIDEBAR + 5 TABS)
    // ========================================================================
    updateCitizenPortalUI(metrics);

    // 4. Update Dynamic SVG Overlays
    renderSvgOverlays();
  }

  /* ==========================================================================
     7. FACTORY TABS LOGIC
     ========================================================================== */
  function renderForecastTimeline(metrics) {
    const container = document.getElementById('forecastTimelineContainer');
    if (!container) return;

    const hours = [
      { label: 'NOW', offsetHr: 0, spd: metrics.windSpeed, dir: metrics.windDir, reach: metrics.plumeReachKm, risk: metrics.riskScore },
      { label: '+1h', offsetHr: 1, spd: 21.0, dir: 140, reach: 3.1, risk: 91 },
      { label: '+2h', offsetHr: 2, spd: 22.5, dir: 142, reach: 3.3, risk: 94 },
      { label: '+3h', offsetHr: 3, spd: 18.0, dir: 135, reach: 2.6, risk: 82 },
      { label: '+4h', offsetHr: 4, spd: 15.2, dir: 128, reach: 2.2, risk: 68 },
      { label: '+5h', offsetHr: 5, spd: 12.0, dir: 120, reach: 1.8, risk: 45 }
    ];

    container.innerHTML = hours.map(h => {
      const isCrit = h.risk > 75;
      const isAmber = h.risk > 35 && h.risk <= 75;
      const tagClass = isCrit ? 'danger' : (isAmber ? 'amber' : 'safe');
      const tagText = isCrit ? 'CRITICAL' : (isAmber ? 'MODERATE' : 'LOW');
      return `
        <div class="forecast-bar-item">
          <span class="f-time">${h.label}</span>
          <span class="f-wind">${h.spd.toFixed(1)} km/h</span>
          <span class="f-dir">${h.dir}° ${getCompassSector(h.dir)}</span>
          <span class="f-reach">${h.reach} km</span>
          <span class="f-badge ${tagClass}">${tagText}</span>
        </div>
      `;
    }).join('');
  }

  function updateWhyThisRiskTab(metrics) {
    const wAlignBadge = document.getElementById('whyAlignBadge');
    const wAlignMetric = document.getElementById('whyAlignMetric');
    const wAlignSub = document.getElementById('whyAlignSub');
    const wAlignExpl = document.getElementById('whyAlignExpl');

    if (wAlignBadge && wAlignMetric && wAlignSub && wAlignExpl) {
      if (metrics.isAligned) {
        wAlignBadge.textContent = 'DIRECT ALIGNMENT';
        wAlignBadge.className = 'badge-status-pill critical';
        wAlignMetric.textContent = '100% Vector Alignment';
        wAlignMetric.style.color = 'var(--danger-red)';
        wAlignSub.textContent = `Wind vector aligns with 138° basin corridor (${metrics.angleDiff}° offset)`;
        wAlignExpl.textContent = 'Direct alignment channels the industrial emission cone straight along the aquatic corridor toward municipal intake gates with minimal lateral dispersion.';
      } else {
        wAlignBadge.textContent = 'DEFLECTED';
        wAlignBadge.className = 'badge-status-pill safe';
        wAlignMetric.textContent = `${Math.round(metrics.angleDiff)}° Corridor Deviation`;
        wAlignMetric.style.color = 'var(--safe-green)';
        wAlignSub.textContent = `Plume vector angled away from drinking reservoir corridor`;
        wAlignExpl.textContent = 'Buffer margin maintained. Downwind atmospheric vector bypasses the primary intake weir, allowing natural atmospheric dilution over undeveloped buffer zones.';
      }
    }

    const wSpeedBadge = document.getElementById('whySpeedBadge');
    const wSpeedMetric = document.getElementById('whySpeedMetric');
    const wSpeedSub = document.getElementById('whySpeedSub');

    if (wSpeedBadge && wSpeedMetric && wSpeedSub) {
      wSpeedBadge.textContent = metrics.windSpeed > 20 ? 'HIGH ADVECTION' : 'MODERATE ADVECTION';
      wSpeedMetric.textContent = `${metrics.windSpeed.toFixed(1)} km/h (${metrics.windSpeed > 20 ? 'Rapid Advection' : 'Steady Advection'})`;
      wSpeedSub.textContent = `Estimated transport arrival window: ~${metrics.timeContamMin} minutes`;
    }

    // Render Chemical Decay Curve
    const decayBox = document.getElementById('decayGraphBox');
    if (decayBox) {
      decayBox.innerHTML = `
        <div class="decay-bars-stack">
          <div class="decay-bar-row">
            <span class="d-label">0 m (Stack)</span>
            <div class="d-track"><div class="d-fill danger" style="width: 100%;"></div></div>
            <span class="d-val">450 ppm (100%)</span>
          </div>
          <div class="decay-bar-row">
            <span class="d-label">500 m</span>
            <div class="d-track"><div class="d-fill danger" style="width: 84%;"></div></div>
            <span class="d-val">380 ppm (84%)</span>
          </div>
          <div class="decay-bar-row">
            <span class="d-label">1.0 km (Buffer)</span>
            <div class="d-track"><div class="d-fill amber" style="width: 64%;"></div></div>
            <span class="d-val">290 ppm (64%)</span>
          </div>
          <div class="decay-bar-row">
            <span class="d-label">1.8 km (Sector 14)</span>
            <div class="d-track"><div class="d-fill amber" style="width: 41%;"></div></div>
            <span class="d-val">185 ppm (41%)</span>
          </div>
          <div class="decay-bar-row">
            <span class="d-label">2.4 km (Basin)</span>
            <div class="d-track"><div class="d-fill safe" style="width: 27%;"></div></div>
            <span class="d-val">120 ppm (27%)</span>
          </div>
        </div>
      `;
    }
  }

  function applySensitivityPreset(preset) {
    if (preset === 'shift40') {
      appState.simulation.isActive = true;
      appState.simulation.windDirection = (appState.weather.windDirection + 40) % 360;
      showToast('Sensitivity Preset Applied: Plume steered 40° away from intake.', 'safe');
    } else if (preset === 'derate') {
      appState.factory.boilerOutput = 50;
      appState.playbook.action1Done = true;
      showToast('Sensitivity Preset Applied: Burner output de-rated to 50%.', 'safe');
    } else if (preset === 'closeGate') {
      appState.factory.sluiceGate = 'CLOSED';
      appState.playbook.action2Done = true;
      showToast('Sensitivity Preset Applied: Effluent discharge gate CLOSED.', 'safe');
    } else if (preset === 'calm') {
      appState.simulation.isActive = true;
      appState.simulation.windSpeed = 6.0;
      showToast('Sensitivity Preset Applied: Calm wind regime (<8 km/h).', 'info');
    }
    updateAllUI();
  }

  window.applySensitivityPreset = applySensitivityPreset;

  function updateAiActionTab(metrics) {
    const tag1 = document.getElementById('tagAction1');
    const btn1 = document.getElementById('btnAction1');
    const tag2 = document.getElementById('tagAction2');
    const btn2 = document.getElementById('btnAction2');
    const tag3 = document.getElementById('tagAction3');
    const btn3 = document.getElementById('btnAction3');
    const btnFull = document.getElementById('btnExecutePlaybookFull');

    if (tag1 && btn1) {
      if (appState.playbook.action1Done || appState.playbook.isExecuted) {
        tag1.textContent = 'ENGAGED (60% FLUX)';
        tag1.className = 'action-status-tag safe';
        btn1.textContent = '✔ Scrubbers Active';
      } else {
        tag1.textContent = 'STANDBY';
        tag1.className = 'action-status-tag';
        btn1.textContent = 'Apply 40% De-rate & Scrubbers';
      }
    }

    if (tag2 && btn2) {
      if (appState.playbook.action2Done || appState.playbook.isExecuted || appState.factory.sluiceGate === 'CLOSED') {
        tag2.textContent = 'LOCKED (CLOSED)';
        tag2.className = 'action-status-tag safe';
        btn2.textContent = '✔ Sluice Gate Locked';
      } else {
        tag2.textContent = 'OPEN WEIR';
        tag2.className = 'action-status-tag danger';
        btn2.textContent = 'Lock Effluent Sluice Gate';
      }
    }

    if (tag3 && btn3) {
      if (appState.playbook.action3Done || appState.playbook.isExecuted) {
        tag3.textContent = 'DISPATCHED';
        tag3.className = 'action-status-tag safe';
        btn3.textContent = '✔ Warning Transmitted';
      } else {
        tag3.textContent = 'QUEUED';
        tag3.className = 'action-status-tag';
        btn3.textContent = 'Transmit Intake Warning Notice';
      }
    }

    if (btnFull) {
      if (appState.playbook.isExecuted) {
        btnFull.textContent = '✔ CONTAINMENT PROTOCOL ACTIVE (CPCB COMPLIANT)';
        btnFull.style.background = '#15803d';
      } else {
        btnFull.textContent = '▶ EXECUTE FULL CONTAINMENT PROTOCOL';
        btnFull.style.background = '#0284c7';
      }
    }

    renderAuditLog();
  }

  function renderAuditLog() {
    const box = document.getElementById('factoryAuditLogBox');
    if (!box) return;
    box.innerHTML = appState.auditLog.map(entry => `
      <div class="audit-entry">
        <span class="ae-time">${entry.time}</span>
        <span class="ae-level ${entry.level.toLowerCase()}">${entry.level}</span>
        <span class="ae-msg">${escapeHtml(entry.msg)}</span>
      </div>
    `).join('');
  }

  function exportAuditLog() {
    const csvContent = 'Time,Level,Message\n' + appState.auditLog.map(e => `"${e.time}","${e.level}","${e.msg.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ecoflow_compliance_audit_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported operational compliance log to CSV.', 'safe');
  }

  window.exportAuditLog = exportAuditLog;

  function updateWhatIfSimulatorTab(metrics) {
    const sDir = document.getElementById('labSliderWindDir');
    const sSpeed = document.getElementById('labSliderWindSpeed');
    const sEm = document.getElementById('labSliderEmission');

    const vDir = document.getElementById('labValWindDir');
    const vSpeed = document.getElementById('labValWindSpeed');
    const vEm = document.getElementById('labValEmission');

    if (vDir && sDir) {
      vDir.textContent = `${appState.simulation.windDirection}° ${getCompassSector(appState.simulation.windDirection)}`;
      sDir.value = appState.simulation.windDirection;
    }
    if (vSpeed && sSpeed) {
      vSpeed.textContent = `${appState.simulation.windSpeed.toFixed(1)} km/h`;
      sSpeed.value = appState.simulation.windSpeed;
    }
    if (vEm && sEm) {
      vEm.textContent = `${appState.simulation.emission}%`;
      sEm.value = appState.simulation.emission;
    }

    const oReach = document.getElementById('labOutReach');
    const oBreach = document.getElementById('labOutBreach');
    const oPh = document.getElementById('labOutPh');
    const oComms = document.getElementById('labOutComms');

    if (oReach) oReach.textContent = `${metrics.plumeReachKm} km`;
    if (oBreach) {
      oBreach.textContent = metrics.isLakeBreached ? `IMPACT (${metrics.timeContamMin} min)` : 'SAFE (Intake Clear)';
      oBreach.className = metrics.isLakeBreached ? 'text-danger' : 'text-safe';
    }
    if (oPh) oPh.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;
    if (oComms) {
      oComms.textContent = metrics.isCitizenInPlume ? metrics.curComm.sector : 'Perimeter Clear';
    }
  }

  function setSimPresetLab(preset) {
    appState.simulation.isActive = true;
    if (preset === 'calm') {
      appState.simulation.windSpeed = 6.0;
      appState.simulation.windDirection = 110;
      appState.simulation.emission = 60;
      showToast('Scenario Preset: Calm Weather loaded.', 'info');
    } else if (preset === 'strong') {
      appState.simulation.windSpeed = 32.0;
      appState.simulation.windDirection = 138;
      appState.simulation.emission = 120;
      showToast('Scenario Preset: High-Velocity Wind loaded.', 'amber');
    } else if (preset === 'worst') {
      appState.simulation.windSpeed = 28.0;
      appState.simulation.windDirection = 138;
      appState.simulation.emission = 150;
      showToast('Scenario Preset: Worst-Case Release loaded.', 'danger');
    } else if (preset === 'reset') {
      appState.simulation.isActive = false;
      appState.simulation.windSpeed = appState.weather.windSpeed;
      appState.simulation.windDirection = appState.weather.windDirection;
      appState.simulation.emission = appState.factory.boilerOutput;
      showToast('Reset scenario to live NASA POWER weather telemetry.', 'info');
    }
    updateAllUI();
  }

  window.setSimPresetLab = setSimPresetLab;

  function updatePollutionJourneyTab(metrics) {
    const stackContainer = document.getElementById('journeyMilestoneStack');
    if (!stackContainer) return;

    const stops = [
      {
        stop: 1,
        title: 'Stack Exit (Elevation 85 m)',
        dist: '0.0 km',
        eta: 'Immediate (T+0m)',
        desc: 'High-temperature thermal updraft releases acidic SO₂ flue gas into atmospheric boundary layer.',
        status: 'danger'
      },
      {
        stop: 2,
        title: 'Atmospheric Boundary Plume Descent',
        dist: '0.5 km',
        eta: 'T+3 min',
        desc: 'Plume touches ground-level inversion layer. Acid vapor begins lateral Gaussian widening.',
        status: 'danger'
      },
      {
        stop: 3,
        title: 'Industrial Perimeter & 1.0 km Buffer',
        dist: '1.0 km',
        eta: 'T+6 min',
        desc: 'Automated perimeter telemetry sensors trigger caution alert across municipal dispatch network.',
        status: metrics.plumeReachKm >= 1.0 ? 'danger' : 'safe'
      },
      {
        stop: 4,
        title: 'Sector 14 Residential Boundary (Community B)',
        dist: '1.8 km',
        eta: `T+${metrics.citizenArrivalMin} min`,
        desc: 'Acidic odor threshold exceeded. Civilian shelter-in-place directive active for downstream homes.',
        status: metrics.isCitizenInPlume ? 'danger' : 'safe'
      },
      {
        stop: 5,
        title: 'Lake Yamuna Municipal Intake Basin',
        dist: '2.4 km',
        eta: `T+${metrics.timeContamMin} min`,
        desc: 'Drinking water reservoir weir. Raw surface extraction must be isolated before plume contact.',
        status: metrics.isLakeBreached ? 'danger' : 'safe'
      },
      {
        stop: 6,
        title: 'Downstream Wetland Ecological Reserve',
        dist: '3.5 km',
        eta: 'T+32 min',
        desc: 'Natural reed beds and aquatic bio-buffer neutralize residual dissolved salts and sulfur mass.',
        status: 'safe'
      }
    ];

    stackContainer.innerHTML = stops.map(s => `
      <div class="milestone-card ${s.status}">
        <div class="milestone-header">
          <span class="m-stop-badge">Stop ${s.stop}</span>
          <h4 class="m-title">${s.title}</h4>
          <span class="m-eta">${s.eta}</span>
        </div>
        <p class="m-desc">${s.desc}</p>
        <div class="m-footer">
          <span>Distance from Epicenter: <strong>${s.dist}</strong></span>
          <span class="m-status-tag ${s.status}">${s.status === 'danger' ? 'HAZARD IMPACT' : 'BUFFER CLEAR'}</span>
        </div>
      </div>
    `).join('');

    const actionBadge = document.getElementById('journeyActionWindowBadge');
    if (actionBadge) {
      actionBadge.textContent = `⏱️ Action Window: ~${metrics.timeContamMin} minutes until plume impinges on municipal intake`;
    }
  }

  function updateBeforeVsAfterTab(metrics) {
    const sBox = document.getElementById('baDeltaSentenceBox');
    if (sBox) {
      sBox.textContent = appState.playbook.isExecuted
        ? 'Containment engaged: Industrial risk reduced by 56 points, securely below the 35 pt CPCB regulatory benchmark.'
        : 'Active containment cuts predicted receptor risk by 56 points, diving securely below the legal regulatory threshold of 35 pts.';
    }

    const netDrop = document.getElementById('baMetricNetDrop');
    const reachDrop = document.getElementById('baMetricReachDrop');
    const sluiceStatus = document.getElementById('baMetricSluiceStatus');
    const popShield = document.getElementById('baMetricPopShield');

    if (netDrop) netDrop.textContent = '-56 points';
    if (reachDrop) reachDrop.textContent = `${metrics.plumeReachKm} km → 1.8 km`;
    if (sluiceStatus) {
      sluiceStatus.textContent = metrics.isSluiceClosed ? 'SECURED (CLOSED)' : 'DIVERT ON ACTION';
      sluiceStatus.className = metrics.isSluiceClosed ? 'text-safe' : 'text-amber';
    }
    if (popShield) popShield.textContent = '22,500 residents';

    // Trajectory comparison chart bars
    const barsContainer = document.getElementById('baChartBarsContainer');
    if (barsContainer) {
      const data = [
        { time: 'T+0h', un: 88, con: 32 },
        { time: 'T+1h', un: 92, con: 30 },
        { time: 'T+2h', un: 95, con: 28 },
        { time: 'T+3h', un: 84, con: 26 },
        { time: 'T+4h', un: 72, con: 24 },
        { time: 'T+5h', un: 58, con: 20 }
      ];

      barsContainer.innerHTML = data.map(d => `
        <div class="chart-time-col">
          <div class="chart-bars-duo">
            <div class="chart-bar uncheck" style="height: ${d.un}%;" title="Unchecked: ${d.un}/100">
              <span class="bar-num">${d.un}</span>
            </div>
            <div class="chart-bar control" style="height: ${d.con}%;" title="Controlled: ${d.con}/100">
              <span class="bar-num">${d.con}</span>
            </div>
          </div>
          <span class="chart-col-label">${d.time}</span>
        </div>
      `).join('');
    }
  }

  /* ==========================================================================
     8. CITIZEN PORTAL LOGIC (PERSISTENT SIDEBAR + 5 TABS)
     ========================================================================== */
  function updateCitizenPortalUI(metrics) {
    const curComm = metrics.curComm;

    // A. Persistent Citizen Sidebar
    const citTitle = document.getElementById('citAddressTitle');
    const citStreet = document.getElementById('citAddressStreet');
    const citCoords = document.getElementById('citCoordsReadout');
    const citExposure = document.getElementById('citExposureStatus');
    const sideArrival = document.getElementById('sideCitArrival');
    const sideAqi = document.getElementById('sideCitAqi');
    const sideWater = document.getElementById('sideCitWater');
    const sideAdvice = document.getElementById('sideCitAdvice');

    if (citTitle) citTitle.textContent = curComm.title;
    if (citStreet) citStreet.textContent = curComm.street;
    if (citCoords) citCoords.innerHTML = `<span class="pin-icon">📍</span> ${curComm.coordsStr}`;

    if (citExposure) {
      citExposure.textContent = metrics.isCitizenInPlume ? '⚠️ INSIDE HAZARD CORRIDOR' : '✔ BUFFER SAFE ZONE';
      citExposure.style.color = metrics.isCitizenInPlume ? 'var(--danger-red)' : 'var(--safe-green)';
    }

    if (sideArrival) {
      sideArrival.textContent = metrics.isCitizenInPlume ? `${metrics.citizenArrivalMin} mins` : 'Buffer Clear';
      sideArrival.className = `metric-val ${metrics.isCitizenInPlume ? 'danger' : 'safe'}`;
    }

    if (sideAqi) {
      sideAqi.textContent = `42 → ${metrics.peakAqi} AQI`;
      sideAqi.className = `metric-val ${metrics.peakAqi > 100 ? 'danger' : 'safe'}`;
    }

    if (sideWater) {
      sideWater.textContent = metrics.isSluiceClosed ? '✔ Aquifer Isolated' : '⚠️ Sluice Open';
      sideWater.className = `metric-val ${metrics.isSluiceClosed ? 'safe' : 'danger'}`;
    }

    if (sideAdvice) {
      const isSheltered = appState.citizen.shelterStatus === 'INDOORS';
      sideAdvice.innerHTML = `
        <strong>Active Directive:</strong>
        <span>${
          metrics.isCitizenInPlume
            ? (isSheltered
                ? 'Sheltered indoors. Keep windows sealed, run indoor air filtration on recirculate, and monitor SMS advisories.'
                : 'URGENT: Move indoors immediately. Avoid outdoor physical exertion and put on a fitted N95 respirator mask.')
            : 'Perimeter safe. Ambient air quality and municipal tap water supply nominal. Normal outdoor movement permitted.'
        }</span>
      `;
    }

    // B. Citizen Tab 1: Safety Dashboard
    const heroBadge = document.getElementById('citHeroBadge');
    const heroSentence = document.getElementById('citHeroSentence');

    if (heroBadge) {
      heroBadge.textContent = metrics.isCitizenInPlume ? '⚠️ INBOUND PLUME ADVISORY' : '✔ BUFFER CLEAR';
      heroBadge.className = `hero-badge ${metrics.isCitizenInPlume ? 'critical' : 'safe'}`;
    }
    if (heroSentence) {
      heroSentence.textContent = metrics.isCitizenInPlume
        ? `Plume arrives in your area in ${metrics.citizenArrivalMin} minutes. Shelter indoors immediately and seal window gaskets.`
        : `Wind steering away from ${curComm.name}. Ambient air quality and tap water supply remain nominal.`;
    }

    const cArr = document.getElementById('citArrivalTimer');
    const cAqi = document.getElementById('citPeakAqi');
    const cSluice = document.getElementById('citSluiceLock');
    const cSo2 = document.getElementById('citSo2Peak');

    if (cArr) {
      cArr.textContent = metrics.isCitizenInPlume ? `${metrics.citizenArrivalMin} min` : 'Clear';
      cArr.className = `circle-val ${metrics.isCitizenInPlume ? 'danger' : 'safe'}`;
    }
    if (cAqi) {
      cAqi.textContent = `${metrics.peakAqi} AQI`;
      cAqi.className = `circle-val ${metrics.peakAqi > 100 ? 'danger' : 'safe'}`;
    }
    if (cSluice) {
      cSluice.textContent = metrics.isSluiceClosed ? 'LOCKED' : 'OPEN';
      cSluice.className = `circle-val ${metrics.isSluiceClosed ? 'safe' : 'danger'}`;
    }
    if (cSo2) {
      cSo2.textContent = `${metrics.peakSo2} µg`;
      cSo2.className = `circle-val ${metrics.peakSo2 > 50 ? 'danger' : 'safe'}`;
    }

    // C. Citizen Tab 2: Threat Radar
    const citLocPill = document.getElementById('citLocPillText');
    const citWind = document.getElementById('citizenWindText');
    if (citLocPill) {
      citLocPill.innerHTML = `Sector: <strong>${curComm.title} (${curComm.distKm} km)</strong>`;
    }
    if (citWind) {
      citWind.textContent = `${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }

    // D. Citizen Tab 3: Water & Health Advisory
    const wsBadge = document.getElementById('citWsBadge');
    const wsDesc = document.getElementById('citWsDesc');
    const wsTap = document.getElementById('citWsTap');

    if (wsBadge) {
      wsBadge.textContent = metrics.isSluiceClosed ? '✔ AUTOMATED WEIR ISOLATION ACTIVE' : '⚠️ RAW SURFACE WATER RESTRICTED';
      wsBadge.style.color = metrics.isSluiceClosed ? 'var(--safe-green)' : 'var(--danger-red)';
    }
    if (wsDesc) {
      wsDesc.textContent = metrics.isSluiceClosed
        ? 'Municipal Intake Sluice #4 closed automatically upon plume detection. The city tap water network is fed exclusively from isolated deep aquifers.'
        : 'Effluent sluice gate is currently open. Tap water remains treated, but direct surface extraction from canals is strictly forbidden.';
    }
    if (wsTap) {
      wsTap.textContent = metrics.isSluiceClosed ? 'Protected & Safe' : 'Filter/Boil Advised';
      wsTap.className = metrics.isSluiceClosed ? 'text-safe' : 'text-danger';
    }

    // E. Citizen Tab 4: Neighborhood Simulator
    const citShiftVal = document.getElementById('citSimShiftVal');
    const citShift = document.getElementById('citSimShiftSlider');
    if (citShiftVal && citShift) {
      const shift = appState.citizen.windShiftSim;
      citShiftVal.textContent = shift === 0 ? '0° (Direct Vector)' : `${shift > 0 ? '+' : ''}${shift}° Shift`;
      citShift.value = shift;
    }
    const simSectorStatus = document.getElementById('citSimSectorStatus');
    const simAqi = document.getElementById('citSimAqi');
    const simArrival = document.getElementById('citSimArrival');

    if (simSectorStatus) {
      simSectorStatus.textContent = metrics.isCitizenInPlume ? 'High Exposure Corridor' : 'Safe Buffer Zone';
      simSectorStatus.className = metrics.isCitizenInPlume ? 'text-danger' : 'text-safe';
    }
    if (simAqi) simAqi.textContent = `${metrics.peakAqi} AQI`;
    if (simArrival) simArrival.textContent = metrics.isCitizenInPlume ? `${metrics.citizenArrivalMin} min` : 'Clear';

    // F. Citizen Tab 5: Broadcast Feed
    renderCitizenNotifications();
  }

  function renderCitizenNotifications() {
    const list = document.getElementById('citizenNotificationList');
    if (!list) return;
    list.innerHTML = appState.citizen.notifications.map(item => `
      <div class="feed-item ${item.type || 'info'}">
        <span class="feed-time">${item.time}</span>
        <span class="feed-text">${escapeHtml(item.text)}</span>
      </div>
    `).join('');
  }

  /* ==========================================================================
     9. EVENT LISTENERS & WIRING
     ========================================================================== */
  function setupEventListeners() {
    // 1. Top Persona Switcher
    document.getElementById('btnPersonaFactory')?.addEventListener('click', () => switchPersona('factory'));
    document.getElementById('btnPersonaCitizen')?.addEventListener('click', () => switchPersona('citizen'));

    // 2. Sub-Tab Bar Buttons
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const parentWindow = btn.closest('.persona-window');
        const target = btn.getAttribute('data-target');
        if (parentWindow && target) {
          switchSubTab(parentWindow.id, target);
        }
      });
    });

    // 3. Trigger Incident Leak Button (Global Centerpiece)
    document.getElementById('btnTriggerLeak')?.addEventListener('click', () => {
      appState.isLeakTriggered = !appState.isLeakTriggered;

      if (appState.isLeakTriggered) {
        playAlertBeep(880, 0.35, 'sine');
        showToast('CRITICAL BREACH SIMULATION: Burner output spiked to 150%, acidic plume expanding.', 'danger');

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appState.citizen.notifications.unshift({
          time: now,
          text: '🚨 [CRITICAL ALERT]: Industrial release detected at stack epicenter. Downwind plume vector active toward Okhla basin.',
          type: 'urgent'
        });

        addAuditEntry('CRIT', 'EMERGENCY: Incident release simulated. Plume reach expanded to 4.2 km.');
        openCitizenWarningModal();
      } else {
        showToast('Incident scenario resolved. Telemetry returned to normal baseline.', 'safe');
        addAuditEntry('INFO', 'Incident scenario resolved. System operating parameters restored.');
      }

      updateAllUI();
    });

    // 4. Factory Configuration Inputs
    document.getElementById('factoryPresetSelect')?.addEventListener('change', (e) => {
      const val = e.target.value;
      appState.activeFactoryKey = val;
      const f = appState.factories[val];
      if (f) {
        appState.factory.preset = val;
        appState.factory.name = f.name;
        appState.factory.street = f.street;
        appState.factory.lat = f.lat;
        appState.factory.lng = f.lng;
        appState.factory.coordsStr = f.coordsStr;
        appState.factory.emissionType = f.emissionType;
        appState.factory.boilerOutput = f.boilerOutput;
      }
      showToast(`Monitored Facility: ${val}`, 'info');
      addAuditEntry('INFO', `Switched active facility to ${val}.`);
      updateAllUI();
    });

    document.getElementById('emissionTypeSelect')?.addEventListener('change', (e) => {
      appState.factory.emissionType = e.target.value;
      showToast(`Stack Emission Type: ${e.target.value}`, 'info');
      addAuditEntry('INFO', `Stack emission category set to ${e.target.value}.`);
      updateAllUI();
    });

    document.getElementById('sliderBoiler')?.addEventListener('input', (e) => {
      appState.factory.boilerOutput = parseInt(e.target.value, 10);
      updateAllUI();
    });

    document.getElementById('btnGateOpen')?.addEventListener('click', () => {
      appState.factory.sluiceGate = 'OPEN';
      appState.playbook.action2Done = false;
      showToast('Effluent discharge gate OPEN.', 'info');
      addAuditEntry('WARN', 'Effluent discharge gate manually OPENED.');
      updateAllUI();
    });

    document.getElementById('btnGateClosed')?.addEventListener('click', () => {
      appState.factory.sluiceGate = 'CLOSED';
      appState.playbook.action2Done = true;
      showToast('Effluent discharge gate CLOSED. Zero-liquid discharge engaged.', 'safe');
      addAuditEntry('SAFE', 'Effluent sluice gate LOCKED. Runoff diverted to retention basin.');
      updateAllUI();
    });

    // 5. Factory Tab 2: Map Controls & Replay
    document.getElementById('btnMapZoomIn')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.zoomIn();
    });

    document.getElementById('btnMapReset')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.setView([28.58, 77.26], 13);
    });

    const replaySlider = document.getElementById('replaySlider');
    const btnPlayReplay = document.getElementById('btnPlayReplay');

    replaySlider?.addEventListener('input', (e) => {
      appState.replay.step = parseInt(e.target.value, 10);
      updateAllUI();
    });

    btnPlayReplay?.addEventListener('click', () => {
      if (appState.replay.isPlaying) {
        clearInterval(appState.replay.intervalId);
        appState.replay.isPlaying = false;
        btnPlayReplay.textContent = '▶ Play Replay';
      } else {
        appState.replay.isPlaying = true;
        btnPlayReplay.textContent = '⏸ Pause Replay';
        appState.replay.intervalId = setInterval(() => {
          appState.replay.step = (appState.replay.step + 1) % 7;
          if (replaySlider) replaySlider.value = appState.replay.step;
          updateAllUI();
          if (appState.replay.step === 6) {
            clearInterval(appState.replay.intervalId);
            appState.replay.isPlaying = false;
            btnPlayReplay.textContent = '▶ Play Replay';
          }
        }, 1200);
      }
    });

    // 6. Factory Tab 4: Containment Protocol Actions
    document.getElementById('btnAction1')?.addEventListener('click', () => {
      appState.playbook.action1Done = !appState.playbook.action1Done;
      if (appState.playbook.action1Done) {
        playAlertBeep(520, 0.2, 'sine');
        showToast('Action 1 Engaged: Burner de-rated by 40% & lime scrubbers active.', 'safe');
        addAuditEntry('SAFE', 'Action 1: 40% de-rate applied to burner flux.');
      } else {
        showToast('Action 1 Disengaged.', 'info');
      }
      updateAllUI();
    });

    document.getElementById('btnAction2')?.addEventListener('click', () => {
      appState.playbook.action2Done = !appState.playbook.action2Done;
      if (appState.playbook.action2Done) {
        appState.factory.sluiceGate = 'CLOSED';
        playAlertBeep(520, 0.2, 'sine');
        showToast('Action 2 Engaged: Effluent sluice locked by gravity drop.', 'safe');
        addAuditEntry('SAFE', 'Action 2: ZLD effluent sluice gate locked.');
      } else {
        appState.factory.sluiceGate = 'OPEN';
        showToast('Action 2 Disengaged: Sluice gate reopened.', 'info');
      }
      updateAllUI();
    });

    document.getElementById('btnAction3')?.addEventListener('click', () => {
      appState.playbook.action3Done = !appState.playbook.action3Done;
      if (appState.playbook.action3Done) {
        playAlertBeep(640, 0.2, 'sine');
        showToast('Action 3 Engaged: Municipal intake isolation notice transmitted.', 'safe');
        addAuditEntry('INFO', 'Action 3: Municipal early-warning webhook transmitted to water authority.');
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appState.citizen.notifications.unshift({
          time: now,
          text: '📢 [MUNICIPAL WEIR NOTICE]: Upstream facility engaged zero-discharge diversion. Water treatment intake secure.',
          type: 'safe'
        });
      } else {
        showToast('Action 3 Disengaged.', 'info');
      }
      updateAllUI();
    });

    document.getElementById('btnExecutePlaybookFull')?.addEventListener('click', () => {
      appState.playbook.isExecuted = !appState.playbook.isExecuted;
      appState.playbook.action1Done = appState.playbook.isExecuted;
      appState.playbook.action2Done = appState.playbook.isExecuted;
      appState.playbook.action3Done = appState.playbook.isExecuted;

      if (appState.playbook.isExecuted) {
        appState.factory.sluiceGate = 'CLOSED';
        playAlertBeep(520, 0.15, 'sine');
        setTimeout(() => playAlertBeep(659, 0.25, 'sine'), 120);
        showToast('Full Containment Protocol Executed: All 3 containment protocols deployed.', 'safe');
        addAuditEntry('SAFE', 'Full Containment Protocol executed. Risk suppressed to regulatory compliance (<35 pts).');
      } else {
        showToast('Containment protocol reset to normal baseline.', 'info');
        addAuditEntry('INFO', 'Containment protocol reset.');
      }

      updateAllUI();
    });

    // 7. Factory Tab 5: What-If Sliders
    const sLabDir = document.getElementById('labSliderWindDir');
    const sLabSpeed = document.getElementById('labSliderWindSpeed');
    const sLabEm = document.getElementById('labSliderEmission');

    function onLabInputChange() {
      appState.simulation.isActive = true;
      if (sLabDir) appState.simulation.windDirection = parseInt(sLabDir.value, 10);
      if (sLabSpeed) appState.simulation.windSpeed = parseFloat(sLabSpeed.value);
      if (sLabEm) appState.simulation.emission = parseInt(sLabEm.value, 10);
      updateAllUI();
    }

    sLabDir?.addEventListener('input', onLabInputChange);
    sLabSpeed?.addEventListener('input', onLabInputChange);
    sLabEm?.addEventListener('input', onLabInputChange);

    // 8. Citizen Community Selector & Shelter Toggle
    document.getElementById('citizenCommunitySelect')?.addEventListener('change', (e) => {
      appState.citizen.selectedCommunityKey = e.target.value;
      showToast(`Selected Sector: ${e.target.value}`, 'info');
      updateAllUI();
    });

    document.getElementById('btnShelterIndoors')?.addEventListener('click', () => {
      appState.citizen.shelterStatus = 'INDOORS';
      document.getElementById('btnShelterIndoors')?.classList.add('active');
      document.getElementById('btnShelterOutdoors')?.classList.remove('active');
      showToast('Status updated: Sheltered INDOORS.', 'info');
    });

    document.getElementById('btnShelterOutdoors')?.addEventListener('click', () => {
      appState.citizen.shelterStatus = 'OUTDOORS';
      document.getElementById('btnShelterOutdoors')?.classList.add('active');
      document.getElementById('btnShelterIndoors')?.classList.remove('active');
      showToast('Warning: Elevated exposure risk in outdoor perimeter.', 'danger');
      updateAllUI();
    });

    // 9. Citizen Tab 4: Wind Shift Slider
    const citShift = document.getElementById('citSimShiftSlider');
    const citShiftVal = document.getElementById('citSimShiftVal');

    citShift?.addEventListener('input', (e) => {
      const shift = parseInt(e.target.value, 10);
      appState.citizen.windShiftSim = shift;
      if (citShiftVal) citShiftVal.textContent = shift === 0 ? '0° (Direct Vector)' : `${shift > 0 ? '+' : ''}${shift}° Shift`;
      appState.simulation.isActive = true;
      appState.simulation.windDirection = (appState.weather.windDirection + shift + 360) % 360;
      updateAllUI();
    });

    document.getElementById('btnCitizenShiftSafe')?.addEventListener('click', () => {
      if (citShift) citShift.value = 45;
      appState.citizen.windShiftSim = 45;
      if (citShiftVal) citShiftVal.textContent = '+45° (Safe Vector)';
      appState.simulation.isActive = true;
      appState.simulation.windDirection = (appState.weather.windDirection + 45) % 360;
      showToast('Simulating wind vector shift away from residential corridor.', 'safe');
      updateAllUI();
    });

    document.getElementById('btnCitizenResetLive')?.addEventListener('click', () => {
      if (citShift) citShift.value = 0;
      appState.citizen.windShiftSim = 0;
      if (citShiftVal) citShiftVal.textContent = '0° (Direct Vector)';
      appState.simulation.isActive = false;
      showToast('Synced with live NASA POWER weather telemetry.', 'info');
      updateAllUI();
    });

    // 10. Citizen Tab 5: Dispatch Test Alert
    document.getElementById('btnSendTestCitizenAlert')?.addEventListener('click', () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      appState.citizen.notifications.unshift({
        time: now,
        text: '📢 [TEST CIVIL ALERT]: Civil Defense emergency broadcast received on local community cell towers.',
        type: 'info'
      });
      playAlertBeep(700, 0.15, 'sine');
      showToast('Test emergency broadcast dispatched to community devices.', 'info');
      renderCitizenNotifications();
    });

    // 11. Modal Controls
    document.getElementById('btnCloseCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnAckCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnSwitchToFactoryModal')?.addEventListener('click', () => {
      closeCitizenWarningModal();
      switchPersona('factory');
    });

    // Window Resize Handler for Leaflet instances
    window.addEventListener('resize', () => {
      if (factoryMapInstance) factoryMapInstance.invalidateSize();
      if (simLabMapInstance) simLabMapInstance.invalidateSize();
      if (citizenMapInstance) citizenMapInstance.invalidateSize();
      if (citLabMapInstance) citLabMapInstance.invalidateSize();
      renderSvgOverlays();
    });
  }

  function openCitizenWarningModal() {
    const modal = document.getElementById('citizenWarningModal');
    const cdText = document.getElementById('modalCountdownText');
    const metrics = computeDispersionMetrics();
    if (cdText) cdText.textContent = `${metrics.citizenArrivalMin} MINUTES`;
    if (modal) modal.style.display = 'flex';
  }

  function closeCitizenWarningModal() {
    const modal = document.getElementById('citizenWarningModal');
    if (modal) modal.style.display = 'none';
  }

  window.closeCitizenWarningModal = closeCitizenWarningModal;

  /* ==========================================================================
     10. APP INITIALIZATION & SERVICE WORKER
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initLeafletMaps();
    setupEventListeners();
    updateAllUI();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration skipped:', err);
      });
    }
  });

})();
