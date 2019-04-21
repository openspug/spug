## 项目结构


```
├── docs                             // 文档相关目录
├── spug_api                         // 后端接口目录
│   └── apps                         // 后端子模块目录
│   │   ├── account                  // 用户管理模块
│   │   │   └── __init__.py          // 用户模块蓝图路由
│   │   │   └── models.py            // 用户模块数据模型
│   │   │   └── role.py              // 用户权限操作相关方法
│   │   │   └── user.py              // 用户操作相关方法
│   │   ├── apis                     // 公用接口模块
│   │   │   └── __init__.py          // 定义接口相关蓝图路由
│   │   │   └── config.py            // 客户端获取配置文件相关方法
│   │   │   └── files.py             // 文件上传相关方法
│   │   │   └── utils.py             //
│   │   ├── assets                   // 资产管理模块
│   │   │   └── __init__.py          // 资产模块蓝图路由
│   │   │   └── host.py              // 主机管理相关方法
│   │   │   └── host_exec.py         // 主机批量执行相关方法
│   │   │   └── models.py            // 资产模块数据模型
│   │   │   └── utils.py             //
│   │   ├── common                   // 公用队列模块
│   │   │   └── __init__.py          // 公用队列模块蓝图路由
│   │   │   └── queue.py             // 公用队列方法
│   │   ├── configuration            // 配置管理模块
│   │   │   └── __init__.py          // 配置管理模块蓝图路由
│   │   │   └── app.py               // 应用配置管理
│   │   │   └── config.py            // 
│   │   │   └── environment.py       // 环境配置相关方法
│   │   │   └── models.py            // 配置管理数据模型
│   │   │   └── service.py           // 配置管理-服务配置相关方法
│   │   ├── deploy                   // 应用发布模块
│   │   │   └── __init__.py          // 应用发布模块蓝图路由
│   │   │   └── app.py               // 
│   │   │   └── config.py            // 
│   │   │   └── container.py         // 
│   │   │   └── exec.py              // 应用发布-执行发布相关方法
│   │   │   └── field.py             // 应用发布-字段管理相关方法
│   │   │   └── host.py              // 
│   │   │   └── image.py             // 应用发布-镜像管理相关方法
│   │   │   └── menu.py              // 应用发布-菜单管理相关组件
│   │   │   └── models.py            // 应用发布数据模型
│   │   │   └── publish.py           // 应用发布-发布相关方法
│   │   │   └── utils.py             // 
│   │   ├── home                     // 首页模块
│   │   │   └── __init__.py          // 首页蓝图路由
│   │   │   └── homes.py             // 首页展示数据方法
│   │   ├── schedule                 // 任务管理模块
│   │   │   └── __init__.py          // 任务管理蓝图路由
│   │   │   └── agent.py             // 任务管理-执行对象相关方法
│   │   │   └── history.py           // 任务管理-任务历史
│   │   │   └── job.py               // 任务管理-任务列表相关
│   │   │   └── models.py            // 任务管理数据模型
│   │   │   └── scheduler.py         // 任务管理方法
│   │   ├── setting                  // 
│   │   │   └── __init__.py          // 
│   │   │   └── models.py            // 
│   │   │   └── utils.py             // 
│   │   ├── system                   // 系统设置模块
│   │   │   └── __init__.py          // 系统设置路由
│   │   │   └── models.py            // 系统设置数据模型
│   │   │   └── notify.py            // 通知设置相关方法
│   │   │
│   └── libs                         // 系统公用库目录
│   │   ├── scripts                  // 公用脚本目录
│   │   │   └── entrypoint.sh        // 容器启动脚本
│   │   ├── sql                      // sql目录
│   │   │   └── permissions.sql      // 系统权限SQL文件
│   │   ├── ssh                      // ssh管理目录
│   │   │   └── __init__.py          // 公用ssh相关方法
│   │   ├── template                 // 系统模板目录
│   │   │   └── host.xls             // 主机管理-主机导入-模板
│   │   ├── __init__.py              //
│   │   ├── decorators.py            // 公用检查权限文件
│   │   ├── middleware.py            // 系统公共设置文件
│   │   ├── model.py                 // 系统公用类
│   │   ├── tool.py                  // 系统公用工具文件
│   │   ├── utils.py                 //
│   └── config.py.example            // 后端配置文件模板
│   └── main.py                      // 后端入口文件，加载所有模块
│   └── manage.py                    // 系统管理文件
│   └── public.py                    // 系统公用
│   └── requirements.txt             // 后端依赖包文件
│
│
├── spug_web                         // 前端目录
│   └── dist                         // 项目编译后的静态资源目录
│   └── src                          // 前端项目源码目录
│   │   ├── assets                   // 静态资源目录
│   │   ├── components               // 前端子模块UI组件目录
│   │   │   ├── account              // 用户管理目录
│   │   │   │   └── Permission.vue   // 权限管理组件
│   │   │   │   └── PublishPermission.vue // 角色权限-发布权限组件
│   │   │   │   └── Role.vue         // 角色权限组件
│   │   │   │   └── routes.js        // 用户管理路由
│   │   │   │   └── TagTd.vue        // 权限管理标签
│   │   │   │   └── User.vue         // 用户列表组件
│   │   │   ├── assets               // 主机管理目录
│   │   │   │   └── Host.vue         // 主机列表组件
│   │   │   │   └── HostExec.vue     // 批量执行组件
│   │   │   │   └── route.js         // 主机管理路由
│   │   │   ├── configuration        // 配置管理目录
│   │   │   │   └── App.vue          // 应用配置列表组件
│   │   │   │   └── AppConfig.vue    // 应用配置-配置组件
│   │   │   │   └── AppRel.vue       // 应用配置-关系配置组件
│   │   │   │   └── ConfigEdie.vue   // 
│   │   │   │   └── Environment.vue  // 环境配置组件
│   │   │   │   └── route.js         // 配置管理路由
│   │   │   │   └── Service.vue      // 服务管理组件
│   │   │   │   └── ServiceConfig.vue// 服务配置-配置组件
│   │   │   ├── publish              // 应用发布目录
│   │   │   │   └── App.vue          // 应用列表组件
│   │   │   │   └── AppConfig.vue    // 应用列表-应用设置组件
│   │   │   │   └── AppMenu.vue      // 
│   │   │   │   └── AppSetting.vue   // 应用列表-容器设置组件
│   │   │   │   └── ColorInput.vue   // 发布执行命令行组件
│   │   │   │   └── Deploy.vue       // 应用发布-部署组件 
│   │   │   │   └── Field.vue        // 应用发布-字段管理组件
│   │   │   │   └── Image.vue        // 应用发布-镜像管理组件
│   │   │   │   └── Menu.vue         // 应用发布-菜单管理组件
│   │   │   │   └── MenuExec.vue     //
│   │   │   │   └── route.js         // 应用发布路由
│   │   │   ├── schedule             // 任务管理目录
│   │   │   │   └── Job.vue          // 任务列表组件
│   │   │   │   └── JobSetting.vue   // 任务管理-设置触发器组件
│   │   │   ├── system               // 系统设置
│   │   │   │   └── Notify.vue       // 通知设置列表
│   │   │   ├── Deny.vue             // 全局权限拒绝组件
│   │   │   ├── Home.vue             // 系统Home组件
│   │   │   ├── Layout.vue           // 菜单生成组件
│   │   │   ├── Login.vue            // 系统登录组件
│   │   ├── config                   // 配置目录
│   │   │   ├── env.js               // 项目常规配置
│   │   │   ├── menu.js              // 菜单及面包屑配置
│   │   ├── plugins                  // 项目扩展目录
│   │   │   ├── globalTools.js       // 全局变量
│   │   ├── App.vue                  //
│   │   ├── index.html               // 首页文件
│   │   ├── main.js                  // 入口文件，加载各种公共组件
│   │   ├── router.js                // 公共路由
│   └── .babelrc                     // ES6语法编译配置
│   └── Makefile                     //
│   └── package.json                 // 项目及工具的依赖配置文件
│   └── postcss.config.js            //
│   └── ReadME.md                    // 前端README
│   └── webpack.config.js            //


```
