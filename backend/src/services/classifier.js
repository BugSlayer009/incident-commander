import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an incident classification engine. Given a single transcript chunk from a live incident call, classify it into exactly one of: "fact", "hypothesis", "decision", "action", "conflict", "irrelevant".

Rules:
- "fact": something confirmed/observed (e.g. "the payment API is returning 500s since 10:42")
- "hypothesis": a guess or unconfirmed theory (e.g. "I think it might be the db connection pool")
- "decision": a choice the team has made (e.g. "we're rolling back to the previous version")
- "action": a task assigned to someone (extract owner and what needs doing)
- "conflict": this statement contradicts something likely already said (only use if the text itself signals disagreement, e.g. "no that's not right, actually...")
- "irrelevant": small talk, filler, not incident-relevant

Respond ONLY with JSON: { "type": "...", "summary": "short rewritten version", "owner": "name or null", "dueBy": "time or null" }`;

export async function classifyChunk(text, speaker, role) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Speaker: ${speaker} (${role})\nText: "${text}"` }
    ],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(completion.choices[0].message.content);
  return { ...result, speaker, role, text };
}