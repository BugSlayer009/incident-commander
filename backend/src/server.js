import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import agoraRoutes from "./routes/agora.js";
import transcriptRoutes from "./routes/transcript.js";
import actionsRoutes from "./routes/actions.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use("/api/agora", agoraRoutes);
app.use("/api/transcript", transcriptRoutes(io));
app.use("/api/actions", actionsRoutes(io));

io.on("connection", (socket) => {
  console.log("dashboard connected:", socket.id);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`server running on ${PORT}`));