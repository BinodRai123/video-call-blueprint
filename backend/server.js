const { createServer } = require("http");
const app = require("./src/app");
const initializeSocket = require("./src/socket/socket.server");

const httpServer = createServer(app);
initializeSocket(httpServer);

httpServer.listen("3000", () => {
    console.log("server is connected on port 3000");
})