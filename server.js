const express = require("express");
const { ExpressPeerServer } = require("peer");
const http = require("http");
const cors = require("cors");

// Load environment variables
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// // Comprehensive CORS configuration
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     // or from specific allowed origins
//     const allowedOrigins = [
//       "http://localhost:3000", // Local development
//       // Production webapp domain
//       "https://loop-connect.onrender.com",
//       // Add any other domains that should access your PeerJS server
//     ];

//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
//   optionsSuccessStatus: 200,
// };

// Apply CORS middleware
app.use(cors());

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
