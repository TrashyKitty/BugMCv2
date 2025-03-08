const { randomUUID } = require("crypto");
const dispatcher = require("../commandManager");
const { server } = require("../server")
const generateChunkPacket = require("../utils/generateChunkPacket");
const blockDig = require("./blockDig");
const blockPlace = require("./blockPlace");
const { handlePlayerView, updatePlayerPositions, updatePlayerRotations } = require("./playerView");
const worldHandler = require("./worldHandler")
const mcData = require('minecraft-data')('1.16')
const fs = require('fs');
let clientStates = {};
let entityIdIndex = 150;
function sendBroadcastMessage(server, clients, message, sender) {
    if (mcData.supportFeature('signedChat')) {
        server.writeToClients(clients, 'player_chat', {
            plainMessage: message,
            signedChatContent: '',
            unsignedChatContent: JSON.stringify({ text: message }),
            type: 0,
            senderUuid: 'd3527a0b-bc03-45d5-a878-2aafdd8c8a43', // random
            senderName: JSON.stringify({ text: sender }),
            senderTeam: undefined,
            timestamp: Date.now(),
            salt: 0n,
            signature: mcData.supportFeature('useChatSessions') ? undefined : Buffer.alloc(0),
            previousMessages: [],
            filterType: 0,
            networkName: JSON.stringify({ text: sender })
        });
    } else {
        server.writeToClients(clients, 'chat', { message: JSON.stringify({ text: message }), position: 0, sender: sender || '0' });
    }
}

