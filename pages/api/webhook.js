// =================================================================
//                 LINE BOT FOR TM การช่าง (v2 - AI Classifier)
// =================================================================
// This version uses AI as a classifier for the fallback logic.
// 1. Keyword Matching: Instantly replies to common questions.
// 2. AI Classification: If no keyword is matched, GPT-4o categorizes
//    the user's query, and the bot sends the corresponding canned response.
// =================================================================

import { Client, validateSignature } from '@line/bot-sdk';
import fetch from 'node-fetch'; // Required for making HTTP requests to OpenAI API

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser to handle raw body for LINE signature validation
  },
};

// LINE bot configuration using environment variables for security
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(lineConfig); // Initialize LINE bot client

// Helper function to detect if the text contains Thai characters
// This is used to determine the appropriate language for the reply.
function isThai(text) {
  return /[\u0E00-\u0E7F]/.test(text);
}

// =================================================================
//        STEP 1: CENTRALIZED REPLIES BY CATEGORY
// =================================================================
// All pre-written replies are stored here for easy lookup.
// Each category has both Thai (th) and English (en) responses.
const categoryReplies = {
  Owner: {
    th: "ผมไม่ใช่เจ๊แหม่มนะคะ หากต้องการคุยกับเจ้าของร้าน TM การช่าง โทร 0810891585 ค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที ไม่ต้องกังวลนะคะ",
    en: "This is not Je Mam. To speak with the owner of TM การช่าง, please call 0810891585. If the line is busy, try calling back in a minute, no need to worry."
  },
  Car_Repair: {
    th: "เรื่องการซ่อมรถหรือวันเสร็จ ต้องคุยกับช่างตี๋โดยตรงค่ะ โทร 0818981016 ได้เลยนะคะ",
    en: "For car repairs or completion dates, please contact Technician Tee directly at 0818981016."
  },
  Location: {
    th: "ร้าน TM การช่าง อยู่ที่: 122/79 นาเกลือ ซอย 24, ต.นาเกลือ, บางนา, 94000 ติดต่อเจ้าของร้านที่ 0810891585 ค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที ไม่ต้องกังวลนะคะ",
    en: "TM การช่าง is located at: 122/79 Naklua Soi 24, Naklua, Bangna, 94000, Thailand. Contact the owner at 0810891585. If the line is busy, try calling back in a minute, no need to worry."
  },
  Ordering: {
    th: "รบกวนแจ้งด้วยค่ะว่าอยากสั่งทำอะไร หรือให้ TM การช่าง ช่วยเรื่องแบบไหนคะ? การสั่งทำขึ้นอยู่กับประเภทงาน ราคาวัสดุโลหะในตลาด และปัจจัยอื่นๆ สามารถขอใบเสนอราคาได้ ติดต่อเจ้าของร้านที่ 0810891585 ค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที ไม่ต้องกังวลนะคะ",
    en: "Please let us know what you’d like to order or customize at TM การช่าง. The order depends on the type of task, the universal price of metal, and other factors. You can request a quotation. Contact the owner at 0810891585. If the line is busy, try calling back in a minute, no need to worry."
  },
  General_Help: {
    th: "หากมีปัญหาหรือข้อสงสัยใดๆ เกี่ยวกับ TM การช่าง รบกวนติดต่อเจ้าของร้านที่ 0810891585 ค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที ไม่ต้องกังวลนะคะ",
    en: "For any issues or questions regarding TM การช่าง, please contact the owner at 0810891585. If the line is busy, try calling back in a minute, no need to worry."
  },
  Payment: {
    th: "โอนเข้า 'ทีเอ็มการช่าง' เท่านั้นค่ะ พนักงานไม่ได้รับอนุญาตให้รับเงินโดยตรง สำหรับเงินสดสามารถชำระได้ที่หน้าร้านครับ มีบริการเก็บเงินปลายทางสำหรับบางพื้นที่และสามารถออกใบกำกับภาษีได้ ติดต่อเจ้าของร้านที่ 0810891585 สำหรับรายละเอียดเพิ่มเติมค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที",
    en: "Please transfer to 'ทีเอ็มการช่าง' only. Our staff cannot receive direct payments. Cash is accepted at the store, COD is available for some areas, and we can issue tax invoices. Contact the owner at 0810891585 for details. If the line is busy, try calling back in a minute."
  },
  Price: {
    th: "รบกวนแจ้งวัสดุ ขนาด หรือประเภทงานที่ต้องการ เพื่อให้ TM การช่าง ประเมินราคาค่ะ ราคาขึ้นอยู่กับประเภทงาน ราคาวัสดุโลหะในตลาด และปัจจัยอื่นๆ สามารถขอใบเสนอราคาได้ ติดต่อเจ้าของร้านที่ 0810891585 เพื่อคุยรายละเอียดค่ะ ถ้าสายไม่ว่าง รบกวนโทรกลับใน 1 นาที ไม่ต้องกังวลนะคะ",
    en: "Please specify the material, size, or type of work for a quote. The price depends on the type of task, the universal price of metal, and other factors. You can request a formal quotation. Contact the owner at 0810891585 for details. If the line is busy, try calling back in a minute, no need to worry."
  },
  Unrelated: {
    th: "ขออภัยค่ะ เรื่องนี้ไม่เกี่ยวกับบริการของทางร้าน หากต้องการความช่วยเหลือเพิ่มเติมเกี่ยวกับงานเหล็ก ติดต่อเจ้าของร้านได้ที่ 0810891585 ค่ะ",
    en: "Sorry, that question is not related to our business. For assistance with our metal fabrication services, please contact the owner at 0810891585."
  }
};

