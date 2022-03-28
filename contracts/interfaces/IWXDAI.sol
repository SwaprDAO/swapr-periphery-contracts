//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IWXDAI {
    function deposit() external payable;

    function approve(address guy, uint256 wad) external returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) external returns (bool);
}
