// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Rps2.sol";

contract Rps2Mock is Rps2 {
    
    constructor (
        uint64 subscriptionId,
        address _coordomator,
        bytes32 _keyHash
    )
        payable
        Rps2(
            subscriptionId,
             _coordomator,
             _keyHash
        )
    {
    }

    function setRandomWordsNum(uint num) external onlyOwner {
        randomWordsNum = num;
    }
}