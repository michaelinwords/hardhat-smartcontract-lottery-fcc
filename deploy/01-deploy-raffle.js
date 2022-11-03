const { network, ethers } = require("hardhat")
// using networkconfig to get right data for each chain
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const {verify} = require("../helper-hardhat-config")

const SUBSCRIPTION_FUND_AMT = ethers.utils.parseEther("30")

// will need to deploy some mocks (for the vrf coordinator)
module.exports = async function({getNamedAccounts, deployments}) {
    const {deploy, log} = deployments
    const {deployer} = await getNamedAccounts()
    const chain_id = network.config.chainId
    let vrf_coordinator_v2_addr, subscription_id

    if (developmentChains.includes(network.name)) {
        // get our deployed mock
        const vrf_coordinator_v2_mock = await ethers.getContract("VRFCoordinatorV2Mock")
        // set its address
        vrf_coordinator_v2_addr = vrf_coordinator_v2_mock.address
        // create the chainlink subscription
        const tx_response = await vrf_coordinator_v2_mock.createSubscription()
        const tx_receipt = await tx_response.wait(1)
        // the receipt actually has an emitted event (from VRFCoordinatorV2Mock.sol contract)
        subscription_id = tx_receipt.events[0].args.subId
        // fund the subscription
        // on a real network, would usually need the link token
        await vrf_coordinator_v2_mock.fundSubscription(subscription_id, SUBSCRIPTION_FUND_AMT)
    }
    else {
        vrf_coordinator_v2_addr = networkConfig[chain_id]["vrfCoordinatorV2"]
        subscription_id = networkConfig[chain_id]["subscriptionId"]
    }

    const entrance_fee = networkConfig[chain_id]["entranceFee"]
    const gas_lane = networkConfig[chain_id]["gasLane"]
    const callback_gas_limit = networkConfig[chain_id]["callbackGasLimit"]
    const interval = networkConfig[chain_id]["interval"]
    log(`DEPLOY-RAFFLE: chain ID is: ${chain_id}`)

    // these args are defined in the Raffle.sol contract's constructor; these are what's needed to instantiate a raffle contract
    const args = [vrf_coordinator_v2_addr, entrance_fee, gas_lane, subscription_id, callback_gas_limit, interval]
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // verification
    // if we're not on a development chain AND we have an etherscan API key
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("DEPLOY-RAFFLE: initiating contract verification ..")
        await verify(raffle.address, args)
        log("DEPLOY-RAFFLE: contract verified successfully!")
    }
    log("--------------------------------------------------------------------")

}

module.exports.tags = ["all", "raffle"]