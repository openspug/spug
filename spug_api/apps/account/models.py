from public import db
from libs.model import ModelMixin
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import text


class User(db.Model, ModelMixin):
    __tablename__ = 'account_users'

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('account_roles.id'))
    username = db.Column(db.String(50), unique=True, nullable=False)
    nickname = db.Column(db.String(50))
    password_hash = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    mobile = db.Column(db.String(30))
    is_supper = db.Column(db.Boolean, default=False)
    type = db.Column(db.String(20), default='系统用户')
    is_active = db.Column(db.Boolean, default=True)
    access_token = db.Column(db.String(32))
    token_expired = db.Column(db.Integer)

    role = db.relationship('Role')

    @property
    def password(self):
        raise AttributeError('password only can write')

    @password.setter
    def password(self, plain):
        self.password_hash = generate_password_hash(plain)

    @property
    def permissions(self):
        if self.is_supper:
            return set()
        return Role.get_permissions(self.role_id)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    def check_deploy_permission(self, env_id, app_id):
        if self.is_supper:
            return True
        env_ids = self.role.env_ids.split(',') if self.role.env_ids else []
        app_ids = self.role.app_ids.split(',') if self.role.app_ids else []
        return str(env_id) in env_ids and str(app_id) in app_ids

    def __repr__(self):
        return '<User %r>' % self.username

    class Meta:
        ordering = ('-id',)


class Role(db.Model, ModelMixin):
    __tablename__ = 'account_roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    desc = db.Column(db.String(255))
    env_ids = db.Column(db.TEXT)
    app_ids = db.Column(db.TEXT)

    @staticmethod
    def get_permissions(role_id):
        sql = text('select p.name from account_role_permission_rel r, account_permissions p where r.role_id=%d and r.permission_id=p.id' % role_id)
        result = db.engine.execute(sql)
        return {x[0] for x in result}

    def __repr__(self):
        return '<Role %r>' % self.name

    class Meta:
        ordering = ('-id',)


class Permission(db.Model, ModelMixin):
    __tablename__ = 'account_permissions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    desc = db.Column(db.String(255))

    def __repr__(self):
        return '<Permission %r>' % self.name

    class Meta:
        ordering = ('-id',)


class RolePermissionRel(db.Model, ModelMixin):
    __tablename__ = 'account_role_permission_rel'
    __table_args__ = (
        db.PrimaryKeyConstraint('role_id', 'permission_id'),
    )

    role_id = db.Column(db.Integer, db.ForeignKey('account_roles.id', ondelete='CASCADE'))
    permission_id = db.Column(db.Integer, db.ForeignKey('account_permissions.id', ondelete='CASCADE'))
