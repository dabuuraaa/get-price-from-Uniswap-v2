import { ethers } from "ethers";
import { program, Option } from "commander";
import * as dotenv from "dotenv";
dotenv.config();
import _tokens from "../data/tokens.json";
import { abi as IUniswapV2FactoryABI } from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import { abi as IUniswapV2PairABI } from "@uniswap/v2-core/build/IUniswapV2Pair.json";

const chainId = 1;
const FACTORY_ADDRESS = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f";
const tokens: TokenData[] = _tokens;

interface TokenData {
  chainId: number;
  symbol: string;
  address: string;
  decimals: number;
}

async function main(tokenSymbolA: string, tokenSymbolB: string) {
  const rpcUrl: string = process.env.ETHEREUM_URL || "";
  if (rpcUrl === "") {
    throw new Error("ETHEREUM_URL is not set");
  }
  const tokenA : TokenData = tokens.filter((d :TokenData) => (d.chainId === chainId && d.symbol === tokenSymbolA))[0];
  const tokenB : TokenData = tokens.filter((d :TokenData) => (d.chainId === chainId && d.symbol === tokenSymbolB))[0];
  const [token0, token1] = tokenA.address < tokenB.address ? [tokenA, tokenB] : [tokenB, tokenA];

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const factory = new ethers.Contract(FACTORY_ADDRESS, IUniswapV2FactoryABI, provider);
  const pairAddress = await factory.getPair(token0.address, token1.address);
  console.log(`${token0.symbol}-${token1.symbol} pair pool address: ${pairAddress}`);
  const pairContract = new ethers.Contract(pairAddress, IUniswapV2PairABI, provider);

  const [reserve0, reserve1, blockTimestampLast] = await pairContract.getReserves();
  const denominator = BigInt(reserve0) * (10n ** BigInt(token1.decimals));
  const numerator = BigInt(reserve1) * (10n ** BigInt(token0.decimals));
  const precision = 15;
  const price = Number(10n ** BigInt(precision) * numerator / denominator) / (10 ** precision);
  console.log(`1 ${token0.symbol} = ${price} ${token1.symbol}`);
  console.log(`1 ${token1.symbol} = ${1 / price} ${token0.symbol}`);
}

program
  .addOption(new Option('-A, --tokenSymbolA <symbol>', 'symbol of ERC20 token (e.g. WBTC)').makeOptionMandatory())
  .addOption(new Option('-B, --tokenSymbolB <symbol>', 'symbol of ERC20 token (e.g. WBTC)').makeOptionMandatory())
  .parse();
const options = program.opts();

main(options.tokenSymbolA, options.tokenSymbolB).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});