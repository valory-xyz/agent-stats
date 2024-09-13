/*global process*/

const { ethers } = require("ethers");
const fs = require("fs");
const csv = require("csv-parser");
const moment = require('moment');

async function main() {
    const gnosisURL = "https://rpc.gnosischain.com";
    const gnosisProvider = new ethers.providers.JsonRpcProvider(gnosisURL);
    const block = await gnosisProvider.getBlock("latest");
    const EVENTS_FILE = "events-pearl-beta-2.json"

    // StakingProxy address on gnosis
    const stakingTokenProxyAddress = "0x1c2f82413666d2a3fd8bc337b0268e62ddf67434";
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

    const epochCounter = Number(await stakingTokenProxy.epochCounter());
    
    // Change this line to use availableRewards
    const availableRewards = ethers.utils.formatEther(await stakingTokenProxy.availableRewards());
    const isLowBalance = parseFloat(availableRewards) < 50;

    const timeRemainingSeconds = Number(await stakingTokenProxy.livenessPeriod()) - (block.timestamp - Number(await stakingTokenProxy.tsCheckpoint()));
    const days = Math.floor(timeRemainingSeconds / 86400);
    const hours = Math.floor((timeRemainingSeconds % 86400) / 3600);
    const minutes = Math.floor((timeRemainingSeconds % 3600) / 60);
    const timeRemaining = `${days}d ${hours}h ${minutes}m`;
    const olasBalanceInEth = ethers.utils.formatEther(await olas.balanceOf(stakingTokenProxyAddress));
    const currentNumServices = Number((await stakingTokenProxy.getServiceIds()).length);

    const currentDate = moment().format('MMMM D, YYYY HH:mm:ss');

    // Add this function to get block datetime
    async function getBlockDateTime(provider, blockNumber) {
        const block = await provider.getBlock(blockNumber);
        return moment.unix(block.timestamp).format('YYYY-MM-DD HH:mm:ss');
    }

    // Modify the section that fetches and logs new events
    const latestBlock = await gnosisProvider.getBlockNumber();
    let lastLoggedBlock = 0;
    let existingEvents = [];

    if (fs.existsSync(EVENTS_FILE)) {
        const eventsData = fs.readFileSync(EVENTS_FILE, "utf8");
        if (eventsData.trim() !== '') {
            try {
                existingEvents = JSON.parse(eventsData);
                if (existingEvents.length > 0) {
                    lastLoggedBlock = Math.max(...existingEvents.map(e => e.blockNumber));
                }
            } catch (error) {
                console.error("Error parsing events.json:", error);
                existingEvents = [];
            }
        }
    }

    const newEvents = await stakingTokenProxy.queryFilter("*", lastLoggedBlock + 1, latestBlock);

    const formattedNewEvents = await Promise.all(newEvents.map(async event => {
        const blockDateTime = await getBlockDateTime(gnosisProvider, event.blockNumber);
        return {
            blockNumber: event.blockNumber,
            blockDateTime: blockDateTime,
            transactionHash: event.transactionHash,
            event: event.event,
            args: event.args ? Object.fromEntries(Object.entries(event.args).filter(([key]) => isNaN(key))) : {}
        };
    }));

    const updatedEvents = [...existingEvents, ...formattedNewEvents];
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(updatedEvents, null, 2));

    // Find the latest Checkpoint event
    const latestCheckpoint = updatedEvents
        .filter(e => e.event === "Checkpoint")
        .sort((a, b) => b.blockNumber - a.blockNumber)[0];

    // Count ServiceInactivityWarnings since the last Checkpoint
    const warningCount = updatedEvents
        .filter(e => e.event === "ServiceInactivityWarning" && e.blockNumber > latestCheckpoint.blockNumber)
        .length;

    // Calculate total staked services for the past 7 epochs
    const checkpoints = updatedEvents
        .filter(e => e.event === "Checkpoint")
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .slice(0, 8); // Get 8 checkpoints to cover 7 epochs

    let epochsData = [];
    let totalServices = 0;

    for (let i = 0; i < checkpoints.length - 1; i++) {
        const currentCheckpoint = checkpoints[i];
        const epochNumber = Number(ethers.BigNumber.from(currentCheckpoint.args.epoch).toString());
        const totalStakedServices = currentCheckpoint.args.serviceIds.length;
        
        epochsData.push({ epoch: epochNumber, totalStakedServices });
        totalServices += totalStakedServices;
    }

    const averageStakedServices = epochsData.length > 0 ? totalServices / epochsData.length : 0;

    const showPastEpochs = process.argv.includes('--show-past-epochs');
    const showNewEvents = process.argv.includes('--show-new-events');
    const showRecentEventsIndex = process.argv.indexOf('--show-recent-events');
    const showRecentEvents = showRecentEventsIndex !== -1;
    const recentEventsCount = showRecentEvents && process.argv[showRecentEventsIndex + 1] && !isNaN(process.argv[showRecentEventsIndex + 1])
        ? parseInt(process.argv[showRecentEventsIndex + 1])
        : undefined;

    const reportData = [
        ["Date", "Epoch", "Time Remaining in This Epoch", "Current Staked Services", "Available Rewards", "Avg Total Staked Services (7 epochs)", "ServiceInactivityWarnings"],
        [currentDate, epochCounter, timeRemaining, currentNumServices, availableRewards, averageStakedServices.toFixed(2), warningCount]
    ];

    if (isLowBalance) {
        reportData[0].splice(3, 0, "OLAS Balance Low");
        reportData[1].splice(3, 0, `Yes ${availableRewards} OLAS`);
    }

    const csvString = reportData.map(e => e.join(",")).join("\n");
    fs.appendFileSync("stakingReport.csv", csvString + "\n");

    console.log(`Date: \x1b[36m${currentDate}\x1b[0m`);
    console.log(`Epoch: \x1b[36m${epochCounter}\x1b[0m`);
    console.log(`Time Remaining in This Epoch: \x1b[36m${timeRemaining}\x1b[0m`);
    if (isLowBalance) {
        console.log(`\x1b[31mWarning: Low OLAS balance, ${parseFloat(availableRewards).toFixed(2)} OLAS available\x1b[0m`);
    }
    console.log(`Current Staked Services: \x1b[36m${currentNumServices}\x1b[0m`);
    console.log(`Average total staked services per epoch (past 7 epochs): \x1b[36m${averageStakedServices.toFixed(2)}\x1b[0m`);
    console.log(`Number of ServiceInactivityWarnings since last Checkpoint: \x1b[36m${warningCount}\x1b[0m`);
    
    if (showPastEpochs) {
        console.log(`Total staked services in the past 7 epochs:`);
        epochsData.forEach(({ epoch, totalStakedServices }) => {
            console.log(`  Epoch \x1b[36m${epoch}\x1b[0m: \x1b[36m${totalStakedServices}\x1b[0m total staked services`);
        });
    }
    
    if (formattedNewEvents.length > 0) {
        console.log(`Logged ${formattedNewEvents.length} new events to events.json`);
        if (!showNewEvents) {
            console.log("Use --show-new-events flag to see details of these new events.");
        }
    } else {
        console.log("No new events since last run.");
    }

    if (showNewEvents && formattedNewEvents.length > 0) {
        console.log('\nNew events since last run:');
        formattedNewEvents.forEach(event => {
            console.log(`\nEvent: \x1b[36m${event.event}\x1b[0m`);
            
            if (showExtended) {
                console.log(`Description: ${getEventDescription(event.event)}`);
                console.log(`Block Number: ${event.blockNumber}`);
                console.log(`Block DateTime: ${event.blockDateTime}`);
                console.log(`Transaction Hash: ${event.transactionHash}`);
                if (Object.keys(event.args).length > 0) {
                    console.log('Arguments:');
                    Object.entries(event.args).forEach(([key, value]) => {
                        console.log(`  ${key}: ${value.toString()}`);
                    });
                }
            }
        });
    }

    if (showRecentEvents) {
        console.log('\nRecent events:');
        const recentEvents = updatedEvents
            .sort((a, b) => b.blockNumber - a.blockNumber);
        
        const eventsToShow = recentEventsCount ? recentEvents.slice(0, recentEventsCount) : recentEvents;
        
        eventsToShow.forEach(event => {
            console.log(`\nEvent: \x1b[36m${event.event}\x1b[0m`);
            console.log(`Description: ${getEventDescription(event.event)}`);
            console.log(`Block Number: ${event.blockNumber}`);
            console.log(`Block DateTime: ${event.blockDateTime}`);
            console.log(`Transaction Hash: ${event.transactionHash}`);
            if (Object.keys(event.args).length > 0) {
                console.log('Arguments:');
                Object.entries(event.args).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value.toString()}`);
                });
            }
        });

        if (recentEventsCount && recentEvents.length > recentEventsCount) {
            console.log(`\nShowing ${recentEventsCount} of ${recentEvents.length} total events.`);
        }
    }
}

// Add this function to get event descriptions
function getEventDescription(eventName) {
    const descriptions = {
        ServiceStaked: "A service has been staked. Includes epoch number, service ID, owner's address, multisig address, and initial nonces.",
        Checkpoint: "A checkpoint operation has occurred. Includes epoch number, available rewards, eligible service IDs, their rewards, and epoch length.",
        ServiceUnstaked: "A service has been unstaked normally. Includes epoch number, service ID, owner's address, multisig address, final nonces, reward, and available rewards.",
        ServiceForceUnstaked: "A service has been forcefully unstaked. Includes the same information as ServiceUnstaked.",
        RewardClaimed: "A service has claimed its rewards. Includes epoch number, service ID, owner's address, multisig address, current nonces, and claimed reward amount.",
        ServiceInactivityWarning: "A service's inactivity period has increased but hasn't reached the eviction threshold. Includes epoch number, service ID, and current inactivity duration.",
        ServicesEvicted: "One or more services have been evicted due to extended inactivity. Includes epoch number, evicted service IDs, owners' addresses, multisig addresses, and inactivity durations.",
        Deposit: "Tokens or ETH have been deposited into the contract. Includes sender's address, deposited amount, new balance, and available rewards.",
        Withdraw: "Tokens or ETH have been withdrawn from the contract. Includes recipient's address and withdrawn amount."
    };
    return descriptions[eventName] || "No description available for this event.";
}

module.exports = { main };

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
