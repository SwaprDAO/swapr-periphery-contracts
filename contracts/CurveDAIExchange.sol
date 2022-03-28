//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/I3CRVPool.sol";
import "./interfaces/IWXDAI.sol";

error ZeroValue();

contract CurveDAIExchange {
    using SafeMath for uint256;

    /// @dev Curve 3CRV pool contract address
    address public immutable pool3crv =
        address(0x7f90122BF0700F9E7e1F688fe926940E8839F353);
    /// @dev The WXDAI contract address
    address public immutable WXDAI =
        address(0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d);

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
        if (msg.value < 0) {
            revert ZeroValue();
        }

        if (_requiresApproval) {
            require(IWXDAI(WXDAI).approve(pool3crv, msg.value));
        }

        // wrap the sent value
        uint256 amountIn = IWXDAI(WXDAI).deposit{value: msg.value}();

        // Proceed with the exchange
        uint256 amountOut = I3CRVPool(pool3crv).exchange(
            0,
            _tokenOutIndex,
            amountIn,
            _minimumAmountOut
        );

        require(amountOut >= 0, "Amount out cannot be negative");

        // Return the amount out to the sender
        IWXDAI(WXDAI).transferFrom(address(this), _receiver, amountIn);

        return amountOut;
    }
}