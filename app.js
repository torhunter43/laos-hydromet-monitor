(function () {
  "use strict";

  var THEME_STORAGE_KEY = "laos_flood_monitor_theme";

  var ALERT_COLORS = {
    normal: "#10b981",
    watch: "#0284c7",
    alarm: "#f59e0b",
    flood: "#ef4444"
  };

  var ALERT_PRIORITY = {
    flood: 3,
    alarm: 2,
    watch: 1,
    normal: 0
  };

  var state = {
    selectedProvinceId: "vientiane_capital",
    userSelectedProvince: false,
    basemapKey: "bright",
    basemapManuallyOverridden: false,
    showStationIcons: true,
    showDomMarkers: true,
    gibsLayerKey: "Band13_IR",
    gibsDate: "",
    gibsSlot: "latest",
    gibsMinDate: "",
    gibsMaxDate: "",
    gibsOpacity: 0.3,
    shapefile: {
      name: "",
      featureCollection: null,
      bbox: null,
      samplePoints: [],
      loading: false,
      error: null,
      data: null
    },
    leafletShapefileGroup: null,
    gibsFallbackIndex: {},
    tmdExpanded: true,
    tmdLoadSeq: 0,
    tmdLoadedMeta: null,
    tmdFetchStatus: "idle",
    rainViewerEnabled: false,
    rainViewerMeta: null,
    rainViewerFrameIdx: 0,
    rvPlaying: false,
    rvTimer: null,
    hydromet: null,
    syncState: "idle",
    syncTimeStr: "",
    mapEngine: null,
    mapLibreMap: null,
    mapLibreReady: false,
    mapLibreLoadedOnce: false,
    mlProvinceMarkers: [],
    mlGaugeMarkers: [],
    leafletMap: null,
    leafletBaseLayer: null,
    leafletGibsLayer: null,
    leafletRvLayer: null,
    leafletVectorGroup: null,
    leafletSelectedPairLine: null,
    leafletSelectedGlofasLine: null,
    leafletMarkerGroup: null,
    cursorModeEnabled: true,
    cursorPickTarget: null,
    cleanViewEnabled: false,
    cleanSavedStationsVisible: true,
    customOverridesByProv: {},
    hoveredCoords: null,
    rainChart: null,
    floodChart: null,
    detailBodyExpanded: true,
    chartsVisible: true,
    tableExpanded: true,
    chartsNeedRender: false,
    mapResizeObserver: null,
    sortKey: "alert",
    sortDir: "desc"
  };

  function getApp() {
    window.LaosFloodApp = window.LaosFloodApp || {};
    return window.LaosFloodApp;
  }

  function getData() {
    return getApp().DATA || {
      PROVINCES: [],
      MRC_STATIONS: [],
      BASINS: [],
      OPENFREEMAP_STYLES: {},
      GIBS_LAYERS: {},
      FORECAST_MODELS: [],
      LAOS_CENTER: [103.85, 18.25],
      LAOS_BOUNDS: [[99.6, 13.7], [108.1, 22.7]]
    };
  }

  function getApi() {
    return getApp().API || {};
  }

  function getI18n() {
    return getApp().i18n || {
      t: function (k) { return k; },
      getLang: function () { return "th"; },
      toggleLang: function () { return "th"; }
    };
  }

  function t(key, vars) {
    return getI18n().t(key, vars);
  }

  function getLang() {
    return getI18n().getLang ? getI18n().getLang() : "th";
  }

  function isDarkMode() {
    return document.documentElement.classList.contains("dark");
  }

  function escapeHtml(val) {
    if (val === null || val === undefined) return "";
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatNumber(val, decimals) {
    if (typeof val !== "number" || !isFinite(val)) return "--";
    return val.toFixed(typeof decimals === "number" ? decimals : 1);
  }

  function formatCommaNumber(val, decimals) {
    if (typeof val !== "number" || !isFinite(val)) return "--";
    var fixed = val.toFixed(typeof decimals === "number" ? decimals : 0);
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function formatEpochIct(unixSec) {
    if (typeof unixSec !== "number" || !isFinite(unixSec)) return "--:--";
    var d = new Date((unixSec + 7 * 3600) * 1000);
    return pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + " ICT";
  }

  function formatIsoToIctHm(isoStr) {
    if (!isoStr) return "--:--";
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return "--:--";
    var ict = new Date(d.getTime() + 7 * 3600 * 1000);
    return pad2(ict.getUTCHours()) + ":" + pad2(ict.getUTCMinutes()) + " ICT";
  }

  function findProvinceById(id) {
    var provinces = getData().PROVINCES || [];
    for (var i = 0; i < provinces.length; i++) {
      if (provinces[i].id === id) return provinces[i];
    }
    return provinces.length ? provinces[0] : null;
  }

  function getProvinceMetrics(provId) {
    if (!state.hydromet || !state.hydromet.byProvince) return null;
    return state.hydromet.byProvince[provId] || null;
  }

  function getProvinceAlertLevel(provId) {
    var m = getProvinceMetrics(provId);
    return m && m.alertLevel ? m.alertLevel : "normal";
  }

  function getCustomOverride(provId) {
    return state.customOverridesByProv[provId] || null;
  }

  function hasCustomCoords(provId) {
    var ov = getCustomOverride(provId);
    return Boolean(ov && (ov.townMoved || ov.ridgeMoved || ov.glofasMoved));
  }

  function getEffectiveProvinceData(prov) {
    if (!prov) return null;
    var baseGlofas = prov.glofas_point || {
      lat: prov.town.lat,
      lon: prov.town.lon,
      label_th: prov.town.label_th,
      label_en: prov.town.label_en
    };
    var ov = getCustomOverride(prov.id);
    if (!state.cursorModeEnabled || !ov || (!ov.townMoved && !ov.ridgeMoved && !ov.glofasMoved)) {
      return {
        province: prov,
        id: prov.id,
        isCustom: false,
        townMoved: false,
        ridgeMoved: false,
        glofasMoved: false,
        town: prov.town,
        ridge: prov.ridge,
        glofas_point: baseGlofas
      };
    }

    return {
      province: prov,
      id: prov.id,
      isCustom: true,
      townMoved: Boolean(ov.townMoved),
      ridgeMoved: Boolean(ov.ridgeMoved),
      glofasMoved: Boolean(ov.glofasMoved),
      town: ov.townMoved && ov.town ? {
        lat: ov.town.lat,
        lon: ov.town.lon,
        elev_m: null,
        label_th: prov.town.label_th + " (Cursor)",
        label_en: prov.town.label_en + " (Cursor)"
      } : prov.town,
      ridge: ov.ridgeMoved && ov.ridge ? {
        lat: ov.ridge.lat,
        lon: ov.ridge.lon,
        elev_m: null,
        label_th: prov.ridge.label_th + " (Cursor)",
        label_en: prov.ridge.label_en + " (Cursor)"
      } : prov.ridge,
      glofas_point: ov.glofasMoved && ov.glofas_point ? {
        lat: ov.glofas_point.lat,
        lon: ov.glofas_point.lon,
        label_th: baseGlofas.label_th + " (Cursor)",
        label_en: baseGlofas.label_en + " (Cursor)"
      } : baseGlofas
    };
  }

  function getEffectiveMetrics(provId) {
    var ov = getCustomOverride(provId);
    if (state.cursorModeEnabled && ov && (ov.townMoved || ov.ridgeMoved || ov.glofasMoved)) {
      return ov.metrics || null;
    }
    return getProvinceMetrics(provId);
  }

  function getEffectiveAlertLevel(provId) {
    var m = getEffectiveMetrics(provId);
    if (m && m.alertLevel) return m.alertLevel;
    return getProvinceAlertLevel(provId);
  }

  /* --------------------------------------------------------------------------
     1. Live ICT / UTC Clock
     -------------------------------------------------------------------------- */
  function updateClock() {
    var clockEl = document.getElementById("clock-ict");
    if (!clockEl) return;
    var nowMs = Date.now();
    var utc = new Date(nowMs);
    var ict = new Date(nowMs + 7 * 3600 * 1000);

    var ictStr =
      pad2(ict.getUTCHours()) + ":" + pad2(ict.getUTCMinutes()) + ":" + pad2(ict.getUTCSeconds());
    var utcStr =
      pad2(utc.getUTCHours()) + ":" + pad2(utc.getUTCMinutes()) + ":" + pad2(utc.getUTCSeconds());

    clockEl.textContent = "ICT " + ictStr + " | UTC " + utcStr;
  }

  /* --------------------------------------------------------------------------
     2. Sync Status & File Protocol Banner
     -------------------------------------------------------------------------- */
  function setSyncBadge(mode, text) {
    var el = document.getElementById("sync-status");
    if (!el) return;
    state.syncState = mode;
    el.className = "status-pill";
    if (mode === "loading") {
      el.classList.add("status-loading");
      el.textContent = text || t("sync.syncing");
    } else if (mode === "ok") {
      el.classList.add("status-ok");
      el.textContent = text;
    } else if (mode === "error") {
      el.classList.add("status-error");
      el.textContent = text || t("sync.error");
    } else {
      el.classList.add("status-idle");
      el.textContent = text || t("header.syncChecking");
    }
  }

  function refreshSyncBadgeLocale() {
    if (state.syncState === "loading") {
      setSyncBadge("loading", t("sync.syncing"));
    } else if (state.syncState === "ok" && state.hydromet) {
      if (state.hydromet.okStreams < state.hydromet.totalStreams) {
        setSyncBadge(
          "ok",
          t("sync.partial", {
            ok: state.hydromet.okStreams,
            total: state.hydromet.totalStreams
          }) + " (" + state.syncTimeStr + ")"
        );
      } else {
        setSyncBadge("ok", t("sync.synced", { time: state.syncTimeStr }));
      }
    } else if (state.syncState === "error") {
      setSyncBadge("error", t("sync.error"));
    } else {
      setSyncBadge("idle", t("header.syncChecking"));
    }
  }

  function showFileProtocolBanner() {
    var banner = document.getElementById("file-protocol-banner");
    if (banner) {
      banner.classList.remove("hidden");
    }
  }

  /* --------------------------------------------------------------------------
     3. Theme Management
     -------------------------------------------------------------------------- */
  function initTheme() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (_) {}

    if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    state.basemapKey = "bright";
    var basemapSel = document.getElementById("select-basemap");
    if (basemapSel) {
      basemapSel.value = state.basemapKey;
    }
  }

  function toggleTheme() {
    var nextDark = !isDarkMode();
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light");
    } catch (_) {}

    renderCharts();
  }

  /* --------------------------------------------------------------------------
     4. Map Engine (MapLibre GL JS v4 + OpenFreeMap EN Patch + Leaflet Fallback)
     -------------------------------------------------------------------------- */
  function getActiveGibsLayerId(layerKey) {
    var cfg = (getData().GIBS_LAYERS || {})[layerKey];
    if (!cfg) return null;
    var idx = state.gibsFallbackIndex[layerKey] || 0;
    if (Array.isArray(cfg.fallbackIds) && cfg.fallbackIds[idx]) {
      return cfg.fallbackIds[idx];
    }
    return cfg.id;
  }

  /* --------------------------------------------------------------------------
     3B. Live Cursor HUD & Interactive Paired Node Relocation
     -------------------------------------------------------------------------- */
  function updateCursorHudCoords(lat, lon) {
    if (typeof lat !== "number" || !isFinite(lat) || typeof lon !== "number" || !isFinite(lon)) return;
    state.hoveredCoords = { lat: lat, lon: lon };
    var coordsEl = document.getElementById("cursor-hud-coords");
    if (coordsEl) {
      coordsEl.textContent = "Lat " + lat.toFixed(4) + "°, Lon " + lon.toFixed(4) + "°";
    }
  }

  function clearCursorHudCoords() {
    state.hoveredCoords = null;
    var coordsEl = document.getElementById("cursor-hud-coords");
    if (coordsEl) {
      coordsEl.textContent = t("map.cursorIdle");
    }
  }

  function getPickerTargetLabel(target) {
    if (target === "town") return t("picker.targetTown");
    if (target === "ridge") return t("picker.targetRidge");
    if (target === "glofas") return t("picker.targetGlofas");
    return "";
  }

  function updateCursorHudMode() {
    var target = state.cursorPickTarget;
    var hud = document.getElementById("map-cursor-hud");
    var modeEl = document.getElementById("cursor-hud-mode");
    var mapContainer = document.getElementById("map-container");

    if (mapContainer) {
      mapContainer.classList.toggle("cursor-pick-mode", Boolean(target));
    }
    if (hud) {
      hud.classList.toggle("is-picking", Boolean(target));
    }
    if (modeEl) {
      if (target) {
        modeEl.textContent = t("picker.hudPrompt", { target: getPickerTargetLabel(target) });
        modeEl.classList.remove("hidden");
      } else {
        modeEl.textContent = "";
        modeEl.classList.add("hidden");
      }
    }

    var btnMap = [
      { id: "btn-pick-town", key: "town" },
      { id: "btn-pick-ridge", key: "ridge" },
      { id: "btn-pick-glofas", key: "glofas" }
    ];
    for (var i = 0; i < btnMap.length; i++) {
      var btn = document.getElementById(btnMap[i].id);
      if (btn) {
        var active = target === btnMap[i].key;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      }
    }
  }

  function syncQuickMapHud() {
    var toggleIconsEl = document.getElementById("toggle-station-icons");
    if (toggleIconsEl && toggleIconsEl.checked !== Boolean(state.showStationIcons)) {
      toggleIconsEl.checked = Boolean(state.showStationIcons);
    }

    var toggleLabelsEl = document.getElementById("toggle-th-markers");
    var wrapLabelsEl = document.getElementById("wrap-th-markers");
    if (toggleLabelsEl) {
      toggleLabelsEl.disabled = !state.showStationIcons;
    }
    if (wrapLabelsEl) {
      wrapLabelsEl.classList.toggle("is-disabled", !state.showStationIcons);
    }

    var btnStations = document.getElementById("btn-quick-stations");
    var btnStationsText = document.getElementById("btn-quick-stations-text");
    if (btnStations) {
      var pinsHidden = !state.showStationIcons;
      btnStations.classList.toggle("is-active", pinsHidden);
      btnStations.setAttribute("aria-pressed", state.showStationIcons ? "true" : "false");
    }
    if (btnStationsText) {
      btnStationsText.textContent = t(state.showStationIcons ? "map.quickHidePins" : "map.quickShowPins");
    }

    var btnClean = document.getElementById("btn-quick-clean");
    var btnCleanText = document.getElementById("btn-quick-clean-text");
    if (btnClean) {
      btnClean.classList.toggle("is-active", Boolean(state.cleanViewEnabled));
      btnClean.setAttribute("aria-pressed", state.cleanViewEnabled ? "true" : "false");
    }
    if (btnCleanText) {
      btnCleanText.textContent = t(state.cleanViewEnabled ? "map.quickCleanExit" : "map.quickCleanEnter");
    }

    var mapCtrlCard = document.getElementById("map-control-card");
    var mapLegendCard = document.getElementById("map-legend-card");
    var cursorHud = document.getElementById("map-cursor-hud");
    var cleanActive = Boolean(state.cleanViewEnabled);
    if (mapCtrlCard) mapCtrlCard.classList.toggle("is-clean-hidden", cleanActive);
    if (mapLegendCard) mapLegendCard.classList.toggle("is-clean-hidden", cleanActive);
    if (cursorHud) cursorHud.classList.toggle("is-clean-hidden", cleanActive);
  }

  function setStationIconsVisible(visible, opts) {
    var next = Boolean(visible);
    state.showStationIcons = next;
    if (!next && state.cursorPickTarget) {
      setCursorPickTarget(null);
    }
    if (state.cleanViewEnabled && !(opts && opts.fromCleanView)) {
      state.cleanSavedStationsVisible = next;
    }
    syncQuickMapHud();
    refreshMapMarkersAndLinks();
  }

  function setCleanViewEnabled(enabled) {
    var next = Boolean(enabled);
    if (next === state.cleanViewEnabled) {
      syncQuickMapHud();
      return;
    }
    if (next) {
      state.cleanSavedStationsVisible = Boolean(state.showStationIcons);
      state.cleanViewEnabled = true;
      setStationIconsVisible(false, { fromCleanView: true });
    } else {
      state.cleanViewEnabled = false;
      setStationIconsVisible(Boolean(state.cleanSavedStationsVisible), { fromCleanView: true });
    }
  }

  function setCursorPickTarget(target) {
    if (!state.cursorModeEnabled) {
      state.cursorPickTarget = null;
      updateCursorHudMode();
      return;
    }
    var valid = (target === "town" || target === "ridge" || target === "glofas") ? target : null;
    if (valid) {
      if (state.cleanViewEnabled) {
        setCleanViewEnabled(false);
      }
      if (!state.showStationIcons) {
        setStationIconsVisible(true);
      }
    }
    state.cursorPickTarget = valid;
    updateCursorHudMode();
  }

  function syncCursorModeContainers() {
    var enabled = Boolean(state.cursorModeEnabled);
    var hudEl = document.getElementById("map-cursor-hud");
    if (hudEl) {
      hudEl.classList.toggle("hidden", !enabled);
    }

    var pickerBar = document.getElementById("cursor-picker-bar");
    if (pickerBar) {
      pickerBar.classList.toggle("hidden", !enabled);
    }
  }

  function setCursorModeEnabled(enabled) {
    var next = Boolean(enabled);
    state.cursorModeEnabled = next;

    if (!next) {
      setCursorPickTarget(null);
    }

    syncCursorModeContainers();

    var toggleCursorEl = document.getElementById("toggle-cursor-mode");
    if (toggleCursorEl && toggleCursorEl.checked !== next) {
      toggleCursorEl.checked = next;
    }

    renderDetailPanel();
    refreshMapMarkersAndLinks();
    updateCursorHudMode();
  }

  function relocateProvinceNode(provId, targetKey, lat, lon, triggerFetch) {
    if (!state.cursorModeEnabled) return;
    var prov = findProvinceById(provId);
    if (!prov || typeof lat !== "number" || !isFinite(lat) || typeof lon !== "number" || !isFinite(lon)) {
      return;
    }

    var cleanLat = Number(Math.max(-85, Math.min(85, lat)).toFixed(4));
    var cleanLon = Number(Math.max(-180, Math.min(180, lon)).toFixed(4));
    var baseGlofas = prov.glofas_point || prov.town;

    var ov = state.customOverridesByProv[provId];
    if (!ov) {
      ov = {
        town: { lat: prov.town.lat, lon: prov.town.lon },
        ridge: { lat: prov.ridge.lat, lon: prov.ridge.lon },
        glofas_point: { lat: baseGlofas.lat, lon: baseGlofas.lon },
        townMoved: false,
        ridgeMoved: false,
        glofasMoved: false,
        metrics: null,
        loading: false,
        error: null,
        fetchSeq: 0
      };
      state.customOverridesByProv[provId] = ov;
    }

    if (targetKey === "town") {
      ov.town = { lat: cleanLat, lon: cleanLon };
      ov.townMoved = true;
    } else if (targetKey === "ridge") {
      ov.ridge = { lat: cleanLat, lon: cleanLon };
      ov.ridgeMoved = true;
    } else if (targetKey === "glofas") {
      ov.glofas_point = { lat: cleanLat, lon: cleanLon };
      ov.glofasMoved = true;
    }

    if (!triggerFetch) {
      return;
    }

    ov.loading = true;
    ov.error = null;
    ov.fetchSeq = (ov.fetchSeq || 0) + 1;
    var mySeq = ov.fetchSeq;

    renderDetailPanel();
    refreshMapMarkersAndLinks();

    var api = getApi();
    if (!api.fetchCustomPairHydromet) {
      ov.loading = false;
      renderDetailPanel();
      return;
    }

    api.fetchCustomPairHydromet(ov.town, ov.ridge, ov.glofas_point)
      .then(function (customMetrics) {
        var curOv = state.customOverridesByProv[provId];
        if (!curOv || curOv.fetchSeq !== mySeq) return;
        curOv.loading = false;
        curOv.metrics = customMetrics;
        curOv.error = customMetrics && !customMetrics.forecastOk && !customMetrics.floodOk
          ? t("picker.loadError")
          : null;
        if (state.selectedProvinceId === provId) {
          renderDetailPanel();
        }
        refreshMapMarkersAndLinks();
      })
      .catch(function (err) {
        var curOv = state.customOverridesByProv[provId];
        if (!curOv || curOv.fetchSeq !== mySeq) return;
        curOv.loading = false;
        curOv.error = (err && err.message) ? err.message : t("picker.loadError");
        if (state.selectedProvinceId === provId) {
          renderDetailPanel();
        }
      });
  }

  function handleCursorMapPick(lat, lon) {
    var target = state.cursorPickTarget;
    if (!target) return;
    setCursorPickTarget(null);
    relocateProvinceNode(state.selectedProvinceId, target, lat, lon, true);
  }

  function resetCustomNodesForSelected() {
    var provId = state.selectedProvinceId;
    if (provId && state.customOverridesByProv[provId]) {
      delete state.customOverridesByProv[provId];
    }
    setCursorPickTarget(null);
    renderDetailPanel();
    refreshMapMarkersAndLinks();
  }

  function buildPairedLinksGeoJson() {
    if (!state.showStationIcons) {
      return { type: "FeatureCollection", features: [] };
    }
    var provinces = getData().PROVINCES || [];
    var features = [];
    for (var i = 0; i < provinces.length; i++) {
      var p = provinces[i];
      var eff = getEffectiveProvinceData(p);
      var level = getEffectiveAlertLevel(p.id);
      var isSelected = p.id === state.selectedProvinceId;
      var pairMoved = Boolean(state.cursorModeEnabled && (eff.townMoved || eff.ridgeMoved));

      features.push({
        type: "Feature",
        properties: {
          provinceId: p.id,
          linkKind: "pair",
          isSelected: isSelected,
          alertLevel: level,
          color: pairMoved ? "#d946ef" : (ALERT_COLORS[level] || ALERT_COLORS.normal)
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [eff.town.lon, eff.town.lat],
            [eff.ridge.lon, eff.ridge.lat]
          ]
        }
      });

      if (state.cursorModeEnabled && isSelected && eff.glofas_point) {
        var glofasDiffers =
          Math.abs(eff.glofas_point.lat - eff.town.lat) > 0.0005 ||
          Math.abs(eff.glofas_point.lon - eff.town.lon) > 0.0005;
        if (glofasDiffers) {
          features.push({
            type: "Feature",
            properties: {
              provinceId: p.id,
              linkKind: "glofas",
              isSelected: true,
              alertLevel: level,
              color: "#e879f9"
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [eff.town.lon, eff.town.lat],
                [eff.glofas_point.lon, eff.glofas_point.lat]
              ]
            }
          });
        }
      }
    }
    return { type: "FeatureCollection", features: features };
  }

  function patchOpenFreeMapEnglishOnly(map) {
    var style = map.getStyle();
    if (!style || !Array.isArray(style.layers)) return;

    for (var i = 0; i < style.layers.length; i++) {
      var layer = style.layers[i];
      if (layer.type !== "symbol" || !layer.layout || !layer.layout["text-field"]) {
        continue;
      }
      var serialized = "";
      try {
        serialized = JSON.stringify(layer.layout["text-field"]);
      } catch (_) {
        continue;
      }

      var usesPlaceName =
        serialized.indexOf('"name"') !== -1 ||
        serialized.indexOf("name:en") !== -1 ||
        serialized.indexOf("name:latin") !== -1 ||
        serialized.indexOf("name:nonlatin") !== -1 ||
        serialized.indexOf("{name") !== -1;
      var hasRefOnly = serialized.indexOf('"ref"') !== -1 && !usesPlaceName;

      if (usesPlaceName && !hasRefOnly) {
        try {
          map.setLayoutProperty(layer.id, "text-field", [
            "coalesce",
            ["get", "name:en"],
            ["get", "name:latin"],
            ""
          ]);
        } catch (_) {}
      }
    }
  }

  function getFirstSymbolLayerId(map) {
    var style = map.getStyle();
    if (!style || !Array.isArray(style.layers)) return undefined;
    for (var i = 0; i < style.layers.length; i++) {
      if (style.layers[i].type === "symbol") {
        return style.layers[i].id;
      }
    }
    return undefined;
  }

  function removeMapLibreLayerAndSource(map, layerId, sourceId) {
    if (!map) return;
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    } catch (_) {}
    try {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (_) {}
  }

  function syncMapLibreGibsLayer() {
    var map = state.mapLibreMap;
    if (!map || !state.mapLibreReady) return;

    removeMapLibreLayerAndSource(map, "gibs-sat-layer", "gibs-sat-src");

    if (!state.gibsLayerKey || state.gibsLayerKey === "none") return;
    var cfg = (getData().GIBS_LAYERS || {})[state.gibsLayerKey];
    if (!cfg) return;

    var layerId = getActiveGibsLayerId(state.gibsLayerKey);
    var tileUrl = getApi().getGibsTileUrl(state.gibsLayerKey, state.gibsDate, layerId, cfg.matrixSet, state.gibsSlot);
    if (!tileUrl) return;

    var beforeId = map.getLayer("rv-radar-layer")
      ? "rv-radar-layer"
      : (map.getLayer("paired-links-layer") ? "paired-links-layer" : getFirstSymbolLayerId(map));

    map.addSource("gibs-sat-src", {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: cfg.maxZoom || 6,
      attribution: "NASA GIBS Himawari-9"
    });

    map.addLayer(
      {
        id: "gibs-sat-layer",
        type: "raster",
        source: "gibs-sat-src",
        paint: {
          "raster-opacity": state.gibsOpacity,
          "raster-fade-duration": 0
        }
      },
      beforeId
    );
  }

  function syncMapLibreRainViewerLayer() {
    var map = state.mapLibreMap;
    if (!map || !state.mapLibreReady) return;

    removeMapLibreLayerAndSource(map, "rv-radar-layer", "rv-radar-src");

    if (!state.rainViewerEnabled || !state.rainViewerMeta || !state.rainViewerMeta.past.length) {
      return;
    }

    var past = state.rainViewerMeta.past;
    var idx = Math.max(0, Math.min(past.length - 1, state.rainViewerFrameIdx));
    var frame = past[idx];
    var tileUrl = getApi().buildRainViewerTileUrl(state.rainViewerMeta.host, frame.path);
    if (!tileUrl) return;

    var beforeId = map.getLayer("paired-links-layer")
      ? "paired-links-layer"
      : getFirstSymbolLayerId(map);

    map.addSource("rv-radar-src", {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 7,
      attribution: "RainViewer Past 2h"
    });

    map.addLayer(
      {
        id: "rv-radar-layer",
        type: "raster",
        source: "rv-radar-src",
        paint: {
          "raster-opacity": 0.72,
          "raster-fade-duration": 0
        }
      },
      beforeId
    );
  }

  function syncMapLibrePairedLinks() {
    var map = state.mapLibreMap;
    if (!map || !state.mapLibreReady) return;

    var geojson = buildPairedLinksGeoJson();
    var existingSrc = map.getSource("paired-links-src");
    if (existingSrc) {
      existingSrc.setData(geojson);
      return;
    }

    var beforeId = getFirstSymbolLayerId(map);
    map.addSource("paired-links-src", {
      type: "geojson",
      data: geojson
    });

    map.addLayer(
      {
        id: "paired-links-layer",
        type: "line",
        source: "paired-links-src",
        filter: ["!=", ["get", "linkKind"], "glofas"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "isSelected"], false], 2.6, 1.8],
          "line-opacity": ["case", ["boolean", ["get", "isSelected"], false], 0.92, 0.7],
          "line-dasharray": [3, 2]
        }
      },
      beforeId
    );

    map.addLayer(
      {
        id: "paired-glofas-link-layer",
        type: "line",
        source: "paired-links-src",
        filter: ["==", ["get", "linkKind"], "glofas"],
        paint: {
          "line-color": "#e879f9",
          "line-width": 1.6,
          "line-opacity": 0.85,
          "line-dasharray": [1.5, 2.5]
        }
      },
      beforeId
    );
  }

  function clearMapLibreDomMarkers() {
    for (var i = 0; i < state.mlProvinceMarkers.length; i++) {
      try { state.mlProvinceMarkers[i].remove(); } catch (_) {}
    }
    for (var j = 0; j < state.mlGaugeMarkers.length; j++) {
      try { state.mlGaugeMarkers[j].remove(); } catch (_) {}
    }
    state.mlProvinceMarkers = [];
    state.mlGaugeMarkers = [];
  }

  function buildTownMarkerHtml(eff, color, isSelected, lang) {
    var prov = eff.province;
    var cursorActive = Boolean(isSelected && state.cursorModeEnabled);
    var label = (lang === "th" ? prov.capital_th : prov.capital_en) + (eff.townMoved ? "*" : "");
    var metrics = getEffectiveMetrics(prov.id);
    var rainStr = metrics && metrics.town ? formatNumber(metrics.town.rain24h, 0) + "mm" : "";
    var dotColor = (cursorActive && eff.townMoved) ? "#d946ef" : color;
    var ring = cursorActive
      ? "box-shadow:0 0 0 3px #d946ef,0 0 10px rgba(217,70,239,0.55);"
      : (isSelected ? "box-shadow:0 0 0 3px rgba(37,99,235,0.65),0 0 8px " + color + ";" : "box-shadow:0 1px 4px rgba(0,0,0,0.55);");
    var cls = "laos-dom-marker" + (cursorActive ? " is-draggable" : "");
    var titleAttr = cursorActive
      ? ' title="' + escapeHtml((lang === "th" ? eff.town.label_th : eff.town.label_en) + " • " + t("picker.dragTooltip")) + '"'
      : "";
    var labelBorder = (cursorActive && eff.townMoved)
      ? "border-color:#d946ef;"
      : (isSelected ? "border-color:#3b82f6;" : "");

    var html =
      '<div class="' + cls + '"' + titleAttr + ">" +
        '<span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:' + dotColor + ';border:2px solid #ffffff;' + ring + '"></span>';
    if (state.showDomMarkers) {
      html +=
        '<span class="laos-marker-label" style="' + labelBorder + '">' +
          escapeHtml(label) + (rainStr ? " · " + rainStr : "") +
        "</span>";
    }
    html += "</div>";
    return html;
  }

  function buildRidgeMarkerHtml(eff, color, isSelected, lang) {
    var prov = eff.province;
    var cursorActive = Boolean(isSelected && state.cursorModeEnabled);
    var metrics = getEffectiveMetrics(prov.id);
    var ridgeStr = metrics && metrics.ridge ? formatNumber(metrics.ridge.rain24h, 0) + "mm" : "";
    var elevVal = eff.ridgeMoved && metrics && metrics.ridge && metrics.ridge.gridElevationM !== null
      ? metrics.ridge.gridElevationM + " m DEM"
      : (typeof eff.ridge.elev_m === "number" ? eff.ridge.elev_m + " m" : "DEM");
    var titleText = (lang === "th" ? eff.ridge.label_th : eff.ridge.label_en) +
      " (" + elevVal + ")" +
      (ridgeStr ? " • 24h: " + ridgeStr : "") +
      (cursorActive ? " • " + t("picker.dragTooltip") : "");
    var triColor = (cursorActive && eff.ridgeMoved) ? "#d946ef" : color;
    var triFilter = cursorActive
      ? "filter:drop-shadow(0 0 4px #d946ef) drop-shadow(0 1px 2px rgba(0,0,0,0.65));"
      : "filter:drop-shadow(0 1px 2px rgba(0,0,0,0.65));";
    var cls = "laos-dom-marker" + (cursorActive ? " is-draggable" : "");

    return (
      '<div class="' + cls + '" title="' + escapeHtml(titleText) + '">' +
        '<span style="display:inline-block;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:11px solid ' + triColor + ';' + triFilter + '"></span>' +
      "</div>"
    );
  }

  function buildSelectedGlofasMarkerHtml(eff, lang) {
    var gLabel = lang === "th" ? eff.glofas_point.label_th : eff.glofas_point.label_en;
    var metrics = getEffectiveMetrics(eff.id);
    var flowTxt = metrics && metrics.glofas && typeof metrics.glofas.peakForecastMax === "number"
      ? " • " + formatCommaNumber(metrics.glofas.peakForecastMax, 0) + " m³/s"
      : "";
    var titleText = "GloFAS: " + gLabel + flowTxt + " • " + t("picker.dragTooltip");

    var html =
      '<div class="laos-dom-marker is-draggable" style="display:flex;width:100%;flex-direction:column;align-items:center;gap:2px;" title="' + escapeHtml(titleText) + '">' +
        '<span style="display:inline-block;width:13px;height:13px;border-radius:3px;background:#d946ef;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(217,70,239,0.55),0 1px 4px rgba(0,0,0,0.65);"></span>';
    if (state.showDomMarkers) {
      html += '<span class="laos-marker-label" style="font-size:10px;line-height:1.15;padding:1px 5px;border-color:#d946ef;">GloFAS</span>';
    }
    html += "</div>";
    return html;
  }

  function buildGaugeMarkerHtml(st, lang) {
    var name = lang === "th" ? st.name_th : st.name_en;
    var alarmTxt = st.alarm_m !== null ? st.alarm_m.toFixed(1) + "m" : "-";
    var floodTxt = st.flood_m !== null ? st.flood_m.toFixed(1) + "m" : "-";
    var tooltip = "MRC " + st.code + " " + name + " | Alarm " + alarmTxt + " / Flood " + floodTxt;

    var html =
      '<div class="laos-dom-marker" title="' + escapeHtml(tooltip) + '">' +
        '<span style="display:inline-block;width:10px;height:10px;background:#38bdf8;border:1.5px solid #082f49;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.6);"></span>';
    if (state.showDomMarkers) {
      html += '<span class="laos-marker-label" style="font-size:10px;opacity:0.9;">MRC ' + escapeHtml(st.code) + "</span>";
    }
    html += "</div>";
    return html;
  }

  function handleMapLibreMarkerPickOrSelect(ev, map, provId, getLastDragAt) {
    ev.stopPropagation();
    if (state.cursorPickTarget) {
      var canvas = map.getCanvas();
      if (canvas) {
        var rect = canvas.getBoundingClientRect();
        var ll = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
        if (ll) handleCursorMapPick(ll.lat, ll.lng);
      }
      return;
    }
    if (getLastDragAt && Date.now() - getLastDragAt() < 250) {
      return;
    }
    if (provId) {
      selectProvince(provId, true);
    }
  }

  function attachMapLibreDragHandlers(marker, provId, kind, onDragEndStamp) {
    marker.on("drag", function () {
      var ll = marker.getLngLat();
      if (!ll) return;
      updateCursorHudCoords(ll.lat, ll.lng);
      relocateProvinceNode(provId, kind, ll.lat, ll.lng, false);
      syncMapLibrePairedLinks();
    });
    marker.on("dragend", function () {
      if (onDragEndStamp) onDragEndStamp();
      var ll = marker.getLngLat();
      if (!ll) return;
      updateCursorHudCoords(ll.lat, ll.lng);
      relocateProvinceNode(provId, kind, ll.lat, ll.lng, true);
    });
  }

  function renderMapLibreMarkers() {
    var map = state.mapLibreMap;
    if (!map || !window.maplibregl) return;
    clearMapLibreDomMarkers();
    if (!state.showStationIcons) return;

    var data = getData();
    var provinces = data.PROVINCES || [];
    var gauges = data.MRC_STATIONS || [];
    var lang = getLang();

    for (var i = 0; i < provinces.length; i++) {
      (function (prov) {
        var eff = getEffectiveProvinceData(prov);
        var level = getEffectiveAlertLevel(prov.id);
        var color = ALERT_COLORS[level] || ALERT_COLORS.normal;
        var isSelected = prov.id === state.selectedProvinceId;
        var cursorActive = Boolean(isSelected && state.cursorModeEnabled);
        var lastDragAt = 0;
        var markDragged = function () { lastDragAt = Date.now(); };
        var getDragged = function () { return lastDragAt; };

        var townEl = document.createElement("div");
        townEl.innerHTML = buildTownMarkerHtml(eff, color, isSelected, lang);
        townEl.addEventListener("click", function (ev) {
          handleMapLibreMarkerPickOrSelect(ev, map, prov.id, getDragged);
        });
        var townMarker = new window.maplibregl.Marker({
          element: townEl,
          anchor: "left",
          draggable: cursorActive
        })
          .setLngLat([eff.town.lon, eff.town.lat])
          .addTo(map);
        if (cursorActive) {
          attachMapLibreDragHandlers(townMarker, prov.id, "town", markDragged);
        }
        state.mlProvinceMarkers.push(townMarker);

        var ridgeEl = document.createElement("div");
        ridgeEl.innerHTML = buildRidgeMarkerHtml(eff, color, isSelected, lang);
        ridgeEl.addEventListener("click", function (ev) {
          handleMapLibreMarkerPickOrSelect(ev, map, prov.id, getDragged);
        });
        var ridgeMarker = new window.maplibregl.Marker({
          element: ridgeEl,
          anchor: "center",
          draggable: cursorActive
        })
          .setLngLat([eff.ridge.lon, eff.ridge.lat])
          .addTo(map);
        if (cursorActive) {
          attachMapLibreDragHandlers(ridgeMarker, prov.id, "ridge", markDragged);
        }
        state.mlProvinceMarkers.push(ridgeMarker);

        if (cursorActive && eff.glofas_point) {
          var glofasEl = document.createElement("div");
          glofasEl.innerHTML = buildSelectedGlofasMarkerHtml(eff, lang);
          glofasEl.addEventListener("click", function (ev) {
            handleMapLibreMarkerPickOrSelect(ev, map, prov.id, getDragged);
          });
          var glofasMarker = new window.maplibregl.Marker({
            element: glofasEl,
            anchor: "top",
            offset: [0, -7],
            draggable: true
          })
            .setLngLat([eff.glofas_point.lon, eff.glofas_point.lat])
            .addTo(map);
          attachMapLibreDragHandlers(glofasMarker, prov.id, "glofas", markDragged);
          state.mlProvinceMarkers.push(glofasMarker);
        }
      })(provinces[i]);
    }

    for (var j = 0; j < gauges.length; j++) {
      (function (st) {
        var gEl = document.createElement("div");
        gEl.innerHTML = buildGaugeMarkerHtml(st, lang);
        gEl.addEventListener("click", function (ev) {
          handleMapLibreMarkerPickOrSelect(ev, map, st.province_id, null);
        });
        var gMarker = new window.maplibregl.Marker({ element: gEl, anchor: "left" })
          .setLngLat([st.lon, st.lat])
          .addTo(map);
        state.mlGaugeMarkers.push(gMarker);
      })(gauges[j]);
    }
  }

  function initMapLibreMap() {
    var data = getData();
    var styleUrl = (data.OPENFREEMAP_STYLES || {})[state.basemapKey] || data.OPENFREEMAP_STYLES.bright || data.OPENFREEMAP_STYLES.dark;

    try {
      var map = new window.maplibregl.Map({
        container: "map-container",
        style: styleUrl,
        center: data.LAOS_CENTER || [103.85, 18.25],
        zoom: 5.6,
        minZoom: 4,
        maxZoom: 15
      });

      map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");

      state.mapEngine = "maplibre";
      state.mapLibreMap = map;

      map.on("mousemove", function (ev) {
        if (ev && ev.lngLat) {
          updateCursorHudCoords(ev.lngLat.lat, ev.lngLat.lng);
        }
      });

      map.on("click", function (ev) {
        if (state.cursorPickTarget && ev && ev.lngLat) {
          handleCursorMapPick(ev.lngLat.lat, ev.lngLat.lng);
        }
      });

      map.on("style.load", function () {
        state.mapLibreLoadedOnce = true;
        state.mapLibreReady = true;
        patchOpenFreeMapEnglishOnly(map);
        syncMapLibrePairedLinks();
        syncMapLibreGibsLayer();
        syncMapLibreRainViewerLayer();
        syncMapLibreShapefileLayer();
        renderMapLibreMarkers();
      });

      map.on("error", function (ev) {
        var msg = (ev && ev.error && ev.error.message) ? String(ev.error.message) : "";
        var srcId = ev && ev.sourceId ? String(ev.sourceId) : "";

        // Handle GIBS Band 3 alternate layer fallback if NASA returns 404/tile error
        if (srcId === "gibs-sat-src" && state.gibsLayerKey) {
          var cfg = (getData().GIBS_LAYERS || {})[state.gibsLayerKey];
          var curIdx = state.gibsFallbackIndex[state.gibsLayerKey] || 0;
          if (cfg && Array.isArray(cfg.fallbackIds) && curIdx + 1 < cfg.fallbackIds.length) {
            state.gibsFallbackIndex[state.gibsLayerKey] = curIdx + 1;
            syncMapLibreGibsLayer();
            return;
          }
        }

        // Detect Web Worker / SecurityError / WebGL failures and cleanly fall back to Leaflet
        if (!state.mapLibreLoadedOnce && /worker|security|cross-origin|webgl/i.test(msg)) {
          fallbackToLeaflet(true);
        }
      });
    } catch (_) {
      fallbackToLeaflet(true);
    }
  }

  /* ---------- Leaflet Fallback Engine (Zero-Worker Safe for file://) ---------- */
  function getLeafletBasemapUrl(basemapKey) {
    if (basemapKey === "dark") {
      return {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attr: "&copy; OpenStreetMap &copy; CARTO"
      };
    }
    if (basemapKey === "positron") {
      return {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attr: "&copy; OpenStreetMap &copy; CARTO"
      };
    }
    return {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: "&copy; OpenStreetMap contributors"
    };
  }

  function syncLeafletBasemap() {
    if (!state.leafletMap || !window.L) return;
    if (state.leafletBaseLayer) {
      state.leafletMap.removeLayer(state.leafletBaseLayer);
    }
    var cfg = getLeafletBasemapUrl(state.basemapKey);
    state.leafletBaseLayer = window.L.tileLayer(cfg.url, {
      maxZoom: 18,
      zIndex: 1,
      attribution: cfg.attr
    }).addTo(state.leafletMap);
    if (state.leafletBaseLayer.bringToBack) {
      state.leafletBaseLayer.bringToBack();
    }
  }

  function syncLeafletGibsLayer() {
    if (!state.leafletMap || !window.L) return;
    if (state.leafletGibsLayer) {
      state.leafletMap.removeLayer(state.leafletGibsLayer);
      state.leafletGibsLayer = null;
    }
    if (!state.gibsLayerKey || state.gibsLayerKey === "none") return;

    var cfg = (getData().GIBS_LAYERS || {})[state.gibsLayerKey];
    if (!cfg) return;
    var layerId = getActiveGibsLayerId(state.gibsLayerKey);
    var tileUrl = getApi().getGibsTileUrl(state.gibsLayerKey, state.gibsDate, layerId, cfg.matrixSet, state.gibsSlot);
    if (!tileUrl) return;

    state.leafletGibsLayer = window.L.tileLayer(tileUrl, {
      maxNativeZoom: cfg.maxZoom || 6,
      maxZoom: 18,
      zIndex: 10,
      opacity: state.gibsOpacity,
      attribution: "NASA GIBS Himawari-9"
    }).addTo(state.leafletMap);
  }

  function syncLeafletRainViewerLayer() {
    if (!state.leafletMap || !window.L) return;
    if (state.leafletRvLayer) {
      state.leafletMap.removeLayer(state.leafletRvLayer);
      state.leafletRvLayer = null;
    }
    if (!state.rainViewerEnabled || !state.rainViewerMeta || !state.rainViewerMeta.past.length) {
      return;
    }
    var past = state.rainViewerMeta.past;
    var idx = Math.max(0, Math.min(past.length - 1, state.rainViewerFrameIdx));
    var tileUrl = getApi().buildRainViewerTileUrl(state.rainViewerMeta.host, past[idx].path);
    if (!tileUrl) return;

    state.leafletRvLayer = window.L.tileLayer(tileUrl, {
      maxNativeZoom: 7,
      maxZoom: 18,
      zIndex: 20,
      opacity: 0.72,
      attribution: "RainViewer Past 2h"
    }).addTo(state.leafletMap);
  }

  function syncLeafletSelectedPolylines(provId) {
    if (provId !== state.selectedProvinceId) return;
    var prov = findProvinceById(provId);
    if (!prov) return;
    var eff = getEffectiveProvinceData(prov);
    var level = getEffectiveAlertLevel(prov.id);
    var pairMoved = Boolean(state.cursorModeEnabled && (eff.townMoved || eff.ridgeMoved));
    var pairColor = pairMoved ? "#d946ef" : (ALERT_COLORS[level] || ALERT_COLORS.normal);

    if (state.leafletSelectedPairLine) {
      state.leafletSelectedPairLine.setLatLngs([
        [eff.town.lat, eff.town.lon],
        [eff.ridge.lat, eff.ridge.lon]
      ]);
      state.leafletSelectedPairLine.setStyle({ color: pairColor });
    }
    if (state.leafletSelectedGlofasLine && eff.glofas_point) {
      var glofasDiffers =
        Math.abs(eff.glofas_point.lat - eff.town.lat) > 0.0005 ||
        Math.abs(eff.glofas_point.lon - eff.town.lon) > 0.0005;
      state.leafletSelectedGlofasLine.setLatLngs([
        [eff.town.lat, eff.town.lon],
        [eff.glofas_point.lat, eff.glofas_point.lon]
      ]);
      state.leafletSelectedGlofasLine.setStyle({
        opacity: (state.cursorModeEnabled && glofasDiffers) ? 0.85 : 0
      });
    }
  }

  function attachLeafletMarkerEvents(marker, provId, kind, isSelected) {
    marker.on("click", function (ev) {
      if (state.cursorPickTarget) {
        var pickLl = (ev && ev.originalEvent && state.leafletMap)
          ? state.leafletMap.mouseEventToLatLng(ev.originalEvent)
          : (ev && ev.latlng);
        if (pickLl) {
          handleCursorMapPick(pickLl.lat, pickLl.lng);
        }
        return;
      }
      if (provId) {
        selectProvince(provId, true);
      }
    });

    if (isSelected && kind) {
      marker.on("drag", function () {
        var ll = marker.getLatLng();
        if (!ll) return;
        updateCursorHudCoords(ll.lat, ll.lng);
        relocateProvinceNode(provId, kind, ll.lat, ll.lng, false);
        syncLeafletSelectedPolylines(provId);
      });
      marker.on("dragend", function () {
        var ll = marker.getLatLng();
        if (!ll) return;
        updateCursorHudCoords(ll.lat, ll.lng);
        relocateProvinceNode(provId, kind, ll.lat, ll.lng, true);
      });
    }
  }

  function renderLeafletMarkers() {
    var map = state.leafletMap;
    var L = window.L;
    if (!map || !L) return;

    if (!state.leafletVectorGroup) state.leafletVectorGroup = L.layerGroup().addTo(map);
    if (!state.leafletMarkerGroup) state.leafletMarkerGroup = L.layerGroup().addTo(map);
    state.leafletVectorGroup.clearLayers();
    state.leafletMarkerGroup.clearLayers();
    state.leafletSelectedPairLine = null;
    state.leafletSelectedGlofasLine = null;
    if (!state.showStationIcons) return;

    var data = getData();
    var provinces = data.PROVINCES || [];
    var gauges = data.MRC_STATIONS || [];
    var lang = getLang();

    for (var i = 0; i < provinces.length; i++) {
      (function (prov) {
        var eff = getEffectiveProvinceData(prov);
        var level = getEffectiveAlertLevel(prov.id);
        var color = ALERT_COLORS[level] || ALERT_COLORS.normal;
        var isSelected = prov.id === state.selectedProvinceId;
        var cursorActive = Boolean(isSelected && state.cursorModeEnabled);
        var pairMoved = Boolean(state.cursorModeEnabled && (eff.townMoved || eff.ridgeMoved));
        var pairColor = pairMoved ? "#d946ef" : color;

        var pairLine = L.polyline(
          [
            [eff.town.lat, eff.town.lon],
            [eff.ridge.lat, eff.ridge.lon]
          ],
          { color: pairColor, weight: isSelected ? 2.6 : 2, opacity: isSelected ? 0.92 : 0.72, dashArray: "6, 4" }
        ).addTo(state.leafletVectorGroup);

        if (isSelected) {
          state.leafletSelectedPairLine = pairLine;
          if (cursorActive && eff.glofas_point) {
            var glofasDiffers =
              Math.abs(eff.glofas_point.lat - eff.town.lat) > 0.0005 ||
              Math.abs(eff.glofas_point.lon - eff.town.lon) > 0.0005;
            state.leafletSelectedGlofasLine = L.polyline(
              [
                [eff.town.lat, eff.town.lon],
                [eff.glofas_point.lat, eff.glofas_point.lon]
              ],
              { color: "#e879f9", weight: 1.7, opacity: glofasDiffers ? 0.85 : 0, dashArray: "2, 4" }
            ).addTo(state.leafletVectorGroup);
          }
        }

        var townIcon = L.divIcon({
          className: "",
          html: buildTownMarkerHtml(eff, color, isSelected, lang),
          iconSize: state.showDomMarkers ? [140, 22] : [13, 13],
          iconAnchor: state.showDomMarkers ? [7, 11] : [6.5, 6.5]
        });
        var townMarker = L.marker([eff.town.lat, eff.town.lon], {
          icon: townIcon,
          draggable: cursorActive
        }).addTo(state.leafletMarkerGroup);
        attachLeafletMarkerEvents(townMarker, prov.id, "town", cursorActive);

        var ridgeIcon = L.divIcon({
          className: "",
          html: buildRidgeMarkerHtml(eff, color, isSelected, lang),
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        var ridgeMarker = L.marker([eff.ridge.lat, eff.ridge.lon], {
          icon: ridgeIcon,
          draggable: cursorActive
        }).addTo(state.leafletMarkerGroup);
        attachLeafletMarkerEvents(ridgeMarker, prov.id, "ridge", cursorActive);

        if (cursorActive && eff.glofas_point) {
          var glofasIcon = L.divIcon({
            className: "",
            html: buildSelectedGlofasMarkerHtml(eff, lang),
            iconSize: [64, 34],
            iconAnchor: [32, 7]
          });
          var glofasMarker = L.marker([eff.glofas_point.lat, eff.glofas_point.lon], {
            icon: glofasIcon,
            draggable: true
          }).addTo(state.leafletMarkerGroup);
          attachLeafletMarkerEvents(glofasMarker, prov.id, "glofas", true);
        }
      })(provinces[i]);
    }

    for (var j = 0; j < gauges.length; j++) {
      (function (st) {
        var gIcon = L.divIcon({
          className: "",
          html: buildGaugeMarkerHtml(st, lang),
          iconSize: state.showDomMarkers ? [90, 18] : [10, 10],
          iconAnchor: state.showDomMarkers ? [6, 9] : [5, 5]
        });
        var gMarker = L.marker([st.lat, st.lon], { icon: gIcon })
          .addTo(state.leafletMarkerGroup);
        attachLeafletMarkerEvents(gMarker, st.province_id, null, false);
      })(gauges[j]);
    }
  }

  function initLeafletMap() {
    if (!window.L) return;
    var data = getData();
    var center = data.LAOS_CENTER || [103.85, 18.25];

    var map = window.L.map("map-container", {
      center: [center[1], center[0]],
      zoom: 6,
      zoomControl: false
    });
    window.L.control.zoom({ position: "topright" }).addTo(map);

    state.mapEngine = "leaflet";
    state.leafletMap = map;

    map.on("mousemove", function (ev) {
      if (ev && ev.latlng) {
        updateCursorHudCoords(ev.latlng.lat, ev.latlng.lng);
      }
    });

    map.on("click", function (ev) {
      if (state.cursorPickTarget && ev && ev.latlng) {
        handleCursorMapPick(ev.latlng.lat, ev.latlng.lng);
      }
    });

    map.on("mouseout", clearCursorHudCoords);

    syncLeafletBasemap();
    syncLeafletGibsLayer();
    syncLeafletRainViewerLayer();
    syncLeafletShapefileLayer();
    renderLeafletMarkers();
  }

  function fallbackToLeaflet(showBanner) {
    if (showBanner) showFileProtocolBanner();
    if (state.mapLibreMap) {
      try { state.mapLibreMap.remove(); } catch (_) {}
      state.mapLibreMap = null;
      state.mapLibreReady = false;
    }
    var container = document.getElementById("map-container");
    if (container) container.innerHTML = "";
    initLeafletMap();
  }

  function initMapEngine() {
    var isFileProto = window.location.protocol === "file:";
    if (isFileProto || typeof window.maplibregl === "undefined") {
      showFileProtocolBanner();
      initLeafletMap();
      return;
    }
    initMapLibreMap();
  }

  function applyBasemap() {
    if (state.mapEngine === "maplibre" && state.mapLibreMap) {
      var styleUrl = (getData().OPENFREEMAP_STYLES || {})[state.basemapKey] || getData().OPENFREEMAP_STYLES.bright || getData().OPENFREEMAP_STYLES.dark;
      state.mapLibreReady = false;
      state.mapLibreMap.setStyle(styleUrl, { diff: false });
    } else if (state.mapEngine === "leaflet") {
      syncLeafletBasemap();
      syncLeafletGibsLayer();
      syncLeafletRainViewerLayer();
    }
  }

  function syncSatelliteOverlay() {
    if (state.mapEngine === "maplibre") {
      syncMapLibreGibsLayer();
    } else if (state.mapEngine === "leaflet") {
      syncLeafletGibsLayer();
    }
    renderSatKpi();
  }

  function syncRainViewerOverlay() {
    if (state.mapEngine === "maplibre") {
      syncMapLibreRainViewerLayer();
    } else if (state.mapEngine === "leaflet") {
      syncLeafletRainViewerLayer();
    }
  }

  function refreshMapMarkersAndLinks() {
    if (state.mapEngine === "maplibre") {
      syncMapLibrePairedLinks();
      renderMapLibreMarkers();
    } else if (state.mapEngine === "leaflet") {
      renderLeafletMarkers();
    }
  }

  function flyToProvince(prov) {
    if (!prov) return;
    var eff = getEffectiveProvinceData(prov);
    var midLon = (eff.town.lon + eff.ridge.lon) / 2;
    var midLat = (eff.town.lat + eff.ridge.lat) / 2;

    if (state.mapEngine === "maplibre" && state.mapLibreMap) {
      state.mapLibreMap.flyTo({ center: [midLon, midLat], zoom: 8.2, duration: 750 });
    } else if (state.mapEngine === "leaflet" && state.leafletMap) {
      state.leafletMap.flyTo([midLat, midLon], 8, { duration: 0.7 });
    }
  }

  /* --------------------------------------------------------------------------
     5. RainViewer Meta & Playback
     -------------------------------------------------------------------------- */
  function updateRainViewerReadout() {
    var timeEl = document.getElementById("rv-frame-time");
    var slider = document.getElementById("slider-rv-frame");
    var past = state.rainViewerMeta && state.rainViewerMeta.past ? state.rainViewerMeta.past : [];

    if (!past.length) {
      if (timeEl) timeEl.textContent = "--:--";
      return;
    }

    var idx = Math.max(0, Math.min(past.length - 1, state.rainViewerFrameIdx));
    state.rainViewerFrameIdx = idx;
    if (slider) {
      slider.max = String(past.length - 1);
      slider.value = String(idx);
    }
    if (timeEl) {
      timeEl.textContent = formatEpochIct(past[idx].time);
    }
  }

  function stopRainViewerPlayback() {
    state.rvPlaying = false;
    if (state.rvTimer) {
      clearInterval(state.rvTimer);
      state.rvTimer = null;
    }
    var playBtn = document.getElementById("btn-rv-play");
    if (playBtn) playBtn.textContent = t("map.rvPlay");
  }

  function toggleRainViewerPlayback() {
    if (state.rvPlaying) {
      stopRainViewerPlayback();
      return;
    }
    var past = state.rainViewerMeta && state.rainViewerMeta.past ? state.rainViewerMeta.past : [];
    if (!past.length) return;

    var rvCheck = document.getElementById("toggle-rainviewer");
    if (rvCheck && !rvCheck.checked) {
      rvCheck.checked = true;
      state.rainViewerEnabled = true;
    }

    state.rvPlaying = true;
    var playBtn = document.getElementById("btn-rv-play");
    if (playBtn) playBtn.textContent = t("map.rvPause");

    syncRainViewerOverlay();
    state.rvTimer = setInterval(function () {
      var frames = state.rainViewerMeta && state.rainViewerMeta.past ? state.rainViewerMeta.past : [];
      if (!frames.length) {
        stopRainViewerPlayback();
        return;
      }
      state.rainViewerFrameIdx = (state.rainViewerFrameIdx + 1) % frames.length;
      updateRainViewerReadout();
      syncRainViewerOverlay();
    }, 850);
  }

  function loadRainViewerMetadata() {
    if (!getApi().fetchRainViewerMeta) return Promise.resolve();
    return getApi().fetchRainViewerMeta()
      .then(function (meta) {
        state.rainViewerMeta = meta;
        if (meta && meta.past && meta.past.length) {
          state.rainViewerFrameIdx = meta.past.length - 1;
        }
        updateRainViewerReadout();
        renderSatKpi();
        if (state.rainViewerEnabled) {
          syncRainViewerOverlay();
        }
      })
      .catch(function () {
        state.rainViewerMeta = null;
        renderSatKpi();
      });
  }

  /* --------------------------------------------------------------------------
     5B. 15-Day GIBS Slot & TMD Surface Synoptic Chart Sync
     -------------------------------------------------------------------------- */
  function shiftIsoDateStr(dateStr, deltaDays) {
    var api = getApi();
    var base = dateStr || state.gibsMaxDate;
    if (api.getUtcDateOffsetStr) {
      return api.getUtcDateOffsetStr(-deltaDays, base);
    }
    return base;
  }

  function clampGibsDate(dateStr) {
    var api = getApi();
    var maxD = state.gibsMaxDate || (api.getUtcTodayDateStr ? api.getUtcTodayDateStr() : new Date().toISOString().slice(0, 10));
    var minD = state.gibsMinDate || maxD;
    var clean = typeof dateStr === "string" ? dateStr.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return maxD;
    if (clean < minD) return minD;
    if (clean > maxD) return maxD;
    return clean;
  }

  function syncNightHint() {
    var hintEl = document.getElementById("gibs-night-hint");
    if (!hintEl) return;
    var api = getApi();
    var isDark = Boolean(api.isGibsDarkSlot && api.isGibsDarkSlot(state.gibsLayerKey, state.gibsDate, state.gibsSlot));
    hintEl.classList.toggle("hidden", !isDark);
  }

  function syncTmdSlotPills() {
    var pills = document.querySelectorAll(".tmd-slot-pill[data-slot]");
    for (var i = 0; i < pills.length; i++) {
      var slot = pills[i].getAttribute("data-slot");
      var isActive = slot === state.gibsSlot;
      pills[i].classList.toggle("active", isActive);
      pills[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }

    var echoEl = document.getElementById("tmd-date-echo");
    if (echoEl) {
      var slotText = state.gibsSlot === "latest" ? t("tmd.slotLatest") : (state.gibsSlot + ":00 UTC");
      echoEl.textContent = "UTC " + (state.gibsDate || "--") + " • " + slotText;
    }
  }

  function renderTmdStatusFromLoaded() {
    var statusEl = document.getElementById("tmd-chart-status");
    var metaUrlEl = document.getElementById("tmd-meta-url");
    var emptyMsgEl = document.getElementById("tmd-chart-empty-msg");
    var expandBtn = document.getElementById("btn-expand-tmd");
    var lbTitle = document.getElementById("tmd-lightbox-title");
    var cand = state.tmdLoadedMeta;

    if (state.tmdFetchStatus === "ok" && cand && cand.url) {
      if (statusEl) {
        statusEl.className = "status-pill status-ok mono-num";
        statusEl.textContent = cand.ictDisplay + (cand.isExactMatch ? "" : " (" + t("tmd.prevFallbackTag") + ")");
      }
      if (metaUrlEl) metaUrlEl.textContent = cand.url;
      if (expandBtn) expandBtn.disabled = false;
      if (lbTitle) lbTitle.textContent = t("tmd.title") + " — " + cand.ictDisplay;
      return;
    }

    if (expandBtn) expandBtn.disabled = true;
    if (lbTitle) lbTitle.textContent = t("tmd.title");

    if (state.tmdFetchStatus === "error") {
      if (statusEl) {
        statusEl.className = "status-pill status-error mono-num";
        statusEl.textContent = t("tmd.statusError");
      }
      if (emptyMsgEl) emptyMsgEl.textContent = t("tmd.emptyError");
      return;
    }

    if (statusEl) {
      statusEl.className = "status-pill status-loading mono-num";
      statusEl.textContent = t("tmd.statusLoading");
    }
    if (emptyMsgEl) emptyMsgEl.textContent = t("tmd.loadingHint");
  }

  function openTmdLightbox() {
    var cand = state.tmdLoadedMeta;
    if (!cand || !cand.url) return;
    var lbEl = document.getElementById("tmd-lightbox");
    var lbImg = document.getElementById("img-tmd-lightbox");
    if (lbImg) {
      lbImg.src = cand.url;
      lbImg.alt = "TMD Surface Synoptic Chart " + cand.ictDisplay;
    }
    renderTmdStatusFromLoaded();
    if (lbEl) lbEl.classList.remove("hidden");
  }

  function closeTmdLightbox() {
    var lbEl = document.getElementById("tmd-lightbox");
    if (lbEl) lbEl.classList.add("hidden");
  }

  function syncTmdSynopticChart() {
    var api = getApi();
    var imgEl = document.getElementById("img-tmd-synoptic");
    var emptyEl = document.getElementById("tmd-chart-empty");
    var metaUrlEl = document.getElementById("tmd-meta-url");
    var lbEl = document.getElementById("tmd-lightbox");
    var lbImg = document.getElementById("img-tmd-lightbox");

    var candidates = api.getTmdSynopticCandidates
      ? api.getTmdSynopticCandidates(state.gibsDate, state.gibsSlot, state.gibsMinDate)
      : [];

    var seq = ++state.tmdLoadSeq;
    state.tmdLoadedMeta = null;
    state.tmdFetchStatus = "loading";

    if (imgEl) imgEl.classList.add("hidden");
    if (emptyEl) emptyEl.classList.remove("hidden");
    if (metaUrlEl) metaUrlEl.textContent = candidates.length ? candidates[0].url : "--";
    renderTmdStatusFromLoaded();

    function tryNext(idx) {
      if (seq !== state.tmdLoadSeq) return;
      if (!candidates || idx >= candidates.length) {
        state.tmdLoadedMeta = null;
        state.tmdFetchStatus = "error";
        if (imgEl) {
          imgEl.removeAttribute("src");
          imgEl.classList.add("hidden");
        }
        if (emptyEl) emptyEl.classList.remove("hidden");
        if (metaUrlEl) metaUrlEl.textContent = candidates.length ? candidates[0].url : "--";
        renderTmdStatusFromLoaded();
        return;
      }

      var cand = candidates[idx];
      var probe = new Image();
      probe.referrerPolicy = "no-referrer";
      probe.onload = function () {
        if (seq !== state.tmdLoadSeq) return;
        if (!probe.naturalWidth) {
          tryNext(idx + 1);
          return;
        }
        state.tmdLoadedMeta = cand;
        state.tmdFetchStatus = "ok";
        if (imgEl) {
          imgEl.src = cand.url;
          imgEl.alt = "TMD Surface Synoptic Chart " + cand.ictDisplay;
          imgEl.classList.remove("hidden");
        }
        if (emptyEl) emptyEl.classList.add("hidden");
        if (lbImg && lbEl && !lbEl.classList.contains("hidden")) {
          lbImg.src = cand.url;
          lbImg.alt = "TMD Surface Synoptic Chart " + cand.ictDisplay;
        }
        renderTmdStatusFromLoaded();
      };
      probe.onerror = function () {
        if (seq !== state.tmdLoadSeq) return;
        tryNext(idx + 1);
      };
      probe.src = cand.url;
    }

    tryNext(0);
  }

  function applyGibsDateSlot(newDate, newSlot) {
    var clampedDate = clampGibsDate(newDate !== undefined ? newDate : state.gibsDate);
    var rawSlot = (newSlot !== undefined && newSlot !== null) ? String(newSlot) : state.gibsSlot;
    var validSlots = { latest: true, "00": true, "06": true, "12": true, "18": true };
    var cleanSlot = validSlots[rawSlot] ? rawSlot : "latest";

    state.gibsDate = clampedDate;
    state.gibsSlot = cleanSlot;

    var inputGibsDate = document.getElementById("input-gibs-date");
    if (inputGibsDate) inputGibsDate.value = clampedDate;

    var selectGibsSlot = document.getElementById("select-gibs-slot");
    if (selectGibsSlot) selectGibsSlot.value = cleanSlot;

    var prevBtn = document.getElementById("btn-gibs-prev-day");
    if (prevBtn) prevBtn.disabled = Boolean(state.gibsMinDate && clampedDate <= state.gibsMinDate);

    var nextBtn = document.getElementById("btn-gibs-next-day");
    if (nextBtn) nextBtn.disabled = Boolean(state.gibsMaxDate && clampedDate >= state.gibsMaxDate);

    syncTmdSlotPills();
    syncSatelliteOverlay();
    syncNightHint();
    syncTmdSynopticChart();
    renderSatKpi();
  }

  /* --------------------------------------------------------------------------
     6. Top 4 KPI Cards
     -------------------------------------------------------------------------- */
  function renderSatKpi() {
    var valEl = document.getElementById("kpi-sat-status");
    var subEl = document.getElementById("kpi-sat-status-sub");
    if (!valEl || !subEl) return;

    var lang = getLang();
    var gibsCfg = (getData().GIBS_LAYERS || {})[state.gibsLayerKey];
    var gibsName = state.gibsLayerKey === "none"
      ? t("map.gibsNone")
      : (gibsCfg ? (lang === "th" ? gibsCfg.label_th : gibsCfg.label_en) : state.gibsLayerKey);

    var rvCount = state.rainViewerMeta && state.rainViewerMeta.past ? state.rainViewerMeta.past.length : 0;
    var rvLabel = rvCount > 0 ? "RV " + rvCount + (lang === "th" ? " เฟรม" : " fr") : "RV Offline";

    valEl.textContent = gibsName + " • " + rvLabel;

    var api = getApi();
    var spec = api.resolveGibsTimeSpec ? api.resolveGibsTimeSpec(state.gibsDate, state.gibsSlot) : null;
    var dateNote = (!spec || spec.resolvedSlot === "latest")
      ? (lang === "th" ? "ล่าสุด (10 นาที GIBS)" : "Latest 10m GIBS scan")
      : (spec.cleanDate + " " + spec.resolvedSlot + ":00Z");
    subEl.textContent = dateNote + (state.rainViewerEnabled ? " | Radar ON" : " | Radar OFF");
  }

  function renderKpis() {
    var critEl = document.getElementById("kpi-critical");
    var critSubEl = document.getElementById("kpi-critical-sub");
    var rainEl = document.getElementById("kpi-max-rain-24h");
    var rainSubEl = document.getElementById("kpi-max-rain-24h-sub");
    var flowEl = document.getElementById("kpi-peak-discharge");
    var flowSubEl = document.getElementById("kpi-peak-discharge-sub");

    var provinces = getData().PROVINCES || [];
    var lang = getLang();

    if (!state.hydromet) {
      if (critEl) critEl.textContent = "-- / " + provinces.length;
      if (rainEl) rainEl.textContent = "-- mm";
      if (flowEl) flowEl.textContent = "-- m³/s";
      renderSatKpi();
      return;
    }

    var highCount = 0;
    var watchCount = 0;
    var peakRainVal = -1;
    var peakRainProv = null;
    var peakRainSide = "ridge";
    var peakTownAtHot = 0;
    var peakRidgeAtHot = 0;

    var peakFlowVal = -1;
    var peakFlowProv = null;
    var peakFlowSurge = null;

    for (var i = 0; i < provinces.length; i++) {
      var p = provinces[i];
      var m = getProvinceMetrics(p.id);
      if (!m) continue;

      if (m.alertLevel === "alarm" || m.alertLevel === "flood") highCount += 1;
      else if (m.alertLevel === "watch") watchCount += 1;

      var tRain = m.town ? m.town.rain24h : 0;
      var rRain = m.ridge ? m.ridge.rain24h : 0;
      var localMax = Math.max(tRain, rRain);
      if (localMax > peakRainVal) {
        peakRainVal = localMax;
        peakRainProv = p;
        peakRainSide = rRain >= tRain ? "ridge" : "town";
        peakTownAtHot = tRain;
        peakRidgeAtHot = rRain;
      }

      if (m.glofas && typeof m.glofas.peakForecastMax === "number") {
        if (m.glofas.peakForecastMax > peakFlowVal) {
          peakFlowVal = m.glofas.peakForecastMax;
          peakFlowProv = p;
          peakFlowSurge = m.glofas.surgeRatio;
        }
      }
    }

    if (critEl) critEl.textContent = highCount + " / " + provinces.length;
    if (critSubEl) {
      critSubEl.textContent = lang === "th"
        ? "เตือนภัย/วิกฤต " + highCount + " แขวง • เฝ้าระวัง " + watchCount + " แขวง"
        : highCount + " Alarm/Danger • " + watchCount + " Watch";
    }

    if (rainEl) {
      rainEl.textContent = peakRainVal >= 0 ? formatNumber(peakRainVal, 1) + " mm" : "-- mm";
    }
    if (rainSubEl && peakRainProv) {
      var pName = lang === "th" ? peakRainProv.name_th : peakRainProv.name_en;
      var sideTag = peakRainSide === "ridge"
        ? (lang === "th" ? "สันเขา" : "Ridge")
        : (lang === "th" ? "ตัวเมือง" : "Town");
      rainSubEl.textContent =
        pName + " (" + sideTag + ") • Town " + formatNumber(peakTownAtHot, 1) +
        " vs Ridge " + formatNumber(peakRidgeAtHot, 1) + " mm";
    }

    if (flowEl) {
      flowEl.textContent = peakFlowVal >= 0 ? formatCommaNumber(peakFlowVal, 0) + " m³/s" : "-- m³/s";
    }
    if (flowSubEl && peakFlowProv) {
      var gpName = lang === "th"
        ? (peakFlowProv.glofas_point ? peakFlowProv.glofas_point.label_th : peakFlowProv.name_th)
        : (peakFlowProv.glofas_point ? peakFlowProv.glofas_point.label_en : peakFlowProv.name_en);
      var surgeText = peakFlowSurge !== null ? " • " + peakFlowSurge.toFixed(2) + "x base" : "";
      flowSubEl.textContent = gpName + surgeText;
    }

    renderSatKpi();
  }

  /* --------------------------------------------------------------------------
     7. Detail Investigation Panel & ECharts
     -------------------------------------------------------------------------- */
  function renderDetailPanel() {
    var prov = findProvinceById(state.selectedProvinceId);
    if (!prov) return;

    var eff = getEffectiveProvinceData(prov);
    var ov = getCustomOverride(prov.id);
    var isCustom = eff.isCustom;
    var isLoadingCustom = Boolean(isCustom && ov && ov.loading);
    var lang = getLang();
    var m = getEffectiveMetrics(prov.id);
    var level = m && m.alertLevel ? m.alertLevel : getProvinceAlertLevel(prov.id);

    var resetBtn = document.getElementById("btn-reset-custom-nodes");
    if (resetBtn) {
      resetBtn.classList.toggle("hidden", !isCustom);
    }

    var titleEl = document.getElementById("detail-title");
    if (titleEl) {
      titleEl.textContent = (lang === "th" ? prov.name_th : prov.name_en) +
        " — " + (lang === "th" ? prov.basin_th : prov.basin_en);
    }

    var badgesEl = document.getElementById("detail-badges");
    if (badgesEl) {
      var badgesHtml =
        '<span class="status-chip chip-' + escapeHtml(level) + '">' +
          escapeHtml(t("status." + level)) +
        "</span>";

      if (isCustom) {
        badgesHtml +=
          '<span class="status-chip chip-custom">' +
            escapeHtml(t("picker.customBadge")) +
          "</span>";
      }

      if (isLoadingCustom) {
        badgesHtml +=
          '<span class="status-chip chip-loading">' +
            escapeHtml(t("picker.loading")) +
          "</span>";
      } else if (isCustom && ov && ov.error) {
        badgesHtml +=
          '<span class="status-chip chip-flood">' +
            escapeHtml(ov.error) +
          "</span>";
      }

      if (!eff.glofasMoved && prov.has_mekong_gauge && prov.mrc_station_code) {
        badgesHtml +=
          '<span class="status-chip chip-watch">' +
            escapeHtml(t("badge.mekongGauge")) + " (" + escapeHtml(prov.mrc_station_code) + ": " +
            prov.mrc_alarm_m.toFixed(1) + "m / " + prov.mrc_flood_m.toFixed(1) + "m)" +
          "</span>";
      } else {
        badgesHtml +=
          '<span class="status-chip chip-neutral">' +
            escapeHtml(t("badge.ungauged")) +
          "</span>";
      }
      badgesEl.innerHTML = badgesHtml;
    }

    var elevBox = document.getElementById("detail-elevation-compare");
    if (elevBox) {
      var townGridNum = m && m.town && m.town.gridElevationM !== null ? m.town.gridElevationM : null;
      var ridgeGridNum = m && m.ridge && m.ridge.gridElevationM !== null ? m.ridge.gridElevationM : null;

      var townLabel = lang === "th" ? eff.town.label_th : eff.town.label_en;
      var ridgeLabel = lang === "th" ? eff.ridge.label_th : eff.ridge.label_en;
      var riverNote = lang === "th" ? prov.river_note_th : prov.river_note_en;
      var townCoords = eff.town.lat.toFixed(4) + ", " + eff.town.lon.toFixed(4);
      var ridgeCoords = eff.ridge.lat.toFixed(4) + ", " + eff.ridge.lon.toFixed(4);
      var glofasCoords = eff.glofas_point.lat.toFixed(4) + ", " + eff.glofas_point.lon.toFixed(4);

      if (isCustom) {
        var townDemTxt = townGridNum !== null ? townGridNum + " m DEM" : (isLoadingCustom ? "..." : "--");
        var ridgeDemTxt = ridgeGridNum !== null ? ridgeGridNum + " m DEM" : (isLoadingCustom ? "..." : "--");
        var deltaDem = (townGridNum !== null && ridgeGridNum !== null) ? (ridgeGridNum - townGridNum) : null;
        var deltaDemTxt = deltaDem !== null
          ? ((deltaDem >= 0 ? "+" : "") + deltaDem + " m")
          : (isLoadingCustom ? "..." : "--");

        elevBox.innerHTML =
          "<div><strong>" + escapeHtml(townLabel) + "</strong> <span class=\"mono-num\">(" + townCoords + ")</span>: " +
          escapeHtml(townDemTxt) + " &nbsp;→&nbsp; <strong>" + escapeHtml(ridgeLabel) +
          "</strong> <span class=\"mono-num\">(" + ridgeCoords + ")</span>: " + escapeHtml(ridgeDemTxt) +
          " (<strong>Δ Elev: " + escapeHtml(deltaDemTxt) + "</strong>)</div>" +
          '<div style="margin-top:4px;opacity:0.85;">GloFAS <span class="mono-num">(' + glofasCoords + ")</span>" +
          (!eff.glofasMoved && riverNote ? " • " + escapeHtml(riverNote) : "") + "</div>";
      } else {
        var deltaElev = prov.ridge.elev_m - prov.town.elev_m;
        var townGridElev = townGridNum !== null ? townGridNum + " m" : "--";
        var ridgeGridElev = ridgeGridNum !== null ? ridgeGridNum + " m" : "--";

        elevBox.innerHTML =
          "<div><strong>" + escapeHtml(townLabel) + "</strong> <span class=\"mono-num\">(" + townCoords + ")</span>: " +
          prov.town.elev_m + " m MSL (Grid: " + escapeHtml(townGridElev) + ") &nbsp;→&nbsp; <strong>" +
          escapeHtml(ridgeLabel) + "</strong> <span class=\"mono-num\">(" + ridgeCoords + ")</span>: " +
          prov.ridge.elev_m + " m MSL (Grid: " + escapeHtml(ridgeGridElev) + ", <strong>+" + deltaElev + " m</strong>)</div>" +
          '<div style="margin-top:4px;opacity:0.85;">' + escapeHtml(riverNote) +
          ' • GloFAS <span class="mono-num">(' + glofasCoords + ")</span></div>";
      }
    }

    var townRainEl = document.getElementById("detail-town-rain");
    if (townRainEl) {
      townRainEl.textContent = isLoadingCustom
        ? "..."
        : (m && m.town ? formatNumber(m.town.rain24h, 1) + " / " + formatNumber(m.town.rain5d, 0) + " mm" : "--");
    }

    var ridgeRainEl = document.getElementById("detail-ridge-rain");
    if (ridgeRainEl) {
      ridgeRainEl.textContent = isLoadingCustom
        ? "..."
        : (m && m.ridge ? formatNumber(m.ridge.rain24h, 1) + " / " + formatNumber(m.ridge.rain5d, 0) + " mm" : "--");
    }

    var flowEl = document.getElementById("detail-glofas-flow");
    if (flowEl) {
      if (isLoadingCustom) {
        flowEl.textContent = "...";
      } else if (m && m.glofas && m.glofas.peakForecastMax !== null) {
        var surgeStr = m.glofas.surgeRatio !== null ? " (" + m.glofas.surgeRatio.toFixed(2) + "x)" : "";
        flowEl.textContent = formatCommaNumber(m.glofas.peakForecastMax, 0) + " m³/s" + surgeStr;
      } else {
        flowEl.textContent = "--";
      }
    }

    updatePointExportButtonState();
    renderCharts();
  }

  function getChartThemePalette() {
    var dark = isDarkMode();
    return {
      textColor: dark ? "#a1a1aa" : "#52525b",
      titleColor: dark ? "#fafafa" : "#09090b",
      gridLine: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      tooltipBg: dark ? "rgba(12, 12, 15, 0.96)" : "rgba(255, 255, 255, 0.97)",
      tooltipBorder: dark ? "#2e2e38" : "#d4d4d8",
      tooltipText: dark ? "#fafafa" : "#09090b"
    };
  }

  function formatShortHourLabel(isoStr) {
    if (!isoStr || isoStr.length < 16) return isoStr || "";
    return isoStr.slice(5, 10) + " " + isoStr.slice(11, 16);
  }

  function ensureChartReady(chart, hasData, isLoadingCustom, pal) {
    if (!hasData) {
      chart.hideLoading();
      chart.clear();
      chart.setOption({
        title: {
          text: isLoadingCustom ? t("picker.loading") : t("header.syncChecking"),
          left: "center",
          top: "middle",
          textStyle: { color: pal.textColor, fontSize: 12, fontWeight: 500 }
        }
      });
      return false;
    }

    if (isLoadingCustom) {
      chart.showLoading({
        text: t("picker.loading"),
        color: "#2563eb",
        textColor: pal.textColor,
        maskColor: isDarkMode() ? "rgba(9, 9, 11, 0.55)" : "rgba(255, 255, 255, 0.65)"
      });
    } else {
      chart.hideLoading();
    }
    return true;
  }

  var mapResizeRafId = 0;

  function canRenderChartBox(dom) {
    if (!dom) return false;
    if (!state.detailBodyExpanded || !state.chartsVisible) return false;
    if (dom.offsetParent === null) return false;
    return dom.clientWidth > 0 && dom.clientHeight > 0;
  }

  function resizeMapEngineSoon() {
    if (mapResizeRafId) {
      window.cancelAnimationFrame(mapResizeRafId);
    }
    mapResizeRafId = window.requestAnimationFrame(function () {
      mapResizeRafId = 0;
      if (state.mapEngine === "maplibre" && state.mapLibreMap) {
        state.mapLibreMap.resize();
      } else if (state.mapEngine === "leaflet" && state.leafletMap) {
        state.leafletMap.invalidateSize({ animate: false });
      }
    });
  }

  function attachMapResizeObserver() {
    var container = document.getElementById("map-container");
    if (!container || typeof window.ResizeObserver !== "function") return;
    if (state.mapResizeObserver) {
      state.mapResizeObserver.disconnect();
      state.mapResizeObserver = null;
    }
    var lastW = container.clientWidth;
    var lastH = container.clientHeight;
    state.mapResizeObserver = new window.ResizeObserver(function () {
      var w = container.clientWidth;
      var h = container.clientHeight;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      resizeMapEngineSoon();
    });
    state.mapResizeObserver.observe(container);
  }

  function syncChartsOnReveal() {
    if (!state.detailBodyExpanded || !state.chartsVisible) return;
    window.requestAnimationFrame(function () {
      if (!state.detailBodyExpanded || !state.chartsVisible) return;
      if (state.chartsNeedRender || !state.rainChart || !state.floodChart) {
        renderCharts();
      }
      if (state.rainChart) state.rainChart.resize();
      if (state.floodChart) state.floodChart.resize();
    });
  }

  function syncSectionVisibilityUi() {
    var workspaceSplit = document.getElementById("workspace-split");
    var tmdBody = document.getElementById("tmd-synoptic-body");
    var btnToggleTmd = document.getElementById("btn-toggle-tmd");
    var tmdCollapsed = !state.tmdExpanded;
    if (tmdBody) {
      tmdBody.classList.toggle("collapsed", tmdCollapsed);
    }
    if (workspaceSplit) {
      workspaceSplit.classList.toggle("is-tmd-collapsed", tmdCollapsed);
    }
    if (btnToggleTmd) {
      btnToggleTmd.setAttribute("aria-expanded", tmdCollapsed ? "false" : "true");
    }

    var detailBody = document.getElementById("detail-panel-body");
    var btnToggleDetail = document.getElementById("btn-toggle-detail");
    if (detailBody) {
      detailBody.classList.toggle("collapsed", !state.detailBodyExpanded);
    }
    if (btnToggleDetail) {
      btnToggleDetail.setAttribute("aria-expanded", state.detailBodyExpanded ? "true" : "false");
      btnToggleDetail.classList.toggle("is-active", !state.detailBodyExpanded);
    }

    var chartsStack = document.getElementById("charts-stack");
    var btnToggleCharts = document.getElementById("btn-toggle-charts");
    var chartsEffectivelyShown = state.detailBodyExpanded && state.chartsVisible;
    if (chartsStack) {
      chartsStack.classList.toggle("collapsed", !state.chartsVisible);
    }
    if (btnToggleCharts) {
      btnToggleCharts.textContent = t(chartsEffectivelyShown ? "detail.hideCharts" : "detail.showCharts");
      btnToggleCharts.setAttribute("aria-expanded", chartsEffectivelyShown ? "true" : "false");
      btnToggleCharts.setAttribute("aria-pressed", chartsEffectivelyShown ? "false" : "true");
      btnToggleCharts.classList.toggle("is-active", !chartsEffectivelyShown);
    }

    var tableBody = document.getElementById("table-panel-body");
    var btnToggleTable = document.getElementById("btn-toggle-table");
    if (tableBody) {
      tableBody.classList.toggle("collapsed", !state.tableExpanded);
    }
    if (btnToggleTable) {
      btnToggleTable.textContent = t(state.tableExpanded ? "table.hideTable" : "table.showTable");
      btnToggleTable.setAttribute("aria-expanded", state.tableExpanded ? "true" : "false");
      btnToggleTable.setAttribute("aria-pressed", state.tableExpanded ? "false" : "true");
      btnToggleTable.classList.toggle("is-active", !state.tableExpanded);
    }

    var bothAnalysisHidden = (!state.detailBodyExpanded || !state.chartsVisible) && !state.tableExpanded;
    var btnFocus = document.getElementById("btn-focus-synoptic");
    var btnFocusText = document.getElementById("btn-focus-synoptic-text");
    if (btnFocusText) {
      btnFocusText.textContent = t(bothAnalysisHidden ? "header.showAnalysis" : "header.hideAnalysis");
    } else if (btnFocus) {
      btnFocus.textContent = t(bothAnalysisHidden ? "header.showAnalysis" : "header.hideAnalysis");
    }
    if (btnFocus) {
      btnFocus.setAttribute("aria-pressed", bothAnalysisHidden ? "true" : "false");
      btnFocus.setAttribute("title", t("header.focusSynopticTitle"));
      btnFocus.classList.toggle("is-active", bothAnalysisHidden);
    }
  }

  function setDetailBodyExpanded(expanded) {
    var next = Boolean(expanded);
    state.detailBodyExpanded = next;
    if (!next) {
      state.chartsNeedRender = true;
      if (state.cursorPickTarget) {
        setCursorPickTarget(null);
      }
    }
    syncSectionVisibilityUi();
    if (next && state.chartsVisible) {
      syncChartsOnReveal();
    }
  }

  function setChartsVisible(visible) {
    var next = Boolean(visible);
    state.chartsVisible = next;
    if (next && !state.detailBodyExpanded) {
      state.detailBodyExpanded = true;
    }
    if (!next) {
      state.chartsNeedRender = true;
    }
    syncSectionVisibilityUi();
    if (next) {
      syncChartsOnReveal();
    }
  }

  function setTableExpanded(expanded) {
    state.tableExpanded = Boolean(expanded);
    syncSectionVisibilityUi();
  }

  function toggleSynopticFocusMode() {
    var bothHidden = (!state.detailBodyExpanded || !state.chartsVisible) && !state.tableExpanded;
    if (bothHidden) {
      state.detailBodyExpanded = true;
      state.chartsVisible = true;
      state.tableExpanded = true;
      syncSectionVisibilityUi();
      syncChartsOnReveal();
    } else {
      state.chartsVisible = false;
      state.tableExpanded = false;
      state.chartsNeedRender = true;
      syncSectionVisibilityUi();
    }
  }

  function renderRainModelsChart(eff, m, pal, isLoadingCustom) {
    var dom = document.getElementById("chart-rain-models");
    if (!dom || !window.echarts) return;
    if (!canRenderChartBox(dom)) {
      state.chartsNeedRender = true;
      return;
    }

    if (!state.rainChart) {
      state.rainChart = window.echarts.init(dom);
    }

    var hasData = Boolean(m && m.ridge && m.ridge.hourlyTime && m.ridge.hourlyTime.length);
    if (!ensureChartReady(state.rainChart, hasData, isLoadingCustom, pal)) {
      return;
    }

    var xLabels = m.ridge.hourlyTime.map(formatShortHourLabel);
    var series = [
      {
        name: t("chart.ridgeSeries"),
        type: "line",
        data: m.ridge.meanHourlyPrecip,
        smooth: 0.25,
        showSymbol: false,
        lineStyle: { width: 2.5, color: "#f59e0b" },
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.14)" },
        z: 5
      },
      {
        name: t("chart.townSeries"),
        type: "line",
        data: m.town ? m.town.meanHourlyPrecip : [],
        smooth: 0.25,
        showSymbol: false,
        lineStyle: { width: 2.5, color: "#06b6d4" },
        itemStyle: { color: "#06b6d4" },
        areaStyle: { color: "rgba(6, 182, 212, 0.12)" },
        z: 4
      }
    ];

    var modelDefs = getData().FORECAST_MODELS || [];
    for (var i = 0; i < modelDefs.length; i++) {
      var md = modelDefs[i];
      var mObj = m.ridge.byModel && m.ridge.byModel[md.id];
      if (mObj && mObj.precip && mObj.precip.length) {
        series.push({
          name: "Ridge: " + md.label,
          type: "line",
          data: mObj.precip,
          smooth: 0.2,
          showSymbol: false,
          lineStyle: { width: 1.3, type: "dashed", color: md.color, opacity: 0.85 },
          itemStyle: { color: md.color },
          z: 2
        });
      }
    }

    state.rainChart.setOption(
      {
        animationDuration: 350,
        tooltip: {
          trigger: "axis",
          backgroundColor: pal.tooltipBg,
          borderColor: pal.tooltipBorder,
          textStyle: { color: pal.tooltipText, fontSize: 11 }
        },
        legend: {
          type: "scroll",
          top: 0,
          textStyle: { color: pal.textColor, fontSize: 10.5 }
        },
        grid: { left: 42, right: 16, top: 38, bottom: 28 },
        xAxis: {
          type: "category",
          data: xLabels,
          axisLabel: { color: pal.textColor, fontSize: 10, interval: 23 },
          axisLine: { lineStyle: { color: pal.gridLine } }
        },
        yAxis: {
          type: "value",
          name: "mm/h",
          nameTextStyle: { color: pal.textColor, fontSize: 10 },
          axisLabel: { color: pal.textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: pal.gridLine } }
        },
        series: series
      },
      true
    );
  }

  function renderFloodHydrographChart(eff, m, pal, isLoadingCustom) {
    var dom = document.getElementById("chart-flood-hydrograph");
    if (!dom || !window.echarts) return;
    if (!canRenderChartBox(dom)) {
      state.chartsNeedRender = true;
      return;
    }

    if (!state.floodChart) {
      state.floodChart = window.echarts.init(dom);
    }

    var hasData = Boolean(m && m.glofas && m.glofas.dailyTime && m.glofas.dailyTime.length);
    if (!ensureChartReady(state.floodChart, hasData, isLoadingCustom, pal)) {
      return;
    }

    var prov = eff.province;
    var g = m.glofas;
    var xDates = g.dailyTime.map(function (d) { return d.slice(5); });
    var iqrDiff = [];
    for (var i = 0; i < g.dailyTime.length; i++) {
      var low = typeof g.p25[i] === "number" ? g.p25[i] : 0;
      var high = typeof g.p75[i] === "number" ? g.p75[i] : low;
      iqrDiff.push(Number(Math.max(0, high - low).toFixed(2)));
    }

    var todayMarkIdx = Math.min(4, Math.max(0, xDates.length - 1));
    var markLineData = [
      {
        xAxis: todayMarkIdx,
        lineStyle: { color: "#a1a1aa", type: "dotted", width: 1.4 },
        label: { formatter: "Today", color: pal.textColor, fontSize: 10 }
      }
    ];

    if (g.baselineMean !== null) {
      markLineData.push({
        yAxis: g.baselineMean,
        lineStyle: { color: "#10b981", type: "dashed", width: 1.4 },
        label: {
          formatter: "5d Base: " + formatCommaNumber(g.baselineMean, 0),
          position: "insideEndTop",
          color: "#10b981",
          fontSize: 10
        }
      });
    }

    var gaugeBanner = (!eff.glofasMoved && prov.has_mekong_gauge)
      ? "MRC " + prov.mrc_station_code + ": Alarm " + prov.mrc_alarm_m.toFixed(1) + "m / Flood " + prov.mrc_flood_m.toFixed(1) + "m (Model m³/s != Stage m)"
      : "Model-derived GloFAS v4.0 (m³/s)";

    state.floodChart.setOption(
      {
        animationDuration: 350,
        tooltip: {
          trigger: "axis",
          backgroundColor: pal.tooltipBg,
          borderColor: pal.tooltipBorder,
          textStyle: { color: pal.tooltipText, fontSize: 11 },
          formatter: function (params) {
            if (!params || !params.length) return "";
            var idx = params[0].dataIndex;
            var dateFull = g.dailyTime[idx] || "";
            var meanV = typeof g.mean[idx] === "number" ? formatCommaNumber(g.mean[idx], 1) : "--";
            var maxV = typeof g.max[idx] === "number" ? formatCommaNumber(g.max[idx], 1) : "--";
            var p25V = typeof g.p25[idx] === "number" ? formatCommaNumber(g.p25[idx], 1) : "--";
            var p75V = typeof g.p75[idx] === "number" ? formatCommaNumber(g.p75[idx], 1) : "--";
            return (
              "<strong>" + escapeHtml(dateFull) + "</strong><br/>" +
              escapeHtml(t("chart.flowMax")) + ": <b>" + maxV + " m³/s</b><br/>" +
              escapeHtml(t("chart.flowMean")) + ": <b>" + meanV + " m³/s</b><br/>" +
              "P25–P75 IQR: " + p25V + " – " + p75V + " m³/s"
            );
          }
        },
        legend: {
          top: 0,
          data: [t("chart.flowMean"), t("chart.flowMax"), "P25–P75 IQR"],
          textStyle: { color: pal.textColor, fontSize: 10.5 }
        },
        graphic: [
          {
            type: "text",
            right: 14,
            bottom: 34,
            style: {
              text: gaugeBanner,
              fill: pal.textColor,
              font: "10px 'JetBrains Mono', monospace"
            }
          }
        ],
        grid: { left: 52, right: 16, top: 38, bottom: 28 },
        xAxis: {
          type: "category",
          data: xDates,
          axisLabel: { color: pal.textColor, fontSize: 10 },
          axisLine: { lineStyle: { color: pal.gridLine } }
        },
        yAxis: {
          type: "value",
          name: "m³/s",
          nameTextStyle: { color: pal.textColor, fontSize: 10 },
          axisLabel: { color: pal.textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: pal.gridLine } }
        },
        series: [
          {
            name: "__p25_base",
            type: "line",
            stack: "iqr",
            data: g.p25,
            showSymbol: false,
            silent: true,
            lineStyle: { opacity: 0 },
            areaStyle: { opacity: 0 }
          },
          {
            name: "P25–P75 IQR",
            type: "line",
            stack: "iqr",
            data: iqrDiff,
            showSymbol: false,
            lineStyle: { opacity: 0 },
            itemStyle: { color: "rgba(37, 99, 235, 0.35)" },
            areaStyle: { color: "rgba(37, 99, 235, 0.22)" }
          },
          {
            name: t("chart.flowMean"),
            type: "line",
            data: g.mean,
            smooth: 0.25,
            showSymbol: false,
            lineStyle: { width: 2.5, color: "#2563eb" },
            itemStyle: { color: "#2563eb" },
            markLine: {
              symbol: "none",
              silent: true,
              data: markLineData
            }
          },
          {
            name: t("chart.flowMax"),
            type: "line",
            data: g.max,
            smooth: 0.25,
            showSymbol: false,
            lineStyle: { width: 2, type: "dashed", color: "#ef4444" },
            itemStyle: { color: "#ef4444" }
          }
        ]
      },
      true
    );
  }

  function renderCharts() {
    var prov = findProvinceById(state.selectedProvinceId);
    if (!prov) return;
    if (!state.detailBodyExpanded || !state.chartsVisible) {
      state.chartsNeedRender = true;
      return;
    }
    state.chartsNeedRender = false;
    var eff = getEffectiveProvinceData(prov);
    var ov = getCustomOverride(prov.id);
    var isLoadingCustom = Boolean(eff.isCustom && ov && ov.loading);
    var m = getEffectiveMetrics(prov.id);
    var pal = getChartThemePalette();
    renderRainModelsChart(eff, m, pal, isLoadingCustom);
    renderFloodHydrographChart(eff, m, pal, isLoadingCustom);
  }

  /* --------------------------------------------------------------------------
     8. Screening Table, Sorting, Filtering & Export
     -------------------------------------------------------------------------- */
  function populateBasinFilter() {
    var sel = document.getElementById("filter-basin");
    if (!sel) return;
    var currentVal = sel.value || "all";
    var basins = getData().BASINS || [];
    var lang = getLang();

    var html = '<option value="all" data-i18n="table.basinAll">' + escapeHtml(t("table.basinAll")) + "</option>";
    for (var i = 0; i < basins.length; i++) {
      var b = basins[i];
      var lbl = lang === "th" ? b.label_th : b.label_en;
      html += '<option value="' + escapeHtml(b.id) + '">' + escapeHtml(lbl) + "</option>";
    }
    sel.innerHTML = html;
    sel.value = currentVal;
  }

  function getSortValue(prov, key) {
    var m = getProvinceMetrics(prov.id);
    var lang = getLang();
    if (key === "province") return lang === "th" ? prov.name_th : prov.name_en;
    if (key === "basin") return lang === "th" ? prov.basin_th : prov.basin_en;
    if (key === "town24") return m && m.town ? m.town.rain24h : -1;
    if (key === "ridge24") return m && m.ridge ? m.ridge.rain24h : -1;
    if (key === "spread") return m && typeof m.orographicSpread24h === "number" ? m.orographicSpread24h : -9999;
    if (key === "glofas") return m && m.glofas && typeof m.glofas.peakForecastMax === "number" ? m.glofas.peakForecastMax : -1;
    return m ? (ALERT_PRIORITY[m.alertLevel] || 0) : 0;
  }

  function renderProvinceTable() {
    var tbody = document.getElementById("table-provinces-body");
    var countEl = document.getElementById("table-count");
    if (!tbody) return;

    var provinces = (getData().PROVINCES || []).slice();
    var searchVal = ((document.getElementById("filter-search") || {}).value || "").trim().toLowerCase();
    var basinVal = (document.getElementById("filter-basin") || {}).value || "all";
    var alertVal = (document.getElementById("filter-alert") || {}).value || "all";
    var lang = getLang();

    var filtered = [];
    for (var i = 0; i < provinces.length; i++) {
      var p = provinces[i];
      var m = getProvinceMetrics(p.id);
      var level = m ? m.alertLevel : "normal";

      if (basinVal !== "all" && p.basin_id !== basinVal) continue;
      if (alertVal !== "all" && level !== alertVal) continue;

      if (searchVal) {
        var hay = (
          p.name_th + " " + p.name_en + " " +
          p.capital_th + " " + p.capital_en + " " +
          p.basin_th + " " + p.basin_en
        ).toLowerCase();
        if (hay.indexOf(searchVal) === -1) continue;
      }
      filtered.push(p);
    }

    filtered.sort(function (a, b) {
      var va = getSortValue(a, state.sortKey);
      var vb = getSortValue(b, state.sortKey);
      var cmp = 0;
      if (typeof va === "string" && typeof vb === "string") {
        cmp = va.localeCompare(vb);
      } else {
        cmp = va < vb ? -1 : (va > vb ? 1 : 0);
      }
      return state.sortDir === "asc" ? cmp : -cmp;
    });

    if (countEl) {
      countEl.textContent = filtered.length + " / " + provinces.length;
    }

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">' + escapeHtml(t("table.noMatch")) + "</td></tr>";
      return;
    }

    var rowsHtml = "";
    for (var r = 0; r < filtered.length; r++) {
      var prov = filtered[r];
      var metrics = getProvinceMetrics(prov.id);
      var lvl = metrics ? metrics.alertLevel : "normal";
      var selectedClass = prov.id === state.selectedProvinceId ? "is-selected active-row" : "";

      var pTitle = lang === "th" ? prov.name_th : prov.name_en;
      var pSub = lang === "th" ? prov.name_en : prov.name_th;
      var bTitle = lang === "th" ? prov.basin_th : prov.basin_en;

      var townCell = metrics && metrics.town
        ? formatNumber(metrics.town.rain24h, 1) + " / " + formatNumber(metrics.town.rain5d, 0) + " mm"
        : "--";
      var ridgeCell = metrics && metrics.ridge
        ? formatNumber(metrics.ridge.rain24h, 1) + " / " + formatNumber(metrics.ridge.rain5d, 0) + " mm"
        : "--";

      var spreadCell = "--";
      if (metrics && typeof metrics.orographicSpread24h === "number") {
        var sign = metrics.orographicSpread24h >= 0 ? "+" : "";
        var ratioTxt = metrics.orographicRatio24h !== null ? " (" + metrics.orographicRatio24h.toFixed(2) + "x)" : "";
        spreadCell = sign + formatNumber(metrics.orographicSpread24h, 1) + " mm" + ratioTxt;
      }

      var flowCell = metrics && metrics.glofas && metrics.glofas.peakForecastMax !== null
        ? formatCommaNumber(metrics.glofas.peakForecastMax, 0)
        : "--";

      rowsHtml +=
        '<tr data-province-id="' + escapeHtml(prov.id) + '" class="' + selectedClass + '">' +
          "<td><div><strong>" + escapeHtml(pTitle) + "</strong></div>" +
          '<div class="muted-mini">' + escapeHtml(pSub) + "</div></td>" +
          "<td>" + escapeHtml(bTitle) + "</td>" +
          '<td class="num-col">' + escapeHtml(townCell) + "</td>" +
          '<td class="num-col">' + escapeHtml(ridgeCell) + "</td>" +
          '<td class="num-col">' + escapeHtml(spreadCell) + "</td>" +
          '<td class="num-col">' + escapeHtml(flowCell) + "</td>" +
          '<td class="center-col"><span class="status-chip chip-' + escapeHtml(lvl) + '">' +
            escapeHtml(t("status." + lvl)) + "</span></td>" +
        "</tr>";
    }

    tbody.innerHTML = rowsHtml;

    var trs = tbody.querySelectorAll("tr[data-province-id]");
    for (var k = 0; k < trs.length; k++) {
      trs[k].addEventListener("click", function () {
        var pid = this.getAttribute("data-province-id");
        if (pid) selectProvince(pid, true);
      });
    }
  }

  function wireTableHeaderSorting() {
    var keys = ["province", "basin", "town24", "ridge24", "spread", "glofas", "alert"];
    var ths = document.querySelectorAll("#table-provinces thead th");
    for (var i = 0; i < ths.length && i < keys.length; i++) {
      (function (th, key) {
        th.style.cursor = "pointer";
        th.addEventListener("click", function () {
          if (state.sortKey === key) {
            state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
          } else {
            state.sortKey = key;
            state.sortDir = (key === "province" || key === "basin") ? "asc" : "desc";
          }
          renderProvinceTable();
        });
      })(ths[i], keys[i]);
    }
  }

  function exportSnapshotJson() {
    var data = getData();
    var provinces = data.PROVINCES || [];
    var nowIct = new Date(Date.now() + 7 * 3600 * 1000);
    var stamp =
      nowIct.getUTCFullYear() +
      pad2(nowIct.getUTCMonth() + 1) +
      pad2(nowIct.getUTCDate()) + "_" +
      pad2(nowIct.getUTCHours()) +
      pad2(nowIct.getUTCMinutes());

    var payload = {
      exportedAtIso: new Date().toISOString(),
      tier: "Tier 1A Zero-Key CORS Prototype",
      language: getLang(),
      selectedProvinceId: state.selectedProvinceId,
      cursorModeEnabled: state.cursorModeEnabled,
      mapEngine: state.mapEngine,
      basemap: state.basemapKey,
      satellite: {
        gibsLayerKey: state.gibsLayerKey,
        gibsDateUtc: state.gibsDate,
        gibsSlot: state.gibsSlot,
        gibsMinDate: state.gibsMinDate,
        gibsMaxDate: state.gibsMaxDate,
        opacity: state.gibsOpacity
      },
      tmdSynoptic: state.tmdLoadedMeta,
      rainviewer: {
        enabled: state.rainViewerEnabled,
        pastFrames: state.rainViewerMeta && state.rainViewerMeta.past ? state.rainViewerMeta.past.length : 0
      },
      apiSync: state.hydromet ? {
        fetchedAtIso: state.hydromet.fetchedAtIso,
        okStreams: state.hydromet.okStreams,
        totalStreams: state.hydromet.totalStreams,
        errors: state.hydromet.errors
      } : null,
      mrcStations: data.MRC_STATIONS || [],
      provinces: provinces.map(function (p) {
        var eff = getEffectiveProvinceData(p);
        var effMetrics = getEffectiveMetrics(p.id);
        return {
          province: p,
          liveMetrics: getProvinceMetrics(p.id),
          customInvestigation: eff.isCustom ? {
            town: eff.town,
            ridge: eff.ridge,
            glofas_point: eff.glofas_point,
            liveMetrics: effMetrics
          } : null
        };
      })
    };

    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "laos_hydromet_tier1a_snapshot_" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function csvEscapeCell(val) {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") {
      return isFinite(val) ? String(val) : "";
    }
    var str = String(val).replace(/[\r\n]+/g, " ");
    if (/^[=+\-@\t]/.test(str)) {
      str = "'" + str;
    }
    if (/[",]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function formatCsvMetricNumber(val, decimals) {
    if (typeof val !== "number" || !isFinite(val)) return "";
    var factor = Math.pow(10, decimals || 2);
    return String(Math.round(val * factor) / factor);
  }

  function canExportSelectedPointRain() {
    var prov = findProvinceById(state.selectedProvinceId);
    if (!prov) return false;
    var ov = getCustomOverride(prov.id);
    if (state.cursorModeEnabled && ov && ov.loading) return false;
    var m = getEffectiveMetrics(prov.id);
    if (!m || (!m.town && !m.ridge)) return false;
    var townLen = m.town && Array.isArray(m.town.hourlyTime) ? m.town.hourlyTime.length : 0;
    var ridgeLen = m.ridge && Array.isArray(m.ridge.hourlyTime) ? m.ridge.hourlyTime.length : 0;
    return townLen > 0 || ridgeLen > 0;
  }

  function updatePointExportButtonState() {
    var btn = document.getElementById("btn-export-point-csv");
    if (!btn) return;
    var ready = canExportSelectedPointRain();
    btn.disabled = !ready;
    btn.setAttribute("aria-disabled", ready ? "false" : "true");
  }

  function exportSelectedPointCsv() {
    if (!canExportSelectedPointRain()) return false;
    var prov = findProvinceById(state.selectedProvinceId);
    var eff = getEffectiveProvinceData(prov);
    var m = getEffectiveMetrics(prov.id);
    if (!prov || !eff || !m) return false;

    var defaultModels = ["ecmwf_ifs", "jma_seamless", "icon_seamless", "gfs_seamless"];
    var modelDefs = getData().FORECAST_MODELS;
    var modelIds = [];
    if (Array.isArray(modelDefs) && modelDefs.length) {
      for (var mi = 0; mi < modelDefs.length; mi++) {
        if (modelDefs[mi] && modelDefs[mi].id) {
          modelIds.push(modelDefs[mi].id);
        }
      }
    }
    if (!modelIds.length) modelIds = defaultModels;

    var townNode = m.town || null;
    var ridgeNode = m.ridge || null;
    var townTimes = (townNode && Array.isArray(townNode.hourlyTime)) ? townNode.hourlyTime : [];
    var ridgeTimes = (ridgeNode && Array.isArray(ridgeNode.hourlyTime)) ? ridgeNode.hourlyTime : [];
    var baseTimes = townTimes.length ? townTimes.slice() : ridgeTimes.slice();
    var townIdxByTime = {};
    var ridgeIdxByTime = {};
    var seenTime = {};
    for (var ti0 = 0; ti0 < baseTimes.length; ti0++) {
      seenTime[baseTimes[ti0]] = true;
    }
    for (var tui = 0; tui < townTimes.length; tui++) {
      townIdxByTime[townTimes[tui]] = tui;
    }
    for (var ri = 0; ri < ridgeTimes.length; ri++) {
      var rTs = ridgeTimes[ri];
      ridgeIdxByTime[rTs] = ri;
      if (!seenTime[rTs]) {
        seenTime[rTs] = true;
        baseTimes.push(rTs);
      }
    }

    var isCustom = Boolean(eff.isCustom && (eff.townMoved || eff.ridgeMoved));
    var modeLabel = isCustom ? "custom_cursor" : "preset";
    var fetchedIso = (m && m.fetchedAtIso) || (state.hydromet && state.hydromet.fetchedAtIso) || "";
    var cleanMeta = function (s) {
      return String(s === null || s === undefined ? "" : s).replace(/[\r\n]+/g, " ");
    };
    var fmtCoord = function (v) {
      return typeof v === "number" && isFinite(v) ? v.toFixed(6) : "na";
    };
    var fmtElev = function (v) {
      return typeof v === "number" && isFinite(v) ? String(Math.round(v)) + "m" : "na";
    };

    var lines = [
      "# Laos Hydromet Monitor (Tier 1A) - Point 4-Model + Ensemble Mean Rainfall CSV",
      "# province_id: " + cleanMeta(prov.id) + " | name_en: " + cleanMeta(prov.name_en) + " | name_th: " + cleanMeta(prov.name_th),
      "# location_mode: " + modeLabel + " (town_moved=" + String(Boolean(eff.townMoved)) + ", ridge_moved=" + String(Boolean(eff.ridgeMoved)) + ")",
      "# town_requested_lat_lon: " + fmtCoord(eff.town && eff.town.lat) + ", " + fmtCoord(eff.town && eff.town.lon) + " | label: " + cleanMeta(eff.town && eff.town.label_en),
      "# town_first_model_snapped_grid_ecmwf_ifs: " + fmtCoord(townNode && townNode.snappedGridLat) + ", " + fmtCoord(townNode && townNode.snappedGridLon) + " | grid_elev: " + fmtElev(townNode && townNode.gridElevationM),
      "# ridge_requested_lat_lon: " + fmtCoord(eff.ridge && eff.ridge.lat) + ", " + fmtCoord(eff.ridge && eff.ridge.lon) + " | label: " + cleanMeta(eff.ridge && eff.ridge.label_en),
      "# ridge_first_model_snapped_grid_ecmwf_ifs: " + fmtCoord(ridgeNode && ridgeNode.snappedGridLat) + ", " + fmtCoord(ridgeNode && ridgeNode.snappedGridLon) + " | grid_elev: " + fmtElev(ridgeNode && ridgeNode.gridElevationM),
      "# open_meteo_params: cell_selection=nearest; elevation=nan (precip not altitude-corrected); models=" + modelIds.join(","),
      "# open_meteo_grid_note: Root snapped lat/lon/elev reflect the first model (ecmwf_ifs); each model samples its own discrete native grid cell (no cross-cell spatial interpolation). Native 3h/6h models use uniform hourly deaccumulation.",
      "# units: mm/h (hourly precipitation) | timezone: Asia/Bangkok (UTC+07:00 ICT) | fetched_at_iso: " + cleanMeta(fetchedIso)
    ];

    var header = ["timestamp_ict"];
    for (var hi = 0; hi < modelIds.length; hi++) {
      header.push("town_" + modelIds[hi] + "_mm");
    }
    header.push("town_ensemble_mean_mm");
    for (var hj = 0; hj < modelIds.length; hj++) {
      header.push("ridge_" + modelIds[hj] + "_mm");
    }
    header.push("ridge_ensemble_mean_mm");
    lines.push(header.join(","));

    var appendNodeColumns = function (row, node, idx) {
      for (var mi2 = 0; mi2 < modelIds.length; mi2++) {
        var mObj = node && node.byModel ? node.byModel[modelIds[mi2]] : null;
        var series = mObj && Array.isArray(mObj.precip) ? mObj.precip : null;
        var val = (idx >= 0 && series) ? series[idx] : null;
        row.push(formatCsvMetricNumber(val, 2));
      }
      var meanVal = (idx >= 0 && node && Array.isArray(node.meanHourlyPrecip))
        ? node.meanHourlyPrecip[idx]
        : null;
      row.push(formatCsvMetricNumber(meanVal, 2));
    };

    for (var ti = 0; ti < baseTimes.length; ti++) {
      var ts = baseTimes[ti];
      var townIdx = Object.prototype.hasOwnProperty.call(townIdxByTime, ts) ? townIdxByTime[ts] : -1;
      var ridgeIdx = Object.prototype.hasOwnProperty.call(ridgeIdxByTime, ts) ? ridgeIdxByTime[ts] : -1;

      var row = [csvEscapeCell(ts)];
      appendNodeColumns(row, townNode, townIdx);
      appendNodeColumns(row, ridgeNode, ridgeIdx);
      lines.push(row.join(","));
    }

    var filename = "laos_rain_4model_" + provSlug + (isCustom ? "_custom_pin_" : "_preset_") + getIctTimestampSlug() + ".csv";
    return downloadCsvFile(lines, filename);
  }

  function getIctTimestampSlug() {
    var ictNow = new Date(Date.now() + 7 * 3600 * 1000);
    return (
      String(ictNow.getUTCFullYear()) +
      pad2(ictNow.getUTCMonth() + 1) +
      pad2(ictNow.getUTCDate()) + "_" +
      pad2(ictNow.getUTCHours()) +
      pad2(ictNow.getUTCMinutes())
    );
  }

  function downloadCsvFile(lines, filename) {
    var blob = new Blob(["\uFEFF" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  function getActiveModelIds() {
    var defaultModels = ["ecmwf_ifs", "jma_seamless", "icon_seamless", "gfs_seamless"];
    var modelDefs = getData().FORECAST_MODELS;
    var modelIds = [];
    if (Array.isArray(modelDefs) && modelDefs.length) {
      for (var mi = 0; mi < modelDefs.length; mi++) {
        if (modelDefs[mi] && modelDefs[mi].id) {
          modelIds.push(modelDefs[mi].id);
        }
      }
    }
    return modelIds.length ? modelIds : defaultModels;
  }

  /* --------------------------------------------------------------------------
     8B. Client-Side Shapefile / GeoJSON Polygon Upload, Sampling & CSV Export
     -------------------------------------------------------------------------- */
  function pointInRing(lon, lat, ring) {
    if (!Array.isArray(ring) || ring.length < 3) return false;
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = Number(ring[i][0]);
      var yi = Number(ring[i][1]);
      var xj = Number(ring[j][0]);
      var yj = Number(ring[j][1]);
      if (!isFinite(xi) || !isFinite(yi) || !isFinite(xj) || !isFinite(yj)) continue;
      var intersect = ((yi > lat) !== (yj > lat)) &&
        (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygonRings(lon, lat, rings) {
    if (!Array.isArray(rings) || !rings.length) return false;
    if (!pointInRing(lon, lat, rings[0])) return false;
    for (var h = 1; h < rings.length; h++) {
      if (pointInRing(lon, lat, rings[h])) return false;
    }
    return true;
  }

  function pointInPolygons(lon, lat, polygons) {
    for (var p = 0; p < polygons.length; p++) {
      if (pointInPolygonRings(lon, lat, polygons[p])) return true;
    }
    return false;
  }

  function computeRingCentroid(ring) {
    if (!Array.isArray(ring) || !ring.length) return null;
    var len = ring.length;
    if (len > 1 && ring[0][0] === ring[len - 1][0] && ring[0][1] === ring[len - 1][1]) {
      len -= 1;
    }
    var sumLon = 0;
    var sumLat = 0;
    var cnt = 0;
    for (var i = 0; i < len; i++) {
      var lon = Number(ring[i][0]);
      var lat = Number(ring[i][1]);
      if (isFinite(lon) && isFinite(lat)) {
        sumLon += lon;
        sumLat += lat;
        cnt += 1;
      }
    }
    return cnt > 0 ? { lon: Number((sumLon / cnt).toFixed(4)), lat: Number((sumLat / cnt).toFixed(4)) } : null;
  }

  function normalizeShapefileGeoJson(raw) {
    var featureList = [];
    var pushFromObj = function (obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) pushFromObj(obj[i]);
        return;
      }
      if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
        for (var f = 0; f < obj.features.length; f++) pushFromObj(obj.features[f]);
        return;
      }
      if (obj.type === "Feature" && obj.geometry) {
        featureList.push(obj);
        return;
      }
      if (obj.type === "Polygon" || obj.type === "MultiPolygon") {
        featureList.push({ type: "Feature", properties: {}, geometry: obj });
      }
    };
    pushFromObj(raw);

    var polygons = [];
    var cleanFeatures = [];
    var minLon = Infinity;
    var minLat = Infinity;
    var maxLon = -Infinity;
    var maxLat = -Infinity;

    var registerRing = function (ring) {
      var out = [];
      for (var r = 0; r < ring.length; r++) {
        var pt = ring[r];
        if (!Array.isArray(pt) || pt.length < 2) continue;
        var lon = Number(pt[0]);
        var lat = Number(pt[1]);
        if (!isFinite(lon) || !isFinite(lat)) continue;
        if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
          throw new Error("Coordinates out of WGS84 range (lon/lat); include a .prj file in the .zip.");
        }
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
        out.push([lon, lat]);
      }
      return out;
    };

    for (var fi = 0; fi < featureList.length; fi++) {
      var feat = featureList[fi];
      var geom = feat && feat.geometry;
      if (!geom) continue;
      if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
        var polyRings = [];
        for (var ri = 0; ri < geom.coordinates.length; ri++) {
          var cr = registerRing(geom.coordinates[ri]);
          if (cr.length >= 3) polyRings.push(cr);
        }
        if (polyRings.length) {
          polygons.push(polyRings);
          cleanFeatures.push({
            type: "Feature",
            properties: feat.properties || {},
            geometry: { type: "Polygon", coordinates: polyRings }
          });
        }
      } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
        var multiCoords = [];
        for (var pi = 0; pi < geom.coordinates.length; pi++) {
          var subRings = [];
          var rawSub = geom.coordinates[pi] || [];
          for (var sri = 0; sri < rawSub.length; sri++) {
            var scr = registerRing(rawSub[sri]);
            if (scr.length >= 3) subRings.push(scr);
          }
          if (subRings.length) {
            polygons.push(subRings);
            multiCoords.push(subRings);
          }
        }
        if (multiCoords.length) {
          cleanFeatures.push({
            type: "Feature",
            properties: feat.properties || {},
            geometry: { type: "MultiPolygon", coordinates: multiCoords }
          });
        }
      }
    }

    if (!polygons.length || !isFinite(minLon)) {
      throw new Error("No Polygon or MultiPolygon features found.");
    }

    return {
      polygons: polygons,
      bbox: [minLon, minLat, maxLon, maxLat],
      featureCollection: {
        type: "FeatureCollection",
        features: cleanFeatures
      }
    };
  }

  function sampleInteriorPoints(polygons, bbox) {
    var MAX_POINTS = 50;
    var minLon = bbox[0];
    var minLat = bbox[1];
    var maxLon = bbox[2];
    var maxLat = bbox[3];

    var collectAtStep = function (stepDeg) {
      var collected = [];
      for (var lat = minLat + stepDeg * 0.5; lat <= maxLat + 1e-9; lat += stepDeg) {
        for (var lon = minLon + stepDeg * 0.5; lon <= maxLon + 1e-9; lon += stepDeg) {
          if (pointInPolygons(lon, lat, polygons)) {
            collected.push({
              lat: Number(lat.toFixed(4)),
              lon: Number(lon.toFixed(4))
            });
          }
        }
      }
      return collected;
    };

    var step = 0.08;
    var pts = collectAtStep(step);
    var guard = 0;
    while (pts.length > MAX_POINTS && guard < 12) {
      step = step * Math.max(1.15, Math.sqrt(pts.length / 42));
      pts = collectAtStep(step);
      guard += 1;
    }

    if (pts.length > MAX_POINTS) {
      var trimmed = [];
      var stride = pts.length / MAX_POINTS;
      for (var si = 0; si < MAX_POINTS; si++) {
        trimmed.push(pts[Math.floor(si * stride)]);
      }
      pts = trimmed;
    }

    if (!pts.length) {
      var fineStep = Math.max(Math.min(maxLon - minLon, maxLat - minLat) / 4, 0.004);
      pts = collectAtStep(fineStep);
      if (pts.length > MAX_POINTS) {
        pts = pts.slice(0, MAX_POINTS);
      }
    }

    if (!pts.length) {
      var fallbackCenter = computeRingCentroid(polygons[0] && polygons[0][0]) || {
        lat: Number(((minLat + maxLat) / 2).toFixed(4)),
        lon: Number(((minLon + maxLon) / 2).toFixed(4))
      };
      pts = [fallbackCenter];
    }

    for (var k = 0; k < pts.length; k++) {
      pts[k].idx = k + 1;
    }
    return pts;
  }

  function syncMapLibreShapefileLayer() {
    var map = state.mapLibreMap;
    if (!map || !state.mapLibreReady) return;
    try {
      if (!map.getStyle()) return;
    } catch (_) {
      return;
    }

    var shpState = state.shapefile || {};
    var polyFc = shpState.featureCollection || { type: "FeatureCollection", features: [] };
    var ptFeatures = [];
    var pts = shpState.samplePoints || [];
    for (var i = 0; i < pts.length; i++) {
      ptFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pts[i].lon, pts[i].lat] },
        properties: { idx: pts[i].idx }
      });
    }
    var ptsFc = { type: "FeatureCollection", features: ptFeatures };

    if (map.getSource("shp-poly-src")) {
      map.getSource("shp-poly-src").setData(polyFc);
    } else {
      map.addSource("shp-poly-src", { type: "geojson", data: polyFc });
      map.addLayer({
        id: "shp-poly-fill",
        type: "fill",
        source: "shp-poly-src",
        paint: {
          "fill-color": "#0ea5e9",
          "fill-opacity": 0.16
        }
      });
      map.addLayer({
        id: "shp-poly-line",
        type: "line",
        source: "shp-poly-src",
        paint: {
          "line-color": "#0284c7",
          "line-width": 2.4
        }
      });
    }

    if (map.getSource("shp-pts-src")) {
      map.getSource("shp-pts-src").setData(ptsFc);
    } else {
      map.addSource("shp-pts-src", { type: "geojson", data: ptsFc });
      map.addLayer({
        id: "shp-pts-circle",
        type: "circle",
        source: "shp-pts-src",
        paint: {
          "circle-radius": 4.2,
          "circle-color": "#0284c7",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2
        }
      });
    }
  }

  function syncLeafletShapefileLayer() {
    var map = state.leafletMap;
    if (!map || !window.L) return;
    if (!state.leafletShapefileGroup) {
      state.leafletShapefileGroup = window.L.layerGroup().addTo(map);
    } else {
      state.leafletShapefileGroup.clearLayers();
    }

    var shpState = state.shapefile || {};
    if (shpState.featureCollection && shpState.featureCollection.features && shpState.featureCollection.features.length) {
      window.L.geoJSON(shpState.featureCollection, {
        style: {
          color: "#0284c7",
          weight: 2.4,
          fillColor: "#0ea5e9",
          fillOpacity: 0.16
        }
      }).addTo(state.leafletShapefileGroup);
    }

    var pts = shpState.samplePoints || [];
    for (var i = 0; i < pts.length; i++) {
      window.L.circleMarker([pts[i].lat, pts[i].lon], {
        radius: 4.2,
        color: "#ffffff",
        weight: 1.2,
        fillColor: "#0284c7",
        fillOpacity: 0.95
      }).addTo(state.leafletShapefileGroup);
    }
  }

  function syncShapefileOverlay() {
    if (state.mapEngine === "maplibre") {
      syncMapLibreShapefileLayer();
    } else if (state.mapEngine === "leaflet") {
      syncLeafletShapefileLayer();
    }
  }

  function fitBoundsToShapefile() {
    var bbox = state.shapefile && state.shapefile.bbox;
    if (!bbox) return;
    if (state.mapEngine === "maplibre" && state.mapLibreMap) {
      state.mapLibreMap.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 48, duration: 700 });
    } else if (state.mapEngine === "leaflet" && state.leafletMap) {
      state.leafletMap.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [40, 40] });
    }
  }

  function updateShapefileUi() {
    var shpState = state.shapefile || {};
    var hasBoundary = Boolean(shpState.featureCollection && shpState.samplePoints && shpState.samplePoints.length);
    var hasData = Boolean(shpState.data && shpState.data.hourlyTime && shpState.data.hourlyTime.length);

    var btnFetch = document.getElementById("btn-shp-fetch");
    if (btnFetch) {
      btnFetch.disabled = Boolean(shpState.loading) || !hasBoundary;
      btnFetch.textContent = t(shpState.loading ? "shp.fetchLoading" : "shp.fetchBtn");
    }

    var btnAreal = document.getElementById("btn-shp-csv-areal");
    if (btnAreal) {
      btnAreal.disabled = Boolean(shpState.loading) || !hasData;
    }

    var btnGrid = document.getElementById("btn-shp-csv-grid");
    if (btnGrid) {
      btnGrid.disabled = Boolean(shpState.loading) || !hasData;
    }

    var btnClear = document.getElementById("btn-shp-clear");
    if (btnClear) {
      btnClear.classList.toggle("hidden", !hasBoundary && !shpState.error);
    }

    var statusEl = document.getElementById("shapefile-status-text");
    if (statusEl) {
      if (shpState.error) {
        statusEl.textContent = t("shp.statusError", { msg: shpState.error });
      } else if (hasData) {
        statusEl.textContent = t("shp.statusFetched", {
          name: shpState.name || "Polygon",
          ptCount: shpState.data.points.length,
          hours: shpState.data.hourlyTime.length,
          models: shpState.data.modelIds.length
        });
      } else if (hasBoundary) {
        statusEl.textContent = t("shp.statusReady", {
          name: shpState.name || "Polygon",
          polyCount: shpState.featureCollection.features.length,
          ptCount: shpState.samplePoints.length
        });
      } else {
        statusEl.textContent = t("shp.hint");
      }
    }
  }

  function clearShapefileState() {
    state.shapefile = {
      name: "",
      featureCollection: null,
      bbox: null,
      samplePoints: [],
      loading: false,
      error: null,
      data: null
    };
    var inputEl = document.getElementById("input-shapefile");
    if (inputEl) inputEl.value = "";
    syncShapefileOverlay();
    updateShapefileUi();
  }

  function handleShapefileUpload(file) {
    if (!file) return;
    var fileName = String(file.name || "boundary");
    var lower = fileName.toLowerCase();
    state.shapefile.error = null;
    state.shapefile.data = null;

    var processRawGeoJson = function (rawGeo) {
      var normalized = normalizeShapefileGeoJson(rawGeo);
      var pts = sampleInteriorPoints(normalized.polygons, normalized.bbox);
      state.shapefile = {
        name: fileName,
        featureCollection: normalized.featureCollection,
        bbox: normalized.bbox,
        samplePoints: pts,
        loading: false,
        error: null,
        data: null
      };
      syncShapefileOverlay();
      fitBoundsToShapefile();
      updateShapefileUi();
    };

    var handleParseError = function (err) {
      state.shapefile.loading = false;
      state.shapefile.error = err && err.message ? err.message : String(err || "Invalid file");
      updateShapefileUi();
    };

    if (/\.zip$/.test(lower)) {
      if (typeof window.shp !== "function") {
        handleParseError(new Error("shpjs library unavailable; upload .geojson or check CDN connectivity."));
        return;
      }
      file.arrayBuffer().then(function (buf) {
        return window.shp(buf);
      }).then(processRawGeoJson).catch(handleParseError);
    } else if (/\.(geojson|json)$/.test(lower)) {
      file.text().then(function (txt) {
        return JSON.parse(txt);
      }).then(processRawGeoJson).catch(handleParseError);
    } else {
      handleParseError(new Error("Unsupported extension; please upload .zip or .geojson/.json."));
    }
  }

  function fetchShapefileWeather() {
    var shpState = state.shapefile;
    if (!shpState || !shpState.samplePoints || !shpState.samplePoints.length || shpState.loading) {
      return Promise.resolve(null);
    }
    var api = getApi();
    if (!api || typeof api.fetchPolygonRainAndTemp !== "function") {
      return Promise.resolve(null);
    }

    shpState.loading = true;
    shpState.error = null;
    updateShapefileUi();

    return api.fetchPolygonRainAndTemp(shpState.samplePoints)
      .then(function (res) {
        shpState.loading = false;
        shpState.data = res;
        updateShapefileUi();
        return res;
      })
      .catch(function (err) {
        shpState.loading = false;
        shpState.error = err && err.message ? err.message : String(err || "Fetch failed");
        updateShapefileUi();
        return null;
      });
  }

  function makeShapefileSlug() {
    var base = String((state.shapefile && state.shapefile.name) || "boundary")
      .replace(/\.(zip|geojson|json)$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_");
    return base || "boundary";
  }

  function exportShapefileArealCsv() {
    var shpState = state.shapefile;
    var d = shpState && shpState.data;
    if (!d || !Array.isArray(d.hourlyTime) || !d.hourlyTime.length) return false;

    var modelIds = d.modelIds || getActiveModelIds();
    var bbox = shpState.bbox || [];
    var bboxStr = bbox.length === 4 ? bbox.map(function (v) { return v.toFixed(4); }).join(", ") : "na";

    var lines = [
      "# Laos Hydromet Monitor (Tier 1A) - Shapefile Areal Mean Rainfall & 2m Temperature CSV",
      "# boundary_file: " + csvEscapeCell(shpState.name) + " | polygons: " + String((shpState.featureCollection && shpState.featureCollection.features.length) || 0) + " | sample_grid_points: " + String(d.points.length),
      "# bbox_wgs84_minlon_minlat_maxlon_maxlat: " + bboxStr,
      "# precip_params: cell_selection=nearest; elevation=nan (raw model precip); models=" + modelIds.join(","),
      "# temp2m_params: cell_selection=nearest; DEM=90m_lapse_rate (no elevation=nan); units=degC",
      "# privacy_mode: 100pct_client_side_browser_ram | timezone: Asia/Bangkok | fetched_at_iso: " + String(d.fetchedAtIso || "")
    ];

    var header = ["timestamp_ict"];
    for (var i = 0; i < modelIds.length; i++) header.push("rain_" + modelIds[i] + "_mm");
    header.push("rain_ensemble_mean_mm");
    for (var j = 0; j < modelIds.length; j++) header.push("temp2m_" + modelIds[j] + "_c");
    header.push("temp2m_ensemble_mean_c");
    lines.push(header.join(","));

    for (var tIdx = 0; tIdx < d.hourlyTime.length; tIdx++) {
      var row = [csvEscapeCell(d.hourlyTime[tIdx])];
      for (var mi = 0; mi < modelIds.length; mi++) {
        var mp = d.areal.byModel[modelIds[mi]] && d.areal.byModel[modelIds[mi]].precip;
        row.push(formatCsvMetricNumber(mp ? mp[tIdx] : null, 2));
      }
      row.push(formatCsvMetricNumber(d.areal.meanPrecip[tIdx], 2));
      for (var mj = 0; mj < modelIds.length; mj++) {
        var mt = d.areal.byModel[modelIds[mj]] && d.areal.byModel[modelIds[mj]].temp;
        row.push(formatCsvMetricNumber(mt ? mt[tIdx] : null, 2));
      }
      row.push(formatCsvMetricNumber(d.areal.meanTemp[tIdx], 2));
      lines.push(row.join(","));
    }

    var filename = "laos_shp_areal_" + makeShapefileSlug() + "_" + getIctTimestampSlug() + ".csv";
    return downloadCsvFile(lines, filename);
  }

  function exportShapefileGridCsv() {
    var shpState = state.shapefile;
    var d = shpState && shpState.data;
    if (!d || !Array.isArray(d.points) || !d.points.length) return false;

    var modelIds = d.modelIds || getActiveModelIds();
    var lines = [
      "# Laos Hydromet Monitor (Tier 1A) - Shapefile Per-Grid-Point Rainfall & 2m Temperature CSV",
      "# boundary_file: " + csvEscapeCell(shpState.name) + " | sample_grid_points: " + String(d.points.length),
      "# precip_params: cell_selection=nearest; elevation=nan | temp2m_params: cell_selection=nearest; DEM=90m_lapse_rate",
      "# privacy_mode: 100pct_client_side_browser_ram | timezone: Asia/Bangkok | fetched_at_iso: " + String(d.fetchedAtIso || "")
    ];

    var header = ["point_id", "req_lat", "req_lon", "snapped_lat", "snapped_lon", "dem_elev_m", "timestamp_ict"];
    for (var i = 0; i < modelIds.length; i++) header.push("rain_" + modelIds[i] + "_mm");
    header.push("rain_ensemble_mean_mm");
    for (var j = 0; j < modelIds.length; j++) header.push("temp2m_" + modelIds[j] + "_c");
    header.push("temp2m_ensemble_mean_c");
    lines.push(header.join(","));

    for (var pi = 0; pi < d.points.length; pi++) {
      var pt = d.points[pi];
      var ptId = "P" + pad2(pt.idx || (pi + 1));
      var times = pt.hourlyTime || d.hourlyTime || [];
      for (var tIdx = 0; tIdx < times.length; tIdx++) {
        var row = [
          ptId,
          formatCsvMetricNumber(pt.reqLat, 4),
          formatCsvMetricNumber(pt.reqLon, 4),
          formatCsvMetricNumber(pt.snappedLat, 6),
          formatCsvMetricNumber(pt.snappedLon, 6),
          pt.demElevM !== null && pt.demElevM !== undefined ? String(pt.demElevM) : "",
          csvEscapeCell(times[tIdx])
        ];
        for (var mi = 0; mi < modelIds.length; mi++) {
          var mp = pt.byModel[modelIds[mi]] && pt.byModel[modelIds[mi]].precip;
          row.push(formatCsvMetricNumber(mp ? mp[tIdx] : null, 2));
        }
        row.push(formatCsvMetricNumber(pt.meanPrecip[tIdx], 2));
        for (var mj = 0; mj < modelIds.length; mj++) {
          var mt = pt.byModel[modelIds[mj]] && pt.byModel[modelIds[mj]].temp;
          row.push(formatCsvMetricNumber(mt ? mt[tIdx] : null, 2));
        }
        row.push(formatCsvMetricNumber(pt.meanTemp[tIdx], 2));
        lines.push(row.join(","));
      }
    }

    var filename = "laos_shp_grid_" + makeShapefileSlug() + "_" + getIctTimestampSlug() + ".csv";
    return downloadCsvFile(lines, filename);
  }

  /* --------------------------------------------------------------------------
     9. Province Selection & Live Hydromet Refresh
     -------------------------------------------------------------------------- */
  function selectProvince(provinceId, shouldFly) {
    if (state.cursorPickTarget) {
      setCursorPickTarget(null);
    }
    state.selectedProvinceId = provinceId;
    state.userSelectedProvince = true;

    var prov = findProvinceById(provinceId);
    if (shouldFly && prov) {
      flyToProvince(prov);
    }

    renderDetailPanel();
    renderProvinceTable();
    refreshMapMarkersAndLinks();
  }

  function autoFocusHighestAlertIfAppropriate() {
    if (state.userSelectedProvince || !state.hydromet) return;
    var provinces = getData().PROVINCES || [];
    var bestId = "vientiane_capital";
    var bestScore = 0;
    var bestRain = -1;

    for (var i = 0; i < provinces.length; i++) {
      var p = provinces[i];
      var m = getProvinceMetrics(p.id);
      if (!m) continue;
      if (m.alertScore >= 1 && (m.alertScore > bestScore || (m.alertScore === bestScore && m.rainTrigger24h > bestRain))) {
        bestScore = m.alertScore;
        bestRain = m.rainTrigger24h;
        bestId = p.id;
      }
    }
    state.selectedProvinceId = bestId;
  }

  function refreshAllFeeds() {
    var api = getApi();
    var provinces = getData().PROVINCES || [];
    setSyncBadge("loading", t("sync.syncing"));

    var hydroPromise = api.fetchAllProvinceHydromet
      ? api.fetchAllProvinceHydromet(provinces)
      : Promise.resolve(null);

    return Promise.all([hydroPromise, loadRainViewerMetadata()])
      .then(function (results) {
        var hydro = results[0];
        if (hydro) {
          state.hydromet = hydro;
          state.syncTimeStr = formatIsoToIctHm(hydro.fetchedAtIso);

          if (hydro.okStreams === 0) {
            setSyncBadge("error", t("sync.error"));
          } else {
            setSyncBadge("ok", "");
            refreshSyncBadgeLocale();
          }

          autoFocusHighestAlertIfAppropriate();
        } else {
          setSyncBadge("error", t("sync.error"));
        }

        renderKpis();
        renderDetailPanel();
        renderProvinceTable();
        refreshMapMarkersAndLinks();
      })
      .catch(function () {
        setSyncBadge("error", t("sync.error"));
      });
  }

  /* --------------------------------------------------------------------------
     10. Event Binding & Bootstrap
     -------------------------------------------------------------------------- */
  function bindControls() {
    var btnTheme = document.getElementById("btn-theme");
    if (btnTheme) {
      btnTheme.addEventListener("click", toggleTheme);
    }

    var btnLang = document.getElementById("btn-lang");
    if (btnLang) {
      btnLang.addEventListener("click", function () {
        getI18n().toggleLang();
      });
    }

    var btnRefresh = document.getElementById("btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", function () {
        refreshAllFeeds();
      });
    }

    var btnToggleLayers = document.getElementById("btn-toggle-layers");
    var layersBody = document.getElementById("layer-controls-body");
    if (btnToggleLayers && layersBody) {
      btnToggleLayers.addEventListener("click", function () {
        var collapsed = layersBody.classList.toggle("collapsed");
        btnToggleLayers.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }

    var btnToggleLegend = document.getElementById("btn-toggle-legend");
    var legendBody = document.getElementById("legend-body");
    if (btnToggleLegend && legendBody) {
      btnToggleLegend.addEventListener("click", function () {
        var collapsed = legendBody.classList.toggle("collapsed");
        btnToggleLegend.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }

    var toggleCursorMode = document.getElementById("toggle-cursor-mode");
    if (toggleCursorMode) {
      state.cursorModeEnabled = Boolean(toggleCursorMode.checked);
      syncCursorModeContainers();
      toggleCursorMode.addEventListener("change", function () {
        setCursorModeEnabled(Boolean(this.checked));
      });
    }

    var selectBasemap = document.getElementById("select-basemap");
    if (selectBasemap) {
      selectBasemap.addEventListener("change", function () {
        state.basemapKey = this.value;
        state.basemapManuallyOverridden = true;
        applyBasemap();
      });
    }

    var toggleStationIcons = document.getElementById("toggle-station-icons");
    if (toggleStationIcons) {
      state.showStationIcons = Boolean(toggleStationIcons.checked);
      toggleStationIcons.addEventListener("change", function () {
        setStationIconsVisible(Boolean(this.checked));
      });
    }

    var btnQuickStations = document.getElementById("btn-quick-stations");
    if (btnQuickStations) {
      btnQuickStations.addEventListener("click", function () {
        setStationIconsVisible(!state.showStationIcons);
      });
    }

    var btnQuickClean = document.getElementById("btn-quick-clean");
    if (btnQuickClean) {
      btnQuickClean.addEventListener("click", function () {
        setCleanViewEnabled(!state.cleanViewEnabled);
      });
    }

    var toggleMarkers = document.getElementById("toggle-th-markers");
    if (toggleMarkers) {
      state.showDomMarkers = Boolean(toggleMarkers.checked);
      toggleMarkers.addEventListener("change", function () {
        state.showDomMarkers = Boolean(this.checked);
        refreshMapMarkersAndLinks();
      });
    }

    syncQuickMapHud();

    var selectGibs = document.getElementById("select-gibs");
    if (selectGibs) {
      state.gibsLayerKey = selectGibs.value || "Band13_IR";
      selectGibs.addEventListener("change", function () {
        state.gibsLayerKey = this.value;
        syncSatelliteOverlay();
        syncNightHint();
        renderSatKpi();
      });
    }

    var apiRef = getApi();
    var maxDate = apiRef.getUtcTodayDateStr ? apiRef.getUtcTodayDateStr() : new Date().toISOString().slice(0, 10);
    var minDate = apiRef.getUtcDateOffsetStr ? apiRef.getUtcDateOffsetStr(15, maxDate) : maxDate;
    state.gibsMinDate = minDate;
    state.gibsMaxDate = maxDate;
    state.gibsDate = maxDate;

    var inputGibsDate = document.getElementById("input-gibs-date");
    if (inputGibsDate) {
      inputGibsDate.min = minDate;
      inputGibsDate.max = maxDate;
      inputGibsDate.value = maxDate;
      inputGibsDate.addEventListener("change", function () {
        applyGibsDateSlot(this.value || maxDate, state.gibsSlot);
      });
    }

    var btnPrevDay = document.getElementById("btn-gibs-prev-day");
    if (btnPrevDay) {
      btnPrevDay.addEventListener("click", function () {
        applyGibsDateSlot(shiftIsoDateStr(state.gibsDate, -1), state.gibsSlot);
      });
    }

    var btnNextDay = document.getElementById("btn-gibs-next-day");
    if (btnNextDay) {
      btnNextDay.addEventListener("click", function () {
        applyGibsDateSlot(shiftIsoDateStr(state.gibsDate, 1), state.gibsSlot);
      });
    }

    var selectGibsSlot = document.getElementById("select-gibs-slot");
    if (selectGibsSlot) {
      state.gibsSlot = selectGibsSlot.value || "latest";
      selectGibsSlot.addEventListener("change", function () {
        applyGibsDateSlot(state.gibsDate, this.value);
      });
    }

    var sliderOpacity = document.getElementById("slider-gibs-opacity");
    var opacityVal = document.getElementById("gibs-opacity-val");
    if (sliderOpacity) {
      var initialPct = sliderOpacity.value === "" ? 30 : Number(sliderOpacity.value);
      state.gibsOpacity = initialPct / 100;
      if (opacityVal) opacityVal.textContent = initialPct + "%";

      sliderOpacity.addEventListener("input", function () {
        var pct = this.value === "" ? 30 : Number(this.value);
        state.gibsOpacity = pct / 100;
        if (opacityVal) opacityVal.textContent = pct + "%";

        if (state.mapEngine === "maplibre" && state.mapLibreMap && state.mapLibreMap.getLayer("gibs-sat-layer")) {
          state.mapLibreMap.setPaintProperty("gibs-sat-layer", "raster-opacity", state.gibsOpacity);
        } else if (state.mapEngine === "leaflet" && state.leafletGibsLayer) {
          state.leafletGibsLayer.setOpacity(state.gibsOpacity);
        }
      });
    }

    var toggleRv = document.getElementById("toggle-rainviewer");
    if (toggleRv) {
      state.rainViewerEnabled = Boolean(toggleRv.checked);
      toggleRv.addEventListener("change", function () {
        state.rainViewerEnabled = Boolean(this.checked);
        if (!state.rainViewerEnabled) {
          stopRainViewerPlayback();
        } else if (!state.rainViewerMeta) {
          loadRainViewerMetadata();
        }
        syncRainViewerOverlay();
        renderSatKpi();
      });
    }

    var sliderRv = document.getElementById("slider-rv-frame");
    if (sliderRv) {
      sliderRv.addEventListener("input", function () {
        state.rainViewerFrameIdx = Number(this.value || 0);
        updateRainViewerReadout();
        if (state.rainViewerEnabled) {
          syncRainViewerOverlay();
        }
      });
    }

    var btnRvPlay = document.getElementById("btn-rv-play");
    if (btnRvPlay) {
      btnRvPlay.addEventListener("click", toggleRainViewerPlayback);
    }

    var filterSearch = document.getElementById("filter-search");
    if (filterSearch) {
      filterSearch.addEventListener("input", renderProvinceTable);
    }

    var filterBasin = document.getElementById("filter-basin");
    if (filterBasin) {
      filterBasin.addEventListener("change", renderProvinceTable);
    }

    var filterAlert = document.getElementById("filter-alert");
    if (filterAlert) {
      filterAlert.addEventListener("change", renderProvinceTable);
    }

    var btnExport = document.getElementById("btn-export-json");
    if (btnExport) {
      btnExport.addEventListener("click", exportSnapshotJson);
    }

    var pickButtons = [
      { id: "btn-pick-town", target: "town" },
      { id: "btn-pick-ridge", target: "ridge" },
      { id: "btn-pick-glofas", target: "glofas" }
    ];
    for (var pIdx = 0; pIdx < pickButtons.length; pIdx++) {
      (function (item) {
        var pBtn = document.getElementById(item.id);
        if (pBtn) {
          pBtn.addEventListener("click", function () {
            setCursorPickTarget(state.cursorPickTarget === item.target ? null : item.target);
          });
        }
      })(pickButtons[pIdx]);
    }

    var btnResetNodes = document.getElementById("btn-reset-custom-nodes");
    if (btnResetNodes) {
      btnResetNodes.addEventListener("click", resetCustomNodesForSelected);
    }

    var mapContainerEl = document.getElementById("map-container");
    if (mapContainerEl) {
      mapContainerEl.addEventListener("mouseleave", clearCursorHudCoords);
    }

    var tmdSlotPills = document.querySelectorAll(".tmd-slot-pill[data-slot]");
    for (var tsIdx = 0; tsIdx < tmdSlotPills.length; tsIdx++) {
      tmdSlotPills[tsIdx].addEventListener("click", function () {
        var slotVal = this.getAttribute("data-slot");
        if (slotVal) {
          applyGibsDateSlot(state.gibsDate, slotVal);
        }
      });
    }

    var btnToggleTmd = document.getElementById("btn-toggle-tmd");
    if (btnToggleTmd) {
      btnToggleTmd.addEventListener("click", function () {
        state.tmdExpanded = !state.tmdExpanded;
        syncSectionVisibilityUi();
        resizeMapEngineSoon();
      });
    }

    var btnFocusSynoptic = document.getElementById("btn-focus-synoptic");
    if (btnFocusSynoptic) {
      btnFocusSynoptic.addEventListener("click", toggleSynopticFocusMode);
    }

    var btnToggleCharts = document.getElementById("btn-toggle-charts");
    if (btnToggleCharts) {
      btnToggleCharts.addEventListener("click", function () {
        if (!state.detailBodyExpanded) {
          state.detailBodyExpanded = true;
          setChartsVisible(true);
          return;
        }
        setChartsVisible(!state.chartsVisible);
      });
    }

    var btnToggleDetail = document.getElementById("btn-toggle-detail");
    if (btnToggleDetail) {
      btnToggleDetail.addEventListener("click", function () {
        setDetailBodyExpanded(!state.detailBodyExpanded);
      });
    }

    var btnToggleTable = document.getElementById("btn-toggle-table");
    if (btnToggleTable) {
      btnToggleTable.addEventListener("click", function () {
        setTableExpanded(!state.tableExpanded);
      });
    }

    var btnExportPointCsv = document.getElementById("btn-export-point-csv");
    if (btnExportPointCsv) {
      btnExportPointCsv.addEventListener("click", exportSelectedPointCsv);
    }

    var inputShapefile = document.getElementById("input-shapefile");
    if (inputShapefile) {
      inputShapefile.addEventListener("change", function () {
        var f = this.files && this.files[0];
        if (f) handleShapefileUpload(f);
      });
    }

    var btnShpFetch = document.getElementById("btn-shp-fetch");
    if (btnShpFetch) {
      btnShpFetch.addEventListener("click", fetchShapefileWeather);
    }

    var btnShpAreal = document.getElementById("btn-shp-csv-areal");
    if (btnShpAreal) {
      btnShpAreal.addEventListener("click", exportShapefileArealCsv);
    }

    var btnShpGrid = document.getElementById("btn-shp-csv-grid");
    if (btnShpGrid) {
      btnShpGrid.addEventListener("click", exportShapefileGridCsv);
    }

    var btnShpClear = document.getElementById("btn-shp-clear");
    if (btnShpClear) {
      btnShpClear.addEventListener("click", clearShapefileState);
    }

    var btnExpandTmd = document.getElementById("btn-expand-tmd");
    if (btnExpandTmd) {
      btnExpandTmd.addEventListener("click", openTmdLightbox);
    }

    var imgTmdSynoptic = document.getElementById("img-tmd-synoptic");
    if (imgTmdSynoptic) {
      imgTmdSynoptic.addEventListener("click", openTmdLightbox);
    }

    var btnCloseTmdLightbox = document.getElementById("btn-close-tmd-lightbox");
    if (btnCloseTmdLightbox) {
      btnCloseTmdLightbox.addEventListener("click", closeTmdLightbox);
    }

    var tmdLightbox = document.getElementById("tmd-lightbox");
    if (tmdLightbox) {
      tmdLightbox.addEventListener("click", function (ev) {
        if (ev && ev.target === tmdLightbox) {
          closeTmdLightbox();
        }
      });
    }

    document.addEventListener("keydown", function (ev) {
      if (!ev) return;
      if (ev.key === "Escape") {
        var lbEl = document.getElementById("tmd-lightbox");
        if (lbEl && !lbEl.classList.contains("hidden")) {
          closeTmdLightbox();
          return;
        }
        if (state.cursorPickTarget) {
          setCursorPickTarget(null);
          return;
        }
        if (state.cleanViewEnabled) {
          setCleanViewEnabled(false);
        }
        return;
      }

      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var tgt = ev.target;
      if (tgt) {
        if (tgt.isContentEditable || tgt.tagName === "SELECT" || tgt.tagName === "TEXTAREA") return;
        if (tgt.tagName === "INPUT") {
          var itype = String(tgt.type || "").toLowerCase();
          if (itype !== "checkbox" && itype !== "radio" && itype !== "button") return;
        }
      }

      var k = String(ev.key || "").toLowerCase();
      if (k === "m") {
        ev.preventDefault();
        setStationIconsVisible(!state.showStationIcons);
      } else if (k === "h") {
        ev.preventDefault();
        setCleanViewEnabled(!state.cleanViewEnabled);
      } else if (k === "l") {
        if (!state.showStationIcons || state.cleanViewEnabled) return;
        ev.preventDefault();
        var lblEl = document.getElementById("toggle-th-markers");
        state.showDomMarkers = !state.showDomMarkers;
        if (lblEl) lblEl.checked = state.showDomMarkers;
        refreshMapMarkersAndLinks();
      }
    });

    window.addEventListener("laosapp:langchange", function () {
      populateBasinFilter();
      refreshSyncBadgeLocale();
      renderKpis();
      renderDetailPanel();
      renderProvinceTable();
      refreshMapMarkersAndLinks();
      updateCursorHudMode();
      syncQuickMapHud();
      syncTmdSlotPills();
      renderTmdStatusFromLoaded();
      syncNightHint();
      syncSectionVisibilityUi();
      updateShapefileUi();
      if (!state.hoveredCoords) {
        clearCursorHudCoords();
      }
      var playBtn = document.getElementById("btn-rv-play");
      if (playBtn) playBtn.textContent = t(state.rvPlaying ? "map.rvPause" : "map.rvPlay");
    });

    window.addEventListener("resize", function () {
      if (state.detailBodyExpanded && state.chartsVisible) {
        if (state.rainChart) state.rainChart.resize();
        if (state.floodChart) state.floodChart.resize();
      } else {
        state.chartsNeedRender = true;
      }
      resizeMapEngineSoon();
    });

    applyGibsDateSlot(maxDate, state.gibsSlot);
    syncSectionVisibilityUi();
  }

  function bootstrap() {
    initTheme();
    updateClock();
    setInterval(updateClock, 1000);

    populateBasinFilter();
    wireTableHeaderSorting();
    bindControls();

    initMapEngine();
    attachMapResizeObserver();
    renderKpis();
    renderDetailPanel();
    renderProvinceTable();
    refreshAllFeeds();
  }

  getApp().app = {
    refresh: refreshAllFeeds,
    selectProvince: selectProvince,
    exportSnapshot: exportSnapshotJson,
    exportPointCsv: exportSelectedPointCsv,
    fetchShapefileWeather: fetchShapefileWeather,
    exportShapefileArealCsv: exportShapefileArealCsv,
    exportShapefileGridCsv: exportShapefileGridCsv,
    clearShapefile: clearShapefileState,
    getState: function () { return state; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
