# 隔离与退出方案

- 原工作区：`E:/Masterpiece-OS-Main-Publish-20261015-Verified`，本地 `main`。
- 本轮恢复提交：`98bcac78943bd97a24d8f536ada833a929b31672`。这是本轮起点，不替代仓库历史 freeze PIN，也不宣布新的质量冻结。
- 实验分支：`experiment/design-decision-methodology`。
- 独立工作区：`E:/MP-methodology`。
- 原工作区开始时 clean，所有业务修改禁止落在原工作区。

## 为什么退出不会覆盖原效果

本轮仅新增文档与显式运行的离线测试，不启动 Web、不加载用户凭据、不写用户项目，也不修改任何原有 tracked 文件。实验依赖独立安装，根 lockfile 不修改。原工作区继续使用现有代码和项目数据。

## 立即退出

继续从原工作区启动既有应用即可；原工作区始终停在上述提交，不需要 reset、revert 或复制覆盖任何文件。实验分支可以保留供复核，不必删除。不要将实验目录的项目数据、配置或生成结果复制回正式 userData。

后续若做运行验证，必须先为实验指定独立 userData 和端口，验证路径、项目与凭据所有权，采用用户主动触发的一次性复制；不得自动共享或同步正式数据。任何接入/合并应是后续单独可审查的变更，且要保留本轮恢复提交。

## 复核命令

在原工作区执行 `git rev-parse HEAD`、`git status --porcelain`；应分别为上述提交和空输出。

在实验工作区执行 `git diff 98bcac78943bd97a24d8f536ada833a929b31672 --name-status`；本轮所有路径应为新增的 methodology 文档与测试。任何 src、Prompt、Golden、lockfile、implementation-integrity 或共享宿主改动都超出本轮范围，应停止接入评估。

真实生图具有随机性。这里保证的是原代码、输入和运行环境不被本实验改写，不承诺未来重复调用逐像素复现历史图片。
