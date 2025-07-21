// prefs.js
// See: https://gjs.guide/extensions/development/preferences.html

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// Função principal que será chamada pelo GNOME Shell para criar a interface de preferências
export default class AppToNewWorkspacePreferences {
    constructor(extension) {
        this.extension = extension;
        this.settings = extension.getSettings();
    }

    fillPreferencesWindow(window) {
        // Cria uma página principal para as configurações
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Grupo para a lista de aplicativos
        const group = new Adw.PreferencesGroup({
            title: _('Applications for New Workspaces'),
            description: _('Enter the application IDs (e.g., "firefox.desktop", "org.gnome.Terminal.desktop") that should always open in a new workspace. Press Enter after each ID.'),
        });
        page.add(group);

        // Widget para exibir a lista de aplicativos
        const appsListRow = new Adw.ExpanderRow({
            title: _('Configured Applications'),
        });
        group.add(appsListRow);

        const appsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            valign: Gtk.Align.START,
            halign: Gtk.Align.FILL,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            css_classes: ['boxed-list'], // Estilo visual do GNOME
        });
        appsListRow.add_row(appsListBox);

        // Adiciona um campo de entrada para novos IDs de aplicativos
        const newAppIdEntryRow = new Adw.ActionRow({
            title: _('Add New Application ID'),
            subtitle: _('Type an App ID and press Enter or click "Add"'),
        });
        group.add(newAppIdEntryRow);

        const newAppIdEntry = new Gtk.Entry({
            hexpand: true,
            activates_default: true, // Ativa o botão padrão (Adicionar) ao pressionar Enter
        });
        newAppIdEntryRow.add_suffix(newAppIdEntry); // Adiciona o campo de entrada no final da linha

        const addAppButton = new Gtk.Button({
            label: _('Add'),
            css_classes: ['suggested-action'], // Estilo para botão de ação
        });
        newAppIdEntryRow.add_suffix(addAppButton);

        // --- Funções Auxiliares ---

        // Função para recarregar a lista de aplicativos na interface
        const loadAppsList = () => {
            // Limpa a lista existente
            let child = appsListBox.get_first_child();
            while (child) {
                appsListBox.remove(child);
                child = appsListBox.get_first_child();
            }

            // Pega a lista atual de IDs do GSettings
            const currentApps = this.settings.get_strv('apps-to-new-workspace');

            // Adiciona cada ID à lista na interface
            currentApps.forEach(appId => {
                const row = new Adw.ActionRow({
                    title: appId,
                });
                const removeButton = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    tooltip_text: _('Remove'),
                    css_classes: ['destructive-action'], // Estilo para botão de exclusão
                });
                removeButton.connect('clicked', () => {
                    // Remove o ID do aplicativo da lista e salva
                    const updatedApps = currentApps.filter(id => id !== appId);
                    this.settings.set_strv('apps-to-new-workspace', updatedApps);
                    loadAppsList(); // Recarrega a interface para refletir a mudança
                });
                row.add_suffix(removeButton);
                appsListBox.append(row);
            });
        };

        // Função para adicionar um novo aplicativo
        const addApp = () => {
            const appId = newAppIdEntry.get_text().trim(); // Pega o texto e remove espaços em branco
            if (appId) {
                const currentApps = this.settings.get_strv('apps-to-new-workspace');
                if (!currentApps.includes(appId)) { // Evita duplicatas
                    currentApps.push(appId);
                    this.settings.set_strv('apps-to-new-workspace', currentApps);
                    newAppIdEntry.set_text(''); // Limpa o campo de entrada
                    loadAppsList(); // Recarrega a interface
                } else {
                    // Opcional: mostrar um aviso ao usuário que o ID já existe
                    log(`[AppToNewWorkspacePrefs]: App ID "${appId}" already exists.`);
                }
            }
        };

        // Conecta o botão "Adicionar"
        addAppButton.connect('clicked', addApp);

        // Conecta o evento 'activate' do campo de entrada (pressionar Enter)
        newAppIdEntry.connect('activate', addApp);

        // Carrega a lista inicial de aplicativos ao abrir as preferências
        loadAppsList();
    }
}
