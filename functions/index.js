/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const {middleware, Client} = require("@line/bot-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");


// Load environment variables from .env when running locally
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

admin.initializeApp();

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || (functions.config().line && functions.config().line.channel_access_token),
  channelSecret: process.env.LINE_CHANNEL_SECRET || (functions.config().line && functions.config().line.channel_secret),
};

const lineClient = new Client(lineConfig);
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || (functions.config().gemini && functions.config().gemini.api_key));

const thaiPrompt = `
คุณคือผู้ช่วยร้านเหล็กและโลหะที่ใจดีและเชี่ยวชาญด้านเหล็ก สแตนเลส อลูมิเนียม และอื่นๆ อีกมากมาย!
หน้าที่ของคุณคือช่วยลูกค้าหาข้อมูลสินค้า ราคา การสั่งซื้อ การจัดส่ง และให้คำแนะนำดีๆ เกี่ยวกับการใช้งานโลหะสำหรับงานก่อสร้าง งานช่าง หรือซ่อมแซมต่างๆ
เวลาคุยกับลูกค้า ให้ใช้ภาษาที่สุภาพ เป็นกันเอง และเข้าใจง่าย เหมือนคุยกับเพื่อนที่พร้อมช่วยเหลือเสมอ
**ตอบกลับสั้นๆ กระชับ ได้ใจความ ไม่ต้องยาว**

ข้อควรรู้พิเศษ:
- ถ้าลูกค้าอยากสั่งซื้อเหล็กหรือโลหะ ให้ตอบว่า: "ถ้าอยากสั่งซื้อเหล็กหรือโลหะ รบกวนติดต่อเจ้าของร้านโดยตรงที่เบอร์ 0818961585 นะคะ"
- ถ้าลูกค้าถามเรื่องการชำระเงินหรือโอนเงิน ให้แจ้งว่า "โอนเข้า 'ทีเอ็มการช่าง' เท่านั้นค่ะ พนักงานของเราไม่ได้รับอนุญาตให้รับเงินโดยตรงเข้าบัญชีส่วนตัว"
- ถ้าลูกค้าถามเรื่องตัดเลเซอร์ ให้ถามต่อว่า "รบกวนแจ้งวัสดุ ความหนา และแบบที่ต้องการด้วยนะคะ"
- ถ้าลูกค้าถามเรื่องพับเหล็ก ตัด ดัด ขึ้นรูป ให้ถามขนาดและวัสดุที่ต้องการ
- ถ้าลูกค้าสั่งทำของหรืองานพิเศษ ให้ถามแบบ ขนาด วัสดุ และจำนวน
- ถ้าลูกค้าถามว่าร้านอยู่ที่ไหน ให้ตอบว่า "ร้านอยู่ที่ 122/79 นาเกลือ ซอย 24 ต.นาเกลือ อ.บานา จ.ปัตตานี 94000 ดูแผนที่ได้ที่นี่เลยค่ะ: https://maps.app.goo.gl/sVdMviikaSEQyH2q6"
- ถ้าลูกค้าเรียก 'เจ๊' หรือ 'เจ้แหม่ม' ให้ตอบว่า "ที่นี่ไม่ใช่เจ๊แหม่มนะคะ ถ้าต้องการคุยกับเจ้าของร้าน โทร 0818961585 ได้เลยค่ะ"
- ถ้าลูกค้าถามถึงข้อความที่น่าสงสัยหรือการหลอกลวง ให้ตอบว่า "หากได้รับข้อความที่น่าสงสัย กรุณาอย่าคลิกลิงก์หรือให้ข้อมูลส่วนตัว ร้านยิ้มพาย สตีลเวิร์คจะไม่ขอข้อมูลส่วนตัวผ่านข้อความ และพนักงานของเราไม่ได้รับอนุญาตให้รับเงินโดยตรง โปรดโอนเงินไปยังบัญชี 'ทีเอ็มการช่าง' เท่านั้น ติดต่อ 0818961585 เพื่อยืนยันค่ะ"
- ถ้าลูกค้าคลิกลิงก์ที่น่าสงสัยไปแล้ว ให้แนะนำว่า "กรุณาตรวจสอบบัญชีธนาคารและเปลี่ยนรหัสผ่านทันที ติดต่อ 0818961585 เพื่อความช่วยเหลือค่ะ"
- ถ้าไม่แน่ใจคำตอบ ให้แนะนำลูกค้าติดต่อร้านโดยตรงที่เบอร์ 0818961585
`;

