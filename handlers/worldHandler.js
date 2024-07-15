const Chunk = require('prismarine-chunk')('1.16');
const World = require('prismarine-world')('1.16');
const Anvil = require('prismarine-provider-anvil').Anvil('1.16')
const registry = require('prismarine-registry')('1.16'); // Adjust version accordingly
const Block = require('prismarine-block')(registry); // Adjust version accordingly
const nbt = require('prismarine-nbt');
const fs = require('fs');
const { generateOverworldChunkFactory } = require('../generators/overworld');
class WorldManager {
    constructor() {
        this.worlds = new Map();
        for(const world of fs.readdirSync('worlds')) {
            let config = nbt.parseUncompressed(fs.readFileSync(`worlds/${world}/config.nbt`));
            let seed = config.value.LevelSeed.value
            this.worlds.set(world, new World(generateOverworldChunkFactory(seed), new Anvil(`worlds/${world}/regions`)))
        }
        this.createWorld("world");
    }
    createWorld(name) {
        if(this.worlds.has(name)) return;
        fs.mkdirSync(`worlds/${name}`)
        fs.mkdirSync(`worlds/${name}/regions`);
        const tag = nbt.comp({
            LevelSeed: nbt.int(Math.floor(Math.random() * 65535))
        })
        let buffer = nbt.writeUncompressed(tag);
        fs.writeFileSync(`worlds/${name}/config.nbt`, buffer);
    }
    async getChunksNearLoc({x,y,z}, worldName = "world") {
        let world = this.worlds.get(worldName)
        let chunkX = Math.floor(x / 16);
        let chunkZ = Math.floor(z / 16);
        let chunkCoords = [];
        for(let x = 0;x < 16;x++) {
            for(let z = 0;z < 16;z++) {
                chunkCoords.push({x:chunkX - (x - 7),z:chunkZ - (z - 7)});
            }
        }
        let chunks = [];
        for(const coord of chunkCoords) {
            chunks.push({x:coord.x,z:coord.z,chunk: await world.getColumn(coord.x, coord.z)})
        }
        return chunks;
    }
}

module.exports = new WorldManager();