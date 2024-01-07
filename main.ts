import { writeFile } from "fs/promises";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkObsidian from "remark-obsidian";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
// Remember to rename these classes and interfaces!

// TODO: ElevenLabs audio generator

interface MyPluginSettings {
	elevenlabsApiKey: string;
	elevenlabsVoiceId: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	elevenlabsApiKey: "",
	elevenlabsVoiceId: "",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async generateAudio(text: string, name: string) {
		if (
			!this.settings.elevenlabsApiKey ||
			!this.settings.elevenlabsVoiceId
		) {
			new Notice(
				"Please configure your ElevenLabs API key and Voice ID in the plugin settings.",
			);
			return;
		}

		// const render = await remark()
		// 	.use(remarkObsidian)
		// 	.use(remarkRehype, { allowDangerousHtml: true })
		// 	.process(text);
		// console.log(render.toString());
		// console.log(text);

		const result = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${this.settings.elevenlabsVoiceId}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key": this.settings.elevenlabsApiKey,
				},
				body: JSON.stringify({
					text,
					voice_settings: {
						similarity_boost: 0.4,
						stability: 0.4,
						use_speaker_boost: true,
					},
				}),
			},
		);
		await this.app.vault.createBinary(
			`audios/${name}.mp3`,
			await result.arrayBuffer(),
		);
		return;
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"microphone",
			"Generate Audio",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				const note =
					this.app.workspace.activeEditor?.editor?.getValue();

				if (!note || !this.app.workspace.activeEditor?.file?.path) {
					new Notice("Please open a note to generate audio.");
					return;
				}

				const withoutFrontmatter = note?.split("---")[2];

				this.generateAudio(
					withoutFrontmatter || "",
					this.app.workspace.activeEditor?.file?.path || "",
				);
				new Notice(
					`Audio generated for note '${this.app.workspace.activeEditor?.file?.name}'!`,
				);
			},
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("digital-garden-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("Elevenlabs API Key").addText((text) =>
			text
				.setPlaceholder("Enter your ElevenLabs API key")
				.setValue(this.plugin.settings.elevenlabsApiKey)
				.onChange(async (value) => {
					this.plugin.settings.elevenlabsApiKey = value;
					await this.plugin.saveSettings();
				}),
		);

		new Setting(containerEl)
			.setName("Elevenlabs Voice ID")
			.addText((text) =>
				text
					.setPlaceholder("Enter your ElevenLabs Voice ID")
					.setValue(this.plugin.settings.elevenlabsVoiceId)
					.onChange(async (value) => {
						this.plugin.settings.elevenlabsVoiceId = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
