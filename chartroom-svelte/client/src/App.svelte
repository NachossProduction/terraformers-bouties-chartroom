<script lang="ts" defer>
	// imports
	import axios from "axios";
	import { onMount } from 'svelte';
	import { to_number } from "svelte/internal";
	import { Api, JsonRpc } from "eosjs/dist";
	import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';  
	// exports
	export let devClient;


	// Getting Terraminingx Table Infos using Waxjs
	const rpc = new JsonRpc('https://wax.cryptolions.io', { fetch }); //required to read blockchain state
	const defaultPrivateKey = "5JUn1aYoeh8Q6QFGd2YABH55GaWVzeedAHcCvkSZq3ftASEWBvs"; // f2gus.wam
	const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
	const api = new Api({ rpc, signatureProvider });
	
	// global variables
	let api_url = "https://wax.api.atomicassets.io/";	
	let api_data = [];
	let TOTAL_LANDS = undefined;

	let api_data_total_lands = undefined;
	let api_data_total_lands_per_token = undefined;


	let VARIANTS = [
		'BIONIC', 'ORGANIC', 'DIVINE', 'QUANT', 'COSMIC'
	];

	let MINERAL = [
		"THC", "Amethyst", "LSD", "Plutonium", "Azurescens",
		"Exaltium", "Graviton", "Vitalize", "DMT", "Emerald",
		"Meteorite", "Jade", "Mercury", "Dex", "Orichalcum",
		"Mythril", "Vulcan", "Titanium", "Einsteinium", "Loop",
	]

	let unboundTokens = [
		// Essences || variant
		...VARIANTS,
		...MINERAL
	];
	let unboundTokensSymbolsData = [
		 makeYahToken("THC", "THC"),
		 makeYahToken("LSD", "LSD"),
		 makeYahToken("DMT", "DMT"),
		 makeYahToken("DEX", "DEX"),
		 makeYahToken("VITALIZE", "VITA"),
		 makeYahToken("ORICHALCUM", "ORIC"),
		 makeYahToken("VULCAN", "VULC"),
		 makeYahToken("MERCURY", "MERC"),
		 makeYahToken("JADE", "JADE"),
		 makeYahToken("MYTHRIL", "MYTH"),
		 makeYahToken("LOOP", "LOOP"),
		 makeYahToken("METEOR", "MTOR"),
		 makeYahToken("AZURESCENS", "AZUR"),
		 makeYahToken("GRAVITON", "GRAV"),
		 makeYahToken("EMERALD", "EMRLD"),
		 makeYahToken("ORGANIC", "ORGAN"),
		 makeYahToken("TITANIUM", "TITAN"),
		 makeYahToken("PLUTONIUM", "PLUTO"),
		 makeYahToken("EXALTIUM", "EXALT"),
		 makeYahToken("EINSTEINIUM", "EINST"),
		 makeYahToken("AMETHYST", "AMTHY"),
		 makeYahToken("BIONIC", "BIONIC"),
		 makeYahToken("DIVINE", "DIVINE"),
		 makeYahToken("COSMIC", "COSMIC"),
		 makeYahToken("QUANT", "QUANT"), 
	];

	let landsPerToken = [];
	let totalLandsActive = 0; 
	let totalMinPow = 0;

	// MY FUNCTIONS

	function makeYahToken ( name, sym ) {
		return {
			name: name,
			sym: sym,
			// token's wanted values

			TL: 0, TMP: 0, TAC: 0, TE: 0, TWB: 0  
		}
	}

	async function apiCall(url) {
		const { data } = await axios.get(url);
		api_data += data;
		return data;
	}

	async function initRPC() {
			return await rpc.get_table_rows({
				scope: "unboundtoken",
				code: "terraminingx",
				table: "pools",
				limit: 35,
				json: true,
			}).then( r => {
				console.log('RPC RESPONSE => GET TABLE ROWS', {
					rowsMapSym: r.rows.map(el => el.sym_code),
				});

				// TotalMiningPower / Token => TMP
				// will be used to get the Global TMP
				let tmp = r.rows.map(el => [ el.sym_code, el.mining_power ]);
				tmp.forEach(tokenData => {
					unboundTokensSymbolsData.find( token => token.sym === tokenData[0]).TMP = tokenData[1];
				})

				return r.rows.map(el => [ el.sym_code, el.mining_power ]);
			});
	};

	async function getGlobalTotalLandsData() {
		let getTotalLandsUrl = api_url + "atomicassets/v1/schemas/terraformers/exp1.lands/stats";
		await apiCall(getTotalLandsUrl).then( r => {
			console.log('totalLandsActive Lands => ', r );
			api_data_total_lands = r;
			TOTAL_LANDS =  to_number(r.data.assets) + to_number(r.data.burned);
		});

	}

	async function getTotalLandsPerTokenData() {
		landsPerToken = [];
		let page = 1;
		let getTotalLandsPerTokenUrl = api_url + "atomicassets/v1/templates?collection_name=terraformers&schema_name=exp1.lands&page=" + page.toString() + "&limit=1000";
		apiCall(getTotalLandsPerTokenUrl).then( r => {
			api_data_total_lands_per_token = r;
			unboundTokens.forEach( (token, index) => {
				if ( !landsPerToken[token] ) {
					landsPerToken[token] = {
						token,
						totalLands: 0,
						miningPower: 0,
					}
				}
				let per_token = r.data.filter( template => template.immutable_data.mineral === token);



				per_token.forEach( (template,) => {
					if ( template.issued_supply > 0) {
						landsPerToken[token].totalLands += to_number(template.issued_supply);
					}
					if (template.immutable_data['mining power']) {
						landsPerToken[token].miningPower += Math.round(template.immutable_data['mining power'].toFixed(2) * 100) /100 ;
					}
					if (template.immutable_data['variant']) {
						let v = JSON.stringify(template.immutable_data['variant']).replaceAll("\"", "");
						if (landsPerToken.filter(tokenData => tokenData.token === v).length !== 0) {
							landsPerToken.filter(tokenData => tokenData.token === v)[0].totalLands += to_number(template?.issued_supply);	
							landsPerToken.filter(tokenData => tokenData.token === v)[0].miningPower += Math.round(template.immutable_data['mining power'].toFixed(2) * 100) /100 ;
						}
					}
				})
				let minePowerToken = landsPerToken[token] ? landsPerToken[token].miningPower : 0;
				minePowerToken = Math.trunc(minePowerToken *100) /100;

			
			
			})
			landsPerToken.forEach( token => {			
				totalLandsActive += token.totalLands ? token.totalLands : 0;
				totalMinPow += token.mining_power ? token.mining_power : 0; // using rpc
			
			});

			console.log('Verif Array totalLandsActive ', {
				landsPerToken,
				totalLandsActive, totalMinPow,
				page, unboundTokensSymbolsData,
			});
			
		});

	}
	async function init() {
		await initRPC();
		await getGlobalTotalLandsData();
		await getTotalLandsPerTokenData();

	};
	// ON INIT EQUIVALENT
	onMount( async() => {
		init();

	});
