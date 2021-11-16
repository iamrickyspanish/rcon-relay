const RconClient = require("./rcon-monkey");
const micro = require("micro");
const http = require("http");

// const microDev = require("micro-dev");
const Connection = require("./rcon-monkey/src/Connection");
const connectionPrototcols = require("./rcon-monkey/src/Connection/protocols");
const ws = require("ws");
const wss = new ws.Server({ port: 3001 });

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });

  ws.send("something");
});

// expect only post requests
// format:
// {
//     type: string ("default"|"legacy") => legacy uses udp and challenge system, default uses tcp and ids
//     responseUrl: string or null
//     expectsResponse: string or null
//     reponse: { url: string, type: string ("default"| "websocket" )}
//     payload: {
//       message: string,
//       id: string
//     }
// }

const END_OF_CONTENT = 0x00;

const headerLegacy = [0xff, 0xff, 0xff, 0xff];

const sendLegacy = (message, id = null) => {
  const connection = new Connection(connectionPrototcols.UDP);

  return Buffer.concat([
    Buffer.from(headerLegacy),
    Buffer.from(message),
    Buffer.from("\n")
  ]);
};

const receiveLegacy = (buffer) => {
  const sliceArgs = [headerLegacy.length];
  const iEnd = buffer.indexOf(END_OF_CONTENT);
  if (iEnd !== -1) sliceArgs.push(iEnd);
  const withoutHeader = buffer.slice(...sliceArgs);
  const type = withoutHeader.slice(0, 1).toString();
  const message = withoutHeader.slice(1).toString();
  return [type, message];
};

const types = Object.freeze({ DEFAULT: "default", LEGACY: "legacy" });

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST")
      throw micro.createError(400, "rcon-relay test no post");
    try {
      const { type, payload } = await micro.json(req);
      if (!Object.values(types).includes(type))
        throw micro.createError(400, "invalid data");
      if (type === types.LEGACY) {
        sendLegacy(payload.message);
      } else throw micro.createError(403, "not implemented yet");
    } catch (e) {
      throw micro.createError(400, `${e}`);
    }
    return "rcon-relay test post";
  } catch (e) {
    throw e.statusCode ? e : micro.createError(500, `${e}`);
  }
};

// const server = new http.Server(micro(service));

// server.listen(3000);
