import './global.css';
import '../dist/output.css';
import '../../client/output.css';
import App from './App.svelte';

const app = new App({
	name: "Terraformers DATA Visualizer",
	target: document.body,
	props: {
		name: 'world',
		devClient: 'TERRAFORMERS'
	}
});

export default app;