</script>

<main class="center text-center mx-auto">
	<h1>Building App for {devClient}</h1>	
	<hr>
	<h2>Params: Collection = terraformers, schemas = exp1.lands </h2>
	<hr>
	<!-- UNBOUND TOKENS <br>{ JSON.stringify(unboundTokens) } -->
	<!-- perTokenCustomDataObject { JSON.stringify(landsPerToken) } -->
	<hr>
	<div class="data-container answerContainer">

		{#if (undefined !== api_data_total_lands && api_data_total_lands.success === true ) } 
			<h3>1 - Total Lands</h3>
			<!-- <p> response => { JSON.stringify(api_data_total_lands) }</p> -->
			<div class="text-center mx-auto md-auto center answerContainer">
				<h4>DATA : </h4> 
				<!-- <p>{ JSON.stringify(api_data_total_lands.data) }</p> -->

				<p>	
					Total Land Assets {-39 + to_number(api_data_total_lands.data.assets) + to_number(api_data_total_lands.data.burned) }  = 
					active_and_inactive_assets { api_data_total_lands.data.assets } +
					burned_assets  { api_data_total_lands.data.burned } - 
					tests_assets yet 39 
				</p>
				<p >	
					<b class="font-medium">			Total Lands Assets = 
					<span class='accent'>
						{ -39 + to_number(api_data_total_lands.data.assets) + to_number(api_data_total_lands.data.burned) }
					</span>
					</b>
					 Lands, <br> distributed around { api_data_total_lands.data.templates } AI generated NFT Templates
				</p>
				<hr>
			</div>
		{/if}
		
		{#await init() then}

			<h3>
				2 - Get Total Lands / Token
					3 - Get Total Mining Power / Token
					4 - Get Total Mining Power % / Token
			</h3>
			<table class="answerContainer mx-10em">
				<thead>
					<th>Index</th>
					<th>Symbol</th>
					<th>Mineral</th> 
					<th>Lands (active)</th>
					<th>Mining Power (active)</th> 
					<th>% of Total MiningPower (active)</th>
					<!-- <th>Total Lands (active + burned)</th> -->
				</thead>
				<tbody>


							
						{#each unboundTokensSymbolsData as token}
							<tr>	
								<td> { unboundTokensSymbolsData.findIndex(tok => token === tok ) + 1 } </td>
								<td> {token.sym} </td>
								<td> {token.name} </td>

								<!-- what is should look like-->
								
								<td> {token.TL} </td> 
								<td> {token.TMP} </td>
								<!-- 
								<td> {(token.TMP / global.TMP).toFixed(2)} % </td>
								<td> {token.TAC} </td>
								<td> {token.TE} </td>
								<td> {token.TWB} </td>
								 -->



								{#each landsPerToken as data }
								<td> { data.totalLands } </td>
								<td> { data.mining_power  } </td>
								<td> { ((data.miningPower / (totalMinPow)) * 100).toFixed(2) } % </td>
								{/each}
							</tr>	
							
						{/each}
						<!-- {#if (undefined !== api_data_total_lands && api_data_total_lands.success === true ) }  -->
						<tr class="table_footer">
							<td>ALL</td>
							<td> { totalLandsActive }
								<hr>{ totalLandsActive + to_number(api_data_total_lands?.data.burned) } (all)
							</td>
							<td> 
								{ totalMinPow }								
							</td>
							<td> 100 % </td>
							<!-- <td> { data.} </td> -->
							<td> </td>
						</tr>	
						<!-- {/if} -->

				</tbody>
			</table>
		{/await}
	</div>
	

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
