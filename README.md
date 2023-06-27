# Rock-Paper-Scissors Game DApp

## Contents

* [Description](#description)
    * [Rps1.sol](#Rps1sol)
    * [Rps2.sol](#Rps2sol)
* [Provable fairness](#Provable-fairness)
* [Security](#Security)
    * [Random number genaration](#Random-number-genaration)
    * [ReentrancyGuard](ReentrancyGuard)

## Description

### Rps1.sol

This smart contract implements a secure single-player Rock-Paper-Scissors game in Solidity, ready to be deployed on the EVM Compatible Blockchains.

Here is the game flow:
1. Player enters the amount of bet in ether (minimun 1 finney = 0.001 ether) and a password.
2. Player picks a move (Rock, Paper or Scissors) by clicking on the corresponding button. The hash of concatenated string of move and password will be sent in the transaction and stored.
3. A random number is generated using Chainlink VRF (Verifiable Random Function) as the host's move and stored.
4. Player knows host's move once it is committed and he need to reveal what move he have played and finish the game before Reveal Phase timeout (Within 2 minutes after the host committed its move). To do so, he need to send concatenated string of his move and password in plain text. The contract verifies that the hash of the received input matches the one stored. The player failed to reveal their move before Reveal Phase timeout will be automatically treated as **Lost** to prevent the game getting stuck by a player knowing he is lost in the game and not revealing his move.
5. Double of bet will be paid to player if he won. Bet will be returned to player if the game is draw. 
6. The game resets and can be played again by new players.

### Rps2.sol

On top of the description above, instead of giving back twice the bet amount when the player wins, 5% of that goes into a "Fomo Pool". The following rules will be added whenever a player places a bet:

- If the Fomo timer is off, the timer starts and set to end at 1 hour from bet placement time.
- Otherwise the timer will be extended to 1 hour from the bet placement time if the bet amount is at least 10% of the pool size.

## Provable fairness

A player can independently verify that the host didn't have any advantage over him in any game he played. Host's move is generated using Chainlink VRF (Verifiable Random Function) which is a provably fair and verifiable random number generator. Its move is transperant to player for checking after he committed.

As the move of player is hashed with his chosen password before it sent out in the game,
the host can not cheat by checking the player's move before committing its move.

At the same time, player is not able to cheat. As host's move only known to player after the player committed his move. If the player changed his move in Reveal Phase, the hashed concatenated string of his move and password will be changed and he will not be able to pass the verification.

## Security

### Random number genaration

Host's move in this project is generated using [Chainlink VRF (Verifiable Random Function)](https://docs.chain.link/vrf/v2/introduction) which is a provably fair and verifiable random number generator (RNG) that enables smart contracts to access random values without compromising security or usability. For each request, Chainlink VRF generates one or more random values and cryptographic proof of how those values were determined. The proof is published and verified on-chain before any consuming applications can use it. This process ensures that results cannot be tampered with or manipulated by any single entity including oracle operators, miners, users, or smart contract developers.

**Important Notice**: [Subscription](https://docs.chain.link/vrf/v2/subscription) method is used in this project for requesting randomness. Enough balance of LINK tokens funded to the subscription and adding of consumer with deployed smart contract address is required for randomness in this project to generate properly.

### ReentrancyGuard

[ReentrancyGuard](https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard) from openzeppelin is used in this project
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
```
that helps prevent reentrant calls to certain function.

The reveal function which included call to internal helper function `pay` which handle payment to player is protected by `nonReentrant` modifier that make sure there are no nested (reentrant) calls to it.

```solidity
function reveal(string memory clearMove) public isPlayer commitPhaseEnded nonReentrant returns (bool) {
    // reveal logic
    
    pay(player, outcome, bet);
    _reset();
}
```

All game status is reset by `_reset()` after the player reveal his move and get the payment.

