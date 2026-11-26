(function () {
  "use strict";

  var STORAGE_KEY = "laos_flood_monitor_lang";

  var translations = {
    th: {
      "app.title": "ระบบเฝ้าระวังน้ำท่วม ฝน และอากาศ สปป.ลาว",
      "app.subtitle": "Laos Real-Time Hydromet Monitor • Tier 1A Zero-Key",
      "header.syncChecking": "กำลังเตรียมเชื่อมต่อ...",
      "header.refresh": "รีเฟรชข้อมูล",
      "header.theme": "สลับธีม",

      "banner.fileTitle": "ตรวจพบการเปิดผ่าน file:// — กำลังใช้โหมดแผนที่สำรอง (Leaflet Fallback)",
      "banner.fileBody": "เบราว์เซอร์บล็อก Web Worker ของแผนที่ Vector เมื่อเปิดไฟล์โดยตรง กรุณาดับเบิลคลิก start_tier1a.bat เพื่อเปิดผ่าน http://127.0.0.1:8765 สำหรับ OpenFreeMap เต็มรูปแบบ (ข้อมูลพยากรณ์และกราฟยังทำงานปกติ)",

      "kpi.criticalLabel": "แขวงเฝ้าระวังสูง / เสี่ยงน้ำท่วม",
      "kpi.criticalSub": "เกณฑ์ฝน ≥90 มม./24ชม. หรือ GloFAS สูง",
      "kpi.maxRainLabel": "ฝนพยากรณ์สูงสุด 24 ชม. (เมือง vs สันเขา)",
      "kpi.maxRainSub": "เปรียบเทียบจุดหุบเขาและต้นน้ำ",
      "kpi.peakFlowLabel": "อัตราไหลสูงสุด GloFAS v4.0",
      "kpi.peakFlowSub": "อ้างอิงลำน้ำโขงและลุ่มน้ำสาขา",
      "kpi.satLabel": "ภาพดาวเทียม Himawari-9 & เรดาร์",
      "kpi.satSub": "เลือกชั้นข้อมูลด้านซ้ายบนของแผนที่",

      "map.panelTitle": "ชั้นข้อมูลแผนที่ & ดาวเทียม",
      "map.basemap": "แผนที่ฐาน (OpenFreeMap)",
      "map.basemapLiberty": "Liberty (ภูมิประเทศ/ถนน)",
      "map.basemapPositron": "Positron (สว่างเรียบ)",
      "map.basemapDark": "Dark (โหมดมืด)",
      "map.basemapBright": "Bright (คมชัดมาตรฐาน)",
      "map.thOverlay": "แสดงป้ายชื่อแขวงและสถานี (TH/EN)",
      "map.gibsLayer": "Himawari-9 (NASA GIBS WMTS)",
      "map.gibsNone": "ปิดภาพดาวเทียม",
      "map.gibsBand13": "Band 13 Clean IR (ยอดเมฆพายุ)",
      "map.gibsBand3": "Band 3 Visible (ช่วงกลางวัน)",
      "map.gibsAirMass": "Air Mass RGB (มวลอากาศ)",
      "map.gibsDate": "วันที่ภาพ (UTC)",
      "map.gibsRange15d": "ย้อนหลัง 15 วัน",
      "map.gibsSlotLabel": "รอบเวลา (UTC / ICT)",
      "map.gibsSlotLatest": "ล่าสุด (Latest)",
      "map.gibsSlot00": "00 UTC (07:00 ICT)",
      "map.gibsSlot06": "06 UTC (13:00 ICT)",
      "map.gibsSlot12": "12 UTC (19:00 ICT)",
      "map.gibsSlot18": "18 UTC (01:00+1 ICT)",
      "map.gibsNightHint": "โหมด Visible (Band 3) ช่วงกลางคืนภาพจะมืด แนะนำสลับเป็น Band 13 Clean IR",
      "map.gibsOpacity": "ความทึบ",
      "map.rvToggle": "เรดาร์ย้อนหลัง 2 ชม. (RainViewer)",
      "map.rvNote": "Zoom ≤ 7 • ยุติ Nowcast แล้ว",
      "map.rvPlay": "เล่น",
      "map.rvPause": "หยุด",

      "legend.title": "สัญลักษณ์ & ระดับแจ้งเตือน",
      "legend.normal": "ปกติ (<35 มม./24ชม.)",
      "legend.watch": "เฝ้าระวัง (35–89 มม.)",
      "legend.alarm": "เตือนภัย (90–149 มม.)",
      "legend.flood": "วิกฤต (≥150 มม./น้ำล้น)",
      "legend.town": "ตัวเมืองแขวง (Valley)",
      "legend.ridge": "สันเขาต้นน้ำ (Ridge)",
      "legend.gauge": "จุดอ้างอิงแม่น้ำโขง",
      "legend.cursorPin": "หมุดปรับตำแหน่ง (Cursor)",
      "legend.glofas": "จุดน้ำท่า GloFAS v4.0",
      "legend.toggleCursor": "แสดงจุด GloFAS & โหมดปรับพิกัด",

      "detail.sectionEyebrow": "การวิเคราะห์เชิงลึกจุดคู่ขนาน (Paired Nodes)",
      "detail.selectPrompt": "เลือกแขวงบนแผนที่หรือตารางด้านล่าง",
      "detail.townRainLabel": "ฝนเมือง 24 ชม. / 5 วัน",
      "detail.ridgeRainLabel": "ฝนสันเขา 24 ชม. / 5 วัน",
      "detail.glofasLabel": "อัตราไหลสูงสุด GloFAS",
      "detail.rainChartTitle": "เปรียบเทียบฝน 4 โมเดล (ECMWF • JMA • ICON • GFS)",
      "detail.rainChartSub": "ฝนรายชั่วโมงพยากรณ์ 5 วัน: จุดตัวเมือง vs สันเขาต้นน้ำ",
      "detail.floodChartTitle": "ไฮโดรกราฟ GloFAS v4.0 (ย้อนหลัง 5 วัน + พยากรณ์ 14 วัน)",
      "detail.floodChartSub": "ค่าเฉลี่ย (Mean) เทียบค่าสูงสุด (Max) — แสดงแนวโน้มและเกณฑ์ตลิ่งเมื่อมีสถานีอ้างอิง",

      "table.title": "ตารางคัดกรองความเสี่ยงฝนและน้ำท่วม 18 แขวง สปป.ลาว",
      "table.subtitle": "คลิกแถวใดก็ได้เพื่อเลื่อนแผนที่ไปยังพื้นที่และดูกราฟ Paired Nodes + GloFAS",
      "table.searchPlaceholder": "ค้นหาชื่อแขวง / ลุ่มน้ำ...",
      "table.basinAll": "ทุกลุ่มน้ำ",
      "table.alertAll": "ทุกระดับแจ้งเตือน",
      "table.alertFlood": "วิกฤต / Flood",
      "table.alertAlarm": "เตือนภัย / Alarm",
      "table.alertWatch": "เฝ้าระวัง / Watch",
      "table.alertNormal": "ปกติ / Normal",
      "table.exportJson": "ส่งออก JSON",
      "table.colProvince": "แขวง (TH / EN)",
      "table.colBasin": "ลุ่มน้ำหลัก",
      "table.colTownPeak": "ฝนตัวเมือง (24ชม. / 5วัน)",
      "table.colRidgePeak": "ฝนสันเขาต้นน้ำ (24ชม. / 5วัน)",
      "table.colSpread": "ผลต่าง / อัตราขยายสันเขา",
      "table.colGlofas": "GloFAS สูงสุด (ลบ.ม./วิ)",
      "table.colAlert": "สถานะ",
      "table.loadingRow": "กำลังเตรียมตาราง 18 แขวงและดึงข้อมูล Open-Meteo...",
      "table.noMatch": "ไม่พบแขวงที่ตรงกับเงื่อนไขการค้นหา",

      "footer.title": "แหล่งข้อมูลเปิด (Tier 1A Zero-Key CORS APIs) และข้อจำกัดทางเทคนิค",
      "footer.sourcesBody": "ระบบ Tier 1A เชื่อมต่อโดยตรงจากเบราว์เซอร์แบบไม่ต้องใช้ API Key ด้วย 4+1 แหล่งข้อมูลเปิดที่มี CORS: OpenFreeMap (Vector Tiles ภาษาอังกฤษ + ป้ายชื่อไทย/ลาวผ่าน DOM), NASA GIBS WMTS (Himawari-9 Band 13 IR, Band 3 Visible, Air Mass), Open-Meteo Weather Forecast API (ECMWF IFS, JMA GSM, DWD ICON, GFS สำหรับการใช้งาน Non-Commercial), Open-Meteo Flood API (GloFAS v4.0), และ RainViewer (เฉพาะเรดาร์ย้อนหลัง 2 ชม. ที่ Zoom ≤ 7)",
      "footer.limitsTitle": "ขอบเขตเทียบกับ Tier 2a / 2b (Python Backend & Account-Gated)",
      "footer.limitsBody": "ค่าฝนจากแบบจำลอง NWP เป็นค่ากริดเชิงตัวเลขไม่ใช่สถานีวัดจริง และพื้นที่นอกสถานีแม่น้ำโขงมีป้าย [Ungauged / Model-Derived] กำกับชัดเจน: ส่วน METAR สนามบินลาว (aviationweather.gov — ไม่มีปริมาณฝน mm และติด CORS), GEOGloWS ECMWF v2, ThaiWater (ติด CORS), Copernicus CEMS GFM v4.1.1 (SAR Flood ต้องใช้ EFAS JWT), JAXA GSMaP V9, NASA GPM IMERG V07, DAHITI และ Google Flood API ถูกแยกไว้ใน Tier 2a/2b Python Worker",

      "status.normal": "ปกติ",
      "status.watch": "เฝ้าระวัง",
      "status.alarm": "เตือนภัย",
      "status.flood": "วิกฤต",
      "badge.ungauged": "Ungauged / Model-Derived",
      "badge.mekongGauge": "มีเกณฑ์อ้างอิงตลิ่งโขง",
      "sync.syncing": "กำลังซิงค์ข้อมูลสด...",
      "sync.synced": "อัปเดตล่าสุด {time}",
      "sync.partial": "ซิงค์บางส่วน ({ok}/{total})",
      "sync.error": "เชื่อมต่อล้มเหลว",
      "chart.townSeries": "ฝนตัวเมือง (เฉลี่ย 4 โมเดล)",
      "chart.ridgeSeries": "ฝนสันเขาต้นน้ำ (เฉลี่ย 4 โมเดล)",
      "chart.flowMean": "อัตราไหลเฉลี่ย GloFAS Mean",
      "chart.flowMax": "อัตราไหลสูงสุด GloFAS Max",
      "chart.mmUnit": "มม.",
      "chart.cmsUnit": "ลบ.ม./วิ",
      "map.cursorIdle": "เลื่อนเมาส์บนแผนที่เพื่อดูพิกัด Lat, Lon",
      "picker.hudPrompt": "คลิกบนแผนที่เพื่อวางจุด {target} | กด Esc ยกเลิก",
      "picker.targetTown": "Town (ตัวเมือง)",
      "picker.targetRidge": "Ridge (สันเขา)",
      "picker.targetGlofas": "จุดน้ำท่า GloFAS",
      "picker.moveTown": "ย้าย Town",
      "picker.moveRidge": "ย้าย Ridge",
      "picker.moveGlofas": "ย้ายจุดน้ำท่า GloFAS",
      "picker.resetNodes": "คืนค่าพิกัดเดิม",
      "picker.hint": "คลิกปุ่มแล้ววางตามเคอร์เซอร์ หรือลากหมุดของแขวงที่กำลังดูบนแผนที่ได้โดยตรง",
      "picker.customBadge": "พิกัดตาม Cursor | Custom Pin",
      "picker.loading": "กำลังโหลดพิกัดใหม่...",
      "picker.loadError": "ดึงข้อมูลพิกัดใหม่ไม่สำเร็จ",
      "picker.dragTooltip": "ลากเพื่อย้ายจุด",
      "tmd.title": "แผนที่อากาศผิวพื้น (TMD Surface Synoptic Chart)",
      "tmd.subtitle": "ซิงค์วันที่และรอบเวลา UTC/ICT เดียวกับภาพดาวเทียม Himawari-9 (ย้อนหลัง 15 วัน)",
      "tmd.statusLoading": "กำลังโหลดแผนที่อากาศ...",
      "tmd.statusError": "ไม่พบแผนที่อากาศรอบนี้",
      "tmd.expandBtn": "ขยายเต็มจอ",
      "tmd.slotLatest": "ล่าสุด",
      "tmd.loadingHint": "กำลังตรวจสอบรอบแผนที่อากาศล่าสุดจากกรมอุตุนิยมวิทยา (TMD)...",
      "tmd.emptyError": "ยังไม่มีภาพแผนที่อากาศสำหรับช่วงเวลานี้ (อาจติด lag เผยแพร่ ~5–6 ชม.) กรุณาเปิดลิงก์ต้นทางหรือสำรอง HII",
      "tmd.sourceLink": "เปิดหน้า TMD Synoptic Charts",
      "tmd.hiiMirrorLink": "เปิดภาพสำรอง HII Latest",
      "tmd.sourceShort": "แหล่งข้อมูล: TMD",
      "tmd.hiiShort": "สำรอง: HII",
      "tmd.projectionNote": "Regional Conic chart (00/06/12/18 UTC) — แสดงแยกไม่ฉายทับ Web Mercator",
      "tmd.closeBtn": "ปิด (Esc)",
      "tmd.prevFallbackTag": "รอบก่อนหน้า",
      "map.stationIcons": "แสดงหมุดสถานี & เส้นเชื่อม (M)",
      "map.quickHidePins": "ซ่อนหมุด (M)",
      "map.quickShowPins": "แสดงหมุด (M)",
      "map.quickCleanEnter": "Clean View (H)",
      "map.quickCleanExit": "แสดงแผง (H)",
      "map.quickStationsTitle": "สลับการแสดงหมุดสถานีและเส้นเชื่อมบนแผนที่ (คีย์ M)",
      "map.quickCleanTitle": "สลับโหมด Clean View ซ่อนแผงลอยและหมุดเพื่อดูภาพดาวเทียมโล่ง (คีย์ H)",
      "header.hideAnalysis": "ซ่อนกราฟ & ตาราง",
      "header.showAnalysis": "แสดงกราฟ & ตาราง",
      "header.focusSynopticTitle": "ซ่อน/แสดง 4-Model + GloFAS และตาราง 18 แขวงในคลิกเดียว",
      "detail.hideCharts": "ซ่อน 4-Model + GloFAS",
      "detail.showCharts": "แสดง 4-Model + GloFAS",
      "detail.exportCsv": "ส่งออกฝน CSV (จุดนี้)",
      "detail.exportCsvTitle": "ส่งออกไฟล์ CSV ปริมาณฝนรายชั่วโมง 5 วัน (4 โมเดล + ค่าเฉลี่ย) ของแขวงที่เลือกหรือจุด Cursor ที่ปักไว้",
      "table.hideTable": "ซ่อนตาราง 18 แขวง",
      "table.showTable": "แสดงตาราง 18 แขวง"
    },

    en: {
      "app.title": "Laos Real-Time Hydromet Monitor",
      "app.subtitle": "Laos Real-Time Hydromet Monitor • Tier 1A Zero-Key",
      "header.syncChecking": "Initializing feeds...",
      "header.refresh": "Refresh Data",
      "header.theme": "Theme",

      "banner.fileTitle": "Opened via file:// — Leaflet fallback active",
      "banner.fileBody": "Browsers block MapLibre Web Workers on local file:// URLs. Double-click start_tier1a.bat to serve on http://127.0.0.1:8765 for full OpenFreeMap vector tiles (live weather and hydrographs still work).",

      "kpi.criticalLabel": "High Rain / Flood Alert Provinces",
      "kpi.criticalSub": "Rain ≥90 mm/24h or elevated GloFAS",
      "kpi.maxRainLabel": "Peak 24h Forecast Rain (Town vs Ridge)",
      "kpi.maxRainSub": "Valley town vs upstream ridge peak",
      "kpi.peakFlowLabel": "Highest GloFAS v4.0 Discharge",
      "kpi.peakFlowSub": "Mekong & tributary model estimate",
      "kpi.satLabel": "Himawari-9 GIBS & Radar Status",
      "kpi.satSub": "Select satellite / radar layer on map",

      "map.panelTitle": "Map & Satellite Layers",
      "map.basemap": "Basemap (OpenFreeMap)",
      "map.basemapLiberty": "Liberty (Topo & Roads)",
      "map.basemapPositron": "Positron (Light Minimal)",
      "map.basemapDark": "Dark (Night Ops)",
      "map.basemapBright": "Bright (Standard Contrast)",
      "map.thOverlay": "Province & Station Labels (TH/EN)",
      "map.gibsLayer": "Himawari-9 (NASA GIBS WMTS)",
      "map.gibsNone": "Off",
      "map.gibsBand13": "Band 13 Clean IR (Cloud Tops)",
      "map.gibsBand3": "Band 3 Red Visible (Daytime)",
      "map.gibsAirMass": "Air Mass RGB",
      "map.gibsDate": "Satellite Date (UTC)",
      "map.gibsRange15d": "15-day archive",
      "map.gibsSlotLabel": "Cycle Slot (UTC / ICT)",
      "map.gibsSlotLatest": "Latest",
      "map.gibsSlot00": "00 UTC (07:00 ICT)",
      "map.gibsSlot06": "06 UTC (13:00 ICT)",
      "map.gibsSlot12": "12 UTC (19:00 ICT)",
      "map.gibsSlot18": "18 UTC (01:00+1 ICT)",
      "map.gibsNightHint": "Visible Band 3 appears dark during local nighttime hours; switch to Band 13 Clean IR for clouds.",
      "map.gibsOpacity": "Opacity",
      "map.rvToggle": "RainViewer Past 2h Radar",
      "map.rvNote": "Zoom ≤ 7 • Nowcast discontinued",
      "map.rvPlay": "Play",
      "map.rvPause": "Pause",

      "legend.title": "Legend & Alert Levels",
      "legend.normal": "Normal (<35 mm/24h)",
      "legend.watch": "Watch (35–89 mm)",
      "legend.alarm": "Alarm (90–149 mm)",
      "legend.flood": "Danger (≥150 mm / Flood)",
      "legend.town": "Province Town (Valley)",
      "legend.ridge": "Upstream Ridge",
      "legend.gauge": "Mekong Reference Gauge",
      "legend.cursorPin": "Adjustable Pin (Cursor)",
      "legend.glofas": "GloFAS v4.0 River Point",
      "legend.toggleCursor": "Show GloFAS & Cursor Picker",

      "detail.sectionEyebrow": "Paired Node Investigation",
      "detail.selectPrompt": "Select a province on the map or table",
      "detail.townRainLabel": "Town Peak 24h / 5d",
      "detail.ridgeRainLabel": "Ridge Peak 24h / 5d",
      "detail.glofasLabel": "GloFAS Peak Discharge",
      "detail.rainChartTitle": "4-Model Rain Comparison (ECMWF • JMA • ICON • GFS)",
      "detail.rainChartSub": "Hourly 5-day forecast: Valley Town vs Upstream Ridge",
      "detail.floodChartTitle": "GloFAS v4.0 Hydrograph (5d Past + 14d Forecast)",
      "detail.floodChartSub": "Mean vs Max ensemble spread — directional model estimate with gauge context",

      "table.title": "18-Province Rainfall & Flood Screening Matrix",
      "table.subtitle": "Click any row to pan map and inspect Paired Node models & GloFAS discharge",
      "table.searchPlaceholder": "Search province or basin...",
      "table.basinAll": "All Basins",
      "table.alertAll": "All Alert Levels",
      "table.alertFlood": "Danger / Flood",
      "table.alertAlarm": "Alarm",
      "table.alertWatch": "Watch",
      "table.alertNormal": "Normal",
      "table.exportJson": "Export JSON",
      "table.colProvince": "Province (TH / EN)",
      "table.colBasin": "Main Basin",
      "table.colTownPeak": "Town Peak (24h / 5d)",
      "table.colRidgePeak": "Ridge Peak (24h / 5d)",
      "table.colSpread": "Ridge Spread / Ratio",
      "table.colGlofas": "GloFAS Max (m³/s)",
      "table.colAlert": "Alert",
      "table.loadingRow": "Initializing 18 provinces and fetching Open-Meteo feeds...",
      "table.noMatch": "No provinces match the current filters",

      "footer.title": "Data Attribution (Tier 1A Zero-Key CORS APIs) & Technical Limitations",
      "footer.sourcesBody": "Tier 1A connects directly from the browser with zero API keys using 4+1 CORS-enabled open feeds: OpenFreeMap (English vector tiles + DOM Thai/Lao labels), NASA GIBS WMTS (Himawari-9 Band 13 IR, Band 3 Visible, Air Mass), Open-Meteo Forecast API (ECMWF IFS, JMA GSM, DWD ICON, GFS for non-commercial use), Open-Meteo Flood API (GloFAS v4.0), and optional RainViewer (past 2h historical radar tiles capped at Zoom ≤ 7).",
      "footer.limitsTitle": "Boundary vs. Tier 2a / 2b (Python Backend & Account-Gated)",
      "footer.limitsBody": "NWP model rainfall is gridded guidance rather than physical rain gauges, and non-Mekong basins carry an explicit [Ungauged / Model-Derived] badge. Laos airport METARs (aviationweather.gov — lacks quantitative mm & blocks browser CORS), GEOGloWS ECMWF v2, ThaiWater (CORS-blocked), Copernicus CEMS GFM v4.1.1 (EFAS JWT auth), JAXA GSMaP V9, NASA GPM IMERG V07, DAHITI, and Google Flood API belong in Tier 2a/2b Python workers.",

      "status.normal": "Normal",
      "status.watch": "Watch",
      "status.alarm": "Alarm",
      "status.flood": "Danger",
      "badge.ungauged": "Ungauged / Model-Derived",
      "badge.mekongGauge": "Mekong Threshold Reference",
      "sync.syncing": "Syncing live feeds...",
      "sync.synced": "Synced {time}",
      "sync.partial": "Partial sync ({ok}/{total})",
      "sync.error": "Sync failed",
      "chart.townSeries": "Town Rain (4-Model Mean)",
      "chart.ridgeSeries": "Upstream Ridge (4-Model Mean)",
      "chart.flowMean": "GloFAS Mean Discharge",
      "chart.flowMax": "GloFAS Max Discharge",
      "chart.mmUnit": "mm",
      "chart.cmsUnit": "m³/s",
      "map.cursorIdle": "Hover map to inspect Lat, Lon",
      "picker.hudPrompt": "Click map to place {target} | Esc to cancel",
      "picker.targetTown": "Town",
      "picker.targetRidge": "Ridge",
      "picker.targetGlofas": "GloFAS River Point",
      "picker.moveTown": "Move Town",
      "picker.moveRidge": "Move Ridge",
      "picker.moveGlofas": "Move GloFAS Point",
      "picker.resetNodes": "Reset Pins",
      "picker.hint": "Click a button then place at cursor, or drag active pins directly on the map",
      "picker.customBadge": "Custom Pin | Cursor",
      "picker.loading": "Loading custom pin...",
      "picker.loadError": "Custom pin fetch failed",
      "picker.dragTooltip": "Drag pin to relocate",
      "tmd.title": "TMD Surface Synoptic Chart",
      "tmd.subtitle": "Synced UTC/ICT date & cycle with Himawari-9 satellite layer (15-day archive)",
      "tmd.statusLoading": "Loading synoptic chart...",
      "tmd.statusError": "Chart unavailable for cycle",
      "tmd.expandBtn": "Fullscreen",
      "tmd.slotLatest": "Latest",
      "tmd.loadingHint": "Probing latest surface synoptic chart from Thai Meteorological Department (TMD)...",
      "tmd.emptyError": "No TMD synoptic chart available for this cycle (latest slot may lag ~5–6h). Try the official source or HII mirror below.",
      "tmd.sourceLink": "Open TMD Synoptic Charts",
      "tmd.hiiMirrorLink": "Open HII Mirror Latest",
      "tmd.sourceShort": "Source: TMD",
      "tmd.hiiShort": "Mirror: HII",
      "tmd.projectionNote": "Regional Conic chart (00/06/12/18 UTC) — displayed separately, never warped onto Web Mercator",
      "tmd.closeBtn": "Close (Esc)",
      "tmd.prevFallbackTag": "Prev. cycle",
      "map.stationIcons": "Show Station Icons & Links (M)",
      "map.quickHidePins": "Hide Pins (M)",
      "map.quickShowPins": "Show Pins (M)",
      "map.quickCleanEnter": "Clean View (H)",
      "map.quickCleanExit": "Show Panels (H)",
      "map.quickStationsTitle": "Toggle station pins and paired connector lines on the map (Key M)",
      "map.quickCleanTitle": "Toggle Clean View to hide map overlays and inspect imagery cleanly (Key H)",
      "header.hideAnalysis": "Hide Charts & Matrix",
      "header.showAnalysis": "Show Charts & Matrix",
      "header.focusSynopticTitle": "Toggle 4-Model + GloFAS charts and 18-province screening matrix in one click",
      "detail.hideCharts": "Hide 4-Model + GloFAS",
      "detail.showCharts": "Show 4-Model + GloFAS",
      "detail.exportCsv": "Export Rain CSV (Point)",
      "detail.exportCsvTitle": "Export 5-day hourly rainfall CSV (4 models + ensemble mean) for the selected province or Cursor-pinned location",
      "table.hideTable": "Hide 18-Province Matrix",
      "table.showTable": "Show 18-Province Matrix"
    }
  };

  function loadInitialLang() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "th" || saved === "en") {
        return saved;
      }
    } catch (_) {
      // Ignore storage errors under strict file:// policies
    }
    return "th";
  }

  var currentLang = loadInitialLang();

  function formatTemplate(str, vars) {
    if (!vars || typeof str !== "string") return str;
    return str.replace(/\{(\w+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "{" + key + "}";
    });
  }

  function t(key, vars) {
    var dict = translations[currentLang] || translations.en;
    var val = Object.prototype.hasOwnProperty.call(dict, key)
      ? dict[key]
      : (translations.en[key] || key);
    return formatTemplate(val, vars);
  }

  function updateLangButton() {
    var btn = document.getElementById("btn-lang");
    if (!btn) return;
    btn.textContent = currentLang === "th" ? "TH | en" : "th | EN";
    btn.setAttribute("data-lang", currentLang);
  }

  function apply(root) {
    var scope = root || document;
    if (document.documentElement) {
      document.documentElement.lang = currentLang;
    }

    var textNodes = scope.querySelectorAll("[data-i18n]");
    for (var i = 0; i < textNodes.length; i++) {
      var el = textNodes[i];
      var key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = t(key);
      }
    }

    var placeholderNodes = scope.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < placeholderNodes.length; j++) {
      var pEl = placeholderNodes[j];
      var pKey = pEl.getAttribute("data-i18n-placeholder");
      if (pKey) {
        pEl.setAttribute("placeholder", t(pKey));
      }
    }

    var titleNodes = scope.querySelectorAll("[data-i18n-title]");
    for (var k = 0; k < titleNodes.length; k++) {
      var tEl = titleNodes[k];
      var tKey = tEl.getAttribute("data-i18n-title");
      if (tKey) {
        tEl.setAttribute("title", t(tKey));
      }
    }

    updateLangButton();
  }

  function setLang(lang) {
    if (lang !== "th" && lang !== "en") return currentLang;
    currentLang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {
      // Ignore storage errors
    }
    apply(document);
    try {
      window.dispatchEvent(new CustomEvent("laosapp:langchange", { detail: { lang: currentLang } }));
    } catch (_) {
      // Fallback for older browsers
    }
    return currentLang;
  }

  function toggleLang() {
    return setLang(currentLang === "th" ? "en" : "th");
  }

  function getLang() {
    return currentLang;
  }

  window.LaosFloodApp = window.LaosFloodApp || {};
  window.LaosFloodApp.i18n = {
    translations: translations,
    t: t,
    apply: apply,
    setLang: setLang,
    toggleLang: toggleLang,
    getLang: getLang
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      apply(document);
    });
  } else {
    apply(document);
  }
})();
