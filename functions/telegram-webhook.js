const axios = require('axios');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }
    
    try {
        const body = JSON.parse(event.body);
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        // Process Telegram update
        if (body.message) {
            const chatId = body.message.chat.id;
            const text = body.message.text;
            
            // Send response
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: `Привет! Вы написали: ${text}\n\nИспользуйте /start для начала работы.`,
                parse_mode: 'HTML'
            });
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ ok: true })
        };
    } catch (error) {
        console.error('Webhook error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
