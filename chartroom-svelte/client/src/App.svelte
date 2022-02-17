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
		'BIONIC', 'ORGANIC', 'DIVINE', 'QUANTUM', 'COSMIC'
	];

	let MINERAL = [
		"THC", "Amethyst", "LSD", "Plutonium", "Azurescens",
		"Exaltium", "Graviton", "Vitalize", "DMT", "Emerald",
		"Meteor", "Jade", "Mercury", "Dex", "Orichalcum",
		"Mythril", "Vulcan", "Titanium", "Einsteinium", "Loop",
	]

	let unboundTokens = [
		// Essences || variant
		...VARIANTS,
		...MINERAL.map(e => e.toUpperCase())
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
		 makeYahToken("TITANIUM", "TITAN"),
		 makeYahToken("PLUTONIUM", "PLUTO"),
		 makeYahToken("EXALTIUM", "EXALT"),
		 makeYahToken("EINSTEINIUM", "EINST"),
		 makeYahToken("AMETHYST", "AMTHY"),
		 makeYahToken("ORGANIC", "ORGAN"),
		 makeYahToken("BIONIC", "BIONIC"),
		 makeYahToken("DIVINE", "DIVINE"),
		 makeYahToken("COSMIC", "COSMIC"),
		 makeYahToken("QUANTUM", "QUANT"), 
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
		return await apiCall(getTotalLandsUrl)
		.then( r => {
			console.log('totalLandsActive Lands => ', r );
			api_data_total_lands = r;
			TOTAL_LANDS =  to_number(r.data.assets) + to_number(r.data.burned);
			return r;
		});


	}

	async function getTotalLandsPerTokenData() {
		landsPerToken = [];
		let page = 1;
		let getTotalLandsPerTokenUrl = api_url + "atomicassets/v1/templates?collection_name=terraformers&schema_name=exp1.lands&page=" + page.toString() + "&limit=1000";
		return await apiCall(getTotalLandsPerTokenUrl).then( r => {
			api_data_total_lands_per_token = r;
			unboundTokensSymbolsData.forEach( (token, index) => {
				if ( !landsPerToken[token.name] ) {
					landsPerToken[token.name] = {
						token,
						totalLands: 0,
						miningPower: 0,
					}
				}
				let mineral_per_tokenMap = r.data.map( template => template.immutable_data.mineral?.toUpperCase() === token.name);
				let mineral_per_token = r.data.filter( template => template.immutable_data.mineral?.toUpperCase() === token.name);
				let variant_per_tokenMap = r.data.map( template => template.immutable_data.variant?.toUpperCase() === token.name);
				let variant_per_token = r.data.filter( template => template.immutable_data.variant?.toUpperCase() === token.name);

				console.log('ON COMPARE', {
					a_token_name: token.name,
					b_assets_per_token: mineral_per_tokenMap,
					mineral_per_token, foundNumberMineral: mineral_per_token.length,
					c_assets_per_token: variant_per_tokenMap,
					variant_per_token, foundNumberVariants: variant_per_token.length,
				});
				
				
				if (mineral_per_token.length === 0) {
					token.TL = 0
				}

				if ( mineral_per_token.length > 0 ) {
					mineral_per_token.forEach( (template) => {
					if ( template.issued_supply > 0) {
							landsPerToken[token.name].totalLands += to_number(template.issued_supply);
					
							let currentUnboundToken = unboundTokensSymbolsData.find(tok => tok.name === token.name);
							currentUnboundToken ? currentUnboundToken.TL = to_number(landsPerToken[token.name].totalLands) : -10;
						
						if (template.immutable_data['mining power']) {
							landsPerToken[token.name].miningPower += Math.round(template.immutable_data['mining power'].toFixed(2) * 100) /100 ;
						}
						if (template.immutable_data.variant) {
							let v = template.immutable_data.variant.toUpperCase();

							
							let currentVariantToken = unboundTokensSymbolsData.find(tok => tok.name === v);
							
							if (VARIANTS.includes(v)) {
								console.log('%c variant is iN TABLE VARIANTS ', 'color:pink', {
									v
								});
							}

							if (!VARIANTS.includes(template.immutable_data.variant.toUpperCase())) {
								console.log('%c Variant NOT IN TABLE VARIANTS ', 'color:green', {
									v,
									mineral: template.immutable_data.mineral.toUpperCase(),
									cd: !VARIANTS.includes(template.immutable_data.mineral.toUpperCase()),
								});
							}
							currentVariantToken && ["QUANTUM", "COSMIC"].includes(currentVariantToken.sym) ? currentVariantToken.TL += to_number(template.issued_supply) : null;
							currentVariantToken && ["QUANTUM", "COSMIC"].includes(currentVariantToken.sym) ? currentVariantToken.TMP += to_number( template.immutable_data['mining power'].toFixed(2)) : null; 
							
							if (landsPerToken.filter(tokenData => tokenData.token === v).length !== 0) {
								landsPerToken.filter(tokenData => tokenData.token === v)[0].totalLands += to_number(template?.issued_supply);	
								landsPerToken.filter(tokenData => tokenData.token === v)[0].miningPower += Math.round(template.immutable_data['mining power'].toFixed(2) * 100) /100 ;
							}
						}
					}
					})
				}

			unboundTokensSymbolsData.forEach( token => {
				if (!VARIANTS.includes(token.name)) {
					totalLandsActive += token.TL ? token.TL : 0;
					totalMinPow += to_number(token.TMP ? token.TMP : 0); // using rpc
				}	

			});

			console.log('Verif Array totalLandsActive ', {
				landsPerToken,
				totalLandsActive, totalMinPow,
				page, unboundTokensSymbolsData,
			});
			return r;
		});
	})	

	}

	async function init() {
		let ret = [];
		ret.push(await initRPC());
		ret.push(await getGlobalTotalLandsData());
		console.log('Run async await TL/Token', ret);
		ret.push(await getTotalLandsPerTokenData());
		console.log('After async await TL/Token', ret);
		return ret;
	};
	// ON INIT EQUIVALENT
	onMount( async() => {
		// await init();

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
					<th>Mineral & Variants</th> 
					<th>Lands (minted)</th>
					<th>Mining Power (minted)</th> 
					<th>% of Total MiningPower (minted)</th>
					<!-- <th>Total Lands (minted + burned)</th> -->
				</thead>
				<tbody>

					{#key unboundTokensSymbolsData}
						{#each unboundTokensSymbolsData as token}
						{#if VARIANTS.includes(token.name)}
							<tr class="variant">
							<td> { unboundTokensSymbolsData.findIndex(tok => token === tok ) + 1 } </td>	
							<td> {token.sym} </td>
							<td> {token.name} </td>
							
							<!-- what is should look like-->
							
							<td> {token.TL ? token.TL : landsPerToken.find(t => t.token === token.name)?.totalLands } </td> 
							<td> { Math.round(token.TMP).toFixed(2) } </td>
							<td> {(100*token.TMP / totalMinPow).toFixed(2)} % </td>
							<!-- 
								<td> {token.TAC} </td>
							<td> {token.TE} </td>
							<td> {token.TWB} </td>
							-->

							

							<!-- {#each landsPerToken as data }
							<td> { data.totalLands } </td>
							<td> { data.mining_power  } </td>
							<td> { ((data.miningPower / (totalMinPow)) * 100).toFixed(2) } % </td>
							{/each} -->
						</tr>
						{:else }	
						<tr class="Minerals">	
						
							<td> { unboundTokensSymbolsData.findIndex(tok => token === tok ) + 1 } </td>
							
							<td> {token.sym} </td>
							<td> {token.name} </td>

							<!-- what is should look like-->
							
							<td> {token.TL} </td> 
							<td> { ( Math.round( (token.TMP) * 100 ) / 100).toFixed(2) } </td>
							<td> {(100*token.TMP / totalMinPow).toFixed(2)} % </td>
							<!--
							<td> {token.TAC} </td>
							<td> {token.TE} </td>
							<td> {token.TWB} </td>
								-->
						</tr>
						{/if}
					{/each}
					{/key}
							

						<!-- {#if (undefined !== api_data_total_lands && api_data_total_lands.success === true ) }  -->
						<tr class="table_footer">
							<td>ALL <br> Minerals <br> Only</td>
							<td> <span class="spacer"></span> </td>
							<td> <span class="spacer"></span> </td>

							<td> 
								(minted) <hr> { totalLandsActive + 39 } 
								<hr><br><hr> 
								(all = minted + burned) <hr> { totalLandsActive + to_number(api_data_total_lands?.data.burned) + 39} 
							</td>
							<td> 
								{ totalMinPow.toFixed(2) }								
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

	.variant {
		background-color: rgb(87, 73, 73); 
		color: lightblue;
		font-weight: bolder;
		font-size: large;
	}

	.Minerals {
		background-color: rgba(25, 175, 185, 0.575); 
		text-decoration-color: #ff3e00 1px;
		color: rgb(0, 0, 0);
		font-weight: bolder;
		font-size: large;
	}

	th {
		background-color: rgba(3, 109, 12, 0.767); 
		color: rgb(0, 0, 0);
		font-weight: 3rem;
		font-size: larger;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
