# 《青史生存录》规则收口（v1.6.2 · 单一事实源索引）

> 本文件是**索引**，不是第二份规格。一切以仓库根目录《青史生存录》游戏设计文档-v0.9.md（下称 GDD）为准——本文件只把"改数值/规则时先看哪里"钉死，避免策划案、代码、测试三方口径漂移。
> 引擎注释中的 `GDD x.y` / `GDD 附录 X` 引用均指向该文档。

## 规则归属速查

| 规则 | 权威出处 | 实装位置 |
|---|---|---|
| 回合规则（关键卡被动倒计时 / 行动卡×3 / 收益递减） | GDD 3.1 ・ 附录 L | `engine.js` beginRounds/playCard/_advanceRound |
| 蓄势（策略牌：放弃出牌，下次事件抉择险招 +10，抉择即清空） | GDD 附录 N.1（语义定稿为"下一次事件抉择"，含际遇） | `engine.js` playXushi/choose |
| 险招（软门槛六档 / 史实升一档 / 失败烧毁） | GDD 附录 J（史实升档见 J.0 与附录 M） | `engine.js` checkRisk/riskRate/riskRateHist/_rollRisk |
| 危机与死亡（危机≥100 致死、构陷、清算） | GDD 4.1 / 4.3 | `engine.js` checkDeath 及危机注入 |
| 回溯（章首快照；清 xushi/_burned；不重置偏离/成就/图鉴） | GDD 6.4 ・ 附录 O.0（P0-1） | `engine.js` backtrack |
| 随机流（risk/event/corr 独立流，惰性派生，可注入） | GDD 附录 N.2 | `engine.js` _stream |
| **回溯恢复历史状态，不恢复随机命运**（不存 rng 状态，章首重入不保证相同随机序列——设计原则） | GDD 附录 N.2 / P（本版定稿） | — |
| 结局评分公式（四维 0–100；总分允许破 100） | GDD 5.x 评分模型（v1.6.1 已与引擎统一） | `engine.js` 结局结算（gongye/cuncun/shiping/yingxiang） |
| 评级（S/A/B/C/D 分数线） | GDD 评分模型 | 同上 |
| 存档（剧情/普通章首存档；硬核无存档；坏档清除回主页） | GDD 6.4 | `js/ui-home.js` / `engine.js` exportSave/importSave |
| 三难度（剧情/普通/硬核的数值与信息口径） | GDD 4.4 | 各数据文件 DIFFICULTY |
| 硬核信息隐藏（属性状态词 / 掷骰只显档位词） | GDD 4.4 ・ 附录 O.0（P0-2） | `engine.js` riskTitle / `js/*` hideAttrs 分支 |
| 平衡验收口径（单属性策略=压力测试非门槛） | GDD 第十章 #25（v1.6.1 修订） | `balance-sim.js` |

## 修改纪律

1. 改任何规则数值/口径：**先改 GDD 对应章节，再改代码，再补/改测试断言**，三者同批提交。
2. 新机制一律进附录（当前至附录 P），正文只放稳定规则。
3. 引擎注释引用 GDD 章节号必须与文档实际编号一致，发现漂移顺手修正。
