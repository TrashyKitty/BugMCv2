const worldHandler = require("./worldHandler")
const Vec3 = require('vec3');
const registry = require('prismarine-registry')('1.16'); // Adjust version accordingly
const Block = require('prismarine-block')(registry); // Adjust version accordingly

module.exports = async function(client, packet, worldName = "world") {
    let pos = new Vec3(packet.location.x, packet.location.y, packet.location.z)
    let world = worldHandler.worlds.get(worldName);
    await world.setBlock(pos, Block.fromString('minecraft:air'));
}