function broadcast(message, exclude, username) {
    sendBroadcastMessage(server, Object.values(server.clients).filter(client => client !== exclude), message);
}
function getEntityId() {
    entityIdIndex++;
    return entityIdIndex;
}
server.on('playerJoin', async (client) => {
    client.on('chat', data => {
        if(data.message == "/list") {
            sendBroadcastMessage(server, [client], `§eThere are §b${players.length} player(s) §eonline: §r${players.join('§7, §r')}`);
            return;
        }
        if(data.message.startsWith("/tp ")) {
            try {
                let args = data.message.split(' ').slice(1);
                let arg1 = parseInt(args[0]);
                let arg2 = parseInt(args[1]);
                let arg3 = parseInt(args[2]);
                client.write('position', {
                    x: arg1,
                    y: arg2,
                    z: arg3,
                    yaw: 0,
                    pitch: 0,
                    flags: 0x00
                });
            
            } catch {}
            return;
        }
        let adminUsernames = ["TrashyKitty","FruitKitty_"]
        broadcast((adminUsernames.includes(client.username) ? "§b[BugMC Admin] §r" : "§f") + "<" + client.username + "> " + data.message, null, client.username);
    })
    // client.on('packet', (...args)=>{
        // console.log(args)
    // })
    console.log(client.profile)
    client.id = getEntityId();
    let clientState = { "world": "world", playerSlots: [], currSlot: 0 };
    client.clientState = clientState;
    clientStates[client.id] = clientState;
    const addr = client.socket.remoteAddress
    console.log('Incoming connection', '(' + addr + ')')

    client.on('end', function () {
        console.log('Connection closed', '(' + addr + ')')
    })

    client.on('error', function (error) {
        console.log('Error:', error)
    })
    let loginPacket = mcData.loginPacket
    client.write('login', {
        ...loginPacket,
        entityId: client.id,
        isHardcore: false,
        gameMode: 1,
        previousGameMode: 1,
        worldName: 'minecraft:overworld',
        hashedSeed: [0, 0],
        maxPlayers: server.maxPlayers,
        viewDistance: 10,
        reducedDebugInfo: false,
        enableRespawnScreen: true,
        isDebug: false,
        isFlat: false
    })
    let initialPos = {
        x: 0,
        y: 50.62,
        z: 0,
        yaw: 0,
        pitch: 0,
        flags: 0x00
    };

    // Load client state
    let savedClientState = null;
    if (fs.existsSync(`players/${client.username}.json`)) {
        savedClientState = JSON.parse(fs.readFileSync(`players/${client.username}.json`).toString())
    }

    // Restore client state
    if (savedClientState) {
        initialPos.x = savedClientState.position.x;
        initialPos.y = savedClientState.position.y;
        initialPos.z = savedClientState.position.z;
        if (savedClientState.pitch) initialPos.pitch = savedClientState.pitch;
        if (savedClientState.yaw) initialPos.yaw = savedClientState.yaw;
        if (savedClientState.playerSlots) {
            let i = -1;
            for (const slot of savedClientState.playerSlots) {
                i++;
                if (slot) {
                    client.write('set_slot', {
                        windowId: 0,
                        slot: i,
                        item: slot
                    })
                }
            }
        }
        clientState = savedClientState;
    }
    clientState.position = { x: initialPos.x, y: initialPos.y, z: initialPos.z, onGround: false };
    client.clientState = clientState
    client.write('position', initialPos)
    async function reloadChunks() {
        client.write('map_chunk', await generateChunkPacket(0, 0, clientState.world))
        let chunks = await worldHandler.getChunksNearLoc({ x: 0, y: 50.62, z: 0 }, clientState.world);
        for (const chunk of chunks) {
            client.write('map_chunk', await generateChunkPacket(chunk.x, chunk.z, clientState.world))
        }
    }
    await reloadChunks();
    client.on('block_dig', async (packet) => {
        await blockDig(client, packet, clientState.world)
    })
    client.on('end', () => {
        server.writeToClients(Object.values(server.clients), 'entity_destroy', {
            entityIds: [client.id]
        })
        server.writeToClients(Object.values(server.clients), 'player_info', {
            action: 4,
            data: [{
                UUID: client.uuid
            }]
        })
    })
    client.on('block_place', async (packet) => {
        await blockPlace(client, packet)
    })
    let world = worldHandler.worlds.get(clientState.world);
    world.on('blockUpdate', async (packet) => {
        let chunkLoc = {
            x: Math.floor(packet.position.x / 16),
            z: Math.floor(packet.position.x / 16)
        }
        client.write('map_chunk', await generateChunkPacket(chunkLoc.x, chunkLoc.z, clientState.world))
    })
    setInterval(() => {
        client.write('player_info', {
            action: 0,
            data: [{
                UUID: "d77a81eb-f7b1-4325-b044-c6f153c97eb8",
                name: `In ${clientState.world}:`,
                gamemode: 1,
                ping: 0,
                properties: [],
                listed: true
            }]
        })
    }, 100)
    client.on('chat', async data => {
        if (data.message.startsWith('/goto ')) {
            let worldName = data.message.substring('/goto '.length);
            if (fs.existsSync(`worlds/${worldName}`)) {
                client.write('position', initialPos)
                clientState.world = worldName;
                await reloadChunks();
            }
            return;
        }
        if (data.message.startsWith('/')) {
            dispatcher.execute(data.message.substring(1), null)
        }
    })
    client.on('position', (packet) => {
        clientState.position = packet;
        client.clientState = clientState;
        for (const client2 of Object.values(server.clients)) {
            updatePlayerPositions(server, client2)
        }
    })
    client.on('look', (packet) => {
        clientState.pitch = packet.pitch;
        clientState.yaw = packet.yaw;
        client.clientState = clientState;
        for (const client2 of Object.values(server.clients)) {
            updatePlayerRotations(server, client2)
        }
    })
    client.on('held_item_slot', (packet) => {
        clientState.currSlot = packet.slotId + 36;
    })
    client.on('set_creative_slot', (packet) => {
        clientState.playerSlots[packet.slot] = packet.item;
    })
    let prevClientState = JSON.stringify(clientState);
    setInterval(() => {
        client.clientState = clientState;
        if (prevClientState != JSON.stringify(clientState)) {
            fs.writeFileSync(`players/${client.username}.json`, JSON.stringify(clientState))
            prevClientState = JSON.stringify(clientState);
        }
    }, 1);
    handlePlayerView(server, client);
})
module.exports.clientStates = clientStates;