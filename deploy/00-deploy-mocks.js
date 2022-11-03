const {developmentChains} = require("../helper-hardhat-config")

// this is the base fee that is charged every time we request a random number from chainlink
const BASE_FEE = ethers.utils.parseEther("0.25") // this is 0.25 LINK, from the chainlink docs
// this is a calculated value based on the gas price of the chain; basically, the link per gas,
// which is used to offset the price chainlink nodes pay to give us randomness or do external computation
const GAS_PRICE_LINK = 1e9 

module.exports = async function({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    // const chainId = network.config.chainId
    const args = [BASE_FEE, GAS_PRICE_LINK]

    if(developmentChains.includes(network.name)) {
        log("DEPLOY-MOCKS: local network detected, so deploying mocks")
        // deploy our mock VRF Coordinator
        await deploy("VRFCoordinatorV2Mock", {
            // contract: "VRFCoordinatorV2", // why this line?
            from: deployer,
            log: true,
            // the VRFCoordinatorV2Mock requires two parameters in the constructor: base fee and gas price link
            args: args,
        })
        log("DEPLOY-MOCKS: mocks deployed successfully!")
        log("--------------------------------------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"]