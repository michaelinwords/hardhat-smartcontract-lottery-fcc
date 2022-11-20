// this is a test we will deploy to a test network, not using a mock for anything
const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name) 
? describe.skip 
: describe("Raffle Staging Tests", function () {
    let raffle, raffle_entrance_fee, deployer

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffle_entrance_fee = await raffle.get_entrance_fee()
    })

    describe("fulfillRandomWords", function () {
        it("works with live chainlink keepers and chainlink vrf; we get a random winner", async function () {
            const starting_timestamp = await raffle.getLatestTimeStamp()
            const accounts = await ethers.getSigners()

            // set up the listener
            await new Promise(async (resolve, reject) => {
                // once the raffle winner picked event is triggered,
                raffle.once("raffle_winner_picked", async () => {
                    console.log("STAGING TEST - raffle winner picked event fired")
                    try {
                        // add asserts here
                        const recent_winner = await raffle.get_recent_winner()
                        const raffle_state = await raffle.get_raffle_state()
                        const winner_ending_balance = await accounts[0].getBalance()
                        const ending_timestamp = await raffle.getLatestTimeStamp()

                        // this should revert because there are no players/the list is empty, after being reset
                        await expect(raffle.getPlayer(0)).to.be.reverted
                        assert.equal(recent_winner.toString(), accounts[0].address)
                        // check that the raffle state is open
                        assert.equal(raffle_state, 0)
                        // check that the winner's balance increased as expected
                        // (should just be prev balance + entrance fee, since only one person entered)
                        assert.equal(
                            winner_ending_balance.toString(), 
                            winner_starting_balance.add(raffle_entrance_fee).toString())
                        // check that time has passed
                        assert(ending_timestamp > starting_timestamp)
                        resolve()
                    }
                    catch (error) {
                        console.log(error)
                        reject(e)
                    }
                })
            })
            
            // enter the raffle
            await raffle.enter_raffle({value: raffle_entrance_fee})
            const winner_starting_balance = await accounts[0].getBalance()

            // this code won't complete/run until the listener has finished listening

            
            
        })
    })
})