const generateChunkPacket = require("../utils/generateChunkPacket");
const worldHandler = require("./worldHandler")
const Vec3 = require('vec3');
const registry = require('prismarine-registry')('1.16')
const itemPlaceHandlers = new Map();
const blocks = registry.blocks;
const placeItem = (data) => {
    const item = data.item
    const handler = itemPlaceHandlers.get(item.type)
    if (handler) return handler(data)
    const block = registry.blocksByName[item.name]
    if (!block) return {}
    if (block.states?.length > 0) return { id: block.id, data: setBlockDataProperties(block.defaultState - block.minStateId, block.states, data.properties) }
    return { id: block.id, data: item.metadata ?? 0 }
}
const blockInteractHandler = new Map()
const interactWithBlock = async (data) => {
    const handler = blockInteractHandler.get(data.block.type)
    return handler ? handler(data) : false
}
const onBlockInteraction = (name, handler) => {
    const block = registry.blocksByName[name]
    if (blockInteractHandler.has(block.id)) {
    }
    blockInteractHandler.set(block.id, handler)
}
const parseValue = (value, state) => {
    if (state.type === 'enum') {
      return state.values.indexOf(value)
    }
    if (state.type === 'bool') {
      return value ? 0 : 1
    }
    return parseInt(value, 10)
  }
const setBlockDataProperties = (baseData, states, properties) => {
    let data = 0
    let offset = 1
    for (let i = states.length - 1; i >= 0; i--) {
      const prop = states[i]
      let value = baseData % prop.num_values
      baseData = Math.floor(baseData / prop.num_values)
      if (properties[prop.name]) {
        value = parseValue(properties[prop.name], prop)
      }
      data += offset * value
      offset *= prop.num_values
    }
    return data
}
module.exports = async(client, {direction,location,cursorY} = {}) => {
    const referencePosition = new Vec3(location.x, location.y, location.z)
    let world = worldHandler.worlds.get(client.clientState.world);
    const block = await world.getBlock(referencePosition)
    block.position = referencePosition
    block.direction = direction
    const {currSlot, playerSlots} = client.clientState;

    let heldItem2 = playerSlots[currSlot];
    if(!heldItem2) return;
    let heldItem = {
        type: registry.items[heldItem2.itemId].id,
        name: registry.items[heldItem2.itemId].name
    }
    if(!heldItem || direction === -1 || heldItem.type === -1) return console.log("Return1");
    const directionVector = block.boundingBox === 'empty' ? new Vec3(0, 0, 0) : directionToVector[direction]
    const placedPosition = referencePosition.plus(directionVector)
    if (placedPosition.equals(new Vec3(client.clientState.position.x, client.clientState.position.y, client.clientState.position.z).floored())) return
    const dx = client.clientState.position.x - (placedPosition.x + 0.5);
    const dz = client.clientState.position.z - (placedPosition.z + 0.5);
    const angle = Math.atan2(dx, -dz) * 180 / Math.PI + 180;
    if (registry.supportFeature('blockPlaceHasIntCursor')) cursorY /= 16
    let half = cursorY > 0.5 ? 'top' : 'bottom'
    if (direction === 0) half = 'top'
    else if (direction === 1) half = 'bottom'

    const { id, data } = await placeItem({
        item: heldItem,
        angle,
        direction,
        referencePosition,
        placedPosition,
        directionVector,
        properties: {
          rotation: Math.floor(angle / 22.5 + 0.5) & 0xF,
          axis: directionToAxis[direction],
          facing: directionToFacing[Math.floor(angle / 90 + 0.5) & 0x3],
          half,
          waterlogged: (await world.getBlock(placedPosition)).type === registry.blocksByName.water.id
        }
    })
    if (!registry.blocks[id]) return console.log("Return2");
    // const sound = 'dig.' + (materialToSound[blocks[id].material] || 'stone')
    // playSound(sound, player.world, placedPosition.offset(0.5, 0.5, 0.5), {
    //   pitch: 0.8
    // })
    const stateId = registry.supportFeature('theFlattening') ? (blocks[id].minStateId + data) : (id << 4 | data)
    await world.setBlockStateId(placedPosition, stateId);
    let chunkLoc = {
        x: Math.floor(placedPosition.x / 16),
        z: Math.floor(placedPosition.z / 16),
    }
    client.write('map_chunk', await generateChunkPacket(chunkLoc.x, chunkLoc.z, client.clientState.world))
}

const directionToVector = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)]
const directionToAxis = ['y', 'y', 'z', 'z', 'x', 'x']
const directionToFacing = ['north', 'east', 'south', 'west']