# TM Metal Shop LINE Chatbot
🔒 [PRIVACY](PRIVACY.md)  🪪 [UNLicense](LICENSE)  📕[Resource](Resource.md)


![Made with Gemini AI](https://img.shields.io/badge/made%20with-Gemini%20AI-blue)

[LINE Photo](1on1andgroup.png)

A LINE chatbot for a metal shop, powered by Google Gemini AI. The bot answers customer questions in Thai or English, provides shop info, and follows business rules for orders, payments, and more.

## Features
- Responds in Thai or English based on user input
- Uses Gemini AI for natural, business-aware replies
- Quick replies for common questions (payment, location, laser cutting, etc.)
- Ready for deployment on Firebase Functions or Vercel

## Setup

### 1. Clone the repository
```sh
git clone <your-repo-url>
cd <your-repo>
```

### 2. Install dependencies
```sh
cd functions # or project root for Vercel
npm install
```

### 3. Environment Variables
Create a `.env` file (not committed to git) with:
```
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Deploy
- **Firebase:**
  - Set secrets with `firebase functions:config:set ...`
  - Deploy: `firebase deploy --only functions`
- **Vercel:**
  - Push to GitHub and connect to Vercel
  - Set environment variables in Vercel dashboard

## Usage
- Set your webhook URL in the LINE Developers Console to `/webhook` (Firebase) or `/api/webhook` (Vercel)
- The bot will reply to messages in the appropriate language

## Security
- **Never commit your `.env` or API keys to public repos.**
- See LICENSE and PRIVACY.md for more info.

## Customizing Keyword-Based Replies

You can add custom replies for specific keywords or phrases in `api/webhook.js`.

### Example: Add a keyword reply

1. Open `api/webhook.js`. [Resource](Resource.md)
2. Inside the event handler (where it checks `event.type === "message" && event.message.type === "text"`), add your keyword logic **before** the Gemini API call. For example:

```js
if (/^hello$/i.test(userMessage)) {
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: "Hi there! How can I help you?",
  });
  return;
}
```

3. You can add more `if` or `else if` blocks for other keywords or patterns.
4. If no keyword matches, the code will use Gemini AI as usual.

### Tips
- Use regular expressions for flexible matching (e.g., `/keyword/i` for case-insensitive).
- Always `return;` after sending a reply to prevent duplicate responses.
- Place your custom logic **before** the Gemini API call.

**Example block:**
```js
if (/^order$/i.test(userMessage)) {
  await lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: "To order, please contact the shop owner at 08xxxxxxxx.",
  });
  return;
}
```

Now, when a user sends "order", the bot will reply with your custom message instead of using Gemini.