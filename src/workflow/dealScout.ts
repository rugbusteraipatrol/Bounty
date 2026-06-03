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
  { id: "water-filter", name: "Countertop water filter", query: "countertop water filter sale Serbia", targetPriceUsd: 65 }
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

  for (const product of products) {
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
              `Search evidence: ${search.output.slice(0, 1500)}`
            ].join("\n")
          }
        ],
        max_tokens: 300
      }
    });
    evidence.aceCalls.push(analysis);

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
          "Style: crisp product-focused card, white background, tasteful accent colors."
        ].join(" "),
        wait: false
      }
    });
    evidence.aceCalls.push(image);

    const memoTx = await writeMemoReceipt(config, mode, runId, product.id, {
      product,
      searchStatus: search.status,
      analysisStatus: analysis.status,
      imageStatus: image.status,
      serviceCount: 3
    });
    if (memoTx) image.payment = { ...image.payment, rawHeaders: { ...image.payment?.rawHeaders, memoTx } };
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
