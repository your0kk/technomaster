import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const docker = process.env.DOCKER_BIN || "docker";
const image = process.argv[2] || "technomaster:test";
const name = `technomaster-check-${process.pid}`;
const run = (...args) => execFileSync(docker, args, { encoding: "utf8" }).trim();

const config = JSON.parse(run("image", "inspect", image))[0].Config;
assert.equal(config.User, "node", "Container must run without root");
assert(!config.Env.some((value) => value.startsWith("SUPABASE_SERVICE_ROLE_KEY=")), "Secret must not be stored in image config");
const files = run("run", "--rm", "--entrypoint", "sh", image, "-c", "find /app -type f \\( -name '.env*' -o -name '*.local.json' -o -name '*.pem' -o -name '*.key' \\)");
assert.equal(files, "", "Private files must not be copied to the image");

try {
  run("run", "--detach", "--name", name, "--publish", "127.0.0.1::3000", image);
  const port = run("port", name, "3000/tcp").split(":").at(-1);
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      ready = (await fetch(`${base}/login`)).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert(ready, "Server did not become ready");
  for (const path of ["/", "/services", "/parts", "/cart", "/checkout", "/login", "/admin", "/master"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, `${path}: unexpected HTTP status`);
    assert((await response.text()).includes("ТехноМастер"), `${path}: missing application content`);
    console.log(`${path}: HTTP 200`);
  }
  const admin = await fetch(`${base}/api/admin/requests`);
  assert.equal(admin.status, 401, "Admin API must reject anonymous requests");
  console.log("Admin API: anonymous access rejected");
  console.log("Image: non-root user; private files and server key absent");
} finally {
  run("rm", "--force", name);
}
