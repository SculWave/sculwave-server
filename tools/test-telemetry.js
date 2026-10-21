const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/telemetry", {
    auth: {
        token: process.env.TELEMETRY_TOKEN
    },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("CONNECTED");
});

socket.on("telemetry-snapshot", data => {
    console.log(data);
});

socket.on("telemetry-delta", data => {
    console.log(data);
});

socket.on("connect_error", err => {
    console.error(err);
});