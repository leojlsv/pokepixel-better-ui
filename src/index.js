import { createBetterUI } from "./core/bootstrap.js";
import { exampleModule } from "./modules/example/index.js";

const app = createBetterUI({
  debug: false,
  modules: [
    exampleModule,
  ],
});

app.start();
