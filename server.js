import Fastify from "fastify";

const app = Fastify();

app.get("/", async () => {
  return {
    message: "STYL Voice Server Running"
  };
});

app.listen({
  port: process.env.PORT || 3000,
  host: "0.0.0.0"
});
