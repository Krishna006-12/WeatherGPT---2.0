import { IntentRouter } from "./src/services/ai/intent-router";
import * as fs from "fs";

const router = new IntentRouter();
const res1 = router.classify("Will rain affect wheat harvesting?");

fs.writeFileSync("test-output.json", JSON.stringify({
  res1
}, null, 2));
