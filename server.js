import Fastify from "fastify";

const app = Fastify();

app.addContentTypeParser(
  "application/x-www-form-urlencoded",
  { parseAs: "string" },
  function (req, body, done) {
    done(null, body);
  }
);

app.get("/", async () => {
  return { message: "STYL Voice Server Running" };
});

app.post("/incoming-call", async (request, reply) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling STYL. How may I help you today?</Say>
</Response>`;

  reply.type("text/xml");
  return reply.send(twiml);
});

const start = async () => {
  try {
    await app.listen({
      port: process.env.PORT || 3000,
      host: "0.0.0.0"
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
