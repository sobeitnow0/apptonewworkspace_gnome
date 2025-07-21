/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Meta from "gi://Meta";
import Gio from "gi://Gio";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

export default class AppToNewWorkspaceExtension extends Extension {

    constructor() {
        super();
        this._appIdTracker = new Set(); // Para evitar mover a mesma janela múltiplas vezes
        this._handles = [];
        this.settings = null; // Inicializar settings
    }

    enable() {
        this.settings = this.getSettings(); // Carrega as configurações da extensão

        // Conecta ao sinal 'created' do window_manager para capturar janelas recém-criadas
        this._handles.push(global.window_manager.connect('created', (_, metaWindow) => {
            // Um pequeno atraso para garantir que a janela e seu aplicativo estejam totalmente inicializados
            // antes de tentar movê-la para um novo workspace.
            Main.timeout_add(100, () => this._handleNewWindow(metaWindow));
        }));

        // Limpa o tracker de IDs de aplicações quando um workspace é removido,
        // ou quando a extensão é reabilitada (garante um estado limpo).
        this._handles.push(global.workspace_manager.connect('workspace-removed', () => {
             this._appIdTracker.clear();
        }));
    }

    disable() {
        // Desconecta todos os handlers para evitar vazamento de memória
        this._handles.splice(0).forEach(h => global.window_manager.disconnect(h));

        // Limpa o tracker e as configurações
        this._appIdTracker.clear();
        this.settings = null;
    }

    /**
     * Verifica se a janela é um tipo normal e não está sempre em todos os workspaces.
     * @param {Meta.Window} win - A janela Meta.
     * @returns {boolean} True se for uma janela normal e não estiver em todos os workspaces.
     */
    _isNormalWindow(win) {
        return (win.window_type === Meta.WindowType.NORMAL) && !win.is_always_on_all_workspaces();
    }

    /**
     * Lida com uma nova janela criada, verificando se deve ser movida.
     * @param {Meta.Window} metaWindow - A janela Meta a ser verificada.
     */
    _handleNewWindow(metaWindow) {
        if (!this._isNormalWindow(metaWindow)) {
            return;
        }

        const app = metaWindow.get_application();
        if (!app) {
            return;
        }

        const appId = app.get_id();
        const configuredAppIds = this.settings.get_strv('apps-to-new-workspace');

        // Verifica se o ID da aplicação está na lista configurada
        // e se já não processamos essa janela específica (para evitar mover a mesma janela várias vezes)
        if (configuredAppIds.includes(appId) && !this._appIdTracker.has(metaWindow.get_stable_sequence())) {
            this._placeOnNewWorkspace(metaWindow);
            // Adiciona a sequência da janela ao tracker para evitar reprocessamento
            this._appIdTracker.add(metaWindow.get_stable_sequence());
            log(`[AppToNewWorkspace]: Moved app '${appId}' to a new workspace.`);
        }
    }

    /**
     * Move a janela para um novo workspace e ativa esse workspace.
     * @param {Meta.Window} metaWindow - A janela Meta a ser movida.
     */
    _placeOnNewWorkspace(metaWindow) {
        const manager = global.workspace_manager;

        // Adiciona um novo workspace no final
        manager.append_new_workspace(false, global.get_current_time());
        const newWorkspaceIndex = manager.n_workspaces - 1;
        const newWorkspace = manager.get_workspace_by_index(newWorkspaceIndex);

        // Move a janela para o novo workspace
        metaWindow.change_workspace(newWorkspace);

        // Ativa o novo workspace para focar nele
        newWorkspace.activate(global.get_current_time());
    }
}