// =================================================================
//        STEP 2: KEYWORD DETECTION FUNCTION (ENHANCED)
// =================================================================
// This function provides instant replies for obvious keywords.
// It uses expanded regular expressions to match:
// - Formal words
// - Casual words
// - Common misspellings
// - Phrases (short and long)
// - Transliterations (Thai words written in English letters)
function handleKeywordReply(message) {
  const text = message.trim().toLowerCase();
  const lang = isThai(text) ? 'th' : 'en';
  console.log("Testing keywords for:", text);

  if (/(เจ๊|เจ้|เจ้แหม่ม|j[ae]y?\s?mam|jmam|jaokhong|chaokhong|owner|boss|manager|ผู้บริหาร|ผู้จัดการ|เถ้าแก่|เรียนสายเจ้าของ|คุยกับเจ้าของ|เบอร์เจ้าของร้าน|ติดต่อเจ้าของ|ขอสายเจ้าของ)/i.test(text)) {
    console.log("Matched Owner");
    return categoryReplies.Owner[lang];
  }
  if (/(ซ่อม|ซ้อม|ส้อม|ซ่อมรถ|ซ่อมรถยนต์|รถเสีย|รถพัง|แก้รถ|ท่อไอเสีย|นำรถเข้าซ่อม|รถเป็นไร|เช็คสภาพ|ของเสร็จ|ได้ของวันไหน|เมื่อไหร่รถจะเสร็จ|กำหนดการซ่อม|สถานะการซ่อม|บริการซ่อมบำรุง|ตรวจสอบสภาพรถ|car\s?fix|repair|fix\s?car|car\s?broken|car\s?problem|when\s?car\s?finish|when\s?car\s?ready|som\s?rod|rot\s?sia|rot\s?pang)/i.test(text)) {
    console.log("Matched Car_Repair");
    return categoryReplies.Car_Repair[lang];
  }
  if (/(ร้าน.*อยู่|อยู่ไหน|แถวไหน|ไปร้านไง|พิกัด|แผนที่|ขอแผนที่|ขอทราบที่ตั้ง|ร้านไปยังไง|ที่ตั้งร้าน|พิกัดร้าน|สถานที่ตั้ง|สอบถามเส้นทาง|โลเคชั่น|แอดเดรส|ทางไปร้าน|บอกทางไป|google\s?map|location|where|address|map|direction|thi\s?tang|phikat|ran\s?yoo\s?nai|ร้านอยู่แถวไหน|ขอที่อยู่ร้านหน่อย|ร้านอยู่ที่ไหน|ที่อยู่ร้าน|ร้านตั้งอยู่ไหน|ร้านอยู่มั้ย)/i.test(text)) {
    console.log("Matched Location");
    return categoryReplies.Location[lang];
  }
  if (/(จ่าย|โอน|ชำระ|รับเงิน|เงินสด|บัตรเครดิต|เก็บปลายทาง|cod|ใบกำกับภาษี|ใบเสร็จ|ภาษี|payment|Payment|Payments|transfer|pay|cash|bill|invoice|how\s?to\s?pay|วิธีจ่าย|โอนเงิน|จ่ายยังไง|รับเงินสดไหม|ผ่อนได้ไหม|chai\s?ngern|on\s?ngern|tax\s?invoice)/i.test(text)) {
    console.log("Matched Payment");
    return categoryReplies.Payment[lang];
  }
  if (/(ราคา|เท่าไหร่|กี่บาท|ค่าใช้จ่าย|ประเมินราคา|ใบเสนอราคา|ราคาสินค้า|สอบถามราคา|ตีราคา|คิดเงิน|ถูกไหม|แพงไหม|ราคาเท่าไร|how\s?much|cost|price|quote|estimate|rao\s?kha|raka|tao\s?rai|งานนี้เท่าไหร่)/i.test(text)) {
    console.log("Matched Price");
    return categoryReplies.Price[lang];
  }
  if (/(สั่งทำ|สั่งซื้อ|สั่งผลิต|สั่งทำพิเศษ|การจัดซื้อ|คำสั่งซื้อ|ทำอะไรได้บ้าง|สั่งของ|รับทำอะไร|อยากให้ทำ|ออเดอร์|ออเด้อร์|สั่้ง|order|customize|make|buy|request|fabricate|sang\s?tham|sang\s?sue|สั่งทำชิ้นนี้)/i.test(text)) {
    console.log("Matched Ordering");
    return categoryReplies.Ordering[lang];
  }
  if (/(problem|issue|ปัญหา|มีปัญหา|ข้อร้องเรียน|ต้องการความช่วยเหลือ|ต้องการร้องเรียน|แจ้งปัญหา|ของมีปัญหา|ช่วยหน่อย|complaint|help|question|สงสัย|ไม่เข้าใจ|มีคำถาม|สอบถาม|ข้อสงสัย|มีไรถาม|อยากถาม|panha|chuay|assistance)/i.test(text)) {
    console.log("Matched General_Help");
    return categoryReplies.General_Help[lang];
  }
  console.log("No keyword match");
  return null;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text;
  const lang = isThai(userText) ? 'th' : 'en';

  const keywordReply = handleKeywordReply(userText);
  if (keywordReply) {
    console.log("Keyword matched for", userText, ":", keywordReply);
    return client.replyMessage(event.replyToken, { type: 'text', text: keywordReply });
  }

  const categoriesForAI = Object.keys(categoryReplies).filter(cat => cat !== 'Unrelated').join(', ');
  const prompt = `Classify the following user query into one of these categories: [${categoriesForAI}]. Respond with only the single category name. For example, if the query is "how much does it cost?", respond with "Price". If the query includes Thai verbs like "จ่าย" (pay), "โอน" (transfer), "ซ่อม" (repair), "ทำ" (do), or similar, or English terms like "payment", "pay", "transfer", "cash", "invoice", choose the appropriate category (e.g., "Payment" for "จ่าย"). If the query is not related to the business, respond with "Unrelated".

User Query: "${userText}"
Category:`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 15,
      })
    });

    const completion = await response.json();
    if (completion.choices && completion.choices.length > 0) {
      const category = completion.choices[0].message.content.trim();
      console.log("AI Classification for", userText, ":", category);

      const finalReply = categoryReplies[category]
        ? categoryReplies[category][lang]
        : categoryReplies.General_Help[lang];

      console.log("Sending reply:", finalReply);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: finalReply,
      });
    } else {
      console.error("OpenAI API response missing choices:", completion);
      throw new Error("Invalid response structure from OpenAI API");
    }
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: categoryReplies.General_Help[lang]
    });
  }
}
// Helper function to read the raw request body from a Next.js API route.
// This is crucial for LINE's signature validation which requires the raw body.
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk)); // Accumulate data chunks
    req.on('end', () => resolve(Buffer.from(data))); // Resolve with the full body as a Buffer
    req.on('error', reject); // Reject on error
  });
}

// NEXT.JS API ROUTE HANDLER (WEBHOOK)
// This is the main entry point for LINE webhook events.
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const signature = req.headers['x-line-signature']; // Get LINE signature from headers
  const bodyBuffer = await getRawBody(req); // Get the raw request body

  // Validate the LINE signature to ensure the request is from LINE and hasn't been tampered with
  if (!validateSignature(bodyBuffer, lineConfig.channelSecret, signature)) {
    console.warn("Invalid LINE signature received. Request might be spoofed.");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body = JSON.parse(bodyBuffer.toString()); // Parse the raw body as JSON

  try {
    // Process all events received in the webhook payload in parallel
    const results = await Promise.all(body.events.map(handleEvent));
    // Respond with 200 OK and the results of event processing
    return res.status(200).json(results);
  } catch (err) {
    // Log any errors that occur during event processing
    console.error("Error processing LINE events:", err);
    // Respond with a 500 Internal Server Error
    return res.status(500).json({ error: "Internal Server Error" });
  }
}