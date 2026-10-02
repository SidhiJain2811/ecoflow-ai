/**
 * EcoFlow AI — Geospatial Risk Network & Industrial Early-Warning Dashboard
 * Dual-Persona & Multi-Tab Window Architecture:
 * 1. Factory Operator Window (7 Persistent Sub-Tabs):
 *    - Tab 1: Dashboard (Parameters, Live Metrics, Compliance, 6h Forecast Timeline)
 *    - Tab 2: Map & Spatial Replay (CartoDB Dark Matter tiles, 7-step replay slider)
 *    - Tab 3: Why This Risk? (Alignment analysis, wind regime, SO2 decay curve, sensitivity tiles)
 *    - Tab 4: AI Action Playbook (Scrubbers, ZLD sluice, municipal API, SOP windows, Audit log)
 *    - Tab 5: What-If Simulator (Atmospheric lab sliders, live projected metrics, interactive steering map)
 *    - Tab 6: Pollution Journey (6-stop linear corridor stack from stack to wetland sanctuary)
 *    - Tab 7: Before vs. After (Dual trajectory comparison chart with 35 pt benchmark, summary metrics)
 * 2. Residential Citizen Window (5 Persistent Sub-Tabs):
 *    - Tab 1: Citizen Safety Dashboard (Residence details, arrival countdown, health directives, 4 dials)
 *    - Tab 2: Neighborhood Threat Radar Map (CartoDB Dark Matter map with pulsing radar halo)
 *    - Tab 3: Drinking Water & Health Advisory (Weir isolation status, aquifer confidence, symptom protocol)
 *    - Tab 4: What-If Neighborhood Simulator (Wind shift slider -90° to +90°, citizen radar steering view)
 *    - Tab 5: Civil Broadcast Feed & Emergency Checklist (Timestamped push feed, checklist, helplines)
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. APPLICATION STATE
     ========================================================================== */
  const appState = {
    persona: 'factory', // 'factory' | 'citizen'
    activeSubTabs: {
      factoryWindow: 'fact-tab-1',
      citizenWindow: 'cit-tab-1'
    },
    isLeakTriggered: false,

    // Factory Configuration & Location
    factory: {
      preset: 'Apex Petrochem',
      name: 'Apex Petrochem',
      lat: 28.61,
      lng: 77.23,
      coordsStr: '28.61° N, 77.23° E',
      emissionType: 'SO₂ & Acid Vapors',
      boilerOutput: 85, // % (20 to 150)
      sluiceGate: 'OPEN', // 'OPEN' | 'CLOSED'
      stackHeightM: 85
    },

    // Downstream Target Basin
    waterBody: {
      name: 'Lake Yamuna Municipal Basin',
      lat: 28.54,
      lng: 77.30,
      coordsStr: '28.54° N, 77.30° E',
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

    // Tab 2 Replay State
    replay: {
      step: 0, // 0 to 6
      isPlaying: false,
      intervalId: null
    },

    // Tab 4 Mitigation Playbook State
    playbook: {
      derateBoiler: false,
      divertEffluent: false,
      dispatchWarning: false,
      emergencyInspect: false,
      isExecuted: false
    },

    // Tab 4 Audit Log
    auditLog: [
      { time: '10:52:10 AM', text: 'Telemetry linked: NASA POWER 19.4 km/h @ 138° SE', type: 'info' },
      { time: '10:48:32 AM', text: 'Automated intake sluice gate #4 armed for zero-liquid diversion', type: 'safe' },
      { time: '10:45:00 AM', text: 'Baseline operational audit recorded nominal buffer compliance', type: 'info' }
    ],

    // Tab 5 What-If Scenario Simulator
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
          name: 'Community A (Riverbank North)',
          sector: 'Sector 8 / Riverbank',
          lat: 28.60,
          lng: 77.24,
          distKm: 1.2,
          bearingDeg: 115,
          coordsStr: '28.60° N, 77.24° E (1.2 km from stack)'
        },
        'Community B': {
          name: 'Community B (Okhla East / Sector 14)',
          sector: 'Okhla East / Sector 14',
          lat: 28.58,
          lng: 77.26,
          distKm: 1.8,
          bearingDeg: 138,
          coordsStr: '28.58° N, 77.26° E (1.8 km from stack)'
        },
        'Community C': {
          name: 'Community C (Downstream Agri-Belt)',
          sector: 'Canal Headworks Agri-Belt',
          lat: 28.55,
          lng: 77.29,
          distKm: 2.9,
          bearingDeg: 145,
          coordsStr: '28.55° N, 77.29° E (2.9 km from stack)'
        },
        'Community D': {
          name: 'Community D (Hillside Buffer)',
          sector: 'Ridge Wildlife Sanctuary',
          lat: 28.63,
          lng: 77.20,
          distKm: 2.2,
          bearingDeg: 300,
          coordsStr: '28.63° N, 77.20° E (2.2 km from stack)'
        }
      },
      shelterStatus: 'INDOORS', // 'INDOORS' | 'OUTDOORS'
      windShiftSim: 0, // deg offset from current wind
      notifications: [
        { time: '10:52 AM', text: '[FACTORY TELEMETRY]: Burner flux monitored at 85%. Plume dispersion cone active toward SE corridor.', type: 'info' },
        { time: '10:48 AM', text: '[MUNICIPAL WATER BOARD]: Automated intake sluice gate #4 armed for zero-liquid diversion.', type: 'safe' },
        { time: '10:45 AM', text: '[CIVIL DEFENSE]: Community B (Sector 14) marked inside downwind buffer. Atmospheric monitors active.', type: 'caution' },
        { time: '10:40 AM', text: '[NASA POWER API]: Telemetry stream synchronized: WS10M=19.4 km/h, WD10M=138° SE.', type: 'info' }
      ]
    }
  };

  /* ==========================================================================
     2. AUDIO & NOTIFICATION FEED HELPERS
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
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy
    }
  }

  function showToast(message, type = 'info', duration = 4000) {
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
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
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

  /* ==========================================================================
     3. MATHEMATICAL DISPERSION & IMPACT ENGINE
     ========================================================================== */
  function computeDispersionMetrics() {
    const isSim = appState.simulation.isActive;
    const windSpeed = isSim ? appState.simulation.windSpeed : appState.weather.windSpeed;
    const windDir = isSim ? appState.simulation.windDirection : appState.weather.windDirection;
    const boiler = appState.isLeakTriggered ? 150 : (isSim ? appState.simulation.emission : appState.factory.boilerOutput);
    
    // Playbook effect: if executed or derated, reduces effective flux
    const isDerated = appState.playbook.derateBoiler || (appState.playbook.isExecuted);
    const effectiveBoiler = isDerated ? Math.round(boiler * 0.6) : boiler;
    
    // Replay scaling (T+0 to T+6 hr)
    const replayFactor = 1 + (appState.replay.step * 0.12);

    // Plume reach calculation
    const boilerScale = Math.sqrt(effectiveBoiler / 85);
    const speedScale = Math.pow(windSpeed / 19.4, 0.45);
    let plumeReachKm = parseFloat((2.8 * boilerScale * speedScale * replayFactor).toFixed(1));
    if (appState.isLeakTriggered) {
      plumeReachKm = Math.max(plumeReachKm, 4.2);
    }
    
    // Downstream water basin distance and arrival window (Distance / WindSpeed * 60)
    const distBasin = appState.waterBody.distanceKm; // 2.4 km
    const timeContamMin = Math.max(1, Math.round((distBasin / Math.max(1, windSpeed)) * 60));

    // Vector alignment with lake corridor (bearing 138°)
    const angleDiff = angleDifference(windDir, appState.waterBody.bearingDeg);
    const isAligned = angleDiff <= 25;
    const isLakeBreached = (plumeReachKm >= distBasin) && isAligned;

    // Lake pH threat
    let lakePhStart = 7.4;
    let lakePhEnd = isLakeBreached ? (appState.isLeakTriggered ? 5.2 : 5.6) : (isAligned ? 6.4 : 7.2);
    if (appState.playbook.divertEffluent || appState.factory.sluiceGate === 'CLOSED' || appState.playbook.isExecuted) {
      lakePhEnd = 6.8;
    }

    // Risk Score Calculation (0-100)
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
    const curComm = appState.citizen.communities[appState.citizen.selectedCommunityKey];
    const commAngleDiff = angleDifference(windDir, curComm.bearingDeg);
    const isCitizenInPlume = (commAngleDiff <= 22) && (plumeReachKm >= curComm.distKm * 0.85);
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
     4. MAP ENGINE (CartoDB Dark Matter Tiles + Dynamic SVG Overlays)
     ========================================================================== */
  const cartoTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const cartoSubdomains = ['a', 'b', 'c', 'd'];
  const cartoAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  let factoryMapInstance = null;
  let simLabMapInstance = null;
  let citizenMapInstance = null;
  let citLabMapInstance = null;

  function initLeafletMaps() {
    const centerCoords = [28.58, 77.26];
    const zoomLevel = 13;

    function createDarkMap(containerId) {
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
        console.warn(`Leaflet init error on #${containerId}:`, e);
        return null;
      }
    }

    // 1. Factory Operator Dark Map (Tab 2)
    factoryMapInstance = createDarkMap('factoryLeafletMap');

    // 2. What-If Simulator Lab Map (Tab 5)
    simLabMapInstance = createDarkMap('simLabLeafletMap');

    // 3. Citizen Threat Radar Map (Citizen Tab 2)
    citizenMapInstance = createDarkMap('citizenLeafletMap');

    // 4. Citizen Simulator Steering Map (Citizen Tab 4)
    citLabMapInstance = createDarkMap('citLabLeafletMap');

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
    
    // 1. Factory Operator Map Overlay (Tab 2)
    const fLayer = document.getElementById('factorySvgDynamicLayer');
    if (fLayer) {
      const srcPt = getProjectedPoint(factoryMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePt = getProjectedPoint(factoryMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1km = getProjectedRadius1Km(factoryMapInstance, appState.factory.lat, appState.factory.lng, 110);
      fLayer.innerHTML = generateMapSvgContent(metrics, 'factory', srcPt.x, srcPt.y, lakePt.x, lakePt.y, r1km, factoryMapInstance);
    }

    // 2. What-If Simulator Lab Map Overlay (Tab 5)
    const simLayer = document.getElementById('simLabSvgDynamicLayer');
    if (simLayer) {
      const srcPtS = getProjectedPoint(simLabMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePtS = getProjectedPoint(simLabMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1kmS = getProjectedRadius1Km(simLabMapInstance, appState.factory.lat, appState.factory.lng, 110);
      simLayer.innerHTML = generateMapSvgContent(metrics, 'factory', srcPtS.x, srcPtS.y, lakePtS.x, lakePtS.y, r1kmS, simLabMapInstance);
    }

    // 3. Citizen Threat Radar Map Overlay (Citizen Tab 2)
    const cLayer = document.getElementById('citizenSvgDynamicLayer');
    if (cLayer) {
      const srcPtC = getProjectedPoint(citizenMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePtC = getProjectedPoint(citizenMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1kmC = getProjectedRadius1Km(citizenMapInstance, appState.factory.lat, appState.factory.lng, 110);
      cLayer.innerHTML = generateMapSvgContent(metrics, 'citizen', srcPtC.x, srcPtC.y, lakePtC.x, lakePtC.y, r1kmC, citizenMapInstance);
    }

    // 4. Citizen What-If Steering Map Overlay (Citizen Tab 4)
    const citLabLayer = document.getElementById('citLabSvgDynamicLayer');
    if (citLabLayer) {
      const srcPtCL = getProjectedPoint(citLabMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePtCL = getProjectedPoint(citLabMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1kmCL = getProjectedRadius1Km(citLabMapInstance, appState.factory.lat, appState.factory.lng, 110);
      citLabLayer.innerHTML = generateMapSvgContent(metrics, 'citizen', srcPtCL.x, srcPtCL.y, lakePtCL.x, lakePtCL.y, r1kmCL, citLabMapInstance);
    }
  }

  function generateMapSvgContent(metrics, mode, srcX, srcY, lakeX, lakeY, r1km = 110, mapInst = null) {
    const rad = (metrics.windDir - 90) * (Math.PI / 180);
    const pixelReach = Math.min(650, (metrics.plumeReachKm / 2.4) * 440);
    const coneSpread = Math.min(130, 42 + pixelReach * 0.16);

    // Tip and flanks of plume cone
    const tipX = srcX + Math.cos(rad) * pixelReach;
    const tipY = srcY + Math.sin(rad) * pixelReach;
    const normRad = rad + Math.PI / 2;
    const flank1X = tipX + Math.cos(normRad) * coneSpread;
    const flank1Y = tipY + Math.sin(normRad) * coneSpread;
    const flank2X = tipX - Math.cos(normRad) * coneSpread;
    const flank2Y = tipY - Math.sin(normRad) * coneSpread;

    const plumePath = `M ${srcX} ${srcY} L ${flank1X} ${flank1Y} Q ${tipX} ${tipY} ${flank2X} ${flank2Y} Z`;

    // Downwind arrow line
    const arrowLen = 95;
    const arrowEndX = srcX + Math.cos(rad) * arrowLen;
    const arrowEndY = srcY + Math.sin(rad) * arrowLen;

    const isBreach = metrics.isLakeBreached || appState.isLeakTriggered;

    let svgHtml = `
      <defs>
        <linearGradient id="plumeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.75"/>
          <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.15"/>
        </linearGradient>
        <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- Hydrological Corridor (Photorealistic River Channel & Lake Basin) -->
      <path d="M 0 100 Q 180 130 310 190 T 500 270 T ${lakeX} ${lakeY} Q 820 420 1000 440" fill="none" stroke="rgba(14, 116, 144, 0.35)" stroke-width="48" stroke-linecap="round"/>
      <path d="M 0 100 Q 180 130 310 190 T 500 270 T ${lakeX} ${lakeY} Q 820 420 1000 440" fill="none" stroke="rgba(6, 182, 212, 0.48)" stroke-width="24" stroke-linecap="round"/>
      <ellipse cx="${lakeX}" cy="${lakeY}" rx="95" ry="46" fill="rgba(8, 51, 68, 0.55)" stroke="rgba(6, 182, 212, 0.65)" stroke-width="2"/>

      <!-- Concentric Distance Hazard Rings -->
      <g stroke="rgba(6, 182, 212, 0.3)" stroke-width="1.2" stroke-dasharray="6,6" fill="none">
        <circle cx="${srcX}" cy="${srcY}" r="${r1km}"/>
        <text x="${srcX + r1km + 4}" y="${srcY - 4}" fill="#06b6d4" font-size="10" font-weight="700">1.0 km</text>

        <circle cx="${srcX}" cy="${srcY}" r="${r1km * 2}"/>
        <text x="${srcX + r1km * 2 + 4}" y="${srcY - 4}" fill="#06b6d4" font-size="10" font-weight="700">2.0 km</text>

        <circle cx="${srcX}" cy="${srcY}" r="${r1km * 3}"/>
        <text x="${srcX + r1km * 3 + 4}" y="${srcY - 4}" fill="#06b6d4" font-size="10" font-weight="700">3.0 km</text>
      </g>

      <!-- 1.0 km Hazard Zone High-Alert Dashed Ring -->
      <circle cx="${srcX}" cy="${srcY}" r="${r1km}" stroke="rgba(239, 68, 68, 0.65)" stroke-width="2" stroke-dasharray="5,4" fill="rgba(239, 68, 68, 0.08)"/>

      <!-- Trajectory vector connecting stack to water basin (2.4 km) -->
      <line x1="${srcX}" y1="${srcY}" x2="${lakeX}" y2="${lakeY}" stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.8" stroke-dasharray="6,4"/>
      <rect x="${(srcX + lakeX)/2 - 32}" y="${(srcY + lakeY)/2 - 12}" width="64" height="20" rx="4" fill="rgba(7, 14, 23, 0.85)" stroke="#162a45"/>
      <text x="${(srcX + lakeX)/2}" y="${(srcY + lakeY)/2 + 2}" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">2.4 km</text>

      <!-- Predicted Plume Dispersion Cone -->
      <path d="${plumePath}" fill="url(#plumeGrad)" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.8" class="${isBreach ? 'breach-pulsing' : ''}"/>

      <!-- Plume Corridor Label Badge -->
      <g transform="translate(${(srcX + tipX)/2}, ${(srcY + tipY)/2 - 15})">
        <rect x="-70" y="-12" width="140" height="22" rx="4" fill="rgba(185, 28, 28, 0.85)" stroke="#ef4444" stroke-width="1.2"/>
        <text x="0" y="2" fill="#ffffff" font-size="10" font-weight="800" text-anchor="middle">Predicted Plume Corridor</text>
      </g>

      <!-- Downwind Vector Indicator Arrow -->
      <g stroke="#ffffff" stroke-width="2.5" fill="none">
        <line x1="${srcX}" y1="${srcY}" x2="${arrowEndX}" y2="${arrowEndY}" stroke-linecap="round"/>
        <polygon points="${arrowEndX},${arrowEndY} ${arrowEndX - 10 * Math.cos(rad - 0.4)},${arrowEndY - 10 * Math.sin(rad - 0.4)} ${arrowEndX - 10 * Math.cos(rad + 0.4)},${arrowEndY - 10 * Math.sin(rad + 0.4)}" fill="#ffffff" stroke="none"/>
      </g>
      <text x="${arrowEndX + 14 * Math.cos(rad)}" y="${arrowEndY + 14 * Math.sin(rad)}" fill="#e0f2fe" font-size="11" font-weight="800">
        Wind ${metrics.windDir}° ${getCompassSector(metrics.windDir)}
      </text>

      <!-- Factory Source Marker -->
      <g transform="translate(${srcX}, ${srcY})">
        <circle cx="0" cy="0" r="22" fill="#ea580c" stroke="#ffffff" stroke-width="2.5" filter="url(#glowFilter)"/>
        <text x="0" y="5" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">🏭</text>
        <rect x="-55" y="-36" width="110" height="19" rx="3" fill="rgba(7, 14, 23, 0.9)" stroke="#ea580c"/>
        <text x="0" y="-23" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle">${appState.factory.name}</text>
        <text x="28" y="16" fill="#fca5a5" font-size="9.5" font-weight="700">1.0 km Buffer</text>
      </g>

      <!-- Downstream Water Body Target -->
      <g transform="translate(${lakeX}, ${lakeY})">
        <circle cx="0" cy="0" r="${isBreach ? '28' : '22'}" fill="${isBreach ? '#ef4444' : '#0284c7'}" stroke="#ffffff" stroke-width="2.5" class="${isBreach ? 'breach-pulsing' : ''}" filter="url(#glowFilter)"/>
        <text x="0" y="6" fill="#ffffff" font-size="15" text-anchor="middle">💧</text>
        <g transform="translate(18, -14)">
          <rect x="0" y="-12" width="170" height="26" rx="4" fill="${isBreach ? 'rgba(127, 29, 29, 0.92)' : 'rgba(7, 24, 44, 0.9)'}" stroke="${isBreach ? '#ef4444' : '#0ea5e9'}" stroke-width="1.5"/>
          <text x="10" y="4" fill="${isBreach ? '#fca5a5' : '#7dd3fc'}" font-size="10" font-weight="800">
            ${isBreach ? '⚠️ WATER BASIN INTRUSION' : '✔ WATER BASIN BUFFER'}
          </text>
          <text x="10" y="24" fill="#ffffff" font-size="11" font-weight="800">${appState.waterBody.name}</text>
        </g>
      </g>
    `;

    // Community Points (A, B, C, D)
    const comms = [
      { id: 'A', lat: 28.60, lng: 77.24, defX: 380, defY: 220, key: 'Community A' },
      { id: 'B', lat: 28.58, lng: 77.26, defX: 520, defY: 290, key: 'Community B' },
      { id: 'C', lat: 28.55, lng: 77.29, defX: 740, defY: 390, key: 'Community C' },
      { id: 'D', lat: 28.63, lng: 77.20, defX: 190, defY: 300, key: 'Community D' }
    ];

    comms.forEach(c => {
      const pt = getProjectedPoint(mapInst, c.lat, c.lng, c.defX, c.defY);
      const isSelectedCitizen = (mode === 'citizen') && (appState.citizen.selectedCommunityKey === c.key);
      const isBreachedComm = (c.key === 'Community B' && metrics.isAligned) || (c.key === 'Community A' && metrics.plumeReachKm >= 1.2);

      svgHtml += `
        <g transform="translate(${pt.x}, ${pt.y})">
          ${isSelectedCitizen ? `
            <circle cx="0" cy="0" r="28" fill="rgba(6, 182, 212, 0.25)" stroke="#06b6d4" stroke-width="2.5" class="breach-pulsing"/>
            <circle cx="0" cy="0" r="16" fill="rgba(6, 182, 212, 0.5)"/>
            <text x="0" y="5" fill="#ffffff" font-size="13" text-anchor="middle">🏠</text>
          ` : `
            <circle cx="0" cy="0" r="8" fill="${isBreachedComm ? '#ef4444' : '#10b981'}" stroke="#ffffff" stroke-width="2"/>
          `}
          <rect x="12" y="-10" width="100" height="18" rx="3" fill="rgba(7, 14, 23, 0.88)" stroke="#162a45"/>
          <text x="16" y="3" fill="#ffffff" font-size="9.5" font-weight="700">${c.id}: ${c.key.split(' ')[1]}</text>
        </g>
      `;
    });

    return svgHtml;
  }

  /* ==========================================================================
     5. PERSONA & SUB-TAB NAVIGATION
     ========================================================================== */
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

      if (windowFactory) windowFactory.style.display = 'flex';
      if (windowCitizen) windowCitizen.style.display = 'none';

      // Invalidate current active factory tab map
      setTimeout(() => {
        const curTab = appState.activeSubTabs.factoryWindow;
        if (curTab === 'fact-tab-2' && factoryMapInstance) factoryMapInstance.invalidateSize();
        if (curTab === 'fact-tab-5' && simLabMapInstance) simLabMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 60);
    } else {
      btnCitizen?.classList.add('active');
      btnCitizen?.setAttribute('aria-selected', 'true');
      btnFactory?.classList.remove('active');
      btnFactory?.setAttribute('aria-selected', 'false');

      if (windowCitizen) windowCitizen.style.display = 'flex';
      if (windowFactory) windowFactory.style.display = 'none';

      // Invalidate current active citizen tab map
      setTimeout(() => {
        const curTab = appState.activeSubTabs.citizenWindow;
        if (curTab === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
        if (curTab === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 60);
    }

    updateAllUI();
  }

  function switchSubTab(windowId, tabTarget) {
    const parentWindow = document.getElementById(windowId);
    if (!parentWindow) return;

    appState.activeSubTabs[windowId] = tabTarget;

    // 1. Update sub-tab buttons in this window
    const btns = parentWindow.querySelectorAll('.sub-tab-btn');
    btns.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === tabTarget;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // 2. Update sub-tab panels
    const panels = parentWindow.querySelectorAll('.sub-tab-panel');
    panels.forEach(panel => {
      const isTarget = panel.id === tabTarget;
      panel.classList.toggle('active', isTarget);
    });

    // 3. Map invalidation on tab change
    setTimeout(() => {
      if (tabTarget === 'fact-tab-2' && factoryMapInstance) factoryMapInstance.invalidateSize();
      if (tabTarget === 'fact-tab-5' && simLabMapInstance) simLabMapInstance.invalidateSize();
      if (tabTarget === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
      if (tabTarget === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
      renderSvgOverlays();
    }, 60);

    updateAllUI();
  }

  window.switchPersona = switchPersona;
  window.switchSubTab = switchSubTab;

  /* ==========================================================================
     6. UI CONTROLLER & DATA BINDINGS ACROSS ALL TABS
     ========================================================================== */
  function updateAllUI() {
    const metrics = computeDispersionMetrics();

    // 1. GLOBAL TOP BAR
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
        btnLeakText.textContent = 'Trigger Incident Leak';
      }
    }

    // 2. FACTORY TAB 1: DASHBOARD
    updateFactoryDashboard(metrics);

    // 3. FACTORY TAB 2: MAP & REPLAY
    updateFactoryMapReplay(metrics);

    // 4. FACTORY TAB 3: WHY THIS RISK?
    updateFactoryWhyThisRisk(metrics);

    // 5. FACTORY TAB 4: AI ACTION PLAYBOOK
    updateFactoryPlaybook(metrics);

    // 6. FACTORY TAB 5: WHAT-IF SIMULATOR LAB
    updateFactorySimulator(metrics);

    // 7. FACTORY TAB 6: POLLUTION JOURNEY
    updateFactoryJourney(metrics);

    // 8. FACTORY TAB 7: BEFORE VS AFTER
    updateFactoryBeforeAfter(metrics);

    // 9. RESIDENTIAL CITIZEN TABS (1–5)
    updateCitizenTabs(metrics);

    // 10. Re-render SVG Layers
    renderSvgOverlays();
  }

  /* --- FACTORY TAB 1 --- */
  function updateFactoryDashboard(metrics) {
    const rCoords = document.getElementById('readoutCoords');
    const rEmission = document.getElementById('readoutEmission');
    const valBoiler = document.getElementById('valBoiler');
    const sBoiler = document.getElementById('sliderBoiler');
    const btnOpen = document.getElementById('btnGateOpen');
    const btnClosed = document.getElementById('btnGateClosed');

    if (rCoords) rCoords.innerHTML = `<span class="pin-icon">📍</span> ${appState.factory.coordsStr}`;
    if (rEmission) rEmission.textContent = appState.factory.emissionType;
    if (valBoiler) valBoiler.textContent = `${metrics.effectiveBoiler}%`;
    if (sBoiler) sBoiler.value = appState.factory.boilerOutput;

    const isOpen = appState.factory.sluiceGate === 'OPEN';
    if (btnOpen && btnClosed) {
      btnOpen.classList.toggle('active', isOpen);
      btnClosed.classList.toggle('active', !isOpen);
    }

    const mReach = document.getElementById('metricReach');
    const mBasinDist = document.getElementById('metricBasinDist');
    const mTimeContam = document.getElementById('metricTimeContam');
    const mPhThreat = document.getElementById('metricPhThreat');

    if (mReach) mReach.textContent = `${metrics.plumeReachKm} km Downwind`;
    if (mBasinDist) mBasinDist.textContent = `${metrics.distBasin} km`;
    if (mTimeContam) mTimeContam.textContent = `${metrics.timeContamMin} mins`;
    if (mPhThreat) mPhThreat.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;

    // Hero Box
    const factHeroBadge = document.getElementById('factHeroBadge');
    const factHeroSentence = document.getElementById('factHeroSentence');
    if (factHeroBadge) {
      factHeroBadge.textContent = metrics.riskLevel === 'CRITICAL' ? 'CRITICAL IMPACT RISK' : (metrics.riskLevel === 'MODERATE' ? 'CAUTION: ADVECTION CONE' : 'CONTAINED / LOW RISK');
      factHeroBadge.className = `hero-badge ${metrics.riskClass === 'danger' ? 'critical' : metrics.riskClass}`;
    }
    if (factHeroSentence) {
      factHeroSentence.textContent = metrics.isLakeBreached
        ? `The municipal drinking reservoir is directly in the active plume corridor. Estimated arrival: ${metrics.timeContamMin} minutes.`
        : (metrics.isAligned
          ? `Downwind alignment active toward ${appState.waterBody.name}. Continuous scrubber monitoring advised.`
          : `Plume steering safely off municipal axis. Lateral dispersion factor within compliant limits.`);
    }

    // 4 Dials
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

    // Buffer compliance card
    const dashBuffer = document.getElementById('dashBufferStatus');
    const dashLake = document.getElementById('dashLakeIntakeThreat');
    if (dashBuffer) {
      dashBuffer.textContent = metrics.isLakeBreached ? 'INTAKE THREATENED' : 'BUFFER COMPLIANT';
      dashBuffer.className = `badge-status-pill ${metrics.isLakeBreached ? 'critical' : 'safe'}`;
    }
    if (dashLake) {
      dashLake.textContent = metrics.isLakeBreached
        ? '⚠️ Plume centerline alignment detected. Raw water sluice closure recommended.'
        : '✔ Plume corridor clears raw water intake weir. Sluice gate nominal.';
      dashLake.className = `comp-status ${metrics.isLakeBreached ? 'danger' : 'safe'}`;
    }

    // 6-Hour Forecast Timeline
    renderForecastTimeline(metrics);
  }

  function renderForecastTimeline(metrics) {
    const cont = document.getElementById('forecastTimelineContainer');
    if (!cont) return;

    const hours = ['NOW', '+1h', '+2h', '+3h', '+4h', '+5h'];
    const baseScore = metrics.riskScore;

    cont.innerHTML = hours.map((h, i) => {
      // Projected diurnal decay or escalation
      let score = Math.max(15, Math.min(99, Math.round(baseScore + (i * 2) - (appState.playbook.isExecuted ? i * 8 : 0))));
      const fillClass = score > 68 ? 'danger' : (score > 35 ? 'amber' : 'safe');
      return `
        <div class="f-bar-col">
          <div class="f-bar-track">
            <div class="f-bar-fill ${fillClass}" style="height: ${score}%;"></div>
          </div>
          <span class="f-val-label">${score}</span>
          <span class="f-hour-label">${h}</span>
        </div>
      `;
    }).join('');
  }

  /* --- FACTORY TAB 2: MAP & SPATIAL REPLAY --- */
  function updateFactoryMapReplay(metrics) {
    const replayDisplay = document.getElementById('replayStepDisplay');
    const replaySlider = document.getElementById('replaySlider');
    const mapWindText = document.getElementById('mapWindText');

    if (replayDisplay) {
      replayDisplay.textContent = appState.replay.step === 0 ? 'NOW' : `T+${appState.replay.step}h`;
    }
    if (replaySlider) {
      replaySlider.value = appState.replay.step;
    }
    if (mapWindText) {
      mapWindText.textContent = `${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }
  }

  /* --- FACTORY TAB 3: WHY THIS RISK? --- */
  function updateFactoryWhyThisRisk(metrics) {
    const alignBadge = document.getElementById('whyAlignBadge');
    const alignMetric = document.getElementById('whyAlignMetric');
    const alignSub = document.getElementById('whyAlignSub');
    const alignExpl = document.getElementById('whyAlignExpl');

    const alignPct = Math.max(0, Math.round((1 - (metrics.angleDiff / 90)) * 100));
    if (alignBadge) {
      alignBadge.textContent = metrics.isAligned ? 'DIRECT HIT' : 'DEFLECTED';
      alignBadge.className = `badge-status-pill ${metrics.isAligned ? 'critical' : 'safe'}`;
    }
    if (alignMetric) {
      alignMetric.textContent = `${alignPct}% Vector Alignment`;
      alignMetric.style.color = metrics.isAligned ? 'var(--danger-red)' : 'var(--safe-green)';
    }
    if (alignSub) {
      alignSub.textContent = `Wind vector aligns with 138° basin corridor (${metrics.angleDiff}° offset)`;
    }
    if (alignExpl) {
      alignExpl.textContent = metrics.isAligned
        ? 'Severe direct alignment. The industrial emission cone is steered directly along the aquatic corridor, channeling acid gases straight toward intake gates with minimal atmospheric lateral dispersion.'
        : 'Favorable vector offset. Prevailing wind steers the dispersion cone away from the municipal reservoir axis, providing ample atmospheric dissipation buffer.';
    }

    // Speed regime
    const speedBadge = document.getElementById('whySpeedBadge');
    const speedMetric = document.getElementById('whySpeedMetric');
    const speedSub = document.getElementById('whySpeedSub');
    const speedExpl = document.getElementById('whySpeedExpl');

    if (speedBadge) {
      speedBadge.textContent = metrics.windSpeed >= 18 ? 'RAPID ADVECTION' : 'DIFFUSION BUFFER';
      speedBadge.className = `badge-status-pill ${metrics.windSpeed >= 18 ? 'amber' : 'safe'}`;
    }
    if (speedMetric) speedMetric.textContent = `${metrics.windSpeed.toFixed(1)} km/h Direct Flow`;
    if (speedSub) speedSub.textContent = `Basin Arrival Window: ${metrics.timeContamMin} minutes`;
    if (speedExpl) {
      speedExpl.textContent = `At ${metrics.windSpeed.toFixed(1)} km/h, advection dominates over atmospheric cross-diffusion, transporting acid vapors rapidly across the 2.4 km corridor before vertical mixing can dilute ground concentration.`;
    }

    // SO2 Decay Curve
    renderDecayCurve(metrics);

    // Sensitivity Scores
    const sWind40 = document.getElementById('scoreWind40');
    const sDerate = document.getElementById('scoreDerate');
    const sCloseGate = document.getElementById('scoreCloseGate');
    const sCalm = document.getElementById('scoreCalm');

    if (sWind40) sWind40.textContent = '0';
    if (sDerate) sDerate.textContent = '51';
    if (sCloseGate) sCloseGate.textContent = '35';
    if (sCalm) sCalm.textContent = '65';
  }

  function renderDecayCurve(metrics) {
    const cont = document.getElementById('decayGraphBox');
    if (!cont) return;

    const stops = [
      { km: '0.0 km (Stack)', val: metrics.isLeakTriggered ? 480 : 310, max: 500 },
      { km: '1.0 km (Buffer)', val: metrics.isLeakTriggered ? 340 : 215, max: 500 },
      { km: '2.4 km (Basin)', val: metrics.isLakeBreached ? (metrics.isLeakTriggered ? 260 : 155) : 38, max: 500 },
      { km: '3.8 km (Canal)', val: metrics.isLakeBreached ? 90 : 22, max: 500 },
      { km: '5.2 km (Wetlands)', val: 18, max: 500 }
    ];

    cont.innerHTML = stops.map(s => {
      const pct = Math.round((s.val / s.max) * 100);
      const fillClass = s.val > 200 ? 'danger' : (s.val > 70 ? 'amber' : 'safe');
      return `
        <div class="decay-row">
          <span class="decay-label">${s.km}</span>
          <div class="decay-bar-track">
            <div class="decay-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
          </div>
          <span class="decay-val">${s.val} µg</span>
        </div>
      `;
    }).join('');
  }

  /* --- FACTORY TAB 4: AI ACTION PLAYBOOK --- */
  function updateFactoryPlaybook(metrics) {
    const card1 = document.getElementById('cardAction1');
    const tag1 = document.getElementById('tagAction1');
    const btn1 = document.getElementById('btnAction1');

    const card2 = document.getElementById('cardAction2');
    const tag2 = document.getElementById('tagAction2');
    const btn2 = document.getElementById('btnAction2');

    const card3 = document.getElementById('cardAction3');
    const tag3 = document.getElementById('tagAction3');
    const btn3 = document.getElementById('btnAction3');

    // Scrubber
    const isAct1 = appState.playbook.derateBoiler;
    card1?.classList.toggle('active', isAct1);
    if (tag1) {
      tag1.textContent = isAct1 ? 'ACTIVE (-40%)' : 'STANDBY';
      tag1.className = `action-status-tag ${isAct1 ? 'active' : ''}`;
    }
    if (btn1) btn1.textContent = isAct1 ? 'Disengage Scrubbers' : 'Apply 40% De-rate & Scrubbers';

    // Sluice Gate
    const isAct2 = appState.playbook.divertEffluent || appState.factory.sluiceGate === 'CLOSED';
    card2?.classList.toggle('active', isAct2);
    if (tag2) {
      tag2.textContent = isAct2 ? 'LOCKED / DIVERTED' : 'OPEN WEIR';
      tag2.className = `action-status-tag ${isAct2 ? 'active' : ''}`;
    }
    if (btn2) btn2.textContent = isAct2 ? 'Unlock Effluent Gate' : 'Lock Effluent Sluice Gate';

    // Municipal Warning API
    const isAct3 = appState.playbook.dispatchWarning;
    card3?.classList.toggle('active', isAct3);
    if (tag3) {
      tag3.textContent = isAct3 ? 'TRANSMITTED (ACK)' : 'QUEUED';
      tag3.className = `action-status-tag ${isAct3 ? 'active' : ''}`;
    }
    if (btn3) btn3.textContent = isAct3 ? 'Resend Warning Broadcast' : 'Transmit Intake Warning Notice';

    // Full Playbook Button
    const btnFull = document.getElementById('btnExecutePlaybookFull');
    if (btnFull) {
      if (appState.playbook.isExecuted) {
        btnFull.textContent = '✔ FULL PLAYBOOK EXECUTED & VERIFIED';
        btnFull.style.background = 'linear-gradient(135deg, #047857 0%, #059669 100%)';
      } else {
        btnFull.textContent = '▶ EXECUTE FULL MITIGATION PLAYBOOK';
        btnFull.style.background = '';
      }
    }

    // Render Audit Log
    renderFactoryAuditLog();
  }

  function renderFactoryAuditLog() {
    const box = document.getElementById('factoryAuditLogBox');
    if (!box) return;
    box.innerHTML = appState.auditLog.map(entry => `
      <div class="audit-entry ${entry.type || 'info'}">
        <span class="audit-time">${entry.time}</span>
        <span>${escapeHtml(entry.text)}</span>
      </div>
    `).join('');
  }

  /* --- FACTORY TAB 5: WHAT-IF SIMULATOR LAB --- */
  function updateFactorySimulator(metrics) {
    const sDirVal = document.getElementById('labValWindDir');
    const sSpeedVal = document.getElementById('labValWindSpeed');
    const sEmVal = document.getElementById('labValEmission');
    const sDir = document.getElementById('labSliderWindDir');
    const sSpeed = document.getElementById('labSliderWindSpeed');
    const sEm = document.getElementById('labSliderEmission');

    if (sDirVal) sDirVal.textContent = `${appState.simulation.windDirection}° ${getCompassSector(appState.simulation.windDirection)}`;
    if (sSpeedVal) sSpeedVal.textContent = `${appState.simulation.windSpeed.toFixed(1)} km/h`;
    if (sEmVal) sEmVal.textContent = `${appState.simulation.emission}%`;

    if (sDir) sDir.value = appState.simulation.windDirection;
    if (sSpeed) sSpeed.value = appState.simulation.windSpeed;
    if (sEm) sEm.value = appState.simulation.emission;

    const outReach = document.getElementById('labOutReach');
    const outBreach = document.getElementById('labOutBreach');
    const outPh = document.getElementById('labOutPh');
    const outComms = document.getElementById('labOutComms');

    if (outReach) outReach.textContent = `${metrics.plumeReachKm} km`;
    if (outBreach) {
      outBreach.textContent = metrics.isLakeBreached ? `IMPACT (${metrics.timeContamMin} min)` : 'SAFE BUFFER';
      outBreach.className = metrics.isLakeBreached ? 'text-danger' : 'text-safe';
    }
    if (outPh) outPh.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;
    if (outComms) {
      outComms.textContent = metrics.isAligned ? 'Community B (Sector 14)' : (metrics.plumeReachKm >= 1.2 ? 'Community A' : 'None (Buffer Clear)');
    }
  }

  /* --- FACTORY TAB 6: POLLUTION JOURNEY --- */
  function updateFactoryJourney(metrics) {
    const badge = document.getElementById('journeyActionWindowBadge');
    if (badge) {
      badge.textContent = `⏱️ Action Window: ~${metrics.timeContamMin} minutes until plume impinges on municipal intake`;
    }

    const stack = document.getElementById('journeyMilestoneStack');
    if (!stack) return;

    const stops = [
      {
        num: '1',
        title: 'Factory Stack Epicenter',
        dist: '0.0 km · T+0 min',
        desc: `${appState.factory.emissionType} discharged from ${appState.factory.stackHeightM}m stack at ${metrics.effectiveBoiler}% boiler output.`,
        status: 'DISCHARGING',
        type: 'danger'
      },
      {
        num: '2',
        title: 'Community A Perimeter',
        dist: '0.8 km · T+4 min',
        desc: 'Enters northern buffer zone. Local air quality monitoring station triggers early warning sensor.',
        status: metrics.plumeReachKm >= 0.8 ? 'IMPINGED' : 'CLEAR',
        type: metrics.plumeReachKm >= 0.8 ? 'amber' : 'safe'
      },
      {
        num: '3',
        title: 'Community B (Sector 14)',
        dist: '1.8 km · T+10 min',
        desc: 'Densely populated residential neighborhood. Acid aerosol concentrations exceed civil defense thresholds.',
        status: metrics.isCitizenInPlume ? 'HAZARD CORRIDOR' : 'MONITORED',
        type: metrics.isCitizenInPlume ? 'danger' : 'safe'
      },
      {
        num: '4',
        title: 'Lake Yamuna Municipal Basin',
        dist: '2.4 km · T+14 min',
        desc: 'Critical municipal drinking intake weir. Raw water extraction susceptible to acid sulfate acidification.',
        status: metrics.isLakeBreached ? 'BREACH DETECTED' : 'BUFFER INTACT',
        type: metrics.isLakeBreached ? 'danger' : 'safe'
      },
      {
        num: '5',
        title: 'Outflow Canal Feeder',
        dist: '3.8 km · T+22 min',
        desc: 'Downstream agricultural distribution canal. Automated floating barrier booms prevent chemical spread.',
        status: metrics.plumeReachKm >= 3.8 ? 'ELEVATED' : 'NOMINAL',
        type: metrics.plumeReachKm >= 3.8 ? 'amber' : 'safe'
      },
      {
        num: '6',
        title: 'Wetland Bio-Sanctuary',
        dist: '5.2 km · T+30 min',
        desc: 'Downstream ecological sanctuary. Natural vegetative buffer provides final biological neutralization.',
        status: 'PROTECTED',
        type: 'safe'
      }
    ];

    stack.innerHTML = stops.map(s => `
      <div class="journey-milestone-card ${s.type}">
        <div class="journey-ms-num">${s.num}</div>
        <div>
          <div class="journey-ms-title">${s.title}</div>
          <div style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700;">${s.dist}</div>
        </div>
        <div class="journey-ms-desc">${s.desc}</div>
        <div class="journey-ms-time">${s.dist.split('·')[1]}</div>
        <div class="journey-ms-badge ${s.type}">${s.status}</div>
      </div>
    `).join('');
  }

  /* --- FACTORY TAB 7: BEFORE VS AFTER --- */
  function updateFactoryBeforeAfter(metrics) {
    const netDrop = document.getElementById('baMetricNetDrop');
    const reachDrop = document.getElementById('baMetricReachDrop');
    const sluiceStatus = document.getElementById('baMetricSluiceStatus');
    const popShield = document.getElementById('baMetricPopShield');

    const ptsRemoved = appState.playbook.isExecuted ? 56 : (appState.isLeakTriggered ? 64 : 46);
    if (netDrop) netDrop.textContent = `-${ptsRemoved} points`;
    if (reachDrop) reachDrop.textContent = `${metrics.plumeReachKm} km → 1.6 km`;
    if (sluiceStatus) {
      const isClosed = appState.playbook.divertEffluent || appState.factory.sluiceGate === 'CLOSED' || appState.playbook.isExecuted;
      sluiceStatus.textContent = isClosed ? 'SECURED (DIVERTED)' : 'OPEN WEIR';
      sluiceStatus.style.color = isClosed ? 'var(--safe-green)' : 'var(--danger-red)';
    }
    if (popShield) popShield.textContent = '18,000 residents';

    renderDualTrajectoryChart(metrics);
  }

  function renderDualTrajectoryChart(metrics) {
    const cont = document.getElementById('baChartBarsContainer');
    if (!cont) return;

    const timePoints = ['T+0', 'T+1h', 'T+2h', 'T+3h', 'T+4h', 'T+5h'];
    const uncheckedBase = metrics.isLeakTriggered ? 96 : 88;
    const mitigatedBase = 32;

    cont.innerHTML = timePoints.map((t, i) => {
      const valWithout = Math.min(99, uncheckedBase + (i * 2));
      const valWith = Math.max(18, mitigatedBase - (i * 2));
      return `
        <div class="traj-col">
          <div class="traj-pair">
            <div class="traj-bar without" style="height: ${valWithout}%;">
              <span class="traj-val-label">${valWithout}</span>
            </div>
            <div class="traj-bar with" style="height: ${valWith}%;">
              <span class="traj-val-label">${valWith}</span>
            </div>
          </div>
          <span class="traj-time-label">${t}</span>
        </div>
      `;
    }).join('');
  }

  /* --- RESIDENTIAL CITIZEN TABS (1–5) --- */
  function updateCitizenTabs(metrics) {
    // 1. Citizen Tab 1: Safety Dashboard
    const citCoords = document.getElementById('citCoordsReadout');
    const citExposure = document.getElementById('citExposureStatus');
    const citHeroBadge = document.getElementById('citHeroBadge');
    const citHeroSentence = document.getElementById('citHeroSentence');

    if (citCoords) citCoords.innerHTML = `<span class="pin-icon">📍</span> ${metrics.curComm.coordsStr}`;
    if (citExposure) {
      citExposure.textContent = metrics.isCitizenInPlume ? '⚠️ INSIDE HAZARD CORRIDOR' : '✔ BUFFER SAFE ZONE';
      citExposure.className = `field-val-badge ${metrics.isCitizenInPlume ? 'danger' : 'safe'}`;
    }

    if (citHeroBadge) {
      citHeroBadge.textContent = metrics.isCitizenInPlume ? '⚠️ INBOUND PLUME ADVISORY' : '✔ BUFFER CLEAR';
      citHeroBadge.className = `hero-badge ${metrics.isCitizenInPlume ? 'critical' : 'safe'}`;
    }
    if (citHeroSentence) {
      citHeroSentence.textContent = metrics.isCitizenInPlume
        ? `Plume arrives in your area in ${metrics.citizenArrivalMin} minutes. Shelter indoors immediately and seal window gaskets.`
        : `Wind steering away from ${metrics.curComm.name}. Ambient air quality and tap water supply remain nominal.`;
    }

    const citArrival = document.getElementById('citArrivalTimer');
    const citAqi = document.getElementById('citPeakAqi');
    const citSluice = document.getElementById('citSluiceLock');
    const citSo2 = document.getElementById('citSo2Peak');

    if (citArrival) {
      citArrival.textContent = metrics.isCitizenInPlume ? `${metrics.citizenArrivalMin} min` : 'Clear';
      citArrival.className = `circle-val ${metrics.isCitizenInPlume ? 'danger' : 'safe'}`;
    }
    if (citAqi) {
      citAqi.textContent = `${metrics.peakAqi} AQI`;
      citAqi.className = `circle-val ${metrics.peakAqi > 100 ? 'danger' : 'safe'}`;
    }
    if (citSluice) {
      const isLocked = appState.factory.sluiceGate === 'CLOSED' || appState.playbook.divertEffluent || appState.playbook.isExecuted;
      citSluice.textContent = isLocked ? 'LOCKED' : 'OPEN';
      citSluice.className = `circle-val ${isLocked ? 'safe' : 'danger'}`;
    }
    if (citSo2) {
      citSo2.textContent = `${metrics.peakSo2} µg`;
      citSo2.className = `circle-val ${metrics.peakSo2 > 50 ? 'danger' : 'safe'}`;
    }

    // 2. Citizen Tab 2: Threat Radar
    const locPill = document.getElementById('citLocPillText');
    const citWind = document.getElementById('citizenWindText');
    if (locPill) {
      locPill.innerHTML = `<span class="pin-icon">📍</span> Your Sector: <strong>${metrics.curComm.name}</strong>`;
    }
    if (citWind) {
      citWind.textContent = `${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }

    // 3. Citizen Tab 3: Water & Health Advisory
    const wsBadge = document.getElementById('citWsBadge');
    const wsDesc = document.getElementById('citWsDesc');
    const wsTap = document.getElementById('citWsTap');
    const isLocked = appState.factory.sluiceGate === 'CLOSED' || appState.playbook.divertEffluent || appState.playbook.isExecuted;

    if (wsBadge) {
      wsBadge.textContent = isLocked ? '✔ AUTOMATED WEIR ISOLATION ACTIVE' : '⚠️ RAW SURFACE WATER RESTRICTED';
      wsBadge.style.color = isLocked ? 'var(--safe-green)' : 'var(--danger-red)';
    }
    if (wsDesc) {
      wsDesc.textContent = isLocked
        ? 'Municipal Intake Sluice #4 closed automatically upon plume detection. The city tap water network is fed exclusively from isolated deep aquifers.'
        : 'Sluice gate is currently open. Tap water remains treated, but direct surface extraction from canals is strictly forbidden.';
    }
    if (wsTap) {
      wsTap.textContent = isLocked ? 'Protected & Safe' : 'Filter/Boil Advised';
      wsTap.className = isLocked ? 'text-safe' : 'text-danger';
    }

    // 4. Citizen Tab 4: Neighborhood Simulator
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

    // 5. Citizen Tab 5: Broadcast Feed
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
     7. EVENT LISTENERS & WIRING
     ========================================================================== */
  function setupEventListeners() {
    // 1. Top Persona Switcher
    document.getElementById('btnPersonaFactory')?.addEventListener('click', () => switchPersona('factory'));
    document.getElementById('btnPersonaCitizen')?.addEventListener('click', () => switchPersona('citizen'));

    // 2. Sub-Tab Bar Buttons
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
        playAlertBeep(880, 0.35, 'sawtooth');
        showToast('CRITICAL BREACH TRIGGERED: Boiler spiked to 150%, acidic plume expanding!', 'danger');

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appState.citizen.notifications.unshift({
          time: now,
          text: '🚨 [CRITICAL ALERT]: Industrial leak detected at stack epicenter. Inbound plume vector active toward Okhla basin.',
          type: 'urgent'
        });

        appState.auditLog.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: 'CRITICAL BREACH: Boiler load spiked to 150%. SO2 flux > 480 µg/m³.',
          type: 'danger'
        });

        // Automatically open warning modal for citizens
        openCitizenWarningModal();
      } else {
        showToast('Incident resolved. Telemetry returned to baseline parameters.', 'safe');
        appState.auditLog.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: 'Incident cleared by operator. Factory telemetry nominal.',
          type: 'safe'
        });
      }

      updateAllUI();
    });

    // 4. Factory Tab 1: Configuration Inputs
    document.getElementById('factoryPresetSelect')?.addEventListener('change', (e) => {
      const val = e.target.value;
      appState.factory.name = val;
      if (val === 'Refinery Beta') {
        appState.factory.lat = 28.63;
        appState.factory.lng = 77.21;
        appState.factory.coordsStr = '28.63° N, 77.21° E';
        appState.factory.emissionType = 'Hydrocarbon & Mercaptans';
      } else if (val === 'Smelter Gamma') {
        appState.factory.lat = 28.59;
        appState.factory.lng = 77.25;
        appState.factory.coordsStr = '28.59° N, 77.25° E';
        appState.factory.emissionType = 'Heavy Metal Particulates';
      } else {
        appState.factory.lat = 28.61;
        appState.factory.lng = 77.23;
        appState.factory.coordsStr = '28.61° N, 77.23° E';
        appState.factory.emissionType = 'SO₂ & Acid Vapors';
      }
      showToast(`Loaded Preset: ${val}`, 'info');
      updateAllUI();
    });

    document.getElementById('sliderBoiler')?.addEventListener('input', (e) => {
      appState.factory.boilerOutput = parseInt(e.target.value, 10);
      updateAllUI();
    });

    document.getElementById('btnGateOpen')?.addEventListener('click', () => {
      appState.factory.sluiceGate = 'OPEN';
      appState.playbook.divertEffluent = false;
      showToast('Effluent sluice gate OPEN.', 'info');
      updateAllUI();
    });

    document.getElementById('btnGateClosed')?.addEventListener('click', () => {
      appState.factory.sluiceGate = 'CLOSED';
      appState.playbook.divertEffluent = true;
      showToast('Effluent sluice gate CLOSED. Zero-liquid discharge engaged.', 'safe');
      updateAllUI();
    });

    // 5. Factory Tab 2: Map Replay Controls
    const replaySlider = document.getElementById('replaySlider');
    replaySlider?.addEventListener('input', (e) => {
      appState.replay.step = parseInt(e.target.value, 10);
      updateAllUI();
    });

    const btnPlayReplay = document.getElementById('btnPlayReplay');
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
          updateAllUI();
        }, 1200);
      }
    });

    document.getElementById('btnMapZoomIn')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.zoomIn();
    });

    document.getElementById('btnMapReset')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.setView([28.58, 77.26], 13);
    });

    // 6. Factory Tab 3: Sensitivity Preset Handlers
    window.applySensitivityPreset = function(type) {
      appState.simulation.isActive = true;
      if (type === 'shift40') {
        appState.simulation.windDirection = (appState.weather.windDirection + 40) % 360;
        showToast('Sensitivity Applied: Wind turned 40° away from basin corridor.', 'safe');
      } else if (type === 'derate') {
        appState.simulation.emission = 50;
        showToast('Sensitivity Applied: Boiler output de-rated by 40%.', 'safe');
      } else if (type === 'closeGate') {
        appState.factory.sluiceGate = 'CLOSED';
        appState.playbook.divertEffluent = true;
        showToast('Sensitivity Applied: Effluent sluice gate closed & diverted.', 'safe');
      } else if (type === 'calm') {
        appState.simulation.windSpeed = 6.0;
        showToast('Sensitivity Applied: Wind speed <8 km/h modeled (extended lead time buffer).', 'info');
      }
      updateAllUI();
    };

    // 7. Factory Tab 4: Playbook Buttons
    document.getElementById('btnAction1')?.addEventListener('click', () => {
      appState.playbook.derateBoiler = !appState.playbook.derateBoiler;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      appState.auditLog.unshift({
        time: now,
        text: appState.playbook.derateBoiler ? 'Engaged 40% boiler de-rate & lime slurry injection' : 'Disengaged lime slurry scrubbers',
        type: appState.playbook.derateBoiler ? 'safe' : 'caution'
      });
      playAlertBeep(600, 0.15, 'sine');
      showToast(appState.playbook.derateBoiler ? 'Scrubbers active (-40% flux).' : 'Scrubbers standby.', 'info');
      updateAllUI();
    });

    document.getElementById('btnAction2')?.addEventListener('click', () => {
      appState.playbook.divertEffluent = !appState.playbook.divertEffluent;
      appState.factory.sluiceGate = appState.playbook.divertEffluent ? 'CLOSED' : 'OPEN';
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      appState.auditLog.unshift({
        time: now,
        text: appState.playbook.divertEffluent ? 'ZLD lockdown: Dropped effluent sluice gate into retention pond' : 'Reopened effluent weir sluice gate',
        type: appState.playbook.divertEffluent ? 'safe' : 'caution'
      });
      playAlertBeep(700, 0.15, 'triangle');
      showToast(appState.playbook.divertEffluent ? 'Effluent sluice locked.' : 'Effluent weir reopened.', 'info');
      updateAllUI();
    });

    document.getElementById('btnAction3')?.addEventListener('click', () => {
      appState.playbook.dispatchWarning = !appState.playbook.dispatchWarning;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      appState.auditLog.unshift({
        time: now,
        text: appState.playbook.dispatchWarning ? 'Municipal Early Warning API dispatched: Intake isolation confirmed' : 'Municipal early warning notice revoked',
        type: 'info'
      });
      playAlertBeep(750, 0.15, 'sine');
      showToast('Municipal water authority alert dispatched.', 'info');
      updateAllUI();
    });

    document.getElementById('btnExecutePlaybookFull')?.addEventListener('click', () => {
      appState.playbook.derateBoiler = true;
      appState.playbook.divertEffluent = true;
      appState.playbook.dispatchWarning = true;
      appState.playbook.isExecuted = true;
      appState.factory.sluiceGate = 'CLOSED';

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      appState.auditLog.unshift({
        time: now,
        text: 'FULL AI MITIGATION PLAYBOOK EXECUTED: All containment controls deployed',
        type: 'safe'
      });

      playAlertBeep(520, 0.2, 'sine');
      setTimeout(() => playAlertBeep(659, 0.25, 'sine'), 120);
      showToast('FULL PLAYBOOK DEPLOYED: Risk dropped to 32 pts (below 35 pt legal threshold).', 'safe');
      updateAllUI();
    });

    window.exportAuditLog = function() {
      const logText = appState.auditLog.map(e => `[${e.time}] ${e.text}`).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecoflow_audit_log_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Audit log exported to text file.', 'info');
    };

    // 8. Factory Tab 5: Simulator Lab Controls
    window.setSimPresetLab = function(preset) {
      appState.simulation.isActive = true;
      if (preset === 'calm') {
        appState.simulation.windSpeed = 6.0;
        appState.simulation.windDirection = 138;
        appState.simulation.emission = 75;
      } else if (preset === 'strong') {
        appState.simulation.windSpeed = 31.0;
        appState.simulation.windDirection = 138;
        appState.simulation.emission = 95;
      } else if (preset === 'worst') {
        appState.simulation.windSpeed = 24.0;
        appState.simulation.windDirection = 138;
        appState.simulation.emission = 140;
      } else if (preset === 'reset') {
        appState.simulation.isActive = false;
        appState.simulation.windDirection = appState.weather.windDirection;
        appState.simulation.windSpeed = appState.weather.windSpeed;
        appState.simulation.emission = appState.factory.boilerOutput;
      }
      playAlertBeep(600, 0.1, 'triangle');
      updateAllUI();
    };

    const labDir = document.getElementById('labSliderWindDir');
    const labSpeed = document.getElementById('labSliderWindSpeed');
    const labEm = document.getElementById('labSliderEmission');

    function onLabSliderChange() {
      appState.simulation.isActive = true;
      if (labDir) appState.simulation.windDirection = parseInt(labDir.value, 10);
      if (labSpeed) appState.simulation.windSpeed = parseFloat(labSpeed.value);
      if (labEm) appState.simulation.emission = parseInt(labEm.value, 10);
      updateAllUI();
    }

    labDir?.addEventListener('input', onLabSliderChange);
    labSpeed?.addEventListener('input', onLabSliderChange);
    labEm?.addEventListener('input', onLabSliderChange);

    // 9. Citizen Tabs: Community Selector & Shelter Toggle
    document.getElementById('citizenCommunitySelect')?.addEventListener('change', (e) => {
      appState.citizen.selectedCommunityKey = e.target.value;
      showToast(`Selected Neighborhood: ${e.target.value}`, 'info');
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
      showToast('Warning: High outdoor exposure in plume vicinity.', 'danger');
    });

    // 10. Citizen Tab 4: Wind Shift Slider
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
      showToast('Synced with live NASA POWER weather data.', 'info');
      updateAllUI();
    });

    // 11. Citizen Tab 5: Dispatch Test Push Alert
    document.getElementById('btnSendTestCitizenAlert')?.addEventListener('click', () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      appState.citizen.notifications.unshift({
        time: now,
        text: '📢 [TEST PUSH ALERT]: Civil Defense broadcast received on local community cell towers.',
        type: 'info'
      });
      playAlertBeep(700, 0.15, 'sine');
      showToast('Test emergency push alert dispatched to community cell phones.', 'info');
      renderCitizenNotifications();
    });

    // 12. Modal Buttons
    document.getElementById('btnCloseCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnAckCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnSwitchToFactoryModal')?.addEventListener('click', () => {
      closeCitizenWarningModal();
      switchPersona('factory');
    });

    // Window resize event for responsive Leaflet map frames
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
     8. APP BOOTSTRAP
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
