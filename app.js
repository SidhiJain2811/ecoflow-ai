/**
 * EcoFlow AI — Geospatial Risk Network & Industrial Early-Warning Dashboard
 * Dual-Persona Architecture:
 * 1. Factory Operator Dashboard (Unified Industrial View with Real CartoDB Dark Matter Map API)
 *    - Left Sidebar: Factory Configuration, Live Risk Metrics, AI Mitigation Playbook
 *    - Main Content: Real Interactive Geospatial Map (CartoDB tiles + SVG Plume), Live Risk Overview (4 dials),
 *                    Why Is This Critical? (Explainability & confidence), What-If Atmospheric Simulator,
 *                    Comparative Simulation Results, and AI Insights
 * 2. Residential Citizen Window (Clean 5-Subtab System):
 *    - Tab 1: Citizen Safety Dashboard (Arrival countdown, health directives, 4 telemetry dials)
 *    - Tab 2: Neighborhood Threat Radar Map (Real CartoDB map with citizen pulsing radar halo)
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
    activeCitizenTab: 'cit-tab-1',
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

    // AI Mitigation Playbook State
    playbook: {
      derateBoiler: true,
      divertEffluent: true,
      dispatchWarning: true,
      emergencyInspect: false,
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
    
    // Playbook effect: if executed, reduces effective flux by 40%
    const isDerated = appState.playbook.isExecuted && appState.playbook.derateBoiler;
    const effectiveBoiler = isDerated ? Math.round(boiler * 0.6) : boiler;
    
    // Plume reach calculation
    const boilerScale = Math.sqrt(effectiveBoiler / 85);
    const speedScale = Math.pow(windSpeed / 19.4, 0.45);
    let plumeReachKm = parseFloat((2.8 * boilerScale * speedScale).toFixed(1));
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
    if (appState.playbook.isExecuted && appState.playbook.divertEffluent) {
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
     4. MAP ENGINE (Real CartoDB Dark Matter Map API + Dynamic SVG Plume)
     ========================================================================== */
  const cartoTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const cartoSubdomains = ['a', 'b', 'c', 'd'];
  const cartoAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  let factoryMapInstance = null;
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

    // 1. Factory Operator Real Map (Main Dashboard)
    factoryMapInstance = createDarkMap('factoryLeafletMap');

    // 2. Citizen Threat Radar Map (Citizen Tab 2)
    citizenMapInstance = createDarkMap('citizenLeafletMap');

    // 3. Citizen Simulator Steering Map (Citizen Tab 4)
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
    
    // 1. Factory Dashboard Real Map Overlay
    const fLayer = document.getElementById('svgDynamicLayer');
    if (fLayer) {
      const srcPt = getProjectedPoint(factoryMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePt = getProjectedPoint(factoryMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1km = getProjectedRadius1Km(factoryMapInstance, appState.factory.lat, appState.factory.lng, 110);
      fLayer.innerHTML = generateMapSvgContent(metrics, 'factory', srcPt.x, srcPt.y, lakePt.x, lakePt.y, r1km, factoryMapInstance);
    }

    // 2. Citizen Threat Radar Map Overlay (Citizen Tab 2)
    const cLayer = document.getElementById('citizenSvgDynamicLayer');
    if (cLayer) {
      const srcPtC = getProjectedPoint(citizenMapInstance, appState.factory.lat, appState.factory.lng, 240, 160);
      const lakePtC = getProjectedPoint(citizenMapInstance, appState.waterBody.lat, appState.waterBody.lng, 680, 360);
      const r1kmC = getProjectedRadius1Km(citizenMapInstance, appState.factory.lat, appState.factory.lng, 110);
      cLayer.innerHTML = generateMapSvgContent(metrics, 'citizen', srcPtC.x, srcPtC.y, lakePtC.x, lakePtC.y, r1kmC, citizenMapInstance);
    }

    // 3. Citizen Simulator Steering Map Overlay (Citizen Tab 4)
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
     5. PERSONA SWITCHER & CITIZEN SUB-TAB NAVIGATION
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

      if (windowFactory) windowFactory.style.display = 'block';
      if (windowCitizen) windowCitizen.style.display = 'none';

      // Refresh factory map frame
      setTimeout(() => {
        if (factoryMapInstance) factoryMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 60);
    } else {
      btnCitizen?.classList.add('active');
      btnCitizen?.setAttribute('aria-selected', 'true');
      btnFactory?.classList.remove('active');
      btnFactory?.setAttribute('aria-selected', 'false');

      if (windowCitizen) windowCitizen.style.display = 'flex';
      if (windowFactory) windowFactory.style.display = 'none';

      // Refresh active citizen map frame
      setTimeout(() => {
        if (appState.activeCitizenTab === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
        if (appState.activeCitizenTab === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
        renderSvgOverlays();
      }, 60);
    }

    updateAllUI();
  }

  function switchSubTab(windowId, tabTarget) {
    const parentWindow = document.getElementById(windowId);
    if (!parentWindow) return;

    if (windowId === 'citizenWindow') {
      appState.activeCitizenTab = tabTarget;
    }

    // Update sub-tab buttons in this window
    const btns = parentWindow.querySelectorAll('.sub-tab-btn');
    btns.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === tabTarget;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update sub-tab panels
    const panels = parentWindow.querySelectorAll('.sub-tab-panel');
    panels.forEach(panel => {
      const isTarget = panel.id === tabTarget;
      panel.classList.toggle('active', isTarget);
    });

    // Invalidate map on tab change
    setTimeout(() => {
      if (tabTarget === 'cit-tab-2' && citizenMapInstance) citizenMapInstance.invalidateSize();
      if (tabTarget === 'cit-tab-4' && citLabMapInstance) citLabMapInstance.invalidateSize();
      renderSvgOverlays();
    }, 60);

    updateAllUI();
  }

  window.switchPersona = switchPersona;
  window.switchSubTab = switchSubTab;

  /* ==========================================================================
     6. UI CONTROLLER & DATA BINDINGS ACROSS DASHBOARD & CITIZEN PORTAL
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

    // ========================================================================
    // 2. UNIFIED FACTORY OPERATOR DASHBOARD
    // ========================================================================
    // Sidebar
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

    const isGateOpen = appState.factory.sluiceGate === 'OPEN';
    if (btnOpen && btnClosed) {
      btnOpen.classList.toggle('active', isGateOpen);
      btnClosed.classList.toggle('active', !isGateOpen);
    }

    // Live Risk Metrics in sidebar
    const mReach = document.getElementById('metricReach');
    const mBasinDist = document.getElementById('metricBasinDist');
    const mTimeContam = document.getElementById('metricTimeContam');
    const mPhThreat = document.getElementById('metricPhThreat');

    if (mReach) mReach.textContent = `${metrics.plumeReachKm} km Downwind`;
    if (mBasinDist) mBasinDist.textContent = `${metrics.distBasin} km`;
    if (mTimeContam) mTimeContam.textContent = `${metrics.timeContamMin} mins`;
    if (mPhThreat) mPhThreat.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;

    // Playbook Execution Button
    const btnExec = document.getElementById('btnExecutePlaybook');
    if (btnExec) {
      if (appState.playbook.isExecuted) {
        btnExec.textContent = '✔ PLAYBOOK ACTIVE (60% FEED)';
        btnExec.style.background = 'linear-gradient(135deg, #047857, #10b981)';
      } else {
        btnExec.textContent = '▶ EXECUTE PLAYBOOK';
        btnExec.style.background = '';
      }
    }

    // Map Wind text
    const mapWindText = document.getElementById('mapWindText');
    if (mapWindText) {
      mapWindText.textContent = `NASA Wind: ${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }

    // Middle Row: Live Risk Overview (4 dials)
    const badgeRisk = document.getElementById('badgeLiveRisk');
    const ovReach = document.getElementById('ovDispersionReach');
    const ovBasin = document.getElementById('ovWaterBasinDist');
    const ovTime = document.getElementById('ovTimeRemaining');
    const ovPh = document.getElementById('ovPhChange');

    if (badgeRisk) {
      badgeRisk.textContent = metrics.riskLevel;
      badgeRisk.className = `badge-status-pill ${metrics.riskClass === 'danger' ? 'critical' : metrics.riskClass}`;
    }
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

    // Middle Row: Why is this critical?
    const whyMain = document.getElementById('whyMainText');
    const whyBullets = document.getElementById('whyBullets');
    const valConf = document.getElementById('valConfidence');
    const fillConf = document.getElementById('fillConfidence');

    if (whyMain) {
      whyMain.textContent = metrics.isLakeBreached 
        ? 'Wind is carrying pollution directly toward the water basin.' 
        : (metrics.isAligned ? 'Downwind vector aligned with intake corridor.' : 'Plume vector deflected; buffer zone intact.');
    }
    if (whyBullets) {
      whyBullets.innerHTML = `
        <li>• SO₂ concentration + wind direction (${metrics.windDir}° ${getCompassSector(metrics.windDir)})</li>
        <li>• ${metrics.distBasin} km downstream distance</li>
        <li class="impact-highlight">${metrics.isLakeBreached ? '= HIGH IMPACT RISK.' : '= BUFFER ACTIVE.'}</li>
      `;
    }
    if (valConf && fillConf) {
      const confVal = metrics.isLakeBreached ? 91 : 86;
      valConf.textContent = `${confVal}%`;
      fillConf.style.width = `${confVal}%`;
    }

    // Middle Row: What-If Sliders
    const sValDir = document.getElementById('simValWindDir');
    const sValSpeed = document.getElementById('simValWindSpeed');
    const sValEm = document.getElementById('simValEmission');
    const sSlideDir = document.getElementById('simSliderWindDir');
    const sSlideSpeed = document.getElementById('simSliderWindSpeed');
    const sSlideEm = document.getElementById('simSliderEmission');

    if (sValDir) sValDir.textContent = `${appState.simulation.windDirection}° ${getCompassSector(appState.simulation.windDirection)}`;
    if (sValSpeed) sValSpeed.textContent = `${appState.simulation.windSpeed.toFixed(1)} km/h`;
    if (sValEm) sValEm.textContent = `${appState.simulation.emission}%`;
    if (sSlideDir) sSlideDir.value = appState.simulation.windDirection;
    if (sSlideSpeed) sSlideSpeed.value = appState.simulation.windSpeed;
    if (sSlideEm) sSlideEm.value = appState.simulation.emission;

    // Bottom Row: Simulation Result Table
    const rCurReach = document.getElementById('resCurReach');
    const rCurImpact = document.getElementById('resCurImpact');
    const rCurTime = document.getElementById('resCurTime');
    const rCurPh = document.getElementById('resCurPh');

    if (rCurReach) rCurReach.textContent = `${metrics.plumeReachKm} km`;
    if (rCurImpact) {
      rCurImpact.textContent = metrics.riskLevel;
      rCurImpact.className = metrics.riskLevel === 'CRITICAL' ? 'text-danger' : (metrics.riskLevel === 'MODERATE' ? 'text-amber' : 'text-safe');
    }
    if (rCurTime) rCurTime.textContent = `${metrics.timeContamMin} min`;
    if (rCurPh) rCurPh.textContent = `${metrics.lakePhStart} → ${metrics.lakePhEnd}`;

    // After Mitigation column
    const rMitReach = document.getElementById('resMitReach');
    const rMitImpact = document.getElementById('resMitImpact');
    const rMitTime = document.getElementById('resMitTime');
    const rMitPh = document.getElementById('resMitPh');

    if (rMitReach) rMitReach.innerHTML = `1.6 km <strong class="arrow-down">↓ 43%</strong>`;
    if (rMitImpact) rMitImpact.innerHTML = `LOW <strong class="arrow-down">↓ 100%</strong>`;
    if (rMitTime) rMitTime.innerHTML = `31 min <strong class="arrow-up">↑ 117%</strong>`;
    if (rMitPh) rMitPh.innerHTML = `7.2 → 6.8 <strong class="arrow-up">↑ 82%</strong>`;

    // ========================================================================
    // 3. RESIDENTIAL CITIZEN TABS (1–5)
    // ========================================================================
    updateCitizenTabs(metrics);

    // 4. Re-render SVG Map Layer
    renderSvgOverlays();
  }

  function updateCitizenTabs(metrics) {
    // Citizen Tab 1: Safety Dashboard
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

    // Citizen Tab 2: Threat Radar
    const locPill = document.getElementById('citLocPillText');
    const citWind = document.getElementById('citizenWindText');
    if (locPill) {
      locPill.innerHTML = `<span class="pin-icon">📍</span> Your Sector: <strong>${metrics.curComm.name}</strong>`;
    }
    if (citWind) {
      citWind.textContent = `${metrics.windSpeed.toFixed(1)} km/h @ ${metrics.windDir}° ${getCompassSector(metrics.windDir)}`;
    }

    // Citizen Tab 3: Water & Health Advisory
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

    // Citizen Tab 4: Neighborhood Simulator
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

    // Citizen Tab 5: Broadcast Feed
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

    // 2. Sub-Tab Bar Buttons (for Citizen Window)
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

        // Automatically open warning modal for citizens
        openCitizenWarningModal();
      } else {
        showToast('Incident resolved. Telemetry returned to baseline parameters.', 'safe');
      }

      updateAllUI();
    });

    // 4. Factory Configuration Inputs
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

    // 5. Factory AI Playbook Execution
    document.getElementById('btnExecutePlaybook')?.addEventListener('click', () => {
      appState.playbook.isExecuted = !appState.playbook.isExecuted;
      
      const checkDerate = document.getElementById('checkDerateBoiler');
      const checkDivert = document.getElementById('checkDivertEffluent');
      const checkWarn = document.getElementById('checkDispatchWarning');
      const checkInspect = document.getElementById('checkEmergencyInspect');

      if (checkDerate) appState.playbook.derateBoiler = checkDerate.checked;
      if (checkDivert) appState.playbook.divertEffluent = checkDivert.checked;
      if (checkWarn) appState.playbook.dispatchWarning = checkWarn.checked;
      if (checkInspect) appState.playbook.emergencyInspect = checkInspect.checked;

      if (appState.playbook.isExecuted) {
        if (appState.playbook.divertEffluent) appState.factory.sluiceGate = 'CLOSED';
        playAlertBeep(520, 0.2, 'sine');
        setTimeout(() => playAlertBeep(659, 0.25, 'sine'), 120);
        showToast('AI Mitigation Playbook Executed: 40% de-rate applied & sluice locked.', 'safe');
      } else {
        showToast('Playbook reset to baseline feed.', 'info');
      }

      updateAllUI();
    });

    // 6. Factory Map Controls
    document.getElementById('btnMapZoomIn')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.zoomIn();
    });

    document.getElementById('btnMapReset')?.addEventListener('click', () => {
      if (factoryMapInstance) factoryMapInstance.setView([28.58, 77.26], 13);
    });

    // 7. Factory What-If Scenario Sliders
    const sDir = document.getElementById('simSliderWindDir');
    const sSpeed = document.getElementById('simSliderWindSpeed');
    const sEm = document.getElementById('simSliderEmission');

    function onSimInputChange() {
      appState.simulation.isActive = true;
      if (sDir) appState.simulation.windDirection = parseInt(sDir.value, 10);
      if (sSpeed) appState.simulation.windSpeed = parseFloat(sSpeed.value);
      if (sEm) appState.simulation.emission = parseInt(sEm.value, 10);
      updateAllUI();
    }

    sDir?.addEventListener('input', onSimInputChange);
    sSpeed?.addEventListener('input', onSimInputChange);
    sEm?.addEventListener('input', onSimInputChange);

    document.getElementById('btnRunSimulation')?.addEventListener('click', () => {
      appState.simulation.isActive = true;
      playAlertBeep(600, 0.15, 'triangle');
      showToast('What-If Scenario Simulation Projected.', 'info');
      updateAllUI();
    });

    // 8. Citizen Community Selector & Shelter Toggle
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
      showToast('Synced with live NASA POWER weather data.', 'info');
      updateAllUI();
    });

    // 10. Citizen Tab 5: Dispatch Test Push Alert
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

    // 11. Modal Buttons
    document.getElementById('btnCloseCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnAckCitizenModal')?.addEventListener('click', closeCitizenWarningModal);
    document.getElementById('btnSwitchToFactoryModal')?.addEventListener('click', () => {
      closeCitizenWarningModal();
      switchPersona('factory');
    });

    // Window resize event for responsive Leaflet map frames
    window.addEventListener('resize', () => {
      if (factoryMapInstance) factoryMapInstance.invalidateSize();
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
