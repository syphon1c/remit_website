// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// One project: marketing pages under src/pages, the manual under /docs/ (Starlight).
// Light only — the theme provider is overridden to pin data-theme="light" and the picker
// is removed; there is no dark palette anywhere in src/styles.
export default defineConfig({
	site: 'https://remit-ai.app',
	integrations: [
		starlight({
			title: 'Remit',
			description: 'The manual for Remit: the governed AI coworker, Remit Cloud, and self-hosting.',
			favicon: '/favicon.svg',
			logo: { src: './src/assets/mark.svg', alt: 'Remit' },
			customCss: [
				'@fontsource-variable/bricolage-grotesque/wght.css',
				'@fontsource/ibm-plex-sans/400.css',
				'@fontsource/ibm-plex-sans/400-italic.css',
				'@fontsource/ibm-plex-sans/500.css',
				'@fontsource/ibm-plex-sans/600.css',
				'@fontsource/ibm-plex-mono/400.css',
				'@fontsource/ibm-plex-mono/500.css',
				'./src/styles/tokens.css',
				'./src/styles/docs.css',
			],
			components: {
				ThemeProvider: './src/components/starlight/ThemeProvider.astro',
				ThemeSelect: './src/components/starlight/ThemeSelect.astro',
				SiteTitle: './src/components/starlight/SiteTitle.astro',
			},
			// One code theme, so code blocks never depend on the data-theme attribute.
			expressiveCode: { themes: ['starlight-light'] },
			// The site has its own 404 in src/pages; Starlight's would collide with it.
			disable404Route: true,
			credits: false,
			lastUpdated: false,
			pagination: true,
			sidebar: [
				{ label: 'Start here', items: [
					{ label: 'The manual', slug: 'docs' },
					{ label: 'Getting started', slug: 'docs/coworker/getting-started' },
					{ label: 'Using Remit', slug: 'docs/coworker/using-remit' },
				] },
				{ label: 'Remit Coworker', items: [
					{ label: 'Configuration', slug: 'docs/coworker/configuration' },
					{ label: 'Security model', slug: 'docs/coworker/security' },
					{ label: 'Outside content', slug: 'docs/coworker/outside-content' },
					{ label: 'Connectors: Slack', slug: 'docs/coworker/connectors/slack' },
					{ label: 'How updates work', slug: 'docs/coworker/updates' },
				] },
				{ label: 'Remit Cloud', items: [
					{ label: 'Overview', slug: 'docs/cloud/overview' },
					{ label: 'Organisations', slug: 'docs/cloud/organisations' },
					{ label: 'The console', slug: 'docs/cloud/console' },
					{ label: 'Policy', slug: 'docs/cloud/policy' },
					{ label: 'What the server holds', slug: 'docs/cloud/evidence' },
					{ label: 'Threat model', slug: 'docs/cloud/threat-model' },
					{ label: 'Curating the gallery', slug: 'docs/cloud/gallery-curating' },
					{ label: 'Sharing coworkers', slug: 'docs/cloud/sharing' },
					{ label: 'The gallery', slug: 'docs/cloud/gallery' },
					{ label: 'Authentication', slug: 'docs/cloud/auth' },
					{ label: 'Billing', slug: 'docs/cloud/billing' },
				] },
				{ label: 'Self-hosting', items: [
					{ label: 'The broker', slug: 'docs/self-hosting/broker' },
					{ label: 'Curating a broker gallery', slug: 'docs/self-hosting/broker-curating' },
					{ label: 'Broker authentication', slug: 'docs/self-hosting/broker-auth' },
					{ label: 'Broker sharing', slug: 'docs/self-hosting/broker-sharing' },
					{ label: 'Deploying Remit Cloud', slug: 'docs/self-hosting/cloud-deployment' },
					{ label: 'Operating Remit Cloud', slug: 'docs/self-hosting/cloud-operations' },
					{ label: 'Key custody', slug: 'docs/self-hosting/key-custody' },
				] },
				{ label: 'Reference', items: [
					{ label: 'Architecture', slug: 'docs/developers/architecture' },
					{ label: 'Runtime API', slug: 'docs/developers/api' },
					{ label: 'Remit Cloud API', slug: 'docs/developers/cloud-api' },
					{ label: 'Broker API', slug: 'docs/developers/broker-api' },
				] },
			],
		}),
	],
});
