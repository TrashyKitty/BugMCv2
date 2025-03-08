module.exports.handlePlayerView = async function(server, client) {
    let playerInfoPacket = {
        action: 0,
        data: [{
            UUID: client.uuid,
            name: client.username,
            gamemode: 1,
            ping: 0,
            properties: client.profile ? client.profile.properties : [],
            listed: true
        }] 
    };
    let metadataPacket = {
        entityId: client.id,
        metadata: [
            {
                key: 16,
                type: 0,
                value: 0x7F
            }
        ]
    }
    client.write('player_info', playerInfoPacket);
    // client.write('named_entity_spawn', {
    //     entityId: client.id,
    //     playerUUID: client.uuid,
    //     x: client.clientState.position.x,
    //     y: client.clientState.position.y,
    //     z: client.clientState.position.z,
    //     yaw: 0,
    //     pitch: 0,
    //     currentItem: 0
    // })
    client.write('entity_metadata', metadataPacket)
    for(const client2 of Object.values(server.clients)) {
        if(client2.ended) continue;
        if(client2.id !== client.id) {
            client2.write('player_info', playerInfoPacket);
            client2.write('named_entity_spawn', {
                entityId: client.id,
                playerUUID: client.uuid,
                x: client.clientState.position.x,
                y: client.clientState.position.y,
                z: client.clientState.position.z,
                yaw: 0,
                pitch: 0,
                currentItem: 0
            })
            client.write('player_info', {
                action: 0,
                data: [{
                    UUID: client2.uuid,
                    name: client2.username,
                    gamemode: 1,
                    ping: 0,
                    properties: client2.profile ? client2.profile.properties : [],
                    listed: true
                }]
            })
            client.write('named_entity_spawn', {
                entityId: client2.id,
                playerUUID: client2.uuid,
                x: client2.clientState.position.x,
                y: client2.clientState.position.y,
                z: client2.clientState.position.z,
                yaw: 0,
                pitch: 0,
                currentItem: 0
            })

        }
    }
}
function conv (f) {
    let b = Math.floor((f % 360) * 256 / 360)
    if (b < -128) b += 256
    else if (b > 127) b -= 256
    return b
}
module.exports.updatePlayerRotations = async function(server, client) {
    for(const client2 of Object.values(server.clients)) {
        if(client2.ended) continue;
        if(client2.id !== client.id && client2.clientState && client2.clientState) {
            client.write('entity_look', {
                entityId: client2.id,
                yaw: conv(client2.clientState.yaw),
                pitch: conv(client2.clientState.pitch),
                onGround: client2.clientState.position.onGround
            })
            client.write('entity_head_rotation', {
                entityId: client2.id,
                headYaw: conv(client2.clientState.yaw),
            })
        }
    }
}
module.exports.updatePlayerPositions = async function(server, client) {
    for(const client2 of Object.values(server.clients)) {
        if(client2.ended) continue;
        if(client2.id !== client.id && client2.clientState && client2.clientState) {
            client.write('entity_teleport', {
                entityId: client2.id,
                x: client2.clientState.position.x,
                y: client2.clientState.position.y,
                z: client2.clientState.position.z,
                yaw: conv(client2.clientState.yaw),
                pitch: conv(client2.clientState.pitch),
                onGround: client2.clientState.position.onGround
            })
        }
    }
}
