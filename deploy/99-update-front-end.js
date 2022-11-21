const {ethers, network} = require("hardhat")
var fs = require("fs")

const FRONT_END_ADDRESS_REL_PATH = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_REL_PATH = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"


module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("** Updating front end")
        updateContractAddresses()
        updateABI()
    }
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString()
    // grab the front end addresses json file
    const contractAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESS_REL_PATH, "utf8"))
    if (chainId in contractAddresses) {
        if(!contractAddresses[chainId].includes(raffle.address)) {
            contractAddresses[chainId].push(raffle.address)
        }
    } {
        contractAddresses[chainId] = [raffle.address]
    }
    // actually write the file
    fs.writeFileSync(FRONT_END_ADDRESS_REL_PATH, JSON.stringify(contractAddresses))
}

async function updateABI() {
    const raffle = await ethers.getContract("Raffle")
    // grab the abi json file and pass it to the file write
    fs.writeFileSync(FRONT_END_ABI_REL_PATH, raffle.interface.format(ethers.utils.FormatTypes.json))
}

module.exports.tags = ["all", "frontend"]