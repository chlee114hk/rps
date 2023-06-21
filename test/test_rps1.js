const Rps1 = artifacts.require("Rps1");
const { ethers } = require("hardhat");
const utils = require("ethers/lib/utils");

function getEventArgs(transaction, evt) {
    let event = transaction.logs.filter(({ event }) => event === evt)[0];
    if(!event) throw `Remember to call ${evt} event!`;
    return event.args;
}

contract('Rps1', function(accounts) {
    describe("playBet", function() {
        it("should let bet a move", async function() {  
            // const contract = await Rps1.new(
            //     2963,
            //     "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
            //     "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
            //     { value: ethers.utils.parseEther("0.1") }
            // );
            const rps1 = await ethers.getContractFactory("Rps1");
            const rps = await rps1.attach('0x2dEA0668C4159ad35c050AD55803d2fc12069322');
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            let transaction = await rps.playBet(encryptedMove, { value: bet });
            //const hostCommitedMoveEvent = getEventArgs(transaction, 'hostCommitedMove');
            const betInGame = await rps.bet();
            assert.equal('0.01', ethers.utils.formatUnits(betInGame.toString(), "ether"), `Bet in game should be equal to value sent`);
            //assert.isAbove( hostCommitedMoveEvent.moveHost, 0, `hostCommitedMove Event should include move greater than 0`);
        });
        
        it("should fail to create a game when no bet is placed", async function() {
            const contract = await Rps1.new(
                2963,
                "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
                "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
            );
            try {
                const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
                let transaction = await contract.playBet(encryptedMove);
                assert.fail;
            }
            catch (err) {
                assert.include(err.message, "revert", "The error message should contain 'revert'");
            }
        });
    });   
});