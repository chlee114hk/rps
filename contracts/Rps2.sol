// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @author Vincent Lee
/// @title Rock Paper Scissors Game
contract Rps2 is VRFConsumerBaseV2, ConfirmedOwner, ReentrancyGuard {

    /// Valid moves the player can play
    enum Moves {None, Rock, Paper, Scissors}
    /// Possible outcomes of a game 
    enum Outcomes {None, Win, Lost, Draw}

    uint constant public MIN_BET = 1e16;               /// The minimum bet of player (1 finney)
    uint constant public REVEAL_TIMEOUT = 2 minutes;   /// Max delay of revelation phase
    
    /// The fomo pool size
    uint256 public fomoPool = 0;                       /// The balance of the fomo pool
    uint256 public fomoEndTime = 0;                    /// The fomo timer
    address public fomoWinner;                         /// The last bettor that turned on or extended the timer

    uint public bet;                                   /// Bet of the player
    uint private firstReveal;                          /// Moment of first reveal

    address payable player;                            /// Address of player

    bytes32 private encryptedMovePlayer;               /// Encrypted move of player - Hash of plain input (= "move-password")
    
    Moves public movePlayer;                          /// Clear move set only after host have committed his move
    Moves public moveHost;                             /// Host always commits move after player committed his move, but host can not know player's move before he committed his move because it is encrypted


    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }

    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */
    VRFCoordinatorV2Interface COORDINATOR;

    // ubscription ID.
    uint64 s_subscriptionId;

    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    bytes32 immutable keyHash;

    uint32 callbackGasLimit = 150000;

    uint16 requestConfirmations = 3;
    uint32 numWords = 1;                                // retrieve 1 random values in one request.
    
    uint public randomWordsNum;

    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    /**
     * Fomo Events
     */
    event FomoTimerStart(address indexed winner, uint256 endTime);
    event FomoTimerIncrease(address indexed winner, uint256 endTime);
    event NewFomoDeposit(address indexed sender, uint256 amount);
    event FomoPayment(address indexed winner, uint256 amount);

    /**
     * Events
     *
     * @param player - The address of player
     * @param playerMove - The hand of player
     * @param hostMove - The hand of host
     * @param bet - The amount of Ether used to bet
     */
    event Won(address indexed player, Moves playerMove, Moves hostMove, uint256 bet);
    event Draw(address indexed player, Moves playerMove, Moves hostMove, uint256 bet);
    event Lost(address indexed player, Moves playerMove, Moves hostMove, uint256 bet);
    event hostCommitedMove(Moves hostMove);

    // For SEPOLIA 
    // COORDINATOR: 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
    // keyHash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
    // see https://docs.chain.link/docs/vrf/v2/subscription/supported-networks/#configurations
    constructor (
        uint64 subscriptionId,
        address _coordomator,
        bytes32 _keyHash
    )
        payable
        VRFConsumerBaseV2(_coordomator)
        ConfirmedOwner(msg.sender)
    {
        COORDINATOR = VRFCoordinatorV2Interface(_coordomator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    receive() external payable {}

    modifier validBet() {
        require(msg.value >= MIN_BET, "Insufficient balaance to bet.");
        require(msg.value * 2 <= address(this).balance, "Bet exceeded balance of host.");
        _;
    }

    modifier notBetted() {
        if (firstReveal == 0 && block.timestamp <= firstReveal + REVEAL_TIMEOUT) {
            require(player == address(0x0), "A player is playing.");
            require(bet == 0x0, "Bet is placed already.");
            require(encryptedMovePlayer == 0x0);
        }
        _;
    }

    modifier isPlayer() {
        require(msg.sender == player, "You are you the player");
        _;
    }

    modifier commitPhaseEnded() {
        require(encryptedMovePlayer != 0x0 && moveHost != Moves.None, "Not both players committed their moves.");
        _;
    }

    modifier revealPhaseEnded() {
        require((movePlayer != Moves.None && moveHost != Moves.None) ||
                (firstReveal != 0 && block.timestamp > firstReveal + REVEAL_TIMEOUT));
        _;
    }

    /// Withdraw fund from contract by owner
    function withdraw(uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Balance too low");
        payable(msg.sender).transfer(amount);
    }

    /// Allow fomo winner to get fomo reward with starting a new game.
    function processFomo() public {
        require(msg.sender == fomoWinner);
         _processFomo();
    }

    /**
     * Process the fomo pool.
     * If the fomo timer is ended, the last player that either turned on or extended the timer wins
     * all amount in the fomo pool, and the fomo timer is then turned off.
     */
    function _processFomo() internal {
        if (fomoWinner == address(0)) return;
        if (fomoEndTime > block.timestamp) return;
        fomoEndTime = 0;
        address payable winner = payable(fomoWinner);
        fomoWinner = address(0);
        if (fomoPool == 0) return;
        uint256 fomoReward = fomoPool;
        fomoPool = 0;
        winner.transfer(fomoReward);
        emit FomoPayment(winner, fomoReward);
    }

    /**
     * Process new bet for fomo.
     * If the fomo timer is off, the timer starts and is set to end 1 hour later.
     * Otherwise extend the timer by 1 hour only when the bet amount is at least 10% of the fomo pool size.
     */
    function _processBid() internal {
        if (fomoWinner == address(0)) {
            fomoWinner = msg.sender;
            fomoEndTime = block.timestamp + (1 hours);
            emit FomoTimerStart(fomoWinner, fomoEndTime);
            return;
        }

        // no need to extend timer for bet less than 10% of fomo pool size
        if (msg.value < fomoPool / 10) return;

        fomoEndTime = fomoEndTime + (1 hours);
        fomoWinner = msg.sender;
        emit FomoTimerIncrease(fomoWinner, fomoEndTime);
    }

    /**
     * Increase the fomo pool by specific amount.
     *
     * @param _amount - The amount that will be added fomo pool
     */
    function _fundFomoPool(uint256 _amount) internal {
        fomoPool += _amount;
        emit NewFomoDeposit(msg.sender, _amount);
    }

    /**
     * Play a bet with encrypted move - Hash of plain input (= "move-password"). 
     * Minimum bet is 1 finney and maximum bet is contract's balance.
     * Reset the game and allow new game to play if last player not reveal before reveal phase timeout,
     * the last player regarded as lost in this case.
     * @param _encryptedMove - Hash of plain input (= "move-password")
     */
    function playBet(bytes32 _encryptedMove) external payable notBetted validBet {
        if (firstReveal != 0 || block.timestamp > firstReveal + REVEAL_TIMEOUT) {
            emit Lost(player, Moves.None, moveHost, bet);
            _reset();
        }

        // process fomo pool before doing everything
        _processFomo();

        // place a new bid
        _processBid();

        player = payable(msg.sender);
        bet = msg.value;
        encryptedMovePlayer = _encryptedMove;

        _hostCommitMove();
    }

    function reveal(string memory clearMove) public isPlayer commitPhaseEnded nonReentrant returns (bool) {
        bytes32 encryptedMove = sha256(abi.encodePacked(clearMove));  // Hash of clear input (= "move-password")
        Moves move = Moves(getFirstChar(clearMove));                  // Actual move (Rock / Paper / Scissors)

        // If move invalid, exit
        if (move == Moves.None) {
            return false;
        }

        // If hashes match, clear move is saved
        if (encryptedMovePlayer == encryptedMove) {
            movePlayer = move;
        } else {
            return false;
        }

        uint movePlayerInt = uint(movePlayer);
        uint moveHostInt = uint(moveHost);
        Outcomes outcome = Outcomes(uint8(_decideOutcome(movePlayerInt, moveHostInt)));

        pay(player, outcome, bet);
        _reset();

        return true;
    }

    function pay(address payable _player, Outcomes _outcome, uint _bet) private {
        if (_outcome == Outcomes.Win) {
            uint256 rewards = _bet * 2;
            // save 5% of rewards to fomo pool
            uint256 fomoAmount = (rewards * 5) / 100;
            _fundFomoPool(fomoAmount);
            _player.transfer(rewards - fomoAmount);
            emit Won(player, movePlayer, moveHost, _bet);
        } else if (_outcome == Outcomes.Draw) {
            _player.transfer(_bet);
            emit Draw(player, movePlayer, moveHost, _bet);
        } else {
            emit Lost(player, movePlayer, moveHost, _bet);
        }
    }

    // Return first character of a given string.
    function getFirstChar(string memory str) private pure returns (uint) {
        bytes1 firstByte = bytes(str)[0];
        if (firstByte == 0x31) {
            return 1;
        } else if (firstByte == 0x32) {
            return 2;
        } else if (firstByte == 0x33) {
            return 3;
        } else {
            return 0;
        }
    }

    /**
     * Helper function for comparing hands and return outcome
     * @param plr0 - Player 1 's move (Rock = 1, Paper = 2, Scissors = 3)
     * @param plr1 - Player 2 's move (Rock = 1, Paper = 2, Scissors = 3)
     * @return  The outcome for Player 1 (Win = 1, Lost = 2, Draw = 3) 
     */
    function _decideOutcome(uint plr0, uint plr1) private pure returns(uint) {
        // win = 1, lost = 2, draw = 3
        if (plr0 == plr1) 
            return 3;
        if ((plr0 + 1) % 3 == plr1) 
            return 2;
        return 1;
    }

    // Host commit his move. 
    function _hostCommitMove() private {
        moveHost = generateMove();
        emit hostCommitedMove(moveHost);
        if (firstReveal == 0) {
            firstReveal = block.timestamp;
        }
    }

    // Reset the game.
    function _reset() private {
        bet = 0;
        firstReveal = 0;
        player = payable(address(0x0));
        encryptedMovePlayer = 0x0;
        movePlayer = Moves.None;
        moveHost = Moves.None;
    }

    function rand() internal returns (uint256) {
        uint256 requestId = requestRandomWords();
        return randomWordsNum;
    }

    /**
     * To generate a random hand for host
     */
    function generateMove() internal returns(Moves) {
        return Moves(uint8(rand() % 3 + 1));
    }

    function requestRandomWords() public onlyOwner returns (uint256 requestId) {
        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false
        });
        requestIds.push(requestId);
        lastRequestId = requestId;
        emit RequestSent(requestId, numWords);
        return requestId; // requestID is a uint.
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        randomWordsNum = _randomWords[0]; // Set array-index to variable, easier to play with
        emit RequestFulfilled(_requestId, _randomWords);
    }

    // to check the request status of random number call.
    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }



}