(function () {
  "use strict";

  var FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
  var FLOOD_ENDPOINT = "https://flood-api.open-meteo.com/v1/flood";
  var RAINVIEWER_META_URL = "https://api.rainviewer.com/public/weather-maps.json";
  var DEFAULT_TIMEOUT_MS = 22000;

  function fetchJsonWithTimeout(url, timeoutMs) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = null;
    if (controller) {
      timer = setTimeout(function () {
        try {
          controller.abort();
        } catch (_) {}
      }, timeoutMs || DEFAULT_TIMEOUT_MS);
    }

    return fetch(url, {
      method: "GET",
      signal: controller ? controller.signal : undefined
    })
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error("HTTP " + resp.status + " from " + url.split("?")[0]);
        }
        return resp.json();
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  var TMD_MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  var TMD_SHORT_MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  var VALID_SYNOPTIC_SLOTS = { "00": true, "06": true, "12": true, "18": true };

  function pad2Num(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function parseUtcDateOnly(dateStr) {
    if (typeof dateStr !== "string") return null;
    var trimmed = dateStr.trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!m) return null;
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10);
    var d = parseInt(m[3], 10);
    var ms = Date.UTC(y, mo - 1, d);
    var probe = new Date(ms);
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
      return null;
    }
    return { y: y, m: mo, d: d, ms: ms, isoDate: trimmed };
  }

  function getUtcTodayDateStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function getUtcDateOffsetStr(daysAgo, baseDateStr) {
    var todayUtc = getUtcTodayDateStr();
    var parsed = parseUtcDateOnly(baseDateStr) || parseUtcDateOnly(todayUtc);
    var offset = typeof daysAgo === "number" && isFinite(daysAgo) ? Math.trunc(daysAgo) : 0;
    var dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    dt.setUTCDate(dt.getUTCDate() - offset);
    return dt.toISOString().slice(0, 10);
  }

  function resolveGibsTimeSpec(dateStr, slotCode) {
    var todayUtc = getUtcTodayDateStr();
    var parsed = parseUtcDateOnly(dateStr);
    var cleanDate = parsed ? parsed.isoDate : todayUtc;
    var slot = typeof slotCode === "string" ? slotCode.trim() : "";

    if (!slot || slot === "latest") {
      if (cleanDate === todayUtc) {
        return {
          cleanDate: cleanDate,
          timeSeg: "default",
          resolvedSlot: "latest",
          isFutureFallback: false
        };
      }
      return {
        cleanDate: cleanDate,
        timeSeg: cleanDate + "T06:00:00Z",
        resolvedSlot: "06",
        isFutureFallback: false
      };
    }

    if (VALID_SYNOPTIC_SLOTS[slot]) {
      var iso = cleanDate + "T" + slot + ":00:00Z";
      if (cleanDate === todayUtc && Date.parse(iso) > Date.now()) {
        return {
          cleanDate: cleanDate,
          timeSeg: "default",
          resolvedSlot: "latest",
          isFutureFallback: true
        };
      }
      return {
        cleanDate: cleanDate,
        timeSeg: iso,
        resolvedSlot: slot,
        isFutureFallback: false
      };
    }

    return resolveGibsTimeSpec(cleanDate, "latest");
  }

  function isGibsDarkSlot(layerKey, dateStr, slotCode) {
    if (layerKey !== "Band3_Visible") return false;
    var spec = resolveGibsTimeSpec(dateStr, slotCode);
    if (spec.resolvedSlot === "12" || spec.resolvedSlot === "18") {
      return true;
    }
    if (spec.resolvedSlot === "latest") {
      var utcHour = new Date().getUTCHours();
      return utcHour >= 11 && utcHour <= 22;
    }
    return false;
  }

  function getTmdSynopticChartUrl(dateStr, hourStr) {
    var parsed = parseUtcDateOnly(dateStr);
    var hh = typeof hourStr === "string" ? hourStr.trim() : "";
    if (!parsed || !VALID_SYNOPTIC_SLOTS[hh]) return null;

    var dd = pad2Num(parsed.d);
    var monthEnLower = TMD_MONTH_NAMES[parsed.m - 1];
    return (
      "https://www.tmd.go.th/media/forecast/airmap/topchart_" +
      dd + "_" + monthEnLower + "_" + parsed.y + "_" + hh + ".jpg"
    );
  }

  function formatSynopticDisplay(candMs, candDateStr, candHourStr) {
    var utcDt = new Date(candMs);
    var ictDt = new Date(candMs + 7 * 3600 * 1000);
    var utcDay = pad2Num(utcDt.getUTCDate());
    var utcMon = TMD_SHORT_MONTHS[utcDt.getUTCMonth()];
    var ictDay = pad2Num(ictDt.getUTCDate());
    var ictMon = TMD_SHORT_MONTHS[ictDt.getUTCMonth()];
    var ictHr = pad2Num(ictDt.getUTCHours());

    if (ictDay === utcDay && ictMon === utcMon) {
      return utcDay + " " + utcMon + " " + candHourStr + "Z (" + ictHr + ":00 ICT)";
    }
    return utcDay + " " + utcMon + " " + candHourStr + "Z (" + ictDay + " " + ictMon + " " + ictHr + ":00 ICT)";
  }

  function getTmdSynopticCandidates(dateStr, slotCode, minDateStr) {
    var nowMs = Date.now();
    var todayUtc = getUtcTodayDateStr();
    var parsed = parseUtcDateOnly(dateStr) || parseUtcDateOnly(todayUtc);
    var cleanDate = parsed.isoDate;
    var slot = typeof slotCode === "string" ? slotCode.trim() : "";

    var startHourNum;
    if (VALID_SYNOPTIC_SLOTS[slot]) {
      startHourNum = parseInt(slot, 10);
    } else if (cleanDate === todayUtc) {
      startHourNum = Math.floor(new Date(nowMs).getUTCHours() / 6) * 6;
    } else {
      startHourNum = 18;
    }

    var startMs = Date.UTC(parsed.y, parsed.m - 1, parsed.d, startHourNum, 0, 0);
    var targetWasFuture = false;
    if (startMs > nowMs) {
      targetWasFuture = true;
      var nowUtcDt = new Date(nowMs);
      var floorHr = Math.floor(nowUtcDt.getUTCHours() / 6) * 6;
      startMs = Date.UTC(
        nowUtcDt.getUTCFullYear(),
        nowUtcDt.getUTCMonth(),
        nowUtcDt.getUTCDate(),
        floorHr,
        0,
        0
      );
    }

    var minParsed = parseUtcDateOnly(minDateStr);
    var minBoundaryMs = minParsed ? Date.UTC(minParsed.y, minParsed.m - 1, minParsed.d, 0, 0, 0) : null;

    var candidates = [];
    for (var step = 0; step < 4; step++) {
      var candMs = startMs - step * 6 * 3600 * 1000;
      if (minBoundaryMs !== null && candMs < minBoundaryMs) {
        break;
      }
      var candDt = new Date(candMs);
      var candDateStr = candDt.toISOString().slice(0, 10);
      var candHourStr = pad2Num(candDt.getUTCHours());
      var url = getTmdSynopticChartUrl(candDateStr, candHourStr);
      if (!url) continue;

      candidates.push({
        dateStr: candDateStr,
        hourStr: candHourStr,
        utcIso: candDateStr + "T" + candHourStr + ":00:00Z",
        ictDisplay: formatSynopticDisplay(candMs, candDateStr, candHourStr),
        url: url,
        isExactMatch: step === 0 && !targetWasFuture
      });
    }
    return candidates;
  }

  function getGibsTileUrl(layerKey, dateStr, overrideLayerId, overrideMatrixSet, slotCode) {
    var DATA = (window.LaosFloodApp && window.LaosFloodApp.DATA) || {};
    var layers = DATA.GIBS_LAYERS || {};
    var cfg = layers[layerKey];
    if (!cfg) return null;

    var layerId = overrideLayerId || cfg.id;
    var matrixSet = overrideMatrixSet || cfg.matrixSet || "GoogleMapsCompatible_Level6";
    var timeSeg;
    if (typeof dateStr === "string" && dateStr.indexOf("T") !== -1) {
      timeSeg = dateStr.trim();
    } else {
      timeSeg = resolveGibsTimeSpec(dateStr, slotCode).timeSeg;
    }

    return (
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/" +
      layerId +
      "/default/" +
      timeSeg +
      "/" +
      matrixSet +
      "/{z}/{y}/{x}." +
      (cfg.ext || "png")
    );
  }

  function fetchRainViewerMeta() {
    return fetchJsonWithTimeout(RAINVIEWER_META_URL, 15000).then(function (json) {
      var host = (json && json.host) || "https://tilecache.rainviewer.com";
      var past = (json && json.radar && Array.isArray(json.radar.past) && json.radar.past) || [];
      return {
        host: host,
        generated: json && json.generated ? json.generated : null,
        past: past.map(function (frame) {
          return {
            time: frame.time,
            path: frame.path || ("/v2/radar/" + frame.time)
          };
        })
      };
    });
  }

  function buildRainViewerTileUrl(host, framePath) {
    if (!host || !framePath) return null;
    // RainViewer Jan 2026 rules: color 2 (Universal Blue), smooth=1, snow=1, maxzoom=7
    return host + framePath + "/256/{z}/{x}/{y}/2/1_1.png";
  }

  function normalizeBatchResponse(raw) {
    return Array.isArray(raw) ? raw : [raw];
  }

  function sumWindow(arr, startIdx, count) {
    if (!Array.isArray(arr) || !arr.length) return 0;
    var end = Math.min(arr.length, startIdx + count);
    var total = 0;
    for (var i = Math.max(0, startIdx); i < end; i++) {
      var v = arr[i];
      if (typeof v === "number" && isFinite(v)) {
        total += v;
      }
    }
    return total;
  }

  function parseHourlyNodeForecast(nodeData, modelDefs) {
    var hourly = (nodeData && nodeData.hourly) || {};
    var timeArr = Array.isArray(hourly.time) ? hourly.time : [];
    var byModel = {};
    var activeModelIds = [];

    for (var i = 0; i < modelDefs.length; i++) {
      var mId = modelDefs[i].id;
      var precipKey = "precipitation_" + mId;
      var probKey = "precipitation_probability_" + mId;
      var tempKey = "temperature_2m_" + mId;

      var precip = Array.isArray(hourly[precipKey]) ? hourly[precipKey] : null;
      // Fallback if single-model unsuffixed keys are returned
      if (!precip && i === 0 && Array.isArray(hourly.precipitation)) {
        precip = hourly.precipitation;
      }
      if (precip) {
        activeModelIds.push(mId);
      }

      byModel[mId] = {
        precip: precip || [],
        prob: Array.isArray(hourly[probKey]) ? hourly[probKey] : [],
        temp: Array.isArray(hourly[tempKey]) ? hourly[tempKey] : []
      };
    }

    var meanHourlyPrecip = [];
    for (var t = 0; t < timeArr.length; t++) {
      var sum = 0;
      var cnt = 0;
      for (var k = 0; k < activeModelIds.length; k++) {
        var val = byModel[activeModelIds[k]].precip[t];
        if (typeof val === "number" && isFinite(val)) {
          sum += val;
          cnt += 1;
        }
      }
      meanHourlyPrecip.push(cnt > 0 ? Number((sum / cnt).toFixed(2)) : 0);
    }

    // Determine "now" start index in Asia/Bangkok hourly array so 24h peak starts near current hour
    var nowBkkHourStr = getBangkokHourIsoPrefix();
    var startIdx = 0;
    if (nowBkkHourStr && timeArr.length) {
      for (var idx = 0; idx < timeArr.length; idx++) {
        if (timeArr[idx] >= nowBkkHourStr) {
          startIdx = idx;
          break;
        }
      }
      if (startIdx >= timeArr.length - 6) startIdx = 0;
    }

    // 24h forward total & max single-model 24h vs ensemble mean 24h
    var rain24hMean = Number(sumWindow(meanHourlyPrecip, startIdx, 24).toFixed(1));
    var rain5dMean = Number(sumWindow(meanHourlyPrecip, 0, timeArr.length).toFixed(1));
    var rain24hPeakModel = rain24hMean;

    for (var mIdx = 0; mIdx < activeModelIds.length; mIdx++) {
      var mTotal24 = sumWindow(byModel[activeModelIds[mIdx]].precip, startIdx, 24);
      if (mTotal24 > rain24hPeakModel) {
        rain24hPeakModel = Number(mTotal24.toFixed(1));
      }
    }

    return {
      hourlyTime: timeArr,
      byModel: byModel,
      activeModels: activeModelIds,
      meanHourlyPrecip: meanHourlyPrecip,
      nowStartIndex: startIdx,
      rain24h: rain24hMean,
      rain24hMaxModel: rain24hPeakModel,
      rain5d: rain5dMean,
      gridElevationM:
        nodeData && typeof nodeData.elevation === "number" && isFinite(nodeData.elevation)
          ? Math.round(nodeData.elevation)
          : null,
      snappedGridLat:
        nodeData && typeof nodeData.latitude === "number" && isFinite(nodeData.latitude)
          ? Number(nodeData.latitude.toFixed(6))
          : null,
      snappedGridLon:
        nodeData && typeof nodeData.longitude === "number" && isFinite(nodeData.longitude)
          ? Number(nodeData.longitude.toFixed(6))
          : null
    };
  }

  function getBangkokHourIsoPrefix() {
    try {
      var nowUtcMs = Date.now() + 7 * 3600 * 1000;
      return new Date(nowUtcMs).toISOString().slice(0, 13) + ":00";
    } catch (_) {
      return "";
    }
  }

  function parseFloodNode(nodeData) {
    var daily = (nodeData && nodeData.daily) || {};
    var timeArr = Array.isArray(daily.time) ? daily.time : [];
    var discharge = Array.isArray(daily.river_discharge) ? daily.river_discharge : [];
    var mean = Array.isArray(daily.river_discharge_mean) ? daily.river_discharge_mean : [];
    var max = Array.isArray(daily.river_discharge_max) ? daily.river_discharge_max : [];
    var p25 = Array.isArray(daily.river_discharge_p25) ? daily.river_discharge_p25 : [];
    var p75 = Array.isArray(daily.river_discharge_p75) ? daily.river_discharge_p75 : [];

    // First 5 days are past_days=5 baseline; remaining are forecast_days=14
    var pastCount = Math.min(5, timeArr.length);
    var baseSum = 0;
    var baseCnt = 0;
    for (var i = 0; i < pastCount; i++) {
      var bv = typeof mean[i] === "number" ? mean[i] : discharge[i];
      if (typeof bv === "number" && isFinite(bv)) {
        baseSum += bv;
        baseCnt += 1;
      }
    }
    var baselineMean = baseCnt > 0 ? Number((baseSum / baseCnt).toFixed(1)) : null;

    var peakForecastMax = null;
    var peakForecastMean = null;
    for (var j = pastCount; j < timeArr.length; j++) {
      var mx = typeof max[j] === "number" ? max[j] : discharge[j];
      var mn = typeof mean[j] === "number" ? mean[j] : discharge[j];
      if (typeof mx === "number" && isFinite(mx)) {
        if (peakForecastMax === null || mx > peakForecastMax) peakForecastMax = Number(mx.toFixed(1));
      }
      if (typeof mn === "number" && isFinite(mn)) {
        if (peakForecastMean === null || mn > peakForecastMean) peakForecastMean = Number(mn.toFixed(1));
      }
    }

    var surgeRatio = null;
    if (baselineMean !== null && baselineMean >= 25 && peakForecastMax !== null) {
      surgeRatio = Number((peakForecastMax / baselineMean).toFixed(2));
    }

    return {
      dailyTime: timeArr,
      discharge: discharge,
      mean: mean,
      max: max,
      p25: p25,
      p75: p75,
      baselineMean: baselineMean,
      peakForecastMax: peakForecastMax,
      peakForecastMean: peakForecastMean,
      surgeRatio: surgeRatio
    };
  }

  function buildForecastBatchUrl(points, modelString) {
    var lats = points.map(function (p) { return p.lat.toFixed(4); }).join(",");
    var lons = points.map(function (p) { return p.lon.toFixed(4); }).join(",");
    var elevs = points.map(function () { return "nan"; }).join(",");
    return (
      FORECAST_ENDPOINT +
      "?latitude=" + encodeURIComponent(lats) +
      "&longitude=" + encodeURIComponent(lons) +
      "&hourly=precipitation,precipitation_probability,temperature_2m" +
      "&models=" + encodeURIComponent(modelString) +
      "&cell_selection=nearest" +
      "&elevation=" + encodeURIComponent(elevs) +
      "&forecast_days=5" +
      "&timezone=" + encodeURIComponent("Asia/Bangkok")
    );
  }

  function buildFloodBatchUrl(points) {
    var lats = points.map(function (p) { return p.lat.toFixed(4); }).join(",");
    var lons = points.map(function (p) { return p.lon.toFixed(4); }).join(",");
    return (
      FLOOD_ENDPOINT +
      "?latitude=" + encodeURIComponent(lats) +
      "&longitude=" + encodeURIComponent(lons) +
      "&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_p25,river_discharge_p75" +
      "&past_days=5" +
      "&forecast_days=14"
    );
  }

  function computeAlertStatus(townNode, ridgeNode, glofas) {
    var rainMetric = Math.max(
      townNode ? townNode.rain24h : 0,
      ridgeNode ? ridgeNode.rain24h : 0
    );
    var flowHighEnough = glofas && typeof glofas.peakForecastMax === "number" && glofas.peakForecastMax >= 50;
    var surge = glofas && typeof glofas.surgeRatio === "number" ? glofas.surgeRatio : 1;

    if (rainMetric >= 150 || (flowHighEnough && surge >= 2.5)) {
      return { level: "flood", score: 3, rainTrigger24h: rainMetric };
    }
    if (rainMetric >= 90 || (flowHighEnough && surge >= 1.8)) {
      return { level: "alarm", score: 2, rainTrigger24h: rainMetric };
    }
    if (rainMetric >= 35 || (flowHighEnough && surge >= 1.4)) {
      return { level: "watch", score: 1, rainTrigger24h: rainMetric };
    }
    return { level: "normal", score: 0, rainTrigger24h: rainMetric };
  }

  function getForecastModelConfig() {
    var DATA = (window.LaosFloodApp && window.LaosFloodApp.DATA) || {};
    var modelDefs = DATA.FORECAST_MODELS || [
      { id: "ecmwf_ifs", label: "ECMWF IFS (~9 km)", color: "#2563eb" },
      { id: "jma_seamless", label: "JMA GSM", color: "#10b981" },
      { id: "icon_seamless", label: "DWD ICON", color: "#f59e0b" },
      { id: "gfs_seamless", label: "NOAA GFS", color: "#ec4899" }
    ];
    return {
      modelDefs: modelDefs,
      modelString: modelDefs.map(function (m) { return m.id; }).join(",")
    };
  }

  function assemblePairMetrics(provinceId, townRaw, ridgeRaw, floodRaw, modelDefs) {
    var townParsed = townRaw ? parseHourlyNodeForecast(townRaw, modelDefs) : null;
    var ridgeParsed = ridgeRaw ? parseHourlyNodeForecast(ridgeRaw, modelDefs) : null;
    var floodParsed = floodRaw ? parseFloodNode(floodRaw) : null;

    var spread24 =
      townParsed && ridgeParsed
        ? Number((ridgeParsed.rain24h - townParsed.rain24h).toFixed(1))
        : null;

    var ratio24 =
      townParsed && ridgeParsed && (townParsed.rain24h >= 1 || ridgeParsed.rain24h >= 1)
        ? Number((ridgeParsed.rain24h / Math.max(townParsed.rain24h, 0.5)).toFixed(2))
        : null;

    var alertInfo = computeAlertStatus(townParsed, ridgeParsed, floodParsed);

    return {
      provinceId: provinceId,
      forecastOk: Boolean(townParsed && ridgeParsed),
      floodOk: Boolean(floodParsed),
      town: townParsed,
      ridge: ridgeParsed,
      glofas: floodParsed,
      orographicSpread24h: spread24,
      orographicRatio24h: ratio24,
      alertLevel: alertInfo.level,
      alertScore: alertInfo.score,
      rainTrigger24h: alertInfo.rainTrigger24h
    };
  }

  function isValidCoordPoint(pt) {
    return Boolean(
      pt &&
      typeof pt.lat === "number" && isFinite(pt.lat) &&
      typeof pt.lon === "number" && isFinite(pt.lon)
    );
  }

  function fetchAllProvinceHydromet(provinces) {
    var modelCfg = getForecastModelConfig();
    var modelDefs = modelCfg.modelDefs;
    var modelString = modelCfg.modelString;

    var townPoints = provinces.map(function (p) { return p.town; });
    var ridgePoints = provinces.map(function (p) { return p.ridge; });
    var glofasPoints = provinces.map(function (p) { return p.glofas_point || p.town; });

    var townUrl = buildForecastBatchUrl(townPoints, modelString);
    var ridgeUrl = buildForecastBatchUrl(ridgePoints, modelString);
    var floodUrl = buildFloodBatchUrl(glofasPoints);

    return Promise.allSettled([
      fetchJsonWithTimeout(townUrl, DEFAULT_TIMEOUT_MS),
      fetchJsonWithTimeout(ridgeUrl, DEFAULT_TIMEOUT_MS),
      fetchJsonWithTimeout(floodUrl, DEFAULT_TIMEOUT_MS)
    ]).then(function (results) {
      var townSettled = results[0];
      var ridgeSettled = results[1];
      var floodSettled = results[2];

      var townArr = townSettled.status === "fulfilled" ? normalizeBatchResponse(townSettled.value) : null;
      var ridgeArr = ridgeSettled.status === "fulfilled" ? normalizeBatchResponse(ridgeSettled.value) : null;
      var floodArr = floodSettled.status === "fulfilled" ? normalizeBatchResponse(floodSettled.value) : null;

      var errors = [];
      if (!townArr) errors.push("Town Forecast: " + (townSettled.reason && townSettled.reason.message));
      if (!ridgeArr) errors.push("Ridge Forecast: " + (ridgeSettled.reason && ridgeSettled.reason.message));
      if (!floodArr) errors.push("GloFAS Flood: " + (floodSettled.reason && floodSettled.reason.message));

      var metricsByProvince = {};
      for (var i = 0; i < provinces.length; i++) {
        var prov = provinces[i];
        metricsByProvince[prov.id] = assemblePairMetrics(
          prov.id,
          townArr && townArr[i] ? townArr[i] : null,
          ridgeArr && ridgeArr[i] ? ridgeArr[i] : null,
          floodArr && floodArr[i] ? floodArr[i] : null,
          modelDefs
        );
      }

      return {
        fetchedAtIso: new Date().toISOString(),
        okStreams: (townArr ? 1 : 0) + (ridgeArr ? 1 : 0) + (floodArr ? 1 : 0),
        totalStreams: 3,
        errors: errors,
        byProvince: metricsByProvince
      };
    });
  }

  /**
   * Fetch 4-model Open-Meteo Forecast (2-point batch: [townPoint, ridgePoint] with elevation=nan,nan)
   * and GloFAS v4.0 Flood discharge (1 point: glofasPoint) for interactive cursor investigation.
   */
  function fetchCustomPairHydromet(townPoint, ridgePoint, glofasPoint) {
    if (!isValidCoordPoint(townPoint) || !isValidCoordPoint(ridgePoint)) {
      return Promise.reject(new Error("Invalid custom pair coordinates"));
    }
    var effectiveGlofas = isValidCoordPoint(glofasPoint) ? glofasPoint : townPoint;
    var modelCfg = getForecastModelConfig();
    var forecastUrl = buildForecastBatchUrl([townPoint, ridgePoint], modelCfg.modelString);
    var floodUrl = buildFloodBatchUrl([effectiveGlofas]);

    return Promise.allSettled([
      fetchJsonWithTimeout(forecastUrl, DEFAULT_TIMEOUT_MS),
      fetchJsonWithTimeout(floodUrl, DEFAULT_TIMEOUT_MS)
    ]).then(function (results) {
      var forecastSettled = results[0];
      var floodSettled = results[1];

      var forecastArr = forecastSettled.status === "fulfilled" ? normalizeBatchResponse(forecastSettled.value) : null;
      var floodArr = floodSettled.status === "fulfilled" ? normalizeBatchResponse(floodSettled.value) : null;

      var errors = [];
      if (!forecastArr) errors.push("Custom Forecast: " + (forecastSettled.reason && forecastSettled.reason.message));
      if (!floodArr) errors.push("Custom GloFAS: " + (floodSettled.reason && floodSettled.reason.message));

      var townRaw = forecastArr && forecastArr[0] ? forecastArr[0] : null;
      var ridgeRaw = forecastArr && forecastArr[1] ? forecastArr[1] : null;
      var floodRaw = floodArr && floodArr[0] ? floodArr[0] : null;

      var metrics = assemblePairMetrics("custom", townRaw, ridgeRaw, floodRaw, modelCfg.modelDefs);
      metrics.fetchedAtIso = new Date().toISOString();
      metrics.okStreams = (townRaw && ridgeRaw ? 1 : 0) + (floodRaw ? 1 : 0);
      metrics.totalStreams = 2;
      metrics.errors = errors;
      return metrics;
    });
  }

  window.LaosFloodApp = window.LaosFloodApp || {};
  window.LaosFloodApp.API = {
    getUtcTodayDateStr: getUtcTodayDateStr,
    getUtcDateOffsetStr: getUtcDateOffsetStr,
    resolveGibsTimeSpec: resolveGibsTimeSpec,
    isGibsDarkSlot: isGibsDarkSlot,
    getTmdSynopticChartUrl: getTmdSynopticChartUrl,
    getTmdSynopticCandidates: getTmdSynopticCandidates,
    getGibsTileUrl: getGibsTileUrl,
    fetchRainViewerMeta: fetchRainViewerMeta,
    buildRainViewerTileUrl: buildRainViewerTileUrl,
    fetchAllProvinceHydromet: fetchAllProvinceHydromet,
    fetchCustomPairHydromet: fetchCustomPairHydromet
  };
})();
