const Rps2 = artifacts.require("Rps2");
const Rps2Abi = require('../artifacts/contracts/Rps2.sol/Rps2.json');
const Rps2MockAbi = require('../artifacts/contracts/Mock/Rps2Mock.sol/Rps2Mock.json');
const VRFCoordinatorV2Mock = require('../artifacts/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol/VRFCoordinatorV2Mock.json');
const { use, expect } = require("chai");
const { waffle, ethers } = require('hardhat');
const { ContractFactory, utils } = require('ethers');
const { MockProvider } = require('@ethereum-waffle/provider');
const { waffleChai } = require('@ethereum-waffle/chai');
const { deployMockContract } = require('@ethereum-waffle/mock-contract');
//const { deployMockContract, provider } = waffle;

use(waffleChai);

function getEventArgs(transaction, evt) {
    let event = transaction.logs.filter(({ event }) => event === evt)[0];
    if(!event) throw `Remember to call ${evt} event!`;
    return event.args;
}

contract('Rps2', function(accounts) {
    async function setup() {
        const [sender, receiver] = new MockProvider().getWallets();
        const mockRps2 = await deployMockContract(sender, Rps2Abi.abi);
        const mockVRFCoordinatorV2Mock = await deployMockContract(sender, VRFCoordinatorV2Mock.abi, 0, 0, {from: sender});
        const contractFactory = new ContractFactory(Rps2Abi.abi, Rps2Abi.bytecode, sender);
        const rps2MockFactory = new ContractFactory(Rps2MockAbi.abi, Rps2MockAbi.bytecode, sender);
        const subscriptionId = 1;
        const vrfCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
        const hardhatVRFCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);

        await mockVRFCoordinatorV2Mock.mock.consumerIsAdded.returns(true);
        
        // await mockVRFCoordinatorV2Mock.createSubscription();

        // // add consumer
        // await (
        //     await mockVRFCoordinatorV2Mock.addConsumer(
        //         subscriptionId,
        //         contract.address
        //     )
        // ).wait();

        // // fund the VRF subscription
        // await (
        //     await mockVRFCoordinatorV2Mock.fundSubscription(
        //         subscriptionId,
        //         ethers.utils.parseEther("1000")
        //     )
        // ).wait();


        const contract = await contractFactory.deploy(
            subscriptionId,
            //hardhatVRFCoordinatorV2Mock.address,
            mockVRFCoordinatorV2Mock.address,
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
            { value: ethers.utils.parseEther("0.1") }
        );
        // const rps2Mock = await ethers.getContractFactory("Rps2Mock");
        // const rps2MockContract = await ethers.deployContract(
        //     "Rps2Mock",
        //     [subscriptionId,
        //     mockVRFCoordinatorV2Mock.address,
        //     "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"],
        //     { value: ethers.utils.parseEther("0.1") }
        // )
        const rps2MockContract = await rps2MockFactory.deploy(
            subscriptionId,
            mockVRFCoordinatorV2Mock.address,
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
            { value: ethers.utils.parseEther("0.1") }
        )

        return {sender, receiver, hardhatVRFCoordinatorV2Mock, contract, mockVRFCoordinatorV2Mock, mockRps2, rps2MockContract};
    }

    describe("playBet", function() {
        it("should let player bet a move", async function() { 
            const {contract, mockVRFCoordinatorV2Mock}  = await setup();
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            const bet = ethers.utils.parseEther("0.01");
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            let transaction = await contract.playBet(encryptedMove, { value: bet });
            const betInGame = await contract.bet();
            expect(ethers.utils.formatUnits(betInGame.toString())).to.be.equal("0.01", `Bet in game should be equal to value sent`);
        });

        // it("should let bet a move", async function() {  
        //     // const contract = await Rps2.new(
        //     //     2963,
        //     //     "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        //     //     "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        //     //     { value: ethers.utils.parseEther("0.1") }
        //     // );
        //     const rps2 = await ethers.getContractFactory("Rps2");
        //     const rps = await rps2.attach('0x2dEA0668C4159ad35c050AD55803d2fc12069322');
        //     const bet = ethers.utils.parseEther("0.01");
        //     const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
        //     let transaction = await rps.playBet(encryptedMove, { value: bet });
        //     //const hostCommitedMoveEvent = getEventArgs(transaction, 'hostCommitedMove');
        //     const betInGame = await rps.bet();
        //     assert.equal('0.01', ethers.utils.formatUnits(betInGame.toString(), "ether"), `Bet in game should be equal to value sent`);
        //     //assert.isAbove( hostCommitedMoveEvent.moveHost, 0, `hostCommitedMove Event should include move greater than 0`);
        // });
        
        it("should fail to create a game when no bet is placed", async function() {
            const contract = await Rps2.new(
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

    describe("reveal", function() {
        it("should not be able reveal a move when host not yet committed move", async function() {  
            const {contract, mockRps2, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await contract.playBet(encryptedMove, { value: bet });
            const clearMove = "1-pass";
            await contract.reveal(clearMove);
            movePlayer = await contract.movePlayer();
            moveHost = await contract.moveHost();
            expect(moveHost).to.be.equal(0, `Host should not committed move`);
            expect(movePlayer).to.be.equal(0, `User should not be able to reveal move`);
        });

        it("should be able reveal a move with correct move and password (Draw Case)", async function() {  
            const {sender, rps2MockContract, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await rps2MockContract.setRandomWordsNum(3);
            const num = await rps2MockContract.randomWordsNum()
            await rps2MockContract.playBet(encryptedMove, { value: bet });
            const clearMove = "1-pass";
            moveHost = await rps2MockContract.moveHost();
            expect(moveHost).to.be.equal(num % 3 + 1, `Host should committed move`);
            await expect(await rps2MockContract.reveal(clearMove)).to.emit(
                rps2MockContract,
                "Draw"
            ).withArgs(sender.address, 1, moveHost, bet);
        });

        it("should be able reveal a move with correct move and password (Lost Case)", async function() {  
            const {sender, rps2MockContract, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await rps2MockContract.setRandomWordsNum(4);
            const num = await rps2MockContract.randomWordsNum()
            await rps2MockContract.playBet(encryptedMove, { value: bet });
            const clearMove = "1-pass";
            moveHost = await rps2MockContract.moveHost();
            expect(moveHost).to.be.equal(num % 3 + 1, `Host should committed move`);
            await expect(await rps2MockContract.reveal(clearMove)).to.emit(
                rps2MockContract,
                "Lost"
            ).withArgs(sender.address, 1, moveHost, bet);
        });

        it("should be able reveal a move with correct move and password (Won Case)", async function() {  
            const {sender, rps2MockContract, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await rps2MockContract.setRandomWordsNum(5);
            const num = await rps2MockContract.randomWordsNum()
            await rps2MockContract.playBet(encryptedMove, { value: bet });
            const clearMove = "1-pass";
            moveHost = await rps2MockContract.moveHost();
            expect(moveHost).to.be.equal(num % 3 + 1, `Host should committed move`);
            await expect(await rps2MockContract.reveal(clearMove)).to.emit(
                rps2MockContract,
                "Won"
            ).withArgs(sender.address, 1, moveHost, bet);
        });

        it("should not be able reveal a move with wrong move", async function() {  
            const {sender, rps2MockContract, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await rps2MockContract.setRandomWordsNum(5);
            const num = await rps2MockContract.randomWordsNum()
            await rps2MockContract.playBet(encryptedMove, { value: bet });
            const clearMove = "2-pass";
            moveHost = await rps2MockContract.moveHost();
            expect(moveHost).to.be.equal(num % 3 + 1, `Host should committed move`);
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Won"
            )
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Lost"
            )
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Draw"
            )
        });

        it("should not be able reveal a move with wrong password", async function() {  
            const {sender, rps2MockContract, mockVRFCoordinatorV2Mock}  = await setup();
            const bet = ethers.utils.parseEther("0.01");
            const encryptedMove = utils.soliditySha256(['string'], ["1-pass"]);
            await mockVRFCoordinatorV2Mock.mock.requestRandomWords.returns(1);
            await rps2MockContract.setRandomWordsNum(5);
            const num = await rps2MockContract.randomWordsNum()
            await rps2MockContract.playBet(encryptedMove, { value: bet });
            const clearMove = "1-wrongpass";
            moveHost = await rps2MockContract.moveHost();
            expect(moveHost).to.be.equal(num % 3 + 1, `Host should committed move`);
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Won"
            )
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Lost"
            )
            await expect(await rps2MockContract.reveal(clearMove)).not.to.emit(
                rps2MockContract,
                "Draw"
            )
        });
    });   

    describe("Coordinator", function() {
        it("Coordinator should successfully receive the request", async function() { 
            const {sender, contract, hardhatVRFCoordinatorV2Mock}  = await setup();
            const subscriptionId = 1;

            await expect(await hardhatVRFCoordinatorV2Mock.createSubscription()).to.emit(
                hardhatVRFCoordinatorV2Mock,
                "SubscriptionCreated"
            ).withArgs(subscriptionId, accounts[0])

            // add consumer
            await hardhatVRFCoordinatorV2Mock.addConsumer(
                subscriptionId,
                contract.address
            )

             // add consumer
            await hardhatVRFCoordinatorV2Mock.addConsumer(
                subscriptionId,
                accounts[0]
            )

            // fund the VRF subscription
            await hardhatVRFCoordinatorV2Mock.fundSubscription(
                subscriptionId,
                ethers.utils.parseEther("1000")
            )
            const subscription = await hardhatVRFCoordinatorV2Mock.getSubscription(subscriptionId);
            expect(subscription.consumers).to.be.include(contract.address)
            const consumerIsAdded = await hardhatVRFCoordinatorV2Mock.consumerIsAdded(subscriptionId, contract.address)
            expect(consumerIsAdded).to.be.equal(true, `Consumer should be added`)
            const rid = await hardhatVRFCoordinatorV2Mock.requestRandomWords(
                "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
                subscriptionId,
                0,
                0,
                1
            );
        });
    });
});