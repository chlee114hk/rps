const { hre, ethers } = require("hardhat");
const { Signer } = require("ethers");
const { hexValue } = require("ethers/lib/utils");

const main = async () => {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    const [deployer] = await ethers.getSigners();
    console.log(`Address deploying the contract --> ${deployer.address}`);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

    const addresses = await ethers.provider.listAccounts();

    const rps1 = await ethers.getContractFactory("Rps1");
    const rps1Contract = await rps1.deploy(
        2963,
        "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
    );
    await rps1Contract.deployed();
    console.log(`Rps1 Contract address --> ${rps1Contract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});