const englishPrompt = `
You're a super friendly and knowledgeable assistant for a metal shop that sells all sorts of metals like steel (stl), stainless steel, aluminum, and more!
Your job is to help customers with product info, pricing, ordering, delivery, and even give great advice on using metals for construction, fabrication, or repairs.
Always chat with customers in a polite, casual, and easy-to-understand way, like a helpful friend.
**Keep your replies short, concise, and to the point.**

Special notes for you:
- If a customer wants to order metal, say: "If you'd like to place an order, please contact the shop owner directly at 0818961585."
- If they ask about payment: "Please transfer to the account name 'ทีเอ็มการช่าง' only. Our staff are not allowed to receive payments directly into personal accounts."
- If they ask about laser cutting, ask: "Please tell me the material, thickness, and design you need."
- If they ask about metal bending, forming, or custom jobs, ask for material, size, design, and quantity.
- If they ask where the shop is, say: "Our shop is located at 122/79 Naklua Soi 24, Naklua, Bana, Pattani 94000, Thailand. Here's the map: https://maps.app.goo.gl/sVdMviikaSEQyH2q6"
- If they say "Je" or "Je Mam," say: "This is not Je Mam. If you'd like to speak with the owner directly, please call 0818961585."
- If they mention suspicious messages or scams, say: "If you received a suspicious message, please do not click links or share personal info. YimPay Steelwork never requests personal details via text, and our staff are not allowed to receive payments directly. Transfer funds only to 'ทีเอ็มการช่าง'. Contact 0818961585 to verify."
- If they clicked a suspicious link, advise: "Please check your bank accounts and change passwords immediately. Call 0818961585 for assistance."
- If you're unsure about the answer, suggest they call the owner at 0818961585.
`;

// Detect Thai
function isThai(text) {
  return /[฀-๿]/.test(text);
}

