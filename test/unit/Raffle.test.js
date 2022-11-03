const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const {developmentChains, networkConfig} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) 
? describe.skip 
: describe("Raffle Unit Tests", function () { 
    // ^ describe blocks don't realise/can't work with promises, so async is unnecessary
    let raffle, vrf_coordinator_v2_mock, raffle_entrance_fee, deployer, interval
    const chain_id = network.config.chainId

    beforeEach(async function () {
        // get the address of the deployer
        deployer = (await getNamedAccounts()).deployer
        // deploy everything
        await deployments.fixture(["all"])
        // set our raffle and vrf coordinator to the deployed contracts
        raffle = await ethers.getContract("Raffle", deployer)
        vrf_coordinator_v2_mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffle_entrance_fee = await raffle.get_entrance_fee()
        interval = await raffle.get_interval()
    })

    describe("constructor", function() {
        it("initialises the raffle correctly", async function () {
            // ideally, we make our tests have just 1 assert per it
            const raffle_state = await raffle.get_raffle_state()
            // need to use toString because raffle state will be of type BigNumber
            assert.equal(raffle_state.toString(), "0")
            assert.equal(interval.toString(), networkConfig[chain_id]["interval"])
        })
    })

    describe("enter_raffle", function() {
        it("reverts when you don't pay enough", async function () {
            await expect(raffle.enter_raffle()).to.be.revertedWith("Raffle__InsufficientETHValue")
        })
        it("records players when they enter", async function() {
            await raffle.enter_raffle({ value: raffle_entrance_fee})
            const player_from_contract = await raffle.get_player(0)
            // the player from the contract (the first player) should be the deployer
            assert.equal(player_from_contract, deployer)
        })
        it("emits an event on enter", async function() {
            await expect(raffle.enter_raffle({value: raffle_entrance_fee})).to.emit(raffle, "raffle_enter")
        })
        it("doesn't allow entrance when raffle is calculating", async function() {
            await raffle.enter_raffle({value: raffle_entrance_fee})
            // need to make checkUpkeep return true in order to change state to open; part of that is a time check
            // use hardhat network methods such as evm_increaseTime (increase blockchain time)
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            // mine one extra block
            await network.provider.send("evm_mine", [])
            // pretend to be a chainlink keeper
            await raffle.performUpkeep([])
            // raffle should now be in a calculating state
            await expect(raffle.enter_raffle({value: raffle_entrance_fee})).to.be.revertedWith("Raffle__StateNotOpen")
        })
    })

    describe("checkUpkeep", function() {
        it("returns false if people haven't sent any ETH", async function() {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            // callstatic: simulate calling a tx and see what it returns, without sending a real tx
            const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })
        it("returns false if raffle isn't open", async function() {
            await raffle.enter_raffle({value: raffle_entrance_fee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            // mine one extra block
            await network.provider.send("evm_mine", [])
            await raffle.performUpkeep([]) // can send either 0x or [] as a blank bytes object
            const raffle_state = await raffle.get_raffle_state()
            const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([])
            assert.equal(raffle_state.toString(), "1")
            assert.equal(upkeepNeeded, false)
        })
        it("returns false if enough time hasn't passed", async () => {
            await raffle.enter_raffle({ value: raffle_entrance_fee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enter_raffle({ value: raffle_entrance_fee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })

            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded)
        })
    })

    describe("performUpkeep", function() {
        it("can only run if checkUpkeep is true", async function () {
            await raffle.enter_raffle({value: raffle_entrance_fee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])

            const tx= await raffle.performUpkeep([])
            assert(tx)
        })
        it("reverts when checkUpkeep is false", async function () {
            // this error returns a number of parameters; we can add those in (with string interpolation), or just use the error's name
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })
        it("updates the raffle state, emits event, and calls the vrf coordinator", async function() {
            await raffle.enter_raffle({value: raffle_entrance_fee})
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])

            const tx_response = await raffle.performUpkeep([])
            const tx_receipt = await tx_response.wait(1)
            // the request ID is emitted in two different events - for a refactor, would be ideal to change this redundancy
            // we choose the second event that's emitted
            const request_id = tx_receipt.events[1].args.request_id
            const raffle_state = await raffle.get_raffle_state()
            assert(request_id.toNumber() > 0)
            assert(raffle_state.toString() == "1")
        })
    })

    describe("fulfillRandomWords", function() {
        beforeEach(async function() {
            // before doing any of the tests:
            // have someone enter the lottery
            await raffle.enter_raffle({value: raffle_entrance_fee})
            // and wait some time, mine a block
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
        })

        it("can only be called after performUpkeep", async function() {
            // 0 and 1 here are request ids; we're just trying different ones
            // ideally, would want to try many, many ids to show they all revert
            await expect(vrf_coordinator_v2_mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
            await expect(vrf_coordinator_v2_mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
        })
        // TO DO: continue video at 16:07:25
    })
})