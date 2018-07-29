## Spug

[![Python3](https://img.shields.io/badge/python-3.x-green.svg?style=plastic)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-0.12-brightgreen.svg?style=plastic)](http://flask.pocoo.org/)
[![Paramiko](https://img.shields.io/badge/paramiko-2.2.1-green.svg?style=plastic)](http://www.paramiko.org/)
[![Node](https://img.shields.io/badge/node-6.x-green.svg?style=plastic)](https://nodejs.org/)
[![Element](https://img.shields.io/badge/Element-2.x-green.svg?style=plastic)](http://element-cn.eleme.io/#/zh-CN/)

Spug is an open source O & M management system developed with Python + Flask + Vue + Element. The system is separated from the front and the back of the system to help small and medium-sized enterprises manage the hosts, tasks, deployment, configuration files, monitoring and alarming

Spug是一款使用Python+Flask+Vue+Element组件开发的开源运维管理系统,系统前后端分离,帮助中小型企业完成主机、任务、发布部署、配置文件、监控、报警等管理。

#### Demo演示地址：<https://spug.qbangmang.com/login>

#### Demo账号密码：<admin/spug>



### Feature 功能
----------------------------
  - CMDB 资产管理
  - Task 任务计划管理
  - CI/CD 部署、发布管理
  - Config File 配置文件管理
  - Monitor 监控(未完成）
  - Alarm  报警（未完成）


### Environment 环境
----------------------------
   * Python 3.x
   * Flask 0.12
   * Node 6.x
   * Element 2.x


### 快速启动
----------------------------
```
$ docker pull hub.qbangmang.com/spug
$ docker run -d -p 80:80 hub.qbangmang.com/spug

$ 访问：http://主机ip
$ 默认账号密码：admin/spug

# 可选参数：
$ docker run -d -e REGISTRY_SERVER="hub.qbangmang.com" -p 80:80 hub.qbangmang.com/spug

$ -e MYSQL_DATABASE="spug"                    //指定数据库名称
  -e MYSQL_USER="spuguser"                    //指定数据库用户名
  -e MYSQL_PASSWORD="spugpwd"                 //指定数据库密码
  -e REGISTRY_SERVER="hub.qbangmang.com"      //指定私有镜像仓库
  -e REGISTRY_USER="hubuser"                  //指定私有镜像仓库用户名
  -e REGISTRY_PASSWORD="hubpwd"               //指定私有镜像仓库密码
```

更多Dockerfile [Dockerfile](https://github.com/openspug/spug/tree/master/docs/Dockerfile)


### 详细安装步骤
----------------------------

    [文档](https://github.com/openspug/spug/wiki/)


### Development 开发
----------------------------
```
   1. Clone code 克隆代码：
   $ git clone https://github.com/openspug/spug.git

   2. Start server 启动服务端：
   $ cd spug/spug_api
   $ pip install -r requirements.txt  //安装依赖包
   $ mv config.py.example config.py   //编辑配置文件
   $ python manage.py init_db         //初始化数据库
   $ python manage.py create_admin    //创建管理员
   $ python main.py                   //启动服务

   3. Start web  启动前端：
   $ cd spug/spug_web
   $ npm install
   $ npm run dev

   4. Visit 访问：
   $ http://$HOST:8010 (http://你的主机IP:8080 来访问 Spug)

```

### Preview 预览
----------------------------
![image](https://github.com/openspug/spug/blob/master/docs/demo/login.gif)
![image](https://github.com/openspug/spug/blob/master/docs/demo/user.gif)
![image](https://github.com/openspug/spug/blob/master/docs/demo/host.gif)
![image](https://github.com/openspug/spug/blob/master/docs/demo/publish.gif)
![image](https://github.com/openspug/spug/blob/master/docs/demo/tasks.gif)

### Docs 开发者文档
----------------------------

 * [Project structure 项目结构](https://github.com/openspug/spug/blob/master/docs/project_structure.md)
 * [前端UI组件](http://element-cn.eleme.io/2.1/#/zh-CN/component/installation)
 * [后端Flask文档](http://flask.pocoo.org/)


### Contributor 贡献者
----------------------------
#### 1.0.1
- zyupo <张玉坡> 项目发起者
- Yooke <雷二猛> Spug架构师、熟悉多种开发语言。
- junun <刘军>   部分功能开发
- yuyc  <于颜川> 部分功能开发


### 开发者群
----------------------------
QQ群号:

![image](https://github.com/openspug/spug/blob/master/docs/demo/spug.png)

### License & Copyright
----------------------------
[MIT](https://opensource.org/licenses/MIT)
