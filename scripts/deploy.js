const hre = require("hardhat");
const { Signer } = require("ethers");
const { hexValue } = require("ethers/lib/utils");
const { networks: networkConfig } = require('../hardhat.config.js');

const main = async () => {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const networkName =  hre.network.name;
    const config = networkConfig[networkName];
    let chainlink = config.chainlink;

    chainlink = {
        keyHash: ethers.constants.HashZero,
        vrfCoordinatorContract: ethers.constants.AddressZero,
        ...chainlink
    }

    console.log("chainlink config:", chainlink)
    /**
     * Validate Chainlink Fields
     */
    if (!chainlink) throw new Error('Missing chainlink');
    if (chainlink.subscriptionId === 0)
        throw new Error('Missing chainlink subscriptionId');
    if (!chainlink.keyHash) throw new Error('Missing chainlink keyHash');
    if (!chainlink.vrfCoordinatorContract)
        throw new Error('Missing chainlink vrfCoordinatorContract');

    const [deployer] = await ethers.getSigners();
    console.log(`Address deploying the contract --> ${deployer.address}`);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    const addresses = await ethers.provider.listAccounts();

    const rps1 = await ethers.getContractFactory("Rps1");
    const rps1Contract = await rps1.deploy(
        chainlink.subscriptionId,
        chainlink.vrfCoordinatorContract,
        chainlink.keyHash
    );
    await rps1Contract.deployed();
    console.log(`Rps1 Contract address --> ${rps1Contract.address}`);

    const rps2 = await ethers.getContractFactory("Rps2");
    const rps2Contract = await rps2.deploy(
        chainlink.subscriptionId,
        chainlink.vrfCoordinatorContract,
        chainlink.keyHash
    );
    await rps2Contract.deployed();
    console.log(`Rps2 Contract address --> ${rps2Contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});