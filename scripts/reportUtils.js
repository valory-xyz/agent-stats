const { ethers } = require("ethers");
const fs = require("fs");
const moment = require('moment');

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function withRetry(fn) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === MAX_RETRIES - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

async function getReportData(stakingTokenProxyAddress, useRetry = false) {
    const gnosisURL = "https://rpc.gnosischain.com";
    const gnosisProvider = new ethers.providers.JsonRpcProvider(gnosisURL);
    const getContractData = useRetry ? withRetry : (fn) => fn();
    
    const block = await getContractData(() => gnosisProvider.getBlock("latest"));
    
    const stakingTokenJSON = "abis/0.8.25/StakingToken.json";
    const stakingTokenABI = JSON.parse(fs.readFileSync(stakingTokenJSON, "utf8"))["abi"];
    const stakingTokenProxy = new ethers.Contract(stakingTokenProxyAddress, stakingTokenABI, gnosisProvider);

    const olasAddress = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f";
    const erc20JSON = "abis/misc/ERC20Token.json";
    const olasABI = JSON.parse(fs.readFileSync(erc20JSON, "utf8"))["abi"];
    const olas = new ethers.Contract(olasAddress, olasABI, gnosisProvider);

    const epochCounter = Number(await getContractData(() => stakingTokenProxy.epochCounter()));
    const availableRewards = ethers.utils.formatEther(await getContractData(() => stakingTokenProxy.availableRewards()));
    const timeRemainingSeconds = Number(await getContractData(() => stakingTokenProxy.livenessPeriod())) - (block.timestamp - Number(await getContractData(() => stakingTokenProxy.tsCheckpoint())));
    const days = Math.floor(timeRemainingSeconds / 86400);
    const hours = Math.floor((timeRemainingSeconds % 86400) / 3600);
    const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
    const timeRemaining = `${days}d ${hours}h ${minutes}m`;
    const currentNumServices = Number((await getContractData(() => stakingTokenProxy.getServiceIds())).length);
    const currentDate = moment().format('MMMM D, YYYY HH:mm:ss');

    return {
        epochCounter,
        availableRewards,
        timeRemaining,
        currentNumServices,
        currentDate
    };
}

function logReportData(fileName, data) {
    console.log(`File: \x1b[36m${fileName}\x1b[0m`);
    console.log(`Epoch: \x1b[36m${data.epochCounter}\x1b[0m`);
    console.log(`Time Remaining in This Epoch: \x1b[36m${data.timeRemaining}\x1b[0m`);
    console.log(`Current Staked Services: \x1b[36m${data.currentNumServices}\x1b[0m`);
    console.log('--------------------');
}

async function getStakingContracts(provider, stakingTokenABI) {
    const latestBlock = await provider.getBlockNumber();
    const batchSize = 100000; // Adjust this value based on the RPC node's capabilities
    const contracts = [];

    for (let fromBlock = 0; fromBlock <= latestBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);
        
        try {
            const deploymentEvents = await provider.getLogs({
                fromBlock: fromBlock,
                toBlock: toBlock,
                topics: [ethers.utils.id("Initialized(uint8)")]
            });

            for (const event of deploymentEvents) {
                const contract = new ethers.Contract(event.address, stakingTokenABI, provider);
                try {
                    // Check if the contract has the expected functions
                    await contract.epochCounter();
                    await contract.availableRewards();
                    contracts.push({
                        name: `staking-contract-${contracts.length + 1}`,
                        address: event.address,
                        useRetry: false
                    });
                } catch (error) {
                    // If the contract doesn't have the expected functions, skip it
                    console.log(`Skipping contract at ${event.address}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error(`Error fetching logs for blocks ${fromBlock} to ${toBlock}: ${error.message}`);
        }
    }

    return contracts;
}

module.exports = { getReportData, logReportData, getStakingContracts };