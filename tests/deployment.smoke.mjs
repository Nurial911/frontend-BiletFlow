// Runs against the real Docker image and a disposable mock backend; never calls the live VM.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";

const image = process.env.FRONTEND_IMAGE ?? "biletflow-frontend:ci";
const container = `biletflow-smoke-${process.pid}`;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const backend = createServer(async (req,res) => {
  if (req.url === "/api/denied") { res.writeHead(401, { "Content-Type":"application/json" }); res.end('{"message":"Unauthorized"}'); return; }
  if (req.url === "/api/ticket.pdf") { res.writeHead(200, { "Content-Type":"application/pdf" }); res.end("%PDF-smoke"); return; }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  res.writeHead(200, { "Content-Type":"application/json" });
  res.end(JSON.stringify({ url:req.url,method:req.method,authorization:req.headers.authorization,origin:req.headers.origin,body:Buffer.concat(chunks).toString() }));
});
await new Promise(resolve => backend.listen(0,"0.0.0.0",resolve));
const backendOrigin = `http://host.docker.internal:${backend.address().port}`;
let started = false;
try {
  docker("run","--detach","--rm","--name",container,"--publish","127.0.0.1::80","--add-host","host.docker.internal:host-gateway","--env",`BACKEND_ORIGIN=${backendOrigin}`,image);
  started = true;
  const address = docker("port",container,"80/tcp").split("\n")[0];
  const origin = `http://${address}`;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(`${origin}/health`, { signal:AbortSignal.timeout(1000) })).ok; } catch { /* Wait for nginx startup. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve,250));
  }
  assert.ok(ready,"nginx did not become ready");
  const page = await fetch(`${origin}/orders/42/payment-result?status=success`);
  assert.equal(page.status,200);
  assert.match(page.headers.get("content-type"),/text\/html/);
  const html = await page.text();
  assert.match(html,/<div id="root"><\/div>/);
  const csp = page.headers.get("content-security-policy");
  assert.ok(csp.includes("script-src 'self' https://test-epay.epayment.kz/payform/payment-api.js https://epay.homebank.kz/payform/payment-api.js;"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(!csp.split("script-src ")[1].split(";")[0].includes("unsafe-inline"));
  assert.equal(page.headers.get("x-content-type-options"),"nosniff");
  const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
  assert.ok(asset,"missing production script");
  const js = await fetch(origin+asset);
  assert.equal(js.status,200);
  assert.match(js.headers.get("content-type"),/javascript/);
  assert.ok(js.headers.get("content-security-policy"),"security headers must survive asset caching directives");
  const missing = await fetch(`${origin}/assets/does-not-exist.js`);
  assert.equal(missing.status,404);
  assert.ok(missing.headers.get("content-security-policy"));
  const response = await fetch(`${origin}/api/check?value=a%26b`, { method:"POST",headers:{ Authorization:"Bearer smoke-token","Content-Type":"application/json" },body:'{"test":true}' });
  const echoed = await response.json();
  assert.deepEqual(echoed,{ url:"/api/check?value=a%26b",method:"POST",authorization:"Bearer smoke-token",origin:backendOrigin,body:'{"test":true}' });
  const denied = await fetch(`${origin}/api/denied`);
  assert.equal(denied.status,401);
  assert.deepEqual(await denied.json(),{message:"Unauthorized"});
  const pdf = await fetch(`${origin}/api/ticket.pdf`);
  assert.equal(pdf.headers.get("content-type"),"application/pdf");
  assert.equal(await pdf.text(),"%PDF-smoke");
  console.log("Deployment smoke checks passed: SPA, assets, CSP, API path/body/auth, API errors and PDF.");
} catch (error) {
  if (started) {
    try { console.error(docker("logs",container)); } catch { /* A failed --rm container may already be gone. */ }
  }
  throw error;
} finally {
  if (started) {
    try { docker("stop",container); } catch { /* Preserve the original failure if the container exited. */ }
  }
  await new Promise(resolve => backend.close(resolve));
}
