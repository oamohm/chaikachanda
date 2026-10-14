// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TipJar is ReentrancyGuard {
    error BelowMinimum();
    error NameTooLong();
    error MessageTooLong();
    error EmptyName();
    error EmptyMessage();
    error NotOwner();
    error NothingToWithdraw();
    error TransferFailed();
    error InvalidOwner();

    struct Tip {
        address tipper;
        uint256 amount;
        string name;
        string message;
        uint256 timestamp;
    }

    event TipReceived(
        address indexed tipper,
        uint256 amount,
        string name,
        string message,
        uint256 timestamp
    );

    address private immutable owner;

    uint256 public constant MINIMUM_TIP = 100_000_000_000_000_000; // 0.1 native USDC (18 decimals)
    uint256 private constant MAX_NAME_LENGTH = 30;
    uint256 private constant MAX_MESSAGE_LENGTH = 80;

    Tip[] private tips;
    uint256 private collected;

    constructor(address owner_) {
        if (owner_ == address(0)) revert InvalidOwner();
        owner = owner_;
    }

    function tip(string calldata name, string calldata message) external payable nonReentrant {
        if (msg.value < MINIMUM_TIP) revert BelowMinimum();

        uint256 nameLength = bytes(name).length;
        if (nameLength == 0) revert EmptyName();
        if (nameLength > MAX_NAME_LENGTH) revert NameTooLong();

        uint256 messageLength = bytes(message).length;
        if (messageLength == 0) revert EmptyMessage();
        if (messageLength > MAX_MESSAGE_LENGTH) revert MessageTooLong();

        tips.push(
            Tip({
                tipper: msg.sender,
                amount: msg.value,
                name: name,
                message: message,
                timestamp: block.timestamp
            })
        );

        collected += msg.value;

        emit TipReceived(msg.sender, msg.value, name, message, block.timestamp);
    }

    function totalCollected() external view returns (uint256) {
        return collected;
    }

    function getTipsCount() external view returns (uint256) {
        return tips.length;
    }

    function getTip(uint256 index) external view returns (Tip memory) {
        return tips[index];
    }

    function getRecentTips(uint256 count) external view returns (Tip[] memory) {
        uint256 tipsLength = tips.length;
        if (count > tipsLength) {
            count = tipsLength;
        }

        Tip[] memory recent = new Tip[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = tips[tipsLength - 1 - i];
        }

        return recent;
    }

    function withdraw() external nonReentrant {
        if (msg.sender != owner) revert NotOwner();

        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();

        (bool ok,) = owner.call{value: balance}("");
        if (!ok) revert TransferFailed();
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
