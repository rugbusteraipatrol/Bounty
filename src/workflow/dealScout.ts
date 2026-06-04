import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config.js";
import { AceX402Client } from "../adapters/aceX402.js";
import { writeMemoReceipt } from "../adapters/memoReceipt.js";
import { SapAdapter } from "../adapters/sap.js";
import type { ProductCandidate, WorkflowEvidence, WorkflowMode } from "../types.js";

const defaultProducts: ProductCandidate[] = [
  { id: "ssd-1tb", name: "1TB NVMe SSD", query: "1TB NVMe SSD best deal Serbia", targetPriceUsd: 65 },
  { id: "mechanical-keyboard", name: "Mechanical keyboard", query: "mechanical keyboard discount Serbia", targetPriceUsd: 45 },
  { id: "noise-cancelling-headphones", name: "Noise cancelling headphones", query: "noise cancelling headphones sale Serbia", targetPriceUsd: 90 },
  { id: "portable-monitor", name: "Portable USB-C monitor", query: "portable USB-C monitor deal Serbia", targetPriceUsd: 120 },
  { id: "wifi-router", name: "WiFi 6 router", query: "WiFi 6 router discount Serbia", targetPriceUsd: 55 },
  { id: "gaming-mouse", name: "Gaming mouse", query: "gaming mouse sale Serbia", targetPriceUsd: 35 },
  { id: "power-bank", name: "20,000mAh power bank", query: "20000mAh power bank discount Serbia", targetPriceUsd: 30 },
  { id: "usb-c-hub", name: "USB-C hub", query: "USB-C hub sale Serbia", targetPriceUsd: 28 },
  { id: "webcam", name: "1080p webcam", query: "1080p webcam discount Serbia", targetPriceUsd: 35 },
  { id: "micro-sd", name: "256GB microSD card", query: "256GB microSD card best price Serbia", targetPriceUsd: 22 },
  { id: "smartwatch", name: "Budget smartwatch", query: "budget smartwatch sale Serbia", targetPriceUsd: 50 },
  { id: "bluetooth-speaker", name: "Bluetooth speaker", query: "Bluetooth speaker discount Serbia", targetPriceUsd: 40 },
  { id: "tablet", name: "Android tablet", query: "Android tablet deal Serbia", targetPriceUsd: 130 },
  { id: "external-hdd", name: "2TB external hard drive", query: "2TB external HDD sale Serbia", targetPriceUsd: 70 },
  { id: "mesh-wifi", name: "Mesh WiFi kit", query: "mesh WiFi kit discount Serbia", targetPriceUsd: 100 },
  { id: "ereader", name: "E-reader", query: "e-reader discount Serbia", targetPriceUsd: 110 },
  { id: "action-camera", name: "Action camera", query: "action camera deal Serbia", targetPriceUsd: 85 },
  { id: "robot-vacuum", name: "Robot vacuum", query: "robot vacuum sale Serbia", targetPriceUsd: 180 },
  { id: "air-fryer", name: "Air fryer", query: "air fryer discount Serbia", targetPriceUsd: 75 },
  { id: "coffee-grinder", name: "Electric coffee grinder", query: "electric coffee grinder sale Serbia", targetPriceUsd: 45 },
  { id: "monitor-27", name: "27 inch monitor", query: "27 inch monitor deal Serbia", targetPriceUsd: 145 },
  { id: "laptop-stand", name: "Aluminum laptop stand", query: "aluminum laptop stand sale Serbia", targetPriceUsd: 25 },
  { id: "desk-lamp", name: "LED desk lamp", query: "LED desk lamp discount Serbia", targetPriceUsd: 30 },
  { id: "wireless-charger", name: "Wireless charger", query: "wireless charger deal Serbia", targetPriceUsd: 20 },
  { id: "phone-tripod", name: "Phone tripod", query: "phone tripod sale Serbia", targetPriceUsd: 18 },
  { id: "label-printer", name: "Label printer", query: "label printer discount Serbia", targetPriceUsd: 55 },
  { id: "laser-printer", name: "Laser printer", query: "laser printer deal Serbia", targetPriceUsd: 120 },
  { id: "projector-mini", name: "Mini projector", query: "mini projector sale Serbia", targetPriceUsd: 95 },
  { id: "graphics-tablet", name: "Graphics tablet", query: "graphics tablet discount Serbia", targetPriceUsd: 60 },
  { id: "stream-deck", name: "Macro keypad", query: "macro keypad stream deck alternative Serbia", targetPriceUsd: 45 },
  { id: "capture-card", name: "HDMI capture card", query: "HDMI capture card sale Serbia", targetPriceUsd: 35 },
  { id: "nas-2bay", name: "2-bay NAS", query: "2 bay NAS discount Serbia", targetPriceUsd: 190 },
  { id: "ram-32gb", name: "32GB DDR4 RAM kit", query: "32GB DDR4 RAM kit deal Serbia", targetPriceUsd: 65 },
  { id: "gpu-budget", name: "Budget graphics card", query: "budget graphics card discount Serbia", targetPriceUsd: 180 },
  { id: "mini-pc", name: "Mini PC", query: "mini PC sale Serbia", targetPriceUsd: 180 },
  { id: "ups", name: "UPS battery backup", query: "UPS battery backup deal Serbia", targetPriceUsd: 80 },
  { id: "smart-plug", name: "Smart plug pack", query: "smart plug pack discount Serbia", targetPriceUsd: 25 },
  { id: "security-camera", name: "WiFi security camera", query: "WiFi security camera sale Serbia", targetPriceUsd: 45 },
  { id: "doorbell-camera", name: "Smart doorbell camera", query: "smart doorbell camera deal Serbia", targetPriceUsd: 80 },
  { id: "electric-toothbrush", name: "Electric toothbrush", query: "electric toothbrush discount Serbia", targetPriceUsd: 45 },
  { id: "hair-dryer", name: "Ionic hair dryer", query: "ionic hair dryer sale Serbia", targetPriceUsd: 55 },
  { id: "kitchen-scale", name: "Digital kitchen scale", query: "digital kitchen scale deal Serbia", targetPriceUsd: 15 },
  { id: "rice-cooker", name: "Rice cooker", query: "rice cooker discount Serbia", targetPriceUsd: 50 },
  { id: "blender", name: "Countertop blender", query: "countertop blender sale Serbia", targetPriceUsd: 60 },
  { id: "water-flosser", name: "Water flosser", query: "water flosser discount Serbia", targetPriceUsd: 45 },
  { id: "dashcam", name: "Car dashcam", query: "car dashcam deal Serbia", targetPriceUsd: 70 },
  { id: "car-charger", name: "USB-C car charger", query: "USB-C car charger sale Serbia", targetPriceUsd: 18 },
  { id: "bike-light", name: "Rechargeable bike light", query: "rechargeable bike light Serbia discount", targetPriceUsd: 20 },
  { id: "fitness-tracker", name: "Fitness tracker", query: "fitness tracker sale Serbia", targetPriceUsd: 45 },
  { id: "standing-desk", name: "Standing desk converter", query: "standing desk converter Serbia deal", targetPriceUsd: 110 },
  { id: "office-chair", name: "Ergonomic office chair", query: "ergonomic office chair discount Serbia", targetPriceUsd: 150 },
  { id: "tool-kit", name: "Precision screwdriver kit", query: "precision screwdriver kit sale Serbia", targetPriceUsd: 25 },
  { id: "soldering-iron", name: "Soldering iron station", query: "soldering iron station deal Serbia", targetPriceUsd: 50 },
  { id: "multimeter", name: "Digital multimeter", query: "digital multimeter discount Serbia", targetPriceUsd: 30 },
  { id: "3d-printer", name: "Entry 3D printer", query: "entry 3D printer sale Serbia", targetPriceUsd: 220 },
  { id: "phone-gimbal", name: "Phone gimbal stabilizer", query: "phone gimbal stabilizer deal Serbia", targetPriceUsd: 85 },
  { id: "usb-mic", name: "USB microphone", query: "USB microphone discount Serbia", targetPriceUsd: 55 },
  { id: "studio-headphones", name: "Studio headphones", query: "studio headphones sale Serbia", targetPriceUsd: 75 },
  { id: "monitor-arm", name: "Monitor arm", query: "monitor arm deal Serbia", targetPriceUsd: 45 },
  { id: "desk-mat", name: "Large desk mat", query: "large desk mat sale Serbia", targetPriceUsd: 18 },
  { id: "nvme-enclosure", name: "NVMe SSD enclosure", query: "NVMe SSD enclosure discount Serbia", targetPriceUsd: 30 },
  { id: "usb-c-cable", name: "100W USB-C cable", query: "100W USB-C cable sale Serbia", targetPriceUsd: 12 },
  { id: "gan-charger", name: "65W GaN charger", query: "65W GaN charger deal Serbia", targetPriceUsd: 32 },
  { id: "portable-ssd", name: "Portable SSD", query: "portable SSD discount Serbia", targetPriceUsd: 80 },
  { id: "wifi-adapter", name: "USB WiFi adapter", query: "USB WiFi adapter sale Serbia", targetPriceUsd: 18 },
  { id: "ethernet-switch", name: "Gigabit Ethernet switch", query: "gigabit ethernet switch deal Serbia", targetPriceUsd: 25 },
  { id: "poe-camera", name: "PoE security camera", query: "PoE security camera discount Serbia", targetPriceUsd: 70 },
  { id: "smart-light-bulb", name: "Smart light bulb pack", query: "smart light bulb pack sale Serbia", targetPriceUsd: 24 },
  { id: "led-strip", name: "LED strip lights", query: "LED strip lights deal Serbia", targetPriceUsd: 20 },
  { id: "soundbar", name: "TV soundbar", query: "TV soundbar discount Serbia", targetPriceUsd: 95 },
  { id: "tv-stick", name: "Streaming TV stick", query: "streaming TV stick sale Serbia", targetPriceUsd: 45 },
  { id: "ebook-light", name: "Clip-on reading light", query: "clip-on reading light deal Serbia", targetPriceUsd: 12 },
  { id: "travel-adapter", name: "Universal travel adapter", query: "universal travel adapter discount Serbia", targetPriceUsd: 20 },
  { id: "luggage-scale", name: "Digital luggage scale", query: "digital luggage scale sale Serbia", targetPriceUsd: 14 },
  { id: "mini-tripod", name: "Mini tripod", query: "mini tripod deal Serbia", targetPriceUsd: 18 },
  { id: "ring-light", name: "Ring light", query: "ring light discount Serbia", targetPriceUsd: 35 },
  { id: "phone-case", name: "Protective phone case", query: "protective phone case sale Serbia", targetPriceUsd: 15 },
  { id: "screen-protector", name: "Tempered glass screen protector", query: "tempered glass screen protector deal Serbia", targetPriceUsd: 8 },
  { id: "wireless-earbuds", name: "Wireless earbuds", query: "wireless earbuds discount Serbia", targetPriceUsd: 50 },
  { id: "kids-tablet", name: "Kids tablet", query: "kids tablet sale Serbia", targetPriceUsd: 85 },
  { id: "baby-monitor", name: "Baby monitor", query: "baby monitor deal Serbia", targetPriceUsd: 75 },
  { id: "humidifier", name: "Ultrasonic humidifier", query: "ultrasonic humidifier discount Serbia", targetPriceUsd: 40 },
  { id: "air-purifier", name: "Air purifier", query: "air purifier sale Serbia", targetPriceUsd: 130 },
  { id: "space-heater", name: "Portable space heater", query: "portable space heater deal Serbia", targetPriceUsd: 45 },
  { id: "electric-kettle", name: "Electric kettle", query: "electric kettle discount Serbia", targetPriceUsd: 30 },
  { id: "espresso-machine", name: "Entry espresso machine", query: "entry espresso machine sale Serbia", targetPriceUsd: 140 },
  { id: "milk-frother", name: "Electric milk frother", query: "electric milk frother deal Serbia", targetPriceUsd: 28 },
  { id: "food-processor", name: "Food processor", query: "food processor discount Serbia", targetPriceUsd: 80 },
  { id: "vacuum-sealer", name: "Vacuum sealer", query: "vacuum sealer sale Serbia", targetPriceUsd: 55 },
  { id: "induction-cooktop", name: "Portable induction cooktop", query: "portable induction cooktop deal Serbia", targetPriceUsd: 70 },
  { id: "electric-grill", name: "Electric grill", query: "electric grill discount Serbia", targetPriceUsd: 65 },
  { id: "dehumidifier", name: "Dehumidifier", query: "dehumidifier sale Serbia", targetPriceUsd: 140 },
  { id: "cordless-vacuum", name: "Cordless vacuum", query: "cordless vacuum deal Serbia", targetPriceUsd: 150 },
  { id: "steam-iron", name: "Steam iron", query: "steam iron discount Serbia", targetPriceUsd: 45 },
  { id: "sewing-machine", name: "Beginner sewing machine", query: "beginner sewing machine sale Serbia", targetPriceUsd: 120 },
  { id: "massage-gun", name: "Massage gun", query: "massage gun deal Serbia", targetPriceUsd: 70 },
  { id: "smart-scale", name: "Smart body scale", query: "smart body scale discount Serbia", targetPriceUsd: 35 },
  { id: "blood-pressure-monitor", name: "Blood pressure monitor", query: "blood pressure monitor sale Serbia", targetPriceUsd: 40 },
  { id: "treadmill", name: "Compact treadmill", query: "compact treadmill deal Serbia", targetPriceUsd: 260 },
  { id: "adjustable-dumbbells", name: "Adjustable dumbbells", query: "adjustable dumbbells discount Serbia", targetPriceUsd: 120 },
  { id: "camping-lantern", name: "Rechargeable camping lantern", query: "rechargeable camping lantern sale Serbia", targetPriceUsd: 25 },
  { id: "power-station", name: "Portable power station", query: "portable power station deal Serbia", targetPriceUsd: 260 },
  { id: "solar-charger", name: "Portable solar charger", query: "portable solar charger discount Serbia", targetPriceUsd: 60 },
  { id: "electric-scooter", name: "Electric scooter", query: "electric scooter sale Serbia", targetPriceUsd: 320 },
  { id: "bike-computer", name: "Bike computer", query: "bike computer deal Serbia", targetPriceUsd: 50 },
  { id: "car-jump-starter", name: "Portable car jump starter", query: "portable car jump starter discount Serbia", targetPriceUsd: 75 },
  { id: "tire-inflator", name: "Portable tire inflator", query: "portable tire inflator sale Serbia", targetPriceUsd: 45 },
  { id: "obd2-scanner", name: "OBD2 scanner", query: "OBD2 scanner deal Serbia", targetPriceUsd: 35 },
  { id: "car-vacuum", name: "Car vacuum cleaner", query: "car vacuum cleaner discount Serbia", targetPriceUsd: 35 },
  { id: "pet-camera", name: "Pet camera", query: "pet camera deal Serbia", targetPriceUsd: 60 },
  { id: "automatic-feeder", name: "Automatic pet feeder", query: "automatic pet feeder discount Serbia", targetPriceUsd: 70 },
  { id: "cat-water-fountain", name: "Cat water fountain", query: "cat water fountain sale Serbia", targetPriceUsd: 30 },
  { id: "garden-hose-reel", name: "Garden hose reel", query: "garden hose reel deal Serbia", targetPriceUsd: 45 },
  { id: "pressure-washer", name: "Pressure washer", query: "pressure washer discount Serbia", targetPriceUsd: 120 },
  { id: "cordless-drill", name: "Cordless drill", query: "cordless drill sale Serbia", targetPriceUsd: 85 },
  { id: "robot-vacuum", name: "Robot vacuum", query: "robot vacuum best deal Serbia", targetPriceUsd: 180 },
  { id: "air-fryer-oven", name: "Air fryer oven", query: "air fryer oven discount Serbia", targetPriceUsd: 95 },
  { id: "portable-monitor", name: "Portable monitor", query: "portable monitor sale Serbia", targetPriceUsd: 140 },
  { id: "mini-projector", name: "Mini projector", query: "mini projector best price Serbia", targetPriceUsd: 110 },
  { id: "mesh-router", name: "Mesh WiFi router", query: "mesh wifi router deal Serbia", targetPriceUsd: 120 },
  { id: "gaming-chair", name: "Gaming chair", query: "gaming chair discount Serbia", targetPriceUsd: 130 },
  { id: "standing-desk", name: "Standing desk", query: "standing desk sale Serbia", targetPriceUsd: 220 },
  { id: "dash-cam", name: "Dash cam", query: "dash cam sale Serbia", targetPriceUsd: 75 },
  { id: "thermal-printer", name: "Thermal label printer", query: "thermal label printer deal Serbia", targetPriceUsd: 90 },
  { id: "network-nas", name: "Home NAS", query: "home NAS discount Serbia", targetPriceUsd: 260 },
  { id: "graphics-tablet", name: "Graphics tablet", query: "graphics tablet sale Serbia", targetPriceUsd: 70 },
  { id: "wireless-mic", name: "Wireless microphone", query: "wireless microphone deal Serbia", targetPriceUsd: 85 },
  { id: "bike-trainer", name: "Indoor bike trainer", query: "indoor bike trainer sale Serbia", targetPriceUsd: 160 },
  { id: "tool-kit", name: "Home repair tool kit", query: "home repair tool kit discount Serbia", targetPriceUsd: 55 },
  { id: "water-filter", name: "Countertop water filter", query: "countertop water filter sale Serbia", targetPriceUsd: 65 },
  { id: "smart-lock", name: "Smart door lock", query: "smart door lock discount Serbia", targetPriceUsd: 120 },
  { id: "video-doorbell", name: "Video doorbell", query: "video doorbell sale Serbia", targetPriceUsd: 90 },
  { id: "wifi-camera", name: "WiFi security camera", query: "wifi security camera deal Serbia", targetPriceUsd: 55 },
  { id: "nvr-kit", name: "Home NVR camera kit", query: "home NVR camera kit Serbia discount", targetPriceUsd: 240 },
  { id: "label-maker", name: "Label maker", query: "label maker sale Serbia", targetPriceUsd: 40 },
  { id: "photo-printer", name: "Portable photo printer", query: "portable photo printer deal Serbia", targetPriceUsd: 110 },
  { id: "ultrawide-monitor", name: "Ultrawide monitor", query: "ultrawide monitor sale Serbia", targetPriceUsd: 260 },
  { id: "webcam-4k", name: "4K webcam", query: "4K webcam discount Serbia", targetPriceUsd: 85 },
  { id: "stream-deck", name: "Macro control pad", query: "macro control pad stream deck deal Serbia", targetPriceUsd: 95 },
  { id: "usb-c-hub", name: "USB-C hub", query: "USB-C hub sale Serbia", targetPriceUsd: 45 },
  { id: "gan-charger", name: "GaN charger", query: "GaN charger discount Serbia", targetPriceUsd: 35 },
  { id: "power-bank-20000", name: "20000mAh power bank", query: "20000mAh power bank sale Serbia", targetPriceUsd: 45 },
  { id: "ebook-reader", name: "E-book reader", query: "ebook reader deal Serbia", targetPriceUsd: 130 },
  { id: "action-camera", name: "Action camera", query: "action camera discount Serbia", targetPriceUsd: 160 },
  { id: "drone-mini", name: "Mini camera drone", query: "mini camera drone sale Serbia", targetPriceUsd: 220 },
  { id: "electric-toothbrush", name: "Electric toothbrush", query: "electric toothbrush deal Serbia", targetPriceUsd: 55 },
  { id: "hair-dryer", name: "Ionic hair dryer", query: "ionic hair dryer discount Serbia", targetPriceUsd: 70 },
  { id: "beard-trimmer", name: "Beard trimmer", query: "beard trimmer sale Serbia", targetPriceUsd: 40 },
  { id: "rice-cooker", name: "Rice cooker", query: "rice cooker deal Serbia", targetPriceUsd: 55 },
  { id: "bread-maker", name: "Bread maker", query: "bread maker discount Serbia", targetPriceUsd: 100 },
  { id: "slow-cooker", name: "Slow cooker", query: "slow cooker sale Serbia", targetPriceUsd: 65 },
  { id: "soda-maker", name: "Soda maker", query: "soda maker deal Serbia", targetPriceUsd: 75 },
  { id: "water-flosser", name: "Water flosser", query: "water flosser discount Serbia", targetPriceUsd: 55 },
  { id: "air-purifier-filter", name: "Air purifier filters", query: "air purifier filter sale Serbia", targetPriceUsd: 35 },
  { id: "smart-radiator-valve", name: "Smart radiator valve", query: "smart radiator valve deal Serbia", targetPriceUsd: 45 },
  { id: "portable-ac", name: "Portable air conditioner", query: "portable air conditioner discount Serbia", targetPriceUsd: 260 },
  { id: "space-heater", name: "Ceramic space heater", query: "ceramic space heater sale Serbia", targetPriceUsd: 50 },
  { id: "heated-blanket", name: "Heated blanket", query: "heated blanket deal Serbia", targetPriceUsd: 55 },
  { id: "electric-blanket", name: "Electric blanket", query: "electric blanket sale Serbia", targetPriceUsd: 60 },
  { id: "shoe-dryer", name: "Shoe dryer", query: "shoe dryer discount Serbia", targetPriceUsd: 45 },
  { id: "laser-level", name: "Laser level", query: "laser level sale Serbia", targetPriceUsd: 65 },
  { id: "stud-finder", name: "Stud finder", query: "stud finder deal Serbia", targetPriceUsd: 35 },
  { id: "soldering-station", name: "Soldering station", query: "soldering station discount Serbia", targetPriceUsd: 75 },
  { id: "multimeter", name: "Digital multimeter", query: "digital multimeter sale Serbia", targetPriceUsd: 40 },
  { id: "inspection-camera", name: "Inspection camera", query: "inspection camera deal Serbia", targetPriceUsd: 60 },
  { id: "portable-compressor", name: "Portable compressor", query: "portable compressor discount Serbia", targetPriceUsd: 90 },
  { id: "camping-stove", name: "Camping stove", query: "camping stove sale Serbia", targetPriceUsd: 45 },
  { id: "cooler-box", name: "Electric cooler box", query: "electric cooler box deal Serbia", targetPriceUsd: 120 },
  { id: "hiking-gps", name: "Handheld hiking GPS", query: "handheld hiking GPS discount Serbia", targetPriceUsd: 180 },
  { id: "sleeping-pad", name: "Inflatable sleeping pad", query: "inflatable sleeping pad sale Serbia", targetPriceUsd: 55 },
  { id: "kids-learning-tablet", name: "Kids learning tablet", query: "kids learning tablet deal Serbia", targetPriceUsd: 80 },
  { id: "baby-monitor-pro", name: "Baby monitor", query: "baby monitor sale Serbia", targetPriceUsd: 75 },
  { id: "bedroom-humidifier", name: "Bedroom humidifier", query: "bedroom humidifier discount Serbia", targetPriceUsd: 45 },
  { id: "sunrise-clock", name: "Sunrise alarm clock", query: "sunrise alarm clock sale Serbia", targetPriceUsd: 50 },
  { id: "burr-grinder", name: "Burr coffee grinder", query: "burr coffee grinder deal Serbia", targetPriceUsd: 95 },
  { id: "pizza-oven", name: "Countertop pizza oven", query: "countertop pizza oven sale Serbia", targetPriceUsd: 160 },
  { id: "smart-bike-lock", name: "Smart bike lock", query: "smart bike lock discount Serbia", targetPriceUsd: 55 },
  { id: "car-battery-charger", name: "Car battery charger", query: "car battery charger deal Serbia", targetPriceUsd: 65 },
  { id: "portable-car-fridge", name: "Portable car fridge", query: "portable car fridge sale Serbia", targetPriceUsd: 180 },
  { id: "pet-gps-tracker", name: "Pet GPS tracker", query: "pet GPS tracker deal Serbia", targetPriceUsd: 70 },
  { id: "aquarium-filter", name: "Aquarium filter", query: "aquarium filter discount Serbia", targetPriceUsd: 45 },
  { id: "led-grow-light", name: "LED grow light", query: "LED grow light sale Serbia", targetPriceUsd: 60 },
  { id: "bike-helmet-light", name: "Bike helmet light", query: "bike helmet light sale Serbia", targetPriceUsd: 30 },
  { id: "roof-rack", name: "Universal roof rack", query: "universal roof rack discount Serbia", targetPriceUsd: 110 },
  { id: "knife-sharpener", name: "Electric knife sharpener", query: "electric knife sharpener deal Serbia", targetPriceUsd: 45 },
  { id: "water-filter-pitcher", name: "Water filter pitcher", query: "water filter pitcher sale Serbia", targetPriceUsd: 35 },
  { id: "smart-sprinkler", name: "Smart sprinkler controller", query: "smart sprinkler controller deal Serbia", targetPriceUsd: 95 },
  { id: "stroller-fan", name: "Rechargeable stroller fan", query: "rechargeable stroller fan Serbia", targetPriceUsd: 25 },
  { id: "soda-machine", name: "Soda maker machine", query: "soda maker machine sale Serbia", targetPriceUsd: 80 },
  { id: "portable-blender", name: "Portable blender", query: "portable blender sale Serbia", targetPriceUsd: 35 },
  { id: "cold-press-juicer", name: "Cold press juicer", query: "cold press juicer deal Serbia", targetPriceUsd: 120 },
  { id: "food-dehydrator", name: "Food dehydrator", query: "food dehydrator discount Serbia", targetPriceUsd: 85 },
  { id: "ice-maker", name: "Countertop ice maker", query: "countertop ice maker sale Serbia", targetPriceUsd: 160 },
  { id: "wine-cooler", name: "Compact wine cooler", query: "compact wine cooler deal Serbia", targetPriceUsd: 190 },
  { id: "smart-thermostat", name: "Smart thermostat", query: "smart thermostat discount Serbia", targetPriceUsd: 110 },
  { id: "co2-monitor", name: "CO2 air quality monitor", query: "CO2 air quality monitor sale Serbia", targetPriceUsd: 75 },
  { id: "radon-meter", name: "Digital radon meter", query: "digital radon meter deal Serbia", targetPriceUsd: 180 },
  { id: "weather-station", name: "Home weather station", query: "home weather station discount Serbia", targetPriceUsd: 90 },
  { id: "smart-curtain", name: "Smart curtain motor", query: "smart curtain motor sale Serbia", targetPriceUsd: 85 },
  { id: "robot-mop", name: "Robot mop", query: "robot mop deal Serbia", targetPriceUsd: 170 },
  { id: "window-vacuum", name: "Window vacuum cleaner", query: "window vacuum cleaner discount Serbia", targetPriceUsd: 55 },
  { id: "steam-cleaner", name: "Steam cleaner", query: "steam cleaner sale Serbia", targetPriceUsd: 95 },
  { id: "carpet-cleaner", name: "Portable carpet cleaner", query: "portable carpet cleaner deal Serbia", targetPriceUsd: 150 },
  { id: "mattress-vacuum", name: "Mattress vacuum cleaner", query: "mattress vacuum cleaner discount Serbia", targetPriceUsd: 75 },
  { id: "uv-sanitizer", name: "UV sanitizer box", query: "UV sanitizer box sale Serbia", targetPriceUsd: 50 },
  { id: "heated-mug", name: "Heated smart mug", query: "heated smart mug deal Serbia", targetPriceUsd: 70 },
  { id: "desk-heater", name: "Mini desk heater", query: "mini desk heater discount Serbia", targetPriceUsd: 35 },
  { id: "foot-massager", name: "Electric foot massager", query: "electric foot massager sale Serbia", targetPriceUsd: 110 },
  { id: "neck-massager", name: "Neck massager", query: "neck massager deal Serbia", targetPriceUsd: 55 },
  { id: "posture-corrector", name: "Smart posture corrector", query: "smart posture corrector discount Serbia", targetPriceUsd: 45 },
  { id: "ems-trainer", name: "EMS muscle trainer", query: "EMS muscle trainer sale Serbia", targetPriceUsd: 65 },
  { id: "smart-jump-rope", name: "Smart jump rope", query: "smart jump rope deal Serbia", targetPriceUsd: 35 },
  { id: "folding-bike", name: "Folding bicycle", query: "folding bicycle discount Serbia", targetPriceUsd: 280 },
  { id: "bike-pump-electric", name: "Electric bike pump", query: "electric bike pump sale Serbia", targetPriceUsd: 50 },
  { id: "cycling-radar", name: "Cycling rear radar", query: "cycling rear radar deal Serbia", targetPriceUsd: 160 },
  { id: "motorcycle-intercom", name: "Motorcycle helmet intercom", query: "motorcycle helmet intercom discount Serbia", targetPriceUsd: 95 },
  { id: "carplay-screen", name: "Portable CarPlay screen", query: "portable CarPlay screen sale Serbia", targetPriceUsd: 130 },
  { id: "tpms-kit", name: "Tire pressure monitor kit", query: "tire pressure monitor kit deal Serbia", targetPriceUsd: 45 },
  { id: "gps-tracker-car", name: "Car GPS tracker", query: "car GPS tracker discount Serbia", targetPriceUsd: 55 },
  { id: "portable-safe", name: "Portable travel safe", query: "portable travel safe sale Serbia", targetPriceUsd: 45 },
  { id: "fingerprint-padlock", name: "Fingerprint padlock", query: "fingerprint padlock deal Serbia", targetPriceUsd: 35 },
  { id: "document-scanner", name: "Portable document scanner", query: "portable document scanner discount Serbia", targetPriceUsd: 110 },
  { id: "book-scanner", name: "Overhead book scanner", query: "overhead book scanner sale Serbia", targetPriceUsd: 220 },
  { id: "paper-shredder", name: "Home paper shredder", query: "home paper shredder deal Serbia", targetPriceUsd: 70 },
  { id: "laminator", name: "Document laminator", query: "document laminator discount Serbia", targetPriceUsd: 45 },
  { id: "drawing-monitor", name: "Pen display monitor", query: "pen display monitor sale Serbia", targetPriceUsd: 260 },
  { id: "colorimeter", name: "Monitor colorimeter", query: "monitor colorimeter deal Serbia", targetPriceUsd: 140 },
  { id: "calibration-mic", name: "Room calibration microphone", query: "room calibration microphone discount Serbia", targetPriceUsd: 95 },
  { id: "midi-keyboard", name: "MIDI keyboard", query: "MIDI keyboard sale Serbia", targetPriceUsd: 90 },
  { id: "audio-interface", name: "USB audio interface", query: "USB audio interface deal Serbia", targetPriceUsd: 120 },
  { id: "podcast-mixer", name: "Podcast mixer", query: "podcast mixer discount Serbia", targetPriceUsd: 150 },
  { id: "noise-gate-pedal", name: "Noise gate pedal", query: "noise gate pedal sale Serbia", targetPriceUsd: 65 },
  { id: "practice-amp", name: "Guitar practice amp", query: "guitar practice amp deal Serbia", targetPriceUsd: 95 },
  { id: "electronic-drum-pad", name: "Electronic drum pad", query: "electronic drum pad discount Serbia", targetPriceUsd: 130 },
  { id: "vinyl-player", name: "Bluetooth turntable", query: "Bluetooth turntable sale Serbia", targetPriceUsd: 150 },
  { id: "phono-preamp", name: "Phono preamp", query: "phono preamp deal Serbia", targetPriceUsd: 55 },
  { id: "mini-fridge", name: "Mini fridge", query: "mini fridge discount Serbia", targetPriceUsd: 120 },
  { id: "electric-lunchbox", name: "Electric lunch box", query: "electric lunch box sale Serbia", targetPriceUsd: 35 },
  { id: "vacuum-flask", name: "Smart temperature bottle", query: "smart temperature bottle deal Serbia", targetPriceUsd: 30 },
  { id: "pet-hair-dryer", name: "Pet hair dryer", query: "pet hair dryer discount Serbia", targetPriceUsd: 85 },
  { id: "dog-training-collar", name: "Dog training collar", query: "dog training collar sale Serbia", targetPriceUsd: 50 },
  { id: "bird-feeder-camera", name: "Bird feeder camera", query: "bird feeder camera deal Serbia", targetPriceUsd: 140 },
  { id: "soil-moisture-sensor", name: "Soil moisture sensor", query: "soil moisture sensor discount Serbia", targetPriceUsd: 25 },
  { id: "hydroponic-kit", name: "Indoor hydroponic kit", query: "indoor hydroponic kit sale Serbia", targetPriceUsd: 120 },
  { id: "compost-bin", name: "Electric compost bin", query: "electric compost bin deal Serbia", targetPriceUsd: 220 },
  { id: "mosquito-trap", name: "Electric mosquito trap", query: "electric mosquito trap discount Serbia", targetPriceUsd: 45 },
  { id: "pool-vacuum", name: "Pool vacuum robot", query: "pool vacuum robot sale Serbia", targetPriceUsd: 260 },
  { id: "inflatable-kayak", name: "Inflatable kayak", query: "inflatable kayak deal Serbia", targetPriceUsd: 220 },
  { id: "fish-finder", name: "Portable fish finder", query: "portable fish finder discount Serbia", targetPriceUsd: 120 },
  { id: "metal-detector", name: "Metal detector", query: "metal detector sale Serbia", targetPriceUsd: 110 },
  { id: "telescope", name: "Beginner telescope", query: "beginner telescope deal Serbia", targetPriceUsd: 160 },
  { id: "microscope", name: "Digital microscope", query: "digital microscope discount Serbia", targetPriceUsd: 80 },
  { id: "thermal-camera", name: "Thermal camera", query: "thermal camera sale Serbia", targetPriceUsd: 260 },
  { id: "night-vision", name: "Night vision monocular", query: "night vision monocular deal Serbia", targetPriceUsd: 180 },
  { id: "rangefinder", name: "Laser rangefinder", query: "laser rangefinder discount Serbia", targetPriceUsd: 95 },
  { id: "digital-torque-wrench", name: "Digital torque wrench", query: "digital torque wrench sale Serbia", targetPriceUsd: 120 },
  { id: "impact-driver", name: "Cordless impact driver", query: "cordless impact driver deal Serbia", targetPriceUsd: 100 },
  { id: "oscillating-tool", name: "Oscillating multi-tool", query: "oscillating multi-tool discount Serbia", targetPriceUsd: 75 },
  { id: "angle-grinder", name: "Cordless angle grinder", query: "cordless angle grinder sale Serbia", targetPriceUsd: 110 },
  { id: "shop-vac", name: "Workshop wet dry vacuum", query: "workshop wet dry vacuum deal Serbia", targetPriceUsd: 95 },
  { id: "airbrush-kit", name: "Airbrush compressor kit", query: "airbrush compressor kit discount Serbia", targetPriceUsd: 90 },
  { id: "sewing-serger", name: "Overlock sewing machine", query: "overlock sewing machine sale Serbia", targetPriceUsd: 240 },
  { id: "embroidery-machine", name: "Embroidery machine", query: "embroidery machine deal Serbia", targetPriceUsd: 330 },
  { id: "heat-press", name: "Heat press machine", query: "heat press machine discount Serbia", targetPriceUsd: 170 },
  { id: "vinyl-cutter", name: "Desktop vinyl cutter", query: "desktop vinyl cutter sale Serbia", targetPriceUsd: 220 },
  { id: "badge-maker", name: "Button badge maker", query: "button badge maker deal Serbia", targetPriceUsd: 85 },
  { id: "mini-lathe", name: "Mini hobby lathe", query: "mini hobby lathe discount Serbia", targetPriceUsd: 300 },
  { id: "laser-engraver", name: "Desktop laser engraver", query: "desktop laser engraver sale Serbia", targetPriceUsd: 280 },
  { id: "cnc-router", name: "Mini CNC router", query: "mini CNC router deal Serbia", targetPriceUsd: 360 },
  { id: "resin-printer", name: "Resin 3D printer", query: "resin 3D printer discount Serbia", targetPriceUsd: 260 },
  { id: "filament-dryer", name: "3D printer filament dryer", query: "3D printer filament dryer sale Serbia", targetPriceUsd: 65 },
  { id: "soldering-station", name: "Digital soldering station", query: "digital soldering station deal Serbia", targetPriceUsd: 85 },
  { id: "hot-air-rework", name: "Hot air rework station", query: "hot air rework station discount Serbia", targetPriceUsd: 95 },
  { id: "bench-power-supply", name: "Bench power supply", query: "bench power supply sale Serbia", targetPriceUsd: 130 },
  { id: "oscilloscope", name: "Digital oscilloscope", query: "digital oscilloscope deal Serbia", targetPriceUsd: 240 },
  { id: "logic-analyzer", name: "USB logic analyzer", query: "USB logic analyzer discount Serbia", targetPriceUsd: 35 },
  { id: "multimeter-pro", name: "Professional multimeter", query: "professional multimeter sale Serbia", targetPriceUsd: 75 },
  { id: "clamp-meter", name: "Clamp meter", query: "clamp meter deal Serbia", targetPriceUsd: 55 },
  { id: "thermal-label-printer", name: "Thermal label printer", query: "thermal label printer discount Serbia", targetPriceUsd: 90 },
  { id: "barcode-scanner", name: "Wireless barcode scanner", query: "wireless barcode scanner sale Serbia", targetPriceUsd: 55 },
  { id: "receipt-printer", name: "Bluetooth receipt printer", query: "Bluetooth receipt printer deal Serbia", targetPriceUsd: 80 },
  { id: "cash-drawer", name: "POS cash drawer", query: "POS cash drawer discount Serbia", targetPriceUsd: 70 },
  { id: "portable-pos", name: "Portable POS terminal", query: "portable POS terminal sale Serbia", targetPriceUsd: 180 },
  { id: "nfc-reader", name: "USB NFC reader", query: "USB NFC reader deal Serbia", targetPriceUsd: 45 },
  { id: "smart-ring", name: "Smart health ring", query: "smart health ring discount Serbia", targetPriceUsd: 160 },
  { id: "blood-pressure-monitor", name: "Bluetooth blood pressure monitor", query: "Bluetooth blood pressure monitor sale Serbia", targetPriceUsd: 60 },
  { id: "pulse-oximeter", name: "Pulse oximeter", query: "pulse oximeter deal Serbia", targetPriceUsd: 25 },
  { id: "infrared-thermometer", name: "Infrared thermometer", query: "infrared thermometer discount Serbia", targetPriceUsd: 30 },
  { id: "nebulizer", name: "Portable nebulizer", query: "portable nebulizer sale Serbia", targetPriceUsd: 45 },
  { id: "white-noise-machine", name: "White noise machine", query: "white noise machine deal Serbia", targetPriceUsd: 40 },
  { id: "sunrise-alarm", name: "Sunrise alarm clock", query: "sunrise alarm clock discount Serbia", targetPriceUsd: 55 },
  { id: "sleep-tracker", name: "Sleep tracker sensor", query: "sleep tracker sensor sale Serbia", targetPriceUsd: 110 },
  { id: "weighted-blanket", name: "Weighted blanket", query: "weighted blanket deal Serbia", targetPriceUsd: 80 },
  { id: "air-purifier-large", name: "Large room air purifier", query: "large room air purifier discount Serbia", targetPriceUsd: 230 },
  { id: "dehumidifier", name: "Room dehumidifier", query: "room dehumidifier sale Serbia", targetPriceUsd: 170 },
  { id: "humidifier-smart", name: "Smart humidifier", query: "smart humidifier deal Serbia", targetPriceUsd: 85 },
  { id: "portable-ac", name: "Portable air conditioner", query: "portable air conditioner discount Serbia", targetPriceUsd: 330 },
  { id: "electric-radiator", name: "Electric oil radiator", query: "electric oil radiator sale Serbia", targetPriceUsd: 100 },
  { id: "heated-blanket", name: "Electric heated blanket", query: "electric heated blanket deal Serbia", targetPriceUsd: 65 },
  { id: "induction-cooker", name: "Portable induction cooker", query: "portable induction cooker discount Serbia", targetPriceUsd: 70 },
  { id: "rice-cooker", name: "Smart rice cooker", query: "smart rice cooker sale Serbia", targetPriceUsd: 95 },
  { id: "sous-vide", name: "Sous vide cooker", query: "sous vide cooker deal Serbia", targetPriceUsd: 85 },
  { id: "vacuum-sealer", name: "Food vacuum sealer", query: "food vacuum sealer discount Serbia", targetPriceUsd: 75 },
  { id: "espresso-grinder", name: "Electric espresso grinder", query: "electric espresso grinder sale Serbia", targetPriceUsd: 180 },
  { id: "milk-frother", name: "Automatic milk frother", query: "automatic milk frother deal Serbia", targetPriceUsd: 45 },
  { id: "water-flosser", name: "Cordless water flosser", query: "cordless water flosser discount Serbia", targetPriceUsd: 55 },
  { id: "electric-toothbrush", name: "Smart electric toothbrush", query: "smart electric toothbrush sale Serbia", targetPriceUsd: 80 },
  { id: "hair-clipper", name: "Professional hair clipper", query: "professional hair clipper deal Serbia", targetPriceUsd: 60 },
  { id: "beard-trimmer", name: "Waterproof beard trimmer", query: "waterproof beard trimmer discount Serbia", targetPriceUsd: 45 },
  { id: "ipl-device", name: "IPL hair removal device", query: "IPL hair removal device sale Serbia", targetPriceUsd: 210 },
  { id: "facial-steamer", name: "Facial steamer", query: "facial steamer deal Serbia", targetPriceUsd: 40 },
  { id: "makeup-mirror", name: "LED makeup mirror", query: "LED makeup mirror discount Serbia", targetPriceUsd: 50 },
  { id: "smart-scale", name: "Smart body scale", query: "smart body scale sale Serbia", targetPriceUsd: 55 },
  { id: "adjustable-dumbbells", name: "Adjustable dumbbells", query: "adjustable dumbbells deal Serbia", targetPriceUsd: 220 },
  { id: "walking-pad", name: "Under desk walking pad", query: "under desk walking pad discount Serbia", targetPriceUsd: 260 },
  { id: "rowing-machine", name: "Compact rowing machine", query: "compact rowing machine sale Serbia", targetPriceUsd: 320 },
  { id: "exercise-bike", name: "Magnetic exercise bike", query: "magnetic exercise bike deal Serbia", targetPriceUsd: 250 },
  { id: "balance-board", name: "Smart balance board", query: "smart balance board discount Serbia", targetPriceUsd: 80 },
  { id: "camping-fridge", name: "Portable camping fridge", query: "portable camping fridge sale Serbia", targetPriceUsd: 260 },
  { id: "solar-generator", name: "Portable solar generator", query: "portable solar generator deal Serbia", targetPriceUsd: 480 },
  { id: "folding-solar-panel", name: "Folding solar panel", query: "folding solar panel discount Serbia", targetPriceUsd: 180 },
  { id: "camping-stove", name: "Portable camping stove", query: "portable camping stove sale Serbia", targetPriceUsd: 60 },
  { id: "water-purifier-camping", name: "Camping water purifier", query: "camping water purifier deal Serbia", targetPriceUsd: 75 },
  { id: "hiking-gps", name: "Handheld hiking GPS", query: "handheld hiking GPS discount Serbia", targetPriceUsd: 220 },
  { id: "satellite-communicator", name: "Satellite communicator", query: "satellite communicator sale Serbia", targetPriceUsd: 320 },
  { id: "action-cam-gimbal", name: "Action camera gimbal", query: "action camera gimbal deal Serbia", targetPriceUsd: 140 },
  { id: "camera-slider", name: "Motorized camera slider", query: "motorized camera slider discount Serbia", targetPriceUsd: 190 },
  { id: "field-monitor", name: "Camera field monitor", query: "camera field monitor sale Serbia", targetPriceUsd: 160 },
  { id: "wireless-lav-kit", name: "Wireless lavalier microphone kit", query: "wireless lavalier microphone kit deal Serbia", targetPriceUsd: 120 },
  { id: "studio-light", name: "LED studio light", query: "LED studio light discount Serbia", targetPriceUsd: 110 },
  { id: "softbox-kit", name: "Softbox lighting kit", query: "softbox lighting kit sale Serbia", targetPriceUsd: 85 },
  { id: "green-screen", name: "Collapsible green screen", query: "collapsible green screen deal Serbia", targetPriceUsd: 75 },
  { id: "teleprompter", name: "Tablet teleprompter", query: "tablet teleprompter discount Serbia", targetPriceUsd: 120 },
  { id: "capture-card", name: "HDMI capture card", query: "HDMI capture card sale Serbia", targetPriceUsd: 90 },
  { id: "stream-deck", name: "Macro control deck", query: "macro control deck deal Serbia", targetPriceUsd: 140 },
  { id: "nas-drive", name: "NAS hard drive", query: "NAS hard drive discount Serbia", targetPriceUsd: 180 },
  { id: "ups-battery", name: "Home UPS battery backup", query: "home UPS battery backup sale Serbia", targetPriceUsd: 160 },
  { id: "network-switch", name: "Managed network switch", query: "managed network switch deal Serbia", targetPriceUsd: 130 },
  { id: "poe-camera", name: "PoE security camera", query: "PoE security camera discount Serbia", targetPriceUsd: 95 },
  { id: "doorbell-camera", name: "Smart doorbell camera", query: "smart doorbell camera sale Serbia", targetPriceUsd: 120 },
  { id: "smart-lock-pro", name: "Smart door lock pro", query: "smart door lock pro deal Serbia", targetPriceUsd: 170 },
  { id: "garage-opener", name: "Smart garage door opener", query: "smart garage door opener discount Serbia", targetPriceUsd: 90 },
  { id: "leak-detector", name: "Smart water leak detector", query: "smart water leak detector sale Serbia", targetPriceUsd: 35 },
  { id: "gas-detector", name: "Smart gas detector", query: "smart gas detector deal Serbia", targetPriceUsd: 55 },
  { id: "smoke-detector", name: "Smart smoke detector", query: "smart smoke detector discount Serbia", targetPriceUsd: 65 },
  { id: "home-alarm-kit", name: "Wireless home alarm kit", query: "wireless home alarm kit sale Serbia", targetPriceUsd: 180 }
];

