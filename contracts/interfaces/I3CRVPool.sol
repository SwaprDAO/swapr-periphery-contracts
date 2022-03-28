//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface I3CRVPool {
    function get_dy(
        int128 i,
        int128 j,
        uint256 _dx
    ) external view returns (uint256);

    function exchange(
        int128 i,
        int128 j,
        uint256 _dx,
        uint256 _min_dy
    ) external returns (uint256);

    function fee() external view returns (uint256);
}
