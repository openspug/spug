from public import db
from libs.model import ModelMixin
from apps.system.models import NotifyWay


class Image(db.Model, ModelMixin):
    __tablename__ = 'deploy_images'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    desc = db.Column(db.String(255))

    @property
    def latest(self):
        tag = ImageTag.query.filter_by(image_id=self.id).order_by(ImageTag.created.desc()).first()
        if not tag:
            raise Exception('Not has valid image tag')
        return tag.name

    def __repr__(self):
        return '<Image %r>' % self.name

    class Meta:
        ordering = ('-id',)


class ImageConfig(db.Model, ModelMixin):
    __tablename__ = 'deploy_image_configs'

    id = db.Column(db.Integer, primary_key=True)
    img_id = db.Column(db.ForeignKey('deploy_images.id', ondelete='CASCADE'))
    name = db.Column(db.String(50))
    desc = db.Column(db.String(255))
    value = db.Column(db.String(255))

    def __repr__(self):
        return '<ImageConfig name=%r, value=%r>' % (self.name, self.value)


class ImageTag(db.Model, ModelMixin):
    __tablename__ = 'deploy_image_tags'

    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.Integer, db.ForeignKey('deploy_images.id'))
    name = db.Column(db.String(50))
    # sha256加密字符串，例如（sha256:a6647f8a2744cb8bfeff0a1b8623c8070dd92b0e6708ffa04ceb5349eaf492d6）
    digest = db.Column(db.String(64 + 7))
    created = db.Column(db.String(20))

    image = db.relationship(Image, backref=db.backref('tags'))

    def __repr__(self):
        return '<ImageTag %r>' % self.name


class History(db.Model, ModelMixin):
    __tablename__ = 'deploy_history'

    id = db.Column(db.Integer, primary_key=True)
    app_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id', ondelete='CASCADE'))
    host_id = db.Column(db.Integer, db.ForeignKey('assets_hosts.id', ondelete='CASCADE'))
    env_id = db.Column(db.Integer, db.ForeignKey('configuration_environments.id', ondelete='CASCADE'))
    api_token = db.Column(db.String(32))
    deploy_message = db.Column(db.String(255))
    deploy_restart = db.Column(db.Boolean)
    deploy_success = db.Column(db.Boolean)
    created = db.Column(db.String(20))

    class Meta:
        ordering = ('-id',)


class App(db.Model, ModelMixin):
    __tablename__ = 'deploy_apps'

    id = db.Column(db.Integer, primary_key=True)
    identify = db.Column(db.String(50))
    name = db.Column(db.String(50))
    desc = db.Column(db.String(255))
    group = db.Column(db.String(50))

    image_id = db.Column(db.Integer, db.ForeignKey('deploy_images.id'))
    notify_way_id = db.Column(db.Integer, db.ForeignKey('notify_way.id'))

    image = db.relationship(Image)
    notify_way = db.relationship(NotifyWay)
    menus = db.relationship('DeployMenu', secondary='deploy_app_menu_rel')
    fields = db.relationship('DeployField', secondary='deploy_app_field_rel')

    def __repr__(self):
        return '<App %r>' % self.name

    class Meta:
        ordering = ('-id',)


class AppHostRel(db.Model, ModelMixin):
    __tablename__ = 'deploy_app_host_rel'

    id = db.Column(db.Integer, primary_key=True)
    env_id = db.Column(db.Integer, db.ForeignKey('configuration_environments.id'))
    app_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id'))
    host_id = db.Column(db.Integer, db.ForeignKey('assets_hosts.id'))

    def __eq__(self, other):
        return other.env_id == self.env_id and other.app_id == self.app_id and other.host_id == self.host_id


class DeployMenu(db.Model, ModelMixin):
    __tablename__ = 'deploy_menus'

    id = db.Column(db.Integer, primary_key=True)
    # 属于哪个应用的菜单
    app_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id', ondelete='CASCADE'), nullable=True)
    # 菜单的显示名称
    name = db.Column(db.String(50))
    # 菜单的帮助及描述
    desc = db.Column(db.String(255))
    # 菜单展示的位置（发布: 1 / 更多: 2）
    position = db.Column(db.SmallInteger)
    # 执行结果展示方式 （页面实时输出: 1 / 仅通知成功与否: 2）
    display_type = db.Column(db.SmallInteger)
    # 执行的钩子（自定义命令）
    command = db.Column(db.Text)
    # 是否需要传入参数
    required_args = db.Column(db.Boolean)
    # 在执行前是否需要弹框确认
    required_confirm = db.Column(db.Boolean)

    apps = db.relationship('App', secondary='deploy_app_menu_rel')

    def __repr__(self):
        return '<DeployMenu %r>' % self.name

    class Meta:
        ordering = ('-id',)


class AppMenuRel(db.Model, ModelMixin):
    __tablename__ = 'deploy_app_menu_rel'

    id = db.Column(db.Integer, primary_key=True)
    menu_id = db.Column(db.Integer, db.ForeignKey('deploy_menus.id'))
    app_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id'))

    def __eq__(self, other):
        return other.menu_id == self.menu_id and other.app_id == self.app_id


class DeployField(db.Model, ModelMixin):
    __tablename__ = 'deploy_fields'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    desc = db.Column(db.String(255))
    command = db.Column(db.Text)

    apps = db.relationship('App', secondary='deploy_app_field_rel')

    def __repr__(self):
        return '<DeployField %r>' % self.name


class AppFieldRel(db.Model, ModelMixin):
    __tablename__ = 'deploy_app_field_rel'

    id = db.Column(db.Integer, primary_key=True)
    field_id = db.Column(db.Integer, db.ForeignKey('deploy_fields.id'))
    app_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id'))

    def __eq__(self, other):
        return other.field_id == self.field_id and other.app_id == self.app_id
