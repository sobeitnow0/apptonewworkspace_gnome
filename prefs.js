import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

const AppToNewWorkspacePrefs = class {
    constructor() {
        // Inicialização opcional
    }

    fillPreferencesWindow(window) {
        const settings = new Gio.Settings({
            schema_id: 'org.gnome.shell.extensions.apptonewworkspace',
        });

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Aplicativos em Novo Workspace',
            description: 'Adicione arquivos .desktop dos apps que devem iniciar sempre em um novo espaço de trabalho.',
        });

        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            margin_top: 12,
            margin_bottom: 12,
        });

        function updateList() {
            listBox.remove_all();

            const apps = settings.get_strv('apps-to-new-workspace');
            for (const appId of apps) {
                const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });

                const label = new Gtk.Label({
                    label: appId,
                    xalign: 0,
                    hexpand: true,
                });

                const removeButton = new Gtk.Button({ label: 'Remover' });
                removeButton.connect('clicked', () => {
                    const updated = apps.filter(id => id !== appId);
                    settings.set_strv('apps-to-new-workspace', updated);
                    updateList();
                });

                row.append(label);
                row.append(removeButton);
                listBox.append(row);
            }
        }

        const entry = new Gtk.Entry({
            placeholder_text: 'Ex: firefox.desktop',
            hexpand: true,
        });

        const addButton = new Gtk.Button({ label: 'Adicionar' });
        addButton.connect('clicked', () => {
            const text = entry.get_text().trim();
            if (text) {
                const apps = settings.get_strv('apps-to-new-workspace');
                if (!apps.includes(text)) {
                    apps.push(text);
                    settings.set_strv('apps-to-new-workspace', apps);
                    entry.set_text('');
                    updateList();
                }
            }
        });

        const entryBox = new Gtk.Box({ spacing: 6 });
        entryBox.append(entry);
        entryBox.append(addButton);

        group.add(entryBox);
        group.add(listBox);
        page.add(group);

        updateList();

        window.set_title('Configurações – App em Novo Workspace');
        window.add(page
