import { Buffer } from "buffer"; import P from "process/browser.js";
globalThis.Buffer = Buffer; globalThis.process = P;
export { default } from "pcap-parser";
