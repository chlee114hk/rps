require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('solidity-coverage')
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
      hardhat: {
        initialBaseFeePerGas: 0,
        chainlink: {
          keyHash: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
          minimumRequestConfirmations: 3,
        },
      },  
      localhost: {
        url: 'http://127.0.0.1:8545',
        chainlink: {
          keyHash: '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc',
          minimumRequestConfirmations: 3,
        },
      },
      mainnet: {
        url: `https://mainnet.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {},        
        chainlink: {
          subscriptionId: 2963,
          vrfCoordinatorContract: "	0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
          keyHash: "	0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
          linkTokenContract: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          minimumRequestConfirmations: 3,
        }
      },
      goerli: {
        url: `https://goerli.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {},
        chainlink: {
          subscriptionId: 2963,
          vrfCoordinatorContract: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
          keyHash: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
          linkTokenContract: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
          minimumRequestConfirmations: 3,
        }        
      },
      sepolia: {
        url: `https://sepolia.infura.io/v3/${infura_id}`,
        accounts:
          // process.env.PRIVATE_KEY !== undefined ? [`0x${privateKey}`] : [],
          process.env.KEY_MNEMONIC !== undefined ? { mnemonic: mnemonic} : {},
        chainlink: {
          subscriptionId: 2963,
          vrfCoordinatorContract: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
          keyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
          linkTokenContract: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
          minimumRequestConfirmations: 3,
        }
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