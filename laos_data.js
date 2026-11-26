(function () {
  "use strict";

  var PROVINCES = [
    {
      id: "vientiane_capital",
      name_th: "นครหลวงเวียงจันทน์",
      name_en: "Vientiane Capital",
      capital_th: "เวียงจันทน์",
      capital_en: "Vientiane",
      basin_id: "mekong_central",
      basin_th: "แม่น้ำโขงตอนกลาง",
      basin_en: "Middle Mekong",
      town: {
        lat: 17.9667,
        lon: 102.6000,
        elev_m: 174,
        label_th: "ตัวเมืองเวียงจันทน์",
        label_en: "Vientiane City"
      },
      ridge: {
        lat: 18.0908,
        lon: 102.2900,
        elev_m: 350,
        label_th: "สันเขาภูพะนาง (สังทอง)",
        label_en: "Sangthong Uplands"
      },
      glofas_point: {
        lat: 17.9283,
        lon: 102.6200,
        label_th: "แม่น้ำโขง เวียงจันทน์ KM4",
        label_en: "Mekong @ Vientiane KM4"
      },
      has_mekong_gauge: true,
      mrc_station_code: "011901",
      mrc_alarm_m: 11.50,
      mrc_flood_m: 12.50,
      river_note_th: "อ้างอิงสถานีโขง MRC 011901 (เฝ้าระวัง 11.50 ม. / วิกฤต 12.50 ม.)",
      river_note_en: "MRC Ref Gauge 011901 (Alarm 11.50 m / Flood 12.50 m)"
    },
    {
      id: "phongsaly",
      name_th: "แขวงพงสาลี",
      name_en: "Phongsaly",
      capital_th: "พงสาลี",
      capital_en: "Phongsaly",
      basin_id: "nam_ou",
      basin_th: "ลุ่มน้ำอู",
      basin_en: "Nam Ou Basin",
      town: {
        lat: 21.6830,
        lon: 102.1000,
        elev_m: 1380,
        label_th: "เมืองพงสาลี",
        label_en: "Phongsaly Town"
      },
      ridge: {
        lat: 22.2500,
        lon: 102.0000,
        elev_m: 1550,
        label_th: "ต้นน้ำอูตอนบน (ชายแดนจีน)",
        label_en: "Upper Nam Ou Crest"
      },
      glofas_point: {
        lat: 21.0670,
        lon: 102.3760,
        label_th: "แม่น้ำอู @ เมืองขวา",
        label_en: "Nam Ou @ Muang Khoua"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ลุ่มน้ำอูตอนบน ไม่มีค่าระดับตลิ่ง MRC สาธารณะ",
      river_note_en: "Upper Nam Ou Basin (No public MRC stage threshold)"
    },
    {
      id: "luang_namtha",
      name_th: "แขวงหลวงน้ำทา",
      name_en: "Luang Namtha",
      capital_th: "หลวงน้ำทา",
      capital_en: "Luang Namtha",
      basin_id: "nam_tha",
      basin_th: "ลุ่มน้ำทา",
      basin_en: "Nam Tha Basin",
      town: {
        lat: 20.9569,
        lon: 101.3950,
        elev_m: 560,
        label_th: "เมืองหลวงน้ำทา",
        label_en: "Luang Namtha Town"
      },
      ridge: {
        lat: 20.6800,
        lon: 101.0700,
        elev_m: 900,
        label_th: "เทือกเขาเวียงภูคา",
        label_en: "Vieng Phoukha Uplands"
      },
      glofas_point: {
        lat: 20.9569,
        lon: 101.3950,
        label_th: "ลุ่มน้ำทา @ หลวงน้ำทา",
        label_en: "Nam Tha @ Luang Namtha"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ลุ่มน้ำทาไหลออกแม่น้ำโขงที่ปากทา",
      river_note_en: "Nam Tha Tributary Basin (Ungauged)"
    },
    {
      id: "oudomxay",
      name_th: "แขวงอุดมไซ",
      name_en: "Oudomxay",
      capital_th: "เมืองไชย",
      capital_en: "Muang Xay",
      basin_id: "nam_beng",
      basin_th: "ลุ่มน้ำแบง / น้ำกอ",
      basin_en: "Nam Beng / Nam Ko",
      town: {
        lat: 20.6910,
        lon: 101.9860,
        elev_m: 640,
        label_th: "เมืองไชย (อุดมไซ)",
        label_en: "Muang Xay"
      },
      ridge: {
        lat: 20.9500,
        lon: 101.7300,
        elev_m: 850,
        label_th: "สันเขาเมืองนาหม้อ (ต้นน้ำกอ)",
        label_en: "Muang Namo Ridge"
      },
      glofas_point: {
        lat: 20.6910,
        lon: 101.9860,
        label_th: "น้ำกอ-น้ำแบง @ เมืองไชย",
        label_en: "Nam Ko-Beng @ Muang Xay"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "หุบเขาเสี่ยงน้ำป่าไหลหลาก (Ungauged Model)",
      river_note_en: "Intermontane Flash-Flood Valley"
    },
    {
      id: "bokeo",
      name_th: "แขวงบ่อแก้ว",
      name_en: "Bokeo",
      capital_th: "ห้วยทราย",
      capital_en: "Houayxay",
      basin_id: "mekong_north",
      basin_th: "แม่น้ำโขงตอนบน",
      basin_en: "Upper Mekong",
      town: {
        lat: 20.2630,
        lon: 100.4340,
        elev_m: 380,
        label_th: "เมืองห้วยทราย",
        label_en: "Houayxay"
      },
      ridge: {
        lat: 20.1874,
        lon: 100.9260,
        elev_m: 826,
        label_th: "เทือกเขาผาอุดม",
        label_en: "Pha Oudom Uplands"
      },
      glofas_point: {
        lat: 20.2630,
        lon: 100.4340,
        label_th: "แม่น้ำโขง @ ห้วยทราย",
        label_en: "Mekong @ Houayxay"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "แม่น้ำโขงตอนบนและลุ่มน้ำทาตอนล่าง",
      river_note_en: "Upper Mekong & Lower Nam Tha"
    },
    {
      id: "luang_prabang",
      name_th: "แขวงหลวงพระบาง",
      name_en: "Luang Prabang",
      capital_th: "หลวงพระบาง",
      capital_en: "Luang Prabang",
      basin_id: "mekong_north",
      basin_th: "แม่น้ำโขงตอนบน / น้ำอู",
      basin_en: "Upper Mekong / Nam Ou",
      town: {
        lat: 19.8900,
        lon: 102.1347,
        elev_m: 305,
        label_th: "เมืองหลวงพระบาง",
        label_en: "Luang Prabang Town"
      },
      ridge: {
        lat: 20.5710,
        lon: 102.6116,
        elev_m: 850,
        label_th: "หุบเขาหนองเขียว-เมืองงอย (น้ำอู)",
        label_en: "Nong Khiaw Gorge (Nam Ou)"
      },
      glofas_point: {
        lat: 19.8917,
        lon: 102.1367,
        label_th: "แม่น้ำโขง @ หลวงพระบาง",
        label_en: "Mekong @ Luang Prabang"
      },
      has_mekong_gauge: true,
      mrc_station_code: "011201",
      mrc_alarm_m: 17.50,
      mrc_flood_m: 18.00,
      river_note_th: "อ้างอิงสถานีโขง MRC 011201 (เฝ้าระวัง 17.50 ม. / วิกฤต 18.00 ม.)",
      river_note_en: "MRC Ref Gauge 011201 (Alarm 17.50 m / Flood 18.00 m)"
    },
    {
      id: "houaphanh",
      name_th: "แขวงหัวพัน",
      name_en: "Houaphanh",
      capital_th: "ซำเหนือ",
      capital_en: "Xam Neua",
      basin_id: "nam_ma",
      basin_th: "ลุ่มน้ำม้า (อ่าวตังเกี๋ย)",
      basin_en: "Nam Ma Basin",
      town: {
        lat: 20.4150,
        lon: 104.0480,
        elev_m: 1020,
        label_th: "เมืองซำเหนือ",
        label_en: "Xam Neua"
      },
      ridge: {
        lat: 20.4109,
        lon: 104.2277,
        elev_m: 1150,
        label_th: "เทือกเขาเวียงไซ-ต้นน้ำม้า",
        label_en: "Viengxay Ridge"
      },
      glofas_point: {
        lat: 20.4150,
        lon: 104.0480,
        label_th: "น้ำซำ-น้ำม้า @ ซำเหนือ",
        label_en: "Nam Xam-Ma @ Xam Neua"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ต้นน้ำม้าไหลสู่อ่าวตังเกี๋ย (นอกลุ่มน้ำโขง)",
      river_note_en: "Nam Ma Headwaters (Drains E to Gulf of Tonkin)"
    },
    {
      id: "sainyabuli",
      name_th: "แขวงไชยบุรี (ไซยะบูลี)",
      name_en: "Sainyabuli",
      capital_th: "ไชยบุรี",
      capital_en: "Sainyabuli",
      basin_id: "mekong_north",
      basin_th: "แม่น้ำโขงฝั่งขวา (น้ำหุ่ง)",
      basin_en: "West Mekong Tributaries",
      town: {
        lat: 19.2576,
        lon: 101.7103,
        elev_m: 320,
        label_th: "เมืองไชยบุรี",
        label_en: "Sainyabuli Town"
      },
      ridge: {
        lat: 19.7068,
        lon: 101.3408,
        elev_m: 809,
        label_th: "ที่ราบสูงหงสา",
        label_en: "Hongsa Highlands"
      },
      glofas_point: {
        lat: 19.2576,
        lon: 101.7103,
        label_th: "น้ำหุ่ง @ ไชยบุรี",
        label_en: "Nam Houng @ Sainyabuli"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ฝั่งขวาแม่น้ำโขงตอนบน ใกล้อ่างไชยบุรี",
      river_note_en: "Right Bank Mekong & Nam Houng Basin"
    },
    {
      id: "xiangkhouang",
      name_th: "แขวงเชียงขวาง",
      name_en: "Xiangkhouang",
      capital_th: "โพนสะหวัน",
      capital_en: "Phonsavan",
      basin_id: "nam_ngum",
      basin_th: "ต้นน้ำงึม / น้ำเนิด",
      basin_en: "Nam Ngum Headwaters",
      town: {
        lat: 19.4520,
        lon: 103.2060,
        elev_m: 1100,
        label_th: "เมืองโพนสะหวัน",
        label_en: "Phonsavan"
      },
      ridge: {
        lat: 19.4979,
        lon: 103.9856,
        elev_m: 1350,
        label_th: "สันเขาหนองแฮด (เทือกเขาอันนัม)",
        label_en: "Nong Het Annamite Divide"
      },
      glofas_point: {
        lat: 19.6326,
        lon: 103.5678,
        label_th: "ต้นน้ำเนิด @ เมืองคำ",
        label_en: "Upper Nam Neun @ Muang Kham"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ที่ราบสูงต้นน้ำงึมและน้ำเนิด (Ungauged Model)",
      river_note_en: "Xiangkhouang Plateau Headwaters"
    },
    {
      id: "vientiane_province",
      name_th: "แขวงเวียงจันทน์",
      name_en: "Vientiane Province",
      capital_th: "โพนโฮง",
      capital_en: "Phonhong",
      basin_id: "nam_ngum",
      basin_th: "ลุ่มน้ำงึม / น้ำลีก",
      basin_en: "Nam Ngum / Nam Lik",
      town: {
        lat: 18.5010,
        lon: 102.4170,
        elev_m: 200,
        label_th: "เมืองโพนโฮง",
        label_en: "Phonhong"
      },
      ridge: {
        lat: 19.1421,
        lon: 102.1743,
        elev_m: 525,
        label_th: "ต้นน้ำลีก-วังเวียง (กาสี)",
        label_en: "Kasi Upper Nam Lik"
      },
      glofas_point: {
        lat: 18.5800,
        lon: 102.5700,
        label_th: "น้ำงึม @ เขื่อนน้ำงึม 1",
        label_en: "Nam Ngum @ Reservoir Outlet"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ท้ายเขื่อนน้ำงึม 1 และจุดบรรจบน้ำลีก",
      river_note_en: "Below Nam Ngum 1 Dam & Nam Lik Confluence"
    },
    {
      id: "xaisomboun",
      name_th: "แขวงไชยสมบูรณ์",
      name_en: "Xaisomboun",
      capital_th: "อนุวงศ์",
      capital_en: "Anouvong",
      basin_id: "nam_ngum",
      basin_th: "ลุ่มน้ำงึม / น้ำซัน",
      basin_en: "Upper Nam Ngum / Nam Xan",
      town: {
        lat: 18.8980,
        lon: 103.0920,
        elev_m: 1148,
        label_th: "เมืองอนุวงศ์",
        label_en: "Anouvong"
      },
      ridge: {
        lat: 18.9800,
        lon: 103.1500,
        elev_m: 2150,
        label_th: "เทือกเขาภูเบี้ย (ยอดสูงสุดลาว)",
        label_en: "Phou Bia Massif Crest"
      },
      glofas_point: {
        lat: 18.8980,
        lon: 103.0920,
        label_th: "ลุ่มน้ำซัน-น้ำงึม @ อนุวงศ์",
        label_en: "Nam Xan-Ngum @ Anouvong"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "เทือกเขาสูงชัน ฝนตกหนักกระตุ้นอ่างน้ำงึม",
      river_note_en: "High-Elevation Orographic Trigger Zone"
    },
    {
      id: "bolikhamxai",
      name_th: "แขวงบอลิคำไซ",
      name_en: "Bolikhamxai",
      capital_th: "ปากซัน",
      capital_en: "Paksan",
      basin_id: "nam_kading",
      basin_th: "แม่น้ำโขง / น้ำเทิน-น้ำกะดิ่ง",
      basin_en: "Mekong / Nam Kading",
      town: {
        lat: 18.3960,
        lon: 103.6560,
        elev_m: 155,
        label_th: "เมืองปากซัน",
        label_en: "Paksan"
      },
      ridge: {
        lat: 18.1939,
        lon: 104.9714,
        elev_m: 540,
        label_th: "หลักซาว / คำเกิด (ต้นน้ำกะดิ่ง)",
        label_en: "Lak Sao / Upper Nam Kading"
      },
      glofas_point: {
        lat: 18.3720,
        lon: 103.6670,
        label_th: "แม่น้ำโขง @ ปากซัน",
        label_en: "Mekong @ Paksane"
      },
      has_mekong_gauge: true,
      mrc_station_code: "012703",
      mrc_alarm_m: 13.50,
      mrc_flood_m: 14.50,
      river_note_th: "อ้างอิงสถานีโขง MRC 012703 (เฝ้าระวัง 13.50 ม. / วิกฤต 14.50 ม.)",
      river_note_en: "MRC Ref Gauge 012703 (Alarm 13.50 m / Flood 14.50 m)"
    },
    {
      id: "khammouane",
      name_th: "แขวงคำม่วน",
      name_en: "Khammouane",
      capital_th: "ท่าแขก",
      capital_en: "Thakhek",
      basin_id: "xe_bang_fai",
      basin_th: "แม่น้ำโขง / เซบั้งไฟ",
      basin_en: "Mekong / Xe Bang Fai",
      town: {
        lat: 17.4000,
        lon: 104.8000,
        elev_m: 145,
        label_th: "เมืองท่าแขก",
        label_en: "Thakhek"
      },
      ridge: {
        lat: 17.3030,
        lon: 105.9410,
        elev_m: 321,
        label_th: "บัวละพา-หินหนามหน่อ (ต้นน้ำเซบั้งไฟ)",
        label_en: "Boualapha Karst Headwaters"
      },
      glofas_point: {
        lat: 17.3933,
        lon: 104.8067,
        label_th: "แม่น้ำโขง @ ท่าแขก",
        label_en: "Mekong @ Thakhek"
      },
      has_mekong_gauge: true,
      mrc_station_code: "013102",
      mrc_alarm_m: 13.00,
      mrc_flood_m: 14.00,
      river_note_th: "MRC 013102 (13.0/14.0 ม.) + มหาไซ 320107 เซบั้งไฟ (วิกฤตตลิ่ง 15.00 ม.)",
      river_note_en: "MRC 013102 (13.0/14.0 m) + Mahaxai 320107 Bank 15.00 m"
    },
    {
      id: "savannakhet",
      name_th: "แขวงสะหวันนะเขต",
      name_en: "Savannakhet",
      capital_th: "ไกสอน พมวิหาน",
      capital_en: "Kaysone Phomvihane",
      basin_id: "xe_bang_hieng",
      basin_th: "แม่น้ำโขง / เซบั้งเหียง",
      basin_en: "Mekong / Xe Bang Hieng",
      town: {
        lat: 16.5500,
        lon: 104.7500,
        elev_m: 140,
        label_th: "ไกสอน พมวิหาน (สะหวันนะเขต)",
        label_en: "Savannakhet / Kaysone"
      },
      ridge: {
        lat: 16.3753,
        lon: 106.4983,
        elev_m: 450,
        label_th: "เมืองนอง-เซโปน (ต้นน้ำเซบั้งเหียง)",
        label_en: "Nong / Sepon Annamite Crest"
      },
      glofas_point: {
        lat: 16.5617,
        lon: 104.7467,
        label_th: "แม่น้ำโขง @ สะหวันนะเขต",
        label_en: "Mekong @ Savannakhet"
      },
      has_mekong_gauge: true,
      mrc_station_code: "013401",
      mrc_alarm_m: 12.00,
      mrc_flood_m: 13.00,
      river_note_th: "อ้างอิงสถานีโขง MRC 013401 (เฝ้าระวัง 12.00 ม. / วิกฤต 13.00 ม.)",
      river_note_en: "MRC Ref Gauge 013401 (Alarm 12.00 m / Flood 13.00 m)"
    },
    {
      id: "salavan",
      name_th: "แขวงสาละวัน",
      name_en: "Salavan",
      capital_th: "สาละวัน",
      capital_en: "Salavan",
      basin_id: "sekong_xe_don",
      basin_th: "ลุ่มน้ำเซโดน / เซโปน",
      basin_en: "Xe Don / Sepon",
      town: {
        lat: 15.7167,
        lon: 106.4167,
        elev_m: 180,
        label_th: "เมืองสาละวัน",
        label_en: "Salavan Town"
      },
      ridge: {
        lat: 16.0777,
        lon: 106.7030,
        elev_m: 620,
        label_th: "เมืองตะโอ้ย (ต้นน้ำเซโดน-ซะม้วย)",
        label_en: "Ta Oy Annamite Uplands"
      },
      glofas_point: {
        lat: 15.7167,
        lon: 106.4167,
        label_th: "เซโดน @ สาละวัน",
        label_en: "Xe Don @ Salavan"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ลุ่มน้ำเซโดนไหลลงแม่น้ำโขงที่ปากเซ",
      river_note_en: "Xe Don Tributary Draining to Pakse"
    },
    {
      id: "sekong",
      name_th: "แขวงเซกอง",
      name_en: "Sekong",
      capital_th: "เซกอง (ละมาม)",
      capital_en: "Sekong (Lamam)",
      basin_id: "sekong_xe_don",
      basin_th: "ลุ่มน้ำเซกอง (3S)",
      basin_en: "Sekong Basin (3S)",
      town: {
        lat: 15.3440,
        lon: 106.7180,
        elev_m: 160,
        label_th: "เมืองเซกอง (ละมาม)",
        label_en: "Sekong Town"
      },
      ridge: {
        lat: 15.3819,
        lon: 107.3185,
        elev_m: 1250,
        label_th: "ที่ราบสูงดักจึง (ต้นน้ำเซกอง)",
        label_en: "Dak Cheung Plateau"
      },
      glofas_point: {
        lat: 15.3440,
        lon: 106.7180,
        label_th: "แม่น้ำเซกอง @ ละมาม",
        label_en: "Sekong River @ Lamam"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ลุ่มน้ำเซกองตอนกลาง ฝนภูเขาดักจึงและกะลึมสูง",
      river_note_en: "Sekong 3S Sub-Basin (Orographic Monsoon Hub)"
    },
    {
      id: "champasak",
      name_th: "แขวงจำปาสัก",
      name_en: "Champasak",
      capital_th: "ปากเซ",
      capital_en: "Pakse",
      basin_id: "mekong_south",
      basin_th: "แม่น้ำโขงตอนล่าง / เซโดน",
      basin_en: "Lower Mekong / Xe Don",
      town: {
        lat: 15.1170,
        lon: 105.7830,
        elev_m: 102,
        label_th: "เมืองปากเซ",
        label_en: "Pakse"
      },
      ridge: {
        lat: 15.1767,
        lon: 106.2346,
        elev_m: 1288,
        label_th: "ที่ราบสูงโบโลเวน (ปากซ่อง)",
        label_en: "Bolaven Plateau (Paksong)"
      },
      glofas_point: {
        lat: 15.1167,
        lon: 105.8000,
        label_th: "แม่น้ำโขง @ ปากเซ",
        label_en: "Mekong @ Pakse"
      },
      has_mekong_gauge: true,
      mrc_station_code: "013901",
      mrc_alarm_m: 11.00,
      mrc_flood_m: 12.00,
      river_note_th: "อ้างอิงสถานีโขง MRC 013901 (เฝ้าระวัง 11.00 ม. / วิกฤต 12.00 ม.)",
      river_note_en: "MRC Ref Gauge 013901 (Alarm 11.00 m / Flood 12.00 m)"
    },
    {
      id: "attapeu",
      name_th: "แขวงอัตตะปือ",
      name_en: "Attapeu",
      capital_th: "อัตตะปือ (สามัคคีไซ)",
      capital_en: "Attapeu",
      basin_id: "sekong_xe_don",
      basin_th: "ลุ่มน้ำเซกอง / เซกะหมาน (3S)",
      basin_en: "Sekong / Xe Kaman (3S)",
      town: {
        lat: 14.8000,
        lon: 106.8130,
        elev_m: 108,
        label_th: "เมืองอัตตะปือ",
        label_en: "Attapeu Town"
      },
      ridge: {
        lat: 15.0294,
        lon: 107.0700,
        elev_m: 420,
        label_th: "ซานไซ-ลุ่มน้ำเซกะหมาน",
        label_en: "Sanxay / Xe Kaman Uplands"
      },
      glofas_point: {
        lat: 14.8000,
        lon: 106.8130,
        label_th: "เซกะหมาน-เซกอง @ อัตตะปือ",
        label_en: "Xe Kaman-Sekong @ Attapeu"
      },
      has_mekong_gauge: false,
      mrc_station_code: null,
      mrc_alarm_m: null,
      mrc_flood_m: null,
      river_note_th: "ที่ราบลุ่มจุดบรรจบเซกะหมาน-เซกอง-เซเปียน",
      river_note_en: "Lowland Confluence of Xe Kaman & Sekong"
    }
  ];

  var MRC_STATIONS = [
    {
      code: "011201",
      province_id: "luang_prabang",
      name_th: "หลวงพระบาง",
      name_en: "Luang Prabang",
      river: "Mekong",
      lat: 19.8917,
      lon: 102.1367,
      zero_gauge_m: 267.195,
      alarm_m: 17.50,
      flood_m: 18.00
    },
    {
      code: "011901",
      province_id: "vientiane_capital",
      name_th: "เวียงจันทน์ KM4",
      name_en: "Vientiane KM4",
      river: "Mekong",
      lat: 17.9283,
      lon: 102.6200,
      zero_gauge_m: 158.040,
      alarm_m: 11.50,
      flood_m: 12.50
    },
    {
      code: "012703",
      province_id: "bolikhamxai",
      name_th: "ปากซัน",
      name_en: "Paksane",
      river: "Mekong",
      lat: 18.3720,
      lon: 103.6670,
      zero_gauge_m: 142.125,
      alarm_m: 13.50,
      flood_m: 14.50
    },
    {
      code: "013102",
      province_id: "khammouane",
      name_th: "ท่าแขก",
      name_en: "Thakhek",
      river: "Mekong",
      lat: 17.3933,
      lon: 104.8067,
      zero_gauge_m: 129.629,
      alarm_m: 13.00,
      flood_m: 14.00
    },
    {
      code: "320107",
      province_id: "khammouane",
      name_th: "มหาไซ (เซบั้งไฟ)",
      name_en: "Mahaxai (Se Bang Fai)",
      river: "Se Bang Fai",
      lat: 17.4180,
      lon: 105.1980,
      zero_gauge_m: null,
      alarm_m: null,
      flood_m: 15.00
    },
    {
      code: "013401",
      province_id: "savannakhet",
      name_th: "สะหวันนะเขต",
      name_en: "Savannakhet",
      river: "Mekong",
      lat: 16.5617,
      lon: 104.7467,
      zero_gauge_m: 125.410,
      alarm_m: 12.00,
      flood_m: 13.00
    },
    {
      code: "013901",
      province_id: "champasak",
      name_th: "ปากเซ",
      name_en: "Pakse",
      river: "Mekong",
      lat: 15.1167,
      lon: 105.8000,
      zero_gauge_m: 86.490,
      alarm_m: 11.00,
      flood_m: 12.00
    }
  ];

  var BASINS = [
    { id: "mekong_north", label_th: "แม่น้ำโขงตอนบน", label_en: "Upper Mekong" },
    { id: "mekong_central", label_th: "แม่น้ำโขงตอนกลาง", label_en: "Middle Mekong" },
    { id: "mekong_south", label_th: "แม่น้ำโขงตอนล่าง", label_en: "Lower Mekong" },
    { id: "nam_ou", label_th: "ลุ่มน้ำอู", label_en: "Nam Ou" },
    { id: "nam_tha", label_th: "ลุ่มน้ำทา", label_en: "Nam Tha" },
    { id: "nam_beng", label_th: "ลุ่มน้ำแบง / น้ำกอ", label_en: "Nam Beng / Ko" },
    { id: "nam_ma", label_th: "ลุ่มน้ำม้า", label_en: "Nam Ma" },
    { id: "nam_ngum", label_th: "ลุ่มน้ำงึม / น้ำลีก", label_en: "Nam Ngum / Lik" },
    { id: "nam_kading", label_th: "ลุ่มน้ำกะดิ่ง / น้ำเทิน", label_en: "Nam Kading / Theun" },
    { id: "xe_bang_fai", label_th: "ลุ่มน้ำเซบั้งไฟ", label_en: "Xe Bang Fai" },
    { id: "xe_bang_hieng", label_th: "ลุ่มน้ำเซบั้งเหียง", label_en: "Xe Bang Hieng" },
    { id: "sekong_xe_don", label_th: "ลุ่มน้ำเซกอง / เซโดน (3S)", label_en: "Sekong / Xe Don (3S)" }
  ];

  var OPENFREEMAP_STYLES = {
    liberty: "https://tiles.openfreemap.org/styles/liberty",
    positron: "https://tiles.openfreemap.org/styles/positron",
    dark: "https://tiles.openfreemap.org/styles/dark",
    bright: "https://tiles.openfreemap.org/styles/bright"
  };

  var GIBS_LAYERS = {
    Band13_IR: {
      id: "Himawari_AHI_Band13_Clean_Infrared",
      fallbackIds: ["Himawari_AHI_Band13_Clean_Infrared"],
      matrixSet: "GoogleMapsCompatible_Level6",
      maxZoom: 6,
      ext: "png",
      label_th: "Band 13 Clean IR",
      label_en: "Band 13 Clean IR"
    },
    Band3_Visible: {
      id: "Himawari_AHI_Band3_Red_Visible_1km",
      fallbackIds: ["Himawari_AHI_Band3_Red_Visible_1km"],
      matrixSet: "GoogleMapsCompatible_Level7",
      maxZoom: 7,
      ext: "png",
      label_th: "Band 3 Red Visible (1km)",
      label_en: "Band 3 Red Visible (1km)"
    },
    Air_Mass: {
      id: "Himawari_AHI_Air_Mass",
      fallbackIds: ["Himawari_AHI_Air_Mass"],
      matrixSet: "GoogleMapsCompatible_Level6",
      maxZoom: 6,
      ext: "png",
      label_th: "Air Mass RGB",
      label_en: "Air Mass RGB"
    }
  };

  var FORECAST_MODELS = [
    { id: "ecmwf_ifs", label: "ECMWF IFS (~9 km)", color: "#2563eb" },
    { id: "jma_seamless", label: "JMA GSM", color: "#10b981" },
    { id: "icon_seamless", label: "DWD ICON", color: "#f59e0b" },
    { id: "gfs_seamless", label: "NOAA GFS", color: "#ec4899" }
  ];

  window.LaosFloodApp = window.LaosFloodApp || {};
  window.LaosFloodApp.DATA = {
    PROVINCES: PROVINCES,
    MRC_STATIONS: MRC_STATIONS,
    BASINS: BASINS,
    OPENFREEMAP_STYLES: OPENFREEMAP_STYLES,
    GIBS_LAYERS: GIBS_LAYERS,
    FORECAST_MODELS: FORECAST_MODELS,
    LAOS_CENTER: [103.85, 18.25],
    LAOS_BOUNDS: [
      [99.6, 13.7],
      [108.1, 22.7]
    ]
  };
})();
