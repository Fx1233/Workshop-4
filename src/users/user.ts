import express from "express";
import bodyParser from "body-parser";
import {
  createRandomSymmetricKey,
  exportSymKey,
  importSymKey,
  rsaEncrypt,
  symEncrypt
} from "../crypto";
import { GetNodeRegistryBody, Node } from "@/src/registry/registry";
import { BASE_ONION_ROUTER_PORT, BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

let lastCircuit: Node[] = [];
let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;


export async function user(userId: number) {
  const app = express();
  app.use(express.json());
  app.use(bodyParser.json());
  app.get("/status", getStatus);
  app.get("/getLastReceivedMessage", getLastReceivedMessage);
  app.get("/getLastSentMessage", getLastSentMessage);
  app.post("/message", postMessage);
  app.get("/getLastCircuit", getLastCircuit);
  app.post("/sendMessage", sendMessage);

  const server = app.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );});
  return server;

  async function postMessage(req: express.Request, res: express.Response) {
    lastReceivedMessage = req.body.message;
    res.status(200).send("success");}

  async function getStatus(req: express.Request, res: express.Response) {
    res.send("live");}

  async function getLastSentMessage(req: express.Request, res: express.Response) {
    res.status(200).json({ result: lastSentMessage });}

  async function getLastReceivedMessage(req: express.Request, res: express.Response) {
    res.status(200).json({ result: lastReceivedMessage });}

  async function getLastCircuit(req: express.Request, res: express.Response) {
    res.status(200).json({ result: lastCircuit.map((node) => node.nodeId) });}

  async function sendMessage(req: express.Request, res: express.Response) {
    const { message, destinationUserId } = req.body;

    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)

      .then((res) => res.json() as Promise<GetNodeRegistryBody>)

      .then((body) => body.nodes);

    let circuit: Node[] = [];
    while (circuit.length < 3) {
  let newNode = nodes[Math.floor(Math.random() * nodes.length)];
  if (!circuit.includes(newNode)) {
    circuit.push(newNode);
  }
}

let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");
let finalMessage = message;

for (let currentNode of circuit) {
  let symKey = await createRandomSymmetricKey();
  let symKeyB64 = await exportSymKey(symKey);
  let encryptedMsg = await symEncrypt(symKey, `${destination}${finalMessage}`);
  destination = `${BASE_ONION_ROUTER_PORT + currentNode.nodeId}`.padStart(10, "0");
  
  let encryptedSymKey = await rsaEncrypt(symKeyB64, currentNode.pubKey);
  finalMessage = encryptedSymKey + encryptedMsg;
}

    

    circuit.reverse();
    lastCircuit = circuit;
    lastSentMessage = message;
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({ message: finalMessage }),
    });
    res.status(200).send("success");
  }
}
