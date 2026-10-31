# dsh-harness-autostart

A DeepSeek Harness plugin that makes the desktop app start with Windows, and gives you two ways to
control that startup entry: a switch in **Settings → General**, and a `dsh_autostart` tool the model
can call.

Windows only. On other platforms the switch renders disabled and the tool reports
`unsupported-platform`.

## What it writes

The default (`method: run-key`) writes one string value under the current user's Run key, so it never
needs administrator rights:

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    DeepSeekHarness    REG_SZ    "D:\ProgramData\dsh\DeepSeek Harness.exe"
```

The executable path is detected, not hard-coded: `DSH_DESKTOP_EXE` if set, otherwise the current
process executable when it is not `node.exe`, otherwise the default install path. Set `executable` in
the config to override it.

`method: startup-folder` writes a launcher instead, at
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\<entryName>.cmd` — that is the way to get a
delay before the app opens.

Removing the plugin removes the startup entry. Nothing is left behind.

## Install

From npm, through the plugin manager in DSH:

```
plugin_manager action=install_bundle target=dsh-harness-autostart
```

Or from a local checkout:

```
plugin_manager action=install_bundle target=<absolute path to this directory>
```

After it installs, **Settings → General** grows a row titled "Autostart", directly below
"Performance usage". The plugin entry id is `dsh-autostart`.

## The switch

- The control is a `role="switch"` button carrying `aria-checked`; tab to it, press space to toggle.
- Toggling writes or deletes the startup entry immediately — no page reload, no model round trip.
- The row shows the live state, the write method, the entry name and the resolved executable path.
- Reading and toggling go through a same-origin `fetch` to a local HTTP route the host half registers:
  `GET /dsh-autostart-8f3c/status`, `POST .../enable`, `POST .../disable`. All three return JSON.
- The browser half lives in `client.js` and is declared by `dsh.client` in `package.json`. It renders
  only; every registry and filesystem write stays in `index.js`, the host half.

## The tool

The plugin also registers one tool, `dsh_autostart`, with a single `action` parameter:

| action | effect |
| --- | --- |
| `status` | Current state, write method, entry name, resolved executable, and the value or file path actually present |
| `enable` | Writes the startup entry |
| `disable` | Deletes the startup entry |

Both surfaces call the same host functions, so they cannot disagree.

## Configuration

Edit the `config` block of the `dsh-autostart` entry in `cordis.patch.yml`, then restart DSH.

| key | default | meaning |
| --- | --- | --- |
| `autoEnable` | `true` | Write the startup entry when the plugin loads. `false` registers the tool and the switch but leaves the system alone. |
| `method` | `run-key` | `run-key` writes `HKCU\...\CurrentVersion\Run` (no admin needed); `startup-folder` writes a `.cmd` into the Startup folder. |
| `entryName` | `DeepSeekHarness` | Name of the Run value, or the file name in the Startup folder. Sanitised to `[A-Za-z0-9_.-]`. |
| `executable` | `''` | Empty means auto-detect. |
| `args` | `[]` | Extra arguments passed to the app. |
| `delaySeconds` | `0` | Wait this long after login before launching. Non-zero wraps the command in `cmd /c start` (Run key) or adds `timeout` to the `.cmd`. |

## Uninstall

```
plugin_manager action=remove_bundle target=dsh-harness-autostart
```

Uninstalling deletes the startup entry. If something goes wrong, remove it by hand:

```
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v DeepSeekHarness /f
```

## Development

No build step. `index.js` is the host half, `client.js` is the browser half, both plain ESM that ship
as-is.

## License

MIT
