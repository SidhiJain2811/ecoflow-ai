/**
 * EcoAI Flow — Core Application Logic (app.js)
 * Modular Architecture:
 * 1. State & Storage Layer
 * 2. Data Layer (Open-Meteo Live, NASA POWER, Simulated Plant Sensors)
 * 3. Risk Engine & 6-Hour Forecast
 * 4. Incident Automation State Machine & Autopilot
 * 5. Audio, Toasts & Browser Notifications
 * 6. SVG Map & Mathematical Point-in-Ellipse Evaluator
 * 7. Demo Scenario Controller
 * 8. UI Rendering & Event Controller
 * 9. PWA Service Worker Registration
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. STATE & STORAGE LAYER
     ========================================================================== */
  const DEFAULT_SETTINGS = {
    siteName: 'Monitored Facility',
    waterBodyName: 'Downstream Water Basin',
    waterDistanceKm: 2.4,
    latitude: 28.54,
    longitude: 77.30,
    lakeBearing: 138,
    population: 38000,
    weatherInterval: 60,
    aqiInterval: 300,
    sensorInterval: 2,
    threshCritical: 70,
    threshWarning: 35,
    unitSpeed: 'kmh', // 'kmh' | 'ms'
    unitTemp: 'c',    // 'c' | 'f'
    enableNotifications: false,
    enableSound: false,
    autopilotCountdown: 10,
    theme: 'dark'
  };

  function loadSettings() {
    try {
      const saved = localStorage.getItem('ecoai_flow_settings');
      return saved ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem('ecoai_flow_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  function loadIncidentLog() {
    try {
      const saved = localStorage.getItem('ecoai_flow_incident_log');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveIncidentLog(log) {
    try {
      localStorage.setItem('ecoai_flow_incident_log', JSON.stringify(log.slice(-100)));
    } catch (e) {
      console.warn('Log save failed:', e);
    }
  }

  const appState = {
    settings: loadSettings(),
    activeTab: 'tab-1',
    mode: 'live', // 'live' | 'demo'
    autopilotMode: 'assisted', // 'manual' | 'assisted' | 'auto'

    // Environmental Telemetry
    weather: {
      status: 'Offline', // 'Live' | 'Cached' | 'Offline'
      updated: '--:--',
      windSpeed: 19.4,
      windDirection: 138,
      temperature: 28.5,
      humidity: 58,
      hourlyForecast: [] // 6 hourly entries
    },

    airQuality: {
      status: 'Offline',
      updated: '--:--',
      pm25: 42,
      so2: 18
    },

    nasaPower: {
      status: 'Unavailable', // 'NASA POWER (latest available)' | 'Unavailable' | 'Cached'
      updated: '--:--',
      windSpeed: 18.9,
      windDirection: 135,
      temperature: 28.0,
      humidity: 60
    },

    // Simulated Plant Sensor Telemetry
    plant: {
      status: 'Simulated plant sensor',
      updated: '--:--',
      emission: 100, // % of normal (random walk)
      furnaceOutput: 100, // %
      effluentGate: 'Open', // 'Open' | 'Closed'
      isLeakTriggered: false
    },

    // What-If Simulation Overrides (when in Tab 5)
    simulation: {
      isActive: false,
      windSpeed: 19.4,
      windDirection: 138,
      emission: 100
    },

    // Replay State (Tab 2)
    replay: {
      step: 0, // 0 to 6
      isPlaying: false,
      intervalId: null
    },

    // Incident Automation State Machine
    incident: {
      state: 'Monitoring', // 'Monitoring' | 'Warning' | 'Critical' | 'Responding' | 'Recovering' | 'Resolved'
      activeId: null,
      startTime: null,
      peakRisk: 0,
      recoveryTimer: 0,
      actions: {
        reduceEmissions40: false,
        closeEffluentGate: false,
        alertDownstream: false
      },
      log: loadIncidentLog(),
      autopilotCountdownRemaining: null,
      autopilotCountdownTimer: null
    },

    // Demo Scenario Runner State
    demo: {
      isPlaying: false,
      secondsElapsed: 0,
      totalSeconds: 60,
      intervalId: null
    }
  };

  /* ==========================================================================
     2. AUDIO & NOTIFICATIONS LAYER
     ========================================================================== */
  let audioContext = null;

  function playAlertBeep(freq = 660, duration = 0.25, type = 'sine') {
    if (!appState.settings.enableSound) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);

      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error:', e);
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
      <button style="background:none; border:none; color:inherit; font-size:1.1rem; cursor:pointer; margin-left:auto;" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function triggerSystemNotification(title, body) {
    if (!appState.settings.enableNotifications) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: './icons/icon-192.png',
          tag: 'ecoai-flow-incident'
        });
      } catch (e) {
        console.warn('Notification API error:', e);
      }
    }
  }

  /* ==========================================================================
     3. RISK ENGINE & 6-HOUR FORECAST
     ========================================================================== */
  function angleDifference(a, b) {
    let diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  /**
   * Risk Formula (Demo model as specified):
   * alignment = max(0, 1 - angleDiff(windDirection, lakeBearing) / 45)
   * E = emission/100, times 0.6 if reduceEmissions40 is on
   * windFactor = min(1.15, 0.6 + windSpeed/48.5)
   * risk = min(100, 97 x alignment x E^1.25 x windFactor), times 0.85 if closeEffluentGate is on
   */
  function evaluateRiskModel(windSpeed, windDir, emission, red40, closeGate, bearing = appState.settings.lakeBearing) {
    const alignment = Math.max(0, 1 - angleDifference(windDir, bearing) / 45);
    let E = (emission / 100);
    if (red40) E *= 0.6;

    const windFactor = Math.min(1.15, 0.6 + windSpeed / 48.5);
    let rawRisk = Math.min(100, 97 * alignment * Math.pow(E, 1.25) * windFactor);
    if (closeGate) rawRisk *= 0.85;

    const score = Math.round(Math.min(100, Math.max(0, rawRisk)));

    let level = 'Low';
    let colorClass = 'low';
    let hexColor = '#10b981';

    if (score >= appState.settings.threshCritical) {
      level = 'Critical';
      colorClass = 'critical';
      hexColor = '#ef4444';
    } else if (score >= appState.settings.threshWarning) {
      level = 'Moderate';
      colorClass = 'moderate';
      hexColor = '#f59e0b';
    }

    const timeToLakeMin = Math.max(1, Math.round(10 * (19.4 / Math.max(1, windSpeed))));
    const plumeReachKm = (4.0 * windFactor * Math.sqrt(E)).toFixed(1);
    const residentsAtRisk = Math.round(appState.settings.population * (score / 97));

    return {
      score,
      level,
      colorClass,
      hexColor,
      alignment,
      E,
      windFactor,
      timeToLakeMin,
      plumeReachKm,
      residentsAtRisk
    };
  }

  function getEffectiveParams() {
    if (appState.activeTab === 'tab-5' && appState.simulation.isActive) {
      return {
        windSpeed: appState.simulation.windSpeed,
        windDirection: appState.simulation.windDirection,
        emission: appState.simulation.emission
      };
    }
    return {
      windSpeed: appState.weather.windSpeed,
      windDirection: appState.weather.windDirection,
      emission: appState.plant.emission
    };
  }

  function getActiveRisk() {
    const p = getEffectiveParams();
    return evaluateRiskModel(
      p.windSpeed,
      p.windDirection,
      p.emission,
      appState.incident.actions.reduceEmissions40,
      appState.incident.actions.closeEffluentGate
    );
  }

  function getBaselineRisk() {
    const p = getEffectiveParams();
    return evaluateRiskModel(
      p.windSpeed,
      p.windDirection,
      p.emission,
      false,
      false
    );
  }

  /* ==========================================================================
     4. DATA LAYER (Open-Meteo, NASA POWER, Simulated Sensors)
     ========================================================================== */
  function getFormattedTime() {
    const now = new Date();
    return now.toTimeString().substring(0, 5);
  }

  // 1. Open-Meteo Live Forecast API
  async function fetchLiveWeather() {
    if (appState.mode === 'demo') return;
    const lat = appState.settings.latitude;
    const lon = appState.settings.longitude;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&forecast_hours=6`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.current) {
        appState.weather.status = 'Live';
        appState.weather.updated = getFormattedTime();
        appState.weather.windSpeed = parseFloat(data.current.wind_speed_10m) || 19.4;
        appState.weather.windDirection = parseInt(data.current.wind_direction_10m, 10) || 138;
        appState.weather.temperature = parseFloat(data.current.temperature_2m) || 28.0;
        appState.weather.humidity = parseFloat(data.current.relative_humidity_2m) || 55;

        // Parse 6-hour hourly forecast
        if (data.hourly && data.hourly.wind_speed_10m) {
          appState.weather.hourlyForecast = [];
          for (let i = 0; i < Math.min(6, data.hourly.wind_speed_10m.length); i++) {
            const hSpeed = data.hourly.wind_speed_10m[i];
            const hDir = data.hourly.wind_direction_10m[i];
            const hRisk = evaluateRiskModel(hSpeed, hDir, appState.plant.emission, false, false);
            appState.weather.hourlyForecast.push({
              hour: `+${i + 1}h`,
              speed: hSpeed,
              dir: hDir,
              level: hRisk.level,
              colorClass: hRisk.colorClass
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Open-Meteo Weather] Fetch error:', err);
      if (appState.weather.status === 'Live') {
        appState.weather.status = 'Cached';
        showToast('Open-Meteo weather unreachable. Operating from cached data.', 'warning');
      } else if (appState.weather.status !== 'Cached') {
        appState.weather.status = 'Offline';
      }
    } finally {
      processIncidentTick();
      updateAllUI();
    }
  }

  // 2. Open-Meteo Air Quality API
  async function fetchLiveAQI() {
    if (appState.mode === 'demo') return;
    const lat = appState.settings.latitude;
    const lon = appState.settings.longitude;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,sulphur_dioxide`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.current) {
        appState.airQuality.status = 'Live';
        appState.airQuality.updated = getFormattedTime();
        appState.airQuality.pm25 = Math.round(data.current.pm2_5 || 42);
        appState.airQuality.so2 = Math.round(data.current.sulphur_dioxide || 18);
      }
    } catch (err) {
      console.warn('[Open-Meteo AQI] Fetch error:', err);
      appState.airQuality.status = appState.airQuality.status === 'Live' ? 'Cached' : 'Offline';
    } finally {
      updateAllUI();
    }
  }

  // 3. NASA POWER API (Hourly point data, honest latest available timestamp)
  async function fetchNasaPower() {
    if (appState.mode === 'demo') return;
    const lat = appState.settings.latitude;
    const lon = appState.settings.longitude;

    // Use current date / recent day formatted YYYYMMDD
    const d = new Date();
    d.setDate(d.getDate() - 3); // NASA POWER has standard latency
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const url = `https://power.larc.nasa.gov/api/temporal/hourly/point?parameters=WS10M,WD10M,T2M,RH2M&community=RE&longitude=${lon}&latitude=${lat}&format=JSON&start=${dateStr}&end=${dateStr}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.properties && json.properties.parameter) {
        const wsObj = json.properties.parameter.WS10M || {};
        const wdObj = json.properties.parameter.WD10M || {};
        const hours = Object.keys(wsObj);
        if (hours.length > 0) {
          const lastH = hours[hours.length - 1];
          appState.nasaPower.status = 'NASA POWER (latest available)';
          appState.nasaPower.updated = `${lastH.slice(0, 4)}-${lastH.slice(4, 6)}-${lastH.slice(6, 8)} ${lastH.slice(8, 10)}:00`;
          appState.nasaPower.windSpeed = Math.round((wsObj[lastH] * 3.6) * 10) / 10; // m/s to km/h
          appState.nasaPower.windDirection = Math.round(wdObj[lastH]);
        }
      }
    } catch (err) {
      // Browser blocked, CORS, or unavailable
      appState.nasaPower.status = 'Unavailable';
    } finally {
      updateAllUI();
    }
  }

  // 4. Simulated Plant Sensors (Updates every 2s)
  function updateSimulatedPlantSensors() {
    if (appState.mode === 'demo') return;

    appState.plant.updated = getFormattedTime();

    if (!appState.plant.isLeakTriggered) {
      // Natural random walk around 100% (+/- 3%)
      const delta = (Math.random() - 0.5) * 6;
      appState.plant.emission = Math.min(115, Math.max(88, Math.round(appState.plant.emission + delta)));
    }

    // Effect of active actions on simulated plant
    if (appState.incident.actions.reduceEmissions40) {
      appState.plant.furnaceOutput = 60;
    } else {
      appState.plant.furnaceOutput = appState.plant.isLeakTriggered ? 100 : 95;
    }

    if (appState.incident.actions.closeEffluentGate) {
      appState.plant.effluentGate = 'Closed';
    } else {
      appState.plant.effluentGate = 'Open';
    }

    processIncidentTick();
    updateAllUI();
  }

  /* ==========================================================================
     5. INCIDENT AUTOMATION STATE MACHINE & AUTOPILOT
     ========================================================================== */
  function logIncidentEvent(text, level = 'info') {
    const entry = {
      timestamp: getFormattedTime(),
      text,
      level
    };
    appState.incident.log.unshift(entry);
    saveIncidentLog(appState.incident.log);
  }

  function openNewIncident() {
    const incId = 'INC-' + Math.floor(1000 + Math.random() * 9000);
    appState.incident.activeId = incId;
    appState.incident.startTime = getFormattedTime();
    appState.incident.peakRisk = getActiveRisk().score;
    logIncidentEvent(`Active incident opened [${incId}] at ${appState.incident.startTime}. Initial risk score: ${appState.incident.peakRisk}`, 'critical');
    showToast(`High hazard detected! Incident ${incId} opened.`, 'danger');
    triggerSystemNotification('EcoAI Flow Alert: Critical Incident Opened', `Incident ${incId} triggered for ${appState.settings.waterBodyName} corridor.`);
    playAlertBeep(880, 0.4, 'sawtooth');
  }

  function startAutopilotCountdown() {
    if (appState.incident.autopilotCountdownTimer) return;
    appState.incident.autopilotCountdownRemaining = appState.settings.autopilotCountdown;

    logIncidentEvent(`Autopilot (Auto mode) initiated ${appState.settings.autopilotCountdown}s safety countdown before auto-dispatch.`, 'warning');
    showToast(`Autopilot: applying mitigation in ${appState.settings.autopilotCountdown}s...`, 'warning');

    appState.incident.autopilotCountdownTimer = setInterval(() => {
      appState.incident.autopilotCountdownRemaining--;
      if (appState.incident.autopilotCountdownRemaining <= 0) {
        clearInterval(appState.incident.autopilotCountdownTimer);
        appState.incident.autopilotCountdownTimer = null;
        appState.incident.autopilotCountdownRemaining = null;

        // Auto apply actions in sequence
        applyAction('reduceEmissions40', true);
        applyAction('closeEffluentGate', true);
        applyAction('alertDownstream', true);
        logIncidentEvent('Autopilot executed all 3 containment protocols automatically.', 'success');
        showToast('Autopilot: All mitigation actions applied.', 'success');
        playAlertBeep(520, 0.3, 'sine');
      }
      updateAllUI();
    }, 1000);
  }

  function cancelAutopilotCountdown() {
    if (appState.incident.autopilotCountdownTimer) {
      clearInterval(appState.incident.autopilotCountdownTimer);
      appState.incident.autopilotCountdownTimer = null;
      appState.incident.autopilotCountdownRemaining = null;
      logIncidentEvent('Operator manually cancelled the Autopilot countdown sequence.', 'warning');
      showToast('Autopilot sequence cancelled by operator.', 'info');
      updateAllUI();
    }
  }

  function applyAction(actionKey, isAuto = false) {
    if (appState.incident.actions[actionKey]) return; // already active
    appState.incident.actions[actionKey] = true;

    const actionNames = {
      reduceEmissions40: 'Reduce factory emissions by 40%',
      closeEffluentGate: 'Close the effluent gate',
      alertDownstream: 'Alert downstream communities'
    };

    const method = isAuto ? 'Autopilot auto-applied' : 'Operator approved';
    logIncidentEvent(`${method}: [${actionNames[actionKey]}]. Simulated telemetry updated.`, 'info');
    showToast(`${actionNames[actionKey]} activated.`, 'success');
    playAlertBeep(440, 0.15, 'sine');

    if (appState.incident.state === 'Critical' || appState.incident.state === 'Warning') {
      appState.incident.state = 'Responding';
    }
    updateAllUI();
  }

  function resetIncidentState() {
    appState.incident.state = 'Monitoring';
    appState.incident.activeId = null;
    appState.incident.startTime = null;
    appState.incident.peakRisk = 0;
    appState.incident.recoveryTimer = 0;
    appState.incident.actions.reduceEmissions40 = false;
    appState.incident.actions.closeEffluentGate = false;
    appState.incident.actions.alertDownstream = false;
    cancelAutopilotCountdown();
    logIncidentEvent('Incident resolved. Returning to baseline environmental monitoring.', 'success');
    showToast('Incident fully resolved.', 'success');
    updateAllUI();
  }

  // Periodic State Machine Evaluator
  function processIncidentTick() {
    const curRisk = getActiveRisk();

    // Track peak risk
    if (curRisk.score > appState.incident.peakRisk) {
      appState.incident.peakRisk = curRisk.score;
    }

    const anyActionActive = appState.incident.actions.reduceEmissions40 ||
                            appState.incident.actions.closeEffluentGate ||
                            appState.incident.actions.alertDownstream;

    // Transition State Machine
    if (curRisk.score >= appState.settings.threshCritical) {
      if (appState.incident.state === 'Monitoring' || appState.incident.state === 'Warning') {
        appState.incident.state = 'Critical';
        openNewIncident();
        if (appState.autopilotMode === 'auto') {
          startAutopilotCountdown();
        }
      } else if (anyActionActive) {
        appState.incident.state = 'Responding';
      }
    } else if (curRisk.score >= appState.settings.threshWarning) {
      if (appState.incident.state === 'Monitoring') {
        appState.incident.state = 'Warning';
        logIncidentEvent(`Risk increased to Warning (${curRisk.score}/100).`, 'warning');
      } else if (anyActionActive) {
        appState.incident.state = 'Responding';
      }
    } else {
      // Risk is below 35 (Low)
      if (appState.incident.state === 'Responding' || appState.incident.state === 'Critical' || appState.incident.state === 'Warning') {
        appState.incident.state = 'Recovering';
        appState.incident.recoveryTimer = 120; // 2 minutes countdown to resolution
        logIncidentEvent('Risk fell below 35. Entered 2-minute recovery surveillance window.', 'info');
      } else if (appState.incident.state === 'Recovering') {
        if (appState.incident.recoveryTimer > 0) {
          appState.incident.recoveryTimer -= 2;
        } else {
          resetIncidentState();
        }
      }
    }
  }

  /* ==========================================================================
     6. DEMO SCENARIO CONTROLLER (Scripted 60-Second Hackathon Judge Flow)
     ========================================================================== */
  function startDemoScenario() {
    appState.mode = 'demo';
    appState.demo.isPlaying = true;
    appState.demo.secondsElapsed = 0;
    resetIncidentState();

    logIncidentEvent('Demo Scenario initiated: starting 60s scripted incident evaluation.', 'info');
    showToast('Demo scenario started (60-second judge simulation).', 'info');

    if (appState.demo.intervalId) clearInterval(appState.demo.intervalId);

    appState.demo.intervalId = setInterval(() => {
      appState.demo.secondsElapsed++;
      const s = appState.demo.secondsElapsed;

      // Scripted Stages:
      if (s >= 0 && s < 10) {
        // Stage 1: Calm monitoring
        appState.weather.windSpeed = 12.0;
        appState.weather.windDirection = 80; // away from lake
        appState.plant.emission = 100;
        appState.plant.isLeakTriggered = false;
      } else if (s >= 10 && s < 25) {
        // Stage 2: Leak & adverse wind shift
        appState.weather.windSpeed = 22.4;
        appState.weather.windDirection = 138; // direct vector to lake
        appState.plant.emission = 150;
        appState.plant.isLeakTriggered = true;
      } else if (s >= 25 && s < 45) {
        // Stage 3: Auto/Assisted action intervention
        if (s === 26 && !appState.incident.actions.reduceEmissions40) {
          applyAction('reduceEmissions40', true);
        }
        if (s === 32 && !appState.incident.actions.closeEffluentGate) {
          applyAction('closeEffluentGate', true);
        }
        if (s === 38 && !appState.incident.actions.alertDownstream) {
          applyAction('alertDownstream', true);
        }
      } else if (s >= 45 && s < 60) {
        // Stage 4: Dispersion clearance & recovery
        appState.plant.emission = 70;
        appState.weather.windSpeed = 16.0;
      } else if (s >= 60) {
        // Finished
        clearInterval(appState.demo.intervalId);
        appState.demo.intervalId = null;
        appState.demo.isPlaying = false;
        appState.mode = 'live';
        showToast('Demo scenario finished. Returning to live monitoring.', 'success');
      }

      processIncidentTick();
      updateAllUI();
    }, 1000);
  }

  function stopDemoScenario() {
    if (appState.demo.intervalId) {
      clearInterval(appState.demo.intervalId);
      appState.demo.intervalId = null;
    }
    appState.demo.isPlaying = false;
    appState.mode = 'live';
    resetIncidentState();
    updateAllUI();
  }

  /* ==========================================================================
     7. MATHEMATICAL POINT-IN-ELLIPSE EVALUATION (Map Tab 2)
     ========================================================================== */
  function isPointInRotatedEllipse(px, py, cx, cy, rx, ry, angleDeg) {
    const rad = angleDeg * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = px - cx;
    const dy = py - cy;

    // Transform point to unrotated ellipse local coordinates
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;

    return (Math.pow(localX / rx, 2) + Math.pow(localY / ry, 2)) <= 1.0;
  }

  /* ==========================================================================
     8. UI RENDERING & COMPONENT SYNCHRONIZATION
     ========================================================================== */
  function updateAllUI() {
    const activeRisk = getActiveRisk();
    const baseRisk = getBaselineRisk();
    const effectiveParams = getEffectiveParams();
    const curStepData = [
      { label: 'NOW',   mult: 0.50, pm: 285, doNow: 'Halt venting and lock effluent weir gates' },
      { label: '+10m',  mult: 0.75, pm: 240, doNow: 'Issue immediate shelter-in-place for Community A' },
      { label: '+30m',  mult: 0.95, pm: 195, doNow: 'Alert intake gates and the river authority' },
      { label: '+1h',   mult: 1.10, pm: 160, doNow: 'Deploy mobile air filtration and warn agricultural users' },
      { label: '+2h',   mult: 1.20, pm: 130, doNow: 'Notify the wetland authority and start water sampling' },
      { label: '+3h',   mult: 1.30, pm: 105, doNow: 'Inspect secondary containment barriers and test water pH' },
      { label: '+6h',   mult: 1.40, pm: 75,  doNow: 'Verify safe intake reactivation thresholds' }
    ][appState.replay.step];

    // 1. Header Badges & Risk Status
    updateHeaderStatus(activeRisk);

    // 2. Incident Flow Pipeline
    updateFlowPipeline(activeRisk);

    // 3. Autopilot Banner & Countdown
    updateAutopilotBanner();

    // 4. Demo Banner
    updateDemoBanner();

    // 5. Left Side Panel
    updateSidePanel(activeRisk, effectiveParams);

    // 6. Active Tab Updates
    updateDashboardTab(activeRisk, baseRisk);
    updateMapTab(activeRisk, effectiveParams, curStepData);
    updateWhyRiskTab(activeRisk, effectiveParams);
    updateAIActionTab(activeRisk);
    updateSimulatorTab(activeRisk);
    updatePollutionJourneyTab(activeRisk, effectiveParams);
    updateBeforeAfterTab(activeRisk, baseRisk);
  }

  function updateHeaderStatus(activeRisk) {
    const riskPill = document.getElementById('headerRiskPill');
    const riskLevel = document.getElementById('headerRiskLevel');
    const riskScore = document.getElementById('headerRiskScore');
    if (riskPill && riskLevel && riskScore) {
      riskPill.className = `risk-pill ${activeRisk.colorClass}`;
      riskLevel.textContent = activeRisk.level;
      riskScore.textContent = `${activeRisk.score}/100`;
    }

    // Source Badges with Honest Statuses
    updateSourceBadge('badgeWeather', 'dotWeather', 'textWeather', appState.weather.status, `Updated ${appState.weather.updated}`);
    updateSourceBadge('badgeAqi', 'dotAqi', 'textAqi', appState.airQuality.status, `AQI ${appState.airQuality.pm25} µg/m³`);
    updateSourceBadge('badgeNasa', 'dotNasa', 'textNasa', appState.nasaPower.status, appState.nasaPower.status === 'Unavailable' ? 'Unavailable' : appState.nasaPower.updated);
    updateSourceBadge('badgePlant', 'dotPlant', 'textPlant', 'Simulated', `Emission ${appState.plant.emission}%`);

    // Autopilot 3-way toggle buttons
    document.querySelectorAll('.seg-auto').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === appState.autopilotMode);
      if (btn.dataset.mode === 'auto' && btn.dataset.mode === appState.autopilotMode) {
        btn.classList.add('auto-active');
      } else {
        btn.classList.remove('auto-active');
      }
    });

    // Live vs Demo toggle button
    const modeBtn = document.getElementById('btnToggleMode');
    if (modeBtn) {
      modeBtn.textContent = appState.mode === 'live' ? 'Live mode' : 'Demo scenario (active)';
      modeBtn.className = appState.mode === 'live' ? 'btn btn-ghost' : 'btn btn-teal';
    }
  }

  function updateSourceBadge(badgeId, dotId, textId, status, label) {
    const dot = document.getElementById(dotId);
    const txt = document.getElementById(textId);
    if (!dot || !txt) return;

    txt.textContent = label;
    dot.className = 'status-dot';
    if (status.includes('Live')) dot.classList.add('live');
    else if (status.includes('Simulated')) dot.classList.add('simulated');
    else if (status.includes('Cached')) dot.classList.add('cached');
    else dot.classList.add('offline');
  }

  function updateFlowPipeline(activeRisk) {
    const stepPollution = document.getElementById('stepPollution');
    const stepWind = document.getElementById('stepWind');
    const stepWater = document.getElementById('stepWater');
    const stepPredict = document.getElementById('stepPredict');
    const stepRecommend = document.getElementById('stepRecommend');
    const stepMitigated = document.getElementById('stepMitigated');

    const anyAction = appState.incident.actions.reduceEmissions40 ||
                      appState.incident.actions.closeEffluentGate ||
                      appState.incident.actions.alertDownstream;

    if (stepPollution) stepPollution.className = appState.plant.emission > 110 ? 'pipeline-node active-hazard' : 'pipeline-node active-neutral';
    if (stepWind) stepWind.className = activeRisk.alignment > 0.4 ? 'pipeline-node active-hazard' : 'pipeline-node active-neutral';
    if (stepWater) stepWater.className = activeRisk.score >= 35 ? 'pipeline-node active-hazard' : 'pipeline-node active-success';
    if (stepPredict) stepPredict.className = 'pipeline-node active-neutral';
    if (stepRecommend) stepRecommend.className = 'pipeline-node active-neutral';
    if (stepMitigated) stepMitigated.className = anyAction ? 'pipeline-node active-success' : 'pipeline-node';
  }

  function updateAutopilotBanner() {
    const banner = document.getElementById('autopilotBanner');
    const countText = document.getElementById('apCountdownText');
    const fill = document.getElementById('apCountdownFill');
    if (!banner || !countText || !fill) return;

    if (appState.incident.autopilotCountdownTimer && appState.incident.autopilotCountdownRemaining !== null) {
      banner.classList.add('visible');
      countText.textContent = `${appState.incident.autopilotCountdownRemaining}s`;
      const pct = (appState.incident.autopilotCountdownRemaining / appState.settings.autopilotCountdown) * 100;
      fill.style.width = `${pct}%`;
    } else {
      banner.classList.remove('visible');
    }
  }

  function updateDemoBanner() {
    const banner = document.getElementById('demoBanner');
    const fill = document.getElementById('demoProgressFill');
    const label = document.getElementById('demoProgressText');
    if (!banner || !fill || !label) return;

    if (appState.mode === 'demo') {
      banner.classList.add('visible');
      const pct = Math.min(100, (appState.demo.secondsElapsed / appState.demo.totalSeconds) * 100);
      fill.style.width = `${pct}%`;
      label.textContent = `Demo running: ${appState.demo.secondsElapsed}s / ${appState.demo.totalSeconds}s (Stage: ${getDemoStageName(appState.demo.secondsElapsed)})`;
    } else {
      banner.classList.remove('visible');
    }
  }

  function getDemoStageName(s) {
    if (s < 10) return '1. Baseline monitoring';
    if (s < 25) return '2. Simulated industrial breach';
    if (s < 45) return '3. Autonomous mitigation dispatch';
    return '4. Plume dispersion & recovery';
  }

  function updateSidePanel(activeRisk, p) {
    // Site info
    const siteTitle = document.getElementById('sideSiteTitle');
    const siteCoords = document.getElementById('sideSiteCoords');
    const topWaterSub = document.getElementById('topWaterBodySubtitle');
    if (siteTitle) siteTitle.textContent = appState.settings.siteName;
    if (siteCoords) siteCoords.textContent = `${appState.settings.latitude}° N, ${appState.settings.longitude}° E`;
    if (topWaterSub) topWaterSub.textContent = `${appState.settings.waterBodyName} Drainage Corridor`;

    // Factory Details
    const emissionVal = document.getElementById('sideEmissionVal');
    const furnaceVal = document.getElementById('sideFurnaceVal');
    const gateVal = document.getElementById('sideGateVal');
    const sideWater = document.getElementById('sideWaterDistance');
    if (emissionVal) emissionVal.textContent = `${appState.plant.emission}%`;
    if (furnaceVal) furnaceVal.textContent = `${appState.plant.furnaceOutput}%`;
    if (gateVal) {
      gateVal.textContent = appState.plant.effluentGate;
      gateVal.style.color = appState.plant.effluentGate === 'Closed' ? 'var(--safe-green)' : 'var(--danger-red)';
    }
    if (sideWater) {
      sideWater.textContent = `${appState.settings.waterBodyName} (${appState.settings.waterDistanceKm} km)`;
    }

    // Atmospheric Vector
    const windVal = document.getElementById('sideWindVal');
    const tempVal = document.getElementById('sideTempVal');
    const humVal = document.getElementById('sideHumVal');
    if (windVal) windVal.textContent = `${p.windSpeed.toFixed(1)} km/h @ ${p.windDirection}° (${getCompassSector(p.windDirection)})`;
    if (tempVal) tempVal.textContent = `${appState.weather.temperature.toFixed(1)}°C`;
    if (humVal) humVal.textContent = `${appState.weather.humidity}%`;

    // Vulnerability Label
    const vulnBadge = document.getElementById('sideVulnBadge');
    if (vulnBadge) {
      vulnBadge.className = `vuln-badge ${activeRisk.colorClass}`;
      vulnBadge.textContent = `[ ${activeRisk.level.toUpperCase()} RISK : ${activeRisk.score}/100 ]`;
    }

    // 6-Hour Forecast Chips
    const forecastGrid = document.getElementById('sideForecastGrid');
    if (forecastGrid && appState.weather.hourlyForecast.length > 0) {
      forecastGrid.innerHTML = appState.weather.hourlyForecast.map(f => `
        <div class="forecast-chip">
          <span class="f-hour">${f.hour}</span>
          <span class="f-level" style="color: ${f.level === 'Critical' ? 'var(--danger-red)' : f.level === 'Moderate' ? 'var(--caution-amber)' : 'var(--safe-green)'};">${f.level.slice(0, 3)}</span>
        </div>
      `).join('');
    }

    // Safety Protocol Ticks
    const proto1 = document.getElementById('protoStep1');
    const proto2 = document.getElementById('protoStep2');
    const proto3 = document.getElementById('protoStep3');
    if (proto1) proto1.classList.toggle('ticked', appState.incident.actions.reduceEmissions40);
    if (proto2) proto2.classList.toggle('ticked', appState.incident.actions.closeEffluentGate);
    if (proto3) proto3.classList.toggle('ticked', appState.incident.actions.alertDownstream);
  }

  function updateDashboardTab(activeRisk, baseRisk) {
    const hero = document.getElementById('dashHeroSentence');
    if (hero) {
      const waterName = appState.settings.waterBodyName || 'water basin';
      if (activeRisk.score >= 70) {
        hero.textContent = `The ${waterName} can be hit in about ${activeRisk.timeToLakeMin} min. Risk is Critical. ${appState.autopilotMode === 'auto' ? 'Autopilot armed for auto-mitigation.' : 'Act now to bring it down.'}`;
      } else if (activeRisk.score >= 35) {
        hero.textContent = `Risk reduced to Moderate (${activeRisk.score}/100). Exposure at ${waterName} curtailed; downwind buffer monitoring active.`;
      } else {
        hero.textContent = `Risk is Low (${activeRisk.score}/100). Aquatic thresholds preserved within legal environmental buffer.`;
      }
    }

    // Incident Status Box
    const incId = document.getElementById('dashIncId');
    const incTimer = document.getElementById('dashIncTimer');
    const incState = document.getElementById('dashIncState');
    if (incId) incId.textContent = appState.incident.activeId ? `Active ID: ${appState.incident.activeId}` : 'No active critical breach';
    if (incTimer) incTimer.textContent = appState.incident.startTime ? `Started: ${appState.incident.startTime}` : 'State: Normal';
    if (incState) {
      incState.textContent = appState.incident.state;
      incState.className = `stat-num ${activeRisk.colorClass}`;
    }

    // Number Cards
    const timeCard = document.getElementById('dashTimeToLake');
    const resCard = document.getElementById('dashResidents');
    const reachCard = document.getElementById('dashPlumeReach');
    if (timeCard) timeCard.textContent = `${activeRisk.timeToLakeMin} min`;
    if (resCard) resCard.textContent = activeRisk.residentsAtRisk.toLocaleString();
    if (reachCard) reachCard.textContent = `${activeRisk.plumeReachKm} km`;

    // Risk Ladder Markers
    const pinWithout = document.getElementById('dashPinWithout');
    const tagWithout = document.getElementById('dashTagWithout');
    const pinAfter = document.getElementById('dashPinAfter');
    const tagAfter = document.getElementById('dashTagAfter');
    if (pinWithout && tagWithout) {
      pinWithout.style.left = `${baseRisk.score}%`;
      tagWithout.textContent = `Without action: ${baseRisk.score}`;
    }
    if (pinAfter && tagAfter) {
      pinAfter.style.left = `${activeRisk.score}%`;
      tagAfter.textContent = `After action: ${activeRisk.score}`;
    }
  }

  function updateMapTab(activeRisk, p, curStep) {
    const stepLabel = document.getElementById('replayStepDisplay');
    const slider = document.getElementById('replaySlider');
    if (stepLabel) stepLabel.textContent = curStep.label;
    if (slider) slider.value = appState.replay.step;

    // Rotate Compass Needle
    const needle = document.getElementById('compassNeedle');
    const compassText = document.getElementById('compassText');
    if (needle) needle.setAttribute('transform', `rotate(${p.windDirection})`);
    if (compassText) compassText.textContent = `${p.windDirection}° ${getCompassSector(p.windDirection)}`;

    // Scale Plume according to wind, emission, step multiplier, actions
    const plumeContainer = document.getElementById('plumeRotator');
    if (plumeContainer) {
      const rotAngle = p.windDirection - 90;
      plumeContainer.setAttribute('transform', `rotate(${rotAngle}, 110, 100)`);
    }

    const mult = curStep.mult;
    const emScale = (p.emission / 100) * (appState.incident.actions.reduceEmissions40 ? 0.75 : 1.0);
    const speedScale = Math.pow(p.windSpeed / 19.4, 0.4);

    const lenA = 70 * mult * emScale * speedScale;
    const widA = 28 * mult * emScale / Math.pow(speedScale, 0.3);

    const lenB = 150 * mult * emScale * speedScale;
    const widB = 45 * mult * emScale / Math.pow(speedScale, 0.3);

    const lenC = 250 * mult * emScale * speedScale;
    const widC = 68 * mult * emScale / Math.pow(speedScale, 0.3);

    const elRed = document.getElementById('svgPlumeRed');
    const elOrange = document.getElementById('svgPlumeOrange');
    const elYellow = document.getElementById('svgPlumeYellow');

    if (elRed) {
      elRed.setAttribute('cx', 110 + lenA * 0.55);
      elRed.setAttribute('rx', Math.max(15, lenA * 0.55));
      elRed.setAttribute('ry', Math.max(8, widA));
    }
    if (elOrange) {
      elOrange.setAttribute('cx', 110 + lenB * 0.55);
      elOrange.setAttribute('rx', Math.max(25, lenB * 0.55));
      elOrange.setAttribute('ry', Math.max(12, widB));
    }
    if (elYellow) {
      elYellow.setAttribute('cx', 110 + lenC * 0.55);
      elYellow.setAttribute('rx', Math.max(35, lenC * 0.55));
      elYellow.setAttribute('ry', Math.max(16, widC));
    }

    // Mathematical point-in-ellipse testing for Communities A-D
    const rad = (p.windDirection - 90) * (Math.PI / 180);
    const rot = p.windDirection - 90;

    const cRedX = 110 + Math.cos(rad) * (lenA * 0.55);
    const cRedY = 100 + Math.sin(rad) * (lenA * 0.55);

    const cOrangeX = 110 + Math.cos(rad) * (lenB * 0.55);
    const cOrangeY = 100 + Math.sin(rad) * (lenB * 0.55);

    const cYellowX = 110 + Math.cos(rad) * (lenC * 0.55);
    const cYellowY = 100 + Math.sin(rad) * (lenC * 0.55);

    const comms = [
      { id: 'A', x: 190, y: 180, circleId: 'commCircleA', chipId: 'chipCommA' },
      { id: 'B', x: 285, y: 275, circleId: 'commCircleB', chipId: 'chipCommB' },
      { id: 'C', x: 420, y: 370, circleId: 'commCircleC', chipId: 'chipCommC' },
      { id: 'D', x: 300, y: 110, circleId: 'commCircleD', chipId: 'chipCommD' }
    ];

    comms.forEach(c => {
      const inRed = isPointInRotatedEllipse(c.x, c.y, cRedX, cRedY, Math.max(15, lenA * 0.55), Math.max(8, widA), rot);
      const inOrange = isPointInRotatedEllipse(c.x, c.y, cOrangeX, cOrangeY, Math.max(25, lenB * 0.55), Math.max(12, widB), rot);
      const inYellow = isPointInRotatedEllipse(c.x, c.y, cYellowX, cYellowY, Math.max(35, lenC * 0.55), Math.max(16, widC), rot);

      let color = 'var(--safe-green)';
      let label = 'Safe';
      if (inRed) {
        color = 'var(--danger-red)';
        label = 'Red zone (Evacuate)';
      } else if (inOrange || inYellow) {
        color = 'var(--caution-amber)';
        label = 'Caution zone';
      }

      const circ = document.getElementById(c.circleId);
      const ch = document.getElementById(c.chipId);
      if (circ) circ.setAttribute('fill', color);
      if (ch) ch.innerHTML = `<span class="chip-circle" style="background:${color};"></span>Community ${c.id}: ${label}`;
    });

    // Water Contamination Rules
    const isLakeAffected = (appState.replay.step >= 1) && (activeRisk.score >= 15);
    const isRiverAffected = (appState.replay.step >= 2) && (activeRisk.score >= 35);
    const isWetlandAffected = (appState.replay.step >= 4) && (activeRisk.score >= 55);

    const svgLake = document.getElementById('svgLakeShape');
    const svgLakeLabel = document.getElementById('svgWaterBodyLabel');
    const svgFacLabel = document.getElementById('svgFactoryLabel');
    const breachGroup = document.getElementById('breachGroup');
    const chipLake = document.getElementById('chipLake');
    if (svgLakeLabel) svgLakeLabel.textContent = appState.settings.waterBodyName;
    if (svgFacLabel) svgFacLabel.textContent = appState.settings.siteName;
    if (svgLake) svgLake.setAttribute('fill', isLakeAffected ? '#991b1b' : 'url(#lakeWaterGrad)');
    if (breachGroup) breachGroup.style.display = isLakeAffected ? 'block' : 'none';
    if (chipLake) chipLake.innerHTML = `<span class="chip-circle" style="background:${isLakeAffected ? 'var(--danger-red)' : 'var(--water-teal)'};"></span>${escapeHtml(appState.settings.waterBodyName)}: ${isLakeAffected ? 'Critical breach' : 'Clean'}`;

    const svgRiver = document.getElementById('svgRiverPath');
    const chipRiver = document.getElementById('chipRiver');
    if (svgRiver) svgRiver.setAttribute('stroke', isRiverAffected ? '#dc2626' : '#0f766e');
    if (chipRiver) chipRiver.innerHTML = `<span class="chip-circle" style="background:${isRiverAffected ? 'var(--danger-red)' : 'var(--water-teal)'};"></span>River: ${isRiverAffected ? 'Contaminated' : 'Clean'}`;

    const svgWetland = document.getElementById('svgWetlandShape');
    const chipWetland = document.getElementById('chipWetland');
    if (svgWetland) {
      svgWetland.setAttribute('fill', isWetlandAffected ? 'rgba(220, 38, 38, 0.7)' : 'rgba(15, 118, 110, 0.6)');
      svgWetland.setAttribute('stroke', isWetlandAffected ? '#ef4444' : '#14b8a6');
    }
    if (chipWetland) chipWetland.innerHTML = `<span class="chip-circle" style="background:${isWetlandAffected ? 'var(--danger-red)' : 'var(--water-teal)'};"></span>Wetland: ${isWetlandAffected ? 'Contaminated' : 'Clean'}`;

    // Step Time Card
    const waterCell = document.getElementById('tcWater');
    const pmCell = document.getElementById('tcPm');
    const resCell = document.getElementById('tcResidents');
    const doNowCell = document.getElementById('tcDoNow');

    const affected = [];
    if (isLakeAffected) affected.push(appState.settings.waterBodyName);
    if (isRiverAffected) affected.push('Outflow river');
    if (isWetlandAffected) affected.push('Wetlands');

    if (waterCell) {
      waterCell.textContent = affected.length > 0 ? affected.join(', ') : 'None (Safe)';
      waterCell.style.color = affected.length > 0 ? 'var(--danger-red)' : 'var(--safe-green)';
    }
    if (pmCell) {
      const pmVal = Math.round(curStep.pm * (p.emission / 100) * (appState.incident.actions.reduceEmissions40 ? 0.6 : 1.0));
      pmCell.textContent = `${pmVal} µg/m³`;
    }
    if (resCell) resCell.textContent = `${activeRisk.residentsAtRisk.toLocaleString()} people`;
    if (doNowCell) doNowCell.textContent = curStep.doNow;
  }

  function updateWhyRiskTab(activeRisk, p) {
    const whyTitle = document.getElementById('whyRiskTitle');
    if (whyTitle) {
      whyTitle.textContent = `Why is it ${activeRisk.level}?`;
      whyTitle.style.color = activeRisk.hexColor;
    }

    const eqWind = document.getElementById('eqWind');
    const eqEmission = document.getElementById('eqEmission');
    const eqResult = document.getElementById('eqResult');
    if (eqWind) eqWind.textContent = `Wind @ ${p.windDirection}° ${getCompassSector(p.windDirection)}`;
    if (eqEmission) eqEmission.textContent = `SO2 Emission: ${p.emission}%`;
    if (eqResult) {
      eqResult.textContent = `${appState.settings.waterBodyName} risk: ${activeRisk.level} (${activeRisk.score}/100)`;
      eqResult.style.color = activeRisk.hexColor;
    }

    const reason = document.getElementById('whyReasonSentence');
    if (reason) {
      const bName = escapeHtml(appState.settings.waterBodyName);
      const bDeg = appState.settings.lakeBearing;
      const bCompass = getCompassSector(bDeg);
      if (activeRisk.alignment > 0.8) {
        reason.textContent = `Live winds at ${p.windSpeed.toFixed(1)} km/h blow directly along the ${bDeg}° ${bCompass} water basin axis with high industrial emissions, placing drinking intake gates directly in the plume crosshairs.`;
      } else if (activeRisk.alignment > 0.25) {
        reason.textContent = `Winds blow at a glancing angle toward the ${bName} corridor; lateral plume spreading causes elevated caution along the perimeter.`;
      } else {
        reason.textContent = `Current winds blow away from ${bName} (${p.windDirection}°), dispersing emissions over the non-aquatic buffer.`;
      }
    }

    // Contribution bars
    const fillWind = document.getElementById('fillContribWind');
    const txtWind = document.getElementById('txtContribWind');
    if (fillWind && txtWind) {
      const pct = Math.round(activeRisk.alignment * 100);
      fillWind.style.width = `${pct}%`;
      txtWind.textContent = `${pct}%`;
    }

    const fillEm = document.getElementById('fillContribEmission');
    const txtEm = document.getElementById('txtContribEmission');
    if (fillEm && txtEm) {
      const pct = Math.min(100, Math.round((p.emission / 150) * 100));
      fillEm.style.width = `${pct}%`;
      txtEm.textContent = `${p.emission}%`;
    }

    // "What would lower the risk?" Computed Scores
    const sWind40 = document.getElementById('scoreWind40');
    const sEm40 = document.getElementById('scoreEm40');
    const sGate = document.getElementById('scoreGate');
    const sHalfWind = document.getElementById('scoreHalfWind');

    if (sWind40) sWind40.textContent = evaluateRiskModel(p.windSpeed, p.windDirection + 40, p.emission, appState.incident.actions.reduceEmissions40, appState.incident.actions.closeEffluentGate).score;
    if (sEm40) sEm40.textContent = evaluateRiskModel(p.windSpeed, p.windDirection, p.emission, true, appState.incident.actions.closeEffluentGate).score;
    if (sGate) sGate.textContent = evaluateRiskModel(p.windSpeed, p.windDirection, p.emission, appState.incident.actions.reduceEmissions40, true).score;
    if (sHalfWind) sHalfWind.textContent = evaluateRiskModel(p.windSpeed / 2, p.windDirection, p.emission, appState.incident.actions.reduceEmissions40, appState.incident.actions.closeEffluentGate).score;
  }

  function updateAIActionTab(activeRisk) {
    const curRiskReadout = document.getElementById('aiTabCurrentRisk');
    if (curRiskReadout) {
      curRiskReadout.textContent = `${activeRisk.score}/100 (${activeRisk.level})`;
      curRiskReadout.style.color = activeRisk.hexColor;
    }

    // Action cards
    updateActionCard('cardAct1', 'btnAct1', 'scoreAct1', appState.incident.actions.reduceEmissions40, 'reduceEmissions40');
    updateActionCard('cardAct2', 'btnAct2', 'scoreAct2', appState.incident.actions.closeEffluentGate, 'closeEffluentGate');
    updateActionCard('cardAct3', 'btnAct3', 'scoreAct3', appState.incident.actions.alertDownstream, 'alertDownstream');

    // Incident Log Table
    const logBox = document.getElementById('incidentLogContainer');
    if (logBox) {
      logBox.innerHTML = appState.incident.log.map(item => `
        <div class="log-entry">
          <span class="log-time">${item.timestamp}</span>
          <span style="color:${item.level === 'critical' ? 'var(--danger-red)' : item.level === 'warning' ? 'var(--caution-amber)' : item.level === 'success' ? 'var(--safe-green)' : 'var(--text-main)'};">${escapeHtml(item.text)}</span>
        </div>
      `).join('');
    }
  }

  function updateActionCard(cardId, btnId, scoreId, isActive, actionKey) {
    const card = document.getElementById(cardId);
    const btn = document.getElementById(btnId);
    const score = document.getElementById(scoreId);
    if (!card || !btn) return;

    card.style.borderColor = isActive ? 'var(--safe-green)' : 'var(--border-dim)';
    card.style.background = isActive ? 'var(--safe-bg)' : 'var(--bg-input)';
    btn.textContent = isActive ? 'Simulated Active ✓' : (appState.autopilotMode === 'assisted' ? 'Approve action' : 'Apply action');
    btn.className = isActive ? 'btn btn-teal' : 'btn btn-ghost';

    if (score && !isActive) {
      const p = getEffectiveParams();
      const hypothetical = Object.assign({}, appState.incident.actions, { [actionKey]: true });
      const predicted = evaluateRiskModel(p.windSpeed, p.windDirection, p.emission, hypothetical.reduceEmissions40, hypothetical.closeEffluentGate);
      score.textContent = `New risk if applied: ${predicted.score}/100`;
    } else if (score) {
      score.textContent = 'Command executed (Simulated)';
    }
  }

  function updateSimulatorTab(activeRisk) {
    const p = getEffectiveParams();
    const isSim = appState.simulation.isActive;

    const banner = document.getElementById('simActiveBanner');
    if (banner) banner.style.display = isSim ? 'block' : 'none';

    const rSpeed = document.getElementById('simRangeSpeed');
    const rDir = document.getElementById('simRangeDir');
    const rEm = document.getElementById('simRangeEmission');

    const vSpeed = document.getElementById('simValSpeed');
    const vDir = document.getElementById('simValDir');
    const vEm = document.getElementById('simValEmission');

    if (rSpeed) rSpeed.value = p.windSpeed;
    if (rDir) rDir.value = p.windDirection;
    if (rEm) rEm.value = p.emission;

    if (vSpeed) vSpeed.textContent = `${p.windSpeed.toFixed(1)} km/h`;
    if (vDir) vDir.textContent = `${p.windDirection}° ${getCompassSector(p.windDirection)}`;
    if (vEm) vEm.textContent = `${p.emission}%`;

    // Live result line
    const resReach = document.getElementById('simResReach');
    const resRisk = document.getElementById('simResRisk');
    const resTime = document.getElementById('simResTime');
    const resPop = document.getElementById('simResPop');

    if (resReach) resReach.textContent = `${activeRisk.plumeReachKm} km`;
    if (resRisk) {
      resRisk.textContent = `${activeRisk.score}/100 (${activeRisk.level})`;
      resRisk.style.color = activeRisk.hexColor;
    }
    if (resTime) resTime.textContent = `${activeRisk.timeToLakeMin} min`;
    if (resPop) resPop.textContent = `${activeRisk.residentsAtRisk.toLocaleString()}`;

    const riskLbl = document.getElementById('simWaterRiskLabel');
    if (riskLbl) riskLbl.textContent = `${appState.settings.waterBodyName} risk:`;

    // Update Simulator Map Compass
    const simNeedle = document.getElementById('simCompassNeedle');
    const simCompassTxt = document.getElementById('simCompassText');
    if (simNeedle) simNeedle.setAttribute('transform', `rotate(${p.windDirection})`);
    if (simCompassTxt) simCompassTxt.textContent = `${p.windDirection}° ${getCompassSector(p.windDirection)}`;

    // Rotate and scale plume for simulator
    const simPlume = document.getElementById('simPlumeRotator');
    if (simPlume) {
      const rotAngle = p.windDirection - 90;
      simPlume.setAttribute('transform', `rotate(${rotAngle}, 110, 100)`);
    }

    const emScale = Math.sqrt(p.emission / 100);
    const speedScale = Math.min(1.4, Math.max(0.7, p.windSpeed / 19.4));

    const sLenA = 80 * emScale * speedScale;
    const sWidA = 28 * emScale / Math.pow(speedScale, 0.3);

    const sLenB = 150 * emScale * speedScale;
    const sWidB = 45 * emScale / Math.pow(speedScale, 0.3);

    const sLenC = 250 * emScale * speedScale;
    const sWidC = 68 * emScale / Math.pow(speedScale, 0.3);

    const sRed = document.getElementById('svgSimPlumeRed');
    const sOrange = document.getElementById('svgSimPlumeOrange');
    const sYellow = document.getElementById('svgSimPlumeYellow');

    if (sRed) {
      sRed.setAttribute('cx', 110 + sLenA * 0.55);
      sRed.setAttribute('rx', Math.max(15, sLenA * 0.55));
      sRed.setAttribute('ry', Math.max(8, sWidA));
    }
    if (sOrange) {
      sOrange.setAttribute('cx', 110 + sLenB * 0.55);
      sOrange.setAttribute('rx', Math.max(25, sLenB * 0.55));
      sOrange.setAttribute('ry', Math.max(12, sWidB));
    }
    if (sYellow) {
      sYellow.setAttribute('cx', 110 + sLenC * 0.55);
      sYellow.setAttribute('rx', Math.max(35, sLenC * 0.55));
      sYellow.setAttribute('ry', Math.max(16, sWidC));
    }

    // Community point-in-ellipse testing under simulated conditions
    const sRad = (p.windDirection - 90) * (Math.PI / 180);
    const sRot = p.windDirection - 90;

    const scRedX = 110 + Math.cos(sRad) * (sLenA * 0.55);
    const scRedY = 100 + Math.sin(sRad) * (sLenA * 0.55);

    const scOrangeX = 110 + Math.cos(sRad) * (sLenB * 0.55);
    const scOrangeY = 100 + Math.sin(sRad) * (sLenB * 0.55);

    const scYellowX = 110 + Math.cos(sRad) * (sLenC * 0.55);
    const scYellowY = 100 + Math.sin(sRad) * (sLenC * 0.55);

    const simComms = [
      { id: 'A', x: 190, y: 180, circleId: 'commSimCircleA', chipId: 'chipSimCommA' },
      { id: 'B', x: 285, y: 275, circleId: 'commSimCircleB', chipId: 'chipSimCommB' },
      { id: 'C', x: 420, y: 370, circleId: 'commSimCircleC', chipId: 'chipSimCommC' },
      { id: 'D', x: 300, y: 110, circleId: 'commSimCircleD', chipId: 'chipSimCommD' }
    ];

    simComms.forEach(c => {
      const inRed = isPointInRotatedEllipse(c.x, c.y, scRedX, scRedY, Math.max(15, sLenA * 0.55), Math.max(8, sWidA), sRot);
      const inOrange = isPointInRotatedEllipse(c.x, c.y, scOrangeX, scOrangeY, Math.max(25, sLenB * 0.55), Math.max(12, sWidB), sRot);
      const inYellow = isPointInRotatedEllipse(c.x, c.y, scYellowX, scYellowY, Math.max(35, sLenC * 0.55), Math.max(16, sWidC), sRot);

      let color = 'var(--safe-green)';
      let label = 'Safer zone';
      if (inRed) {
        color = 'var(--danger-red)';
        label = 'High risk';
      } else if (inOrange || inYellow) {
        color = 'var(--caution-amber)';
        label = 'Caution zone';
      }

      const circ = document.getElementById(c.circleId);
      const ch = document.getElementById(c.chipId);
      if (circ) circ.setAttribute('fill', color);
      if (ch) ch.innerHTML = `<span class="chip-circle" style="background:${color};"></span>Community ${c.id}: ${label}`;
    });

    // Water Body impact in simulator
    const isSimLakeBreach = activeRisk.score >= 35;
    const simSvgLake = document.getElementById('svgSimLakeShape');
    const simBreach = document.getElementById('simBreachGroup');
    const simChipLake = document.getElementById('chipSimLake');
    const simSvgLakeLabel = document.getElementById('svgSimWaterBodyLabel');
    const simSvgFacLabel = document.getElementById('svgSimFactoryLabel');

    if (simSvgLakeLabel) simSvgLakeLabel.textContent = appState.settings.waterBodyName;
    if (simSvgFacLabel) simSvgFacLabel.textContent = appState.settings.siteName;

    if (simSvgLake) simSvgLake.setAttribute('fill', isSimLakeBreach ? '#991b1b' : 'url(#simLakeWaterGrad)');
    if (simBreach) simBreach.style.display = isSimLakeBreach ? 'block' : 'none';
    if (simChipLake) simChipLake.innerHTML = `<span class="chip-circle" style="background:${isSimLakeBreach ? 'var(--danger-red)' : 'var(--water-teal)'};"></span>${escapeHtml(appState.settings.waterBodyName)}: ${isSimLakeBreach ? 'Impinged (' + activeRisk.level + ')' : 'Clean'}`;
  }

  function updatePollutionJourneyTab(activeRisk, p) {
    const winLine = document.getElementById('journeyActionWindow');
    if (winLine) {
      winLine.textContent = `Action window: ${activeRisk.timeToLakeMin} minutes until plume impinges on ${appState.settings.waterBodyName}`;
    }

    const jTitle2 = document.getElementById('jStop2Title');
    if (jTitle2) {
      jTitle2.textContent = `2. ${appState.settings.waterBodyName} Perimeter (+${activeRisk.timeToLakeMin} min)`;
    }

    const tLake = activeRisk.timeToLakeMin;
    const tIntake = Math.round(20 * (19.4 / Math.max(1, p.windSpeed)));
    const tRiver = Math.round(30 * (19.4 / Math.max(1, p.windSpeed)));
    const tVillages = Math.round(60 * (19.4 / Math.max(1, p.windSpeed)));
    const tWetland = Math.round(120 * (19.4 / Math.max(1, p.windSpeed)));

    setJourneyStop('jStop1', 15, activeRisk.score, 'now');
    setJourneyStop('jStop2', 25, activeRisk.score, `+${tLake}m`);
    setJourneyStop('jStop3', 35, activeRisk.score, `+${tIntake}m`);
    setJourneyStop('jStop4', 45, activeRisk.score, `+${tRiver}m`);
    setJourneyStop('jStop5', 50, activeRisk.score, `+${tVillages}m`);
    setJourneyStop('jStop6', 55, activeRisk.score, `+${tWetland}m`);
  }

  function setJourneyStop(elementId, threshold, currentScore, timeLabel) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const atRisk = currentScore >= threshold;
    el.className = `journey-stop ${atRisk ? 'danger' : 'safe'}`;
    const timeEl = el.querySelector('.journey-time');
    if (timeEl) timeEl.textContent = timeLabel;
  }

  function updateBeforeAfterTab(activeRisk, baseRisk) {
    const bScore = document.getElementById('baBaseScore');
    const bLevel = document.getElementById('baBaseLevel');
    const bReach = document.getElementById('baBaseReach');

    const aScore = document.getElementById('baAfterScore');
    const aLevel = document.getElementById('baAfterLevel');
    const aReach = document.getElementById('baAfterReach');
    const aTitle = document.getElementById('baAfterTitle');

    if (bScore) {
      bScore.textContent = baseRisk.score;
      bScore.style.color = baseRisk.hexColor;
    }
    if (bLevel) {
      bLevel.textContent = baseRisk.level;
      bLevel.style.color = baseRisk.hexColor;
    }
    if (bReach) bReach.textContent = `${baseRisk.plumeReachKm} km`;

    if (aScore) {
      aScore.textContent = activeRisk.score;
      aScore.style.color = activeRisk.hexColor;
    }
    if (aLevel) {
      aLevel.textContent = activeRisk.level;
      aLevel.style.color = activeRisk.hexColor;
    }
    if (aReach) aReach.textContent = `${activeRisk.plumeReachKm} km`;

    if (aTitle) {
      const applied = [];
      if (appState.incident.actions.reduceEmissions40) applied.push('40% emission cut');
      if (appState.incident.actions.closeEffluentGate) applied.push('effluent gate closed');
      if (appState.incident.actions.alertDownstream) applied.push('community sirens');
      aTitle.textContent = applied.length > 0 ? `After ${applied.join(' & ')}` : 'Without actions applied';
    }

    const deltaTxt = document.getElementById('baDeltaSentence');
    if (deltaTxt) {
      const drop = baseRisk.score - activeRisk.score;
      if (drop > 0) {
        deltaTxt.textContent = `Acting now cuts predicted risk by ${drop} points, from ${baseRisk.level} (${baseRisk.score}/100) to ${activeRisk.level} (${activeRisk.score}/100).`;
      } else {
        deltaTxt.textContent = `No active mitigations applied yet. Predicted risk stands at ${baseRisk.level} (${baseRisk.score}/100).`;
      }
    }

    // Render 7-step comparison chart
    const chartContainer = document.getElementById('baChartBars');
    if (chartContainer) {
      const mults = [0.2, 0.6, 0.85, 1.0, 1.0, 0.8, 0.5];
      const labels = ['NOW', '+10m', '+30m', '+1h', '+2h', '+3h', '+6h'];
      chartContainer.innerHTML = labels.map((lbl, idx) => {
        const hBase = Math.round(baseRisk.score * mults[idx] * 1.2);
        const hAfter = Math.round(activeRisk.score * mults[idx] * 1.2);
        return `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:4px;">
            <div style="display:flex; align-items:flex-end; gap:3px; height:120px;">
              <div style="width:14px; height:${hBase}px; background:var(--danger-red); border-radius:3px 3px 0 0;" title="Without action: ${Math.round(baseRisk.score * mults[idx])}"></div>
              <div style="width:14px; height:${hAfter}px; background:var(--safe-green); border-radius:3px 3px 0 0;" title="After action: ${Math.round(activeRisk.score * mults[idx])}"></div>
            </div>
            <span style="font-size:0.72rem; color:var(--text-faint); font-weight:700;">${lbl}</span>
          </div>
        `;
      }).join('');
    }
  }

  function getCompassSector(deg) {
    if (deg >= 70 && deg < 110) return 'E';
    if (deg >= 110 && deg < 160) return 'SE';
    if (deg >= 160 && deg < 200) return 'S';
    if (deg >= 200 && deg < 240) return 'SW';
    return 'W';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  /* ==========================================================================
     9. MODALS, REPORT EXPORT & NOTIFICATIONS
     ========================================================================== */
  function openAlertModal() {
    const modal = document.getElementById('alertModalOverlay');
    const msgArea = document.getElementById('alertMessageText');
    if (!modal || !msgArea) return;

    const risk = getActiveRisk();
    const timeToLake = risk.timeToLakeMin;
    const areas = ['Community A', 'Community B', `${appState.settings.waterBodyName} Buffer`].join(', ');

    const message = `[CIVIL ADVISORY - ECOAI FLOW]
INCIDENT: Industrial Chemical Outfall & Plume Dispersion
EPICENTER: ${appState.settings.siteName}
SEVERITY: ${risk.level.toUpperCase()} (Risk Score: ${risk.score}/100)
TARGET BASIN: ${appState.settings.waterBodyName} (${appState.settings.waterDistanceKm} km downwind)
AFFECTED ZONES: ${areas}
ACTION WINDOW: Estimated ${timeToLake} minutes until plume impinges on water intake.
DIRECTIVE:
1. Stay indoors and close all windows/air intakes immediately.
2. Avoid using raw water drawn from the affected water corridor.
3. Prepare for localized municipal drinking water gate closures.
Generated automatically by EcoAI Flow Incident Autopilot.`;

    msgArea.value = message;
    modal.classList.add('open');
  }

  function closeAlertModal() {
    const modal = document.getElementById('alertModalOverlay');
    if (modal) modal.classList.remove('open');
  }

  function exportIncidentReport() {
    const curRisk = getActiveRisk();
    const baseRisk = getBaselineRisk();
    const now = new Date().toLocaleString();

    const reportContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EcoAI Flow Incident Report - ${appState.incident.activeId || 'LOG'}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #0f172a; }
    h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
    .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .critical { background: #fee2e2; color: #dc2626; }
    .moderate { background: #fef3c7; color: #d97706; }
    .safe { background: #d1fae5; color: #059669; }
  </style>
</head>
<body>
  <h1>EcoAI Flow Incident Response Report</h1>
  <p><strong>Incident ID:</strong> ${appState.incident.activeId || 'DEMO-EVAL'}</p>
  <p><strong>Generated At:</strong> ${now}</p>
  <p><strong>Target Water Body:</strong> ${appState.settings.waterBodyName} (${appState.settings.waterDistanceKm} km downwind, bearing ${appState.settings.lakeBearing}°)</p>
  <p><strong>Monitored Facility:</strong> ${appState.settings.siteName} (${appState.settings.latitude}° N, ${appState.settings.longitude}° E)</p>

  <h2>Risk Mitigation Summary</h2>
  <table>
    <tr><th>Condition</th><th>Score</th><th>Level</th><th>Plume Reach</th></tr>
    <tr><td>Without Action (Unabated)</td><td>${baseRisk.score}/100</td><td><span class="badge critical">${baseRisk.level}</span></td><td>${baseRisk.plumeReachKm} km</td></tr>
    <tr><td>With Applied Actions</td><td>${curRisk.score}/100</td><td><span class="badge ${curRisk.colorClass}">${curRisk.level}</span></td><td>${curRisk.plumeReachKm} km</td></tr>
  </table>

  <p><strong>Net Risk Reduction:</strong> ${baseRisk.score - curRisk.score} points (${baseRisk.level} &rarr; ${curRisk.level})</p>

  <h2>Active Containment Protocols</h2>
  <ul>
    <li>Reduce emissions 40%: <strong>${appState.incident.actions.reduceEmissions40 ? 'Simulated Active' : 'Not Active'}</strong></li>
    <li>Close effluent gate: <strong>${appState.incident.actions.closeEffluentGate ? 'Simulated Active' : 'Not Active'}</strong></li>
    <li>Alert downstream communities: <strong>${appState.incident.actions.alertDownstream ? 'Active' : 'Not Active'}</strong></li>
  </ul>

  <h2>Incident Log Timeline</h2>
  <table>
    <tr><th>Time</th><th>Event Description</th></tr>
    ${appState.incident.log.map(item => `<tr><td>${item.timestamp}</td><td>${escapeHtml(item.text)}</td></tr>`).join('')}
  </table>

  <hr>
  <p style="font-size: 0.85rem; color: #64748b;">Notice: This report was generated by EcoAI Flow for decision support demonstration purposes.</p>
</body>
</html>`;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `EcoAI-Flow-Report-${appState.incident.activeId || 'Demonstration'}.html`;
    a.click();
    showToast('Incident report exported successfully.', 'success');
  }

  /* ==========================================================================
     10. SETUP EVENT LISTENERS & INITIALIZATION
     ========================================================================== */
  function setupEventListeners() {
    // Accessible Tabs
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));

    window.switchTab = function(targetId) {
      appState.activeTab = targetId;
      tabButtons.forEach(btn => {
        const isSelected = btn.dataset.tab === targetId;
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.setAttribute('tabindex', isSelected ? '0' : '-1');
      });
      tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
      });
      updateAllUI();
    };

    tabButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
      btn.addEventListener('keydown', (e) => {
        let nextIdx = idx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabButtons.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabButtons.length) % tabButtons.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabButtons.length - 1;
        else return;

        e.preventDefault();
        tabButtons[nextIdx].focus();
        switchTab(tabButtons[nextIdx].dataset.tab);
      });
    });

    // Autopilot 3-way toggle
    document.querySelectorAll('.seg-auto').forEach(btn => {
      btn.addEventListener('click', () => {
        appState.autopilotMode = btn.dataset.mode;
        cancelAutopilotCountdown();
        logIncidentEvent(`Autopilot mode switched to [${appState.autopilotMode.toUpperCase()}].`, 'info');
        updateAllUI();
      });
    });

    // Live vs Demo toggle
    const btnToggleMode = document.getElementById('btnToggleMode');
    if (btnToggleMode) {
      btnToggleMode.addEventListener('click', () => {
        if (appState.mode === 'live') {
          startDemoScenario();
        } else {
          stopDemoScenario();
        }
      });
    }

    // Trigger Leak button
    const btnTriggerLeak = document.getElementById('btnTriggerLeak');
    if (btnTriggerLeak) {
      btnTriggerLeak.addEventListener('click', () => {
        appState.plant.isLeakTriggered = !appState.plant.isLeakTriggered;
        if (appState.plant.isLeakTriggered) {
          appState.plant.emission = 150;
          logIncidentEvent('Operator triggered simulated chemical leak! Stack emission forced to 150%.', 'critical');
          showToast('Simulated leak triggered! Emissions at 150%.', 'danger');
        } else {
          appState.plant.emission = 100;
          logIncidentEvent('Simulated leak reset. Emissions returned to nominal 100%.', 'info');
          showToast('Leak cleared. Emissions at 100%.', 'info');
        }
        processIncidentTick();
        updateAllUI();
      });
    }

    // Cancel Autopilot Button in countdown banner
    const btnCancelAp = document.getElementById('btnCancelAutopilot');
    if (btnCancelAp) btnCancelAp.addEventListener('click', cancelAutopilotCountdown);

    // Apply Recommended Actions (Tab 1 button)
    const btnApplyAll = document.getElementById('btnApplyAllDash');
    if (btnApplyAll) {
      btnApplyAll.addEventListener('click', () => {
        const allOn = appState.incident.actions.reduceEmissions40 &&
                      appState.incident.actions.closeEffluentGate &&
                      appState.incident.actions.alertDownstream;
        if (allOn) {
          appState.incident.actions.reduceEmissions40 = false;
          appState.incident.actions.closeEffluentGate = false;
          appState.incident.actions.alertDownstream = false;
          logIncidentEvent('Operator cleared all active actions.', 'warning');
        } else {
          applyAction('reduceEmissions40', false);
          applyAction('closeEffluentGate', false);
          applyAction('alertDownstream', false);
        }
        updateAllUI();
      });
    }

    // Replay Controls (Tab 2)
    const replaySlider = document.getElementById('replaySlider');
    if (replaySlider) {
      replaySlider.addEventListener('input', (e) => {
        appState.replay.step = parseInt(e.target.value, 10);
        updateAllUI();
      });
    }

    const btnPlayReplay = document.getElementById('btnPlayReplay');
    if (btnPlayReplay) {
      btnPlayReplay.addEventListener('click', () => {
        if (appState.replay.isPlaying) {
          clearInterval(appState.replay.intervalId);
          appState.replay.intervalId = null;
          appState.replay.isPlaying = false;
          btnPlayReplay.textContent = 'Play replay';
        } else {
          appState.replay.isPlaying = true;
          btnPlayReplay.textContent = 'Pause';
          appState.replay.intervalId = setInterval(() => {
            appState.replay.step = (appState.replay.step + 1) % 7;
            updateAllUI();
          }, 1100);
        }
      });
    }

    // Action buttons (Tab 4)
    document.getElementById('btnAct1')?.addEventListener('click', () => applyAction('reduceEmissions40', false));
    document.getElementById('btnAct2')?.addEventListener('click', () => applyAction('closeEffluentGate', false));
    document.getElementById('btnAct3')?.addEventListener('click', () => {
      applyAction('alertDownstream', false);
      openAlertModal();
    });

    document.getElementById('btnOpenAlertModal')?.addEventListener('click', openAlertModal);
    document.getElementById('btnCloseAlertModal')?.addEventListener('click', closeAlertModal);

    // Export report
    document.getElementById('btnExportReport')?.addEventListener('click', exportIncidentReport);

    // Copy Alert Message
    document.getElementById('btnCopyAlertMsg')?.addEventListener('click', () => {
      const msg = document.getElementById('alertMessageText');
      if (msg) {
        navigator.clipboard.writeText(msg.value).then(() => {
          showToast('Advisory message copied to clipboard!', 'success');
        });
      }
    });

    // Share Alert Message (Web Share API)
    document.getElementById('btnShareAlertMsg')?.addEventListener('click', async () => {
      const msg = document.getElementById('alertMessageText');
      if (navigator.share && msg) {
        try {
          await navigator.share({
            title: 'EcoAI Flow Advisory',
            text: msg.value
          });
          showToast('Message shared.', 'success');
        } catch (e) {
          // Fallback to copy
          navigator.clipboard.writeText(msg.value);
          showToast('Copied to clipboard.', 'info');
        }
      } else if (msg) {
        navigator.clipboard.writeText(msg.value);
        showToast('Web Share not supported; copied to clipboard.', 'info');
      }
    });

    // What-If Sliders (Tab 5)
    const simSpeed = document.getElementById('simRangeSpeed');
    const simDir = document.getElementById('simRangeDir');
    const simEm = document.getElementById('simRangeEmission');

    function onSimSliderChange() {
      appState.simulation.isActive = true;
      appState.simulation.windSpeed = parseFloat(simSpeed.value);
      appState.simulation.windDirection = parseInt(simDir.value, 10);
      appState.simulation.emission = parseInt(simEm.value, 10);
      updateAllUI();
    }

    simSpeed?.addEventListener('input', onSimSliderChange);
    simDir?.addEventListener('input', onSimSliderChange);
    simEm?.addEventListener('input', onSimSliderChange);

    document.getElementById('btnResetToLive')?.addEventListener('click', () => {
      appState.simulation.isActive = false;
      showToast('Simulation cleared; synced with live telemetry.', 'info');
      updateAllUI();
    });

    // Presets in Tab 5
    document.getElementById('simPresetCalm')?.addEventListener('click', () => {
      appState.simulation.isActive = true;
      appState.simulation.windSpeed = 6.0;
      appState.simulation.windDirection = 138;
      appState.simulation.emission = 100;
      updateAllUI();
    });

    document.getElementById('simPresetStrong')?.addEventListener('click', () => {
      appState.simulation.isActive = true;
      appState.simulation.windSpeed = 32.0;
      appState.simulation.windDirection = 138;
      appState.simulation.emission = 100;
      updateAllUI();
    });

    document.getElementById('simPresetWorst')?.addEventListener('click', () => {
      appState.simulation.isActive = true;
      appState.simulation.windSpeed = 28.0;
      appState.simulation.windDirection = 138;
      appState.simulation.emission = 150;
      updateAllUI();
    });

    // Settings Drawer Controls
    const drawer = document.getElementById('settingsDrawer');
    document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
      drawer?.classList.add('open');
      populateSettingsForm();
    });
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
      drawer?.classList.remove('open');
    });

    document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
      saveSettingsFromForm();
      drawer?.classList.remove('open');
      showToast('Settings saved and applied.', 'success');
      updateAllUI();
    });

    document.getElementById('btnResetSettings')?.addEventListener('click', () => {
      appState.settings = Object.assign({}, DEFAULT_SETTINGS);
      saveSettings(appState.settings);
      populateSettingsForm();
      showToast('Settings reset to defaults.', 'info');
      updateAllUI();
    });

    // Test Sound Button in Settings
    document.getElementById('btnTestSound')?.addEventListener('click', () => {
      playAlertBeep(700, 0.3, 'sine');
      showToast('Test tone played.', 'info');
    });

    // Theme Toggle
    document.getElementById('btnToggleTheme')?.addEventListener('click', () => {
      appState.settings.theme = appState.settings.theme === 'dark' ? 'light' : 'dark';
      saveSettings(appState.settings);
      applyTheme();
    });
  }

  function applyTheme() {
    document.body.classList.toggle('theme-light', appState.settings.theme === 'light');
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) {
      themeBtn.textContent = appState.settings.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  }

  function populateSettingsForm() {
    const s = appState.settings;
    setFormVal('setSiteName', s.siteName);
    setFormVal('setWaterBodyName', s.waterBodyName);
    setFormVal('setWaterDistance', s.waterDistanceKm);
    setFormVal('setLat', s.latitude);
    setFormVal('setLon', s.longitude);
    setFormVal('setLakeBearing', s.lakeBearing);
    setFormVal('setPop', s.population);
    setFormVal('setApCountdown', s.autopilotCountdown);
    setFormChecked('setEnableSound', s.enableSound);
    setFormChecked('setEnableNotif', s.enableNotifications);
  }

  function saveSettingsFromForm() {
    const s = appState.settings;
    s.siteName = getFormVal('setSiteName') || s.siteName;
    s.waterBodyName = getFormVal('setWaterBodyName') || s.waterBodyName;
    s.waterDistanceKm = parseFloat(getFormVal('setWaterDistance')) || s.waterDistanceKm;
    s.latitude = parseFloat(getFormVal('setLat')) || s.latitude;
    s.longitude = parseFloat(getFormVal('setLon')) || s.longitude;
    s.lakeBearing = parseInt(getFormVal('setLakeBearing'), 10) || s.lakeBearing;
    s.population = parseInt(getFormVal('setPop'), 10) || s.population;
    s.autopilotCountdown = parseInt(getFormVal('setApCountdown'), 10) || s.autopilotCountdown;
    s.enableSound = getFormChecked('setEnableSound');
    s.enableNotifications = getFormChecked('setEnableNotif');

    if (s.enableNotifications && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    saveSettings(s);
  }

  function setFormVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function getFormVal(id) { const el = document.getElementById(id); return el ? el.value : null; }
  function setFormChecked(id, bool) { const el = document.getElementById(id); if (el) el.checked = bool; }
  function getFormChecked(id) { const el = document.getElementById(id); return el ? el.checked : false; }

  /* ==========================================================================
     11. PWA INSTALLATION PROMPT & INITIALIZATION
     ========================================================================== */
  let deferredInstallPrompt = null;

  function initPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
          .catch(err => console.warn('[PWA] Service Worker error:', err));
      });
    }

    const btnInstall = document.getElementById('btnInstallPwa');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (btnInstall) btnInstall.style.display = 'inline-flex';
    });

    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('EcoAI Flow installed to home screen!', 'success');
        }
        deferredInstallPrompt = null;
        btnInstall.style.display = 'none';
      });
    }
  }

  // Master Startup
  function initApp() {
    applyTheme();
    setupEventListeners();
    initPwa();

    // Initial Live Fetches
    fetchLiveWeather();
    fetchLiveAQI();
    fetchNasaPower();

    // Periodic live background intervals
    setInterval(fetchLiveWeather, appState.settings.weatherInterval * 1000);
    setInterval(fetchLiveAQI, appState.settings.aqiInterval * 1000);
    setInterval(updateSimulatedPlantSensors, appState.settings.sensorInterval * 1000);

    // Initial UI render
    updateAllUI();
    logIncidentEvent('EcoAI Flow system initialized in normal monitoring state.', 'info');
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
