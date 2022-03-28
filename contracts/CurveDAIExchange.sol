//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/I3CRVPool.sol";
import "./interfaces/IWXDAI.sol";

/**
 * @title CurveDAIExchange
 * Error Codes:
 * SD01: Zero Value
 * SD02: Failed to approve WXDAI
 * SD03: Failed to deposit xDAI
 * SD04: Failed to exchange
 * SD05: Failed to transfer from WXDAI
 */

contract CurveDAIExchange {
    using SafeMath for uint256;

    /// @dev Curve 3CRV pool contract address
    address public immutable pool3crv =
        address(0x7f90122BF0700F9E7e1F688fe926940E8839F353);
    address public WXDAI = address(0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d);
    address public USDC = address(0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83);
    address public USDT = address(0x4ECaBa5870353805a9F068101A40E0f32ed605C6);

    mapping(address => int128) public getTokenIndex;
    mapping(int128 => address) public getTokenAddress;

    constructor() {
        getTokenIndex[WXDAI] = 0;
        getTokenIndex[USDC] = 1;
        getTokenIndex[USDT] = 2;
        getTokenAddress[0] = WXDAI;
        getTokenAddress[1] = USDC;
        getTokenAddress[2] = USDT;
    }

    /// @dev Gets the 3CRV pool's fee
    /// @return The 3CRV pool's fee
    function getFee() public view returns (uint256) {
        return I3CRVPool(pool3crv).fee();
    }

    /// @dev Gets estiamted out amount of WXDAI tokens that can be exchanged
    /// @param _tokenOutIndex Index of the token to exchange for (1 for USDC, 2 for USDT)
    /// @param _amountIn Amount of WXDAI tokens to exchange
    /// @return Estimated amount to receive
    function getEstimatedAmountOut(int128 _tokenOutIndex, uint256 _amountIn)
        public
        view
        returns (uint256)
    {
        return I3CRVPool(pool3crv).get_dy(0, _tokenOutIndex, _amountIn);
    }

    /// @dev Exchange DAI for either USDC or USDT
    /// @param _tokenOutIndex Index of the token to exchange for (1 for USDC, 2 for USDT)
    /// @param _minimumAmountOut Minimum amount of the token to exchange for
    /// @param _receiver Minimum amount of the token to exchange for
    /// @param _requiresApproval Whether or not the token to exchange for requires approval
    function exchange(
        int128 _tokenOutIndex,
        uint256 _minimumAmountOut,
        address _receiver,
        bool _requiresApproval
    ) public payable returns (uint256) {
        require(msg.value > 1, "SD01");

        if (_requiresApproval) {
            require(IWXDAI(WXDAI).approve(pool3crv, msg.value), "SD02");
        }

        // wrap the sent value
        IWXDAI(WXDAI).deposit{value: msg.value}();

        // Proceed with the exchange
        uint256 receivedAmountOut = I3CRVPool(pool3crv).exchange(
            0,
            _tokenOutIndex,
            msg.value,
            _minimumAmountOut
        );

        require(receivedAmountOut >= 0, "SD04");
        // Return the amount out to the sender
        require(
            IERC20(getTokenAddress[_tokenOutIndex]).transferFrom(
                address(this),
                _receiver,
                receivedAmountOut
            ),
            "SD05"
        );

        return receivedAmountOut;
    }
}
