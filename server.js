const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
const devices = {};  //Store IoT devices (Janus instances)
let clients = {}; //Store WebClients

wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");
    
    ws.on("message", (message) => {
        const data = JSON.parse(message);
        console.log("Received:", data);

        if (data.type === "register" && data.role === "janus") {
            devices[data.id] = ws;
            console.log(`IoT Device registered: ${data.id}`);

        } else if (data.type === "register" || data.type === "client") {
            clients[ws] = ws;
            console.log(`WebClient connected`);
        
        } else if(data.type === "request-offer"){
            const janusWS = devices[data.deviceID];
            if(janusWS){
                console.log(`forwarding offer request to ${data.deviceID}`);
                janusWS.send(JSON.stringify({ type: "request-offer", deviceID: data.deviceID, streamID: data.streamID }));

            } else {
                console.log(`Device ${data.deviceID} not found`);
            }
        }
        else if(data.type === "offer"){
            const clientWS = clients[ws];
            if(clientWS){
                console.log(`Forwarding SDP answer to WebClient`);
                clientWS.send(JSON.stringify({ type: "offer", sdp: data.sdp }));
            }
        }
        else if(data.type === "answerdevice"){
            const janusWS = devices[data.deviceID];
            if(janusWS){
                console.log(`Forwarding SDP answer to IoT Device`);
                janusWS.send(JSON.stringify({ type: "answer", deviceID: data.deviceID, streamID: data.streamID, sdp: data.sdp }));
            }
        }
        else if (data.type === "ice") {
            if (data.to === "janus") {
                const janusWS = devices[data.deviceID];
                if (janusWS) {
                    console.log(`Forwarding ICE candidate to IoT Device: ${data.deviceID}`);
                    janusWS.send(JSON.stringify({ type: "ice", candidate: data.candidate, deviceID: data.deviceID }));
                }
            } else if (data.to === "client") {
                const clientWS = clients[ws];
                if (clientWS) {
                    console.log(`Forwarding ICE candidate to WebClient`);
                    clientWS.send(JSON.stringify({ type: "ice", candidate: data.candidate }));
                }
            }
        }

    });

    ws.on("close", () => {
        console.log("Connection closed");
        Object.keys(devices).forEach((key) => {
            if (devices[key] === ws) delete devices[key];
        });
        Object.keys(clients).forEach((key) => {
            if (clients[key] === ws) delete clients[key];
        });
    });
});

console.log("WebRTC Signaling Server running on ws://localhost:3000");