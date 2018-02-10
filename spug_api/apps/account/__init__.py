from apps.account import user
from apps.account import role


def register_blueprint(app):
    app.register_blueprint(user.blueprint, url_prefix='/account/users')
    app.register_blueprint(role.blueprint, url_prefix='/account/roles')
