# dsh-harness-autostart

让 **DeepSeek Harness** 随 Windows 开机自动启动的 DSH 插件。控制入口有两个：**设置 → 通用**里的一个开关，以及模型可以调用的 `dsh_autostart` 工具。

仅支持 Windows。其它平台上开关显示为禁用，工具返回 `unsupported-platform`。

## 它写了什么

默认方式（`method: run-key`）只在当前用户的 Run 键下写一个字符串值，因此不需要管理员权限：

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    DeepSeekHarness    REG_SZ    "D:\ProgramData\dsh\DeepSeek Harness.exe"
```

可执行文件路径由探测得来，不是写死的：优先 `DSH_DESKTOP_EXE`，其次取当前进程可执行文件（当它不是 `node.exe` 时），最后回退到默认安装路径。想指定就用配置里的 `executable`。

`method: startup-folder` 改为写一个启动器：
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\<entryName>.cmd` —— 需要延迟启动时走这条路。

卸载插件会一并删除启动项，不留残留。

## 安装

通过 DSH 里的插件管理器安装：

```
plugin_manager action=install_bundle target=dsh-harness-autostart
```

本地目录也可以用同一个动作，`target` 换成目录绝对路径。

装好后 **设置 → 通用** 里会多出一行「开机自启」，位置在「性能占用」下面。插件条目 id 是 `dsh-autostart`。

## 开关

- 控件是带 `aria-checked` 的 `role="switch"` 按钮；Tab 聚焦，空格切换。
- 切换会立刻写入或删除启动项 —— 不重载页面，也不经过模型。
- 行内实时显示当前状态、写入方式、条目名和解析出的可执行文件路径。
- 状态读取与切换都走同源 `fetch` 到 Host 半边注册的本机路由：`GET /dsh-autostart-8f3c/status`、`POST .../enable`、`POST .../disable`，三者都返回 JSON。
- 浏览器半边是 `client.js`，由 `package.json` 的 `dsh.client` 声明。它只负责渲染，所有注册表与文件系统写入都留在 Host 半边 `index.js`。

## 工具

插件另外注册了一个工具 `dsh_autostart`，只有一个 `action` 参数：

| action | 作用 |
| --- | --- |
| `status` | 当前状态、写入方式、条目名、解析出的可执行文件，以及实际存在的 Run 值 / 启动文件路径 |
| `enable` | 写入启动项 |
| `disable` | 删除启动项 |

两个入口调用同一组 Host 函数，因此不会出现状态不一致。

## 配置

改 `cordis.patch.yml` 里 `dsh-autostart` 条目的 `config`，重启 DSH 后生效。

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `autoEnable` | `true` | 插件加载时自动写入启动项。`false` 时只注册工具和开关，不动系统。 |
| `method` | `run-key` | `run-key` 写 `HKCU\...\CurrentVersion\Run`（免管理员）；`startup-folder` 写启动文件夹里的 `.cmd`。 |
| `entryName` | `DeepSeekHarness` | Run 值名称，或启动文件夹里的文件名。会清洗成 `[A-Za-z0-9_.-]`。 |
| `executable` | `''` | 留空表示自动探测。 |
| `args` | `[]` | 传给应用的额外参数。 |
| `delaySeconds` | `0` | 登录后等多少秒再拉起。非 0 时在 Run 键里包一层 `cmd /c start`，或往 `.cmd` 里加 `timeout`。 |

## 卸载

```
plugin_manager action=remove_bundle target=dsh-harness-autostart
```

卸载会删除启动项。万一有残留，手动清掉：

```
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v DeepSeekHarness /f
```

## 开发

没有构建步骤。`index.js` 是 Host 半边，`client.js` 是浏览器半边，都是直接发布的普通 ESM。

## 许可

MIT
