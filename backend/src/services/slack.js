import axios from "axios";

export async function postToSlack(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, { text: message });
  } catch (err) {
    console.error("Slack post failed:", err.message);
  }
}