const worldHandler = require("../handlers/worldHandler")

module.exports = async function(chunkX, chunkZ, world = "world") {
    let worldData = worldHandler.worlds.get(world);
    let chunk = await worldData.getColumn(chunkX, chunkZ);
    return {
        x: chunkX,
        z: chunkZ,
        groundUp: true,
        biomes: chunk.dumpBiomes !== undefined ? chunk.dumpBiomes() : undefined,
        heightmaps: {
            type: 'compound',
            name: '',
            value: {} // Client will accept fake heightmap
        },
        bitMap: chunk.getMask(),
        chunkData: chunk.dump(),
        blockEntities: []
    }
}