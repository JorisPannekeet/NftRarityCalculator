#!/usr/bin/env node

/**
 * rarityCalculator
 * Calculates nft rarity
 *
 * @author Joris Pannekeet <.>
 */

const init = require('./utils/init');
const cli = require('./utils/cli');
const log = require('./utils/log');
const data = require('./collections/sleepycat_no_attr.json');
const fs = require('fs');
const dir = './collections/sleepycats';
let nfts = [];
const ranked = [];

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

const calculateTraitRarity = (trait, scores) => {
	const score = 1;
	const type = trait.trait_type;
	const value = trait.value;
	let amount = 1;
	const occurences = nfts.reduce((acc, arr) => {
		if (input.includes(`multifile`)) {
			for (const item of arr.attributes) {
				item.trait_type == type && item.value == value
					? (amount += 1)
					: 1;
			}
		} else {
			for (const item of arr.metadataJson.attributes) {
				item.trait_type == type && item.value == value
					? (amount += 1)
					: 1;
			}
		}
		return amount;
	}, {});
	const traitScore = score / (occurences / nfts.length);
	scores.push(traitScore);
};

const readDir = async () => {
	const fileNames = await fs.promises.readdir(dir);
	for (let file of fileNames) {
		const data = await fs.promises.readFile(`${dir}/${file}`);
		let p = JSON.parse(data);
		// console.log(p);
		nfts.push(p);
	}
};

const getNftData = () => {
	// loop through traits and calculate rarity
	for (i = 0; i < nfts.length; i++) {
		const traitScores = [];
		if (input.includes(`multifile`)) {
			nfts[i].attributes.map(trait => {
				calculateTraitRarity(trait, traitScores);
			});
		} else {
			nfts[i].metadataJson.attributes.map(trait => {
				calculateTraitRarity(trait, traitScores);
			});
		}

		// Calculate sum of all traitscores and add to array
		const sum = traitScores.reduce((partialSum, a) => partialSum + a, 0);
		ranked.push({ ...nfts[i], traitScore: sum });
	}
	writeData();
};

const writeData = () => {
	// Sort high to low
	let sort = ranked.sort((a, b) => {
		return b.traitScore - a.traitScore;
	});
	// Add additional props to final data
	sort = sort.map(
		(item, index) =>
			(item = {
				...item,
				rank: index + 1,
				marketPlaceUrl: input.includes(`multifile`)
					? ''
					: 'https://nft.gamestop.com/token/' +
					  item.contractAddress +
					  '/' +
					  item.tokenId,
				imageUrl: input.includes(`multifile`)
					? item.image.replace(
							'ipfs://',
							'https://www.gstop-content.com/ipfs/'
					  )
					: item.metadataJson.image.replace(
							'ipfs://',
							'https://www.gstop-content.com/ipfs/'
					  ),
				nftIdentifier: parseInt(item.name.split('#').pop())
			})
	);

	// Write data to json file
	const content = JSON.stringify(sort);
	fs.writeFile('./output/output.json', content, err => {
		if (err) {
			console.error(err);
		}
		console.log('Completed, file written to /output/output.json');
		// file written successfully
	});
};

(async () => {
	// CLI settings
	init({ clear });
	input.includes(`help`) && cli.showHelp(0);
	debug && log(flags);

	if (input.includes(`multifile`)) {
		readDir()
			.then(() => {
				//console.log(nfts);
				getNftData();
			})
			.catch(err => {
				console.log(err);
			});
	} else {
		nfts = data.data;
		getNftData();
	}
})();