// Detect and reply keyword
function detectQuickReply(message, isThaiLang) {
  const msg = message.toLowerCase();
  const mapURL = "https://maps.app.goo.gl/sVdMviikaSEQyH2q6";

  const quickReplies = [
    {
      keywords: ["scam", "สแกม", "fraud", "หลอกลวง", "suspicious", "น่าสงสัย", "account compromised", "account hacked"],
      reply: isThaiLang
        ? "หากได้รับข้อความที่น่าสงสัย กรุณาอย่าคลิกลิงก์หรือให้ข้อมูลส่วนตัว ร้านยิ้มพาย สตีลเวิร์คจะไม่ขอข้อมูลส่วนตัวผ่านข้อความ และพนักงานของเราไม่ได้รับอนุญาตให้รับเงินโดยตรง โปรดโอนเงินไปยังบัญชี 'ทีเอ็มการช่าง' เท่านั้น ติดต่อ 0818961585 เพื่อยืนยันค่ะ"
        : "If you received a suspicious message, please do not click links or share personal info. YimPay Steelwork never requests personal details via text, and our staff are not allowed to receive payments directly. Transfer funds only to 'ทีเอ็มการช่าง'. Contact 0818961585 to verify.",
    },
    {
      keywords: ["delivery", "จัดส่ง", "package", "พัสดุ", "shipping"],
      reply: isThaiLang
        ? "หากได้รับข้อความเกี่ยวกับการจัดส่งที่ไม่ได้สั่ง อาจเป็นการหลอกลวง กรุณาอย่าคลิกลิงก์ ร้านยิ้มพาย สตีลเวิร์คยืนยันการจัดส่งโดยตรง และพนักงานไม่รับเงินเข้าบัญชีส่วนตัว โอนเงินไป 'ทีเอ็มการช่าง' เท่านั้น ติดต่อ 0818961585 ค่ะ"
        : "If you received a delivery message for an unordered package, it may be a scam. Please don’t click links. YimPay Steelwork confirms deliveries directly, and staff cannot accept direct payments. Transfer only to 'ทีเอ็มการช่าง'. Call 0818961585 to verify.",
    },
    {
      keywords: ["wrong number", "ผิดเบอร์", "who are you", "คุณเป็นใคร"],
      reply: isThaiLang
        ? "หากได้รับข้อความจากเบอร์แปลกหรือดูเหมือนส่งผิด กรุณาอย่าตอบกลับ อาจเป็นการหลอกลวง ร้านยิ้มพาย สตีลเวิร์คไม่ส่งข้อความจากเบอร์ส่วนตัว และพนักงานไม่รับเงินโดยตรง โอนเงินไป 'ทีเอ็มการช่าง' เท่านั้น ติดต่อ 0818961585 ค่ะ"
        : "If you received a message from an unknown number or seeming like a wrong number, please don’t respond—it may be a scam. YimPay Steelwork doesn’t use personal numbers, and staff cannot accept direct payments. Transfer only to 'ทีเอ็มการช่าง'. Call 0818961585.",
    },
    {
      keywords: ["link", "ลิงก์", "click", "คลิก", "phishing", "ฟิชชิ่ง"],
      reply: isThaiLang
        ? "กรุณาอย่าคลิกลิงก์จากข้อความที่ไม่รู้จัก ร้านยิ้มพาย สตีลเวิร์คไม่ส่งลิงก์ขอข้อมูลส่วนตัว และพนักงานไม่รับเงินโดยตรง โอนเงินไป 'ทีเอ็มการช่าง' เท่านั้น ติดต่อ 0818961585 เพื่อยืนยันค่ะ"
        : "Please do not click links from unknown messages. YimPay Steelwork doesn’t send links requesting personal info, and staff cannot accept direct payments. Transfer only to 'ทีเอ็มการช่าง'. Call 0818961585 to verify.",
    },
    {
      keywords: ["โอน", "ชำระ", "บัญชี", "payment", "transfer", "bank account"],
      reply: isThaiLang
        ? "โอนเข้า 'ทีเอ็มการช่าง' เท่านั้นค่ะ พนักงานของเราไม่ได้รับอนุญาตให้รับเงินโดยตรงเข้าบัญชีส่วนตัว"
        : "Please transfer to the account name 'ทีเอ็มการช่าง' only. Our staff are not allowed to receive payments directly into personal accounts.",
    },
    {
      keywords: ["ร้านอยู่ไหน", "ที่อยู่", "location", "where", "map"],
      reply: isThaiLang
        ? `ร้านอยู่ที่ 122/79 นาเกลือ ซอย 24 ต.นาเกลือ อ.บานา จ.ปัตตานี 94000 ดูแผนที่ได้ที่นี่เลยค่ะ: ${mapURL}`
        : `Our shop is located at 122/79 Naklua Soi 24, Naklua, Bana, Pattani 94000, Thailand. Here's the map: ${mapURL}`,
    },
    {
      keywords: ["ตัดเลเซอร์", "laser"],
      reply: isThaiLang
        ? "รบกวนแจ้งวัสดุ ความหนา และแบบที่ต้องการด้วยนะคะ"
        : "Please tell me the material, thickness, and design you need.",
    },
    {
      keywords: ["พับเหล็ก", "สั่งทำ", "custom", "order"],
      reply: isThaiLang ?
        "รบกวนแจ้งแบบ ขนาด วัสดุ และจำนวนที่ต้องการด้วยนะคะ" :
        "Please share the design, size, material, and quantity you need.",
    },
    {
      keywords: ["เจ๊", "เจ้แหม่ม", "je mam"],
      reply: isThaiLang
        ? "ที่นี่ไม่ใช่เจ๊แหม่มนะคะ หากต้องการคุยกับเจ้าของร้าน โทร 0818961585 ได้เลยค่ะ"
        : "This is not Je Mam. If you'd like to speak with the owner directly, please call 0818961585.",
    },
  ];

  for (const entry of quickReplies) {
    if (entry.keywords.some((k) => msg.includes(k))) {
      return entry.reply;
    }
  }
  return null;
}

async function getGeminiResponse(userMessage) {
  try {
    const model = gemini.getGenerativeModel({
      model: "gemini-pro",
    });
    const isThaiLang = isThai(userMessage);
    const prompt = isThaiLang ? thaiPrompt : englishPrompt;
    const result = await model.generateContent(`${prompt}\n\nUser: ${userMessage}\nAssistant:`);
    const geminiResponse = result.response.text();
    console.log("Gemini raw response:", geminiResponse);
    return geminiResponse;
  } catch (e) {
    console.error("Gemini API error:", e);
    return "ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้ในขณะนี้";
  }
}

