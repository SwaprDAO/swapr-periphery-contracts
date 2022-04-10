# Swapr Periphery Contracts

A set of contracts to support Swapr Eco Router.

## Curve3PoolExchange

Allows trading xDAI, native token of to USDC and USDT. Exclusive to Curve on Gnosis Chain.

### `getEstimatedAmountOut`

Get a quote for trading a pair

### `exchangeExactNativeTokenForERC20`

Exchange native xDAI to either USDC or USDT.

### `exchangeExactERC20ForNativeToken`

Exchange native USDC or USDT to native xDAI.

# Test

```shell
npx hardhat test
```

# Deployment

Add `PRIVATE_KEY` of deployer to `.env`

```shell
echo "PRIVATE_KEY=<private-key>" > .env
```

Deploy to target network. Make sure its configuration exists in `hardhat.config.ts`

```shell
hardhat run --network gnosis scripts/deploy.ts
```
