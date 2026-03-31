const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("frontend"));

const upload = multer({ storage: multer.memoryStorage() });

// Load contract details
const contractAddress = fs
  .readFileSync("./frontend/contract-address.txt", "utf8")
  .trim();
const contractJSON = require("./frontend/PropertyLedger.json");
const contractABI = Array.isArray(contractJSON) ? contractJSON : contractJSON.abi;

// Connect to Remix VM via its exposed RPC
// Remix VM exposes a local RPC at this address
const provider = new ethers.JsonRpcProvider(
  "http://localhost:8545"
);

// We'll use the first test account from Remix VM
// Replace this with your actual Remix VM account private key
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, signer);

// ── IPFS setup ──
let ipfs;
async function getIPFS() {
  if (!ipfs) {
    const { create } = await import("ipfs-http-client");
    ipfs = create({ host: "127.0.0.1", port: 5001, protocol: "http" });
  }
  return ipfs;
}

// ── API Routes ──

// Get total property count
app.get("/api/count", async (req, res) => {
  try {
    const count = await contract.count();
    res.json({ count: count.toString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a single property by ID
app.get("/api/property/:id", async (req, res) => {
  try {
    const prop = await contract.properties(req.params.id);
    const hist = await contract.getHistory(req.params.id);
    res.json({
      id: prop.id.toString(),
      apartmentNo: prop.apartmentNo,
      societyName: prop.societyName,
      city: prop.city,
      owner: prop.owner,
      registeredAt: new Date(
        Number(prop.registeredAt) * 1000
      ).toLocaleDateString("en-IN"),
      history: hist.map((h) => ({
        from: h.from,
        to: h.to,
        at: new Date(Number(h.at) * 1000).toLocaleString("en-IN"),
      })),
    });
  } catch (e) {
    res.status(404).json({ error: "Property not found" });
  }
});

// Get all properties for a wallet address
app.get("/api/properties/:address", async (req, res) => {
  try {
    const ids = await contract.getMyProperties(req.params.address);
    const result = [];
    for (let id of ids) {
      const prop = await contract.properties(id);
      result.push({
        id: id.toString(),
        apartmentNo: prop.apartmentNo,
        societyName: prop.societyName,
        city: prop.city,
        owner: prop.owner,
      });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload document to IPFS
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const client = await getIPFS();
    const result = await client.add(req.file.buffer);
    res.json({ ipfsHash: result.cid.toString() });
  } catch (e) {
    res.status(500).json({ error: "IPFS upload failed: " + e.message });
  }
});

// Get documents for a property
app.get("/api/documents/:id", async (req, res) => {
  try {
    const docs = await contract.getDocuments(req.params.id);
    res.json(
      docs.map((d) => ({
        name: d.name,
        ipfsHash: d.ipfsHash,
        uploadedAt: new Date(
          Number(d.uploadedAt) * 1000
        ).toLocaleString("en-IN"),
        viewUrl: `http://localhost:8080/ipfs/${d.ipfsHash}`,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () =>
  console.log("✅ Server running → open http://localhost:3001")
);