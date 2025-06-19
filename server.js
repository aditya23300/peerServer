const express = require("express");
const { ExpressPeerServer } = require("peer");
const http = require("http");
const cors = require("cors");

// Load environment variables
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : undefined, // Allow localhost only in development mode
  "https://loop-connect.onrender.com", // Production domain
  // Add other trusted domains here
].filter(Boolean); // Remove undefined values

// Setup CORS middleware
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
if(!process.env.NODE_ENV === "development")
app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Create PeerJS server with enhanced configuration
const peerServer = ExpressPeerServer(server, {
  debug: true, // Detailed logging
  path: "/",
  allow_discovery: true,
  config: {
    iceServers: [
      // Google's public STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },

      // Optional: Add TURN servers for better connectivity
      // {
      //   urls: "turn:your-turn-server.com",
      //   username: "your-username",
      //   credential: "your-password"
      // }
    ],
  },
});

// Error handling for PeerJS server
peerServer.on("connection", (client) => {
  console.log(`New peer connected: ${client.id}`);
});

peerServer.on("disconnect", (client) => {
  console.log(`Peer disconnected: ${client.id}`);
});

// Mount PeerJS server
app.use("/peerjs", peerServer);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// Determine port, with fallback
const PORT = process.env.PORT || process.env.PEER_PORT || 9000;

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`PeerJS server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  server.close(() => {
    console.log("Closed out remaining connections");
    process.exit(0);
  });

  // Force close server after 10 seconds
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
});
