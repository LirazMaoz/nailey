import twilio from 'twilio';
import 'dotenv/config';

let client = null;

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token || sid.startsWith('your-') || token.startsWith('your-')) {
      return null;
    }
    client = twilio(sid, token);
  }
  return client;
}

/**
 * Send appointment confirmation SMS in Hebrew.
 * @param {string} to  - recipient phone number (E.164 format)
 * @param {object} appointment - { clientName, date, time, colorName }
 */
export async function sendAppointmentSMS(to, { clientName, date, time, colorName }) {
  const twilioClient = getClient();

  if (!twilioClient) {
    console.warn('Twilio not configured — SMS not sent');
    return { success: false, reason: 'not_configured' };
  }

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber || fromNumber.startsWith('+123')) {
    console.warn('TWILIO_FROM_NUMBER not set — SMS not sent');
    return { success: false, reason: 'not_configured' };
  }

  // Format date to Hebrew-friendly dd/mm/yyyy
  const [year, month, day] = date.split('-');
  const hebrewDate = `${day}/${month}/${year}`;

  const body =
    `שלום ${clientName}, התור שלך נקבע ל-${hebrewDate} בשעה ${time}. הצבע שנבחר: ${colorName}. נתראה! 💅`;

  try {
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to,
    });
    console.log(`SMS sent: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error('Twilio error:', err.message);
    return { success: false, reason: err.message };
  }
}
