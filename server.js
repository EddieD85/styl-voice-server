import Fastify from "fastify";
import formbody from "@fastify/formbody";
import websocket from "@fastify/websocket";
import WebSocket from "ws";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;
const VOICE = "alloy";

const SYSTEM_PROMPT = `
You are STYL Concierge, the AI voice assistant for STYL.

Help customers with:
- Mobile barber bookings
- Mobile stylist bookings
- Nail tech bookings
- Massage therapist bookings
- Beauty supply delivery

Collect:
- Name
- Phone number
- Address
- Service requested
- Date and time

For manager requests, complaints, or refunds, direct them to stylmobile.com/support.

Be warm, professional, brief, and luxury-focused.
`;

const fastify = Fastify({ logger: true });

await fastify.register(formbody);
await fastify.register(websocket);

fastify.get("/", async () => {
  return {
    status: "ok",
    service: "STYL AI Voice Receptionist"
  };
});

fastify.post("/incoming-call", async (req, reply) => {
  const host = req.headers.host;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to STYL. Connecting you to our AI concierge now.</Say>
  <Connect>
    <Stream url="wss://${host}/media-stream" />
  </Connect>
</Response>`;

  reply.type("text/xml");
  return reply.send(twiml);
});

fastify.get("/media-stream", { websocket: true }, (twilioWs) => {
  console.log("[STYL] Twilio media stream connected");

  let streamSid = null;

  const openaiWs = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );

  openaiWs.on("open", () => {
    console.log("[STYL] OpenAI Realtime connected");

    openaiWs.send(JSON.stringify({
      type: "session.update",
      session: {
        turn_detection: { type: "server_vad" },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        voice: VOICE,
        instructions: SYSTEM_PROMPT,
        modalities: ["text", "audio"],
        temperature: 0.8
      }
    }));

    openaiWs.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: "Greet the caller as STYL Concierge and ask how you can help."
      }
    }));
  });

  openaiWs.on("message", (data) => {
    const event = JSON.parse(data.toString());

    if (event.type === "response.audio.delta" && event.delta && streamSid) {
      twilioWs.socket.send(JSON.stringify({
        event: "media",
        streamSid,
        media: {
          payload: event.delta
        }
      }));
    }

    if (event.type === "error") {
      console.error("[STYL] OpenAI error:", event.error);
    }
  });

  twilioWs.socket.on("message", (message) => {
    const msg = JSON.parse(message.toString());

    if (msg.event === "start") {
      streamSid = msg.start.streamSid;
      console.log("[STYL] Stream started:", streamSid);
    }

    if (msg.event === "media" && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: msg.media.payload
      }));
    }

    if (msg.event === "stop") {
      console.log("[STYL] Stream stopped");
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    }
  });

  twilioWs.socket.on("close", () => {
    console.log("[STYL] Twilio disconnected");
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
});

try {
  await fastify.listen({
    port: PORT,
    host: "0.0.0.0"
  });
  console.log(`[STYL] Server running on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
    }
