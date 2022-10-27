// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

// IMPORTS
// make sure to yarn add --dev @chainlink/contracts
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// 
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol"; 

// ERROR CODES
error Raffle__InsufficientETHValue();
error Raffle_WinnerTransferFailed();

// is: inheritance
contract Raffle is VRFConsumerBaseV2 {

    // STATE VARIABLES (storage and otherwise)
    uint256 private immutable i_entrance_fee;
    // payable: if a player wins, we need to be able to pay their address
    address payable[] private s_players;
    // keep track of our vrf coordinator; private immutable since we only set it once
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    // "key hash", gotten from chainlink documentation; max gas price we are willing to pay for request in wei
    bytes32 private immutable i_gas_lane;
    // subscription ID this contract uses for funding requests
    uint64 private immutable i_subscription_id;
    // how much gas to use for the callback request, max computation our fulfillRandomWords can use
    uint32 private immutable i_callback_gas_limit;
    // how many confirmations the chainlink node should wait before responding
    uint16 private constant NUM_REQUEST_CONFIRMATIONS = 3;
    // how many random words we want
    uint32 private constant NUM_WORDS = 1;

    // LOTTERY VARIABLES
    address private s_recent_winner_addr;

    // EVENTS
    event raffle_enter(address indexed player);
    event raffle_winner_request(uint256 indexed request_id);
    event raffle_winner_picked(address indexed winner_addr);

    // need to make sure we pass the VRFConsumerBaseV2 a vrfCoordinator
    constructor(
        address n_vrf_coordinator, 
        uint256 n_entrance_fee, 
        bytes32 n_gas_lane,
        uint64 n_subscription_id,
        uint32 n_callback_gas_limit) 
        VRFConsumerBaseV2(n_vrf_coordinator) {
        i_entrance_fee = n_entrance_fee;
        // save the vrf coordinator locally so we can reference it
        i_vrfCoordinator = VRFCoordinatorV2Interface(n_vrf_coordinator);
        // this is the key hash
        i_gas_lane = n_gas_lane;
        //
        i_subscription_id = n_subscription_id;
        //
        i_callback_gas_limit = n_callback_gas_limit;
    }

    // GETTERS
    function get_entrance_fee() public view returns (uint256) {return i_entrance_fee;}
    function get_player(uint256 player_index) public view returns (address) {return s_players[player_index];}
    function get_recent_winner() public view returns(address) {return s_recent_winner_addr;}

    // enter the lottery (by paying some amount)
    // payable: to receive msg.value
    function enter_raffle() public payable {
        // if the amount the address is sending is too low (compared to our entrance fee)
        // could use require, but storing an error code (rather than a string) will be cheaper in gas
        if (msg.value < i_entrance_fee) {
            revert Raffle__InsufficientETHValue();
        }
        // keep track of who's entering the raffle
        s_players.push(payable(msg.sender)); 
        // emit an event since a dynamic object (our list of players) changed
        emit raffle_enter(msg.sender);

    }

    // pick a verifiably random winner (chainlink for randomness), will be auto-called by chainlink keepers network
    // external: a little cheaper than public
    function request_random_winner() external {
        // using our coordinator, request the random number
        // returns a uint256 request id defining who's requesting, etc
        uint256 request_id = i_vrfCoordinator.requestRandomWords(
            i_gas_lane, // can call this the gas lane or key hash
            i_subscription_id,
            NUM_REQUEST_CONFIRMATIONS,
            i_callback_gas_limit,
            NUM_WORDS
        );
        // emit an event saying a winner was requested
        emit raffle_winner_request(request_id);

        // once we get our random number, do something with it
    }
    // in an automated way, have winner selected every x amount of time (chainlink keepers)

    // "words" doesn't mean words; it can also be numbers
    // internal: 
    // override: this is a modification of an already-defined virtual function in VRFConsumerBaseV2.sol
    // when chainlink sends us our info back, we'll get an array of random words; 
    // in our case, will only have one random word (based on num constant at top of file)
    // requestId is partially commented out to tell the compiler we know the parameter is there but not used
    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override {
        // use modulo operator to fit the potential huge word into matching the size of our players array
        uint256 winner_index = randomWords[0] % s_players.length;
        address payable recent_winner_addr = s_players[winner_index];
        s_recent_winner_addr = recent_winner_addr;
        // send the winner the money in the contract
        (bool success, ) = recent_winner_addr.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle_WinnerTransferFailed();
        }
        // emit an event so we can keep track of (log) past winners
        emit raffle_winner_picked(recent_winner_addr);
    }
}