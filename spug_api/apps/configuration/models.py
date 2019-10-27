from public import db
from libs.model import ModelMixin


class Environment(db.Model, ModelMixin):
    __tablename__ = 'configuration_environments'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    identify = db.Column(db.String(50), unique=True)
    desc = db.Column(db.String(255))
    priority = db.Column(db.Integer, default=100)

    def __repr__(self):
        return '<Environment %r>' % self.name

    class Meta:
        ordering = ('-id',)


class Service(db.Model, ModelMixin):
    __tablename__ = 'configuration_services'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    identify = db.Column(db.String(50), unique=True)
    desc = db.Column(db.String(255))
    group = db.Column(db.String(50))

    class Meta:
        ordering = ('-id',)


class ConfigValue(db.Model, ModelMixin):
    __tablename__ = 'configuration_values'

    id = db.Column(db.Integer, primary_key=True)
    env_id = db.Column(db.Integer, db.ForeignKey('configuration_environments.id'))
    key_id = db.Column(db.Integer, db.ForeignKey('configuration_keys.id', ondelete='CASCADE'))
    value = db.Column(db.String(255))


class ConfigKey(db.Model, ModelMixin):
    __tablename__ = 'configuration_keys'

    id = db.Column(db.Integer, primary_key=True)
    owner_type = db.Column(db.String(50))
    owner_id = db.Column(db.Integer, index=True)
    type = db.Column(db.String(50))
    name = db.Column(db.String(50))
    desc = db.Column(db.String(255))

    def __repr__(self):
        return '<ConfigKey %r>' % self.name


class AppConfigRel(db.Model, ModelMixin):
    __tablename__ = 'configuration_app_rel'

    id = db.Column(db.Integer, primary_key=True)
    s_id = db.Column(db.Integer, db.ForeignKey('deploy_apps.id'))
    d_id = db.Column(db.Integer)
    d_type = db.Column(db.String(50))
