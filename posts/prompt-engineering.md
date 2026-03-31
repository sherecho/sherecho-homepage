---
title: Prompt Engineering 进阶：让大模型稳定输出结构化数据
category: AI 技术
date: 2026-02-22
tags:
  - Prompt
  - LLM
  - 技巧
readTime: 9
---

在构建 AI Agent 和自动化工作流时，一个核心挑战是让 LLM **稳定、可靠地输出结构化数据**。不像聊天场景中自由的文本输出，生产环境需要的是可解析、可验证的 JSON / XML / YAML。

## 问题是什么？

即使你在 Prompt 中明确要求「请输出 JSON 格式」，LLM 仍然可能：

- 在 JSON 前后加上解释性文字
- 使用单引号而非双引号
- 漏掉必需字段或添加多余字段
- 生成截断的 JSON（被 max_tokens 截断）

## 策略一：System Prompt 约束

在 System Message 中明确格式要求，这是最基础也最有效的方法。

## 策略二：Few-Shot 示例

提供 2-3 个输入输出的完整示例，让模型理解预期格式。

## 策略三：使用结构化输出 API

主流模型提供商都已经支持原生的结构化输出能力：

- **OpenAI**：使用 `response_format: { type: "json_schema" }`
- **Anthropic**：使用 Tool Use 模拟结构化输出
- **Google**：使用 JSON mode 或 constrained decoding

这些原生方案通过约束解码（Constrained Decoding）从模型层面保证输出的合法性，比纯 Prompt 约束可靠得多。

## 策略四：后处理与重试

即使做了以上所有优化，仍然建议添加后处理层：

- **JSON 解析验证**：尝试解析，失败则提取 JSON 部分重试
- **Schema 验证**：使用 Pydantic / Zod 验证数据结构
- **自动重试**：解析失败时重新调用 LLM，最多重试 2-3 次

## 总结

让 LLM 稳定输出结构化数据需要多层保障：System Prompt 设定预期 → Few-Shot 示例示范 → 原生 API 约束 → 后处理兜底。四管齐下，才能在生产环境中达到 99%+ 的成功率。