export async function runDealScoutWorkflow(config: AppConfig, mode: WorkflowMode): Promise<WorkflowEvidence> {
  const runId = `deal-scout-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const sap = new SapAdapter(config, mode);
  const ace = new AceX402Client(config, mode);
  const products = defaultProducts.slice(config.START_INDEX, config.START_INDEX + config.MAX_ITEMS);

  const evidence: WorkflowEvidence = {
    runId,
    mode,
    startedAt: new Date().toISOString(),
    trigger: "cli",
    market: config.DEAL_MARKET,
    selectedTools: [],
    aceCalls: []
  };

  evidence.selectedTools = await sap.discoverTools();
  const enabledServices = new Set(
    config.ACE_SERVICES.split(",")
      .map((service) => service.trim().toLowerCase())
      .filter(Boolean)
  );

  for (const product of products) {
    let searchStatus: number | undefined;
    let analysisStatus: number | undefined;
    let imageStatus: number | undefined;
    let searchEvidence = "Search step skipped by ACE_SERVICES.";
    let analysisEvidence = "Analysis step skipped by ACE_SERVICES.";
    let imageResult: Awaited<ReturnType<AceX402Client["call"]>> | undefined;

    if (enabledServices.has("search")) {
      const search = await ace.call({
        runId,
        productId: product.id,
        service: "search",
        endpoint: config.SEARCH_API_PATH,
        prompt: `Find current deal candidates for ${product.name}.`,
        body: {
          query: product.query,
          type: "search",
          country: "rs",
          language: "en",
          page: 1
        }
      });
      evidence.aceCalls.push(search);
      searchStatus = search.status;
      searchEvidence = search.output;
    }

    if (enabledServices.has("chat")) {
      const analysis = await ace.call({
        runId,
        productId: product.id,
        service: "chat",
        endpoint: config.CHAT_API_PATH,
        prompt: `Analyze deal quality for ${product.name}.`,
        body: {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a concise deal analyst. Return JSON with score, reason, buyer warning, and whether to publish."
            },
            {
              role: "user",
              content: [
                `Market: ${config.DEAL_MARKET}`,
                `Product: ${product.name}`,
                `Target price USD: ${product.targetPriceUsd ?? "unknown"}`,
                `Search evidence: ${searchEvidence.slice(0, 1500)}`
              ].join("\n")
            }
          ],
          max_tokens: 300
        }
      });
      evidence.aceCalls.push(analysis);
      analysisStatus = analysis.status;
      analysisEvidence = analysis.output;
    }

    if (enabledServices.has("image")) {
      const image = await ace.call({
        runId,
        productId: product.id,
        service: "image",
        endpoint: config.IMAGE_API_PATH,
        prompt: `Generate buyer-facing deal card for ${product.name}.`,
        body: {
          model: "flux-dev",
          size: "1024x1024",
          prompt: [
            "A clean ecommerce deal card image, no logos, no fake retailer names.",
            `Product category: ${product.name}.`,
            "Style: crisp product-focused card, white background, tasteful accent colors.",
            `Analysis: ${analysisEvidence.slice(0, 500)}`
          ].join(" "),
          wait: false
        }
      });
      evidence.aceCalls.push(image);
      imageStatus = image.status;
      imageResult = image;
    }

    const memoTx = await writeMemoReceipt(config, mode, runId, product.id, {
      product,
      searchStatus,
      analysisStatus,
      imageStatus,
      serviceCount: enabledServices.size
    });
    if (memoTx && imageResult) {
      imageResult.payment = { ...imageResult.payment, rawHeaders: { ...imageResult.payment?.rawHeaders, memoTx } };
    }
  }

  evidence.finalReport = buildReport(products, evidence.aceCalls.length, ace.remainingUsd);
  evidence.finishedAt = new Date().toISOString();

  await mkdir(config.OUTPUT_DIR, { recursive: true });
  await writeFile(join(config.OUTPUT_DIR, `${runId}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

function buildReport(products: ProductCandidate[], callCount: number, remainingUsd: number): string {
  return [
    "Deal Scout Agent completed an autonomous run.",
    `Products scanned: ${products.length}.`,
    `Ace x402 service calls attempted: ${callCount}.`,
    `Remaining configured spend budget: ${remainingUsd.toFixed(6)} USDC.`,
    "Each paid call is tied to a distinct product workflow step: search, chat analysis, and Flux image generation."
  ].join(" ");
}
