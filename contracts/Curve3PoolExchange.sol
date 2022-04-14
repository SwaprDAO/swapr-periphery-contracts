//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/I3CRVPool.sol";
import "./interfaces/IWXDAI.sol";

error Initialization();
error AlreadyInitialized();
error Transfer();
error Approval();
error Exchange();
error FailedToTransferFromWXDAI();
error NotWXDAIContract();

/// @title Curve3 Pool Exchange
/// @dev Adds support for exchaning between XDAI and USDC and USDC
contract Curve3PoolExchange {
    using SafeMath for uint256;

    bool public initialized = false;

    event Initialized();

    /// @notice Curve 3CRV pool contract address
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

    /// @dev Initializes the contract
    function initialize() public returns (bool) {
        // Only initialize once
        if (initialized) {
            revert AlreadyInitialized();
        }

        uint256 MAX_UINT = 2**256 - 1;

        bool approvedWXDAI = IERC20(WXDAI).approve(pool3crv, MAX_UINT);
        bool approvedUSDC = IERC20(USDC).approve(pool3crv, MAX_UINT);
        bool approvedUSDT = IERC20(USDT).approve(pool3crv, MAX_UINT);

        if (!approvedWXDAI || !approvedUSDC || !approvedUSDT) {
            revert Initialization();
        }

        initialized = true;

        emit Initialized();

        return initialized;
    }

    /// @notice Gets the 3CRV pool's fee
    /// @return The 3CRV pool's fee
    function getFee() public view returns (uint256) {
        return I3CRVPool(pool3crv).fee();
    }

    /// @notice Gets estiamted out amount out
    /// @param _tokenIn Address of the token to exchange in
    /// @param _tokenOut Address of the token to exchange out
    /// @param _amountIn Amount of the token to exchange in
    /// @return Estimated amount to receive
    function getEstimatedAmountOut(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) public view returns (uint256) {
        return
            I3CRVPool(pool3crv).get_dy(
                getTokenIndex[_tokenIn],
                getTokenIndex[_tokenOut],
                _amountIn
            );
    }

    /// @notice Exchange native token for either ERC20
    /// @param _tokenOut Address of the token to exchange for (1 for USDC, 2 for USDT)
    /// @param _minimumAmountOut Minimum amount of the token to exchange for
    /// @param _receiver Minimum amount of the token to exchange for
    /// @return The amount of received token
    function exchangeExactNativeTokenForERC20(
        address _tokenOut,
        uint256 _minimumAmountOut,
        address _receiver
    ) public payable returns (uint256) {
        // wrap the sent value
        IWXDAI(WXDAI).deposit{value: msg.value}();

        // Proceed with the exchange
        uint256 receivedAmountOut = I3CRVPool(pool3crv).exchange(
            getTokenIndex[WXDAI],
            getTokenIndex[_tokenOut],
            msg.value,
            _minimumAmountOut
        );

        // Return the amount out to the sender
        bool transfered = IERC20(_tokenOut).transferFrom(
            address(this),
            _receiver,
            receivedAmountOut
        );

        if (!transfered) {
            revert FailedToTransferFromWXDAI();
        }

        return receivedAmountOut;
    }

    /// @dev Exchange ERC20 tokens for native token
    /// @param _tokenIn Address of the token to exchange
    /// @param _amountIn Amount of the token to exchange
    /// @param _minimumAmountOut Minimum amount of the token to exchange for
    /// @param _receiver Minimum amount of the token to exchange for
    function exchangeExactERC20ForNativeToken(
        address _tokenIn,
        uint256 _amountIn,
        uint256 _minimumAmountOut,
        address _receiver
    ) public returns (uint256) {
        /// @dev transfer the amount in from the sender to this contract
        bool transfered = IERC20(_tokenIn).transferFrom(
            msg.sender,
            address(this),
            _amountIn
        );

        if (!transfered) {
            revert Transfer();
        }

        // Proceed with the exchange
        uint256 receivedAmountOut = I3CRVPool(pool3crv).exchange(
            getTokenIndex[_tokenIn],
            getTokenIndex[WXDAI],
            _amountIn,
            _minimumAmountOut
        );

        // Unwrap WXDAI and transfer the amount out
        IWXDAI(WXDAI).withdraw(receivedAmountOut);

        payable(_receiver).transfer(receivedAmountOut);

        return receivedAmountOut;
    }

    /// @notice Adds support for accepting withdrawn XDAI from the WXDAI contract
    receive() external payable {
        if (msg.sender != WXDAI) {
            revert NotWXDAIContract();
        }
    }
}
