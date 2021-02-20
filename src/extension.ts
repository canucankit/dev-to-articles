// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	const response = await axios.get('https://dev.to/api/articles')
	const articles = response.data.map( (article: any) => ({
		label: article.title,
		detail: article.description,
		link: article.url,
		social_image: article.social_image,
		tags: article.tag_list,
		user: article.user,
		organization: article.organization,
		readable_publish_date: article.readable_publish_date
	}));

	// Register Command

	let disposable = vscode.commands.registerCommand('dev-to-articles.devToArticles', async () => {
		const article: any = await vscode.window.showQuickPick(articles, { 
			matchOnDetail: true,
			placeHolder: `Search for Dev.to articles...`,
		});
		if (article === null) console.log('no match');

		vscode.env.openExternal(article.link);
		

		const quickPick:any = await vscode.window.createQuickPick();
		quickPick.placeholder = `Search for Dev.to articles...`,
		quickPick.onDidChangeValue(async (value: string) => {
			quickPick.busy = true;
			if (value) {
				const searchList = await axios.get(`https://dev.to/search/feed_content?per_page=60&page=0&search_fields=${value}`)

				if (quickPick.value !== value) return
				quickPick.items = searchList.data.result.map((article: any) => ({
					label: article.title,
					article
				}))
			} else {
				quickPick.items = []
			}

			quickPick.onDidAccept(() => {
				const selectedItem = quickPick.selectedItems[0].article;
				vscode.env.openExternal(vscode.Uri.parse(`https://dev.to${selectedItem.path}`));
			})
			quickPick.busy = true;
		});
		quickPick.show();
		
	});

	// Register Views
	const customSearch: vscode.TreeDataProvider<any> = {
		getChildren() {
			return articles
		},
		getTreeItem(article: any): vscode.TreeItem {
			return {
				label: article.label,
				command: {
					command: `markdown.showPreview`,
					arguments: [
						vscode.Uri.parse(`da://articles/${article.label}#${JSON.stringify(article)}`)
					],
					title: `Dev.to Article: ${article.label}`
				}
			}
		}
	};
	vscode.window.registerTreeDataProvider("dev-to-articles.customSearch", customSearch)

	const tags = (tags: []) => {
		let tagContent = '';
		let colors = ['#186B94', '#CC1034', '#03A062', '#E65339', '#0E412B', '#0E3B51'];
		tags.forEach(tag => {
			tagContent += `<span style="background: ${colors[Math.floor(Math.random() * colors.length)]}; color: white; padding: 1px 4px; margin: 0 2px; border-radius: 3px;">#${tag}</span>`
		})
		return tagContent;
	}
	
	const showMarkDownPage: vscode.TextDocumentContentProvider = {
		provideTextDocumentContent(uri) {
			const article = JSON.parse(uri.fragment);

			return `
<p><img src="${article.social_image}" /></p>
${article.organization ? `<p><img src="${article.organization.profile_image_90}" width="25"/> ${article.organization.name}</p>` : ``}
<h1>${article.label}</h1>
<p>${tags(article.tags)}</p>
<p><img src="${article.user.profile_image_90}" width="25"/> ${article.user.name} | ${article.readable_publish_date}</p>
<p>${article.detail}...<a href="${article.link}" target="blank">continue reading</a></p>
			`
		}
	}

	vscode.workspace.registerTextDocumentContentProvider("da", showMarkDownPage)
	
	// context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}