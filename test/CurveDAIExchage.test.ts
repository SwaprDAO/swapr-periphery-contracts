/* eslint-disable no-unused-expressions */
import { expect } from "chai";
import { ethers } from "hardhat";
import type { BigNumber } from "ethers";
import type { CurveDAIExchange } from "../typechain/CurveDAIExchange";

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

describe("CurveDAIExchange", () => {
  const curvePool3Address = "0x7f90122BF0700F9E7e1F688fe926940E8839F353";

  let curveDAIExchange: CurveDAIExchange;

  const tokenWXDAI = {
    address: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    symbol: "WXDAI",
    name: "Wrapped XDAI",
    decimals: 6,
    index: 0,
  };

  const tokenUSDC = {
    index: 1,
    decimals: 6,
    address: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
    symbol: "USDC",
    name: "USDC",
  };

  const tokenUSDT = {
    address: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    index: 2,
  };

  beforeEach(async () => {
    const CurveExchange = await ethers.getContractFactory("CurveDAIExchange");
    curveDAIExchange = await CurveExchange.deploy();
    await curveDAIExchange.deployed();
  });

  it("has correct WXDAI address", async () => {
    expect(await curveDAIExchange.WXDAI()).to.equal(tokenWXDAI.address);
  });

  it("has correct Pool 3CRV address", async () => {
    expect(await curveDAIExchange.pool3crv()).to.equal(curvePool3Address);
  });

  it("returns 3CRV Pool fee", async () => {
    const pool3PoolContract = await ethers.getContractAt(
      POOL3CRV_ABI,
      curvePool3Address
    );

    const expectedFeeAmount = (await pool3PoolContract.fee()) as BigNumber;
    const actualFeeAmount = await curveDAIExchange.getFee();

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

    const actualEstimatedAmountOut = await curveDAIExchange.getEstimatedAmountOut(
      tokenUSDC.index,
      xDAIAmount
    );

    expect(expectedEstimatedAmountOut.eq(actualEstimatedAmountOut)).to.be.true;
  });

  describe("exchange", () => {
    it("exchanges xDAI for USDC", async () => {
      const tokenUSDCContract = await ethers.getContractAt(
        "IERC20",
        tokenUSDC.address
      );

      expect(
        (await tokenUSDCContract.balanceOf(curveDAIExchange.address)).eq(0)
      ).to.true;

      const [testAccount0] = await ethers.getSigners();

      const xDAIAmount = ethers.utils.parseUnits("1", tokenWXDAI.decimals);

      const estimatedAmountOut = await curveDAIExchange.getEstimatedAmountOut(
        tokenUSDC.index,
        xDAIAmount
      );

      const exchangeTxReceipt = await curveDAIExchange
        .exchange(
          tokenUSDT.index,
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
        (await tokenUSDCContract.balanceOf(curveDAIExchange.address)).eq(0)
      ).to.true;
    });

    it("exchanges xDAI for USDT", async () => {
      const tokenUSDTContract = await ethers.getContractAt(
        "IERC20",
        tokenUSDT.address
      );

      expect(
        (await tokenUSDTContract.balanceOf(curveDAIExchange.address)).eq(0)
      ).to.true;

      const [testAccount0] = await ethers.getSigners();

      const xDAIAmount = ethers.utils.parseUnits("1", tokenWXDAI.decimals);

      const estimatedAmountOut = await curveDAIExchange.getEstimatedAmountOut(
        tokenUSDC.index,
        xDAIAmount
      );

      const exchangeTxReceipt = await curveDAIExchange
        .exchange(
          tokenUSDT.index,
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
        (await tokenUSDTContract.balanceOf(curveDAIExchange.address)).eq(0)
      ).to.true;
    });
  });
});