app.post("/webhook", middleware(lineConfig), async (req, res) => {
  const events = req.body.events;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(200).send("No events to process.");
  }

  try {
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const userMessage = event.message.text;
          const isThaiLang = isThai(userMessage);
          const quickReply = detectQuickReply(userMessage, isThaiLang);

          let replyText;
          if (quickReply) {
            replyText = quickReply;
          } else {
            replyText = await getGeminiResponse(userMessage);
          }

          await lineClient.replyMessage(event.replyToken, {
            type: "text",
            text: replyText,
          });
        }
      }),
    );
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// const dialogflow = require("@google-cloud/dialogflow");

// Dialogflow project ID and session client
// const projectId = process.env.DIALOGFLOW_PROJECT_ID || "tm-chat-bot-a9f0a"; // Replace with your Dialogflow Project ID
// const sessionClient = new dialogflow.SessionsClient();

// /**
//  * Handles LINE message events, processes with Dialogflow, falls back to Gemini,
//  * stores messages, and replies to the user.
//  * @param {object} event - LINE webhook event object
//  * @return {Promise<null|object>} - LINE reply message or null
//  */
// async function handleEvent(event) {
//   if (event.type !== "message" || event.message.type !== "text") {
//     return Promise.resolve(null);
//   }
//   const userMessage = event.message.text;
//   const userId = event.source.userId;
//   const sessionId = userId; // Use userId as sessionId for unique conversations

//   let replyText = "";

//   try {
//     // Send message to Dialogflow
//     const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
//     const request = {
//       session: sessionPath,
//       queryInput: {
//         text: {
//           text: userMessage,
//           languageCode: "en-US", // Or your preferred language code
//         },
//       },
//     };

//     const responses = await sessionClient.detectIntent(request);
//     const result = responses[0].queryResult;

//     if (result.fulfillmentText) {
//       replyText = result.fulfillmentText;
//       console.log("Dialogflow fulfillment text:", replyText);
//     } else if (result.intent) {
//       // If Dialogflow detected an intent but no fulfillment text,
//       // it means it might be asking for more info (e.g., required parameters)
//       // or the intent is not fully resolved.
//       // In this case, we can use Gemini to generate a more general response
//       // or a clarifying question based on the intent.
//       console.log(`Dialogflow detected intent: ${result.intent.displayName}`);
//       // You can add more sophisticated logic here to craft a response
//       // based on the detected intent and missing parameters.
//       // For now, we'll fall back to Gemini.
//       replyText = await getGeminiResponse(userMessage);
//     } else {
//       // No intent detected by Dialogflow, fall back to Gemini
//       console.log("No intent detected by Dialogflow. Falling back to Gemini.");
//       replyText = await getGeminiResponse(userMessage);
//     }
//   } catch (e) {
//     console.error("Dialogflow API error:", e);
//     // Fallback to Gemini if Dialogflow fails
//     replyText = await getGeminiResponse(userMessage);
//   }

//   // Store message locally in messages.json
//   const filePath = path.join(__dirname, "messages.json");
//   let messages = [];
//   if (fs.existsSync(filePath)) {
//     try {
//       messages = JSON.parse(fs.readFileSync(filePath, "utf8"));
//     } catch (e) {
//       messages = [];
//     }
//   }
//   messages.push({
//     userId,
//     userMessage,
//     replyText, // Changed from geminiResponse to replyText
//     timestamp: new Date().toISOString(),
//   });
//   fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));

//   // Reply to user
//   return lineClient.replyMessage(
//     event.replyToken,
//     {
//       type: "text",
//       text: replyText,
//     },
//   );
// }

// /**
//  * Generates a response using the Gemini API (Thai version for metal shop).
//  * @param {string} userMessage - The user's message.
//  * @return {Promise<string>} - The generated Gemini response.
//  */
// async function getGeminiResponse(userMessage) {
//   try {
//     const model = gemini.getGenerativeModel({
//       model: "gemini-pro",
//     });
//     const prompt = `คุณเป็นผู้ช่วยร้านขายเหล็กและโลหะที่เป็นมิตรและมีความรู้ เช่น เหล็ก (stl), สแตนเลส, อลูมิเนียม ฯลฯ คุณช่วยลูกค้าเกี่ยวกับข้อมูลสินค้า ราคา การสั่งซื้อ การจัดส่ง และให้คำแนะนำเกี่ยวกับการใช้งานโลหะสำหรับงานก่อสร้าง งานช่าง และงานซ่อมแซมต่าง ๆ

