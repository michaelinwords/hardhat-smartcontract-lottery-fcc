const { ethers } = require("hardhat")

const networkConfig = {
    // this is the goerli chain ID and the VRF Coordinator address, gotten from Chainlink documentation
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.utils.parseEther("0.01"),
        // got this from the chainlink docs on vrf config, goerli testnet
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "0",
        callbackGasLimit: "500000",
        interval: "30" // seconds,
    },
    31337: {
        name: "hardhat",
        // don't need a vrfcoordinatorv2 address, because we're deploying a mock if it's hardhat
        entranceFee: ethers.utils.parseEther("0.01"),
        // don't need gas lane either, for same reason - but will input one anyhow?
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "0", // needed to deploy
        callbackGasLimit: "500000", // needed to deploy
        interval: "30" // seconds,
    },
}
        
const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains
}