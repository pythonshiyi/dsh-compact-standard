# Contributing / 贡献指南

Thanks for helping improve `dsh-compact-standard` / 感谢参与改进。

## Development / 开发

- Node.js >= 22.19
- Run `npm run check` before submitting / 提交前运行 `npm run check`。
- Keep tests zero-dependency / 测试保持零依赖。

## Preset rules / 预设规则

- Do **not** reintroduce `complete: true` on `dsh-persona`; it suppresses plan-mode sections / 不要恢复 `complete: true`，它会压制 plan mode 等提示词段。
- Keep code, commands, formulas, and critical steps complete and executable; never deliberately compress them / 代码、命令、公式、关键步骤必须完整可执行，绝不刻意压缩。

## Submitting / 提交

- Fork, branch, commit, and open a pull request / Fork、建分支、提交并打开 PR。
- Update `README.md` and `README.zh-CN.md` for user-visible changes / 用户可见变更同步更新中英文 README。
- Update `CHANGELOG.md` / 同步更新 `CHANGELOG.md`。

## License / 许可证

MIT. See `LICENSE` and `NOTICE` / 详见 `LICENSE` 与 `NOTICE`。