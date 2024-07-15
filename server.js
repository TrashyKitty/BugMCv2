const { createServer } = require('minecraft-protocol');
const yaml = require('yaml');
const fs = require('fs');
let config = yaml.parse(fs.readFileSync('config.yaml').toString());

if (fs.existsSync('icon.png')) config.server.favicon = fs.readFileSync('icon.png').toString('base64');
config.server.beforePing = response => {
    response.version.name = "";
    if (config.server.favicon) {
        response.favicon = `data:image/png;base64,${config.server.favicon}`;
    }
}
const server = createServer(config.server)
server.on('listening', function () {
    console.log('Server listening on port', server.socketServer.address().port)
})
module.exports.server = server;
require('./handlers/playerJoin');
