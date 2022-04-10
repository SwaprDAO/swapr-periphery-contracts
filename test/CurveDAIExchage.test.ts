/* eslint-disable no-unused-expressions */
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, constants } from "ethers";
import type { Curve3PoolExchange } from "../typechain/Curve3PoolExchange";

import { ERC20MINTABLE_ABI } from "./abi";
import { parseEther } from "ethers/lib/utils";

export const POOL3CRV_ABI = [
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "" }],
    name: "get_dy",
    inputs: [
      { type: "int128", name: "i" },
      { type: "int128", name: "j" },
      { type: "uint256", name: "_dx" },
    ],
    gas: 2802664,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    outputs: [{ type: "uint256", name: "" }],
    name: "exchange",
    inputs: [
      { type: "int128", name: "i" },
      { type: "int128", name: "j" },
      { type: "uint256", name: "_dx" },
      { type: "uint256", name: "_min_dy" },
    ],
    gas: 2965660,
  },
  {
    type: "function",
    stateMutability: "view",
    outputs: [{ type: "uint256", name: "" }],
    name: "fee",
    inputs: [],
    gas: 1868,
  },
];

type TestToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  index: number;
};

describe("curve3PoolExchange", () => {
  const curvePool3Address = "0x7f90122BF0700F9E7e1F688fe926940E8839F353";

  let curve3PoolExchange: Curve3PoolExchange;

  const tokenWXDAI: TestToken = {
    address: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    symbol: "WXDAI",
    name: "Wrapped XDAI",
    decimals: 6,
    index: 0,
  };

  const tokenUSDC: TestToken = {
    index: 1,
    decimals: 6,
    address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
    symbol: "USDC",
    name: "USDC",
  };

  const tokenUSDT: TestToken = {
    address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    index: 2,
  };

  beforeEach(async () => {
    const Curve3PoolExchange = await ethers.getContractFactory(
      "Curve3PoolExchange"
    );
    curve3PoolExchange = await Curve3PoolExchange.deploy();
    await curve3PoolExchange.deployed();
    await curve3PoolExchange.initialize();
  });

  it("has correct WXDAI address", async () => {
    expect(await curve3PoolExchange.WXDAI()).to.equal(tokenWXDAI.address);
  });

  it("has correct USDC address", async () => {
    expect(await curve3PoolExchange.USDC()).to.equal(tokenUSDC.address);
  });

  it("has correct USDT address", async () => {
    expect(await curve3PoolExchange.USDT()).to.equal(tokenUSDT.address);
  });

  it("has correct Pool 3CRV address", async () => {
    expect(await curve3PoolExchange.pool3crv()).to.equal(curvePool3Address);
  });

  it("initializes correctly", async () => {
    const tokenWXDAIContract = await ethers.getContractAt(
      "IERC20",
      tokenWXDAI.address
    );

    const tokenUSDCContract = await ethers.getContractAt(
      "IERC20",
      tokenUSDC.address
    );

    const tokenUSDTContract = await ethers.getContractAt(
      "IERC20",
      tokenUSDT.address
    );

    expect(
      await tokenWXDAIContract.allowance(
        curve3PoolExchange.address,
        curvePool3Address
      )
    ).to.equal(constants.MaxUint256);

    expect(
      await tokenUSDCContract.allowance(
        curve3PoolExchange.address,
        curvePool3Address
      )
    ).to.equal(constants.MaxUint256);

    expect(
      await tokenUSDTContract.allowance(
        curve3PoolExchange.address,
        curvePool3Address
      )
    ).to.equal(constants.MaxUint256);
  });

  it("can be initialized once", async () => {
    await expect(curve3PoolExchange.initialize()).to.be.revertedWith(
      "AlreadyInitialized()"
    );
  });

  it("returns 3CRV Pool fee", async () => {
    const pool3PoolContract = await ethers.getContractAt(
      POOL3CRV_ABI,
      curvePool3Address
    );

    const expectedFeeAmount = (await pool3PoolContract.fee()) as BigNumber;
    const actualFeeAmount = await curve3PoolExchange.getFee();

    expect(expectedFeeAmount.eq(actualFeeAmount)).to.be.equal;
  });

  it("returns estimated amount out from 3CRV Pool", async () => {
    const pool3PoolContract = await ethers.getContractAt(
      POOL3CRV_ABI,
      curvePool3Address
    );

    const xDAIAmount = ethers.utils.parseUnits("1", 18);

    const expectedEstimatedAmountOut = (await pool3PoolContract.get_dy(
      0,
      1,
      xDAIAmount
    )) as BigNumber;

    const actualEstimatedAmountOut = await curve3PoolExchange.getEstimatedAmountOut(
      tokenWXDAI.address,
      tokenUSDC.address,
      xDAIAmount
    );

    expect(expectedEstimatedAmountOut.eq(actualEstimatedAmountOut)).to.be.true;
  });

  describe("exchangeExactNativeTokenForERC20", () => {
    it("exchanges xDAI for USDC", async () => {
      const tokenUSDCContract = await ethers.getContractAt(
        "IERC20",
        tokenUSDC.address
      );

      expect(
        (await tokenUSDCContract.balanceOf(curve3PoolExchange.address)).eq(0)
      ).to.true;

      const [testAccount0] = await ethers.getSigners();

      const xDAIAmount = ethers.utils.parseUnits("1", tokenWXDAI.decimals);

      const estimatedAmountOut = await curve3PoolExchange.getEstimatedAmountOut(
        tokenWXDAI.address,
        tokenUSDC.address,
        xDAIAmount
      );

      const exchangeTxReceipt = await curve3PoolExchange
        .exchangeExactNativeTokenForERC20(
          tokenUSDT.address,
          estimatedAmountOut,
          testAccount0.address,
          true,
          {
            value: xDAIAmount,
          }
        )
        .then((tx) => tx.wait());

      expect(exchangeTxReceipt.status).to.equal(1);

      // The contract hold nothing
      expect(
        (await tokenUSDCContract.balanceOf(curve3PoolExchange.address)).eq(0)
      ).to.true;
    });

    it("exchanges xDAI for USDT", async () => {
      const tokenUSDTContract = await ethers.getContractAt(
        "IERC20",
        tokenUSDT.address
      );

      expect(
        (await tokenUSDTContract.balanceOf(curve3PoolExchange.address)).eq(0)
      ).to.true;

      const [testAccount0] = await ethers.getSigners();

      const xDAIAmount = ethers.utils.parseUnits("1", tokenWXDAI.decimals);

      const estimatedAmountOut = await curve3PoolExchange.getEstimatedAmountOut(
        tokenWXDAI.address,
        tokenUSDC.address,
        xDAIAmount
      );

      const exchangeTxReceipt = await curve3PoolExchange
        .exchangeExactNativeTokenForERC20(
          tokenUSDT.address,
          estimatedAmountOut,
          testAccount0.address,
          true,
          {
            value: xDAIAmount,
          }
        )
        .then((tx) => tx.wait());

      expect(exchangeTxReceipt.status).to.equal(1);

      // The contract hold nothing
      expect(
        (await tokenUSDTContract.balanceOf(curve3PoolExchange.address)).eq(0)
      ).to.true;
    });
  });

  describe("exchangeExactERC20ForNativeToken", () => {
    const USDC_OWNER = "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d";
    const USDT_OWNER = "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d";

    const cases: {
      token: TestToken;
      tokenContractOwner: string;
    }[] = [
      {
        token: tokenUSDC,
        tokenContractOwner: USDC_OWNER,
      },
      {
        token: tokenUSDT,
        tokenContractOwner: USDT_OWNER,
      },
    ];

    cases.forEach(({ token, tokenContractOwner }) => {
      it(`exchanges 1 ${token.symbol} for xDAI`, async () => {
        const [testAccount0] = await ethers.getSigners();
        const amountIn = ethers.utils.parseUnits("1", token.decimals);

        // Unlock the owner of USDC
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [tokenContractOwner],
        });

        await network.provider.send("hardhat_setBalance", [
          tokenContractOwner,
          parseEther("1").toHexString().replace("0x0", "0x"),
        ]);

        const tokenInContract = await ethers.getContractAt(
          ERC20MINTABLE_ABI,
          token.address,
          await ethers.getSigner(tokenContractOwner)
        );

        // Mint to the test account
        await (tokenInContract as any).mint(testAccount0.address, amountIn);

        expect(
          (await tokenInContract.balanceOf(curve3PoolExchange.address)).eq(0)
        ).to.true;

        const estimatedAmountOut = await curve3PoolExchange.getEstimatedAmountOut(
          token.address,
          tokenWXDAI.address,
          amountIn
        );

        // Approve the contract to spend the amount
        await tokenInContract
          .connect(testAccount0)
          .approve(curve3PoolExchange.address, constants.MaxUint256);

        const exchangeTxReceipt = await curve3PoolExchange
          .exchangeExactERC20ForNativeToken(
            token.address,
            amountIn,
            estimatedAmountOut,
            testAccount0.address,
            true
          )
          .then((tx) => tx.wait());

        expect(exchangeTxReceipt.status).to.equal(1);

        // The contract no ERC20 or xDAI hold nothing
        expect(
          (await tokenInContract.balanceOf(curve3PoolExchange.address)).eq(0)
        ).to.true;
        expect(
          (await ethers.provider.getBalance(curve3PoolExchange.address)).eq(0)
        ).to.true;
      });
    });
  });
});
