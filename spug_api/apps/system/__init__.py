from apps.system import notify


def register_blueprint(app):
    app.register_blueprint(notify.blueprint, url_prefix='/system/notify')
