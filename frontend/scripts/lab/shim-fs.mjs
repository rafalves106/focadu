import { Readable } from "stream";
export const files = globalThis.__files ?? (globalThis.__files = {});
export function createReadStream(p){ const b = globalThis.__files[p]; if(!b) { const r=new Readable({read(){}}); setTimeout(()=>r.destroy(Object.assign(new Error("ENOENT "+p),{code:"ENOENT"}))); return r; } const r=new Readable({read(){}}); setTimeout(()=>{r.push(Buffer.from(b)); r.push(null);}); return r; }
export default { createReadStream };
