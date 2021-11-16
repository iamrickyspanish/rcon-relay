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

const sendLegacy = (host, port, message, expectResponse = false) => {
  const connection = new Connection(connectionPrototcols.UDP);
  return new Promise((resolve, reject) => {
    connection.once("connect", () => {
      console.log("connected");
      const data = Buffer.concat([
        Buffer.from(headerLegacy),
        Buffer.from(message),
        Buffer.from("\n")
      ]);
      console.log("data", data);

      const timeout = setTimeout(() => reject("timeout"), 3000);

      const handleError = (err) => {
        clearTimeout(timeout);
        connection.removeListener("receive", handleReceive);
        reject(err);
      };

      const handleReceive = (res) => {
        clearTimeout(timeout);
        const result = receiveLegacy(res);
        connection.removeListener("error", handleError);
        resolve(result);
      };

      connection.once("receive", handleReceive);
      connection.once("error", handleError);

      connection.send(data);
    });
    connection.connect(port, host);
  });
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

const service = async (req, res) => {
  try {
    if (req.method !== "POST")
      throw micro.createError(400, "rcon-relay test no post");
    try {
      const { type, payload } = await micro.json(req);
      if (!Object.values(types).includes(type))
        throw micro.createError(400, "invalid data");
      if (type === types.LEGACY) {
        return micro.send(
          res,
          200,
          await sendLegacy(payload.host, payload.port, payload.message)
        );
      } else throw micro.createError(403, "not implemented yet");
    } catch (e) {
      throw micro.createError(400, `${e}`);
    }
    // return micro.send(res, 200, "rcon-relay test post");
  } catch (e) {
    throw e.statusCode ? e : micro.createError(500, `${e}`);
  }
};

// const server = new http.Server(micro(service));

// server.listen(3000);

module.exports = service;
