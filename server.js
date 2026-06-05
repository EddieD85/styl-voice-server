import Fastify from "fastify";

const app = Fastify();

app.get("/", async () => {
  return { message: "STYL Voice Server Running" };
});

app.post("/incoming-call", {
  config: {
    rawBody: true
  }
}, async (request, reply) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling STYL. How may I help you today?</Say>
  <Pause length="1"/>
  <Say voice="alice">Our AI receptionist is being connected. Please call back shortly if the call disconnects.</Say>
</Response>`;

  reply.type("text/xml").send(twiml);
});

app.listen({
  port: process.env.PORT || 3000,
  host: "0.0.0.0"
});
