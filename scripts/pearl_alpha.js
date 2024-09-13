/*global process*/

const { ethers } = require("ethers");

async function main() {
    const gnosisURL = "https://rpc.gnosischain.com";
    const gnosisProvider = new ethers.providers.JsonRpcProvider(gnosisURL);
    const block = await gnosisProvider.getBlock("latest");
    console.log("\nCurrent block number on gnosis: ", block.number);

    const fs = require("fs");
    // StakingProxy address on gnosis
    const stakingTokenProxyAddress = "0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A";
    const stakingTokenJSON = "abis/0.8.25/StakingToken.json";
    let contractFromJSON = fs.readFileSync(stakingTokenJSON, "utf8");
    const stakingTokenABI = JSON.parse(contractFromJSON)["abi"];
    const stakingTokenProxy = new ethers.Contract(stakingTokenProxyAddress, stakingTokenABI, gnosisProvider);

    // OLAS address on gnosis
    const olasAddress = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f";
    const erc20JSON = "abis/misc/ERC20Token.json";
    contractFromJSON = fs.readFileSync(erc20JSON, "utf8");
    const olasABI = JSON.parse(contractFromJSON)["abi"];
    const olas = new ethers.Contract(olasAddress, olasABI, gnosisProvider);

    console.log("\nProxy address:", stakingTokenProxy.address);
    console.log("Implementation version:", await stakingTokenProxy.VERSION());
    console.log("Epoch counter:", Number(await stakingTokenProxy.epochCounter()));
    const lastCheckpointTimestamp = Number(await stakingTokenProxy.tsCheckpoint());
    const lastCheckpointDate = new Date(lastCheckpointTimestamp * 1000).toLocaleString();
    console.log("\tLast checkpoint:", lastCheckpointDate);
    const livenessPeriodSeconds = Number(await stakingTokenProxy.livenessPeriod());
    const days = Math.floor(livenessPeriodSeconds / 86400);
    const hours = Math.floor((livenessPeriodSeconds % 86400) / 3600);
    const minutes = Math.floor((livenessPeriodSeconds % 3600) / 60);
    console.log(`\tLiveness period: ${days} days, ${hours} hours, ${minutes} minutes`);
    console.log("\tTime passed from the last checkpoint:", block.timestamp - Number(await stakingTokenProxy.tsCheckpoint()));
    const timePassed = block.timestamp - Number(await stakingTokenProxy.tsCheckpoint());
    const livenessPeriod = Number(await stakingTokenProxy.livenessPeriod());
    const timeRemaining = livenessPeriod - timePassed;
    const remainingDays = Math.floor(timeRemaining / 86400);
    const remainingHours = Math.floor((timeRemaining % 86400) / 3600);
    const remainingMinutes = Math.floor((timeRemaining % 3600) / 60);
    console.log(`\tTime remaining: ${remainingDays} days, ${remainingHours} hours, ${remainingMinutes} minutes`);

    console.log("\nOLAS balance:", (await olas.balanceOf(stakingTokenProxyAddress)).toString());
    console.log("Available rewards (balance - accounted rewards):", (await stakingTokenProxy.availableRewards()).toString());
    const olasBalanceInEth = ethers.utils.formatEther(await olas.balanceOf(stakingTokenProxyAddress));
    console.log("\nOLAS balance in ETH units:", olasBalanceInEth, "OLAS");

    const availableRewardsInEth = ethers.utils.formatEther(await stakingTokenProxy.availableRewards());
    console.log("Available rewards in ETH units (balance - accounted rewards):", availableRewardsInEth, "OLAS");

    const rewardsPerSecondInEth = ethers.utils.formatEther(await stakingTokenProxy.rewardsPerSecond());
    console.log("\nRewards per second in ETH units:", rewardsPerSecondInEth, "OLAS");

    const minStakingDepositInEth = ethers.utils.formatEther(await stakingTokenProxy.minStakingDeposit());
    console.log("Min staking deposit in ETH units:", minStakingDepositInEth, "OLAS");

    const emissionsAmountInEth = ethers.utils.formatEther(await stakingTokenProxy.emissionsAmount());
    console.log("\nEmission amount in ETH units:", emissionsAmountInEth, "OLAS");
    console.log("Activity checker address:", await stakingTokenProxy.activityChecker());

    console.log("\nRewards per second:", (await stakingTokenProxy.rewardsPerSecond()).toString());
    console.log("Max number of services:", Number(await stakingTokenProxy.maxNumServices()));
    console.log("Current number of staked services:", Number((await stakingTokenProxy.getServiceIds()).length));
    console.log("Min staking deposit:", (await stakingTokenProxy.minStakingDeposit()).toString());
    console.log("Min staking duration:", Number(await stakingTokenProxy.minStakingDuration()));
    console.log("Max inactivity duration:", Number(await stakingTokenProxy.maxInactivityDuration()));


    console.log("\nEmission amount:", (await stakingTokenProxy.emissionsAmount()).toString());
    console.log("Time for emissions:", Number(await stakingTokenProxy.timeForEmissions()));
    console.log("Num agent instances:", Number(await stakingTokenProxy.numAgentInstances()));
    console.log("Agent instance threshold:", Number(await stakingTokenProxy.threshold()));
    console.log("Service registry address:", await stakingTokenProxy.serviceRegistry());
    console.log("Service registry token utility address:", await stakingTokenProxy.serviceRegistryTokenUtility());

    // Fetch all events from the staking contract
    const allEvents = await stakingTokenProxy.queryFilter("*");
    const eventsData = JSON.stringify(allEvents);
    fs.writeFileSync("stakingEvents.json", eventsData);
    console.log("All staking contract events have been written to stakingEvents.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });