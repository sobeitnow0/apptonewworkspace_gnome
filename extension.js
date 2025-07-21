import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

export default class AppToNewWorkspaceExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._signalId = null;
        this._appSystem = Shell.AppSystem.get_default();
    }

    enable() {
        this._settings = this.getSettings();

        this._signalId = this._appSystem.connect('app-state-changed', (appSys, app) => {
            if (app.state !== Shell.AppState.RUNNING)
                return;

            const appId = app.get_id();
            const targetApps = this._settings.get_strv('apps-to-new-workspace');

            if (targetApps.includes(appId)) {
                this._moveAppToNewWorkspace(app);
            }
        });
    }

    disable() {
        if (this._signalId) {
            this._appSystem.disconnect(this._signalId);
            this._signalId = null;
        }
        this._settings = null;
    }

    _moveAppToNewWorkspace(app) {
        const workspaceManager = global.workspace_manager;

        const newIndex = workspaceManager.append_new_workspace(false, global.get_current_time());
        const newWorkspace = workspaceManager.get_workspace_by_index(newIndex);

        newWorkspace.activate(global.get_current_time());

        // Aguarda janelas aparecerem e move-as
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const windows = app.get_windows();
            for (const win of windows) {
                if (win && win.change_workspace) {
                    win.change_workspace(newWorkspace);
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }
}

