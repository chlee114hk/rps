require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-truffle5");

const dotenv = require("dotenv");
dotenv.config();

const privateKey = process.env.PRIVATE_KEY;
const infura_id = process.env.INFURA_ID;
const etherscanKey = process.env.ETHERSCAN_API_KEY;
const mnemonic = process.env.KEY_MNEMONIC;

const { HardhatUserConfig, task } = require("hardhat/config");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {
    networks: {      
      rinkeby: {
        url: `https://rinkeby.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {},        
      },
      goerli: {
        url: `https://goerli.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {},        
      },
      sepolia: {
        url: `https://sepolia.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {}, 
      }
    },
    solidity: {
      version: "0.8.7",
      //version: "0.8.4",
      contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
      },
      paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },    
    gasReporter: {
      enabled: process.env.REPORT_GAS !== undefined,
      currency: "USD",
    },
    etherscan: {
      apiKey: etherscanKey,
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        strict: false
    },
    abiExporter: [
        {
          path: './frontend/abi',
          format: "json",
          pretty: false,
        },
    ]
  };