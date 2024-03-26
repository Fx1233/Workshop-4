import express from "express";
import bodyParser from "body-parser";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { exportPrvKey, exportPubKey, generateRsaKeyPair, rsaDecrypt, symDecrypt } from "../crypto";
import { Node } from "../registry/registry";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;
  let lastReceivedEncryptedMessage: string | null = null;


  let rsaKeyPair = await generateRsaKeyPair();

  let pubKey = await exportPubKey(rsaKeyPair.publicKey);

  let privateKey = rsaKeyPair.privateKey;

  let node: Node = { nodeId: nodeId, pubKey: pubKey };

  onionRouter.get("/status", getStatus);
  onionRouter.get("/getLastReceivedDecryptedMessage", getLastReceivedDecryptedMessage);
  onionRouter.get("/getLastReceivedEncryptedMessage", getLastReceivedEncryptedMessage);
  onionRouter.get("/getPrivateKey", getPrivateKey);
  onionRouter.post("/message", postMessage);
  onionRouter.get("/getLastMessageDestination", getLastMessageDestination);


  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`
    );
  });

  await registerNode(nodeId, pubKey);

  return server;

  async function getStatus(req: express.Request, res: express.Response) {
    res.send("live");}
  async function getLastReceivedEncryptedMessage(req: express.Request, res: express.Response) {
    res.status(200).json({ result: lastReceivedEncryptedMessage }); }
  async function getLastMessageDestination(req: express.Request, res: express.Response) {
    res.status(200).json({ result: lastMessageDestination });}

  
  async function getPrivateKey(req: express.Request, res: express.Response) {
    res.status(200).json({ result: await exportPrvKey(privateKey) });}

    async function postMessage(req:express.Request, res: express.Response) {
      const encryptedBundle = req.body.message;
      const decryptedKeyBundle = await rsaDecrypt(encryptedBundle.slice(0, 344), privateKey);
      const decryptedContent = await symDecrypt(decryptedKeyBundle, encryptedBundle.slice(344));
    
      const nextStop = parseInt(decryptedContent.substring(0, 10), 10);
      const nextMessage = decryptedContent.substring(10);
    
      lastReceivedEncryptedMessage = encryptedBundle;
      lastReceivedDecryptedMessage = nextMessage;
      lastMessageDestination = nextStop;
    
      await fetch(`http://localhost:${nextStop}/message`, {
        method: "POST",
        headers: {"Content-Type": "application/json",},
        body: JSON.stringify({ message: nextMessage })
      });
      res.status(200).send("Success");
    }
    async function getLastReceivedDecryptedMessage(req: express.Request, res: express.Response) {
      res.status(200).json({ result: lastReceivedDecryptedMessage });}

  async function registerNode(nodeId: number, pubKey: string) {
    await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      method: "POST",
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({nodeId,pubKey,}),
    });
  }
}















