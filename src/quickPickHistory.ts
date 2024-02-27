import * as vscode from 'vscode';

export async function quickPickHistory(items: string[], context: vscode.ExtensionContext) {
    const key = `grep.quick.pick.cache${vscode.workspace.getWorkspaceFolder()?.uri || ""}`;
    let cache = context.globalState.get<QuickPickHistory[]>(key);
    
    if (cache === undefined || cache.map((e) => { return e.title; }).sort() === items.sort()) {
        cache = [];
        let i = 0;
        const date = Date.now();
        for (let item of items) {
            cache.push({
                title: item,
                order: i,
                date: date
            });
            ++i;
        }
    } else {
        cache.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date - a.date;
            }
            return a.order - b.order;
        });
    }

    let option = await vscode.window.showQuickPick(cache.map((e) => { return e.title; }));
    if (option === undefined) {
        return undefined;
    }
    for (let item of cache) {
        if (item.title === option) {
            item.date = Date.now();
        }
    }
    context.globalState.update(key, cache);

    return option;
}

interface QuickPickHistory {
    title: string;
    order: number;
    date: number;
}