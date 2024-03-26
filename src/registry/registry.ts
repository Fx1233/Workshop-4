import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;};

export type GetNodeRegistryBody = {
  nodes: Node[];};

export async function launchRegistry() {
  const app = express();
  app.use(express.json());// Body parsing middleware
  app.use(bodyParser.json());
  let nodeRegistryBody: GetNodeRegistryBody = { nodes: [] }; // Initialized node registry

  app.get("/getNodeRegistry", getNodeRegistry);
  app.get("/status", getStatus);
  app.post("/registerNode", registerNode);

  const server = app.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;// Return the server instance

  function getNodeRegistry(req: Request, res: Response) {



    res.status(200).json(nodeRegistryBody);// Return the entire node registry


}

  
  function registerNode(req: Request<RegisterNodeBody>, res: Response) {
    const { nodeId, pubKey } = req.body;// Destructure request body
    nodeRegistryBody.nodes.push({ nodeId, pubKey });// Add new node info to registry
    res.status(200).json({ result: "ok" });// Confirm registration
  }
  function getStatus(req: Request, res: Response) {
    res.send("live");// Respond with a simple live status
  }
}
