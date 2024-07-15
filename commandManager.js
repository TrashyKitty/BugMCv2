const brigadier = require('brigadier-ts');
const worldHandler = require('./handlers/worldHandler');
let dispatcher = new brigadier.CommandDispatcher();
dispatcher.register(brigadier.literal("mkworld")
    .then(brigadier.argument("name", new brigadier.StringArgumentType("single_word"))
        .executes(c => {
            let name = c.get("name");
            worldHandler.createWorld(name)
        })
    )
)
module.exports = dispatcher;