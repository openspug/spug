# 邮件测试实际发送实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [x]`）语法来跟踪进度。

**目标：** 让设置页邮件测试真正发送测试邮件，而不是只验证 SMTP 登录。

**架构：** 从 HTTP 视图调用已有 `Mail.send_text_mail`，测试邮件发送到表单中的邮箱账号。后端继续统一返回 SMTP 异常，前端提示用户检查收件箱和垃圾邮件。

**技术栈：** Django 4.2、Python `smtplib`、React 16、Django TestCase

---

### 任务 1：邮件测试发送行为

**文件：**
- 创建：`spug_api/apps/setting/tests.py`
- 修改：`spug_api/apps/setting/views.py`
- 修改：`spug_web/src/pages/system/setting/AlarmSetting.js`

- [x] **步骤 1：编写失败测试**

测试直接调用解包后的 `email_test` 视图，使用真实 JSON 解析和响应生成，只替换外部 SMTP 边界。断言测试邮件调用 `send_text_mail([username], subject, body)`，并断言 SMTP 异常出现在响应错误中。

- [x] **步骤 2：运行测试并确认失败**

```bash
docker exec spug4 sh -lc 'cd /data/spug/spug_api && python3 manage.py test apps.setting.tests -v 2'
```

预期：发送行为测试失败，因为当前视图只调用 `get_server()`。

- [x] **步骤 3：实现最小修复**

解析可选 `nickname`，构造 `Mail` 后调用：

```python
mail.send_text_mail(
    [form.username],
    'Spug 邮件服务测试',
    '这是一封来自 Spug 的测试邮件，收到此邮件表示邮件服务配置正常。',
)
```

前端成功文案改为“测试邮件已发送，请检查收件箱和垃圾邮件”。

- [x] **步骤 4：验证测试与前端构建**

```bash
docker exec spug4 sh -lc 'cd /data/spug/spug_api && python3 manage.py test apps.setting.tests -v 2'
docker exec spug4 sh -lc 'cd /data/spug/spug_api && python3 manage.py test apps.schedule.tests -v 2'
```

前端代码由开发容器挂载；检查 ESLint/构建能力后运行项目可用的最小验证。

> 用户将自行提交，本计划不执行 Git commit。
