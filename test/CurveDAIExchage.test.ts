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
  const wxDAIAddress = "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d";

  let curveDAIExchange: CurveDAIExchange;

  const tokenUSDC = {
    index: "1",
    decimals: 6,
    symbol: "USDC",
    name: "USDC",
  };

  beforeEach(async () => {
    const CurveExchange = await ethers.getContractFactory("CurveDAIExchange");
    curveDAIExchange = await CurveExchange.deploy();
    await curveDAIExchange.deployed();
  });

  it("has correct WXDAI address", async () => {
    const tokenWXDAI = (await curveDAIExchange.WXDAI()) as string;
    expect(tokenWXDAI).to.equal(wxDAIAddress);
  });

  it("has correct Pool 3CRV address", async () => {
    const pool3Address = (await curveDAIExchange.pool3crv()) as string;
    expect(pool3Address).to.equal(curvePool3Address);
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

    const expectedEstimatedAmountOut = (await pool3PoolContract.fee()) as BigNumber;

    const actualEstimatedAmountOut = await curveDAIExchange.getEstimatedAmountOut(
      tokenUSDC.index,
      ethers.utils.parseUnits("1", tokenUSDC.decimals).toString()
    );

    expect(expectedEstimatedAmountOut.eq(actualEstimatedAmountOut)).to.be.equal;
  });
});
