// dsh-harness-autostart —— 浏览器半边：在「设置 → 通用」里放一行开机自启开关。
// 这一层只做展示与触发；真正的注册表 / 启动文件夹读写都在 Host 半边的 HTTP 路由里。
window.__ModuleLoader__.load({
  id: 'dsh-harness-autostart',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-autostart';
    const ROUTE = '/dsh-autostart-8f3c';
    const PREFIX = 'dsAuto_';

    // 控件与行样式照抄宿主 Switch / DeveloperToolsRow 的标记与尺寸，只保留 --dsw-alias-* 主题 token。
    const CSS = `
.${PREFIX}row{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:24px;padding:16px 0;display:flex}
.${PREFIX}text{min-width:0}
.${PREFIX}title{font-size:14px;line-height:20px}
.${PREFIX}description{color:var(--dsw-alias-label-secondary);margin-top:4px;font-size:12px;line-height:18px}
.${PREFIX}error{color:var(--dsw-alias-state-error-primary);margin-top:4px;font-size:12px;line-height:18px}
.${PREFIX}meta{color:var(--dsw-alias-label-secondary);margin-top:4px;font-size:12px;line-height:18px;overflow-wrap:anywhere}
.${PREFIX}switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3,var(--dsw-alias-border-l2));cursor:pointer}
.${PREFIX}switch[aria-checked=true]{background:var(--dsw-alias-brand-primary)}
.${PREFIX}switch:disabled{cursor:default;opacity:.5}
.${PREFIX}switch:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}
.${PREFIX}thumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground,#fff);transition:transform .12s ease}
.${PREFIX}switch[aria-checked=false] .${PREFIX}thumb{background:var(--dsw-alias-switch-thumb,#fff)}
.${PREFIX}switch[aria-checked=true] .${PREFIX}thumb{transform:translate(16px)}
@media (prefers-reduced-motion:reduce){.${PREFIX}thumb{transition:none}}
`;

    const zh = {
      'title': '开机自启',
      'description': 'Windows 启动时自动打开 DeepSeek Harness。',
      'on': '已启用',
      'off': '未启用',
      'error': '开关切换失败，请查看插件是否正常运行。',
      'loading': '正在读取启动项…',
      'method.run-key': '注册表 Run 键',
      'method.startup-folder': '启动文件夹',
      'entry': '条目名',
      'target': '可执行文件',
      'unsupported': '当前系统不支持该启动项。',
    };
    const en = {
      'title': 'Autostart',
      'description': 'Open DeepSeek Harness automatically when Windows starts.',
      'on': 'Enabled',
      'off': 'Disabled',
      'error': 'Could not change the startup entry.',
      'loading': 'Reading the startup entry…',
      'method.run-key': 'Registry Run key',
      'method.startup-folder': 'Startup folder',
      'entry': 'Entry',
      'target': 'Executable',
      'unsupported': 'This startup entry is not supported on this system.',
    };

    /** 自绘开关，标记与行为与宿主 Switch 一致（role="switch" + aria-checked）。 */
    function Switch({ checked, disabled, label, onChange }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        disabled: Boolean(disabled),
        className: PREFIX + 'switch',
        onClick: () => { onChange(!checked); },
      }, h('span', { className: PREFIX + 'thumb' }));
    }

    function readJson(response) {
      return response.json().catch(() => ({}));
    }

    /** 设置里的这一行：自己读状态、自己写状态。 */
    function AutostartRow({ t }) {
      const [state, setState] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [failed, setFailed] = React.useState(false);

      React.useEffect(() => {
        let live = true;
        fetch(ROUTE + '/status', { cache: 'no-store' })
          .then(readJson)
          .then((value) => { if (live) setState(value); })
          .catch(() => { if (live) setFailed(true); });
        return () => { live = false; };
      }, []);

      const enabled = state !== null && state.enabled === true;
      const unsupported = state !== null && state.platform !== undefined && state.platform !== 'win32';

      const onChange = (next) => {
        setFailed(false);
        setBusy(true);
        fetch(ROUTE + (next ? '/enable' : '/disable'), { method: 'POST', cache: 'no-store' })
          .then(readJson)
          .then((value) => {
            if (value && value.ok === false && value.reason) setFailed(true);
            setState((previous) => ({ ...(previous || {}), ...value }));
          })
          .catch(() => { setFailed(true); })
          .finally(() => { setBusy(false); });
      };

      const detail = [];
      if (state !== null) {
        if (state.method) detail.push(t('method.' + state.method));
        if (state.entryName) detail.push(t('entry') + '：' + state.entryName);
        if (state.executable) detail.push(t('target') + '：' + state.executable);
      }

      const children = [
        h('div', { key: 'title', className: PREFIX + 'title' }, t('title')),
        h('div', { key: 'desc', className: PREFIX + 'description' }, t('description')),
      ];
      if (state === null) children.push(h('div', { key: 'meta', className: PREFIX + 'meta' }, t('loading')));
      else if (unsupported) children.push(h('div', { key: 'meta', className: PREFIX + 'meta' }, t('unsupported')));
      else children.push(h('div', { key: 'meta', className: PREFIX + 'meta' }, (enabled ? t('on') : t('off')) + ' · ' + detail.join(' · ')));
      if (failed) children.push(h('div', { key: 'error', role: 'alert', className: PREFIX + 'error' }, t('error')));

      return h('div', { className: PREFIX + 'row' }, [
        h('div', { key: 'text', className: PREFIX + 'text' }, children),
        h(Switch, {
          key: 'switch',
          checked: enabled,
          disabled: busy || state === null || unsupported,
          label: t('title'),
          onChange,
        }),
      ]);
    }

    function installStyles() {
      const id = 'dsh-harness-autostart/settings.css';
      const existing = document.querySelector('style[data-plugin-css=' + JSON.stringify(id) + ']');
      if (existing !== null) return () => {};
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-harness-autostart';
      tag.dataset.pluginCss = id;
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => { tag.remove(); };
    }

    return {
      name: 'dsh-autostart',
      inject: ['slots', 'locale'],
      apply(ctx) {
        if (typeof document !== 'undefined') {
          ctx.effect(() => installStyles(), 'dsh-autostart: settings styles');
        }
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-autostart: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({
          name: 'settings.general.item',
          id: 'autostart',
          order: 31,
          locale: NS,
          inject: () => ({ t }),
        }, AutostartRow));
      },
    };
  },
});