// ตอบกลับลูกค้าด้วยภาษาที่สุภาพ เป็นกันเอง และเข้าใจง่าย

// คำแนะนำพิเศษ:
// - หากลูกค้าต้องการสั่งซื้อเหล็กหรือโลหะ (เช่น stl, เหล็ก, สแตนเลส, อลูมิเนียม ฯลฯ) ให้แจ้งลูกค้าว่า "กรุณาติดต่อเจ้าของร้านโดยตรงที่เบอร์ 0818961585"
// - หากลูกค้าสอบถามเกี่ยวกับการชำระเงินหรือโอนเงิน ให้แจ้งชื่อบัญชีว่า "ทีเอ็มการช่าง"
// - หากลูกค้าสอบถามเกี่ยวกับการงานตัดเลเซอร์ ให้สอบถามรายละเอียดเพิ่มเติม เช่น วัสดุ ความหนา หรือแบบที่ต้องการ

// ตัวอย่างการสนทนา:

// ลูกค้า: มีแผ่นสแตนเลสขายไหม
// ผู้ช่วย: สวัสดีค่ะ ร้านเรามีแผ่นสแตนเลสหลายขนาดและความหนา ต้องการขนาดหรือความหนาเท่าไหร่คะ

// ลูกค้า: เหล็กแผ่น 2x2 เมตร ราคาเท่าไหร่
// ผู้ช่วย: ราคาเหล็กแผ่น 2x2 เมตรขึ้นอยู่กับความหนาและชนิดของเหล็ก รบกวนแจ้งความหนาที่ต้องการด้วยค่ะ จะได้แจ้งราคาได้ถูกต้อง

// ลูกค้า: ส่งของถึงไซต์งานไหม
// ผู้ช่วย: ร้านเรามีบริการจัดส่งถึงไซต์งานในพื้นที่ใกล้เคียงค่ะ รบกวนแจ้งสถานที่และรายการสินค้าที่ต้องการ เพื่อเช็คการจัดส่งให้นะคะ

// ลูกค้า: ขอใบเสนอราคาอลูมิเนียมท่อ 10 เส้น
// ผู้ช่วย: ได้เลยค่ะ รบกวนแจ้งขนาดเส้นผ่านศูนย์กลางและความยาวของท่ออลูมิเนียมที่ต้องการด้วยนะคะ จะได้จัดทำใบเสนอราคาให้ค่ะ

// ลูกค้า: อยากสั่งเหล็ก
// ผู้ช่วย: หากต้องการสั่งซื้อเหล็กหรือโลหะ กรุณาติดต่อเจ้าของร้านโดยตรงที่เบอร์ 0818961585 ค่ะ

// ลูกค้า: โอนเงินเข้าบัญชีอะไร
// ผู้ช่วย: สำหรับการชำระเงินหรือโอนเงิน กรุณาใช้ชื่อบัญชี "ทีเอ็มการช่าง" ค่ะ

// ลูกค้า: มีบริการตัดเลเซอร์ไหม
// ผู้ช่วย: ร้านเรามีบริการตัดเลเซอร์ค่ะ รบกวนแจ้งรายละเอียดวัสดุ ความหนา และแบบที่ต้องการด้วยนะคะ

// ลูกค้า: ความแตกต่างระหว่างเหล็กดำกับสแตนเลสคืออะไร
// ผู้ช่วย: เหล็กดำเป็นเหล็กกล้าคาร์บอนที่แข็งแรงและราคาประหยัด แต่จะเกิดสนิมได้ง่ายหากไม่ได้เคลือบ ส่วนสแตนเลสมีส่วนผสมของโครเมียม ทำให้ทนต่อสนิมและการกัดกร่อนได้ดี เหมาะกับงานกลางแจ้งหรืองานที่ต้องการความสะอาด

// ลูกค้า: ${userMessage}
// ผู้ช่วย:`;
//     const result = await model.generateContent(prompt);
//     const geminiResponse = result.response.text();
//     console.log("Gemini raw response:", geminiResponse);
//     return geminiResponse;
//   } catch (e) {
//     console.error("Gemini API error:", e);
//     return "ขออภัย ไม่สามารถประมวลผลข้อความของคุณได้ในขณะนี้";
//   }
// }

// Simple webhook endpoint for testing


exports.lineBot = functions.https.onRequest(app);

// Allow running Express app locally for testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
