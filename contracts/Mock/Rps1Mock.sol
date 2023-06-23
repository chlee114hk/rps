// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Rps1.sol";

contract Rps1Mock is Rps1 {
    
    constructor (
        uint64 subscriptionId,
        address _coordomator,
        bytes32 _keyHash
    )
        payable
        Rps1(
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