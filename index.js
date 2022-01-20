import Koa from "koa";
import respond from "koa-respond";
import bodyParser from "koa-bodyparser";
import { lightsApi } from "./routes/lights-api.js";

const app = new Koa();

app.use(bodyParser());
app.use(respond());
app.use(lightsApi.routes());
app.listen(process.env.PORT || 1337, () =>
  console.log("server started on 1337")
);
