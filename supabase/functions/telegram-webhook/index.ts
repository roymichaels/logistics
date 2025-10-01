const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    message?: any;
    data?: string;
  };
}

const telegramAPI = (method: string, body: unknown) =>
  fetch(`https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    const receivedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    
    if (expectedSecret && receivedSecret !== expectedSecret) {
      console.error("Invalid webhook secret");
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await req.json() as TelegramUpdate;
    console.log("Received update:", JSON.stringify(update, null, 2));

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const userId = update.message.from.id;

      if (text === '/start') {
        await telegramAPI("sendMessage", {
          chat_id: chatId,
          text: "🚚 Welcome to Logistics Mini App!\n\nTap the button below to open the app:",
          reply_markup: {
            inline_keyboard: [[
              {
                text: "📱 Open App",
                web_app: {
                  url: `${Deno.env.get("WEBAPP_URL") || "https://your-app.bolt.new"}`
                }
              }
            ]]
          }
        });
      } else {
        await telegramAPI("sendMessage", {
          chat_id: chatId,
          text: `You said: ${text}\n\nUse the menu button to open the Logistics app!`
        });
      }
    }

    if (update.callback_query) {
      await telegramAPI("answerCallbackQuery", {
        callback_query_id: update.callback_query.id,
        text: "Opening app..."
      });
    }

    return new Response("OK", {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders
    });
  }
});