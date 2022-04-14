// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const Curve3PoolExchange = await ethers.getContractFactory(
    "Curve3PoolExchange"
  );

  console.log(
    "Deploying Curve3PoolExchange from address:",
    (await ethers.getSigners())[0].address
  );

  const curveDAIExchange = await Curve3PoolExchange.deploy();
  await curveDAIExchange.deployed();

  console.log("Curve3PoolExchange deployed to:", curveDAIExchange.address);

  // Initialize the contract
  await curveDAIExchange.initialize();
  console.log("Curve3PoolExchange initialized");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
